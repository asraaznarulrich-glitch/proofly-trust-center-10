import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { UrlForm } from "@/components/UrlForm";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { mockSignOut } from "@/lib/proofly/auth";
import { statusLabel, formatDate, type Scan } from "@/lib/proofly/mock";

import { startScan, listScans } from "@/lib/proofly/api.functions";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async () => listScans(),
  head: () => ({ meta: [
    { title: "Tableau de bord — Proofly" }, { name: "description", content: "Vos analyses Proofly." },
    { property: "og:title", content: "Tableau de bord — Proofly" }, { property: "og:description", content: "Vos analyses Proofly." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

const variant = { termine: "default", en_cours: "secondary", echec: "destructive" } as const;

function Dashboard() {
  const navigate = useNavigate(); const router = useRouter();
  const run = useServerFn(startScan);
  const [running, setRunning] = useState(false);
  const list: Scan[] = Route.useLoaderData().map(s => ({ id: s.id, appName: new URL(s.url).hostname, url: s.url, date: s.created_at, slug: "", status: s.status === "done" ? "termine" : s.status === "failed" ? "echec" : "en_cours", thirdParty: [], cookies: [], headers: [] }));
  const start = async (url: string) => {
    setRunning(true);
    try {
      const result = await run({ data: { url } });
      if (result.status === "failed") toast.error(result.error);
      else toast.success(`Analyse de ${new URL(url).hostname} terminée`);
      await router.invalidate();
    } catch { toast.error("Cette adresse ne peut pas être analysée."); }
    finally { setRunning(false); }
  };
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-center justify-between"><h1 className="font-display text-4xl">Vos analyses</h1>
          <button className="text-sm text-muted-foreground" onClick={() => { void mockSignOut().then(() => navigate({ to: "/auth", replace: true })); }}>Se déconnecter</button></div>
        <div className="mt-8"><UrlForm onSubmit={start} label="Lancer une analyse" loading={running} /></div>
        <ul className="mt-10 divide-y divide-border rounded-2xl border border-border">
          {list.map((s) => {
            const inner = (<>
              <div className="min-w-0"><p className="truncate font-medium">{s.appName}</p><p className="truncate text-sm text-muted-foreground">{s.url} · {formatDate(s.date)}</p></div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={variant[s.status]} className="gap-1">{s.status === "en_cours" && <Loader2 className="h-3 w-3 animate-spin" />}{statusLabel[s.status]}</Badge>
                {s.status === "termine" && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div></>);
            return <li key={s.id}>{s.status === "termine"
              ? <Link to="/report/$id" params={{ id: s.id }} className="flex items-center justify-between gap-4 p-4 hover:bg-muted">{inner}</Link>
              : <div className="flex items-center justify-between gap-4 p-4">{inner}</div>}
              {s.status === "echec" && <p className="px-4 pb-4 text-sm text-destructive">Cette adresse ne peut pas être analysée.</p>}
            </li>;
          })}
        </ul>
      </main>
    </div>
  );
}
