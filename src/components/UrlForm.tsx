import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UrlForm({ onSubmit, label = "Analyser gratuitement", loading = false }: { onSubmit: (url: string) => void; label?: string; loading?: boolean }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="w-full space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const u = new URL(url.startsWith("http") ? url : `https://${url}`);
          if (!u.hostname.includes(".")) throw new Error();
          setError("");
          onSubmit(u.toString());
        } catch {
          setError("Cette adresse ne semble pas valide. Exemple : https://monapp.com");
        }
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Collez l'URL de votre app" aria-label="URL de votre app" className="h-14 flex-1 text-base" />
        <Button type="submit" size="lg" className="h-14 px-6 text-base" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Analyse en cours…" : label}
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
