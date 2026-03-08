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
    Essentiel: { bg: "rgba(34,197,94,0.12)", border: "#22c55e", badge: "#22c55e", text: "#22c55e" },
    Confort: { bg: "rgba(83,49,208,0.15)", border: "#5331D0", badge: "#5331D0", text: "#5331D0" },
    Premium: { bg: "rgba(83,49,208,0.15)", border: "#5331D0", badge: "#5331D0", text: "#5331D0" },
  };

  const GLASSES_ICONS: Record<string, string> = {
    Essentiel: "🕶️",
    Confort: "👓",
    Premium: "✨",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#020017" }}>
      <OptiPilotHeader
        title="Recommandations OptiPilot"
        showBack
        onBack={() => router.push("/questionnaire")}
      />

      <main className="flex-1 px-6 pb-8 pt-5 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}
            >
              <svg className="animate-spin" width="44" height="44" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
              </svg>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#FDFDFE" }}>
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
                className="mb-6 p-5 rounded-2xl"
                style={{ background: "rgba(83,49,208,0.15)", border: "1px solid rgba(155,150,218,0.4)" }}
              >
                <p className="text-xl font-semibold" style={{ color: "#9B96DA" }}>
                  🤖 {result.argumentaireGlobal}
                </p>
              </motion.div>
            )}

            {/* Cartes des 3 offres */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    className="rounded-3xl p-7 cursor-pointer transition-all relative overflow-hidden"
                    style={{
                      background: isSelected ? couleur.bg : "#0A0338",
                      border: `2px solid ${isSelected ? couleur.border : "rgba(83,49,208,0.35)"}`,
                      boxShadow: isSelected ? `0 4px 24px ${couleur.border}25` : "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Badge recommandé */}
                    {offre.badge && (
                      <span
                        className="absolute top-5 right-5 px-3.5 py-1.5 rounded-full text-base font-bold text-white"
                        style={{ background: couleur.badge }}
                      >
                        ★ {offre.badge}
                      </span>
                    )}

                    {/* En-tête */}
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                        style={{ background: `${couleur.border}15` }}
                      >
                        {GLASSES_ICONS[offre.nom]}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-black" style={{ color: couleur.text }}>
                          {offre.nom}
                        </h3>
                        <p className="text-lg" style={{ color: "#9B96DA" }}>
                          {offre.verrier} — {offre.gamme}
                        </p>
                        <p className="text-base mt-0.5" style={{ color: "rgba(155,150,218,0.6)" }}>
                          Indice {offre.indice} • Classe {offre.classe100ps}
                        </p>
                      </div>
                    </div>

                    {/* Argumentaire */}
                    <div className="grid grid-cols-1 gap-1.5 mb-5">
                      {offre.argumentaire.map((arg, j) => (
                        <p key={j} className="text-lg" style={{ color: couleur.text }}>
                          {arg}
                        </p>
                      ))}
                    </div>

                    {/* Prix */}
                    <div
                      className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background: `${couleur.border}10` }}
                    >
                      <div>
                        <p className="text-base" style={{ color: "rgba(155,150,218,0.6)" }}>
                          Prix verres
                        </p>
                        <p className="text-xl font-bold" style={{ color: "#FDFDFE" }}>
                          {offre.prixVerres}€
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-base" style={{ color: "rgba(155,150,218,0.6)" }}>
                          Remboursement
                        </p>
                        <p className="text-xl font-bold text-green-400">
                          -{offre.remboursementSecu + offre.remboursementMutuelle}€
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base" style={{ color: "rgba(155,150,218,0.6)" }}>
                          Reste à charge
                        </p>
                        <p className="text-3xl font-black" style={{ color: couleur.text }}>
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
                          className="w-full py-5 rounded-2xl text-white font-bold text-xl mt-4"
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
