"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import type { OffreVerre, RecommandationResult } from "@/lib/recommandation";
import { calculerRecommandations } from "@/lib/recommandation";

export default function RecommandationsPage() {
  const router = useRouter();
  const [result, setResult] = useState<RecommandationResult | null>(null);
  const [selected, setSelected] = useState<"Essentiel" | "Confort" | "Premium" | null>("Confort");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ordoRaw = localStorage.getItem("optipilot_ordonnance");
    const questRaw = localStorage.getItem("optipilot_questionnaire");

    const ordo = ordoRaw ? JSON.parse(ordoRaw) : {};
    const quest = questRaw ? JSON.parse(questRaw) : {};

    // Conversion string → number pour l'ordonnance
    const ordonnance = {
      odSphere: parseFloat(ordo.odSphere) || 0,
      ogSphere: parseFloat(ordo.ogSphere) || 0,
      odCylindre: parseFloat(ordo.odCylindre) || 0,
      ogCylindre: parseFloat(ordo.ogCylindre) || 0,
      odAddition: parseFloat(ordo.odAddition) || 0,
      ogAddition: parseFloat(ordo.ogAddition) || 0,
    };

    const remboursementMutuelle = {
      unifocal: quest.niveauGarantie === "premium" ? 150 : quest.niveauGarantie === "confort" ? 100 : 70,
      progressif: quest.niveauGarantie === "premium" ? 300 : quest.niveauGarantie === "confort" ? 200 : 120,
    };

    const rec = calculerRecommandations(ordonnance, quest, remboursementMutuelle);
    setResult(rec);
    setLoading(false);
  }, []);

  function handleChoix(offre: OffreVerre) {
    localStorage.setItem("optipilot_offre_selectionnee", JSON.stringify(offre));
    localStorage.setItem("optipilot_offre_nom", offre.nom);
    router.push("/devis");
  }

  const COULEURS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
    Essentiel: { bg: "#f0fdf4", border: "#22c55e", badge: "#22c55e", text: "#15803d" },
    Confort: { bg: "#eff6ff", border: "#1e3a8a", badge: "#1e3a8a", text: "#1e3a8a" },
    Premium: { bg: "#faf5ff", border: "#7e22ce", badge: "#7e22ce", text: "#7e22ce" },
  };

  const GLASSES_ICONS: Record<string, string> = {
    Essentiel: "🕶️",
    Confort: "👓",
    Premium: "✨",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <OptiPilotHeader
        title="Recommandations OptiPilot"
        showBack
        onBack={() => router.push("/questionnaire")}
      />

      <main className="flex-1 px-6 pb-8 pt-5 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-5 py-20">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)" }}
            >
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            </div>
            <p className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
              Calcul des recommandations...
            </p>
          </div>
        ) : result ? (
          <>
            {/* Type de verre recommandé */}
            {result.argumentaireGlobal && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 rounded-2xl"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
              >
                <p className="text-sm font-medium" style={{ color: "#1e40af" }}>
                  🤖 {result.argumentaireGlobal}
                </p>
              </motion.div>
            )}

            {/* Cartes des 3 offres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {result.offres.map((offre, i) => {
                const couleur = COULEURS[offre.nom];
                const isSelected = selected === offre.nom;

                return (
                  <motion.div
                    key={offre.nom}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.12 }}
                    onClick={() => setSelected(offre.nom)}
                    className="rounded-2xl p-5 cursor-pointer transition-all relative overflow-hidden"
                    style={{
                      background: isSelected ? couleur.bg : "white",
                      border: `2px solid ${isSelected ? couleur.border : "#e5e7eb"}`,
                      boxShadow: isSelected ? `0 4px 24px ${couleur.border}25` : "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Badge recommandé */}
                    {offre.badge && (
                      <span
                        className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: couleur.badge }}
                      >
                        ★ {offre.badge}
                      </span>
                    )}

                    {/* En-tête */}
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: `${couleur.border}15` }}
                      >
                        {GLASSES_ICONS[offre.nom]}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold" style={{ color: couleur.text }}>
                          {offre.nom}
                        </h3>
                        <p className="text-sm" style={{ color: "#6b7280" }}>
                          {offre.verrier} — {offre.gamme}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                          Indice {offre.indice} • Classe {offre.classe100ps}
                        </p>
                      </div>
                    </div>

                    {/* Argumentaire */}
                    <div className="grid grid-cols-1 gap-1 mb-4">
                      {offre.argumentaire.map((arg, j) => (
                        <p key={j} className="text-xs" style={{ color: couleur.text }}>
                          {arg}
                        </p>
                      ))}
                    </div>

                    {/* Prix */}
                    <div
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: `${couleur.border}10` }}
                    >
                      <div>
                        <p className="text-xs" style={{ color: "#9ca3af" }}>
                          Prix verres
                        </p>
                        <p className="font-bold" style={{ color: "#374151" }}>
                          {offre.prixVerres}€
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs" style={{ color: "#9ca3af" }}>
                          Remboursement
                        </p>
                        <p className="font-bold text-green-600">
                          -{offre.remboursementSecu + offre.remboursementMutuelle}€
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: "#9ca3af" }}>
                          Reste à charge
                        </p>
                        <p className="text-2xl font-black" style={{ color: couleur.text }}>
                          {Math.round(offre.resteACharge)}€
                        </p>
                      </div>
                    </div>

                    {/* Bouton choisir */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.button
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChoix(offre);
                          }}
                          className="w-full py-4 rounded-xl text-white font-semibold mt-3"
                          style={{ background: `linear-gradient(135deg, ${couleur.border}, ${couleur.badge})` }}
                        >
                          Choisir cette offre →
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
