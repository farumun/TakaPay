import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeRateLimit, decryptSecret, encryptSecret, requireMerchant, sameOrigin, writeAudit } from "@/lib/security";
import { createTotpSecret, totpUri, verifyTotp } from "@/lib/totp";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("begin"), password: z.string().min(1).max(128) }),
  z.object({ action: z.literal("enable"), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("disable"), code: z.string().regex(/^\d{6}$/) }),
]);

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const user = await db.user.findUnique({ where: { id: access.userId }, select: { mfaEnabled: true } });
  return NextResponse.json({ enabled: user?.mfaEnabled ?? false });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  if (!(await consumeRateLimit("mfa-management", access.userId, 10, 60 * 60_000))) {
    return NextResponse.json({ error: "Too many MFA changes" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid MFA request" }, { status: 400 });
  const user = await db.user.findUnique({ where: { id: access.userId }, select: { email: true, phone: true, mfaEnabled: true, mfaSecretEnc: true, passwordHash: true } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (parsed.data.action === "begin") {
    if (user.mfaEnabled) return NextResponse.json({ error: "MFA is already enabled" }, { status: 409 });
    if (!user.passwordHash || !(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Correct account password required to begin MFA setup" }, { status: 403 });
    }
    const secret = createTotpSecret();
    await db.user.update({ where: { id: access.userId }, data: { mfaSecretEnc: encryptSecret(secret) } });
    return NextResponse.json({ secret, uri: totpUri(secret, user.email ?? user.phone ?? "merchant") });
  }

  if (!user.mfaSecretEnc || !verifyTotp(decryptSecret(user.mfaSecretEnc), parsed.data.code)) {
    return NextResponse.json({ error: "Invalid authenticator code" }, { status: 400 });
  }
  const enabled = parsed.data.action === "enable";
  await db.user.update({ where: { id: access.userId }, data: { mfaEnabled: enabled, ...(enabled ? {} : { mfaSecretEnc: null }) } });
  await writeAudit({ actorId: access.userId, action: enabled ? "MFA_ENABLED" : "MFA_DISABLED", resource: "User", resourceId: access.userId });
  return NextResponse.json({ enabled });
}
