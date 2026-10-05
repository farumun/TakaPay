import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: Uint8Array) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSha256Hex(secret: string, payload: Uint8Array, signature: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(hmacSha256Hex(secret, payload), "hex");
  const submitted = Buffer.from(signature, "hex");
  return expected.length === submitted.length && timingSafeEqual(expected, submitted);
}
