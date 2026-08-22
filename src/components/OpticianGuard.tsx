"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isSessionLocked, checkPin, unlockSession } from "@/lib/opticianAuth";

interface Props {
  children: React.ReactNode;
}

/**
 * Protège toutes les pages opticien.
 * Si la session est verrouillée (après "Passer la tablette au client"),
 * affiche un écran de saisie du code PIN avant d'afficher le contenu.
 */
export default function OpticianGuard({ children }: Props) {
  const [locked, setLocked] = useState<boolean | null>(null); // null = loading
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    setLocked(isSessionLocked());
  }, []);

  const addDigit = useCallback(
    (d: string) => {
      if (pin.length >= 4 || pinError || pinSuccess) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => {
          if (checkPin(next)) {
            setPinSuccess(true);
            unlockSession();
            setTimeout(() => setLocked(false), 500);
          } else {
            setPinError(true);
            setTimeout(() => {
              setPin("");
              setPinError(false);
            }, 900);
          }
        }, 120);
      }
    },
    [pin, pinError, pinSuccess]
  );

  // Clavier physique
  useEffect(() => {
    if (!locked) return;
    function onKey(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) addDigit(e.key);
      if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, addDigit]);

  // Encore en train de vérifier
  if (locked === null) return null;

  // Déverrouillé : accès normal
  if (!locked) return <>{children}</>;

  // Verrouillé : écran PIN
  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #020017 0%, #0e0640 60%, #1c0b62 100%)" }}
    >
      <AnimatePresence>
        <motion.div
          key="guard-card"
          initial={{ opacity: 0, scale: 0.88, y: 32 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full mx-6 rounded-3xl p-8 flex flex-col items-center"
          style={{
            maxWidth: 340,
            background: "rgba(8,2,40,0.98)",
            border: "1.5px solid rgba(83,49,208,0.55)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.75)",
          }}
        >
          {/* Icône cadenas */}
          <div
            className="mb-5 flex items-center justify-center rounded-2xl"
            style={{ width: 64, height: 64, background: "rgba(83,49,208,0.22)", border: "1.5px solid rgba(124,58,237,0.4)" }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="#a78bfa" strokeWidth="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.4" fill="#c084fc" />
            </svg>
          </div>

          <p className="text-2xl font-black mb-1 text-center" style={{ color: "#FDFDFE" }}>
            Espace opticien
          </p>
          <p className="text-sm text-center mb-8" style={{ color: "#9B96DA" }}>
            Entrez votre code à 4 chiffres
          </p>

          {/* Points indicateurs */}
          <div className="flex justify-center gap-5 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  background: pinSuccess
                    ? "#a855f7"
                    : pinError
                    ? "#ef4444"
                    : pin.length > i
                    ? "#5331D0"
                    : "rgba(155,150,218,0.22)",
                  scale: pinError ? [1, 1.25, 1] : pinSuccess && pin.length > i ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.18 }}
                className="w-5 h-5 rounded-full"
              />
            ))}
          </div>

          {/* Pavé numérique */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
              d === "" ? (
                <div key={i} />
              ) : (
                <motion.button
                  key={d + i}
                  whileTap={{ scale: 0.88 }}
                  onClick={() =>
                    d === "⌫" ? setPin((p) => p.slice(0, -1)) : addDigit(d)
                  }
                  className="h-16 rounded-2xl text-2xl font-bold select-none"
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
            )}
          </div>

          {pinError && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 text-sm text-center"
              style={{ color: "#f87171" }}
            >
              Code incorrect — réessayez
            </motion.p>
          )}
          {!pinError && (
            <p className="mt-5 text-xs text-center" style={{ color: "rgba(155,150,218,0.45)" }}>
              Code par défaut : 1234 · Modifiable dans Configuration
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
