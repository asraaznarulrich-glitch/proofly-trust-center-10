import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ScanSearch, Wrench, Globe } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { UrlForm } from "@/components/UrlForm";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Proofly — Prouvez que votre app est fiable" },
    { name: "description", content: "Proofly analyse la partie publique de votre app et publie une page de confiance vérifiable pour vos clients." },
    { property: "og:title", content: "Proofly — Prouvez que votre app est fiable" },
    { property: "og:description", content: "Analysez votre app et publiez une page de confiance vérifiable." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const steps = [
  { icon: ScanSearch, title: "Analyser", text: "Nous examinons les services tiers, cookies et en-têtes de sécurité visibles publiquement." },
  { icon: Wrench, title: "Corriger", text: "Chaque point est expliqué simplement, avec ce qu'il faut améliorer." },
  { icon: Globe, title: "Publier votre page de confiance", text: "Partagez une page publique et un badge à placer dans votre site." },
];

function Index() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-16 sm:pt-24">
        <h1 className="font-display text-5xl leading-[1.05] sm:text-7xl">Prouvez que votre app est fiable</h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">Proofly analyse ce que votre app montre publiquement et publie une page de confiance que vos clients professionnels peuvent vérifier.</p>
        <div className="mt-10"><UrlForm onSubmit={() => navigate({ to: "/auth" })} /></div>
        <p className="mt-3 text-sm text-muted-foreground">Gratuit · Aucune installation · Résultat en quelques minutes</p>
        <ol className="mt-20 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground"><s.icon className="h-5 w-5" /></span>
                <span className="text-sm text-muted-foreground">Étape {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
