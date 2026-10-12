import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateApiKey, parseApiKey, sha256, verifyRazorpaySignature } from "@/lib/crypto";

describe("verifyRazorpaySignature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ event: "subscription.activated" });
  const valid = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts the correct signature", () => {
    expect(verifyRazorpaySignature(body, valid, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyRazorpaySignature(body.replace("activated", "cancelled"), valid, secret)).toBe(false);
  });

  it("rejects a missing or malformed signature", () => {
    expect(verifyRazorpaySignature(body, null, secret)).toBe(false);
    expect(verifyRazorpaySignature(body, "abc", secret)).toBe(false);
  });
});

describe("API keys", () => {
  it("generates keys that parse and hash consistently", () => {
    const { key, prefix, hash } = generateApiKey();
    expect(parseApiKey(key)).toEqual({ prefix });
    expect(sha256(key)).toBe(hash);
  });

  it("rejects strings that are not Tenly keys", () => {
    expect(parseApiKey("sk_live_123")).toBeNull();
    expect(parseApiKey("tnly_short_x")).toBeNull();
  });
});
