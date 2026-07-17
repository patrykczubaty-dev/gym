import { describe, expect, it } from "vitest";
import {
  hashOtpCode,
  verifyOtpCode,
  isOtpExpired,
  otpExpiresAt,
  OTP_TTL_MINUTES,
} from "./otp";

describe("hashOtpCode / verifyOtpCode", () => {
  it("verifiziert den korrekten Code gegen seinen eigenen Hash", () => {
    const hash = hashOtpCode("123456");
    expect(verifyOtpCode("123456", hash)).toBe(true);
  });

  it("lehnt einen falschen Code ab", () => {
    const hash = hashOtpCode("123456");
    expect(verifyOtpCode("654321", hash)).toBe(false);
  });

  it("ist nicht anfaellig fuer unterschiedliche Hash-Laengen (kein Crash bei manipuliertem Hash)", () => {
    expect(verifyOtpCode("123456", "zu-kurz")).toBe(false);
  });

  it("erzeugt fuer denselben Code stets denselben Hash (deterministisch)", () => {
    expect(hashOtpCode("000000")).toBe(hashOtpCode("000000"));
  });
});

describe("isOtpExpired", () => {
  it("ist nicht abgelaufen, solange 'now' vor dem Ablaufzeitpunkt liegt", () => {
    const expires = new Date("2026-01-01T10:10:00Z");
    const now = new Date("2026-01-01T10:05:00Z");
    expect(isOtpExpired(expires, now)).toBe(false);
  });

  it("ist abgelaufen, sobald 'now' den Ablaufzeitpunkt erreicht oder ueberschreitet", () => {
    const expires = new Date("2026-01-01T10:10:00Z");
    expect(isOtpExpired(expires, new Date("2026-01-01T10:10:00Z"))).toBe(true);
    expect(isOtpExpired(expires, new Date("2026-01-01T10:11:00Z"))).toBe(true);
  });
});

describe("otpExpiresAt", () => {
  it(`liegt genau ${OTP_TTL_MINUTES} Minuten nach dem Referenzzeitpunkt`, () => {
    const now = new Date("2026-01-01T10:00:00Z");
    const expires = otpExpiresAt(now);
    expect(expires.getTime() - now.getTime()).toBe(OTP_TTL_MINUTES * 60 * 1000);
  });
});
