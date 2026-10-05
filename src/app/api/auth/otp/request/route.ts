import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deliverOtp, isOtpDeliveryConfigured } from "@/lib/otp-delivery";
import { consumeRateLimit, otpDigest, requestIp, sameOrigin } from "@/lib/security";

const schema = z.object({
  destination: z.string().trim().max(254),
  purpose: z.enum(["REGISTRATION", "PASSWORD_RESET", "LOGIN"]),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await consumeRateLimit("otp-ip", requestIp(request), 15, 60 * 60_000))) {
    return NextResponse.json({ error: "Too many code requests" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { destination: raw, purpose } = parsed.data;
  const email = raw.includes("@") ? raw.toLowerCase() : undefined;
  const phone = !email && /^\+[1-9]\d{7,14}$/.test(raw) ? raw : undefined;
  if (!email && !phone) return NextResponse.json({ error: "Enter a valid email or E.164 phone number" }, { status: 400 });
  const destination = email ?? phone!;
  if (!process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 32 || !isOtpDeliveryConfigured(email ? { email } : { phone: phone! })) {
    return NextResponse.json({ error: "Verification delivery is not configured" }, { status: 503 });
  }
  if (!(await consumeRateLimit("otp-destination", destination, 3, 15 * 60_000))) {
    return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 });
  }
  const user = await db.user.findFirst({ where: email ? { email } : { phone }, select: { id: true, status: true } });

  if (purpose === "REGISTRATION" && (!user || user.status !== "PENDING")) {
    return NextResponse.json({ error: "No pending account found" }, { status: 404 });
  }
  if (purpose === "LOGIN" && (!user || user.status !== "ACTIVE")) {
    return NextResponse.json({ message: "If an active account exists, a verification code will be sent" });
  }
  if (purpose === "PASSWORD_RESET" && !user) {
    return NextResponse.json({ message: "If the account exists, a code will be sent" });
  }

  const since = new Date(Date.now() - 15 * 60_000);
  const recent = await db.otpChallenge.count({
    where: { destination, purpose, createdAt: { gte: since } },
  });
  if (recent >= 3) return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpChallenge.create({
    data: {
      userId: user?.id,
      destination,
      purpose,
      tokenHash: otpDigest(destination, purpose, code),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
  });
  try {
    await deliverOtp(email ? { email } : { phone: phone! }, code);
  } catch (error) {
    console.error("Verification code delivery failed");
    return NextResponse.json({ error: "Code could not be delivered. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ message: "Verification code sent" });
}
