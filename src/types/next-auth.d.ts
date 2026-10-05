import type { DefaultSession } from "next-auth";

type UserRole = "SUPER_ADMIN" | "SUB_ADMIN" | "MERCHANT";

declare module "next-auth" {
  interface User {
    role: UserRole;
    emailVerified?: Date | null;
    authVersion: number;
  }

  interface Session {
    user: DefaultSession["user"] & { id: string; role: UserRole };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
    authVersion?: number;
  }
}
