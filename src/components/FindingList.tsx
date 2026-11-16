import type { Finding } from "@/lib/proofly/mock";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

const icon = { ok: <CheckCircle2 className="h-5 w-5 text-success" />, attention: <AlertTriangle className="h-5 w-5 text-warning" />, info: <Info className="h-5 w-5 text-primary" /> };

export function FindingSection({ title, items }: { title: string; items: Finding[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title} <span className="text-muted-foreground">({items.length})</span></h2>
      <ul className="space-y-3">
        {items.map((f) => (
          <li key={f.name} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <div className="mt-0.5 shrink-0">{icon[f.level]}</div>
            <div>
              <p className="font-medium">{f.name} <span className="text-sm font-normal text-muted-foreground">· {f.detail}</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{f.explanation}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
