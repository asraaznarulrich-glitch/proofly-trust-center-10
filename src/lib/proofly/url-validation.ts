import ipaddr from "ipaddr.js";

export const URL_ERROR = "Cette adresse ne peut pas être analysée.";
export class ScanError extends Error {
  constructor() { super(URL_ERROR); }
}

export function isBlockedIp(raw: string): boolean {
  try {
    const ip = ipaddr.parse(raw.replace(/^\[|\]$/g, ""));
    if (ip.kind() === "ipv6" && (ip as ipaddr.IPv6).isIPv4MappedAddress()) return true;
    return ip.range() !== "unicast";
  } catch { return true; }
}

export function normalizeUrl(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 2048) throw new ScanError();
  const input = raw.trim();
  const s = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
  if (/[\\\u0000-\u0020]/.test(s)) throw new ScanError();
  // Inspect the original authority before WHATWG URL canonicalizes numeric IPv4.
  const authority = s.match(/^https?:\/\/([^/?#]+)/i)?.[1];
  if (!authority || authority.includes("@")) throw new ScanError();
  const rawHost = authority.startsWith("[") ? authority.slice(0, authority.indexOf("]") + 1) : authority.split(":")[0];
  let u: URL;
  try { u = new URL(s); } catch { throw new ScanError(); }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || (u.port && !["80", "443"].includes(u.port))) throw new ScanError();
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (ipaddr.isValid(host)) {
    if (!host.includes(":") && rawHost !== host) throw new ScanError();
    if (isBlockedIp(host)) throw new ScanError();
  } else if (!host.includes(".") || /(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/.test(host) || ["metadata", "instance-data", "metadata.google.internal"].includes(host)) throw new ScanError();
  u.hash = "";
  return u;
}