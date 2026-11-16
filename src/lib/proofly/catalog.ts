// Shared catalog: known third-party services, security headers, and plain-language explanations.
export interface ServiceDef { id: string; name: string; category: string; domains: string[]; signatures?: string[]; explanation: string }

export const SERVICES: ServiceDef[] = [
  { id: "ga", name: "Google Analytics", category: "Mesure d'audience", domains: ["google-analytics.com", "googletagmanager.com", "analytics.google.com"], signatures: ["gtag(", "google-analytics.com/analytics.js"], explanation: "Mesure d'audience de Google. En Europe, il faut recueillir le consentement des visiteurs avant de l'activer." },
  { id: "meta", name: "Meta Pixel", category: "Publicité", domains: ["connect.facebook.net", "facebook.com/tr"], signatures: ["fbq("], explanation: "Suivi publicitaire de Meta (Facebook, Instagram). Nécessite le consentement des visiteurs." },
  { id: "hotjar", name: "Hotjar", category: "Analyse de comportement", domains: ["hotjar.com", "hotjar.io"], signatures: ["hjid", "_hjSettings"], explanation: "Enregistre les clics et mouvements des visiteurs pour analyser l'usage du site. Consentement requis." },
  { id: "stripe", name: "Stripe", category: "Paiement", domains: ["js.stripe.com", "stripe.com", "stripe.network"], explanation: "Paiements en ligne. Les données de carte sont traitées par Stripe, pas par votre serveur." },
  { id: "intercom", name: "Intercom", category: "Support client", domains: ["intercom.io", "intercomcdn.com", "widget.intercom.io"], explanation: "Chat de support. Les messages et l'identité des visiteurs peuvent être transmis à Intercom." },
  { id: "crisp", name: "Crisp", category: "Support client", domains: ["crisp.chat"], explanation: "Chat de support. Les conversations sont stockées par Crisp." },
  { id: "hubspot", name: "HubSpot", category: "Marketing", domains: ["hs-scripts.com", "hubspot.com", "hsforms.net", "hs-analytics.net"], explanation: "Outil marketing et CRM. Peut suivre les visiteurs et collecter des formulaires." },
  { id: "segment", name: "Segment", category: "Mesure d'audience", domains: ["segment.com", "segment.io", "cdn.segment.com"], explanation: "Collecte des événements d'usage et les envoie vers d'autres outils." },
  { id: "mixpanel", name: "Mixpanel", category: "Mesure d'audience", domains: ["mixpanel.com", "mxpnl.com"], explanation: "Analyse l'usage du produit à partir des actions des utilisateurs." },
  { id: "posthog", name: "PostHog", category: "Mesure d'audience", domains: ["posthog.com", "i.posthog.com"], explanation: "Analyse l'usage du produit et peut enregistrer des sessions." },
  { id: "plausible", name: "Plausible", category: "Mesure d'audience", domains: ["plausible.io"], explanation: "Mesure d'audience respectueuse de la vie privée, sans cookie." },
  { id: "clarity", name: "Microsoft Clarity", category: "Analyse de comportement", domains: ["clarity.ms"], explanation: "Enregistre les sessions des visiteurs. Consentement requis." },
  { id: "linkedin", name: "LinkedIn Insight", category: "Publicité", domains: ["snap.licdn.com", "px.ads.linkedin.com"], explanation: "Suivi publicitaire de LinkedIn. Consentement requis." },
  { id: "tiktok", name: "TikTok Pixel", category: "Publicité", domains: ["analytics.tiktok.com"], explanation: "Suivi publicitaire de TikTok. Consentement requis." },
  { id: "gfonts", name: "Google Fonts", category: "Polices", domains: ["fonts.googleapis.com", "fonts.gstatic.com"], explanation: "Polices chargées depuis Google : l'adresse IP des visiteurs est transmise à Google." },
  { id: "recaptcha", name: "Google reCAPTCHA", category: "Anti-spam", domains: ["google.com/recaptcha", "recaptcha.net", "gstatic.com/recaptcha"], explanation: "Protection anti-robots de Google, qui analyse le comportement du visiteur." },
  { id: "youtube", name: "YouTube", category: "Vidéo", domains: ["youtube.com", "youtube-nocookie.com", "ytimg.com"], explanation: "Vidéos intégrées. YouTube peut déposer des cookies chez le visiteur." },
  { id: "vimeo", name: "Vimeo", category: "Vidéo", domains: ["vimeo.com", "vimeocdn.com"], explanation: "Vidéos intégrées hébergées par Vimeo." },
  { id: "sentry", name: "Sentry", category: "Suivi d'erreurs", domains: ["sentry.io", "sentry-cdn.com"], explanation: "Remonte les erreurs techniques. Peut inclure des informations sur le navigateur du visiteur." },
  { id: "supabase", name: "Supabase", category: "Hébergement de données", domains: ["supabase.co", "supabase.in"], explanation: "Héberge la base de données et la connexion des utilisateurs." },
  { id: "firebase", name: "Firebase", category: "Hébergement de données", domains: ["firebaseio.com", "firebaseapp.com", "googleapis.com/identitytoolkit"], explanation: "Service Google qui héberge des données et la connexion des utilisateurs." },
  { id: "cloudflare", name: "Cloudflare", category: "Réseau / CDN", domains: ["cloudflareinsights.com", "cdnjs.cloudflare.com", "challenges.cloudflare.com"], explanation: "Diffuse des fichiers ou mesure la performance du site." },
  { id: "paypal", name: "PayPal", category: "Paiement", domains: ["paypal.com", "paypalobjects.com"], explanation: "Paiements via PayPal." },
  { id: "calendly", name: "Calendly", category: "Prise de rendez-vous", domains: ["calendly.com"], explanation: "Prise de rendez-vous en ligne : les informations saisies sont envoyées à Calendly." },
  { id: "typeform", name: "Typeform", category: "Formulaires", domains: ["typeform.com"], explanation: "Formulaires en ligne : les réponses sont stockées par Typeform." },
];

export const HEADERS = [
  { key: "content-security-policy", name: "Content-Security-Policy", explanation: "Limite les scripts autorisés sur vos pages, ce qui réduit le risque d'injection de code malveillant." },
  { key: "strict-transport-security", name: "HTTPS strict (HSTS)", explanation: "Oblige le navigateur à utiliser une connexion chiffrée vers votre app." },
  { key: "x-frame-options", name: "X-Frame-Options", explanation: "Empêche d'afficher votre app dans un cadre sur un autre site (protection contre le « clickjacking »)." },
  { key: "x-content-type-options", name: "X-Content-Type-Options", explanation: "Empêche le navigateur de deviner le type des fichiers, ce qui évite certaines attaques." },
  { key: "referrer-policy", name: "Referrer-Policy", explanation: "Contrôle les informations sur la page d'origine transmises aux autres sites." },
] as const;

export interface CookieFinding { name: string; secure: boolean; httpOnly: boolean; sameSite: string | null }
export interface ScanResults {
  finalUrl: string; title: string | null; scannedAt: string;
  services: { id: string; name: string; category: string; domains: string[] }[];
  cookies: CookieFinding[];
  headers: { key: string; name: string; present: boolean }[];
}

export function explainService(id: string) { return SERVICES.find((s) => s.id === id)?.explanation ?? "Service tiers chargé par votre app."; }
export function explainHeader(key: string) { return HEADERS.find((h) => h.key === key)?.explanation ?? ""; }
export function explainCookie(c: CookieFinding) {
  const issues = [!c.secure && "pas marqué « Secure » (peut circuler sans chiffrement)", !c.httpOnly && "lisible par les scripts de la page", !c.sameSite && "sans règle SameSite"].filter(Boolean);
  return issues.length ? `Cookie déposé par votre serveur : ${issues.join(", ")}.` : "Cookie déposé par votre serveur, correctement protégé.";
}
