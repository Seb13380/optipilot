"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";
import { lockSession } from "@/lib/opticianAuth";

interface Stats {
  devisJour: number;
  ventesJour: number;
  panierMoyen: number;
  tauxConversionJour: number;
  devisSemaine: number;
  ventesSemaine: number;
  tauxConversionSemaine: number;
  devisMois: number;
  clientsMois: number;
  totalClients: number;
  clientsSemaine: number;
  recentDevis: { id: string; client: string; statut: string; total: number; createdAt: string }[];
  plan: string;
  trialDaysLeft: number | null;
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
    description: "Extraction auto des données",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
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
    description: "Fiche · Mutuelle · Antécédents",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
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
    description: "Devis, ventes et stats",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="17" rx="2" stroke="white" strokeWidth="2" />
        <path d="M3 9h18" stroke="white" strokeWidth="2" />
        <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 14h5M7 17h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
    href: "/historique",
  },
  {
    id: "relances",
    label: "Relances",
    description: "Clients sans réponse",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #2D0B62 0%, #5331D0 100%)",
    href: "/relances",
  },
];

const STATUT_COLORS: Record<string, string> = {
  "accepté": "#22c55e",
  "en_cours": "#c084fc",
  "refusé": "#ef4444",
};
const STATUT_LABELS: Record<string, string> = {
  "accepté": "Accepté",
  "en_cours": "En cours",
  "refusé": "Refusé",
};

function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      setUpgradeSuccess(true);
      setTimeout(() => setUpgradeSuccess(false), 6000);
      // Nettoyer l'URL sans recharger
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  useEffect(() => {
    const stored = localStorage.getItem("optipilot_user");
    if (!stored) { router.replace("/login"); return; }
    const userData = JSON.parse(stored);
    setUser(userData);

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/stats/${userData.magasinId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("optipilot_token") || ""}` },
    })
      .then((r) => r.json())
      .then((data) => { if (!data.error) setStats(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("optipilot_token");
    localStorage.removeItem("optipilot_user");
    router.replace("/login");
  }

  const s = stats;

  return (
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader
        rightAction={
          <button
            onClick={handleLogout}
            className="text-base font-medium px-4 py-2 rounded-xl"
            style={{ color: "#DDDAF5", background: "rgba(83,49,208,0.35)" }}
          >
            Quitter
          </button>
        }
      />

      <main className="flex-1 px-6 pb-10 pt-2 w-full max-w-7xl mx-auto">

        {/* Confirmation upgrade */}
        <AnimatePresence>
          {upgradeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              className="mb-4 px-5 py-4 rounded-2xl flex items-center gap-4"
              style={{ background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.45)" }}
            >
              <span style={{ fontSize: 28 }}>🎉</span>
              <div>
                <p className="font-bold text-lg" style={{ color: "#4ade80" }}>Abonnement activé avec succès !</p>
                <p className="text-sm mt-0.5" style={{ color: "#86efac" }}>Bienvenue sur OptiPilot Pro — toutes les fonctionnalités sont maintenant disponibles.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerte trial */}
        <AnimatePresence>
          {s?.trialDaysLeft !== null && s?.trialDaysLeft !== undefined && s.trialDaysLeft <= 7 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-5 py-3 rounded-2xl flex items-center justify-between gap-4"
              style={{ background: s.trialDaysLeft <= 2 ? "rgba(239,68,68,0.15)" : "rgba(139,92,246,0.18)", border: `1px solid ${s.trialDaysLeft <= 2 ? "rgba(239,68,68,0.4)" : "rgba(139,92,246,0.5)"}` }}
            >
              <span style={{ color: s.trialDaysLeft <= 2 ? "#ef4444" : "#a78bfa" }} className="font-semibold text-base">
                Période d'essai — {s.trialDaysLeft} jour{s.trialDaysLeft > 1 ? "s" : ""} restant{s.trialDaysLeft > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => router.push("/abonnement")}
                className="text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: "linear-gradient(135deg,#5331D0,#9B96DA)", color: "#fff" }}
              >
                Passer Pro →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Salutation */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-4xl font-black" style={{ color: "#FDFDFE" }}>
            Bonjour{user?.nom ? `, ${user.nom.split(" ")[0]}` : ""}
          </h1>
          <p className="text-xl mt-1" style={{ color: "#C4C1EA" }}>
            {user?.magasinNom || "Votre magasin"} • {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </motion.div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {MENU_ITEMS.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(item.href)}
              className="rounded-3xl p-6 flex flex-col items-center gap-2 shadow-md"
              style={{ background: item.gradient, minHeight: 155 }}
            >
              <div className="opacity-95">{item.icon}</div>
              <span className="text-white text-xl font-bold text-center leading-snug" style={{ whiteSpace: "pre-line" }}>
                {item.label}
              </span>
              <span className="text-white text-sm font-medium text-center" style={{ opacity: 0.6 }}>
                {item.description}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Passer la tablette au client */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { lockSession(); router.push("/client"); }}
          className="w-full rounded-2xl px-6 py-5 flex items-center justify-between mb-5"
          style={{
            background: "linear-gradient(135deg, rgba(28,11,98,0.85) 0%, rgba(83,49,208,0.55) 100%)",
            border: "1.5px solid rgba(155,150,218,0.4)",
            boxShadow: "0 4px 24px rgba(83,49,208,0.25)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, background: "rgba(83,49,208,0.5)", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="18" r="1.2" fill="white" />
                <path d="M9 6h6M9 9.5h4" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>
                Passer la tablette au client
              </p>
              <p className="text-sm mt-0.5" style={{ color: "#C4C1EA" }}>
                Scan ordonnance &amp; mutuelle · Questionnaire · Montures
              </p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#9B96DA", flexShrink: 0 }}>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>

        {/* Stats du jour — 4 tuiles */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-4">
          <h2 className="text-xl font-bold mb-3" style={{ color: "#DDDAF5" }}> Aujourd'hui</h2>
          <div className="grid grid-cols-4 gap-3">
            <StatTile value={loading ? "…" : s?.devisJour ?? 0} label="Devis établis" color="#C4C1EA" bg="rgba(83,49,208,0.55)" />
            <StatTile value={loading ? "…" : s?.ventesJour ?? 0} label="Ventes" color="#4ade80" bg="rgba(34,197,94,0.35)" />
            <StatTile value={loading ? "…" : `${s?.tauxConversionJour ?? 0}%`} label="Conversion" color="#c4b5fd" bg="rgba(167,139,250,0.35)" />
            <StatTile value={loading ? "…" : `${s?.panierMoyen ?? 0}€`} label="Panier moyen" color="#93c5fd" bg="rgba(96,165,250,0.35)" />
          </div>
        </motion.div>

        {/* Semaine + Clients + Devis récents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Semaine */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(8,2,40,0.96)", border: "1px solid rgba(83,49,208,0.55)" }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>Cette semaine</h3>
            <div className="flex flex-col gap-3">
              <BarStat label="Devis" value={s?.devisSemaine ?? 0} max={20} color="#a78bfa" loading={loading} />
              <BarStat label="Ventes" value={s?.ventesSemaine ?? 0} max={20} color="#4ade80" loading={loading} />
              <BarStat label="Nouveaux clients" value={s?.clientsSemaine ?? 0} max={10} color="#93c5fd" loading={loading} />
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(83,49,208,0.4)" }}>
              <p className="text-sm font-semibold" style={{ color: "#C4C1EA" }}>
                Taux de conversion : <span style={{ color: "#c4b5fd" }}>{s?.tauxConversionSemaine ?? 0}%</span>
              </p>
            </div>
          </motion.div>

          {/* Clients */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(8,2,40,0.96)", border: "1px solid rgba(83,49,208,0.55)" }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>Clients</h3>
            <div className="flex flex-col gap-4">
              <BigStat value={loading ? "…" : s?.totalClients ?? 0} label="Total clients" color="#93c5fd" />
              <BigStat value={loading ? "…" : s?.clientsSemaine ?? 0} label="Cette semaine" color="#4ade80" />
              <BigStat value={loading ? "…" : s?.clientsMois ?? 0} label="Ce mois" color="#c4b5fd" />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/historique")}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(83,49,208,0.45)", color: "#DDDAF5" }}
            >
              Voir tous les clients →
            </motion.button>
          </motion.div>

          {/* Devis récents */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44 }}
            className="rounded-2xl p-5"
            style={{ background: "rgba(8,2,40,0.96)", border: "1px solid rgba(83,49,208,0.55)" }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>Derniers devis</h3>
            {loading ? (
              <p style={{ color: "#C4C1EA" }} className="text-sm">Chargement…</p>
            ) : !s?.recentDevis?.length ? (
              <p style={{ color: "#C4C1EA" }} className="text-sm">Aucun devis pour l&apos;instant</p>
            ) : (
              <div className="flex flex-col gap-2">
                {s.recentDevis.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "rgba(83,49,208,0.3)" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#FDFDFE" }}>{d.client}</p>
                      <p className="text-xs" style={{ color: "#C4C1EA" }}>
                        {new Date(d.createdAt).toLocaleDateString("fr-FR")} · {d.total > 0 ? `${d.total}€` : "—"}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: `${STATUT_COLORS[d.statut] ?? "#9B96DA"}22`, color: STATUT_COLORS[d.statut] ?? "#9B96DA" }}>
                      {STATUT_LABELS[d.statut] ?? d.statut}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/historique")}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(83,49,208,0.45)", color: "#DDDAF5" }}
            >
              Voir tout l&apos;historique →
            </motion.button>
          </motion.div>
        </div>

        {/* Opportunités détectées */}
        <OpportunitesSansStats stats={s} loading={loading} onNavigate={router.push.bind(router)} />

      </main>
    </div>
  );
}

function StatTile({ value, label, color, bg }: { value: number | string; label: string; color: string; bg: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col items-center text-center" style={{ background: bg }}>
      <span className="text-3xl font-black" style={{ color }}>{value}</span>
      <span className="text-sm font-bold mt-1 leading-tight" style={{ color: "#DDDAF5" }}>{label}</span>
    </div>
  );
}

function BigStat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold" style={{ color: "#C4C1EA" }}>{label}</span>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
    </div>
  );
}

function BarStat({ label, value, max, color, loading }: { label: string; value: number; max: number; color: string; loading: boolean }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-semibold" style={{ color: "#C4C1EA" }}>{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{loading ? "…" : value}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(155,150,218,0.25)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-2 rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ─── Opportunités ───────────────────────────────────────────

interface Opportunite {
  icon: string;
  titre: string;
  description: string;
  cta?: string;
  ctaHref?: string;
  niveau: "info" | "warn" | "gain";
}

function genererOpportunites(stats: Stats | null): Opportunite[] {
  if (!stats) return [];
  const ops: Opportunite[] = [];
  const TAUX_CONVERSION_MOYEN = 60;
  const PANIER_MOYEN_NATIONAL = 310;
  const TAUX_PREMIUM_NATIONAL = 35;

  // Taux de conversion faible
  if (stats.tauxConversionSemaine < TAUX_CONVERSION_MOYEN && stats.devisSemaine > 0) {
    const devisNonTransformes = stats.devisSemaine - stats.ventesSemaine;
    ops.push({
      icon: "▲",
      titre: "Devis non transformés",
      description: `${devisNonTransformes} devis cette semaine sans suite. Activer les relances automatiques pourrait récupérer +10 à +20% de ventes.`,
      cta: "Configurer les relances",
      ctaHref: "/relances",
      niveau: "warn",
    });
  }

  // Panier moyen en dessous de la moyenne
  if (stats.panierMoyen > 0 && stats.panierMoyen < PANIER_MOYEN_NATIONAL) {
    ops.push({
      icon: "+",
      titre: "Panier moyen inférieur à la moyenne",
      description: `Votre panier moyen est de ${stats.panierMoyen}€ vs ${PANIER_MOYEN_NATIONAL}€ en moyenne nationale. Le Conseiller IA de vente peut aider à proposer l'offre supérieure.`,
      niveau: "warn",
    });
  }

  // Taux de conversion excellent
  if (stats.tauxConversionSemaine >= 70 && stats.ventesSemaine > 0) {
    ops.push({
      icon: "✓",
      titre: "Excellent taux de conversion !",
      description: `${stats.tauxConversionSemaine}% cette semaine — bien au-dessus de la moyenne de ${TAUX_CONVERSION_MOYEN}%. Continuez comme ça.`,
      niveau: "gain",
    });
  }

  // Opportunité premium (on estime le taux premium à partir du panier)
  if (stats.panierMoyen > 0 && stats.ventesSemaine >= 3) {
    const estimTauxPremium = stats.panierMoyen > 380 ? 40 : stats.panierMoyen > 300 ? 25 : 15;
    if (estimTauxPremium < TAUX_PREMIUM_NATIONAL) {
      ops.push({
        icon: "◆",
        titre: "Opportunité verres premium",
        description: `Verres premium estimés à ~${estimTauxPremium}% de vos ventes vs ${TAUX_PREMIUM_NATIONAL}% en moyenne nationale. Le Conseiller IA peut vous aider à présenter cette offre.`,
        niveau: "info",
      });
    }
  }

  // Bonne semaine  
  if (stats.ventesSemaine >= 5) {
    ops.push({
      icon: "↑",
      titre: "Belle semaine !",
      description: `${stats.ventesSemaine} ventes cette semaine. Si ce rythme continue, vous êtes en route pour ${Math.round(stats.ventesSemaine * 4)} ventes ce mois.`,
      niveau: "gain",
    });
  }

  // Trial bientôt fini
  if (stats.trialDaysLeft !== null && stats.trialDaysLeft <= 14 && stats.trialDaysLeft > 0) {
    ops.push({
      icon: "!",
      titre: "Essai gratuit bientôt terminé",
      description: `Il vous reste ${stats.trialDaysLeft} jours. Passez en Pro pour ne pas perdre vos données et activer les relances automatiques.`,
      cta: "Voir les offres Pro",
      ctaHref: "/abonnement",
      niveau: "warn",
    });
  }

  return ops;
}

const NIVEAU_STYLES = {
  info: { bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", color: "#60a5fa" },
  warn: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.35)", color: "#a78bfa" },
  gain: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", color: "#22c55e" },
};

function OpportunitesSansStats({
  stats,
  loading,
  onNavigate,
}: {
  stats: Stats | null;
  loading: boolean;
  onNavigate: (href: string) => void;
}) {
  const ops = genererOpportunites(stats);
  if (loading || ops.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="mt-4"
    >
      <h2 className="text-xl font-bold mb-3" style={{ color: "#DDDAF5" }}>Opportunités détectées</h2>
      <div className="flex flex-col gap-3">
        {ops.map((op, i) => {
          const style = NIVEAU_STYLES[op.niveau];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.06 }}
              className="rounded-2xl p-4 flex items-start justify-between gap-4"
              style={{ background: style.bg, border: `1px solid ${style.border}` }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-2xl shrink-0">{op.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: style.color }}>{op.titre}</p>
                  <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "#9B96DA" }}>{op.description}</p>
                  {op.cta && op.ctaHref && (
                    <button
                      onClick={() => onNavigate(op.ctaHref!)}
                      className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: `${style.border}`, color: style.color }}
                    >
                      {op.cta} →
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function DashboardPageWrapper() {
  return (
    <OpticianGuard>
      <Suspense fallback={null}>
        <DashboardPage />
      </Suspense>
    </OpticianGuard>
  );
}
