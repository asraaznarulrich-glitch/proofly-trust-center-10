import { describe, expect, it } from "vitest";
import { isBlockedIp, normalizeUrl, matchServices } from "./scanner";

describe("SSRF protection", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1"])("blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true));
  it.each(["8.8.8.8", "104.16.1.1", "2606:4700::1111"])("allows %s", (ip) => expect(isBlockedIp(ip)).toBe(false));
  it.each(["http://localhost", "http://169.254.169.254/latest/meta-data", "ftp://example.com", "file:///etc/passwd", "http://metadata.google.internal", "http://foo.internal", "http://example.com:8080", "http://user:pw@example.com", "http://[::1]/"])("rejects %s", (u) => expect(() => normalizeUrl(u)).toThrow());
  it("accepts bare public domain", () => expect(normalizeUrl("monapp.com").toString()).toBe("https://monapp.com/"));
});

describe("service detection", () => {
  it("detects services by domain", () => {
    const ids = matchServices(["https://www.googletagmanager.com/gtag/js?id=G-1", "https://js.stripe.com/v3"], []).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["ga", "stripe"]));
  });
  it("does not match lookalike domains", () => expect(matchServices(["https://notstripe.com/x.js"], [])).toEqual([]));
});
