import { getScan as readScan, getPublicTrustPage } from "./api.functions";
import { explainService, explainCookie, explainHeader } from "./catalog";
export type ScanStatus = "en_cours" | "termine" | "echec";
export type Level = "ok" | "attention" | "info";
export interface Finding { name: string; detail: string; explanation: string; level: Level }
export interface Scan {
  id: string; slug: string; appName: string; url: string; date: string; status: ScanStatus;
  thirdParty: Finding[]; cookies: Finding[]; headers: Finding[];
}

export const statusLabel: Record<ScanStatus, string> = { en_cours: "En cours", termine: "Terminé", echec: "Échec" };
export const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export const DISCLAIMER = "Analyse automatique des éléments publics de l'application. Ceci n'est pas une certification de sécurité.";

export async function getScan(id: string): Promise<Scan> {
  const s = await readScan({ data: { id } });
  return { id: s.id, slug: s.page?.slug ?? "", appName: s.page?.app_name ?? new URL(s.url).hostname, url: s.url, date: s.created_at, status: s.status === "done" ? "termine" : s.status === "failed" ? "echec" : "en_cours",
    thirdParty: (s.results?.services ?? []).map(t => ({ name: t.name, detail: t.domains.join(", "), explanation: explainService(t.id), level: "info" })),
    cookies: (s.results?.cookies ?? []).map(c => ({ name: c.name, detail: c.sameSite ?? "SameSite absent", explanation: explainCookie(c), level: c.secure && c.httpOnly ? "ok" : "attention" })),
    headers: (s.results?.headers ?? []).map(h => ({ name: h.name, detail: h.present ? "Présent" : "Absent", explanation: explainHeader(h.key), level: h.present ? "ok" : "attention" })) };
}
export async function getScanBySlug(slug: string) {
  const s = await getPublicTrustPage({ data: { slug } });
  if (!s) return null;
  return { slug, appName: s.app_name, date: s.last_scan_at, thirdParty: s.summary.services.map(t => ({ name: t.name, explanation: t.category })), cookies: { length: s.summary.cookies.total }, headers: s.summary.headers.map(h => ({ ...h, level: h.present ? "ok" : "attention" })) };
}
