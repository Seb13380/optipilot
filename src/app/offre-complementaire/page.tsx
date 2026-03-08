"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

interface OffreCompl {
  id: string;
  titre: string;
  description: string;
  prix: number;
  icon: string;
  gradient: string;
  avantages: string[];
  badge?: string;
}

const OFFRES_COMPLEMENTAIRES: OffreCompl[] = [
  {
    id: "solaire",
    titre: "Seconde Paire Solaire",
    description: "avec Verres Polarisés",
    prix: 59,
    icon: "😎",
    gradient: "linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)",
    avantages: [
      "Verres polarisés haute définition",
      "Protection UV 400 catégorie 3",
      "Monture solaire de votre choix",
      "Votre correction intégrée",
    ],
    badge: "Proposition Spéciale",
  },
  {
    id: "ecran",
    titre: "Lunettes Écran",
    description: "Protection lumière bleue",
    prix: 39,
    icon: "💻",
    gradient: "linear-gradient(135deg, #166534 0%, #22c55e 100%)",
    avantages: [
      "Filtre lumière bleue anti-fatigue",
      "Optimisée distance écran 60cm",
      "Monture légère rembourrée",
      "Idéale télétravail + gaming",
    ],
    badge: "Top vente",
  },
  {
    id: "sport",
    titre: "Lunettes Sport",
    description: "Masque correcteur",
    prix: 79,
    icon: "🏊",
    gradient: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
    avantages: [
      "Résistante aux chocs (norme EN 166)",
      "Courbure enveloppante",
      "Anti-buée intégré",
      "Adaptée running, vélo, water-sport",
    ],
  },
  {
    id: "entretien",
    titre: "Kit Entretien Premium",
    description: "Étui rigide + nettoyant",
    prix: 19,
    icon: "🧴",
    gradient: "linear-gradient(135deg, #9a3412 0%, #f97316 100%)",
    avantages: [
      "Étui rigide protection maximale",
      "Spray nettoyant 60ml anti-grippe",
      "Chiffon microfibre Japan",
      "Chaînette anti-perte offerte",
    ],
  },
];

export default function OffreComplementairePage() {
  const router = useRouter();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  function toggleOffre(id: string) {
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalAjouts = OFFRES_COMPLEMENTAIRES.filter((o) => added.has(o.id)).reduce(
    (sum, o) => sum + o.prix,
    0
  );

  function valider() {
    const offresAjoutees = OFFRES_COMPLEMENTAIRES.filter((o) => added.has(o.id));
    localStorage.setItem("optipilot_offres_complementaires", JSON.stringify(offresAjoutees));
    setShowConfirm(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#020017" }}>
      <OptiPilotHeader
        title="Offre Complémentaire"
        showBack
        onBack={() => router.back()}
      />

      <main className="flex-1 px-6 pb-32 pt-5 w-full">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-base mb-5"
          style={{ color: "#9B96DA" }}
        >
          Complétez votre équipement avec nos offres exclusives
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OFFRES_COMPLEMENTAIRES.map((offre, i) => {
            const isAdded = added.has(offre.id);
            return (
              <motion.div
                key={offre.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl overflow-hidden shadow-sm"
                style={{
                  border: isAdded ? "2px solid #22c55e" : "2px solid rgba(83,49,208,0.35)",
                  background: "#0A0338",
                }}
              >
                {/* Header coloré */}
                <div
                  className="p-4 flex items-center justify-between"
                  style={{ background: offre.gradient }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{offre.icon}</span>
                    <div>
                      {offre.badge && (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-sm font-bold text-white mb-1"
                          style={{ background: "rgba(255,255,255,0.25)" }}
                        >
                          {offre.badge}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-white">{offre.titre}</h3>
                      <p className="text-white opacity-80 text-base">{offre.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white opacity-70 text-xs">seulement</p>
                    <p className="text-white text-2xl font-black">+{offre.prix}€</p>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-1.5 mb-4">
                    {offre.avantages.map((av, j) => (
                      <p key={j} className="text-base flex items-start gap-1.5" style={{ color: "#FDFDFE" }}>
                        <span className="text-green-500 flex-shrink-0">✓</span>
                        {av}
                      </p>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleOffre(offre.id)}
                      className="flex-[2] py-3.5 rounded-xl font-semibold text-sm transition-all"
                      style={
                        isAdded
                          ? {
                              background: "rgba(34,197,94,0.12)",
                              color: "#22c55e",
                              border: "2px solid #22c55e",
                            }
                          : {
                              background: offre.gradient,
                              color: "#0A0338",
                            }
                      }
                    >
                      {isAdded ? "✓ Ajouté au devis" : "Ajouter au Devis"}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!isAdded) router.back();
                      }}
                      className="flex-1 py-3.5 rounded-xl font-medium text-base"
                      style={{ background: "rgba(10,3,56,0.8)", color: "rgba(155,150,218,0.6)" }}
                    >
                      Ignorer
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Barre de validation fixe */}
      <AnimatePresence>
        {showConfirm ? (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 p-5"
            style={{ background: "rgba(34,197,94,0.12)", borderTop: "2px solid #22c55e" }}
          >
            <p className="text-center font-semibold text-green-700 text-lg">
              ✓ Ajouté au devis ! Finalisation...
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 p-5"
            style={{ background: "#0A0338", borderTop: "1px solid rgba(83,49,208,0.35)", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
          >
            {added.size > 0 && (
              <p className="text-center text-sm mb-3" style={{ color: "#9B96DA" }}>
                {added.size} offre{added.size > 1 ? "s" : ""} ajoutée{added.size > 1 ? "s" : ""} — +{totalAjouts}€
              </p>
            )}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.back()}
                className="flex-1 py-4 rounded-2xl font-medium"
                style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA" }}
              >
                Passer
              </motion.button>
              {added.size > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={valider}
                  className="flex-[2] py-4 rounded-2xl text-white font-semibold"
                  style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}
                >
                  Valider +{totalAjouts}€ →
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
