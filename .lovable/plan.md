## Réactiver la confirmation email plus tard

Quand tu seras prêt (par exemple après avoir configuré un domaine email pro), il suffira de me demander : **"réactive la confirmation email"**.

Je ferai alors :

1. **Désactiver l'auto-confirm** via la configuration auth (`auto_confirm_email: false`)
2. Les **nouveaux inscrits** devront cliquer sur le lien reçu par email avant de pouvoir se connecter
3. Les **utilisateurs existants** (déjà inscrits ou confirmés manuellement) ne seront pas affectés — ils continuent de se connecter normalement

### Recommandations pour ce moment-là

- **Avant de réactiver**, configurer un domaine email pro (ex: `notify@dzd.ai`) pour que les emails de confirmation ne tombent pas en spam. Sinon Gmail/Outlook filtreront les emails par défaut de Lovable.
- **Personnaliser les templates** d'email avec ta marque DZD.AI (logo, couleurs, texte FR)
- **Ajouter une page `/reset-password`** si tu veux aussi permettre la récupération de mot de passe par email

### Ce qui reste pareil

- L'inscription utilise toujours email + mot de passe + WhatsApp
- WhatsApp reste ton canal principal de support et paiement
- Tu peux re-désactiver à tout moment si ça crée trop de friction

**Aucune action requise maintenant** — c'est juste pour confirmer que c'est réversible en 1 message.