"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

interface Stats {
  devisJour: number;
  ventesJour: number;
  panierMoyen: number;
}

interface User {
  nom: string;
  magasinNom?: string;
  magasinId: string;
}

const MENU_ITEMS = [
  {
    id: "scanner",
    label: "Scanner\nOrdonnance",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <path d="M18 14v2m0 4v0m-4-3h2m4 0h0" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)",
    href: "/scanner",
  },
  {
    id: "nouveau-client",
    label: "Nouveau\nClient",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 12v6M16 15h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #1C0B62 0%, #5331D0 100%)",
    href: "/nouveau-client",
  },
  {
    id: "historique",
    label: "Historique",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="17" rx="2" stroke="white" strokeWidth="2" />
        <path d="M3 9h18" stroke="white" strokeWidth="2" />
        <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 14h5M7 17h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
    href: "/historique",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats>({
    devisJour: 6,
    ventesJour: 4,
    panierMoyen: 320,
  });

  useEffect(() => {
    const stored = localStorage.getItem("optipilot_user");
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(stored));

    // Charger les stats réelles si backend disponible
    const userData = JSON.parse(stored);
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stats/${userData.magasinId}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setStats(data);
      })
      .catch(() => {}); // Utilise les stats démo si backend absent
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("optipilot_token");
    localStorage.removeItem("optipilot_user");
    router.replace("/login");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#020017" }}
    >
      <OptiPilotHeader
        rightAction={
          <button
            onClick={handleLogout}
            className="text-sm font-medium px-3 py-1.5 rounded-xl"
            style={{ color: "#9B96DA", background: "rgba(83,49,208,0.2)" }}
          >
            Quitter
          </button>
        }
      />

      <main className="flex-1 px-6 pb-8 pt-5 w-full">
        {/* Salutation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold" style={{ color: "#FDFDFE" }}>
            Bonjour{user?.nom ? `, ${user.nom.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#9B96DA" }}>
            {user?.magasinNom || "Votre magasin"} • Aujourd'hui
          </p>
        </motion.div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-3 gap-5 mb-6">
          {MENU_ITEMS.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(item.href)}
              className="rounded-2xl p-6 flex flex-col items-center gap-3 shadow-md"
              style={{ background: item.gradient, minHeight: 150 }}
            >
              <div className="opacity-95">{item.icon}</div>
              <span
                className="text-white text-sm font-semibold text-center leading-snug"
                style={{ whiteSpace: "pre-line" }}
              >
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Stats + Actions côte à côte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stats du jour */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5 shadow-sm"
          style={{ background: "#0A0338" }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: "#FDFDFE" }}>
            📊 Statistiques du Jour
          </h2>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={stats.devisJour}
              label="Devis Établis"
              color="#9B96DA"
              bgColor="rgba(83,49,208,0.2)"
            />
            <StatCard
              value={stats.ventesJour}
              label="Ventes Effectuées"
              color="#22c55e"
              bgColor="rgba(34,197,94,0.12)"
            />
            <StatCard
              value={`${stats.panierMoyen}€`}
              label="Panier Moyen"
              color="#9B96DA"
              bgColor="rgba(83,49,208,0.15)"
            />
          </div>
        </motion.div>

        {/* Actions rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-5 shadow-sm"
          style={{ background: "#0A0338" }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: "#FDFDFE" }}>
            ⚡ Actions Rapides
          </h2>
          <div className="flex flex-col gap-2">
            <QuickAction
              label="Relances automatiques"
              sub="3 clients à relancer"
              icon="📧"
              onClick={() => router.push("/relances")}
            />
            <QuickAction
              label="Devis en attente"
              sub="2 devis non transformés"
              icon="⏳"
              onClick={() => router.push("/historique")}
            />
            <QuickAction
              label="Configuration magasin"
              sub="Tarifs & verriers"
              icon="⚙️"
              onClick={() => router.push("/config")}
            />
          </div>
        </motion.div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
  bgColor,
}: {
  value: number | string;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col items-center text-center"
      style={{ background: bgColor }}
    >
      <span className="text-2xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs font-medium mt-1 leading-tight" style={{ color: "#9B96DA" }}>
        {label}
      </span>
    </div>
  );
}

function QuickAction({
  label,
  sub,
  icon,
  onClick,
}: {
  label: string;
  sub: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-xl w-full text-left"
      style={{ background: "rgba(83,49,208,0.15)" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#FDFDFE" }}>
            {label}
          </p>
          <p className="text-xs" style={{ color: "#9B96DA" }}>
            {sub}
          </p>
        </div>
      </div>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
        <path
          d="M9 18l6-6-6-6"
          stroke="#9B96DA"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </motion.button>
  );
}
