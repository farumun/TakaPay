import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeRateLimit, requestIp } from "@/lib/security";
import { getGatewayAdapter, InvalidGatewayWebhookError } from "@/lib/payments/registry";
import { InvalidStateTransitionError } from "@/lib/payments/state";

export async function POST(request: Request, context: { params: Promise<{ gateway: string }> }) {
  const { gateway: code } = await context.params;
  if (!(await consumeRateLimit(`gateway-webhook:${code}`, requestIp(request), 120, 60_000))) {
    return NextResponse.json({ error: "Webhook rate limit exceeded" }, { status: 429 });
  }
  const adapter = getGatewayAdapter(code);
  if (!adapter) {
    return NextResponse.json({ error: "No verified provider adapter is configured for this gateway" }, { status: 503 });
  }
  const rawBody = await readLimitedBody(request, 256 * 1024);
  if (!rawBody) return NextResponse.json({ error: "Webhook payload too large" }, { status: 413 });

  let event;
  try {
    event = await adapter.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof InvalidGatewayWebhookError) {
      return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
    }
    console.error(`Webhook verifier unavailable or errored for ${code}`);
    return NextResponse.json({ error: "Could not verify webhook with the configured provider" }, { status: 503 });
  }

  const gateway = await db.gateway.findUnique({ where: { code }, select: { id: true } });
  if (!gateway) return NextResponse.json({ error: "Unknown payment gateway" }, { status: 404 });
  const transaction = await db.transaction.findFirst({
    where: { gatewayId: gateway.id, gatewayReference: event.gatewayReference, environment: event.environment },
    select: { id: true, status: true, amountPaisa: true, currency: true },
  });
  if (!transaction || transaction.amountPaisa !== event.amountMinor || transaction.currency !== event.currency) {
    return NextResponse.json({ error: "Payment event does not match a transaction" }, { status: 400 });
  }

  const allowed: Record<string, string[]> = {
    CREATED: ["PENDING", "SUCCEEDED", "FAILED"],
    PENDING: ["PENDING", "SUCCEEDED", "FAILED"],
    SUCCEEDED: ["REFUNDED"],
    FAILED: [],
    CANCELLED: [],
    REFUNDED: [],
  };
  if (!allowed[transaction.status].includes(event.status)) {
    return NextResponse.json({ error: "Invalid payment state transition" }, { status: 409 });
  }
  const digest = createHash("sha256").update(rawBody).digest("hex");
  try {
    await db.$transaction(async (tx) => {
      await tx.gatewayEvent.create({
        data: { gatewayCode: code, environment: event.environment, eventId: event.eventId, transactionId: transaction.id, payloadDigest: digest },
      });
      const update = await tx.transaction.updateMany({
        where: { id: transaction.id, status: transaction.status },
        data: { status: event.status },
      });
      if (update.count !== 1) throw new InvalidStateTransitionError();
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json({ error: "Payment state changed while processing this event" }, { status: 409 });
    }
    throw error;
  }

  async function readLimitedBody(request: Request, maximum: number) {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > maximum) return null;
    if (!request.body) return new Uint8Array();
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return body;
  }
  return NextResponse.json({ received: true });
}
