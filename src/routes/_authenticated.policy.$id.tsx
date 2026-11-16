import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getScan } from "@/lib/proofly/mock";

import { generatePolicy, getLatestPolicy, savePolicy } from "@/lib/proofly/api.functions";
import { useServerFn } from "@tanstack/react-start";
export const Route = createFileRoute("/_authenticated/policy/$id")({
  loader: async ({ params }) => { const s = await getScan(params.id); if (!s) throw notFound(); const policy = await getLatestPolicy({ data: { scanId: s.id } }); return { scan: s, policy }; },
  head: () => ({ meta: [
    { title: "Politique de confidentialité — Proofly" }, { name: "description", content: "Votre politique de confidentialité générée." },
    { property: "og:title", content: "Politique de confidentialité — Proofly" }, { property: "og:description", content: "Votre politique de confidentialité générée." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Policy,
});

function Policy() {
  const s = Route.useLoaderData();
  const [text, setText] = useState(s.policy?.content ?? "");
  const [policyId, setPolicyId] = useState(s.policy?.id ?? "");
  const [loading, setLoading] = useState(false);
  const generate = useServerFn(generatePolicy); const save = useServerFn(savePolicy);
  const generateText = async () => { setLoading(true); try { const p = await generate({ data: { scanId: s.scan.id } }); if (p) { setText(p.content); setPolicyId(p.id); } } catch { toast.error("Impossible de générer la politique."); } finally { setLoading(false); } };
  const placeholders = Array.from(new Set(text.match(/\[[^\]]+\]/g) ?? []));
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-5 py-12">
        <h1 className="font-display text-4xl">Politique de confidentialité</h1>
        {placeholders.length > 0 ? (
          <div className="rounded-xl bg-highlight p-4 text-sm"><p className="font-medium">À compléter avant publication :</p><p className="mt-1">{placeholders.join(" · ")}</p></div>
        ) : <p className="rounded-xl bg-accent p-4 text-sm">Tous les champs sont remplis.</p>}
        {!text && <Button onClick={generateText} disabled={loading}>{loading ? "Rédaction en cours…" : "Générer ma politique de confidentialité"}</Button>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => { if (policyId) void save({ data: { id: policyId, content: text } }).catch(() => toast.error("Enregistrement impossible.")); }} maxLength={50000} aria-label="Texte de la politique" className="min-h-[320px] w-full rounded-xl border border-input p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="flex justify-end"><Button size="lg" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Texte copié"), () => toast.error("Impossible de copier"))}><Copy className="h-4 w-4" />Copier le texte</Button></div>
        <div><h2 className="mb-3 font-semibold">Aperçu</h2>
          <div className="whitespace-pre-wrap rounded-xl border border-border p-6 text-sm leading-relaxed">{parts.map((p, i) => p.startsWith("[") ? <mark key={i} className="rounded bg-highlight px-1 font-semibold text-foreground">{p}</mark> : p)}</div></div>
      </main>
    </div>
  );
}
