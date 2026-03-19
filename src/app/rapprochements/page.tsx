"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatutTP = "en_attente" | "recu" | "partiel" | "rejete" | null;

interface Dossier {
  id: string;
  client: { nom: string; prenom: string; mutuelle?: string };
  offreChoisie?: string;
  totalConfort?: number;
  totalEssentiel?: number;
  totalPremium?: number;
  createdAt: string;
  updatedAt: string;
  statutPaiementSS: StatutTP;
  montantAttenduSS?: number;
  montantRecuSS?: number;
  datePaiementSS?: string;
  motifRejetSS?: string;
  statutPaiementMutuelle: StatutTP;
  montantAttenduMutuelle?: number;
  montantRecuMutuelle?: number;
  datePaiementMutuelle?: string;
  motifRejetMutuelle?: string;
}

interface Stats {
  countEnAttenteSS: number;
  totalAttenduSS: number;
  countEnAttenteMutuelle: number;
  totalAttenduMutuelle: number;
  countProblemes: number;
  totalRecuMois: number;
}

interface DevisAccepte {
  id: string;
  client: { nom: string; prenom: string };
  offreChoisie?: string;
  totalConfort?: number;
  totalEssentiel?: number;
  createdAt: string;
}

interface LigneReleve {
  date: string;
  libelle: string;
  montant: number;
  organisme: "SS" | "Mutuelle" | "Inconnu";
  dossierSuggere?: { id: string; client: string; montantAttendu: number; ecart: number };
  confirme: boolean;
  devisIdConfirme?: string;
}

// ─── Constantes visuel ────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: string }
> = {
  en_attente: { label: "En attente",  color: "#A78BFA", bg: "rgba(167,139,250,0.15)",  icon: "⏳" },
  recu:       { label: "Reçu",        color: "#34D399", bg: "rgba(52,211,153,0.12)",   icon: "✅" },
  partiel:    { label: "Partiel",     color: "#F472B6", bg: "rgba(244,114,182,0.15)",  icon: "⚠️" },
  rejete:     { label: "Rejeté",      color: "#FB7185", bg: "rgba(251,113,133,0.15)",  icon: "❌" },
};

const FILTRE_TABS = [
  { id: "tous",        label: "Tous" },
  { id: "en_attente",  label: "En attente" },
  { id: "probleme",    label: "Problèmes" },
  { id: "regle",       label: "Réglés" },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (!n && n !== 0) return "—";
  return n.toFixed(2).replace(".", ",") + " €";
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("fr-FR");
}

// ─── Composant badge statut ────────────────────────────────────────────────────

function BadgeTP({ statut }: { statut: StatutTP }) {
  if (!statut) return null;
  const c = STATUT_CONFIG[statut];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color }}
    >
      {c.icon} {c.label}
    </span>
  );
}

// ─── Mini-formulaire inline ────────────────────────────────────────────────────

interface ActionFormProps {
  type: "recu" | "rejete" | "partiel" | "init";
  organisme: "SS" | "Mutuelle";
  montantAttendu?: number;
  onConfirm: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

function ActionForm({ type, organisme, montantAttendu, onConfirm, onCancel }: ActionFormProps) {
  const [montant, setMontant] = useState(montantAttendu ? String(montantAttendu) : "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState("");
  const [montantAttenduSS, setMontantAttenduSS] = useState("");
  const [montantAttenduMut, setMontantAttenduMut] = useState("");

  function submit() {
    if (type === "init") {
      onConfirm({ montantAttenduSS: montantAttenduSS || undefined, montantAttenduMutuelle: montantAttenduMut || undefined });
      return;
    }
    const key = organisme === "SS" ? "SS" : "Mutuelle";
    if (type === "recu" || type === "partiel") {
      onConfirm({
        [`statutPaiement${key}`]: type === "recu" ? "recu" : "partiel",
        [`montantRecu${key}`]: parseFloat(montant) || 0,
        [`datePaiement${key}`]: date,
      });
    } else {
      onConfirm({
        [`statutPaiement${key}`]: "rejete",
        [`motifRejet${key}`]: motif,
      });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="mt-3 p-3 rounded-xl border"
      style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
    >
      {type === "init" ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: "#9B96DA" }}>
            Initialiser le suivi tiers payant
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs" style={{ color: "#9B96DA" }}>Attendu SS (€)</label>
              <input
                type="number" step="0.01" placeholder="15,65"
                value={montantAttenduSS}
                onChange={(e) => setMontantAttenduSS(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs" style={{ color: "#9B96DA" }}>Attendu Mutuelle (€)</label>
              <input
                type="number" step="0.01" placeholder="180,00"
                value={montantAttenduMut}
                onChange={(e) => setMontantAttenduMut(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
              />
            </div>
          </div>
        </div>
      ) : type === "rejete" ? (
        <div>
          <label className="text-xs" style={{ color: "#9B96DA" }}>Motif du rejet</label>
          <input
            type="text"
            placeholder="Ex: Numéro SS invalide, droits fermés…"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 rounded-lg text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(239,68,68,0.4)" }}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <div>
            <label className="text-xs" style={{ color: "#9B96DA" }}>
              Montant reçu (€){montantAttendu ? ` — attendu ${fmt(montantAttendu)}` : ""}
            </label>
            <input
              type="number" step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(34,197,94,0.4)" }}
            />
          </div>
          <div>
            <label className="text-xs" style={{ color: "#9B96DA" }}>Date de règlement</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 rounded-lg text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
            />
          </div>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button
          onClick={submit}
          className="flex-1 py-1.5 rounded-lg text-sm font-semibold"
          style={{ background: "rgba(83,49,208,0.8)", color: "white" }}
        >
          Confirmer
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg text-sm font-semibold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#9B96DA" }}
        >
          Annuler
        </button>
      </div>
    </motion.div>
  );
}

// ─── Composant bloc organisme ──────────────────────────────────────────────────

interface OrganismeBlockProps {
  organisme: "SS" | "Mutuelle";
  statut: StatutTP;
  montantAttendu?: number;
  montantRecu?: number;
  datePaiement?: string;
  motifRejet?: string;
  onAction: (action: string, organisme: "SS" | "Mutuelle", data?: Record<string, unknown>) => void;
}

function OrganismeBlock({
  organisme,
  statut,
  montantAttendu,
  montantRecu,
  datePaiement,
  motifRejet,
  onAction,
}: OrganismeBlockProps) {
  const [activeForm, setActiveForm] = useState<"recu" | "rejete" | "partiel" | null>(null);

  function handleConfirm(data: Record<string, unknown>) {
    onAction("update", organisme, data);
    setActiveForm(null);
  }

  const canReset = statut === "recu" || statut === "rejete" || statut === "partiel";

  return (
    <div
      className="flex-1 p-3 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ color: "#9B96DA" }}>
          {organisme === "SS" ? "🏥 Sécurité Sociale" : "🛡️ Mutuelle"}
        </span>
        {statut && <BadgeTP statut={statut} />}
      </div>

      <div className="space-y-1 text-sm">
        {montantAttendu != null && (
          <div className="flex justify-between">
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Attendu</span>
            <span className="font-semibold text-white">{fmt(montantAttendu)}</span>
          </div>
        )}
        {(statut === "recu" || statut === "partiel") && montantRecu != null && (
          <div className="flex justify-between">
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Reçu</span>
            <span className="font-semibold" style={{ color: statut === "recu" ? "#34D399" : "#F472B6" }}>
              {fmt(montantRecu)}
            </span>
          </div>
        )}
        {datePaiement && (
          <div className="flex justify-between">
            <span style={{ color: "rgba(255,255,255,0.5)" }}>Date</span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{fmtDate(datePaiement)}</span>
          </div>
        )}
        {statut === "rejete" && motifRejet && (
          <p className="mt-1 text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(251,113,133,0.12)", color: "#FB7185" }}>
            {motifRejet}
          </p>
        )}
        {statut === "partiel" && montantAttendu != null && montantRecu != null && (
          <p className="mt-1 text-xs" style={{ color: "#F472B6" }}>
            Écart : {fmt(montantAttendu - montantRecu)}
          </p>
        )}
      </div>

      {/* Actions selon statut */}
      {statut === "en_attente" && !activeForm && (
        <div className="flex gap-1.5 mt-3">
          <button
            onClick={() => setActiveForm("recu")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(52,211,153,0.15)", color: "#34D399", border: "1px solid rgba(52,211,153,0.3)" }}
          >
            ✓ Reçu
          </button>
          <button
            onClick={() => setActiveForm("partiel")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(244,114,182,0.12)", color: "#F472B6", border: "1px solid rgba(244,114,182,0.35)" }}
          >
            ~ Partiel
          </button>
          <button
            onClick={() => setActiveForm("rejete")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(251,113,133,0.12)", color: "#FB7185", border: "1px solid rgba(251,113,133,0.3)" }}
          >
            ✗ Rejeté
          </button>
        </div>
      )}

      {statut === "rejete" && !activeForm && (
        <button
          onClick={() => setActiveForm("en_attente" as never)}
          className="w-full mt-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.35)" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data-action="relancer"
        >
          🔄 Relancer
        </button>
      )}

      {canReset && !activeForm && (
        <button
          onClick={() => {
            const key = organisme === "SS" ? "SS" : "Mutuelle";
            onAction("update", organisme, {
              [`statutPaiement${key}`]: "en_attente",
              [`montantRecu${key}`]: null,
              [`datePaiement${key}`]: null,
              [`motifRejet${key}`]: null,
            });
          }}
          className="w-full mt-1 py-1 rounded-lg text-xs"
          style={{ color: "rgba(155,150,218,0.5)" }}
        >
          Remettre en attente
        </button>
      )}

      <AnimatePresence>
        {activeForm && (
          <ActionForm
            type={activeForm}
            organisme={organisme}
            montantAttendu={montantAttendu}
            onConfirm={handleConfirm}
            onCancel={() => setActiveForm(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Carte dossier ─────────────────────────────────────────────────────────────

interface DossierCardProps {
  dossier: Dossier;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
}

function DossierCard({ dossier, onUpdate }: DossierCardProps) {
  const total = Number(dossier.totalConfort ?? dossier.totalEssentiel ?? dossier.totalPremium ?? 0);
  const offre = dossier.offreChoisie
    ? dossier.offreChoisie.charAt(0).toUpperCase() + dossier.offreChoisie.slice(1)
    : "—";

  async function handleAction(_action: string, _organisme: "SS" | "Mutuelle", data?: Record<string, unknown>) {
    if (data) await onUpdate(dossier.id, data);
  }

  const hasProbleme =
    dossier.statutPaiementSS === "rejete" || dossier.statutPaiementSS === "partiel" ||
    dossier.statutPaiementMutuelle === "rejete" || dossier.statutPaiementMutuelle === "partiel";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-2xl p-4"
      style={{
        background: hasProbleme
          ? "rgba(239,68,68,0.05)"
          : "rgba(255,255,255,0.04)",
        border: hasProbleme
          ? "1px solid rgba(239,68,68,0.2)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-white text-base">
            {dossier.client.prenom} {dossier.client.nom}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            {dossier.client.mutuelle && <>{dossier.client.mutuelle} · </>}
            Offre {offre} · Vendu le {fmtDate(dossier.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-white">{fmt(total)}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            DEV-{dossier.id.slice(-6).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Blocs SS + Mutuelle */}
      <div className="flex gap-3">
        {dossier.statutPaiementSS && (
          <OrganismeBlock
            organisme="SS"
            statut={dossier.statutPaiementSS}
            montantAttendu={dossier.montantAttenduSS ? Number(dossier.montantAttenduSS) : undefined}
            montantRecu={dossier.montantRecuSS ? Number(dossier.montantRecuSS) : undefined}
            datePaiement={dossier.datePaiementSS}
            motifRejet={dossier.motifRejetSS}
            onAction={handleAction}
          />
        )}
        {dossier.statutPaiementMutuelle && (
          <OrganismeBlock
            organisme="Mutuelle"
            statut={dossier.statutPaiementMutuelle}
            montantAttendu={dossier.montantAttenduMutuelle ? Number(dossier.montantAttenduMutuelle) : undefined}
            montantRecu={dossier.montantRecuMutuelle ? Number(dossier.montantRecuMutuelle) : undefined}
            datePaiement={dossier.datePaiementMutuelle}
            motifRejet={dossier.motifRejetMutuelle}
            onAction={handleAction}
          />
        )}
        {!dossier.statutPaiementSS && !dossier.statutPaiementMutuelle && (
          <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.3)" }}>
            Aucun suivi tiers payant configuré
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Modal nouveau rapprochement ───────────────────────────────────────────────

interface NouveauRapprochementProps {
  devisAcceptes: DevisAccepte[];
  onDone: () => void;
  onCancel: () => void;
  backendUrl: string;
  token: string;
}

function NouveauRapprochement({ devisAcceptes, onDone, onCancel, backendUrl, token }: NouveauRapprochementProps) {
  const [selectedId, setSelectedId] = useState("");
  const [montantSS, setMontantSS] = useState("");
  const [montantMut, setMontantMut] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await fetch(`${backendUrl}/api/rapprochements/init/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ montantAttenduSS: montantSS || undefined, montantAttenduMutuelle: montantMut || undefined }),
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl p-6 space-y-5"
        style={{ background: "#1C0B62", border: "1px solid rgba(155,150,218,0.2)" }}
      >
        <h2 className="text-lg font-bold text-white">Nouveau suivi tiers payant</h2>

        <div>
          <label className="text-sm font-semibold" style={{ color: "#9B96DA" }}>Dossier</label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              // Pre-fill amounts if available
              const dv = devisAcceptes.find((d) => d.id === e.target.value);
              if (dv) {
                const total = Number(dv.totalConfort ?? dv.totalEssentiel ?? 0);
                if (total > 0) {
                  // SS base = 15.65€ pour un verre simple (estimation)
                  setMontantSS("15.65");
                }
              }
            }}
            className="w-full mt-1 px-3 py-2.5 rounded-xl text-white text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
          >
            <option value="">— Choisir un dossier —</option>
            {devisAcceptes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.client.prenom} {d.client.nom} · {d.offreChoisie} ·{" "}
                {new Date(d.createdAt).toLocaleDateString("fr-FR")}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-sm font-semibold" style={{ color: "#9B96DA" }}>Montant attendu SS (€)</label>
            <input
              type="number" step="0.01" placeholder="15,65"
              value={montantSS}
              onChange={(e) => setMontantSS(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold" style={{ color: "#9B96DA" }}>Montant attendu Mutuelle (€)</label>
            <input
              type="number" step="0.01" placeholder="180,00"
              value={montantMut}
              onChange={(e) => setMontantMut(e.target.value)}
              className="w-full mt-1 px-3 py-2.5 rounded-xl text-white text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={submit}
            disabled={!selectedId || saving || (!montantSS && !montantMut)}
            className="flex-1 py-3 rounded-2xl font-bold text-white"
            style={{
              background: selectedId && (montantSS || montantMut) ? "#5331D0" : "rgba(83,49,208,0.3)",
            }}
          >
            {saving ? "Création…" : "Créer le suivi"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl font-bold"
            style={{ background: "rgba(255,255,255,0.08)", color: "#9B96DA" }}
          >
            Annuler
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Modal import relevé bancaire ─────────────────────────────────────────────

interface ImportReleveModalProps {
  magasinId: string;
  backendUrl: string;
  token: string;
  onDone: () => void;
  onCancel: () => void;
}

function ImportReleveModal({ magasinId, backendUrl, token, onDone, onCancel }: ImportReleveModalProps) {
  const [lignes, setLignes] = useState<LigneReleve[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filename, setFilename] = useState("");
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setLoading(true);
    try {
      const text = await file.text();
      const res = await fetch(`${backendUrl}/api/rapprochements/import-releve/${magasinId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ csvContent: text }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setLignes((data.lignes ?? []).map((l: LigneReleve) => ({ ...l, confirme: false })));
    } finally {
      setLoading(false);
    }
  }

  async function confirmer() {
    const confirmations = lignes
      .filter((l, i) => l.confirme && (overrides[i] || l.dossierSuggere?.id))
      .map((l, i) => ({
        devisId: overrides[i] || l.dossierSuggere!.id,
        organisme: l.organisme,
        montantRecu: l.montant,
        dateReglement: l.date,
        reference: l.libelle,
      }));
    if (confirmations.length === 0) return;
    setSaving(true);
    try {
      await fetch(`${backendUrl}/api/rapprochements/confirmer-releve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirmations }),
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  const nbConfirmes = lignes.filter((l, i) => l.confirme && (overrides[i] || l.dossierSuggere?.id)).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl p-5 space-y-4 overflow-y-auto"
        style={{
          background: "#1C0B62",
          border: "1px solid rgba(155,150,218,0.2)",
          maxHeight: "82vh",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Télécharger votre relevé bancaire</h2>
          <button onClick={onCancel} className="text-2xl" style={{ color: "rgba(255,255,255,0.4)" }}>×</button>
        </div>

        {/* Zone de dépôt fichier */}
        <label
          className="flex flex-col items-center justify-center w-full rounded-2xl py-6 cursor-pointer transition-colors"
          style={{ background: "rgba(83,49,208,0.15)", border: "2px dashed rgba(167,139,250,0.4)" }}
        >
          <span className="text-3xl mb-2">📄</span>
          <span className="font-semibold text-white text-sm">
            {filename ? filename : "Choisir un fichier CSV / OFX"}
          </span>
          <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Relevé bancaire exporté depuis votre banque
          </span>
          <input
            type="file"
            accept=".csv,.ofx,.tsv,.txt"
            className="hidden"
            onChange={handleFile}
          />
        </label>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "#A78BFA", borderTopColor: "transparent" }} />
          </div>
        )}

        {/* Résultats */}
        {lignes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: "#9B96DA" }}>
              {lignes.length} ligne{lignes.length > 1 ? "s" : ""} détectée{lignes.length > 1 ? "s" : ""}
            </p>
            {lignes.map((l, i) => {
              const cfg = l.organisme === "SS"
                ? { color: "#A78BFA", bg: "rgba(167,139,250,0.12)", icon: "🏥" }
                : l.organisme === "Mutuelle"
                ? { color: "#F472B6", bg: "rgba(244,114,182,0.12)", icon: "🛡️" }
                : { color: "#9B96DA", bg: "rgba(155,150,218,0.1)", icon: "❓" };

              return (
                <div
                  key={i}
                  className="rounded-2xl p-3 space-y-2"
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}40`,
                    opacity: l.confirme ? 1 : 0.75,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: cfg.color }}>
                        {cfg.icon} {l.organisme} · {l.date}
                      </p>
                      <p className="text-white text-sm font-bold truncate">{fmt(l.montant)}</p>
                      <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{l.libelle}</p>
                    </div>
                    <button
                      onClick={() =>
                        setLignes((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, confirme: !x.confirme } : x))
                        )
                      }
                      className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: l.confirme ? "#34D399" : "rgba(255,255,255,0.3)",
                        background: l.confirme ? "#34D399" : "transparent",
                      }}
                    >
                      {l.confirme && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                  </div>

                  {/* Suggestion dossier */}
                  {l.dossierSuggere && (
                    <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Dossier suggéré</p>
                      <p className="text-sm font-semibold text-white">{l.dossierSuggere.client}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Attendu {fmt(l.dossierSuggere.montantAttendu)} · Écart {fmt(Math.abs(l.dossierSuggere.ecart))}
                      </p>
                    </div>
                  )}

                  {/* Sélecteur manuel si confirmé sans suggestion */}
                  {l.confirme && !l.dossierSuggere && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                        Aucune suggestion — saisir l&apos;ID du dossier manuellement
                      </p>
                      <input
                        type="text"
                        placeholder="ID dossier"
                        value={overrides[i] ?? ""}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [i]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.3)" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        {lignes.length > 0 && (
          <div className="flex gap-3 pt-1">
            <button
              onClick={confirmer}
              disabled={nbConfirmes === 0 || saving}
              className="flex-1 py-3 rounded-2xl font-bold text-white"
              style={{ background: nbConfirmes > 0 ? "#5331D0" : "rgba(83,49,208,0.3)" }}
            >
              {saving ? "Enregistrement…" : `Confirmer ${nbConfirmes > 0 ? `(${nbConfirmes})` : ""}`}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: "#9B96DA" }}
            >
              Annuler
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function RapprochementsPage() {
  const router = useRouter();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filtre, setFiltre] = useState("tous");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [devisAcceptes, setDevisAcceptes] = useState<DevisAccepte[]>([]);
  const [magasinId, setMagasinId] = useState("");
  const [token, setToken] = useState("");
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

  const load = useCallback(
    async (currentFiltre: string, mid: string, tok: string) => {
      try {
        const params = new URLSearchParams();
        if (currentFiltre !== "tous") params.set("filtre", currentFiltre);
        params.set("mois", "3");
        const r = await fetch(`${backendUrl}/api/rapprochements/${mid}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (!r.ok) return;
        const data = await r.json();
        setDossiers(data.dossiers ?? []);
        setStats(data.stats ?? null);
      } finally {
        setLoading(false);
      }
    },
    [backendUrl]
  );

  useEffect(() => {
    const user = localStorage.getItem("optipilot_user");
    if (!user) { router.replace("/login"); return; }
    const u = JSON.parse(user);
    const t = localStorage.getItem("optipilot_token") || "";
    setMagasinId(u.magasinId);
    setToken(t);
    load("tous", u.magasinId, t);

    // Socket.io — écoute les mises à jour NOEMIE en temps réel
    let socket: { disconnect: () => void; on: (ev: string, cb: () => void) => void } | null = null;
    import("socket.io-client").then(({ io }) => {
      socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        auth: { token: t },
        transports: ["websocket"],
      });
      socket.on("noemie_update", () => {
        load("tous", u.magasinId, t);
      });
    }).catch(() => {/* socket.io-client non disponible */});

    return () => { socket?.disconnect(); };
  }, [router, load]);

  async function handleFiltreChange(f: string) {
    setFiltre(f);
    setLoading(true);
    await load(f, magasinId, token);
  }

  async function handleUpdate(devisId: string, data: Record<string, unknown>) {
    await fetch(`${backendUrl}/api/rapprochements/${devisId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    await load(filtre, magasinId, token);
  }

  async function openModal() {
    const r = await fetch(`${backendUrl}/api/rapprochements/devis-acceptes/${magasinId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) setDevisAcceptes(await r.json());
    setShowModal(true);
  }

  return (
    <OpticianGuard>
    <div className="page-bg min-h-screen flex flex-col pb-8">
      <OptiPilotHeader
        title="Rapprochements"
        showBack
        onBack={() => router.push("/dashboard")}
        rightAction={
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowImport(true)}
              className="px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: "rgba(83,49,208,0.5)", color: "#C4C0FF", border: "1px solid rgba(167,139,250,0.3)" }}
            >
              Relevé bancaire
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={openModal}
              className="px-3 py-2 rounded-xl text-sm font-bold"
              style={{ background: "rgba(83,49,208,0.5)", color: "#C4C0FF" }}
            >
              + Nouveau
            </motion.button>
          </div>
        }
      />

      <div className="flex-1 px-4 space-y-5">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <p className="text-xl font-semibold" style={{ color: "#A78BFA" }}>🏥 Sécurité Sociale en attente</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.countEnAttenteSS}</p>
            <p className="text-sm mt-0.5" style={{ color: "#C4B5FD" }}>{fmt(stats.totalAttenduSS)}</p>
            </div>
            <div
              className="rounded-2xl p-4"
            style={{ background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)" }}
          >
            <p className="text-xl font-semibold" style={{ color: "#F472B6" }}>🛡️ Mutuelle en attente</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.countEnAttenteMutuelle}</p>
            <p className="text-sm mt-0.5" style={{ color: "#FBCFE8" }}>{fmt(stats.totalAttenduMutuelle)}</p>
            </div>
            <div
              className="rounded-2xl p-4"
            style={{ background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.25)" }}
          >
            <p className="text-xl font-semibold" style={{ color: "#FB7185" }}>⚠️ Problèmes</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.countProblemes}</p>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>rejet / partiel</p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <p className="text-xl font-semibold" style={{ color: "#22C55E" }}>✅ Reçus ce mois</p>
              <p className="text-2xl font-bold text-white mt-1">{fmt(stats.totalRecuMois)}</p>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>encaissé</p>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTRE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFiltreChange(tab.id)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: filtre === tab.id ? "#5331D0" : "rgba(83,49,208,0.55)",
                color: "white",
                border: filtre === tab.id ? "1px solid rgba(167,139,250,0.7)" : "1px solid rgba(155,150,218,0.5)",
                opacity: filtre === tab.id ? 1 : 0.85,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "#5331D0", borderTopColor: "transparent" }}
            />
          </div>
        ) : dossiers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
              style={{ background: "rgba(83,49,208,0.15)" }}
            >
              🔍
            </div>
            <p className="font-bold text-white text-xl">Aucun dossier</p>
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>
              {filtre === "tous"
                ? "Commencez par créer un suivi via « + Nouveau »"
                : "Aucun dossier ne correspond à ce filtre"}
            </p>
            {filtre === "tous" && (
              <button
                onClick={openModal}
                className="mt-6 px-6 py-3 rounded-2xl font-bold text-white"
                style={{ background: "#5331D0" }}
              >
                + Créer le premier suivi
              </button>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {dossiers.map((d) => (
                <DossierCard key={d.id} dossier={d} onUpdate={handleUpdate} />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <NouveauRapprochement
            devisAcceptes={devisAcceptes}
            backendUrl={backendUrl}
            token={token}
            onDone={() => {
              setShowModal(false);
              load(filtre, magasinId, token);
            }}
            onCancel={() => setShowModal(false)}
          />
        )}
        {showImport && (
          <ImportReleveModal
            magasinId={magasinId}
            backendUrl={backendUrl}
            token={token}
            onDone={() => {
              setShowImport(false);
              load(filtre, magasinId, token);
            }}
            onCancel={() => setShowImport(false)}
          />
        )}
      </AnimatePresence>
    </div>
    </OpticianGuard>
  );
}
