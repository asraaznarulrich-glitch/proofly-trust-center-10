import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useMockUser } from "@/lib/proofly/auth";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-4 w-4" /></span>
      Proofly
    </Link>
  );
}

export function SiteHeader() {
  const user = useMockUser();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
        {user ? (
          <Link to="/dashboard" className="text-sm font-medium text-primary">Tableau de bord</Link>
        ) : (
          <Link to="/auth" className="text-sm font-medium text-primary">Se connecter</Link>
        )}
      </div>
    </header>
  );
}

export function ProoflyBadge({ slug }: { slug: string }) {
  return (
    <Link to="/p/$slug" params={{ slug }} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-soft">
      <ShieldCheck className="h-4 w-4 text-primary" /> Page de confiance · Proofly
    </Link>
  );
}
