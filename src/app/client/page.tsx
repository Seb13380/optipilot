"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { checkPin, unlockSession } from "@/lib/opticianAuth";

const STEPS = [
  {
    id: "ordonnance",
    num: 1,
    label: "Scanner mon ordonnance",
    instruction: "Veuillez scanner votre ordonnance",
    sub: "Photographiez votre prescription médicale",
    href: "/scanner",
    active: true,
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <path d="M18 14v2m0 4v0m-4-3h2m4 0h0" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "mutuelle",
    num: 2,
    label: "Scanner ma carte mutuelle",
    instruction: "Veuillez scanner votre carte mutuelle",
    sub: "Photographiez votre carte de tiers payant",
    href: "/client/mutuelle",
    active: true,
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2" />
        <path d="M2 10h20" stroke="white" strokeWidth="2" />
        <path d="M6 15h4M14 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "questionnaire",
    num: 3,
    label: "Mon questionnaire",
    instruction: "Veuillez répondre à quelques questions",
    sub: "Vos besoins visuels et préférences",
    href: "/questionnaire",
    active: true,
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
        <rect x="4" y="2" width="16" height="20" rx="2" stroke="white" strokeWidth="2" />
        <path d="M8 7h8M8 11h8M8 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "montures",
    num: 4,
    label: "Voir nos montures",
    instruction: null,
    sub: "Disponible prochainement",
    href: "/client/montures",
    active: false,
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
        <circle cx="6.5" cy="13" r="3.5" stroke="white" strokeWidth="2" />
        <circle cx="17.5" cy="13" r="3.5" stroke="white" strokeWidth="2" />
        <path d="M10 13h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 13C3 9 5 7 6.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M21 13C21 9 19 7 17.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ClientPage() {
  const router = useRouter();
  const [magasinNom, setMagasinNom] = useState("Votre opticien");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
      if (user.magasinNom) setMagasinNom(user.magasinNom);
    } catch { /* ignore */ }
  }, []);

  function addDigit(d: string) {
    if (pin.length >= 4 || pinError || pinSuccess) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (checkPin(next)) {
          setPinSuccess(true);
          unlockSession();
          setTimeout(() => router.push("/dashboard"), 600);
        } else {
          setPinError(true);
          setTimeout(() => { setPin(""); setPinError(false); }, 900);
        }
      }, 100);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(circle at 15% 20%, rgba(124,58,237,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.28), transparent 45%), linear-gradient(180deg, #f0f0fa 0%, #e8e8f5 100%)" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-10 pb-5 px-6"
      >
        <img src="/assets/images/Logo-OptiPilot.png" alt="OptiPilot" className="w-40 mx-auto mb-4" style={{ filter: "drop-shadow(0 0 30px rgba(124,58,237,0.7))" }} />
        <h1 className="text-2xl font-black" style={{ color: "#111827" }}>{magasinNom}</h1>
        <p className="text-base mt-1 font-medium" style={{ color: "#5331D0" }}>Bonjour, bienvenue !</p>
      </motion.div>

      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-5 mb-5 px-4 py-3.5 rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(83,49,208,0.1) 0%, rgba(236,72,153,0.08) 100%)", border: "1px solid rgba(83,49,208,0.2)" }}
      >
        <p className="text-sm font-bold" style={{ color: "#111827" }}>Préparez votre dossier en 3 étapes</p>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Suivez les étapes ci-dessous — votre opticien s&apos;occupe ensuite de votre devis et prise en charge.</p>
      </motion.div>

      {/* Steps */}
      <div className="flex-1 flex flex-col gap-3 px-5 pb-20">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
          >
            {step.active ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                onClick={() => router.push(step.href)}
                className="w-full rounded-2xl p-4 flex items-center gap-4 shadow-lg text-left"
                style={{
                  background: i === 0
                    ? "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)"
                    : i === 1
                      ? "linear-gradient(135deg, #2D1B78 0%, #5331D0 100%)"
                      : "linear-gradient(135deg, #1C0B62 0%, #2D1B78 100%)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {/* Numéro + icône */}
                <div className="rounded-xl flex items-center justify-center relative shrink-0" style={{ width: 50, height: 50, background: "rgba(0,0,0,0.22)" }}>
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(255,255,255,0.95)", color: "#5331D0" }}>
                    {step.num}
                  </span>
                </div>
                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base leading-tight">{step.instruction}</p>
                  <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{step.sub}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            ) : (
              /* Étape désactivée (montures v2) */
              <div
                className="w-full rounded-2xl p-4 flex items-center gap-4 opacity-45"
                style={{ background: "rgba(10,3,56,0.5)", border: "1.5px dashed rgba(83,49,208,0.4)" }}
              >
                <div className="rounded-xl flex items-center justify-center relative shrink-0" style={{ width: 50, height: 50, background: "rgba(0,0,0,0.25)" }}>
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(255,255,255,0.5)", color: "#5331D0" }}>
                    {step.num}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base leading-tight">{step.label}</p>
                  <p className="text-xs mt-0.5 font-semibold" style={{ color: "rgba(236,72,153,0.8)" }}>
                    Version 2 — bientôt disponible
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Bouton retour opticien */}
      <button
        onClick={() => { setShowPin(true); setPin(""); setPinError(false); setPinSuccess(false); }}
        className="fixed bottom-6 right-6 flex items-center justify-center"
        style={{ width: 52, height: 52, background: "#f3f4f6", color: "rgba(107,114,128,0.6)", border: "1px solid #e5e7eb", borderRadius: "50%" }}
        aria-label="Mode opticien"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modal PIN */}
      <AnimatePresence>
        {showPin && (
          <motion.div
            key="pin-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(2,0,23,0.92)", backdropFilter: "blur(16px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPin(false); setPin(""); } }}
          >
            <motion.div
              key="pin-card"
              initial={{ scale: 0.88, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 24 }}
              className="rounded-3xl p-8 w-full mx-6"
              style={{ maxWidth: 340, background: "rgba(8,2,40,0.99)", border: "1.5px solid rgba(83,49,208,0.5)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-xl font-bold mb-2" style={{ color: "#FDFDFE" }}>Retour opticien</p>
              <p className="text-center text-sm mb-7" style={{ color: "#9B96DA" }}>Entrez votre code à 4 chiffres</p>
              <div className="flex justify-center gap-5 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      background: pinSuccess ? "#22c55e" : pinError ? "#ef4444" : pin.length > i ? "#5331D0" : "rgba(155,150,218,0.25)",
                      scale: pinError ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.15 }}
                    className="w-5 h-5 rounded-full"
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => (
                  d === "" ? <div key={i} /> : (
                    <motion.button
                      key={d + i}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => d === "⌫" ? setPin((p) => p.slice(0, -1)) : addDigit(d)}
                      className="h-16 rounded-2xl text-2xl font-bold"
                      style={{ background: d === "⌫" ? "rgba(239,68,68,0.1)" : "rgba(83,49,208,0.22)", color: d === "⌫" ? "#f87171" : "#FDFDFE", border: "1px solid rgba(155,150,218,0.13)" }}
                    >
                      {d}
                    </motion.button>
                  )
                ))}
              </div>
              <button
                onClick={() => { setShowPin(false); setPin(""); }}
                className="w-full mt-5 py-3 rounded-xl text-base font-semibold"
                style={{ color: "#9B96DA" }}
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


const ACTIONS = [
  {
    id: "ordonnance",
    step: 1,
    label: "Scanner mon ordonnance",
    sub: "Photographiez votre prescription",
    href: "/scanner",
    gradient: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="2" />
        <path d="M18 14v2m0 4v0m-4-3h2m4 0h0" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "mutuelle",
    step: 2,
    label: "Scanner ma carte mutuelle",
    sub: "Photographiez votre carte de tiers payant",
    href: "/client/mutuelle",
    gradient: "linear-gradient(135deg, #2D1B78 0%, #5331D0 100%)",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2" />
        <path d="M2 10h20" stroke="white" strokeWidth="2" />
        <path d="M6 15h4M14 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "questionnaire",
    step: 3,
    label: "Mon questionnaire",
    sub: "Vos besoins visuels et préférences",
    href: "/questionnaire",
    gradient: "linear-gradient(135deg, #1C0B62 0%, #2D1B78 100%)",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <rect x="4" y="2" width="16" height="20" rx="2" stroke="white" strokeWidth="2" />
        <path d="M8 7h8M8 11h8M8 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "montures",
    step: 4,
    label: "Voir nos montures",
    sub: "Explorez notre sélection en stock",
    href: "/client/montures",
    gradient: "linear-gradient(135deg, #0A0338 0%, #1C0B62 100%)",
    border: "1.5px solid rgba(83,49,208,0.45)",
    icon: (
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
        <circle cx="6.5" cy="13" r="3.5" stroke="white" strokeWidth="2" />
        <circle cx="17.5" cy="13" r="3.5" stroke="white" strokeWidth="2" />
        <path d="M10 13h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 13C3 9 5 7 6.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M21 13C21 9 19 7 17.5 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ClientPage() {
  const router = useRouter();
  const [magasinNom, setMagasinNom] = useState("Votre opticien");
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
      if (user.magasinNom) setMagasinNom(user.magasinNom);
    } catch { /* ignore */ }
  }, []);

  function addDigit(d: string) {
    if (pin.length >= 4 || pinError || pinSuccess) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (checkPin(next)) {
          setPinSuccess(true);
          unlockSession();
          setTimeout(() => router.push("/dashboard"), 600);
        } else {
          setPinError(true);
          setTimeout(() => { setPin(""); setPinError(false); }, 900);
        }
      }, 100);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(circle at 15% 20%, rgba(124,58,237,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.28), transparent 45%), linear-gradient(180deg, #f0f0fa 0%, #e8e8f5 100%)" }}>
      {/* Header magasin */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-12 pb-4 px-6"
      >
        <img src="/assets/images/Logo-OptiPilot.png" alt="OptiPilot" className="w-48 mx-auto mb-5" style={{ filter: "drop-shadow(0 0 30px rgba(124,58,237,0.7)) drop-shadow(0 0 60px rgba(124,58,237,0.4))" }} />
        <h1 className="text-3xl font-black" style={{ color: "#111827" }}>{magasinNom}</h1>
        <p className="text-lg mt-1" style={{ color: "#6b7280" }}>Bienvenue chez nous</p>
      </motion.div>

      {/* Bannière workflow */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="mx-6 mb-5 px-5 py-4 rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(83,49,208,0.1) 0%, rgba(236,72,153,0.08) 100%)", border: "1px solid rgba(83,49,208,0.2)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      >
        <p className="text-base font-black" style={{ color: "#111827" }}>Préparez votre dossier en 2 minutes</p>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}
        >Suivez les étapes ci-dessous — votre opticien prend ensuite le relais pour votre prise en charge.</p>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(83,49,208,0.12)", color: "#5331D0" }}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.2"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
            2 min
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(83,49,208,0.12)", color: "#5331D0" }}>100% autonome</span>
        </div>
      </motion.div>

      {/* Actions client */}
      <div className="flex-1 flex flex-col gap-3 px-6 pb-20">
        {ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -2 }}
            onClick={() => router.push(action.href)}
            className="w-full rounded-2xl p-5 flex items-center gap-5 shadow-lg text-left"
            style={{
              background: action.gradient,
              border: action.border ?? "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(6px)",
              transition: "all 0.2s ease",
            }}
          >
            <div className="rounded-xl flex items-center justify-center relative" style={{ width: 52, height: 52, background: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
              {action.icon}
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: "rgba(255,255,255,0.95)", color: "#5331D0", lineHeight: 1 }}
              >
                {action.step}
              </span>
            </div>
            <div>
              <p className="text-white text-lg font-bold leading-tight">{action.label}</p>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{action.sub}</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(255,255,255,0.4)", marginLeft: "auto", flexShrink: 0 }}>
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        ))}
      </div>

      {/* Bouton retour opticien — discret, coin bas-droit */}
      <button
        onClick={() => { setShowPin(true); setPin(""); setPinError(false); setPinSuccess(false); }}
        className="fixed bottom-6 right-6 flex items-center justify-center transition-opacity"
        style={{
          width: 52, height: 52,
          background: "#f3f4f6",
          color: "rgba(107,114,128,0.6)",
          border: "1px solid #e5e7eb",
          borderRadius: "50%",
        }}
        aria-label="Mode opticien"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Modal PIN */}
      <AnimatePresence>
        {showPin && (
          <motion.div
            key="pin-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(2,0,23,0.92)", backdropFilter: "blur(16px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) { setShowPin(false); setPin(""); } }}
          >
            <motion.div
              key="pin-card"
              initial={{ scale: 0.88, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 24 }}
              className="rounded-3xl p-8 w-full mx-6"
              style={{
                maxWidth: 340,
                background: "rgba(8,2,40,0.99)",
                border: "1.5px solid rgba(83,49,208,0.5)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-xl font-bold mb-2" style={{ color: "#FDFDFE" }}>
                Retour opticien
              </p>
              <p className="text-center text-sm mb-7" style={{ color: "#9B96DA" }}>
                Entrez votre code à 4 chiffres
              </p>

              {/* Indicateurs */}
              <div className="flex justify-center gap-5 mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      background: pinSuccess
                        ? "#22c55e"
                        : pinError
                          ? "#ef4444"
                          : pin.length > i
                            ? "#5331D0"
                            : "rgba(155,150,218,0.25)",
                      scale: pinError ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: 0.15 }}
                    className="w-5 h-5 rounded-full"
                  />
                ))}
              </div>

              {/* Pavé numérique */}
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) => (
                  d === "" ? (
                    <div key={i} />
                  ) : (
                    <motion.button
                      key={d + i}
                      whileTap={{ scale: 0.9 }}
                      onClick={() =>
                        d === "⌫"
                          ? setPin((p) => p.slice(0, -1))
                          : addDigit(d)
                      }
                      className="h-16 rounded-2xl text-2xl font-bold"
                      style={{
                        background:
                          d === "⌫"
                            ? "rgba(239,68,68,0.1)"
                            : "rgba(83,49,208,0.22)",
                        color: d === "⌫" ? "#f87171" : "#FDFDFE",
                        border: "1px solid rgba(155,150,218,0.13)",
                      }}
                    >
                      {d}
                    </motion.button>
                  )
                ))}
              </div>

              <button
                onClick={() => { setShowPin(false); setPin(""); }}
                className="w-full mt-5 py-3 rounded-xl text-base font-semibold"
                style={{ color: "#9B96DA" }}
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
