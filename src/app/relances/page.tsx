"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";

interface Relance {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  devis: string;
  montant: number;
  dateDevis: string;
  joursSansReponse: number;
  statut: "a_relancer" | "relance" | "converti" | "perdu";
  offre: string;
}

// Données de démo utilisées uniquement si le backend est indisponible
const RELANCES_DEMO: Relance[] = [
  {
    id: "demo-1",
    nom: "Marie Dubois",
    telephone: "06 12 34 56 78",
    email: "marie.dubois@email.fr",
    devis: "DEV-2026-047",
    montant: 320,
    dateDevis: "2026-03-04",
    joursSansReponse: 5,
    statut: "a_relancer",
    offre: "Confort — Essilor Varilux",
  },
  {
    id: "2",
    nom: "Jean-Pierre Martin",
    telephone: "07 89 01 23 45",
    email: "jp.martin@email.fr",
    devis: "DEV-2026-043",
    montant: 180,
    dateDevis: "2026-03-01",
    joursSansReponse: 8,
    statut: "a_relancer",
    offre: "Essentiel — 100% Santé",
  },
  {
    id: "3",
    nom: "Sophie Leroux",
    telephone: "06 45 67 89 01",
    email: "sophie.leroux@email.fr",
    devis: "DEV-2026-039",
    montant: 580,
    dateDevis: "2026-02-26",
    joursSansReponse: 11,
    statut: "relance",
    offre: "Premium — Zeiss Individual",
  },
  {
    id: "4",
    nom: "Thomas Bernard",
    telephone: "06 23 45 67 89",
    email: "thomas.b@email.fr",
    devis: "DEV-2026-035",
    montant: 240,
    dateDevis: "2026-02-22",
    joursSansReponse: 15,
    statut: "a_relancer",
    offre: "Standard — Nikon Lite",
  },
  {
    id: "5",
    nom: "Claire Fontaine",
    telephone: "07 34 56 78 90",
    email: "claire.f@email.fr",
    devis: "DEV-2026-031",
    montant: 420,
    dateDevis: "2026-02-18",
    joursSansReponse: 19,
    statut: "relance",
    offre: "Confort — Hoya Lifestyle",
  },
  {
    id: "6",
    nom: "Paul Mercier",
    telephone: "06 56 78 90 12",
    email: "paul.m@email.fr",
    devis: "DEV-2026-028",
    montant: 650,
    dateDevis: "2026-02-14",
    joursSansReponse: 23,
    statut: "converti",
    offre: "Premium — Essilor Crizal",
  },
];

const STATUT_CONFIG = {
  a_relancer: { label: "À relancer", color: "#f472b6", bg: "rgba(236,72,153,0.12)" },
  relance: { label: "Relancé", color: "#9B96DA", bg: "rgba(155,150,218,0.12)" },
  converti: { label: "Converti ✓", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  perdu: { label: "Perdu", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://optipilot-backend.onrender.com";

export default function RelancesPage() {
  const router = useRouter();
  const [relances, setRelances] = useState<Relance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<"tous" | "a_relancer" | "relance" | "converti">("tous");
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("optipilot_user");
    if (!user) { router.replace("/login"); return; }
    const userData = JSON.parse(user);
    const token = localStorage.getItem("optipilot_token") || "";

    fetch(`${BACKEND}/api/relances/${userData.magasinId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRelances(data);
        else setRelances(RELANCES_DEMO); // fallback démo si backend indisponible
      })
      .catch(() => setRelances(RELANCES_DEMO))
      .finally(() => setLoading(false));
  }, [router]);

  const filtrees = filtre === "tous" ? relances : relances.filter((r) => r.statut === filtre);
  const aRelancer = relances.filter((r) => r.statut === "a_relancer").length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function patchDevis(id: string, statut: string) {
    // Si c'est une donnée démo, on ne fait pas de requête
    if (id.startsWith("demo-")) return;
    const token = localStorage.getItem("optipilot_token") || "";
    await fetch(`${BACKEND}/api/devis/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ statut }),
    }).catch(() => {});
  }

  function marquerRelance(id: string) {
    setRelances((prev) =>
      prev.map((r) => (r.id === id ? { ...r, statut: "relance" } : r))
    );
    patchDevis(id, "relance");
    showToast("Relance enregistrée");
    setSelected(null);
  }

  function marquerConverti(id: string) {
    setRelances((prev) => prev.filter((r) => r.id !== id));
    patchDevis(id, "accepté");
    showToast("Client converti — devis accepté !");
    setSelected(null);
  }

  function marquerPerdu(id: string) {
    setRelances((prev) => prev.filter((r) => r.id !== id));
    patchDevis(id, "refusé");
    showToast("Devis archivé");
    setSelected(null);
  }

  const selectedRelance = relances.find((r) => r.id === selected);

  return (
    <OpticianGuard>
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader title="Relances" showBack onBack={() => router.push("/dashboard")} />

      <main className="flex-1 px-6 pb-10 pt-6 w-full">

        {/* Stratégie de relance */}
        <div className="mb-6 p-4 rounded-2xl flex items-start gap-4" style={{ background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.3)" }}>
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(83,49,208,0.25)", marginTop: 2 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold mb-2" style={{ color: "#9B96DA" }}>Stratégie de relance recommandée</p>
            <div className="flex gap-3">
              {[{ j: "J+5", label: "1ère relance", desc: "SMS ou appel" }, { j: "J+10", label: "2ème relance", desc: "Appel personnalisé" }, { j: "J+15", label: "Clôture", desc: "Dernière chance" }].map((item) => (
                <div key={item.j} className="flex-1 rounded-xl p-2 text-center" style={{ background: "rgba(10,3,56,0.5)", border: "1px solid rgba(83,49,208,0.2)" }}>
                  <p className="text-sm font-black" style={{ color: "#7B5CE5" }}>{item.j}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: "#FDFDFE" }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(155,150,218,0.6)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "À relancer", value: relances.filter((r) => r.statut === "a_relancer").length, color: "#f472b6", bg: "rgba(236,72,153,0.1)" },
            { label: "Relancés", value: relances.filter((r) => r.statut === "relance").length, color: "#9B96DA", bg: "rgba(83,49,208,0.15)" },
            { label: "Convertis", value: relances.filter((r) => r.statut === "converti").length, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5 text-center"
              style={{ background: s.bg, border: `1.5px solid ${s.color}30` }}
            >
              <p className="text-4xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-base font-semibold mt-1" style={{ color: "rgba(155,150,218,0.7)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {(["tous", "a_relancer", "relance", "converti"] as const).map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.96 }}
              onClick={() => setFiltre(f)}
              className="px-5 py-3 rounded-xl text-lg font-semibold whitespace-nowrap border-2 transition-all"
              style={{
                background: filtre === f ? "rgba(83,49,208,0.25)" : "rgba(10,3,56,0.6)",
                borderColor: filtre === f ? "#5331D0" : "rgba(155,150,218,0.2)",
                color: filtre === f ? "#9B96DA" : "#FDFDFE",
              }}
            >
              {f === "tous" ? "Tous" : STATUT_CONFIG[f].label}
            </motion.button>
          ))}
        </div>

        {/* Liste */}
        <div className="flex flex-col gap-4">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: "#5331D0", borderTopColor: "transparent" }} />
            </div>
          )}
          {!loading && filtrees.length === 0 && (
            <div className="text-center py-16" style={{ color: "rgba(155,150,218,0.5)" }}>
              <p className="text-2xl font-bold mb-2">Aucun résultat</p>
              <p className="text-lg">Tous les clients ont été traités.</p>
            </div>
          )}
          {filtrees.map((r, i) => (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelected(selected === r.id ? null : r.id)}
              className="rounded-2xl p-5 text-left border-2 transition-all w-full"
              style={{
                background: selected === r.id ? "rgba(83,49,208,0.15)" : "rgba(10,3,56,0.7)",
                borderColor: selected === r.id ? "#5331D0" : "rgba(155,150,218,0.15)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-xl font-bold" style={{ color: "#FDFDFE" }}>{r.nom}</p>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-bold"
                      style={{
                        background: STATUT_CONFIG[r.statut].bg,
                        color: STATUT_CONFIG[r.statut].color,
                      }}
                    >
                      {STATUT_CONFIG[r.statut].label}
                    </span>
                  </div>
                  <p className="text-base" style={{ color: "#9B96DA" }}>{r.offre}</p>
                  <p className="text-base mt-1" style={{ color: "rgba(155,150,218,0.55)" }}>
                    {r.devis} · {r.telephone}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black" style={{ color: "#FDFDFE" }}>{r.montant}€</p>
                  <p
                    className="text-base font-semibold mt-1"
                    style={{ color: r.joursSansReponse >= 14 ? "#ef4444" : r.joursSansReponse >= 7 ? "#f472b6" : "#9B96DA" }}
                  >
                    {r.joursSansReponse}j sans réponse
                  </p>
                </div>
              </div>

              {/* Actions expandées */}
              <AnimatePresence>
                {selected === r.id && r.statut !== "converti" && r.statut !== "perdu" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 pt-5 border-t grid grid-cols-1 gap-3"
                      style={{ borderColor: "rgba(155,150,218,0.15)" }}>

                      {/* Infos contact */}
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <a
                          href={`tel:${r.telephone.replace(/\s/g, "")}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-3 p-4 rounded-xl border-2"
                          style={{ background: "rgba(83,49,208,0.15)", borderColor: "rgba(83,49,208,0.4)" }}
                        >
                          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"
                              stroke="#9B96DA" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#9B96DA" }}>Appeler</p>
                            <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>{r.telephone}</p>
                          </div>
                        </a>
                        <a
                          href={`mailto:${r.email}?subject=Votre devis OptiPilot ${r.devis}&body=Bonjour ${r.nom.split(" ")[0]},%0A%0ANous revenons vers vous concernant votre devis ${r.devis} pour des lunettes ${r.offre}.%0A%0AN'hésitez pas à nous contacter pour finaliser votre commande.%0A%0ACordialement`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-3 p-4 rounded-xl border-2"
                          style={{ background: "rgba(83,49,208,0.15)", borderColor: "rgba(83,49,208,0.4)" }}
                        >
                          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#9B96DA" strokeWidth="2" />
                            <path d="M2 7l10 7 10-7" stroke="#9B96DA" strokeWidth="2" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "#9B96DA" }}>Email</p>
                            <p className="text-base font-bold truncate max-w-30" style={{ color: "#FDFDFE" }}>{r.email}</p>
                          </div>
                        </a>
                      </div>

                      {/* Boutons statut */}
                      <div className="grid grid-cols-3 gap-3">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => { e.stopPropagation(); marquerRelance(r.id); }}
                          className="py-4 rounded-xl text-base font-bold border-2"
                          style={{ background: "rgba(155,150,218,0.12)", borderColor: "rgba(155,150,218,0.3)", color: "#9B96DA" }}
                        >
                          Relancé
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => { e.stopPropagation(); marquerConverti(r.id); }}
                          className="py-4 rounded-xl text-base font-bold border-2"
                          style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.4)", color: "#22c55e" }}
                        >
                          ✓ Vendu
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={(e) => { e.stopPropagation(); marquerPerdu(r.id); }}
                          className="py-4 rounded-xl text-base font-bold border-2"
                          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
                        >
                          Perdu
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
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
