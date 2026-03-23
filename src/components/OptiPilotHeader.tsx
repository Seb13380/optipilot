"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/AppContext";

interface OptiPilotHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const MENU_KEYS = [
  { key: "dashboard" as const,        href: "/dashboard" },
  { key: "newClient" as const,        href: "/nouveau-client" },
  { key: "scanPrescription" as const, href: "/scanner" },
  { key: "recommendations" as const,  href: "/recommandations" },
  { key: "quote" as const,            href: "/devis" },
  { key: "history" as const,          href: "/historique" },
  { key: "catalogue" as const,        href: "/catalogue" },
  { key: "reconciliations" as const,  href: "/rapprochements" },
  { key: "configuration" as const,    href: "/config" },
  { key: "subscription" as const,     href: "/abonnement" },
];

export default function OptiPilotHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
}: OptiPilotHeaderProps) {
  const router = useRouter();
  const { lang, setLang, t, theme, toggleTheme } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const titleColor = theme === "dark" ? "#FDFDFE" : "#111827";

  return (
    <>
      <header
        className="flex items-center justify-between px-6 py-5"
        style={{ background: "transparent" }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 min-w-20">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="flex items-center gap-2 font-bold text-xl"
              style={{ color: "#5331D0" }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" stroke="#5331D0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.back}
            </motion.button>
          )}
        </div>

        {/* Center — Logo ou Titre */}
        <div className="flex flex-col items-center">
          {!title ? (
            <div className="relative flex items-center justify-center">
              <div
                className="absolute rounded-full"
                style={{
                  inset: "-20px",
                  background: "radial-gradient(ellipse at center, rgba(244,114,182,0.20) 0%, rgba(167,139,250,0.12) 55%, transparent 78%)",
                  filter: "blur(14px)",
                }}
              />
              <img
                src="/assets/images/Logo-OptiPilot.png"
                alt="OptiPilot"
                className="relative w-44 h-auto object-contain"
                style={{ filter: "drop-shadow(0 0 24px rgba(124,58,237,0.6)) drop-shadow(0 0 48px rgba(124,58,237,0.35))" }}
              />
            </div>
          ) : (
            <span className="text-2xl font-bold" style={{ color: titleColor }}>{title}</span>
          )}
        </div>

        {/* Right */}
        <div className="min-w-20 flex items-center justify-end gap-2">
          {rightAction}

          {/* Sélecteur de langue */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(83,49,208,0.35)" }}>
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

          {/* Bascule jour/nuit */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2 rounded-xl"
            style={{ color: "#5331D0", border: "1px solid rgba(83,49,208,0.35)" }}
            title={theme === "dark" ? "Mode jour" : "Mode nuit"}
          >
            {theme === "dark" ? (
              /* Soleil */
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" stroke="#5331D0" strokeWidth="2"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Lune */
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="#5331D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMenuOpen(true)}
            className="p-2 rounded-xl"
            style={{ color: "#5331D0" }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>
      </header>

      {/* Menu slide-in */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)" }}
            />
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col py-8 px-6 gap-3"
              style={{
                width: "72vw",
                maxWidth: 320,
                background: "linear-gradient(160deg, #0d0530 0%, #160a45 100%)",
                borderLeft: "1px solid rgba(155,150,218,0.2)",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.6)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-black" style={{ color: "#FDFDFE" }}>{t.menu}</span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-xl"
                  style={{ color: "#9B96DA", background: "rgba(155,150,218,0.1)" }}
                >
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </motion.button>
              </div>

              {MENU_KEYS.map((item, i) => (
                <motion.button
                  key={item.href}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setMenuOpen(false); router.push(item.href); }}
                  className="w-full text-left px-4 py-4 rounded-2xl font-semibold text-lg transition-all"
                  style={{ color: "#FDFDFE", background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.25)" }}
                >
                  {t[item.key]}
                </motion.button>
              ))}

              <div className="flex-1" />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setMenuOpen(false); localStorage.clear(); router.push("/login"); }}
                className="w-full text-left px-4 py-4 rounded-2xl font-semibold text-lg"
                style={{ color: "#fca5a5", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                {t.logout}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
