"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";
import { getStoredPin, savePin } from "@/lib/opticianAuth";

interface ConfigMagasin {
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siret: string;
}

interface TarifVerrier {
  id: string;
  verrier: string;
  gamme: string;
  offre: "essentiel" | "confort" | "premium";
  matiere: string;
  indice: string;
  prixUnifocal: number;
  prixProgressif: number;
  actif: boolean;
}

const MATERIAUX: { matiere: string; indice: string }[] = [
  { matiere: "CR39",          indice: "1.5"  },
  { matiere: "Trivex",        indice: "1.53" },
  { matiere: "Polycarbonate", indice: "1.59" },
  { matiere: "MR-8",          indice: "1.6"  },
  { matiere: "Tri-bride",     indice: "1.6"  },
  { matiere: "MR-10",         indice: "1.67" },
  { matiere: "Hi-Index",      indice: "1.74" },
];

interface ConfigRelance {
  delaiJ1: number;
  delaiJ2: number;
  delaiJ3: number;
  smsActif: boolean;
  emailActif: boolean;
}

const VERRIERS_DEFAUT: TarifVerrier[] = [
  { id: "1", verrier: "Essilor",    gamme: "Varilux Comfort", offre: "essentiel", matiere: "CR39",   indice: "1.5",  prixUnifocal: 180, prixProgressif: 380, actif: true  },
  { id: "2", verrier: "Essilor",    gamme: "Crizal Sapphire", offre: "confort",   matiere: "MR-8",   indice: "1.6",  prixUnifocal: 220, prixProgressif: 450, actif: true  },
  { id: "3", verrier: "Zeiss",      gamme: "Individual 2",    offre: "premium",   matiere: "MR-10",  indice: "1.67", prixUnifocal: 260, prixProgressif: 520, actif: true  },
  { id: "4", verrier: "Nikon",      gamme: "Lite AS",          offre: "confort",   matiere: "MR-8",   indice: "1.6",  prixUnifocal: 140, prixProgressif: 290, actif: true  },
  { id: "5", verrier: "Hoya",       gamme: "Lifestyle 3+",     offre: "premium",   matiere: "MR-10",  indice: "1.67", prixUnifocal: 160, prixProgressif: 340, actif: false },
  { id: "6", verrier: "100% Santé", gamme: "Classe A",          offre: "essentiel", matiere: "CR39",   indice: "1.5",  prixUnifocal: 0,   prixProgressif: 0,   actif: true  },
];

const RESEAUX_OPTIQUES = [
  { id: "kalivia",            label: "Kalivia",                   mutuelles: ["Harmonie Mutuelle", "Amphivia", "Mutuelle UMC"] },
  { id: "itelis",             label: "Itelis",                    mutuelles: ["Malakoff Humanis", "Agirc-Arrco"] },
  { id: "santeclair",         label: "SantéClair",                mutuelles: ["Generali", "April", "MAAF", "GMF"] },
  { id: "carte-blanche",      label: "Carte Blanche Partenaires", mutuelles: ["Groupama", "Pacifica"] },
  { id: "mgen-agree",         label: "Agréé MGEN",                mutuelles: ["MGEN"] },
  { id: "ag2r-agree",         label: "Agréé AG2R La Mondiale",    mutuelles: ["AG2R"] },
  { id: "mutualite-fr",       label: "Opticiens Mutualistes",     mutuelles: ["MAIF", "MACIF", "Mutuelle de France"] },
  { id: "sante-clair-plus",   label: "SantéVie / Krys Group",     mutuelles: ["Covéa", "MAAF Santé"] },
];

const TABS = [
  { id: "magasin",   label: "Magasin" },
  { id: "reseaux",   label: "Réseaux" },
  { id: "verriers",  label: "Verriers" },
  { id: "relances",  label: "Relances" },
  { id: "bridge",    label: "Bridge" },
  { id: "compte",    label: "Compte" },
  { id: "securite",  label: "Sécurité" },
];

export default function ConfigPage() {
  const router = useRouter();
  const [tab, setTab] = useState("magasin");
  const [toast, setToast] = useState<string | null>(null);
  // ── État onglet Sécurité ──
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [accountUser, setAccountUser] = useState<{ id?: string; nom: string; email: string; role: string; plan?: string } | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [clientPin, setClientPin] = useState(() => {
    try { return localStorage.getItem("optipilot_client_pin") || "1234"; } catch { return "1234"; }
  });

  const [bridgeIp, setBridgeIp] = useState(() => {
    try { return localStorage.getItem("optipilot_bridge_ip") || ""; } catch { return ""; }
  });
  const [bridgeToken, setBridgeToken] = useState(() => {
    try { return localStorage.getItem("optipilot_bridge_token") || ""; } catch { return ""; }
  });
  const [bridgePort, setBridgePort] = useState(() => {
    try { return localStorage.getItem("optipilot_bridge_port") || "5174"; } catch { return "5174"; }
  });
  const [bridgeStatus, setBridgeStatus] = useState<"idle" | "ok" | "error">("idle");
  const [bridgeTesting, setBridgeTesting] = useState(false);

  async function testerBridge() {
    setBridgeTesting(true);
    setBridgeStatus("idle");
    try {
      const res = await fetch(`http://${bridgeIp}:${bridgePort}/health`, { signal: AbortSignal.timeout(5000) });
      setBridgeStatus(res.ok ? "ok" : "error");
    } catch {
      setBridgeStatus("error");
    } finally {
      setBridgeTesting(false);
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("optipilot_user");
      if (stored) {
        const u = JSON.parse(stored);
        setAccountUser({ id: u.id, nom: u.nom || "—", email: u.email || "—", role: u.role || "Utilisateur", plan: u.plan });
        setEditNom(u.nom || "");
        setEditEmail(u.email || "");
        setEditRole(u.role || "");
      }
    } catch { /* ignore */ }
  }, []);

  const [magasin, setMagasin] = useState<ConfigMagasin>({
    nom: "Optique Lumière",
    adresse: "12 Rue de la Paix, 75001 Paris",
    telephone: "01 23 45 67 89",
    email: "contact@optiquelumiere.fr",
    siret: "123 456 789 00012",
  });

  const [verriers, setVerriers] = useState<TarifVerrier[]>(VERRIERS_DEFAUT);
  const [reseauxPartenaires, setReseauxPartenaires] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("optipilot_reseaux_partenaires") || "[]"); }
    catch { return []; }
  });

  const [relanceConfig, setRelanceConfig] = useState<ConfigRelance>({
    delaiJ1: 3,
    delaiJ2: 7,
    delaiJ3: 14,
    smsActif: false,
    emailActif: true,
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleReseau(id: string) {
    setReseauxPartenaires((prev) => {
      const updated = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      localStorage.setItem("optipilot_reseaux_partenaires", JSON.stringify(updated));
      return updated;
    });
  }

  function sauvegarder() {
    localStorage.setItem("optipilot_reseaux_partenaires", JSON.stringify(reseauxPartenaires));
    showToast("Configuration sauvegardée ✓");
  }

  function toggleVerrier(id: string) {
    setVerriers((prev) => prev.map((v) => (v.id === id ? { ...v, actif: !v.actif } : v)));
  }

  function updateVerrier(id: string, fields: Partial<TarifVerrier>) {
    setVerriers((prev) => prev.map((v) => (v.id === id ? { ...v, ...fields } : v)));
  }

  function addVerrier() {
    setVerriers((prev) => [...prev, {
      id: Date.now().toString(), verrier: "Nouveau verrier", gamme: "Nom du verre",
      offre: "confort", matiere: "CR39", indice: "1.5",
      prixUnifocal: 0, prixProgressif: 0, actif: true,
    }]);
  }

  function deleteVerrier(id: string) {
    setVerriers((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <OpticianGuard>
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader title="Configuration" showBack onBack={() => router.push("/dashboard")} />

      <main className="flex-1 px-6 pb-10 pt-6 w-full">

        {/* Onglets */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setTab(t.id)}
              className="px-6 py-3 rounded-xl text-lg font-semibold whitespace-nowrap border-2 transition-all"
              style={{
                background: tab === t.id ? "rgba(83,49,208,0.25)" : "rgba(10,3,56,0.6)",
                borderColor: tab === t.id ? "#5331D0" : "rgba(155,150,218,0.2)",
                color: tab === t.id ? "#9B96DA" : "#FDFDFE",
              }}
            >
              {t.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── ONGLET MAGASIN ── */}
          {tab === "magasin" && (
            <motion.div key="magasin" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardTitle>Informations du magasin</CardTitle>
                <div className="flex flex-col gap-5 mt-6">
                  {([
                    { label: "Nom du magasin", field: "nom" as const },
                    { label: "Adresse", field: "adresse" as const },
                    { label: "Téléphone", field: "telephone" as const },
                    { label: "Email", field: "email" as const },
                    { label: "SIRET", field: "siret" as const },
                  ]).map(({ label, field }) => (
                    <div key={field}>
                      <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>
                        {label}
                      </label>
                      <input
                        type="text"
                        value={magasin[field]}
                        onChange={(e) => setMagasin((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="w-full px-5 py-4 rounded-xl text-xl border-2 outline-none transition-all"
                        style={{
                          background: "rgba(2,0,23,0.7)",
                          borderColor: "rgba(83,49,208,0.35)",
                          color: "#FDFDFE",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                      />
                    </div>
                  ))}
                </div>
                <SaveButton onClick={sauvegarder} />
              </Card>
            </motion.div>
          )}

          {/* ── ONGLET RÉSEAUX ── */}
          {tab === "reseaux" && (
            <motion.div key="reseaux" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardTitle>Réseaux optiques partenaires</CardTitle>
                <p className="text-base mt-2 mb-6" style={{ color: "rgba(155,150,218,0.65)" }}>
                  Cochez les réseaux dont vous êtes membre. OptiPilot appliquera automatiquement les tarifs de remboursement correspondants pour vos clients.
                </p>
                <div className="flex flex-col gap-4">
                  {RESEAUX_OPTIQUES.map((reseau) => {
                    const actif = reseauxPartenaires.includes(reseau.id);
                    return (
                      <div
                        key={reseau.id}
                        className="rounded-2xl p-5 border-2 transition-all"
                        style={{
                          background: actif ? "rgba(83,49,208,0.12)" : "rgba(10,3,56,0.5)",
                          borderColor: actif ? "rgba(83,49,208,0.5)" : "rgba(155,150,218,0.15)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xl font-bold" style={{ color: actif ? "#FDFDFE" : "rgba(253,253,254,0.6)" }}>
                              {reseau.label}
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: "rgba(155,150,218,0.55)" }}>
                              {reseau.mutuelles.join(" · ")}
                            </p>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleReseau(reseau.id)}
                            className="w-14 h-7 rounded-full relative transition-all shrink-0"
                            style={{ background: actif ? "#5331D0" : "rgba(155,150,218,0.2)" }}
                          >
                            <motion.div
                              className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow"
                              animate={{ left: actif ? "calc(100% - 26px)" : "2px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </motion.button>
                        </div>
                        {actif && (
                          <p className="text-sm mt-3 font-semibold" style={{ color: "#7c5fec" }}>
                            Partenaire actif — tarifs réseau agrée appliqués
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <SaveButton onClick={sauvegarder} />
              </Card>
            </motion.div>
          )}

          {/* ── ONGLET VERRIERS ── */}
          {tab === "verriers" && (
            <motion.div key="verriers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle>Tarifs & verriers proposés</CardTitle>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={addVerrier}
                    className="px-4 py-2 rounded-xl text-base font-bold"
                    style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA", border: "1.5px solid rgba(83,49,208,0.5)" }}
                  >
                    + Ajouter
                  </motion.button>
                </div>
                <p className="text-base mt-1 mb-6" style={{ color: "rgba(155,150,218,0.6)" }}>
                  Personnalisez vos verres, matières, indices et affectez-les à une offre.
                </p>
                <div className="flex flex-col gap-5">
                  {verriers.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-2xl p-5 border-2 transition-all"
                      style={{
                        background: v.actif ? "rgba(83,49,208,0.1)" : "rgba(10,3,56,0.4)",
                        borderColor: v.actif ? "rgba(83,49,208,0.4)" : "rgba(155,150,218,0.15)",
                        opacity: v.actif ? 1 : 0.55,
                      }}
                    >
                      {/* Ligne toggle + supprimer */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleVerrier(v.id)}
                            className="w-14 h-7 rounded-full relative transition-all shrink-0"
                            style={{ background: v.actif ? "#5331D0" : "rgba(155,150,218,0.2)" }}
                          >
                            <motion.div
                              className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow"
                              animate={{ left: v.actif ? "calc(100% - 26px)" : "2px" }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </motion.button>
                          <span className="text-sm font-semibold" style={{ color: v.actif ? "#9B96DA" : "rgba(155,150,218,0.4)" }}>
                            {v.actif ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteVerrier(v.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xl font-bold"
                          style={{ background: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.7)", border: "1px solid rgba(239,68,68,0.25)" }}
                        >
                          ×
                        </motion.button>
                      </div>

                      {/* Fournisseur + Nom du verre */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "rgba(155,150,218,0.6)" }}>Fournisseur</p>
                          <input
                            value={v.verrier}
                            onChange={(e) => updateVerrier(v.id, { verrier: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-base font-bold border-2 outline-none"
                            style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.3)", color: "#FDFDFE" }}
                            onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.3)")}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "rgba(155,150,218,0.6)" }}>Nom du verre</p>
                          <input
                            value={v.gamme}
                            onChange={(e) => updateVerrier(v.id, { gamme: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl text-base font-bold border-2 outline-none"
                            style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.3)", color: "#FDFDFE" }}
                            onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                            onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.3)")}
                          />
                        </div>
                      </div>

                      {/* Offre */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold mb-2" style={{ color: "rgba(155,150,218,0.6)" }}>Offre</p>
                        <div className="flex gap-2">
                          {(["essentiel", "confort", "premium"] as const).map((o) => (
                            <button
                              key={o}
                              onClick={() => updateVerrier(v.id, { offre: o })}
                              className="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                              style={{
                                background: v.offre === o ? "rgba(83,49,208,0.35)" : "rgba(2,0,23,0.5)",
                                borderColor: v.offre === o ? "#5331D0" : "rgba(155,150,218,0.15)",
                                color: v.offre === o ? "#FDFDFE" : "rgba(155,150,218,0.45)",
                              }}
                            >
                              {o.charAt(0).toUpperCase() + o.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Matière & Indice */}
                      <div className="mb-4">
                        <p className="text-xs font-semibold mb-2" style={{ color: "rgba(155,150,218,0.6)" }}>Matière & indice de réfraction</p>
                        <div className="flex flex-wrap gap-2">
                          {MATERIAUX.map((m) => {
                            const selected = v.matiere === m.matiere && v.indice === m.indice;
                            return (
                              <button
                                key={`${m.matiere}-${m.indice}`}
                                onClick={() => updateVerrier(v.id, { matiere: m.matiere, indice: m.indice })}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all"
                                style={{
                                  background: selected ? "rgba(83,49,208,0.35)" : "rgba(2,0,23,0.5)",
                                  borderColor: selected ? "#5331D0" : "rgba(155,150,218,0.15)",
                                  color: selected ? "#FDFDFE" : "rgba(155,150,218,0.5)",
                                }}
                              >
                                {m.matiere} <span style={{ color: selected ? "#9B96DA" : "rgba(155,150,218,0.35)" }}>· {m.indice}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Prix */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "rgba(155,150,218,0.6)" }}>Unifocal (€)</p>
                          <input
                            type="number"
                            value={v.prixUnifocal}
                            onChange={(e) => updateVerrier(v.id, { prixUnifocal: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl text-xl font-bold border-2 outline-none"
                            style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.3)", color: "#FDFDFE" }}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: "rgba(155,150,218,0.6)" }}>Progressif (€)</p>
                          <input
                            type="number"
                            value={v.prixProgressif}
                            onChange={(e) => updateVerrier(v.id, { prixProgressif: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl text-xl font-bold border-2 outline-none"
                            style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.3)", color: "#FDFDFE" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <SaveButton onClick={sauvegarder} />
              </Card>
            </motion.div>
          )}

          {/* ── ONGLET RELANCES ── */}
          {tab === "relances" && (
            <motion.div key="relances" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardTitle>Automatisation des relances</CardTitle>
                <p className="text-base mt-1 mb-8" style={{ color: "rgba(155,150,218,0.6)" }}>
                  Configurez les délais de relance et les canaux de communication.
                </p>

                {/* Canaux */}
                <div className="flex flex-col gap-4 mb-8">
                  <p className="text-lg font-bold" style={{ color: "#FDFDFE" }}>Canaux actifs</p>
                  {[
                    { label: "Relance par email", field: "emailActif" as const, sub: "Envoi automatique depuis votre email magasin" },
                    { label: "Relance par SMS", field: "smsActif" as const, sub: "Nécessite un compte Twilio (voir .env)" },
                  ].map(({ label, field, sub }) => (
                    <div
                      key={field}
                      className="flex items-center justify-between p-5 rounded-2xl border-2"
                      style={{ background: "rgba(10,3,56,0.6)", borderColor: "rgba(155,150,218,0.15)" }}
                    >
                      <div>
                        <p className="text-xl font-bold" style={{ color: "#FDFDFE" }}>{label}</p>
                        <p className="text-base mt-0.5" style={{ color: "rgba(155,150,218,0.55)" }}>{sub}</p>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setRelanceConfig((prev) => ({ ...prev, [field]: !prev[field] }))}
                        className="w-14 h-7 rounded-full relative shrink-0 transition-all"
                        style={{ background: relanceConfig[field] ? "#5331D0" : "rgba(155,150,218,0.2)" }}
                      >
                        <motion.div
                          className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow"
                          animate={{ left: relanceConfig[field] ? "calc(100% - 26px)" : "2px" }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                  ))}
                </div>

                {/* Délais */}
                <p className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>Délais de relance</p>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "1ère relance", field: "delaiJ1" as const, desc: "Rappel doux" },
                    { label: "2ème relance", field: "delaiJ2" as const, desc: "Rappel avec offre" },
                    { label: "3ème relance", field: "delaiJ3" as const, desc: "Dernière chance" },
                  ].map(({ label, field, desc }) => (
                    <div
                      key={field}
                      className="flex items-center justify-between p-5 rounded-2xl border-2"
                      style={{ background: "rgba(10,3,56,0.6)", borderColor: "rgba(155,150,218,0.15)" }}
                    >
                      <div>
                        <p className="text-xl font-bold" style={{ color: "#FDFDFE" }}>{label}</p>
                        <p className="text-base mt-0.5" style={{ color: "rgba(155,150,218,0.55)" }}>{desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => setRelanceConfig((prev) => ({ ...prev, [field]: Math.max(1, prev[field] - 1) }))}
                          className="w-10 h-10 rounded-xl text-2xl font-bold flex items-center justify-center"
                          style={{ background: "rgba(83,49,208,0.2)", color: "#9B96DA" }}
                        >−</motion.button>
                        <span className="text-2xl font-black w-10 text-center" style={{ color: "#FDFDFE" }}>
                          J+{relanceConfig[field]}
                        </span>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => setRelanceConfig((prev) => ({ ...prev, [field]: prev[field] + 1 }))}
                          className="w-10 h-10 rounded-xl text-2xl font-bold flex items-center justify-center"
                          style={{ background: "rgba(83,49,208,0.2)", color: "#9B96DA" }}
                        >+</motion.button>
                      </div>
                    </div>
                  ))}
                </div>
                <SaveButton onClick={sauvegarder} />
              </Card>
            </motion.div>
          )}

          {/* ── ONGLET COMPTE ── */}
          {tab === "compte" && (
            <motion.div key="compte" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardTitle>Mon compte</CardTitle>

                {/* Plan actif */}
                <div
                  className="mt-4 mb-2 flex items-center justify-between px-5 py-4 rounded-xl"
                  style={{ background: "rgba(83,49,208,0.18)", border: "1.5px solid rgba(83,49,208,0.45)" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#9B96DA" }}>Plan actif</p>
                    <p className="text-xl font-black capitalize mt-0.5" style={{ color: accountUser?.plan === "trial" ? "#c4b5fd" : "#4ade80" }}>
                      {accountUser?.plan === "trial" ? "Essai gratuit" : accountUser?.plan === "standard" ? "Standard" : accountUser?.plan === "premium" ? "Premium" : accountUser?.plan ?? "—"}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push("/abonnement")}
                    className="px-5 py-3 rounded-xl text-base font-bold"
                    style={{ background: "linear-gradient(135deg,#5331D0,#9B96DA)", color: "#fff" }}
                  >
                    Gérer l&apos;abonnement →
                  </motion.button>
                </div>

                <div className="flex flex-col gap-4 mt-4">
                  {[
                    { label: "Nom",   value: editNom,   setter: setEditNom,   type: "text" },
                    { label: "Email", value: editEmail, setter: setEditEmail, type: "email" },
                    { label: "Rôle",  value: editRole,  setter: setEditRole,  type: "text", disabled: accountUser?.role !== "admin" },
                  ].map(({ label, value, setter, type, disabled }) => (
                    <div key={label}>
                      <label className="text-sm font-semibold mb-1 block" style={{ color: "#9B96DA" }}>{label}</label>
                      <input
                        type={type}
                        value={value}
                        onChange={(e) => setter(e.target.value)}
                        disabled={disabled}
                        className="w-full px-5 py-4 rounded-xl text-xl border-2 outline-none transition-all"
                        style={{
                          background: disabled ? "rgba(10,3,56,0.4)" : "rgba(2,0,23,0.7)",
                          borderColor: "rgba(83,49,208,0.35)",
                          color: disabled ? "rgba(255,255,255,0.35)" : "#FDFDFE",
                          cursor: disabled ? "not-allowed" : "text",
                        }}
                        onFocus={(e) => !disabled && (e.target.style.borderColor = "#5331D0")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                      />
                      {label === "Rôle" && accountUser?.role !== "admin" && (
                        <p className="text-xs mt-1" style={{ color: "rgba(155,150,218,0.5)" }}>Seul un admin peut modifier le rôle</p>
                      )}
                    </div>
                  ))}
                  <SaveButton
                    onClick={async () => {
                      if (!accountUser?.id) return;
                      setSavingAccount(true);
                      try {
                        const token = localStorage.getItem("optipilot_token") || "";
                        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
                        const res = await fetch(`${backendUrl}/api/utilisateur/${accountUser.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ nom: editNom, email: editEmail, role: editRole }),
                        });
                        if (!res.ok) {
                          const err = await res.json();
                          showToast(err.error || "Erreur lors de la mise à jour");
                          return;
                        }
                        const updated = await res.json();
                        // Mettre à jour le localStorage
                        const userRaw = localStorage.getItem("optipilot_user");
                        if (userRaw) {
                          const u = JSON.parse(userRaw);
                          localStorage.setItem("optipilot_user", JSON.stringify({ ...u, nom: updated.nom, email: updated.email, role: updated.role }));
                        }
                        setAccountUser((prev) => prev ? { ...prev, nom: updated.nom, email: updated.email, role: updated.role } : prev);
                        showToast("Informations mises à jour ✓");
                      } catch {
                        showToast("Impossible de contacter le serveur");
                      } finally {
                        setSavingAccount(false);
                      }
                    }}
                    label={savingAccount ? "Enregistrement…" : "Sauvegarder les informations"}
                  />
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  <p className="text-lg font-bold" style={{ color: "#FDFDFE" }}>Changer le mot de passe</p>
                  {["Mot de passe actuel", "Nouveau mot de passe", "Confirmer"].map((placeholder) => (
                    <input
                      key={placeholder}
                      type="password"
                      placeholder={placeholder}
                      className="w-full px-5 py-4 rounded-xl text-xl border-2 outline-none transition-all"
                      style={{
                        background: "rgba(2,0,23,0.7)",
                        borderColor: "rgba(83,49,208,0.35)",
                        color: "#FDFDFE",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  ))}
                  <SaveButton onClick={sauvegarder} label="Changer le mot de passe" />
                </div>

                {/* ── PIN Mode Client ── */}
                <div className="mt-8 flex flex-col gap-4">
                  <div>
                    <p className="text-lg font-bold" style={{ color: "#FDFDFE" }}>Code PIN mode client</p>
                    <p className="text-sm mt-1" style={{ color: "#9B96DA" }}>
                      Ce code à 4 chiffres est demandé pour revenir sur votre espace opticien lorsque la tablette est en mode kiosque client.
                    </p>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={clientPin}
                    onChange={(e) => setClientPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Code à 4 chiffres"
                    className="w-full px-5 py-4 rounded-xl text-2xl text-center tracking-[0.6em] border-2 outline-none transition-all"
                    style={{
                      background: "rgba(2,0,23,0.7)",
                      borderColor: "rgba(83,49,208,0.35)",
                      color: "#FDFDFE",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                  />
                  <SaveButton
                    onClick={() => {
                      if (clientPin.length !== 4) {
                        showToast("Le code doit contenir exactement 4 chiffres");
                        return;
                      }
                      localStorage.setItem("optipilot_client_pin", clientPin);
                      showToast("Code PIN mis à jour ✓");
                    }}
                    label="Enregistrer le code PIN"
                  />
                </div>

                {/* Déconnexion */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    localStorage.clear();
                    router.push("/login");
                  }}
                  className="w-full py-5 rounded-2xl text-xl font-bold mt-6 border-2"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                >
                  Se déconnecter
                </motion.button>
              </Card>
            </motion.div>
          )}

          {/* ── ONGLET BRIDGE ── */}
          {tab === "bridge" && (
            <motion.div key="bridge" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardTitle>Connexion bridge magasin</CardTitle>
                <p className="text-base mt-2 mb-6" style={{ color: "rgba(155,150,218,0.65)" }}>
                  Le bridge est un petit programme installé sur le PC du magasin. Il permet à OptiPilot de lire les données de votre logiciel opticien (Optimum, etc.) via le réseau Wi-Fi local.
                </p>
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>IP du bridge</label>
                    <input
                      type="text"
                      value={bridgeIp}
                      placeholder="ex: 192.168.1.42"
                      onChange={(e) => setBridgeIp(e.target.value)}
                      className="w-full px-5 py-4 rounded-xl text-xl border-2 outline-none transition-all"
                      style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.35)", color: "#FDFDFE" }}
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                  <div>
                    <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>Token secret</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bridgeToken}
                        placeholder="Cliquez sur Générer →"
                        onChange={(e) => setBridgeToken(e.target.value)}
                        className="flex-1 px-5 py-4 rounded-xl text-base border-2 outline-none transition-all font-mono"
                        style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.35)", color: "#FDFDFE" }}
                        onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
                          const rand = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n))).map(b => chars[b % chars.length]).join("");
                          setBridgeToken(`op-${rand(6)}-${rand(6)}-${rand(6)}`);
                        }}
                        className="px-4 py-4 rounded-xl text-base font-bold border-2 whitespace-nowrap"
                        style={{ background: "rgba(83,49,208,0.2)", borderColor: "rgba(83,49,208,0.5)", color: "#9B96DA" }}
                      >
                        Générer
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { navigator.clipboard.writeText(bridgeToken); showToast("Token copié ✓"); }}
                        disabled={!bridgeToken}
                        className="px-4 py-4 rounded-xl text-base font-bold border-2 whitespace-nowrap"
                        style={{ background: "rgba(83,49,208,0.2)", borderColor: "rgba(83,49,208,0.5)", color: "#9B96DA", opacity: !bridgeToken ? 0.4 : 1 }}
                      >
                        Copier
                      </motion.button>
                    </div>
                    {bridgeToken && (
                      <p className="text-sm mt-2" style={{ color: "rgba(155,150,218,0.6)" }}>
                        À coller dans le fichier <span className="font-mono">.env</span> du bridge : <span className="font-mono" style={{ color: "#9B96DA" }}>BRIDGE_TOKEN={bridgeToken}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>Port</label>
                    <input
                      type="text"
                      value={bridgePort}
                      placeholder="5174"
                      onChange={(e) => setBridgePort(e.target.value)}
                      className="w-full px-5 py-4 rounded-xl text-xl border-2 outline-none transition-all"
                      style={{ background: "rgba(2,0,23,0.7)", borderColor: "rgba(83,49,208,0.35)", color: "#FDFDFE" }}
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                </div>

                {/* Statut test */}
                {bridgeStatus === "ok" && (
                  <div className="mt-4 px-5 py-3 rounded-xl text-base font-bold" style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.4)", color: "#4ade80" }}>
                    ✓ Bridge connecté — communication OK
                  </div>
                )}
                {bridgeStatus === "error" && (
                  <div className="mt-4 px-5 py-3 rounded-xl text-base font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
                    ✗ Impossible de joindre le bridge — vérifiez l&apos;IP, le port et que le PC est allumé
                  </div>
                )}

                <div className="flex gap-3 mt-8">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={testerBridge}
                    disabled={bridgeTesting || !bridgeIp}
                    className="flex-1 py-5 rounded-2xl text-xl font-bold border-2"
                    style={{ background: "rgba(83,49,208,0.15)", borderColor: "rgba(83,49,208,0.5)", color: "#9B96DA", opacity: (!bridgeIp || bridgeTesting) ? 0.5 : 1 }}
                  >
                    {bridgeTesting ? "Test en cours…" : "Tester la connexion"}
                  </motion.button>
                  <SaveButton
                    onClick={() => {
                      localStorage.setItem("optipilot_bridge_ip", bridgeIp);
                      localStorage.setItem("optipilot_bridge_token", bridgeToken);
                      localStorage.setItem("optipilot_bridge_port", bridgePort);
                      showToast("Bridge configuré ✓");
                    }}
                    label="Sauvegarder"
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── ONGLET SÉCURITÉ ── */}
          {tab === "securite" && (
            <motion.div key="securite" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardTitle>Code PIN opticien</CardTitle>
                <p className="text-base mt-2 mb-6" style={{ color: "rgba(155,150,218,0.65)" }}>
                  Ce code à 4 chiffres protège l&apos;accès aux pages opticien (tableau de bord, config, devis...). Il est demandé dès que la tablette a été passée au client.
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#9B96DA" }}>Code actuel</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-xl text-lg tracking-[0.5em] text-center font-bold"
                      style={{
                        background: "rgba(83,49,208,0.12)",
                        border: "1px solid rgba(83,49,208,0.35)",
                        color: "#FDFDFE",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#9B96DA" }}>Nouveau code (4 chiffres)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-xl text-lg tracking-[0.5em] text-center font-bold"
                      style={{
                        background: "rgba(83,49,208,0.12)",
                        border: "1px solid rgba(83,49,208,0.35)",
                        color: "#FDFDFE",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: "#9B96DA" }}>Confirmer le nouveau code</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-xl text-lg tracking-[0.5em] text-center font-bold"
                      style={{
                        background: "rgba(83,49,208,0.12)",
                        border: "1px solid rgba(83,49,208,0.35)",
                        color: "#FDFDFE",
                        outline: "none",
                      }}
                    />
                  </div>

                  {pinMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-center font-semibold"
                      style={{ color: pinMsg.ok ? "#a855f7" : "#ef4444" }}
                    >
                      {pinMsg.text}
                    </motion.p>
                  )}

                  <SaveButton
                    onClick={() => {
                      const stored = getStoredPin();
                      if (currentPin !== stored) {
                        setPinMsg({ text: "Code actuel incorrect.", ok: false });
                        setTimeout(() => setPinMsg(null), 3000);
                        return;
                      }
                      if (newPin.length !== 4) {
                        setPinMsg({ text: "Le nouveau code doit contenir exactement 4 chiffres.", ok: false });
                        setTimeout(() => setPinMsg(null), 3000);
                        return;
                      }
                      if (newPin !== confirmPin) {
                        setPinMsg({ text: "Les deux codes ne correspondent pas.", ok: false });
                        setTimeout(() => setPinMsg(null), 3000);
                        return;
                      }
                      savePin(newPin);
                      setPinMsg({ text: "Code PIN mis à jour avec succès.", ok: true });
                      setCurrentPin(""); setNewPin(""); setConfirmPin("");
                      setTimeout(() => setPinMsg(null), 4000);
                    }}
                    label="Changer le code PIN"
                  />
                </div>

                <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(83,49,208,0.25)" }}>
                  <p className="text-xs" style={{ color: "rgba(155,150,218,0.55)" }}>
                    Code par défaut : <strong style={{ color: "rgba(167,139,250,0.7)" }}>1234</strong> — modifiez-le dès votre première utilisation.
                    Le code est stocké localement sur cet appareil.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl text-lg font-bold"
            style={{
              background: "rgba(10,3,56,0.95)",
              border: "1.5px solid rgba(83,49,208,0.6)",
              color: "#FDFDFE",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </OpticianGuard>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-3xl p-8"
      style={{
        background: "rgba(10,3,56,0.75)",
        border: "1.5px solid rgba(83,49,208,0.35)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-black" style={{ color: "#FDFDFE" }}>
      {children}
    </h2>
  );
}

function SaveButton({ onClick, label = "Sauvegarder" }: { onClick: () => void; label?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full py-5 rounded-2xl text-white font-bold text-xl mt-8"
      style={{
        background: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
        boxShadow: "0 4px 24px rgba(83,49,208,0.5)",
      }}
    >
      {label}
    </motion.button>
  );
}
