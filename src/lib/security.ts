import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "../../auth";
import { db } from "@/lib/db";

export async function requireMerchant() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MERCHANT") {
    return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  }
  const merchant = await db.merchant.findUnique({
    where: { userId: session.user.id },
    select: { id: true, approvedAt: true, user: { select: { status: true } } },
  });
  if (!merchant || merchant.user.status !== "ACTIVE" || !merchant.approvedAt) {
    return { response: NextResponse.json({ error: "Verified and approved merchant account required" }, { status: 403 }) } as const;
  }
  return { merchantId: merchant.id, userId: session.user.id } as const;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Administrator access required" }, { status: 403 }) } as const;
  }
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true, status: true } });
  if (!user || user.status !== "ACTIVE" || !["SUPER_ADMIN", "SUB_ADMIN"].includes(user.role)) {
    return { response: NextResponse.json({ error: "Administrator access required" }, { status: 403 }) } as const;
  }
  return { userId: session.user.id, role: user.role } as const;
}

function encryptionKey() {
  const value = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!value) throw new Error("CREDENTIAL_ENCRYPTION_KEY must be configured");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(encoded: string) {
  const [version, ivText, tagText, cipherText] = encoded.split(".");
  if (version !== "v1" || !ivText || !tagText || !cipherText) {
    throw new Error("Unsupported encrypted secret format");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptBytes(plaintext: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([Buffer.from("TPK1"), iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptBytes(encoded: Buffer) {
  if (encoded.length < 32 || encoded.subarray(0, 4).toString("ascii") !== "TPK1") {
    throw new Error("Unsupported encrypted file format");
  }
  const iv = encoded.subarray(4, 16);
  const tag = encoded.subarray(16, 32);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encoded.subarray(32)), decipher.final()]);
}

export function otpDigest(destination: string, purpose: string, code: string) {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("OTP_PEPPER must be configured with at least 32 characters");
  return createHmac("sha256", pepper).update(`${destination}:${purpose}:${code}`).digest("hex");
}

export function constantTimeEqualHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export function opaqueToken(prefix: string, bytes = 32) {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}

export async function writeAudit(input: {
  actorId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: object;
}) {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      metadata: input.metadata,
    },
  });
}

export function safeExternalHttpsUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return host !== "localhost" && !host.endsWith(".localhost") && !host.endsWith(".local") && !/^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd)/i.test(host);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function consumeRateLimit(scope: string, identifier: string, limit: number, windowMs: number) {
  const pepper = process.env.RATE_LIMIT_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("RATE_LIMIT_PEPPER must be configured with at least 32 characters");
  const key = createHmac("sha256", pepper).update(`${scope}:${identifier}`).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const expired = await db.rateLimitBucket.updateMany({
    where: { key, expiresAt: { lte: now } },
    data: { count: 1, expiresAt },
  });
  if (expired.count > 0) return 1 <= limit;

  const bucket = await db.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, expiresAt },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return bucket.count <= limit;
}

export function requestIp(request: Request) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
