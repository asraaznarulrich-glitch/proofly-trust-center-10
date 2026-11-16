import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeUrl, URL_ERROR } from "./url-validation";
import { readCapped, resolveAndCheck, safeGet, scanUrl } from "./scanner.server";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("URL security rules", () => {
  it.each(["ftp://example.com", "http://example.com:8080", "https://name:pass@example.com", "http://2130706433", "http://0x7f000001", "http://0x08080808", "http://134744072", "http://0177.0.0.1", "http://127.1", "http://[::ffff:8.8.8.8]", "http://[0:0:0:0:0:ffff:808:808]", "http://[::1]", "http://[fc00::1]", "http://[fe80::1]", "http://0.0.0.0", "http://10.0.0.1", "http://172.31.255.255", "http://192.168.0.1", "http://169.254.0.1"])("rejects %s with generic error", u => {
    expect(() => normalizeUrl(u)).toThrow(URL_ERROR);
  });
  it.each(["http://example.com:80", "https://example.com:443", "http://example.com:443", "https://example.com:80"])("accepts permitted schemes and ports %s", u => expect(normalizeUrl(u).hostname).toBe("example.com"));
  it("checks both DNS families and refuses any private answer before a site request", async () => {
    const f = vi.fn(async (url: string) => Response.json({ Status: 0, Answer: [{ type: url.includes("AAAA") ? 28 : 1, data: url.includes("AAAA") ? "fc00::1" : "8.8.8.8" }] }));
    vi.stubGlobal("fetch", f);
    await expect(safeGet(new URL("https://example.com"), new AbortController().signal, "text/html")).rejects.toThrow(URL_ERROR);
    expect(f).toHaveBeenCalledTimes(2);
    expect(f.mock.calls.every(([u]) => u.startsWith("https://cloudflare-dns.com/"))).toBe(true);
  });
  it("fails closed when one DNS family is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: string) => u.includes("AAAA") ? new Response("", { status: 503 }) : Response.json({ Status: 0, Answer: [{ type: 1, data: "8.8.8.8" }] })));
    await expect(resolveAndCheck("example.com", new AbortController().signal)).rejects.toThrow(URL_ERROR);
  });
  it("follows exactly three redirects manually", async () => {
    let calls = 0;
    const f = vi.fn(async (_u: string, init: RequestInit) => { expect(init.redirect).toBe("manual"); calls++; return calls <= 3 ? new Response(null, { status: 302, headers: { location: `/step${calls}` } }) : new Response("ok"); });
    vi.stubGlobal("fetch", f);
    await expect(safeGet(new URL("https://8.8.8.8"), new AbortController().signal, "text/html")).resolves.toHaveProperty("url.pathname", "/step3");
    expect(calls).toBe(4);
  });
  it("refuses a fourth redirect without requesting its destination", async () => {
    const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: "/next" } })); vi.stubGlobal("fetch", f);
    await expect(safeGet(new URL("https://8.8.8.8"), new AbortController().signal, "text/html")).rejects.toThrow(URL_ERROR);
    expect(f).toHaveBeenCalledTimes(4);
  });
  it.each(["http://127.0.0.1", "http://2130706433", "http://0x08080808", "http://user:pw@example.com", "http://example.com:8080"])("revalidates redirect %s", async target => {
    const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: target } })); vi.stubGlobal("fetch", f);
    await expect(safeGet(new URL("https://8.8.8.8"), new AbortController().signal, "text/html")).rejects.toThrow(URL_ERROR);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("accepts exactly 2 MiB and refuses one byte more without relying on Content-Length", async () => {
    const signal = new AbortController().signal;
    expect((await readCapped(new Response(new Uint8Array(2 * 1024 * 1024)), signal)).length).toBe(2097152);
    await expect(readCapped(new Response(new Uint8Array(2097153)), signal)).rejects.toThrow(URL_ERROR);
  });
  it("refuses oversized Content-Length", async () => {
    await expect(readCapped(new Response("x", { headers: { "content-length": "2097153" } }), new AbortController().signal)).rejects.toThrow(URL_ERROR);
  });
  it("sets a 10-second total analysis timeout", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<title>Test</title>", { headers: { "content-type": "text/html" } })));
    await scanUrl(new URL("https://8.8.8.8"));
    expect(spy).toHaveBeenCalledWith(10000); spy.mockRestore();
  });
  it("cancels a stalled response body when the deadline expires", async () => {
    const controller = new AbortController(); const cancel = vi.fn();
    const pending = readCapped(new Response(new ReadableStream({ cancel })), controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow(URL_ERROR); expect(cancel).toHaveBeenCalled();
  });
});