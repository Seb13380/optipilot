"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { checkPin, unlockSession } from "@/lib/opticianAuth";

const FLOW_KEY = "optipilot_flow_step";

const STEPS = [
  {
    id: "ordonnance",
    num: 1,
    instruction: "Veuillez scanner votre ordonnance",
    sub: "Photographiez votre prescription médicale",
    href: "/scanner",
    gradient: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)",
    glow: "rgba(124,58,237,0.45)",
    icon: (
      <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
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
    instruction: "Veuillez scanner votre carte mutuelle",
    sub: "Photographiez votre carte de tiers payant",
    href: "/client/mutuelle",
    gradient: "linear-gradient(135deg, #2D1B78 0%, #5331D0 100%)",
    glow: "rgba(83,49,208,0.45)",
    icon: (
      <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="2" />
        <path d="M2 10h20" stroke="white" strokeWidth="2" />
        <path d="M6 15h4M14 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "questionnaire",
    num: 3,
    instruction: "Veuillez répondre à quelques questions",
    sub: "Vos besoins visuels et préférences",
    href: "/questionnaire",
    gradient: "linear-gradient(135deg, #1C0B62 0%, #2D1B78 100%)",
    glow: "rgba(45,27,120,0.45)",
    icon: (
      <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
        <rect x="4" y="2" width="16" height="20" rx="2" stroke="white" strokeWidth="2" />
        <path d="M8 7h8M8 11h8M8 15h5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ClientPage() {
  const router = useRouter();
  const [magasinNom, setMagasinNom] = useState("Votre opticien");
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
      if (user.magasinNom) setMagasinNom(user.magasinNom);
    } catch { /* ignore */ }
    const saved = parseInt(localStorage.getItem(FLOW_KEY) || "0", 10);
    setCurrentStep(!isNaN(saved) && saved >= 0 && saved < STEPS.length ? saved : 0);
  }, []);

  function handleStepClick() {
    if (currentStep === null) return;
    const next = currentStep + 1;
    localStorage.setItem(FLOW_KEY, String(next));
    router.push(STEPS[currentStep].href);
  }

  function addDigit(d: string) {
    if (pin.length >= 4 || pinError || pinSuccess) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (checkPin(next)) {
          setPinSuccess(true);
          unlockSession();
          localStorage.removeItem(FLOW_KEY);
          setTimeout(() => router.push("/dashboard"), 600);
        } else {
          setPinError(true);
          setTimeout(() => { setPin(""); setPinError(false); }, 900);
        }
      }, 100);
    }
  }

  if (currentStep === null) return null;

  const step = STEPS[currentStep];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(circle at 15% 20%, rgba(124,58,237,0.35), transparent 45%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.28), transparent 45%), linear-gradient(180deg, #f0f0fa 0%, #e8e8f5 100%)" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-10 pb-4 px-6"
      >
        <img src="/assets/images/Logo-OptiPilot.png" alt="OptiPilot" className="w-36 mx-auto mb-3" style={{ filter: "drop-shadow(0 0 30px rgba(124,58,237,0.7))" }} />
        <h1 className="text-xl font-black" style={{ color: "#111827" }}>{magasinNom}</h1>
        <p className="text-sm mt-0.5 font-medium" style={{ color: "#5331D0" }}>Bonjour, bienvenue !</p>
      </motion.div>

      {/* Dots de progression */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex justify-center items-center gap-2 mb-6"
      >
        {STEPS.map((s, i) => (
          <motion.div
            key={s.id}
            animate={{
              width: i === currentStep ? 28 : 8,
              background: i < currentStep ? "#22c55e" : i === currentStep ? "#5331D0" : "rgba(83,49,208,0.22)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ height: 8, borderRadius: 99 }}
          />
        ))}
      </motion.div>

      {/* Carte étape courante */}
      <div className="flex-1 flex flex-col justify-center px-5 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleStepClick}
              className="w-full rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl"
              style={{
                background: step.gradient,
                border: "1px solid rgba(255,255,255,0.13)",
                boxShadow: `0 20px 60px ${step.glow}`,
              }}
            >
              {/* Icône */}
              <div
                className="rounded-2xl flex items-center justify-center mb-6 relative"
                style={{ width: 88, height: 88, background: "rgba(0,0,0,0.22)" }}
              >
                {step.icon}
                <span
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: "rgba(255,255,255,0.95)", color: "#5331D0" }}
                >
                  {step.num}
                </span>
              </div>

              {/* Texte */}
              <p className="text-white font-black leading-snug mb-2" style={{ fontSize: 22 }}>
                {step.instruction}
              </p>
              <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>{step.sub}</p>

              {/* Bouton visuel */}
              <div
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.18)" }}
              >
                <span className="text-white font-bold text-sm">Commencer</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </motion.button>
          </motion.div>
        </AnimatePresence>

        {/* Étapes complétées */}
        {currentStep > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm mt-5"
            style={{ color: "#9ca3af" }}
          >
            {currentStep} étape{currentStep > 1 ? "s" : ""} complétée{currentStep > 1 ? "s" : ""} sur {STEPS.length}
          </motion.p>
        )}
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
