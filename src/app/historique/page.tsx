"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

interface DevisItem {
  id: string;
  client?: { nom: string; prenom: string; mutuelle?: string };
  clientNom?: string;
  statut: string;
  offreChoisie?: string;
  totalConfort?: number;
  racConfort?: number;
  createdAt: string;
}

// Données de démo
const DEMO_DEVIS: DevisItem[] = [
  {
    id: "1",
    clientNom: "Marie Dupont",
    statut: "accepté",
    offreChoisie: "premium",
    totalConfort: 580,
    racConfort: 110,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    clientNom: "Jean Martin",
    statut: "en_cours",
    offreChoisie: "confort",
    totalConfort: 420,
    racConfort: 90,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    clientNom: "Sophie Bernard",
    statut: "accepté",
    offreChoisie: "confort",
    totalConfort: 390,
    racConfort: 70,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    clientNom: "Pierre Leblanc",
    statut: "refusé",
    offreChoisie: "essentiel",
    totalConfort: 280,
    racConfort: 0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    clientNom: "Camille Moreau",
    statut: "expiré",
    offreChoisie: "premium",
    totalConfort: 720,
    racConfort: 260,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const STATUT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  accepté: { bg: "#f0fdf4", color: "#15803d", label: "✓ Accepté" },
  en_cours: { bg: "#eff6ff", color: "#1e3a8a", label: "⏳ En cours" },
  refusé: { bg: "#fef2f2", color: "#dc2626", label: "✗ Refusé" },
  expiré: { bg: "#f9fafb", color: "#6b7280", label: "⌛ Expiré" },
};

const OFFRE_COLORS: Record<string, string> = {
  essentiel: "#22c55e",
  confort: "#1e3a8a",
  premium: "#7e22ce",
};

export default function HistoriquePage() {
  const router = useRouter();
  const [devis, setDevis] = useState<DevisItem[]>(DEMO_DEVIS);
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("optipilot_user");
    if (!user) return;
    const userData = JSON.parse(user);

    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devis/${userData.magasinId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDevis(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filterStatut === "tous"
      ? devis
      : devis.filter((d) => d.statut === filterStatut);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const diff = (Date.now() - d.getTime()) / 1000 / 60;
    if (diff < 60) return `Il y a ${Math.round(diff)} min`;
    if (diff < 60 * 24) return `Il y a ${Math.round(diff / 60)}h`;
    return d.toLocaleDateString("fr-FR");
  }

  const stats = {
    total: devis.length,
    acceptes: devis.filter((d) => d.statut === "accepté").length,
    ca: devis
      .filter((d) => d.statut === "accepté")
      .reduce((sum, d) => sum + (d.totalConfort || 0), 0),
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <OptiPilotHeader
        title="Historique"
        showBack
        onBack={() => router.push("/dashboard")}
      />

      <main className="flex-1 px-6 pb-8 pt-5 w-full">
        {/* Stats synthèse */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "white" }}
          >
            <p className="text-2xl font-black" style={{ color: "#1e3a8a" }}>
              {stats.total}
            </p>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
              Devis total
            </p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "white" }}
          >
            <p className="text-2xl font-black" style={{ color: "#15803d" }}>
              {stats.acceptes}
            </p>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
              Acceptés
            </p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "white" }}
          >
            <p className="text-2xl font-black" style={{ color: "#7e22ce" }}>
              {stats.ca}€
            </p>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
              CA total
            </p>
          </div>
        </motion.div>

        {/* Filtres */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {["tous", "en_cours", "accepté", "refusé", "expiré"].map((f) => (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterStatut(f)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0"
              style={{
                background: filterStatut === f ? "#1e3a8a" : "white",
                color: filterStatut === f ? "white" : "#6b7280",
              }}
            >
              {f === "tous"
                ? "Tous"
                : STATUT_STYLE[f]?.label || f}
            </motion.button>
          ))}
        </div>

        {/* Liste devis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((d, i) => {
            const statut = STATUT_STYLE[d.statut] || STATUT_STYLE.expiré;
            const nomClient =
              d.client
                ? `${d.client.prenom} ${d.client.nom}`
                : d.clientNom || "Client inconnu";

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl p-4 shadow-sm"
                style={{ background: "white" }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold" style={{ color: "#1a1a2e" }}>
                      {nomClient}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                      {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: statut.bg, color: statut.color }}
                  >
                    {statut.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {d.offreChoisie && (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold text-white capitalize"
                        style={{
                          background:
                            OFFRE_COLORS[d.offreChoisie] || "#6b7280",
                        }}
                      >
                        {d.offreChoisie}
                      </span>
                    )}
                    {d.totalConfort && (
                      <span className="text-sm font-medium" style={{ color: "#374151" }}>
                        {d.totalConfort}€
                      </span>
                    )}
                  </div>
                  {d.racConfort !== undefined && (
                    <div className="text-right">
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        RAC
                      </p>
                      <p className="text-sm font-bold" style={{ color: "#1e3a8a" }}>
                        {d.racConfort}€
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16" style={{ color: "#9ca3af" }}>
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">Aucun devis trouvé</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
