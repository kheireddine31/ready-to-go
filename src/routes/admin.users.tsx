import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Code2,
  Image as ImageIcon,
  Video,
  Sparkles,
} from "lucide-react";
import { getAllUsersOverview } from "@/lib/app.functions";
import { formatDZD, formatDZDPrecise, buildWhatsAppUrl } from "@/lib/constants";
import { ModelLogo } from "@/components/model-logo";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

const SOURCE_META: Record<string, { label: string; Icon: typeof MessageSquare; cls: string }> = {
  chat: { label: "Chat", Icon: MessageSquare, cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  code: { label: "Code", Icon: Code2, cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  image: {
    label: "Image",
    Icon: ImageIcon,
    cls: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  video: { label: "Vidéo", Icon: Video, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  autre: {
    label: "Autre",
    Icon: Sparkles,
    cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
};

function SourcePill({ source }: { source: string }) {
  const m = SOURCE_META[source] ?? SOURCE_META.autre;
  const Icon = m.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${m.cls}`}
    >
      <Icon className="w-3 h-3" />
      {m.label}
    </span>
  );
}

function UsersPage() {
  const fetchUsers = useServerFn(getAllUsersOverview);
  const { data } = useQuery({ queryKey: ["adminUsers"], queryFn: () => fetchUsers() });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = (data ?? []).filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.whatsapp ?? "").includes(search),
  );

  return (
    <div className="max-w-7xl">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold">
            Utilisateurs <span className="text-muted-foreground">({list.length})</span>
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, nom, WhatsApp..."
              className="bg-muted/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        </div>

        {list.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">Aucun utilisateur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                <tr>
                  <th className="w-8" />
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">WhatsApp</th>
                  <th className="px-4 py-3 text-right font-medium">Rechargé</th>
                  <th className="px-4 py-3 text-right font-medium">Solde restant</th>
                  <th className="px-4 py-3 text-right font-medium">Dépensé</th>
                  <th className="px-4 py-3 text-right font-medium">Messages</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const open = openId === u.userId;
                  return (
                    <Fragment key={u.userId}>
                      <tr
                        onClick={() => setOpenId(open ? null : u.userId)}
                        className="border-t border-border hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        <td className="pl-4 text-muted-foreground">
                          {open ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{u.fullName || u.email.split("@")[0]}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          {u.whatsapp ? (
                            <a
                              href={buildWhatsAppUrl("Bonjour " + (u.fullName || ""), u.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 hover:underline font-mono text-xs"
                            >
                              {u.whatsapp}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatDZD(u.totalCreditedDzd)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatDZD(u.balanceDzd)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {formatDZDPrecise(u.totalSpentDzd)}
                        </td>
                        <td className="px-4 py-3 text-right">{u.totalMessages}</td>
                      </tr>

                      {open && (
                        <tr className="bg-muted/10 border-t border-border">
                          <td />
                          <td colSpan={6} className="px-4 py-5">
                            <div className="grid lg:grid-cols-2 gap-6">
                              {/* Per-model */}
                              <div>
                                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                  Modèles utilisés
                                </h4>
                                {u.byModel.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Aucune utilisation.
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {u.byModel.map((m) => (
                                      <li
                                        key={m.slug}
                                        className="flex items-center gap-3 bg-card border border-border rounded-lg p-2.5"
                                      >
                                        <ModelLogo slug={m.slug} size={32} rounded="rounded-lg" />
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">
                                            {m.name}
                                          </div>
                                          <div className="text-[11px] text-muted-foreground">
                                            {m.count} appels · {m.tokens.toLocaleString("fr-DZ")}{" "}
                                            tokens
                                          </div>
                                        </div>
                                        <div className="text-sm font-semibold text-right">
                                          {formatDZDPrecise(m.costDzd)}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {u.bySource.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                      Par source
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {u.bySource.map((s) => (
                                        <div
                                          key={s.source}
                                          className="bg-card border border-border rounded-lg px-3 py-1.5 flex items-center gap-2"
                                        >
                                          <SourcePill source={s.source} />
                                          <span className="text-xs text-muted-foreground">
                                            {s.count} · {formatDZDPrecise(s.costDzd)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Recent */}
                              <div>
                                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                                  Historique récent
                                </h4>
                                {u.recent.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Aucun historique.
                                  </p>
                                ) : (
                                  <div className="max-h-80 overflow-y-auto pr-1">
                                    <table className="w-full text-xs">
                                      <thead className="text-[10px] uppercase text-muted-foreground">
                                        <tr>
                                          <th className="text-left py-1">Horodatage</th>
                                          <th className="text-left py-1">Modèle</th>
                                          <th className="text-left py-1">Source</th>
                                          <th className="text-right py-1">Tokens</th>
                                          <th className="text-right py-1">DZD</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {u.recent.map((r, i) => (
                                          <tr
                                            key={i}
                                            className="border-t border-border/60"
                                          >
                                            <td className="py-1.5 text-muted-foreground whitespace-nowrap">
                                              {new Date(r.createdAt).toLocaleString("fr-DZ", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })}
                                            </td>
                                            <td className="py-1.5 truncate max-w-[140px]">
                                              {r.modelName}
                                            </td>
                                            <td className="py-1.5">
                                              <SourcePill source={r.source} />
                                            </td>
                                            <td className="py-1.5 text-right">
                                              {r.tokens.toLocaleString("fr-DZ")}
                                            </td>
                                            <td className="py-1.5 text-right font-semibold">
                                              {formatDZDPrecise(r.costDzd)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
