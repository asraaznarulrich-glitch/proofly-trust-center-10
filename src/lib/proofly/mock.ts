export type ScanStatus = "en_cours" | "termine" | "echec";
export type Level = "ok" | "attention" | "info";
export interface Finding { name: string; detail: string; explanation: string; level: Level }
export interface Scan {
  id: string; slug: string; appName: string; url: string; date: string; status: ScanStatus;
  thirdParty: Finding[]; cookies: Finding[]; headers: Finding[];
}

export const statusLabel: Record<ScanStatus, string> = { en_cours: "En cours", termine: "Terminé", echec: "Échec" };
export const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function policyTemplate(s: Scan) {
  return `Politique de confidentialité — ${s.appName}

Dernière mise à jour : ${formatDate(s.date)}

1. Responsable du traitement
Le service ${s.appName} (${s.url}) est édité par [NOM DE L'ENTREPRISE], dont le siège est situé [ADRESSE DE L'ENTREPRISE]. Pour toute question : [E-MAIL DE CONTACT].

2. Données collectées
Nous collectons l'adresse e-mail et les informations nécessaires à la création de votre compte, ainsi que des données de navigation.

3. Services tiers
${s.thirdParty.map((t) => `- ${t.name} : ${t.explanation}`).join("\n")}

4. Cookies
${s.cookies.map((c) => `- ${c.name} (${c.detail}) : ${c.explanation}`).join("\n")}

5. Vos droits
Vous pouvez accéder à vos données, les corriger ou demander leur suppression en écrivant à [E-MAIL DE CONTACT]. Vous pouvez aussi saisir la CNIL.

6. Durée de conservation
Vos données sont conservées pendant [DURÉE DE CONSERVATION] après la fermeture de votre compte.`;
}

export const DISCLAIMER = "Analyse automatique des éléments publics de l'application. Ceci n'est pas une certification de sécurité.";
