import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_NAME, ADMIN_EMAIL } from "@/lib/constants";
import { ThemeSwitcher } from "./theme-switcher";

export function Header() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = email === ADMIN_EMAIL;

  const navItems = [
    { to: "/", label: "Accueil" },
    { to: "/dashboard", label: "Mon Compte" },
    { to: "/platform", label: "Chat" },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 glass-strong border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-bold text-primary-foreground">
            د
          </div>
          <span className="font-display text-xl font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                path === item.to
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-4 py-2 rounded-md text-sm transition-colors inline-flex items-center gap-1.5 ${
                path === "/admin"
                  ? "text-primary bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          {email ? (
            <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[160px]">
              {email}
            </span>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-glow transition-colors"
            >
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
