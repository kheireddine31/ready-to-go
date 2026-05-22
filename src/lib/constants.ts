export const APP_NAME = "DZD.AI";
export const ADMIN_EMAIL = "kherobb@gmail.com";

// Numéro WhatsApp de support (format international sans +)
export const WHATSAPP_NUMBER = "213553695068";
export const WHATSAPP_DISPLAY = "+213 553 69 50 68";

export function buildWhatsAppUrl(message: string, phoneNumber?: string): string {
  const raw = (phoneNumber ?? WHATSAPP_NUMBER).replace(/[^\d]/g, "");
  return `https://wa.me/${raw}?text=${encodeURIComponent(message)}`;
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(amount) + " DZD";
}

export function formatDZDPrecise(amount: number): string {
  return new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 2 }).format(amount) + " DZD";
}

export function formatUSD(amount: number): string {
  return "$" + amount.toFixed(0);
}

export const PAYMENT_METHODS = [
  {
    value: "BaridiMob",
    label: "BaridiMob",
    desc: "Application mobile Algérie Poste",
    icon: "📱",
  },
  {
    value: "Redotpay",
    label: "Redotpay",
    desc: "Paiement via QR code Redotpay",
    icon: "🔴",
  },
] as const;

// Coordonnées de paiement affichées à l'utilisateur avant soumission
export const PAYMENT_DETAILS = {
  BaridiMob: {
    title: "Paiement via BaridiMob (Algérie Poste)",
    fields: [
      { label: "N° compte RIB", value: "00799999001266584884" },
      { label: "Référence à indiquer", value: "Votre email DZD.AI" },
    ],
    note: "Ouvrez l'app BaridiMob → Transfert → entrez le montant exact, puis envoyez le reçu ci-dessous.",
  },
  Redotpay: {
    title: "Paiement via Redotpay",
    fields: [
      { label: "Méthode", value: "Scannez le QR code Redotpay" },
      { label: "Référence à indiquer", value: "Votre email DZD.AI" },
    ],
    note: "Le QR code Redotpay s'affiche ci-dessous. Scannez-le depuis votre application, puis envoyez la preuve de paiement.",
  },
} as const;

export const CARD_PAYMENT_NOTICE =
  "Paiement par carte CIB / Edahabia : bientôt disponible (intégration SATIM en cours).";
