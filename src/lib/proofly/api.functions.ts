import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { normalizeUrl, URL_ERROR } from "./url-validation";
import type { ScanResults } from "./catalog";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidInput = <K extends string>(key: K) => (input: unknown) => {
  const v = (input as Record<string, unknown> | null)?.[key];
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("Identifiant invalide.");
  return { [key]: v } as Record<K, string>;
};

// ---------- scan-url ----------
export const startScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const url = (input as { url?: unknown } | null)?.url;
    try { return { url: normalizeUrl(url).toString() }; } catch { throw new Error(URL_ERROR); }
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("scans").insert({ url: data.url, user_id: userId }).select("id").single();
    if (error || !row) {
      if (error?.message.includes("QUOTA_EXCEEDED")) throw new Error("Limite atteinte : 10 analyses par 24 heures. Réessayez plus tard.");
      throw new Error("Impossible de créer l'analyse. Réessayez.");
    }
    try {
      const { scanUrl } = await import("./scanner.server");
      const results = await scanUrl(new URL(data.url));
      await supabase.from("scans").update({ status: "done", results: results as unknown as Json }).eq("id", row.id);
      return { id: row.id, status: "done" as const };
    } catch (e) {
      const msg = URL_ERROR;
      await supabase.from("scans").update({ status: "failed", error: msg }).eq("id", row.id);
      return { id: row.id, status: "failed" as const, error: msg };
    }
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("scans").select("id, url, status, error, created_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error("Impossible de charger vos analyses.");
    return data;
  });

export const getScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(uuidInput("id"))
  .handler(async ({ data, context }) => {
    const { data: scan } = await context.supabase.from("scans").select("id, url, status, error, results, created_at").eq("id", data.id ?? "").maybeSingle();
    if (!scan) throw new Error("Analyse introuvable.");
    const { data: page } = await context.supabase.from("trust_pages").select("slug, app_name, published").eq("scan_id", scan.id).maybeSingle();
    return { ...scan, results: scan.results as unknown as ScanResults | null, page };
  });

// ---------- generate-policy ----------
function buildPrompt(url: string, r: ScanResults) {
  const facts = {
    url, titre_page: r.title,
    services_tiers: r.services.map((s) => ({ nom: s.name, categorie: s.category })),
    cookies: r.cookies.map((c) => ({ nom: c.name, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite })),
    en_tetes_securite: r.headers.map((h) => ({ nom: h.name, present: h.present })),
  };
  return `Rédige en français une politique de confidentialité pour l'application web décrite ci-dessous.

RÈGLES STRICTES :
- Utilise UNIQUEMENT les faits fournis dans les DONNÉES. N'invente rien : ni nom d'entreprise, ni adresse, ni e-mail, ni durée de conservation, ni pays d'hébergement, ni base légale spécifique non déductible.
- Pour toute information inconnue, insère un champ à compléter entre crochets en MAJUSCULES, par exemple : [NOM DE L'ENTREPRISE], [ADRESSE DE L'ENTREPRISE], [E-MAIL DE CONTACT], [DURÉE DE CONSERVATION], [DONNÉES COLLECTÉES PAR LES FORMULAIRES].
- Mentionne chaque service tiers détecté et chaque cookie détecté, avec leur finalité probable formulée prudemment (« est utilisé pour… » selon sa catégorie).
- N'utilise jamais les mots « certifié », « garanti » ou « 100% sûr ». Ne prétends pas que l'application est sécurisée.
- Structure : titres numérotés, texte brut sans Markdown (pas de #, pas de **). Inclure : responsable du traitement, données collectées, services tiers, cookies, droits des personnes (RGPD, CNIL), durée de conservation, contact.
- Réponds uniquement avec le texte de la politique.

DONNÉES (issues d'une analyse automatique des éléments publics) :
${JSON.stringify(facts, null, 2)}`;
}

async function callClaude(prompt: string): Promise<string> {
  const { streamMessage } = await import("@lovable.dev/ai-gateway");
  const stream = await streamMessage({ model: "anthropic/claude-sonnet-5", max_tokens: 8000, messages: [{ role: "user", content: prompt }] });
  let text = "";
  for await (const event of stream) {
    const parsed = z.object({ type: z.literal("content_block_delta"), delta: z.object({ type: z.literal("text_delta"), text: z.string() }) }).safeParse(event);
    if (parsed.success) text += parsed.data.delta.text;
  }
  if (!text.trim()) throw new Error("La génération de la politique a échoué. Réessayez.");
  return text.trim();
}

export const generatePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(uuidInput("scanId"))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: scan } = await supabase.from("scans").select("id, url, status, results").eq("id", data.scanId ?? "").eq("user_id", userId).maybeSingle();
    if (!scan) throw new Error("Analyse introuvable.");
    if (scan.status !== "done" || !scan.results) throw new Error("L'analyse doit être terminée avant de générer la politique.");
    const content = await callClaude(buildPrompt(scan.url, scan.results as unknown as ScanResults));
    const { data: row, error } = await supabase.from("policies").insert({ scan_id: scan.id, user_id: userId, content: content.slice(0, 50_000) }).select("id, content, created_at").single();
    if (error) throw new Error("Impossible d'enregistrer la politique.");
    return row;
  });

export const getLatestPolicy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(uuidInput("scanId"))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("policies").select("id, content, created_at").eq("scan_id", data.scanId ?? "").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return row;
  });

export const savePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const { id, content } = (input ?? {}) as { id?: unknown; content?: unknown };
    if (typeof id !== "string" || !UUID.test(id)) throw new Error("Identifiant invalide.");
    if (typeof content !== "string" || content.length > 50_000) throw new Error("Texte invalide ou trop long (50 000 caractères max).");
    return { id, content };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("policies").update({ content: data.content }).eq("id", data.id);
    if (error) throw new Error("Impossible d'enregistrer les modifications.");
    return { ok: true };
  });

// ---------- publish-trust-page ----------
function randomSlugPart(len = 12) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "app";
}

export const publishTrustPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const { scanId, appName } = (input ?? {}) as { scanId?: unknown; appName?: unknown };
    if (typeof scanId !== "string" || !UUID.test(scanId)) throw new Error("Identifiant invalide.");
    const name = typeof appName === "string" ? appName.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 100) : "";
    if (!name) throw new Error("Indiquez le nom de votre app.");
    return { scanId, appName: name };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: scan } = await supabase.from("scans").select("id, status, results, created_at").eq("id", data.scanId).eq("user_id", userId).maybeSingle();
    if (!scan) throw new Error("Analyse introuvable.");
    if (scan.status !== "done" || !scan.results) throw new Error("Seule une analyse terminée peut être publiée.");
    const r = scan.results as unknown as ScanResults;
    const summary = {
      services: r.services.map((s) => ({ name: s.name, category: s.category })),
      cookies: { total: r.cookies.length, secure: r.cookies.filter((c) => c.secure && c.httpOnly).length },
      headers: r.headers.map((h) => ({ name: h.name, present: h.present })),
    };
    const { data: existing } = await supabase.from("trust_pages").select("id, slug").eq("scan_id", scan.id).maybeSingle();
    if (existing) {
      const { error } = await supabase.from("trust_pages").update({ app_name: data.appName, summary, published: true, last_scan_at: scan.created_at }).eq("id", existing.id);
      if (error) throw new Error("Impossible de publier la page.");
      return { slug: existing.slug };
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = `${slugify(data.appName)}-${randomSlugPart()}`;
      const { error } = await supabase.from("trust_pages").insert({ user_id: userId, scan_id: scan.id, slug, app_name: data.appName, summary, published: true, last_scan_at: scan.created_at });
      if (!error) return { slug };
      if (!error.message.includes("duplicate")) throw new Error("Impossible de publier la page.");
    }
    throw new Error("Impossible de publier la page. Réessayez.");
  });

export const unpublishTrustPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(uuidInput("scanId"))
  .handler(async ({ data, context }) => {
    await context.supabase.from("trust_pages").update({ published: false }).eq("scan_id", data.scanId ?? "");
    return { ok: true };
  });

// ---------- public trust page (no login) ----------
export interface PublicTrustPage { app_name: string; last_scan_at: string; summary: { services: { name: string; category: string }[]; cookies: { total: number; secure: number }; headers: { name: string; present: boolean }[] } }

export const getPublicTrustPage = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => {
    const slug = (input as { slug?: unknown } | null)?.slug;
    if (typeof slug !== "string" || !/^[a-z0-9-]{3,60}$/.test(slug)) return { slug: "" };
    return { slug };
  })
  .handler(async ({ data }): Promise<PublicTrustPage | null> => {
    if (!data.slug) return null;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: { fetch: (i, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } },
    });
    const { data: row } = await sb.from("public_trust_pages").select("app_name,last_scan_at,summary").eq("slug",data.slug).eq("published",true).maybeSingle();
    return row ? (row as unknown as PublicTrustPage) : null;
  });
