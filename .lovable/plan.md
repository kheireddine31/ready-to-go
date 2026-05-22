## Objectif
Remplacer les logos Simple Icons (monochromes sur tuile colorée) par les **logos officiels couleur** via Brandfetch CDN, avec fallback automatique pour ne jamais afficher de logo cassé.

## Coût
- **0 crédit Lovable** : Brandfetch est un CDN d'images chargé par le navigateur, pas un appel AI Gateway.
- **Brandfetch** : free tier (1M requêtes/mois), largement suffisant. Nécessite uniquement un `clientId` public (pas un secret serveur).

## Ce qui change

### 1. Mapping modèle → domaine fournisseur
Mise à jour de `src/lib/model-logos.ts` : on remplace `PROVIDER_SLUG` (slugs Simple Icons) par `PROVIDER_DOMAIN` (domaines officiels) :

```
OpenAI       → openai.com
Anthropic    → anthropic.com
Google       → gemini.google.com
xAI          → x.ai
DeepSeek     → deepseek.com
Meta         → meta.com
Mistral      → mistral.ai
Alibaba/Qwen → qwen.ai
Perplexity   → perplexity.ai
```

`getModelLogo(slug, provider)` renvoie désormais :
- `src` Brandfetch : `https://cdn.brandfetch.io/{domain}/w/96/h/96?c={CLIENT_ID}`
- `fallbackSrc` Simple Icons (l'existant) pour `onError`
- `bg` : passe à un fond neutre (`#fff` en clair / `#0f0f10` en sombre) puisque les logos Brandfetch sont déjà colorés.

### 2. Composant `ModelLogo`
`src/components/model-logo.tsx` : ajout d'un `useState` pour basculer sur le fallback Simple Icons si l'image Brandfetch ne charge pas. Padding réduit (les logos couleur respirent moins qu'une icône monochrome).

### 3. Configuration
- Ajout de `VITE_BRANDFETCH_CLIENT_ID` dans `.env` (clé publique, donc préfixe `VITE_`).
- L'utilisateur crée un compte gratuit sur brandfetch.com/developers → copie son `clientId` → on l'enregistre via le tool secrets.

### 4. Points d'usage (aucun changement de markup, juste bénéfice visuel)
- `/` — `models-showcase.tsx` (grille des modèles)
- `/platform` — sidebar modèles + header chat + sections "Bots officiels / économiques"
- `/dashboard` — section "Modèles en tendance"
- `/admin/users` — détail consommation par modèle

## Détails techniques
- URL Brandfetch CDN : `https://cdn.brandfetch.io/{domain}/w/{size}/h/{size}?c={clientId}`. Pas d'auth header → safe côté navigateur.
- Fallback chain : Brandfetch → Simple Icons → emoji 🤖.
- Lazy loading conservé (`loading="lazy"`).
- Aucune modification de schéma DB, aucune migration.
- Aucun serverFn touché.

## À valider avant build
1. Tu confirmes qu'on bascule sur Brandfetch (vs garder Simple Icons) ?
2. Je te demanderai ton `clientId` Brandfetch via le formulaire de secret quand tu valides.