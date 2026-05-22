import { Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-bold text-primary-foreground text-sm">
              د
            </div>
            <span className="font-display font-bold">{APP_NAME}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            L'intelligence artificielle accessible aux Algériens, payée en Dinars.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-foreground">Plateforme</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary">Accueil</Link></li>
            <li><Link to="/dashboard" className="hover:text-primary">Tarifs DZD</Link></li>
            <li><Link to="/platform" className="hover:text-primary">Plateforme IA</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-foreground">Légal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="opacity-60">Conditions d'utilisation</span></li>
            <li><span className="opacity-60">Politique de confidentialité</span></li>
            <li><span className="opacity-60">Mentions légales</span></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-foreground">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><span className="opacity-60">FAQ</span></li>
            <li><span className="opacity-60">Contact</span></li>
            <li><span className="opacity-60">Discord</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {APP_NAME} — Fait avec ❤️ pour l'Algérie 🇩🇿
      </div>
    </footer>
  );
}
