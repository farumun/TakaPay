import { randomInt } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { deliverOtp, isOtpDeliveryConfigured } from "@/lib/otp-delivery";
import { consumeRateLimit, otpDigest, requestIp, sameOrigin } from "@/lib/security";
import { isFeatureEnabled } from "@/lib/cms";

const inputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  businessName: z.string().trim().max(120).optional(),
  email: z.string().email().max(254).transform((value) => value.toLowerCase()).optional(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  password: z.string().min(12).max(128),
}).refine((value) => value.email || value.phone, { message: "Email or phone is required" });

export async function POST(request: Request) {
  try {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!(await isFeatureEnabled("merchant_registration_enabled"))) {
    return NextResponse.json({ error: "Merchant registration is currently closed" }, { status: 403 });
  }
  if (!(await consumeRateLimit("register", requestIp(request), 5, 60 * 60_000))) {
    return NextResponse.json({ error: "Too many registration attempts" }, { status: 429 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
  const { displayName, businessName, email, phone, password } = parsed.data;
  const destination = email ?? phone!;
  if (!process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 32 || !isOtpDeliveryConfigured(email ? { email } : { phone: phone! })) {
    return NextResponse.json({ error: "Account verification delivery is not configured" }, { status: 503 });
  }

  if ((email && await db.user.findUnique({ where: { email }, select: { id: true } })) ||
      (phone && await db.user.findUnique({ where: { phone }, select: { id: true } }))) {
    return NextResponse.json({ error: "An account with those details already exists" }, { status: 409 });
  }

  const user = await db.user.create({
    data: {
      email,
      phone,
      passwordHash: await hash(password, 12),
      status: "PENDING",
      merchant: { create: { displayName, businessName } },
    },
    select: { id: true, email: true, phone: true },
  });
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const digest = otpDigest(destination, "REGISTRATION", code);
  await db.otpChallenge.create({
    data: { userId: user.id, destination, purpose: "REGISTRATION", tokenHash: digest, expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  try {
    await deliverOtp(email ? { email } : { phone: phone! }, code);
  } catch (error) {
    console.error("Registration verification delivery failed");
    return NextResponse.json({ error: "Account created but the verification code could not be delivered. Request another code." }, { status: 503 });
  }
  return NextResponse.json({ message: "Verification code sent", destination }, { status: 201 });
  } catch (error) {
    console.error("Registration request failed", error);
    return NextResponse.json({ error: "Registration could not be completed. Please try again." }, { status: 500 });
  }
}
