import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function encodeBase32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(secret: string) {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of secret.toUpperCase().replace(/=+$/, "")) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid TOTP secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function createTotpSecret() {
  return encodeBase32(randomBytes(20));
}

function tokenFor(secret: string, counter: bigint) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, submitted: string, now = Date.now()) {
  if (!/^\d{6}$/.test(submitted)) return false;
  const counter = BigInt(Math.floor(now / 30_000));
  const provided = Buffer.from(submitted);
  for (const drift of [-1n, 0n, 1n]) {
    const expected = Buffer.from(tokenFor(secret, counter + drift));
    if (timingSafeEqual(expected, provided)) return true;
  }
  return false;
}

export function totpUri(secret: string, account: string) {
  const label = encodeURIComponent(`Takapay:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Takapay&algorithm=SHA1&digits=6&period=30`;
}
