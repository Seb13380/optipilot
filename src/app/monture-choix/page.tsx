"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function MonturChoixPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    try {
      const client = JSON.parse(localStorage.getItem("optipilot_client") || "{}");
      if (client.prenom) setPrenom(client.prenom);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="page-bg min-h-screen flex flex-col items-center justify-between px-6 pt-10 pb-10">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex justify-center mb-2"
      >
        <img
          src="/assets/images/Logo-OptiPilot.png"
          alt="OptiPilot"
          className="h-12 w-auto object-contain"
          style={{ filter: "drop-shadow(0 0 16px rgba(124,58,237,0.5))" }}
        />
      </motion.div>

      {/* Contenu */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center gap-8 w-full max-w-md"
      >
        {/* Icône monture */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: "rgba(83,49,208,0.2)", border: "1.5px solid rgba(83,49,208,0.35)" }}
        >
          <svg width="52" height="52" fill="none" viewBox="0 0 80 40">
            <rect x="2" y="8" width="28" height="24" rx="12" stroke="#9B96DA" strokeWidth="3" fill="none"/>
            <rect x="50" y="8" width="28" height="24" rx="12" stroke="#9B96DA" strokeWidth="3" fill="none"/>
            <path d="M30 20 L50 20" stroke="#9B96DA" strokeWidth="3" strokeLinecap="round"/>
            <path d="M2 20 L0 16" stroke="#9B96DA" strokeWidth="3" strokeLinecap="round"/>
            <path d="M78 20 L80 16" stroke="#9B96DA" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#FDFDFE" }}>
            {prenom ? `${prenom}, avez-vous` : "Avez-vous"}
          </h1>
          <h2 className="text-3xl font-black mb-4" style={{ color: "#9B96DA" }}>
            déjà choisi votre monture&nbsp;?
          </h2>
          <p className="text-base" style={{ color: "rgba(155,150,218,0.7)" }}>
            Si vous avez une monture en tête, nous préparerons votre devis directement.
          </p>
        </div>

        {/* Choix */}
        <div className="flex flex-col gap-4 w-full">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/recommandations")}
            className="w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-3"
            style={{
              background: "linear-gradient(135deg, #5331D0, #9B96DA)",
              boxShadow: "0 6px 24px rgba(83,49,208,0.45)",
              color: "#fff",
            }}
          >
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Oui, j&apos;ai ma monture
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/analyse-visage")}
            className="w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center gap-3"
            style={{
              background: "rgba(10,3,56,0.8)",
              border: "2px solid rgba(83,49,208,0.45)",
              color: "#9B96DA",
            }}
          >
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Non, conseillez-moi
          </motion.button>
        </div>

        <p className="text-center text-sm" style={{ color: "rgba(155,150,218,0.5)" }}>
          Si vous souhaitez un conseil, nous analyserons la forme de votre visage pour vous recommander les montures les plus adaptées.
        </p>
      </motion.div>

      {/* Spacer */}
      <div />
    </div>
  );
}
