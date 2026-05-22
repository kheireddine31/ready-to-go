import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Wallet,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Activity,
  MessageSquare,
  Coins,
  User,
  KeyRound,
  Save,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  getPublicConfig,
  getMyRequests,
  submitPaymentRequest,
  getMyWallet,
  getMyUsage,
  getMyProfile,
  updateMyProfile,
  getTrendingModels,
} from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";
import { ModelLogo } from "@/components/model-logo";
import {
  PAYMENT_METHODS,
  PAYMENT_DETAILS,
  CARD_PAYMENT_NOTICE,
  formatDZD,
  formatDZDPrecise,
  buildWhatsAppUrl,
} from "@/lib/constants";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Mon Compte — DZD.AI" },
      { name: "description", content: "Tableau de bord, consommation et recharges DZD.AI." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const fetchConfig = useServerFn(getPublicConfig);
  const fetchMyReqs = useServerFn(getMyRequests);
  const fetchWallet = useServerFn(getMyWallet);
  const fetchUsage = useServerFn(getMyUsage);
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const submit = useServerFn(submitPaymentRequest);
  const fetchTrending = useServerFn(getTrendingModels);

  const { data: config } = useQuery({ queryKey: ["config"], queryFn: () => fetchConfig() });
  const { data: myReqs } = useQuery({ queryKey: ["myReqs"], queryFn: () => fetchMyReqs() });
  const { data: wallet } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: () => fetchTrending(),
  });

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]["value"]>("BaridiMob");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Profile form
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? "");
      setWhatsapp(profile.whatsapp ?? "");
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("Choisissez un forfait");
      if (!receiptNumber.trim()) throw new Error("Numéro de reçu requis");

      let proofPath: string | null = null;
      if (proofFile) {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Non connecté");
        const fileName = `${user.user.id}/${Date.now()}-${proofFile.name}`;
        const { error } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, proofFile);
        if (error) throw new Error("Erreur upload: " + error.message);
        proofPath = fileName;
      }

      return submit({
        data: {
          planSlug: selectedPlan,
          receiptNumber: receiptNumber.trim(),
          paymentMethod,
          proofPath,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        `Demande envoyée pour ${res.planName} (${formatDZD(res.amountDzd)}). Vous recevrez vos accès sous 24h.`,
        { duration: 6000 },
      );
      setSelectedPlan(null);
      setReceiptNumber("");
      setProofFile(null);
      qc.invalidateQueries({ queryKey: ["myReqs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileMut = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          fullName,
          whatsapp,
          ...(apiKey ? { openrouterApiKey: apiKey } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Profil mis à jour");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isNewUser = (usage?.totalMessages ?? 0) === 0 && (wallet?.totalCreditedDzd ?? 0) === 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {isNewUser ? `Bienvenue ${fullName || userEmail.split("@")[0]} 👋` : "Mon Compte"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Connecté : <span className="text-foreground">{userEmail}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </motion.div>

        {/* CONSUMPTION DASHBOARD */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <StatCard
              icon={Wallet}
              label="Solde disponible"
              value={formatDZD(wallet?.balanceDzd ?? 0)}
              hint={`Rechargé : ${formatDZD(wallet?.totalCreditedDzd ?? 0)}`}
              highlight
            />
            <StatCard
              icon={Coins}
              label="Total dépensé"
              value={formatDZDPrecise(usage?.totalCostDzd ?? 0)}
              hint={`Sur ${usage?.totalMessages ?? 0} message(s)`}
            />
            <StatCard
              icon={MessageSquare}
              label="Messages envoyés"
              value={String(usage?.totalMessages ?? 0)}
              hint="Tous modèles confondus"
            />
            <StatCard
              icon={Activity}
              label="Tokens consommés"
              value={new Intl.NumberFormat("fr-DZ").format(usage?.totalTokens ?? 0)}
              hint="Entrée + sortie estimés"
            />
          </div>

          {/* Per-model breakdown */}
          {usage && usage.byModel.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Consommation par modèle
              </h3>
              <div className="space-y-3">
                {usage.byModel.map((m) => {
                  const total = usage.totalCostDzd || 1;
                  const pct = Math.min(100, Math.round((m.costDzd / total) * 100));
                  return (
                    <div key={m.slug}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-muted-foreground">
                          {m.count} msg · {formatDZDPrecise(m.costDzd)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary-glow"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {usage && usage.byModel.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Vous n'avez pas encore utilisé de modèle IA.
              </p>
              <Link
                to="/platform"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-glow text-primary-foreground font-medium px-4 py-2 rounded-lg text-sm"
              >
                Aller à la plateforme →
              </Link>
            </div>
          )}
        </section>

        {/* TRENDING MODELS */}
        {trending && trending.items.length > 0 && (
          <section className="mb-10 glass-strong rounded-2xl p-6">
            <div className="flex items-end justify-between mb-1 gap-3 flex-wrap">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Modèles en tendance
              </h2>
              <div className="text-[11px] text-muted-foreground">
                Sources :{" "}
                {trending.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && " · "}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.label}
                    </a>
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Classement consolidé (mis à jour le{" "}
              {new Date(trending.updatedAt).toLocaleDateString("fr-DZ")}).
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trending.items.map((t) => {
                const arrow = t.change === "up" ? "▲" : t.change === "down" ? "▼" : "·";
                const arrowCls =
                  t.change === "up"
                    ? "text-emerald-500"
                    : t.change === "down"
                      ? "text-red-500"
                      : "text-muted-foreground";
                return (
                  <Link
                    to="/platform"
                    key={t.slug}
                    className="glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="text-xs font-bold w-6 text-muted-foreground">#{t.rank}</div>
                    <ModelLogo
                      slug={t.slug}
                      provider={t.provider}
                      size={36}
                      rounded="rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{t.provider}</div>
                    </div>
                    <span className={`text-xs ${arrowCls}`}>{arrow}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}


        {/* PROFILE */}
        <section className="mb-10 glass-strong rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Mon profil
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            Vos coordonnées et votre clé API personnelle (optionnelle).
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="Nom complet">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="Votre nom"
              />
            </Field>
            <Field label="WhatsApp (pour vous contacter)">
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                placeholder="+213 ..."
              />
            </Field>
          </div>
          <Field
            label={
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Clé OpenRouter personnelle
                {profile?.hasOwnKey && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Configurée
                  </span>
                )}
              </span>
            }
          >
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-mono"
              placeholder={
                profile?.hasOwnKey
                  ? "•••••••••••••••• (laissez vide pour conserver)"
                  : "sk-or-v1-..."
              }
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Optionnel — si renseignée, vous pourrez l'utiliser dans le chat sans débiter votre
              solde DZD.
            </p>
          </Field>
          <button
            onClick={() => profileMut.mutate()}
            disabled={profileMut.isPending}
            className="mt-4 inline-flex items-center gap-2 bg-primary hover:bg-primary-glow text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {profileMut.isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </section>

        {/* Plans */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-2">Recharger votre compte</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choisissez un forfait, payez le montant indiqué via BaridiMob ou Redotpay, puis
            soumettez la preuve.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {config?.plans.map((plan, i) => {
              const isSelected = selectedPlan === plan.slug;
              return (
                <motion.button
                  key={plan.slug}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedPlan(plan.slug)}
                  className={`text-left rounded-2xl p-5 border-2 transition-all relative ${
                    isSelected
                      ? "border-primary bg-accent/30 glow-emerald"
                      : "border-border glass hover:border-primary/40"
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full">
                      POPULAIRE
                    </div>
                  )}
                  <h3 className="font-display text-lg font-bold mb-3">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gradient">
                      {formatDZD(plan.priceDzd)}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {plan.models.map((m) => (
                      <li key={m} className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Payment form */}
        {selectedPlan && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-6 md:p-8 mb-12"
          >
            <h2 className="text-2xl font-bold mb-2">Soumettre votre paiement</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Effectuez d'abord le paiement, puis remplissez ce formulaire.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Méthode de paiement
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        paymentMethod === pm.value
                          ? "border-primary bg-accent/30"
                          : "border-border glass hover:border-primary/40"
                      }`}
                    >
                      <div className="text-xl mb-1">{pm.icon}</div>
                      <div className="text-sm font-semibold">{pm.label}</div>
                      <div className="text-[10px] text-muted-foreground">{pm.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground italic">
                  💳 {CARD_PAYMENT_NOTICE}
                </p>
              </div>

              {PAYMENT_DETAILS[paymentMethod] && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <h3 className="text-sm font-semibold mb-3">
                    {PAYMENT_DETAILS[paymentMethod].title}
                  </h3>

                  {paymentMethod === "Redotpay" && config?.redotpayQrUrl && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={config.redotpayQrUrl}
                        alt="QR Redotpay"
                        className="w-48 h-48 rounded-lg bg-white p-2"
                      />
                    </div>
                  )}
                  {paymentMethod === "Redotpay" && !config?.redotpayQrUrl && (
                    <div className="mb-4 p-3 rounded-md bg-yellow-500/10 text-yellow-600 text-xs">
                      Le QR Redotpay n'est pas encore configuré. Contactez le support via WhatsApp.
                    </div>
                  )}

                  <dl className="space-y-1.5 text-xs">
                    {PAYMENT_DETAILS[paymentMethod].fields.map((f) => (
                      <div key={f.label} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{f.label}</dt>
                        <dd className="font-mono font-semibold text-foreground text-right">
                          {f.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    {PAYMENT_DETAILS[paymentMethod].note}
                  </p>

                  <a
                    href={buildWhatsAppUrl(
                      `Bonjour, je viens d'effectuer un paiement DZD.AI.\n\n` +
                        `• Email : ${userEmail}\n` +
                        `• Forfait : ${selectedPlan ?? "-"}\n` +
                        `• Méthode : ${paymentMethod}\n` +
                        `• N° reçu : ${receiptNumber || "(à compléter)"}\n\n` +
                        `Je joins la photo du reçu à ce message.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                  >
                    Envoyer le reçu sur WhatsApp
                  </a>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Numéro de reçu / référence transaction
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Ex: BM2024110512345"
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Capture/photo du reçu (image ou PDF, optionnel)
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    {proofFile ? proofFile.name : "Cliquez pour téléverser"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 5 * 1024 * 1024) {
                        toast.error("Fichier > 5 MB");
                        return;
                      }
                      setProofFile(f);
                    }}
                  />
                </label>
              </div>

              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="w-full bg-primary hover:bg-primary-glow text-primary-foreground font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {mutation.isPending ? "Envoi..." : "Envoyer ma demande"}
              </button>
            </div>
          </motion.section>
        )}

        {/* My requests */}
        {myReqs && myReqs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Mes demandes</h2>
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Forfait</th>
                    <th className="text-left p-3">N° Reçu</th>
                    <th className="text-left p-3">Montant</th>
                    <th className="text-left p-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {myReqs.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("fr-DZ")}
                      </td>
                      <td className="p-3 capitalize">{r.plan_slug}</td>
                      <td className="p-3 font-mono text-xs">{r.receipt_number}</td>
                      <td className="p-3 font-semibold">{formatDZD(Number(r.amount_dzd))}</td>
                      <td className="p-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/platform" className="text-primary hover:underline">
            Accéder à la plateforme IA →
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${highlight ? "glass-strong" : "glass"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? "text-gradient" : ""}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: typeof Clock; label: string; cls: string }> = {
    pending: { icon: Clock, label: "En vérification", cls: "bg-yellow-500/10 text-yellow-400" },
    approved: { icon: CheckCircle2, label: "Approuvé", cls: "bg-primary/10 text-primary" },
    rejected: { icon: XCircle, label: "Rejeté", cls: "bg-destructive/10 text-destructive" },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${c.cls}`}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}
