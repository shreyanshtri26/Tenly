import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Small, dependency-free helpers for secrets. Kept pure so they are easy to test.

/** SHA-256 hex digest. Used to store invite tokens and API keys at rest. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** URL-safe random token, e.g. for invite links. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Constant-time string comparison, so response timing leaks nothing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Razorpay signs each webhook body with HMAC-SHA256 using your webhook secret
 * and sends the hex digest in the `X-Razorpay-Signature` header.
 * The signature must be computed over the RAW request body, before JSON parsing.
 */
export function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

// ---------------------------------------------------------------------------
// API keys: "tnly_<prefix>_<secret>". The prefix is stored in plain text so a
// user can recognise a key in the UI; only the hash of the full key is stored.
// ---------------------------------------------------------------------------

const API_KEY_PATTERN = /^tnly_([a-z0-9]{8})_([A-Za-z0-9_-]{32,})$/;

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = randomBytes(6).toString("hex").slice(0, 8);
  const key = `tnly_${prefix}_${randomToken(24)}`;
  return { key, prefix, hash: sha256(key) };
}

export function parseApiKey(key: string): { prefix: string } | null {
  const match = API_KEY_PATTERN.exec(key);
  return match ? { prefix: match[1] } : null;
}
