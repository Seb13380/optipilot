"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface OptiPilotHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const MENU_ITEMS = [
  { label: "Tableau de bord",   href: "/dashboard" },
  { label: "Nouveau client",    href: "/nouveau-client" },
  { label: "Scanner ordonnance",href: "/scanner" },
  { label: "Recommandations",   href: "/recommandations" },
  { label: "Devis",             href: "/devis" },
  { label: "Historique",        href: "/historique" },
  { label: "Configuration",     href: "/config" },
];

export default function OptiPilotHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
}: OptiPilotHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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
              style={{ color: "#9B96DA" }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="#9B96DA"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Retour
            </motion.button>
          )}
        </div>

        {/* Center — Logo ou Titre */}
        <div className="flex flex-col items-center">
          {!title ? (
            <img
              src="/assets/images/logo-OptiPilot.png"
              alt="OptiPilot"
              className="w-44 h-auto object-contain"
            />
          ) : (
            <span className="text-2xl font-bold" style={{ color: "#FDFDFE" }}>
              {title}
            </span>
          )}
        </div>

        {/* Right */}
        <div className="min-w-20 flex justify-end">
          {rightAction || (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-xl"
              style={{ color: "#9B96DA" }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          )}
        </div>
      </header>

      {/* Menu slide-in */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.6)" }}
            />

            {/* Panneau */}
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
              {/* Header panneau */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-black" style={{ color: "#FDFDFE" }}>Menu</span>
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

              {/* Items */}
              {MENU_ITEMS.map((item, i) => (
                <motion.button
                  key={item.href}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setMenuOpen(false); router.push(item.href); }}
                  className="w-full text-left px-4 py-4 rounded-2xl font-semibold text-lg transition-all"
                  style={{
                    color: "#FDFDFE",
                    background: "rgba(83,49,208,0.12)",
                    border: "1px solid rgba(83,49,208,0.25)",
                  }}
                >
                  {item.label}
                </motion.button>
              ))}

              {/* Déconnexion */}
              <div className="flex-1" />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setMenuOpen(false);
                  localStorage.clear();
                  router.push("/login");
                }}
                className="w-full text-left px-4 py-4 rounded-2xl font-semibold text-lg"
                style={{
                  color: "#fca5a5",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                Se déconnecter
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
