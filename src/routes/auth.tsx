import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Connexion — Proofly" }, { name: "description", content: "Connectez-vous ou créez votre compte Proofly." },
    { property: "og:title", content: "Connexion — Proofly" }, { property: "og:description", content: "Connectez-vous ou créez votre compte Proofly." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Adresse e-mail invalide.");
    if (pw.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    setError(""); setLoading(true);
    try {
      const { data, error } = mode === "signup" ? await supabase.auth.signUp({ email, password: pw }) : await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) { setError("Connexion impossible. Vérifiez vos informations."); return; }
      if (!data.session) { setError("Consultez votre e-mail pour confirmer votre compte."); return; }
      await navigate({ to: "/dashboard" });
    } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="font-display text-4xl">{mode === "signup" ? "Créer un compte" : "Se connecter"}</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" /></div>
          <div className="space-y-2"><Label htmlFor="pw">Mot de passe</Label><Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-12" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "signup" ? "Créer mon compte" : "Se connecter"}</Button>
        </form>
        <button onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }} className="mt-6 text-sm text-primary">
          {mode === "signup" ? "Déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
        </button>
      </main>
    </div>
  );
}
