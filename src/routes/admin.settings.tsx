import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload, QrCode, Send } from "lucide-react";
import {
  getAdminPlans,
  updateExchangeRate,
  setRedotpayQrPath,
  getPublicConfig,
  getPendingUsersForQr,
} from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppUrl, formatDZD } from "@/lib/constants";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const fetchPlans = useServerFn(getAdminPlans);
  const fetchConfig = useServerFn(getPublicConfig);
  const updRate = useServerFn(updateExchangeRate);
  const setQr = useServerFn(setRedotpayQrPath);
  const fetchPending = useServerFn(getPendingUsersForQr);

  const { data: cfg } = useQuery({ queryKey: ["adminCfg"], queryFn: () => fetchPlans() });
  const { data: pub } = useQuery({ queryKey: ["config"], queryFn: () => fetchConfig() });
  const { data: pending } = useQuery({
    queryKey: ["pendingForQr"],
    queryFn: () => fetchPending(),
  });

  const [rate, setRate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const mut = useMutation({
    mutationFn: () => updRate({ data: { rate: Number(rate) } }),
    onSuccess: () => {
      toast.success("Taux mis à jour");
      setRate("");
      qc.invalidateQueries({ queryKey: ["adminCfg"] });
      qc.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleQrUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image > 2 MB");
      return;
    }
    setUploading(true);
    try {
      const path = `redotpay/qr-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage
        .from("public-assets")
        .upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      await setQr({ data: { path } });
      toast.success("QR Redotpay enregistré");
      qc.invalidateQueries({ queryKey: ["config"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  };

  const selectedUser = pending?.find((u) => u.userId === selectedUserId);
  const qrUrl = pub?.redotpayQrUrl ?? "";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-1">Taux de change</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Actuel : <strong className="text-foreground">1 USD = {cfg?.rate ?? "..."} DZD</strong>
        </p>
        <div className="flex gap-2 max-w-sm">
          <input
            type="number"
            min="1"
            max="10000"
            step="0.5"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="Nouveau taux"
            className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/40 text-sm"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={!rate || mut.isPending}
            className="bg-brand hover:opacity-90 text-white font-medium px-5 py-2 rounded-lg disabled:opacity-50 text-sm"
          >
            {mut.isPending ? "..." : "Mettre à jour"}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <QrCode className="w-4 h-4" /> QR Code Redotpay
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Téléversez le QR puis envoyez-le directement à un utilisateur en attente d'approbation via WhatsApp.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT — upload */}
          <div>
            {qrUrl && (
              <img
                src={qrUrl}
                alt="QR Redotpay actuel"
                className="w-40 h-40 rounded-lg bg-white p-2 mb-4 border border-border"
              />
            )}
            <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-lg hover:border-brand/50 cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">
                {uploading ? "Upload en cours…" : "Téléverser (PNG/JPG, ≤2 MB)"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleQrUpload(f);
                }}
              />
            </label>
          </div>

          {/* RIGHT — send to pending user */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-3">Envoyer le QR à un utilisateur</h3>
            {!pending || pending.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune demande de paiement en attente pour le moment.
              </p>
            ) : (
              <>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Utilisateur (paiement en attente)
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 mb-3"
                >
                  <option value="">— Choisir un utilisateur —</option>
                  {pending.map((u) => (
                    <option key={u.userId + u.createdAt} value={u.userId}>
                      {u.email} · {u.planSlug} · {formatDZD(u.amountDzd)}
                      {u.whatsapp ? "" : " (pas de WhatsApp)"}
                    </option>
                  ))}
                </select>

                {selectedUser && (
                  <div className="text-xs space-y-1 mb-3 bg-card border border-border rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground">Nom : </span>
                      {selectedUser.fullName || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">WhatsApp : </span>
                      <span className="font-mono">{selectedUser.whatsapp || "non renseigné"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Méthode : </span>
                      {selectedUser.paymentMethod}
                    </div>
                  </div>
                )}

                <a
                  href={
                    selectedUser && selectedUser.whatsapp
                      ? buildWhatsAppUrl(
                          `Bonjour ${selectedUser.fullName || ""},\n\n` +
                            `Voici le QR Redotpay pour finaliser votre paiement DZD.AI :\n` +
                            `• Forfait : ${selectedUser.planSlug}\n` +
                            `• Montant : ${formatDZD(selectedUser.amountDzd)}\n\n` +
                            (qrUrl ? `QR : ${qrUrl}\n\n` : "") +
                            `Merci de scanner le QR depuis votre application Redotpay puis de m'envoyer la preuve.`,
                          selectedUser.whatsapp,
                        )
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!selectedUser) {
                      e.preventDefault();
                      toast.error("Choisissez un utilisateur");
                    } else if (!selectedUser.whatsapp) {
                      e.preventDefault();
                      toast.error("Cet utilisateur n'a pas renseigné de WhatsApp");
                    } else if (!qrUrl) {
                      e.preventDefault();
                      toast.error("Téléversez d'abord le QR Redotpay");
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Envoyer le QR via WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
