import "server-only";
import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { db } from "@/lib/db";

export async function currentMerchant() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "MERCHANT") redirect("/login");
  const merchant = await db.merchant.findUnique({
    where: { userId: session.user.id },
    select: { id: true, displayName: true, kycStatus: true, approvedAt: true, user: { select: { status: true } } },
  });
  if (!merchant || merchant.user.status !== "ACTIVE") redirect("/login");
  if (!merchant.approvedAt) redirect("/pending-review");
  return merchant;
}
