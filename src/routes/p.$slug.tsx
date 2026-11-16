import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Logo, ProoflyBadge } from "@/components/SiteHeader";
import { getScanBySlug, formatDate, DISCLAIMER } from "@/lib/proofly/mock";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => { const s = await getScanBySlug(params.slug); if (!s) throw notFound(); return s; },
  head: ({ loaderData }) => ({ meta: [
    { title: `${loaderData?.appName ?? "Page"} — Page de confiance Proofly` },
    { name: "description", content: `Résumé de l'analyse publique de ${loaderData?.appName ?? "cette app"}.` },
    { property: "og:title", content: `${loaderData?.appName ?? "Page"} — Page de confiance` },
    { property: "og:description", content: DISCLAIMER },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  notFoundComponent: () => <div className="mx-auto max-w-md px-5 py-24 text-center"><h1 className="font-display text-3xl">Page de confiance introuvable</h1><p className="mt-2 text-muted-foreground">Cette page n'existe pas ou n'a pas encore été publiée.</p><Link to="/" className="mt-6 inline-block text-primary">Découvrir Proofly</Link></div>,
  component: TrustPage,
});

function TrustPage() {
  const s = Route.useLoaderData();
  const ok = s.headers.filter((h) => h.level === "ok").length;
  const stats = [
    { label: "Services tiers identifiés", value: s.thirdParty.length },
    { label: "Cookies déclarés", value: s.cookies.length },
    { label: "En-têtes de sécurité en place", value: `${ok}/${s.headers.length}` },
  ];
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-2xl px-5 py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Page de confiance</div>
        <h1 className="mt-3 font-display text-5xl">{s.appName}</h1>
        <p className="mt-2 text-muted-foreground">Dernière analyse le {formatDate(s.date)}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {stats.map((x) => <div key={x.label} className="rounded-2xl border border-border p-5"><p className="text-3xl font-semibold text-primary">{x.value}</p><p className="mt-1 text-sm text-muted-foreground">{x.label}</p></div>)}
        </div>
        <section className="mt-10 space-y-2"><h2 className="font-semibold">Services utilisés par l'application</h2>
          <ul className="space-y-2 text-sm">{s.thirdParty.map((t) => <li key={t.name} className="rounded-lg bg-muted p-3"><span className="font-medium">{t.name}</span> — {t.explanation}</li>)}</ul></section>
        <div className="mt-12"><ProoflyBadge slug={s.slug} /></div>
        <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">{DISCLAIMER}</p>
        <div className="mt-8 opacity-70"><Logo /></div>
      </main>
    </div>
  );
}
