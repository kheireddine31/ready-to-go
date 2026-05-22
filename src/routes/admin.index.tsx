import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { getAllRequests, getAdminPlans } from "@/lib/app.functions";
import { formatDZD } from "@/lib/constants";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchAll = useServerFn(getAllRequests);
  const fetchPlans = useServerFn(getAdminPlans);

  const { data: reqs } = useQuery({ queryKey: ["allReqs"], queryFn: () => fetchAll() });
  const { data: cfg } = useQuery({ queryKey: ["adminCfg"], queryFn: () => fetchPlans() });

  const list = reqs ?? [];
  const pending = list.filter((r) => r.status === "pending");
  const approved = list.filter((r) => r.status === "approved");
  const rejected = list.filter((r) => r.status === "rejected");
  const revenue = approved.reduce((s, r) => s + Number(r.amount_dzd), 0);

  const profitBySlug = new Map<string, number>();
  cfg?.plans.forEach((p) => profitBySlug.set(p.slug, p.profitDzd));
  const totalProfit = approved.reduce(
    (s, r) => s + (profitBySlug.get(r.plan_slug) ?? 0),
    0,
  );

  const recent = list.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Revenu total"
          value={formatDZD(revenue)}
          icon={DollarSign}
          tone="emerald"
        />
        <StatCard label="Demandes" value={list.length} icon={TrendingUp} tone="blue" />
        <StatCard
          label="Bénéfice estimé"
          value={formatDZD(totalProfit)}
          icon={ArrowUpRight}
          tone="violet"
        />
        <StatCard label="En attente" value={pending.length} icon={Clock} tone="amber" />
      </div>

      {/* Status overview + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status donut-ish */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Statut des demandes</h2>
          <StatusBar
            items={[
              { label: "En attente", value: pending.length, color: "bg-amber-400" },
              { label: "Approuvées", value: approved.length, color: "bg-emerald-500" },
              { label: "Rejetées", value: rejected.length, color: "bg-red-500" },
            ]}
          />
          <div className="mt-6 space-y-3 text-sm">
            <LegendRow color="bg-amber-400" label="En attente" value={pending.length} />
            <LegendRow color="bg-emerald-500" label="Approuvées" value={approved.length} />
            <LegendRow color="bg-red-500" label="Rejetées" value={rejected.length} />
          </div>
        </div>

        {/* Recent */}
        <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Demandes récentes</h2>
            <Link
              to="/admin/requests"
              className="text-xs text-brand hover:underline inline-flex items-center gap-1"
            >
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune demande.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 font-medium">Utilisateur</th>
                  <th className="text-left py-2 font-medium">Forfait</th>
                  <th className="text-left py-2 font-medium">Montant</th>
                  <th className="text-left py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 text-xs">{r.user_email}</td>
                    <td className="py-3 capitalize">{r.plan_slug}</td>
                    <td className="py-3 font-medium">{formatDZD(Number(r.amount_dzd))}</td>
                    <td className="py-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Clock;
  tone: "emerald" | "amber" | "blue" | "violet";
}) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  };
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function StatusBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
      {items.map((i) => (
        <div
          key={i.label}
          className={i.color}
          style={{ width: `${(i.value / total) * 100}%` }}
          title={`${i.label}: ${i.value}`}
        />
      ))}
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: {
      label: "en attente",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
      Icon: Clock,
    },
    approved: {
      label: "approuvé",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
      Icon: CheckCircle2,
    },
    rejected: {
      label: "rejeté",
      cls: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
      Icon: XCircle,
    },
  };
  const m = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}
    >
      <m.Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}
