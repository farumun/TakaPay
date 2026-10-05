import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeRateLimit, encryptBytes, requireMerchant, sameOrigin, writeAudit } from "@/lib/security";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const typeExtensions = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
]);

function matchesMagic(bytes: Buffer, type: string) {
  if (type === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

export async function GET() {
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  const documents = await db.kycDocument.findMany({
    where: { merchantId: access.merchantId },
    select: { id: true, documentType: true, status: true, createdAt: true, reviewedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (!declaredLength || declaredLength > MAX_BYTES + 32 * 1024) {
    return NextResponse.json({ error: "Upload body must be present and no larger than 5 MB plus form overhead" }, { status: 413 });
  }
  const access = await requireMerchant();
  if ("response" in access) return access.response;
  if (!(await consumeRateLimit("kyc-upload", access.merchantId, 12, 60 * 60_000))) {
    return NextResponse.json({ error: "Upload limit reached" }, { status: 429 });
  }
  const form = await request.formData();
  const documentType = form.get("documentType");
  const file = form.get("file");
  if (typeof documentType !== "string" || !["NID", "TRADE_LICENSE", "BANK_PROOF"].includes(documentType) || !(file instanceof File)) {
    return NextResponse.json({ error: "Choose a supported document type and file" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES || !typeExtensions.has(file.type)) {
    return NextResponse.json({ error: "Documents must be PDF, JPEG, or PNG files up to 5 MB" }, { status: 400 });
  }
  const content = Buffer.from(await file.arrayBuffer());
  if (!matchesMagic(content, file.type)) return NextResponse.json({ error: "File content does not match its declared type" }, { status: 400 });

  const storageRoot = path.resolve(process.env.PRIVATE_UPLOAD_DIR || path.join(process.cwd(), "var", "private-uploads"));
  const publicRoot = path.resolve(process.cwd(), "public");
  if (storageRoot === publicRoot || storageRoot.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error("PRIVATE_UPLOAD_DIR must be outside the public directory");
  }
  await mkdir(storageRoot, { recursive: true, mode: 0o700 });
  const storageKey = `${randomUUID()}${typeExtensions.get(file.type)}`;
  await writeFile(path.join(storageRoot, storageKey), encryptBytes(content), { flag: "wx", mode: 0o600 });
  let record;
  try {
    record = await db.$transaction(async (tx) => {
      const document = await tx.kycDocument.create({
        data: { merchantId: access.merchantId, documentType, storageKey, status: "PENDING" },
        select: { id: true, documentType: true, status: true, createdAt: true },
      });
      await tx.merchant.update({ where: { id: access.merchantId }, data: { kycStatus: "PENDING" } });
      return document;
    });
  } catch (error) {
    await unlink(path.join(storageRoot, storageKey));
    throw error;
  }
  await writeAudit({ actorId: access.userId, action: "KYC_DOCUMENT_UPLOADED", resource: "KycDocument", resourceId: record.id });
  return NextResponse.json(record, { status: 201 });
}
