import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { constantTimeEqualHex, decryptSecret, otpDigest } from "@/lib/security";
import { verifyTotp } from "@/lib/totp";
import { isFeatureEnabled } from "@/lib/cms";

const passwordSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
  mfaCode: z.string().regex(/^\d{6}$/).optional(),
});
const otpSchema = z.object({
  destination: z.string().min(3).max(254),
  code: z.string().regex(/^\d{6}$/),
  mfaCode: z.string().regex(/^\d{6}$/).optional(),
});

const userRoles = ["SUPER_ADMIN", "SUB_ADMIN", "MERCHANT"] as const;
type UserRole = (typeof userRoles)[number];

function isUserRole(role: string): role is UserRole {
  return userRoles.some((value) => value === role);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.NODE_ENV !== "production",
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        destination: { label: "Email or phone", type: "text" },
        code: { label: "Verification code", type: "text" },
        mfaCode: { label: "Authenticator code", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const otp = otpSchema.safeParse(raw);
        const password = passwordSchema.safeParse(raw);
        if (!otp.success && !password.success) return null;
        const passwordData = password.success ? password.data : null;
        const destination = otp.success
          ? (otp.data.destination.includes("@") ? otp.data.destination.toLowerCase() : otp.data.destination)
          : passwordData!.email.toLowerCase();
        const user = await db.user.findFirst({
          where: destination.includes("@") ? { email: destination } : { phone: destination },
          include: { merchant: { select: { displayName: true } } },
        });
        if (!user || user.status !== "ACTIVE" || !isUserRole(user.role)) return null;
        if (otp.success) {
          const challenge = await db.otpChallenge.findFirst({
            where: { destination, purpose: "LOGIN", consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
            orderBy: { createdAt: "desc" },
          });
          const submitted = otpDigest(destination, "LOGIN", otp.data.code);
          if (!challenge || !constantTimeEqualHex(challenge.tokenHash, submitted)) {
            if (challenge) await db.otpChallenge.update({ where: { id: challenge.id }, data: { failedAttempts: { increment: 1 } } });
            return null;
          }
          if (user.mfaEnabled && (!otp.data.mfaCode || !user.mfaSecretEnc || !verifyTotp(decryptSecret(user.mfaSecretEnc), otp.data.mfaCode))) return null;
          const consumed = await db.otpChallenge.updateMany({
            where: { id: challenge.id, consumedAt: null, expiresAt: { gt: new Date() }, failedAttempts: { lt: 5 } },
            data: { consumedAt: new Date() },
          });
          if (consumed.count !== 1) return null;
        } else {
          if (!passwordData || !user.passwordHash || !(await compare(passwordData.password, user.passwordHash))) return null;
          if (user.mfaEnabled && (!passwordData.mfaCode || !user.mfaSecretEnc || !verifyTotp(decryptSecret(user.mfaSecretEnc), passwordData.mfaCode))) return null;
        }
        return { id: user.id, email: user.email, name: user.merchant?.displayName, role: user.role, authVersion: user.authVersion };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
    ...(process.env.AUTH_FACEBOOK_ID && process.env.AUTH_FACEBOOK_SECRET
      ? [Facebook({ clientId: process.env.AUTH_FACEBOOK_ID, clientSecret: process.env.AUTH_FACEBOOK_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        if (!user.id || !user.email) return false;
        if (account.provider === "google" && !user.emailVerified) return false;
        const existing = await db.user.findUnique({ where: { id: user.id }, select: { status: true, mfaEnabled: true, emailVerifiedAt: true } });
        if (existing?.status === "SUSPENDED" || existing?.mfaEnabled) return false;
        if (!existing?.emailVerifiedAt && !(await isFeatureEnabled("merchant_registration_enabled"))) return false;
        await db.user.update({
          where: { id: user.id },
          data: {
            status: "ACTIVE",
            ...(user.emailVerified ? { emailVerifiedAt: user.emailVerified } : {}),
            merchant: {
              upsert: {
                create: { displayName: user.name?.slice(0, 100) || user.email },
                update: {},
              },
            },
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      if (typeof token.userId === "string") {
        const currentUser = await db.user.findUnique({
          where: { id: token.userId },
          select: { role: true, status: true, authVersion: true },
        });
        if (currentUser?.status !== "ACTIVE") return {};
        if (typeof token.authVersion === "number" && token.authVersion !== currentUser.authVersion) return {};
        token.role = currentUser.role;
        token.authVersion = currentUser.authVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
        if (token.role === "SUPER_ADMIN" || token.role === "SUB_ADMIN" || token.role === "MERCHANT") {
          session.user.role = token.role;
        }
      }
      return session;
    },
  },
});
