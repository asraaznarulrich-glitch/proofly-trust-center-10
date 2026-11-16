// Public-content scanner with SSRF protection. Reads only what a normal visitor would receive.
import { SERVICES, HEADERS, type ScanResults, type CookieFinding } from "./catalog";

import { normalizeUrl, isBlockedIp, ScanError } from "./url-validation";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_SCRIPTS = 5;
const UA = "ProoflyBot/1.0";

export async function resolveAndCheck(hostname: string, signal: AbortSignal) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isBlockedIp(host)) throw new ScanError();
    return;
  }
  const answers = await Promise.all(["A", "AAAA"].map(async (type) => {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { accept: "application/dns-json" }, signal, redirect: "error" });
    if (!res.ok) throw new ScanError();
    const json = JSON.parse(await readCapped(res, signal)) as { Status?: number; Answer?: { type: number; data: string }[] };
    if (json.Status !== 0) throw new ScanError();
    return (json.Answer ?? []).filter(a => a.type === 1 || a.type === 28).map(a => a.data);
  }));
  const ips = answers.flat();
  if (!ips.length || ips.some(isBlockedIp)) throw new ScanError();
}

export async function readCapped(res: Response, signal: AbortSignal): Promise<string> {
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_BYTES) { await res.body?.cancel(); throw new ScanError(); }
  if (!res.body) return "";
  const reader = res.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  for (;;) {
    signal.throwIfAborted();
    let cancel: (() => void) | undefined;
    const aborted = new Promise<never>((_, reject) => {
      cancel = () => { void reader.cancel(); reject(new ScanError()); };
      signal.addEventListener("abort", cancel, { once: true });
    });
    let result: ReadableStreamReadResult<Uint8Array>;
    try { result = await Promise.race([reader.read(), aborted]); }
    finally { if (cancel) signal.removeEventListener("abort", cancel); }
    const { done, value } = result;
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) { await reader.cancel(); throw new ScanError(); }
    chunks.push(value);
  }
  const buf = new Uint8Array(total); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
  return new TextDecoder().decode(buf);
}

/** GET with manual redirects; every hop is re-validated (scheme, host, DNS). */
export async function safeGet(start: URL, signal: AbortSignal, accept: string) {
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    url = normalizeUrl(url.toString());
    await resolveAndCheck(url.hostname, signal);
    const res = await fetch(url.toString(), { method: "GET", redirect: "manual", signal, headers: { "user-agent": UA, accept, "accept-language": "fr,en;q=0.8" } });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      await res.body?.cancel();
      if (!loc) throw new ScanError();
      if (i === MAX_REDIRECTS) throw new ScanError();
      // Absolute redirect authorities must be checked before URL normalization.
      url = normalizeUrl(/^https?:\/\//i.test(loc) ? loc : loc.startsWith("//") ? `${url.protocol}${loc}` : new URL(loc, url).toString());
      continue;
    }
    return { res, url };
  }
  throw new ScanError();
}

function parseSetCookies(headers: Headers): CookieFinding[] {
  const list = typeof (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === "function" ? (headers as Headers & { getSetCookie: () => string[] }).getSetCookie() : (headers.get("set-cookie") ? [headers.get("set-cookie") ?? ""] : []);
  return list.map((raw) => {
    const parts = raw.split(";").map((p) => p.trim());
    const name = ((parts[0] ?? "").split("=")[0] ?? "").slice(0, 100);
    const attrs = parts.slice(1).map((p) => p.toLowerCase());
    const ss = attrs.find((a) => a.startsWith("samesite="));
    return { name, secure: attrs.includes("secure"), httpOnly: attrs.includes("httponly"), sameSite: ss ? (ss.split("=")[1] ?? "").slice(0, 10) : null };
  }).filter((c) => c.name);
}

export function extractRefs(html: string, base: URL) {
  const refs: { url: URL; tag: string }[] = [];
  const re = /<(script|iframe|img|link|source|embed)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && refs.length < 500) {
    try { const u = new URL((m[2] ?? ""), base); if (u.protocol === "http:" || u.protocol === "https:") refs.push({ url: u, tag: (m[1] ?? "").toLowerCase() }); } catch { /* ignore */ }
  }
  return refs;
}

export function matchServices(urls: string[], texts: string[]) {
  const found = new Map<string, Set<string>>();
  for (const s of SERVICES) {
    for (const u of urls) {
      const lower = u.toLowerCase();
      const hostPath = lower.replace(/^https?:\/\//, "");
      if (s.domains.some((d) => hostPath.startsWith(d) || hostPath.includes(`.${d}`) || (d.includes("/") && hostPath.includes(d)))) {
        if (!found.has(s.id)) found.set(s.id, new Set());
        found.get(s.id)?.add(new URL(u).hostname);
      }
    }
    if (!found.has(s.id) && s.signatures && texts.some((t) => s.signatures?.some((sig) => t.includes(sig)))) found.set(s.id, new Set());
  }
  return SERVICES.filter((s) => found.has(s.id)).map((s) => ({ id: s.id, name: s.name, category: s.category, domains: [...(found.get(s.id) ?? [])].slice(0, 5) }));
}

export async function scanUrl(input: URL): Promise<ScanResults> {
  const signal = AbortSignal.timeout(10_000);
  try {
    const { res, url } = await safeGet(input, signal, "text/html,application/xhtml+xml");
    if (!res.ok) { await res.body?.cancel(); throw new ScanError(); }
    const ct = res.headers.get("content-type") || "";
    if (!/html/i.test(ct)) { await res.body?.cancel(); throw new ScanError(); }
    const html = await readCapped(res, signal);
    const refs = extractRefs(html, url);
    const inline = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => (m[1] ?? "").slice(0, 200_000));
    // Linked scripts: only fetched from same site (first-party bundles may embed trackers).
    const scriptTexts: string[] = [];
    const scripts = refs.filter((r) => r.tag === "script" && r.url.hostname === url.hostname).slice(0, MAX_SCRIPTS);
    for (const s of scripts) {
      try { const { res: sr } = await safeGet(s.url, signal, "*/*"); if (sr.ok) scriptTexts.push(await readCapped(sr, signal)); else await sr.body?.cancel(); } catch { /* skip unreadable script */ }
    }
    const scriptUrls = scriptTexts.flatMap((t) => [...t.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)]*/gi)].map((m) => m[0]).slice(0, 300));
    const services = matchServices([...refs.map((r) => r.url.toString()), ...scriptUrls], [...inline, ...scriptTexts]);
    signal.throwIfAborted();
    const title = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() ?? null;
    return {
      finalUrl: url.toString(), title, scannedAt: new Date().toISOString(), services,
      cookies: parseSetCookies(res.headers).slice(0, 50),
      headers: HEADERS.map((h) => ({ key: h.key, name: h.name, present: res.headers.has(h.key) })),
    };
  } catch (e) {
    if (e instanceof ScanError) throw e;
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new ScanError();
    throw new ScanError();
  }
}
