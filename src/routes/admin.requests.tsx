import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import {
  getAllRequests,
  decidePaymentRequest,
  getProofSignedUrl,
} from "@/lib/app.functions";
import { formatDZD } from "@/lib/constants";

export const Route = createFileRoute("/admin/requests")({
  component: RequestsPage,
});

type Filter = "all" | "pending" | "approved" | "rejected";

function RequestsPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(getAllRequests);
  const decide = useServerFn(decidePaymentRequest);
  const getProof = useServerFn(getProofSignedUrl);

  const { data: reqs } = useQuery({ queryKey: ["allReqs"], queryFn: () => fetchAll() });

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const decideMutation = useMutation({
    mutationFn: (vars: { id: string; decision: "approved" | "rejected"; reason?: string }) =>
      decide({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.decision === "approved" ? "Approuvé — wallet crédité" : "Rejeté");
      qc.invalidateQueries({ queryKey: ["allReqs"] });
      setOpenMenu(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleViewProof = async (path: string) => {
    try {
      const { url } = await getProof({ data: { path } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const list = reqs ?? [];
  const filtered = list
    .filter((r) => filter === "all" || r.status === filter)
    .filter(
      (r) =>
        !search ||
        r.user_email.toLowerCase().includes(search.toLowerCase()) ||
        r.receipt_number.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="max-w-7xl">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold">
            Toutes les demandes <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher demandes..."
                className="bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            <FilterDropdown value={filter} onChange={setFilter} />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">Aucune demande.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                <tr>
                  <Th>N° Reçu</Th>
                  <Th>Client</Th>
                  <Th>Date</Th>
                  <Th>Montant</Th>
                  <Th>Paiement</Th>
                  <Th>Statut</Th>
                  <Th>Preuve</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-4 font-mono text-xs">{r.receipt_number}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{r.user_email.split("@")[0]}</div>
                      <div className="text-xs text-muted-foreground">{r.user_email}</div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-DZ", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-4 font-semibold">{formatDZD(Number(r.amount_dzd))}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 capitalize">
                        {r.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-4">
                      {r.proof_path ? (
                        <button
                          onClick={() => handleViewProof(r.proof_path!)}
                          className="text-brand hover:underline text-xs inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          Voir
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 relative">
                      {r.status === "pending" ? (
                        <>
                          <button
                            onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                            className="p-1.5 hover:bg-muted rounded-lg"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu === r.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenu(null)}
                              />
                              <div className="absolute right-4 top-10 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden w-44">
                                <button
                                  onClick={() =>
                                    decideMutation.mutate({ id: r.id, decision: "approved" })
                                  }
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                                >
                                  <CheckCircle2 className="w-4 h-4" /> Approuver
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt("Raison du rejet (optionnel) :") ?? "";
                                    decideMutation.mutate({
                                      id: r.id,
                                      decision: "rejected",
                                      reason,
                                    });
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 text-red-600 dark:text-red-400"
                                >
                                  <XCircle className="w-4 h-4" /> Rejeter
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-medium">{children}</th>;
}

function FilterDropdown({ value, onChange }: { value: Filter; onChange: (v: Filter) => void }) {
  const [open, setOpen] = useState(false);
  const labels: Record<Filter, string> = {
    all: "Tous les statuts",
    pending: "En attente",
    approved: "Approuvées",
    rejected: "Rejetées",
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
      >
        {labels[value]}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden w-44">
            {(Object.keys(labels) as Filter[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                  k === value ? "font-semibold text-brand" : ""
                }`}
              >
                {labels[k]}
              </button>
            ))}
          </div>
        </>
      )}
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
