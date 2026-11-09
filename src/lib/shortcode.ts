import { randomInt } from "crypto";

// base36 minus look-alikes (0/o, 1/l/i) so codes are easy to read aloud.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function generateShortCode(length = 5): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function generateClaimToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}
