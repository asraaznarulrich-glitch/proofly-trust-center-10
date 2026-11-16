import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FileText, Globe, Code2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { FindingSection } from "@/components/FindingList";
import { Button } from "@/components/ui/button";
import { getScan, formatDate } from "@/lib/proofly/mock";

export const Route = createFileRoute("/_authenticated/report/$id")({
  loader: ({ params }) => { const s = getScan(params.id); if (!s) throw notFound(); return s; },
  head: ({ loaderData }) => ({ meta: [
    { title: `Rapport ${loaderData?.appName ?? ""} — Proofly` }, { name: "description", content: "Résultat de l'analyse Proofly." },
    { property: "og:title", content: "Rapport d'analyse — Proofly" }, { property: "og:description", content: "Résultat de l'analyse Proofly." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Report,
});

function Report() {
  const s = Route.useLoaderData();
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-3xl space-y-10 px-5 py-12">
        <div><p className="text-sm text-muted-foreground">Analysé le {formatDate(s.date)}</p><h1 className="font-display text-4xl">{s.appName}</h1><p className="text-muted-foreground">{s.url}</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild size="lg" className="h-12"><Link to="/policy/$id" params={{ id: s.id }}><FileText className="h-4 w-4" />Générer ma politique de confidentialité</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-12"><Link to="/p/$slug" params={{ slug: s.slug }}><Globe className="h-4 w-4" />Publier ma page de confiance</Link></Button>
          <Button asChild size="lg" variant="ghost" className="h-12"><Link to="/badge/$id" params={{ id: s.id }}><Code2 className="h-4 w-4" />Code du badge</Link></Button>
        </div>
        <FindingSection title="Services tiers détectés" items={s.thirdParty} />
        <FindingSection title="Cookies" items={s.cookies} />
        <FindingSection title="En-têtes de sécurité" items={s.headers} />
      </main>
    </div>
  );
}
