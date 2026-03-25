"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OpticianGuard from "@/components/OpticianGuard";
import { lockSession } from "@/lib/opticianAuth";
import { useApp } from "@/lib/AppContext";

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
    labelKey: "scanPrescriptionTitle",
    descKey: "scanDescription",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <path d="M18 14v2m0 4v0m-4-3h2m4 0h0" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)",
    shadow: "rgba(83,49,208,0.45)",
    href: "/scanner",
  },
  {
    id: "nouveau-client",
    labelKey: "newClientTitle",
    descKey: "newClientDescription",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 12v6M16 15h6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
    shadow: "rgba(124,58,237,0.4)",
    href: "/nouveau-client",
  },
  {
    id: "historique",
    labelKey: "historyTitle",
    descKey: "historyDescription",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="17" rx="2" stroke="white" strokeWidth="2" />
        <path d="M3 9h18" stroke="white" strokeWidth="2" />
        <path d="M8 2v4M16 2v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 14h5M7 17h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
    shadow: "rgba(71,85,105,0.3)",
    href: "/historique",
  },
  {
    id: "relances",
    labelKey: "relancesTitle",
    descKey: "relancesDescription",
    icon: (
      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
        <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gradient: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    shadow: "rgba(30,41,59,0.4)",
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t, theme, toggleTheme } = useApp();
  const [usageCount, setUsageCount] = useState(0);
  const [roiDismissed, setRoiDismissed] = useState(false);

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

    // Compteur de visites pour le bloc "Pourquoi s'abonner"
    const visits = parseInt(localStorage.getItem("optipilot_dashboard_visits") || "0", 10) + 1;
    localStorage.setItem("optipilot_dashboard_visits", String(visits));
    setUsageCount(visits);
    setRoiDismissed(localStorage.getItem("optipilot_roi_dismissed") === "1");

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

  // Calculs ROI OptiPilot
  const caGenere = (s?.ventesJour ?? 0) * (s?.panierMoyen ?? 0);
  // 10 min sans OptiPilot, 4 min avec = 6 min de gain par dossier traité
  const fmtMin = (min: number) => min >= 60
    ? `${Math.floor(min / 60)}h${min % 60 > 0 ? String(min % 60).padStart(2, "0") : ""}`
    : `${min} min`;
  const tempsGagneMin = (s?.devisJour ?? 0) * 6;
  const tempsLabel = tempsGagneMin > 0 ? fmtMin(tempsGagneMin) : null;
  const opportunites = Math.max(0, (s?.devisJour ?? 0) - (s?.ventesJour ?? 0));
  const nbDevis = s?.devisJour ?? 0;
  const simSansMin = nbDevis * 10;
  const simAvecMin = nbDevis * 4;
  const gainParDevisEuros = Math.round((s?.panierMoyen ?? 300) * 0.12);
  const gainMoisEstime = Math.round(22 * (nbDevis || 3) * gainParDevisEuros);
  const gainTempsMoisLabel = fmtMin(22 * (nbDevis || 3) * 6);
  const relancesCount = Math.max(0, (s?.devisSemaine ?? 0) - (s?.ventesSemaine ?? 0));
  const potentielRelances = relancesCount * (s?.panierMoyen ?? 0);

  return (
    <div className="page-bg min-h-screen flex flex-col">
      <main className="flex-1 px-6 pb-10 pt-0 w-full max-w-7xl mx-auto">

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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(34,197,94,0.2)" }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-lg" style={{ color: "#4ade80" }}>{t.subscriptionActivated}</p>
                <p className="text-sm mt-0.5" style={{ color: "#86efac" }}>{t.subscriptionActivatedSub}</p>
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
                {t.trialPeriod} — {s.trialDaysLeft} {t.daysRemaining}{s.trialDaysLeft > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => router.push("/abonnement")}
                className="text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: "linear-gradient(135deg,#5331D0,#9B96DA)", color: "#fff" }}
              >
                {t.goPro}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header unifié logo + greeting */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between pt-6 pb-5"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <img
              src="/assets/images/Logo-OptiPilot.png"
              alt="OptiPilot"
              style={{ width: 50, height: 50, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 0 14px rgba(124,58,237,0.55)) drop-shadow(0 0 28px rgba(124,58,237,0.3))" }}
            />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black leading-tight truncate" style={{ color: theme === "dark" ? "#FDFDFE" : "#111827" }}>
                {t.greetings}{user?.nom ? `, ${user.nom.split(" ")[0]}` : ""}
              </h1>
              <p className="text-xs sm:text-sm mt-0.5 truncate" style={{ color: theme === "dark" ? "#9B96DA" : "#6b7280" }}>
                {user?.magasinNom || "Votre magasin"} · {new Date().toLocaleDateString(lang === "EN" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sélecteur de langue — masqué sur mobile */}
            <div className="hidden sm:flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(83,49,208,0.35)" }}>
              {(["FR", "EN"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-2.5 py-1 text-xs font-bold transition-all"
                  style={{
                    background: lang === l ? "#5331D0" : "transparent",
                    color: lang === l ? "#fff" : "rgba(83,49,208,0.7)",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            {/* Bascule jour/nuit — masquée sur mobile */}
            <button
              onClick={toggleTheme}
              className="hidden sm:flex p-2 rounded-xl"
              style={{ color: "#5331D0", border: "1px solid rgba(83,49,208,0.35)" }}
              title={theme === "dark" ? "Mode jour" : "Mode nuit"}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" stroke="#5331D0" strokeWidth="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round"/></svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#5331D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
            {/* Quit — masqué sur mobile */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex text-sm font-bold px-4 py-2 rounded-xl"
              style={{ color: "#5331D0", background: "rgba(83,49,208,0.1)", border: "1px solid rgba(83,49,208,0.18)" }}
            >
              {t.quit}
            </button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-xl"
              style={{ color: "#5331D0", background: "rgba(83,49,208,0.1)", border: "1px solid rgba(83,49,208,0.18)" }}
              aria-label="Menu"
            >
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </motion.button>
          </div>
        </motion.div>

        {/* Menu slide-in */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="menu-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(2,0,23,0.7)", backdropFilter: "blur(8px)" }}
              onClick={() => setMenuOpen(false)}
            >
              <motion.div
                key="menu-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="absolute right-0 top-0 bottom-0 flex flex-col"
                style={{ width: 280, background: "rgba(8,2,40,0.99)", borderLeft: "1.5px solid rgba(83,49,208,0.35)", boxShadow: "-12px 0 40px rgba(0,0,0,0.5)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 pt-7 pb-5">
                  <span className="text-xl font-black" style={{ color: "#FDFDFE" }}>{t.menu}</span>
                  <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg" style={{ color: "#9B96DA" }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {/* Langue + thème — visibles sur mobile uniquement */}
                <div className="flex sm:hidden items-center gap-2 px-6 pb-4">
                  <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(83,49,208,0.35)" }}>
                    {(["FR", "EN"] as const).map((l) => (
                      <button key={l} onClick={() => { setLang(l); }} className="px-3 py-1.5 text-sm font-bold"
                        style={{ background: lang === l ? "#5331D0" : "transparent", color: lang === l ? "#fff" : "rgba(83,49,208,0.7)" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <button onClick={toggleTheme} className="p-2 rounded-xl" style={{ color: "#5331D0", border: "1px solid rgba(83,49,208,0.35)" }}>
                    {theme === "dark" ? (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" stroke="#5331D0" strokeWidth="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    ) : (
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#5331D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </button>
                  <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="flex-1 py-1.5 rounded-xl text-sm font-bold" style={{ color: "#fca5a5", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {t.logout}
                  </button>
                </div>
                <nav className="flex flex-col gap-1 px-4 flex-1">
                  {[
                    { label: t.dashboard,        href: "/dashboard" },
                    { label: t.newClient,        href: "/nouveau-client" },
                    { label: t.scanPrescription, href: "/scanner" },
                    { label: t.recommendations,  href: "/recommandations" },
                    { label: t.quote,            href: "/devis" },
                    { label: t.history,          href: "/historique" },
                    { label: t.catalogue,        href: "/catalogue" },
                    { label: t.reconciliations,  href: "/rapprochements" },
                    { label: t.relancesTitle,    href: "/relances" },
                    { label: t.configuration,    href: "/config" },
                  ].map((item) => (
                    <button
                      key={item.href}
                      onClick={() => { setMenuOpen(false); router.push(item.href); }}
                      className="w-full text-left px-4 py-3 rounded-xl text-base font-semibold transition-colors"
                      style={{ color: "#DDDAF5", background: "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(83,49,208,0.2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div className="px-4 pb-8">
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="w-full py-3 rounded-xl text-base font-bold"
                    style={{ color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    {t.logout}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bloc ROI — valeur visible */}
        {/* ── Bloc ROI Impact ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl p-5 mb-4 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0f0a2e 0%, #1e1b4b 60%, #2e1d6e 100%)", border: "1px solid rgba(167,139,250,0.25)", boxShadow: "0 4px 32px rgba(83,49,208,0.3)" }}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.65)" }}>
              {t.impactTitle}
            </p>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5"
              style={{ background: "rgba(52,211,153,0.15)", color: "#34D399" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: "pulse 2s infinite" }} />
              {t.liveNow}
            </span>
          </div>

          {/* 3 métriques */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <span className="text-xs font-semibold" style={{ color: "rgba(196,181,253,0.7)" }}>⏱️ {t.timeFreed}</span>
              <span className="text-xl font-black text-white">{loading ? "…" : (tempsLabel ?? "—")}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t.today}</span>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <span className="text-xs font-semibold" style={{ color: "rgba(196,181,253,0.7)" }}>💰 {t.caGenerated}</span>
              <span className="text-xl font-black" style={{ color: "#c4b5fd" }}>{loading ? "…" : caGenere > 0 ? `+${caGenere.toLocaleString("fr-FR")}€` : "—"}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{s?.ventesJour ?? 0} {t.sales}</span>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-0.5" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.15)" }}>
              <span className="text-xs font-semibold" style={{ color: "rgba(196,181,253,0.7)" }}>📈 {t.opportunities}</span>
              <span className="text-xl font-black text-white">{loading ? "…" : opportunites}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t.quotesInProgress}</span>
            </div>
          </div>

          {/* Simulation sans / avec */}
          {!loading && nbDevis > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="grid grid-cols-2">
                <div className="px-4 py-3.5" style={{ background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>{t.withoutOptiPilot}</p>
                  <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>⏱️ ~{fmtMin(simSansMin)}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>💰 {t.standardSale}</p>
                </div>
                <div className="px-4 py-3.5" style={{ background: "rgba(83,49,208,0.25)" }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: "#9B96DA" }}>{t.withOptiPilot}</p>
                  <p className="text-sm font-black text-white">⏱️ ~{fmtMin(simAvecMin)}</p>
                  <p className="text-sm font-black mt-0.5" style={{ color: "#34D399" }}>💰 {t.optimizedSale}</p>
                </div>
              </div>
              <div className="px-4 py-2.5 text-center" style={{ background: "rgba(52,211,153,0.08)", borderTop: "1px solid rgba(52,211,153,0.15)" }}>
                <p className="text-xs font-bold" style={{ color: "#34D399" }}>
                ≈ +{gainMoisEstime.toLocaleString("fr-FR")}€ / {lang === "EN" ? "month" : "mois"} · {gainTempsMoisLabel} / {lang === "EN" ? "month" : "mois"} {t.timeFreed.toLowerCase()}
                </p>
              </div>
            </div>
          )}

          {/* Journée vide — estimation fixe */}
          {!loading && nbDevis === 0 && (
            <div className="rounded-2xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>{t.startFirstSale}</p>
              <p className="text-xs mt-1.5 font-bold" style={{ color: "#34D399" }}>{t.monthlyEstimate} : ≈ +900€ à +1800€ de CA +22h {t.timeFreed.toLowerCase()} / {lang === "EN" ? "month" : "mois"}</p>
            </div>
          )}
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
              whileHover={{ y: -4 }}
              onClick={() => router.push(item.href)}
              className="rounded-3xl p-6 flex flex-col items-center gap-2"
              style={{
                background: item.gradient,
                minHeight: 155,
                boxShadow: `0 4px 20px ${item.shadow}`,
                transition: "box-shadow 0.25s ease",
              }}
            >
              <div className="opacity-95">{item.icon}</div>
              <span className="text-white text-xl font-bold text-center leading-snug" style={{ whiteSpace: "pre-line" }}>
                {t[item.labelKey]}
              </span>
              <span className="text-white text-sm font-medium text-center" style={{ opacity: 0.65 }}>
                {t[item.descKey]}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Passer la tablette au client — CTA principal */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -3 }}
          onClick={() => { lockSession(); router.push("/client"); }}
          className="w-full rounded-3xl px-6 py-6 flex items-center justify-between mb-5"
          style={{
            background: "linear-gradient(135deg, #3b1fa8 0%, #5331D0 55%, #7B5CE5 100%)",
            border: "1.5px solid rgba(255,255,255,0.18)",
            boxShadow: "0 8px 36px rgba(83,49,208,0.45), 0 0 0 1px rgba(83,49,208,0.2)",
            transition: "box-shadow 0.25s ease",
          }}
        >
          <div className="flex items-center gap-5">
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ width: 56, height: 56, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", flexShrink: 0 }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="18" r="1.5" fill="white" />
                <path d="M9 6h6M9 9.5h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xl font-black leading-tight" style={{ color: "#FFFFFF" }}>
                {t.launchClient}
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t.launchClientSub}
              </p>
            </div>
          </div>
          <div
            className="rounded-xl flex items-center justify-center"
            style={{ width: 40, height: 40, background: "rgba(255,255,255,0.15)", flexShrink: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.button>

        {/* WAOUH relances */}
        {!loading && relancesCount > 0 && potentielRelances > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -2 }}
            onClick={() => router.push("/relances")}
            className="w-full rounded-2xl px-5 py-4 flex items-center justify-between mb-4"
            style={{ background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.22)", transition: "all 0.2s ease" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
                  <path d="M12 9v4M12 17h.01" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round"/>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-base" style={{ color: "#111827" }}>{relancesCount} devis en attente de relance</p>
                <p className="text-sm" style={{ color: "#6b7280" }}>+{potentielRelances.toLocaleString("fr-FR")}€ de CA potentiel non encaissé</p>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "#ef4444", flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        )}

        {/* Bloc "Pourquoi s'abonner" — après 3 visites, uniquement en trial */}
        {!loading && !roiDismissed && usageCount >= 3 && s?.trialDaysLeft !== null && s?.trialDaysLeft !== undefined && s.trialDaysLeft > 0 && s?.plan !== "pro" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-3xl p-5 mb-4 relative"
            style={{ background: "linear-gradient(135deg, #0d0826 0%, #1a0f45 60%, #2a1060 100%)", border: "1.5px solid rgba(167,139,250,0.4)", boxShadow: "0 6px 36px rgba(83,49,208,0.35)" }}
          >
            {/* Fermer */}
            <button
              onClick={() => { setRoiDismissed(true); localStorage.setItem("optipilot_roi_dismissed", "1"); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg opacity-40 hover:opacity-80 transition-opacity"
              style={{ color: "#9B96DA" }}
              aria-label="Fermer"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* En-tête */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(167,139,250,0.2)" }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    stroke="#A78BFA" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-bold" style={{ color: "rgba(196,181,253,0.85)" }}>Vous utilisez OptiPilot depuis {usageCount} session{usageCount > 1 ? "s" : ""}</p>
            </div>

            {/* Titre */}
            <p className="text-xl font-black text-white mb-3">{t.whyPro}</p>

            {/* Lignes ROI */}
            <div className="flex flex-col gap-2.5 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">⏱️</span>
                <div>
                  <p className="text-sm font-semibold text-white">1 à 2 heures gagnées par jour</p>
                  <p className="text-xs" style={{ color: "rgba(196,181,253,0.55)" }}>Saisie auto, conseils instantanés, zéro ressaisie</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">💰</span>
                <div>
                  <p className="text-sm font-semibold text-white">+10 à 20% de panier moyen</p>
                  <p className="text-xs" style={{ color: "rgba(196,181,253,0.55)" }}>Recommandations intelligentes = ventes mieux orientées</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📈</span>
                <div>
                  <p className="text-sm font-semibold text-white">Soit +800€ à +2 000€ / mois</p>
                  <p className="text-xs" style={{ color: "rgba(196,181,253,0.55)" }}>Estimé sur votre volume actuel</p>
                </div>
              </div>
            </div>

            {/* Séparateur + prix */}
            <div className="rounded-2xl px-4 py-3 mb-4 flex items-center justify-between"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <div>
                <p className="text-base font-black text-white">249 € <span className="text-sm font-normal" style={{ color: "rgba(196,181,253,0.65)" }}>/ mois</span></p>
                <p className="text-xs mt-0.5 font-semibold" style={{ color: "#34D399" }}>✔ Rentabilisé en 1 à 2 ventes</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "rgba(196,181,253,0.5)" }}>ROI estimé</p>
                <p className="text-base font-black" style={{ color: "#c4b5fd" }}>× {Math.round((gainMoisEstime || 800) / 249)}-{Math.round((gainMoisEstime || 800) * 2 / 249)}x</p>
              </div>
            </div>

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2 }}
              onClick={() => router.push("/abonnement")}
              className="w-full py-3.5 rounded-2xl text-base font-black text-white"
              style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}
            >
              {t.upgradeNow}
            </motion.button>
          </motion.div>
        )}

        {/* Stats du jour — 4 tuiles */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-4">
          <h2 className="text-xl font-bold mb-3" style={{ color: "#374151" }}>{t.todayTitle}</h2>
          <div className="grid grid-cols-4 gap-3">
            <StatTile value={loading ? "…" : s?.devisJour ?? 0} label={t.quotesEstablished} accent="#5331D0" />
            <StatTile value={loading ? "…" : s?.ventesJour ?? 0} label={t.salesTitle} accent="#ec4899" />
            <StatTile value={loading ? "…" : `${s?.tauxConversionJour ?? 0}%`} label={t.conversionLabel} accent="#7c3aed" />
            <StatTile value={loading ? "…" : `${s?.panierMoyen ?? 0}€`} label={t.avgCart} accent="#3b82f6" />
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
            <h3 className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>{t.thisWeek}</h3>
            <div className="flex flex-col gap-3">
              <BarStat label={t.quotesLabel} value={s?.devisSemaine ?? 0} max={20} color="#a78bfa" loading={loading} />
              <BarStat label={t.salesTitle} value={s?.ventesSemaine ?? 0} max={20} color="#f472b6" loading={loading} />
              <BarStat label={t.newClientsLabel} value={s?.clientsSemaine ?? 0} max={10} color="#93c5fd" loading={loading} />
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(83,49,208,0.4)" }}>
              <p className="text-sm font-semibold" style={{ color: "#C4C1EA" }}>
                {t.conversionRate} : <span style={{ color: "#c4b5fd" }}>{s?.tauxConversionSemaine ?? 0}%</span>
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
            <h3 className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>{t.clientsTitle}</h3>
            <div className="flex flex-col gap-4">
              <BigStat value={loading ? "…" : s?.totalClients ?? 0} label={t.totalClients} color="#93c5fd" />
              <BigStat value={loading ? "…" : s?.clientsSemaine ?? 0} label={t.thisWeek} color="#f472b6" />
              <BigStat value={loading ? "…" : s?.clientsMois ?? 0} label={t.thisMonth} color="#c4b5fd" />
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/historique")}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(83,49,208,0.45)", color: "#DDDAF5" }}
            >
              {t.viewAllClients}
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
            <h3 className="text-lg font-bold mb-4" style={{ color: "#FDFDFE" }}>{t.recentQuotes}</h3>
            {loading ? (
              <p style={{ color: "#C4C1EA" }} className="text-sm">{t.loading}</p>
            ) : !s?.recentDevis?.length ? (
              <p style={{ color: "#C4C1EA" }} className="text-sm">{t.noQuotesYet}</p>
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
                      {d.statut === "accepté" ? t.statusAccepted : d.statut === "en_cours" ? t.statusInProgress : d.statut === "refusé" ? t.statusRefused : d.statut}
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
              {t.viewAllHistory}
            </motion.button>
          </motion.div>
        </div>

        {/* Opportunités détectées */}
        <OpportunitesSansStats stats={s} loading={loading} onNavigate={router.push.bind(router)} />

      </main>
    </div>
  );
}

function StatTile({ value, label, accent }: { value: number | string; label: string; accent: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col"
      style={{
        background: "#ffffff",
        border: "1.5px solid #f1f0f9",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${accent}18` }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
      </div>
      <span className="text-3xl font-black leading-none" style={{ color: "#111827" }}>{value}</span>
      <span className="text-xs font-semibold mt-1.5 leading-tight" style={{ color: "#9ca3af" }}>{label}</span>
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
  const { t } = useApp();
  const ops = genererOpportunites(stats);
  if (loading || ops.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="mt-4"
    >
      <h2 className="text-xl font-bold mb-3" style={{ color: "#DDDAF5" }}>{t.detectedOpportunities}</h2>
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
