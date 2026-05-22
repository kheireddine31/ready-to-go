import { createFileRoute, redirect, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { RefreshCw, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/app.functions";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Admin — DZD.AI" }] }),
  component: AdminLayout,
});

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/requests": "Demandes de paiement",
  "/admin/users": "Utilisateurs",
  "/admin/plans": "Forfaits",
  "/admin/settings": "Paramètres",
};

function AdminLayout() {
  const fetchMe = useServerFn(getMe);
  const { data: me, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-surface">
        <div className="glass-strong rounded-2xl p-10 max-w-md text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Cette page est réservée aux administrateurs.
          </p>
          <Link to="/dashboard" className="text-brand hover:underline text-sm">
            Retour au Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const title = TITLES[pathname] ?? "Admin";

  return (
    <AdminShell title={title} email={me.email}>
      <Outlet />
    </AdminShell>
  );
}
