import { createFileRoute, notFound } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, ProoflyBadge } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { getScan } from "@/lib/proofly/mock";

export const Route = createFileRoute("/_authenticated/badge/$id")({
  loader: ({ params }) => { const s = getScan(params.id); if (!s) throw notFound(); return s; },
  head: () => ({ meta: [
    { title: "Badge Proofly — intégration" }, { name: "description", content: "Ajoutez le badge Proofly à votre site." },
    { property: "og:title", content: "Badge Proofly" }, { property: "og:description", content: "Ajoutez le badge Proofly à votre site." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: BadgePage,
});

function BadgePage() {
  const s = Route.useLoaderData();
  const url = `https://proofly.app/p/${s.slug}`;
  const snippet = `<a href="${url}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid #dfe3ea;border-radius:999px;font:600 13px system-ui;color:#1f2a44;text-decoration:none">🛡️ Page de confiance · Proofly</a>`;
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-12">
        <div><h1 className="font-display text-4xl">Ajoutez le badge à votre site</h1><p className="mt-2 text-muted-foreground">Collez ce code dans le pied de page de votre site. Il renvoie vers votre page de confiance.</p></div>
        <div className="rounded-2xl border border-border p-8 text-center"><ProoflyBadge slug={s.slug} /></div>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-4 text-xs">{snippet}</pre>
        <Button size="lg" onClick={() => navigator.clipboard.writeText(snippet).then(() => toast.success("Code copié"), () => toast.error("Impossible de copier"))}><Copy className="h-4 w-4" />Copier le code</Button>
      </main>
    </div>
  );
}
