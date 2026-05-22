import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminPlans, updatePlan } from "@/lib/app.functions";
import { formatDZD } from "@/lib/constants";

export const Route = createFileRoute("/admin/plans")({
  component: PlansPage,
});

function PlansPage() {
  const qc = useQueryClient();
  const fetchPlans = useServerFn(getAdminPlans);
  const updP = useServerFn(updatePlan);

  const { data: cfg } = useQuery({ queryKey: ["adminCfg"], queryFn: () => fetchPlans() });
  const [drafts, setDrafts] = useState<Record<string, { cost: string; margin: string }>>({});

  const mut = useMutation({
    mutationFn: (vars: { slug: string; providerCostUsd: number; marginPercent: number }) =>
      updP({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success("Forfait mis à jour");
      setDrafts((d) => {
        const n = { ...d };
        delete n[vars.slug];
        return n;
      });
      qc.invalidateQueries({ queryKey: ["adminCfg"] });
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-7xl">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="mb-5">
          <h2 className="font-semibold mb-1">Coût fournisseur & marge</h2>
          <p className="text-sm text-muted-foreground">
            Prix client (DZD) = coût USD × (1 + marge%) × taux. La marge reste privée.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
              <tr>
                <Th>Forfait</Th>
                <Th>Coût fournisseur ($)</Th>
                <Th>Marge (%)</Th>
                <Th>Prix client</Th>
                <Th>Bénéfice</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {cfg?.plans.map((p) => {
                const d = drafts[p.slug];
                const cost = d?.cost ?? String(p.providerCostUsd);
                const margin = d?.margin ?? String(p.marginPercent);
                const dirty = d !== undefined;
                return (
                  <tr key={p.slug} className="border-t border-border">
                    <td className="px-4 py-4 font-medium">{p.name}</td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={cost}
                        onChange={(e) =>
                          setDrafts((x) => ({
                            ...x,
                            [p.slug]: { cost: e.target.value, margin },
                          }))
                        }
                        className="w-28 px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-sm"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={margin}
                        onChange={(e) =>
                          setDrafts((x) => ({
                            ...x,
                            [p.slug]: { cost, margin: e.target.value },
                          }))
                        }
                        className="w-24 px-3 py-1.5 bg-muted/40 border border-border rounded-lg text-sm"
                      />
                    </td>
                    <td className="px-4 py-4 font-semibold text-brand whitespace-nowrap">
                      {formatDZD(p.priceDzd)}
                    </td>
                    <td className="px-4 py-4 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatDZD(p.profitDzd)}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        disabled={!dirty || mut.isPending}
                        onClick={() =>
                          mut.mutate({
                            slug: p.slug,
                            providerCostUsd: Number(cost),
                            marginPercent: Number(margin),
                          })
                        }
                        className="px-4 py-1.5 rounded-lg bg-brand text-white text-xs font-medium disabled:opacity-30 hover:opacity-90"
                      >
                        Sauver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left font-medium">{children}</th>;
}
