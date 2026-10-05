import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { constantTimeEqualHex, consumeRateLimit, otpDigest, requestIp, sameOrigin, writeAudit } from "@/lib/security";

const schema = z.object({
  destination: z.string().trim().max(254),
  purpose: z.enum(["REGISTRATION", "PASSWORD_RESET"]),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(12).max(128).optional(),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await consumeRateLimit("otp-verify", requestIp(request), 20, 15 * 60_000))) {
    return NextResponse.json({ error: "Too many verification attempts" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  const { destination: input, purpose, code, newPassword } = parsed.data;
  if (purpose === "PASSWORD_RESET" && !newPassword) {
    return NextResponse.json({ error: "A new password is required" }, { status: 400 });
  }
  const destination = input.includes("@") ? input.toLowerCase() : input;
  const challenge = await db.otpChallenge.findFirst({
    where: { destination, purpose, consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
    orderBy: { createdAt: "desc" },
  });
  const digest = otpDigest(destination, purpose, code);
  if (!challenge || !constantTimeEqualHex(challenge.tokenHash, digest)) {
    if (challenge) {
      await db.otpChallenge.update({ where: { id: challenge.id }, data: { failedAttempts: { increment: 1 } } });
    }
    return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
  }

  const user = await db.user.findFirst({ where: destination.includes("@") ? { email: destination } : { phone: destination } });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    const consumed = await tx.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new Error("Verification code has already been used");
    if (purpose === "REGISTRATION") {
      await tx.user.update({ where: { id: user.id }, data: {
        status: "ACTIVE",
        emailVerified: destination.includes("@") ? new Date() : undefined,
        emailVerifiedAt: destination.includes("@") ? new Date() : undefined,
        phoneVerifiedAt: destination.includes("@") ? undefined : new Date(),
      } });
    } else if (purpose === "PASSWORD_RESET") {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash: await hash(newPassword!, 12), authVersion: { increment: 1 } } });
    }
  });
  await writeAudit({ actorId: user.id, action: `AUTH_${purpose}_VERIFIED`, resource: "User", resourceId: user.id });
  return NextResponse.json({ message: purpose === "PASSWORD_RESET" ? "Password reset successfully" : "Verification completed" });
}
