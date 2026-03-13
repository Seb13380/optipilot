"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import type { OffreVerre, RecommandationResult } from "@/lib/recommandation";
import { calculerRecommandations, getCategorieCorrection } from "@/lib/recommandation";

// Correspondance réseau opticien → réseau mutuelle (doit rester coté opticien — jamais exposé au client)
const RESEAU_MUTUELLE_MAP: Record<string, string[]> = {
  "kalivia":           ["Harmonie Mutuelle", "Amphivia", "Mutuelle UMC"],
  "itelis":            ["Malakoff Humanis", "Agirc-Arrco"],
  "santeclair":        ["Generali", "April", "MAAF", "GMF"],
  "carte-blanche":     ["Groupama", "Pacifica"],
  "mgen-agree":        ["MGEN"],
  "ag2r-agree":        ["AG2R"],
  "mutualite-fr":      ["MAIF", "MACIF", "Mutuelle de France"],
  "sante-clair-plus":  ["Covéa", "MAAF Santé"],
};

function estDansReseau(nomMutuelle: string): boolean {
  const reseauxPartenaires: string[] = JSON.parse(localStorage.getItem("optipilot_reseaux_partenaires") || "[]");
  return reseauxPartenaires.some((rid) =>
    (RESEAU_MUTUELLE_MAP[rid] || []).some((m) => m.toLowerCase() === nomMutuelle.toLowerCase())
  );
}

export default function RecommandationsPage() {
  const router = useRouter();
  const [result, setResult] = useState<RecommandationResult | null>(null);
  const [selected, setSelected] = useState<"Essentiel" | "Confort" | "Premium" | null>("Confort");
  const [loading, setLoading] = useState(true);
  const [magasinNom, setMagasinNom] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
    if (user.magasinNom) setMagasinNom(user.magasinNom);
  }, []);

  useEffect(() => {
    async function load() {
      const ordoRaw = localStorage.getItem("optipilot_ordonnance");
      const questRaw = localStorage.getItem("optipilot_questionnaire");
      const clientRaw = localStorage.getItem("optipilot_client");

      const ordo = ordoRaw ? JSON.parse(ordoRaw) : {};
      const quest = questRaw ? JSON.parse(questRaw) : {};
      const client = clientRaw ? JSON.parse(clientRaw) : {};

      // Conversion string → number pour l'ordonnance
      const ordonnance = {
        odSphere: parseFloat(ordo.odSphere) || 0,
        ogSphere: parseFloat(ordo.ogSphere) || 0,
        odCylindre: parseFloat(ordo.odCylindre) || 0,
        ogCylindre: parseFloat(ordo.ogCylindre) || 0,
        odAddition: parseFloat(ordo.odAddition) || 0,
        ogAddition: parseFloat(ordo.ogAddition) || 0,
      };

      // Catégorie de correction pour choisir le bon tarif SS et mutuelle
      const categorie = getCategorieCorrection(ordonnance);

      // Remboursement mutuelle : essayer depuis la BDD, sinon valeurs par defaut
      let remboursementMutuelle = { unifocal: 70, progressif: 120 };
      try {
        const nomMutuelle = client.mutuelle || quest.mutuelle;
        const niveau = client.niveauGarantie || quest.niveauGarantie;
        if (nomMutuelle && niveau) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/mutuelles/${encodeURIComponent(nomMutuelle)}/${encodeURIComponent(niveau)}`
          );
          if (res.ok) {
            const data = await res.json();
            // Utiliser tarifsDetail si disponible pour une précision par catégorie de correction
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const td = data.tarifsDetail as any;
            if (td?.parVerre && td.horsReseau) {
              const dansReseau = data.reseau ? estDansReseau(nomMutuelle) : false;
              const r = dansReseau ? td.dansReseau : td.horsReseau;
              remboursementMutuelle = {
                unifocal: categorie.isForteCorrectionUnifocal
                  ? r.unifocalForte * 2
                  : r.unifocalFaible * 2,
                progressif: categorie.isForteCorrectionProgressif
                  ? r.progressifForte * 2
                  : r.progressifFaible * 2,
              };
            } else {
              remboursementMutuelle = {
                unifocal: Number(data.remboursementUnifocal) || 70,
                progressif: Number(data.remboursementProgressif) || 120,
              };
            }
          }
        }
      } catch {
        // Fallback sur valeurs par défaut
      }

      const rec = calculerRecommandations(ordonnance, quest, remboursementMutuelle);
      setResult(rec);
      setLoading(false);
    }
    load();
  }, []);

  async function handleChoix(offre: OffreVerre) {
    localStorage.setItem("optipilot_offre_selectionnee", JSON.stringify(offre));
    localStorage.setItem("optipilot_offre_nom", offre.nom);

    // Sauvegarder le devis en BDD
    try {
      const client = JSON.parse(localStorage.getItem("optipilot_client") || "{}");
      const ordonnance = JSON.parse(localStorage.getItem("optipilot_ordonnance_db") || "{}");
      const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");

      if (client.id && user.magasinId && result) {
        const offres = result.offres;
        const essentiel = offres.find((o) => o.nom === "Essentiel");
        const confort = offres.find((o) => o.nom === "Confort");
        const premium = offres.find((o) => o.nom === "Premium");

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devis`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("optipilot_token") || ""}`,
          },
          body: JSON.stringify({
            clientId: client.id,
            magasinId: user.magasinId,
            ordonnanceId: ordonnance.id || null,
            statut: "en_cours",
            offreChoisie: offre.nom,
            totalEssentiel: essentiel?.prixVerres ?? null,
            racEssentiel: essentiel?.resteACharge ?? null,
            totalConfort: confort?.prixVerres ?? null,
            racConfort: confort?.resteACharge ?? null,
            totalPremium: premium?.prixVerres ?? null,
            racPremium: premium?.resteACharge ?? null,
          }),
        });
        const devis = await res.json();
        if (res.ok) {
          localStorage.setItem("optipilot_devis_id", devis.id);
        }
      }
    } catch {
      // Continue vers devis sans sauvegarde BDD
    }

    router.push("/devis");
  }

  const COULEURS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
    Essentiel: { bg: "#071a0e", border: "#22c55e", badge: "#22c55e", text: "#22c55e" },
    Confort:   { bg: "#0e0b2c", border: "#7c5fec", badge: "#5331D0", text: "#a89cf7" },
    Premium:   { bg: "#0e0b2c", border: "#9c5ff7", badge: "#5331D0", text: "#c084fc" },
  };

  return (
    <div className="page-bg min-h-screen flex flex-col">
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
            {/* Phrase dynamique OptiPilot IA */}
            {(() => {
              const offreRecommandee = result.offres.find((o) => o.badge);
              return offreRecommandee ? (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-4 rounded-2xl flex items-center gap-4"
                  style={{ background: "rgba(83,49,208,0.18)", border: "1.5px solid rgba(124,95,236,0.45)" }}
                >
                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(124,95,236,0.4)" }}>
                    <Image src="/assets/images/IA_Optipilot.png" alt="OptiPilot IA" width={56} height={56} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-base font-semibold leading-snug" style={{ color: "#a89cf7" }}>
                    OptiPilot estime que l&apos;offre{" "}
                    <span className="font-black" style={{ color: "#FDFDFE" }}>{offreRecommandee.nom}</span>{" "}
                    vous apportera le meilleur rapport qualité / prix pour votre profil.
                  </p>
                </motion.div>
              ) : null;
            })()}

            {/* Conseil personnalisé */}
            {result.argumentaireGlobal && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-5 rounded-2xl"
                style={{ background: "rgba(83,49,208,0.15)", border: "1px solid rgba(155,150,218,0.4)" }}
              >                
                <p className="text-xl font-semibold" style={{ color: "#9B96DA" }}>
                  {result.argumentaireGlobal}
                </p>
                <p className="text-base mt-2 font-medium" style={{ color: "rgba(155,150,218,0.7)" }}>
                  Demandez à votre opticien{magasinNom ? <> <span className="font-bold" style={{ color: "#a89cf7" }}>{magasinNom}</span></> : ""} pour plus d’informations.
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
                      boxShadow: isSelected ? `0 6px 32px ${couleur.border}55` : "0 2px 8px rgba(0,0,0,0.05)",
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
                        className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: `${couleur.border}20`, border: `1px solid ${couleur.border}40` }}
                      >
                        <span className="text-2xl font-black tracking-tight" style={{ color: couleur.text }}>
                          {{ Essentiel: "ESS", Confort: "CFT", Premium: "PRE" }[offre.nom]}
                        </span>
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
                          {offre.remboursementSecu + offre.remboursementMutuelle}€
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

            {/* ─── Seconde paire sport ─── */}
            {result.secondePaire && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6 rounded-2xl p-6"
                style={{ background: "rgba(10,3,56,0.75)", border: "1.5px solid rgba(236,72,153,0.4)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.4)" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="#f472b6" strokeWidth="2"/>
                      <path d="M2 12h2M20 12h2M12 2v2M12 20v2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41" stroke="#f472b6" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: "#f472b6" }}>
                      Équipement complémentaire recommandé
                    </p>
                    <p className="text-lg font-black" style={{ color: "#FDFDFE" }}>
                      {result.secondePaire.titre}
                    </p>
                  </div>
                </div>
                <p className="text-base leading-relaxed mb-4" style={{ color: "#9B96DA" }}>
                  {result.secondePaire.description}
                </p>
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.25)" }}
                >
                  <p className="text-sm font-bold mb-1" style={{ color: "#f472b6" }}>Conseil opticien</p>
                  <p className="text-base" style={{ color: "#FDFDFE" }}>
                    {result.secondePaire.conseil}
                  </p>
                </div>
              </motion.div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
