import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { UrlForm } from "@/components/UrlForm";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMockUser, mockSignOut } from "@/lib/proofly/auth";
import { scans as initial, statusLabel, formatDate, type Scan } from "@/lib/proofly/mock";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Tableau de bord — Proofly" }, { name: "description", content: "Vos analyses Proofly." },
    { property: "og:title", content: "Tableau de bord — Proofly" }, { property: "og:description", content: "Vos analyses Proofly." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

const variant = { termine: "default", en_cours: "secondary", echec: "destructive" } as const;

function Dashboard() {
  const user = useMockUser(); const navigate = useNavigate();
  const [list, setList] = useState<Scan[]>(initial); const [running, setRunning] = useState(false);
  useEffect(() => { if (user === null) navigate({ to: "/auth" }); }, [user, navigate]);
  if (!user) return <div className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-3xl space-y-3 px-5 py-12"><Skeleton className="h-14" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div></div>;

  const start = (url: string) => {
    const host = new URL(url).hostname;
    const s: Scan = { ...initial[0]!, id: `n${Date.now()}`, appName: host, url, date: new Date().toISOString(), status: "en_cours" };
    setList((l) => [s, ...l]); setRunning(true);
    toast("Analyse lancée", { description: "Cela prend généralement 1 à 2 minutes." });
    setTimeout(() => { setList((l) => l.map((x) => (x.id === s.id ? { ...x, status: "termine" } : x))); setRunning(false); toast.success(`Analyse de ${host} terminée`); }, 4000);
  };
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-center justify-between"><h1 className="font-display text-4xl">Vos analyses</h1>
          <button className="text-sm text-muted-foreground" onClick={() => { mockSignOut(); navigate({ to: "/auth", replace: true }); }}>Se déconnecter</button></div>
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
              ? <Link to="/report/$id" params={{ id: s.id.startsWith("n") ? "s1" : s.id }} className="flex items-center justify-between gap-4 p-4 hover:bg-muted">{inner}</Link>
              : <div className="flex items-center justify-between gap-4 p-4">{inner}</div>}
              {s.status === "echec" && <p className="px-4 pb-4 text-sm text-destructive">Le site n'a pas répondu. Vérifiez qu'il est en ligne puis relancez l'analyse.</p>}
            </li>;
          })}
        </ul>
      </main>
    </div>
  );
}
