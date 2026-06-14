import { describe, it, expect } from "vitest";
import { encryptJson, decryptJson, safeHash, sha256, safeEqual, generateApiKey } from "@/lib/encryption";

describe("encryption", () => {
  it("round-trips JSON through AES-256-GCM", () => {
    const payload = { fullName: "Kari Nordmann", phone: "+47 900 00 000", nested: { a: [1, 2] } };
    const ciphertext = encryptJson(payload);
    expect(ciphertext).not.toContain("Kari");
    expect(decryptJson(ciphertext)).toEqual(payload);
  });

  it("produces a different ciphertext per call (random IV)", () => {
    const a = encryptJson({ x: 1 });
    const b = encryptJson({ x: 1 });
    expect(a).not.toEqual(b);
    expect(decryptJson(a)).toEqual(decryptJson(b));
  });

  it("rejects tampered ciphertext", () => {
    const ciphertext = encryptJson({ secret: true });
    const tampered = ciphertext.slice(0, -4) + "AAAA";
    expect(() => decryptJson(tampered)).toThrow();
  });

  it("safeHash is deterministic and non-reversible-looking", () => {
    expect(safeHash("192.168.1.1")).toEqual(safeHash("192.168.1.1"));
    expect(safeHash("192.168.1.1")).not.toEqual(safeHash("192.168.1.2"));
    expect(safeHash("192.168.1.1")).not.toContain("192");
  });

  it("sha256 matches itself and api keys hash consistently", () => {
    const { plaintext, hashed, prefix } = generateApiKey();
    expect(plaintext.startsWith("sp_live_")).toBe(true);
    expect(sha256(plaintext)).toEqual(hashed);
    expect(plaintext.startsWith(prefix)).toBe(true);
  });

  it("safeEqual compares in constant time semantics", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
