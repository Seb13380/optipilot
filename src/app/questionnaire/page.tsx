"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface QuestionnaireData {
  tempsEcran?: number;
  sport?: boolean;
  typeSport?: string;
  conduiteNuit?: boolean;
  photophobie?: boolean;
  secheresseOculaire?: boolean;
  profession?: string;
  preferenceMonture?: string;
  budget?: string;
  mutuelle?: string;
  niveauGarantie?: string;
  consentementRgpd?: boolean;
  consentementRelance?: boolean;
}

const MONTURES = [
  { id: "plastique", label: "Plastique", sub: "Mode, tendance, solide — une infinité de couleurs et de modèles", icon: "M3 7h18v2H3zM5 5h14v2H5z" },
  { id: "metal", label: "Métal", sub: "Fine, discrète, très solide", icon: "M3 12h18M3 8h18M3 16h6" },
  { id: "nylon", label: "Nylon (demi-cerclée)", sub: "Verre tenu par un fil en bas (le plus souvent) — légère", icon: "M3 10h18M3 14h18" },
  { id: "percee", label: "Percée (invisible)", sub: "Sans monture autour du verre — ultra-légère et très discrète", icon: "M12 4v16M4 12h16" },
];

const SPORTS_TYPES = [
  { id: "nautique",   label: "Nautique",         sub: "Voile, surf, kayak, kitesurf..." },
  { id: "velo",       label: "Cyclisme",          sub: "Route, VTT, gravel..." },
  { id: "plein_air",  label: "Plein air",         sub: "Running, tennis, golf, rando..." },
  { id: "neige",      label: "Sports de neige",   sub: "Ski, snowboard..." },
  { id: "indoor",     label: "Salle / Indoor",    sub: "Muscu, natation, arts martiaux..." },
  { id: "contact",    label: "Sports collectifs", sub: "Foot, rugby, basket..." },
];

const PROFESSIONS = [
  { id: "bureautique", label: "Bureautique", sub: "Bureau & écrans" },
  { id: "artisan", label: "Artisan", sub: "Chantier & atelier" },
  { id: "sante", label: "Santé", sub: "Médical & paramédical" },
  { id: "conduite", label: "Transport", sub: "Conduite & livraison" },
  { id: "exterieur", label: "Extérieur", sub: "Sport & plein air" },
  { id: "autre", label: "Autre", sub: "Autre activité" },
];

const MUTUELLES = [
  "Harmonie Mutuelle",
  "MGEN",
  "Malakoff Humanis",
  "AG2R La Mondiale",
  "Groupama",
  "Axa",
  "Allianz",
  "April",
  "Aésio",
  "Mutuelle Générale",
  "MNT",
  "MFP",
  "MSA",
  "Pro BTP",
  "Klesia",
  "Humanis",
  "Autre",
  "Aucune",
];

const TOTAL_STEPS = 8;

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>({});

  // Pré-remplir mutuelle + niveau depuis le scan de carte
  useEffect(() => {
    try {
      const clientRaw = localStorage.getItem("optipilot_client");
      if (clientRaw) {
        const c = JSON.parse(clientRaw);
        setData((prev) => ({
          ...prev,
          ...(c.mutuelle        ? { mutuelle: c.mutuelle }              : {}),
          ...(c.niveauGarantie  ? { niveauGarantie: c.niveauGarantie } : {}),
        }));
      }
    } catch { /* ignore */ }
  }, []);

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else submitQuestionnaire();
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

  async function submitQuestionnaire() {
    const finalData = { ...data };
    localStorage.setItem("optipilot_questionnaire", JSON.stringify(finalData));

    // Sauvegarder en BDD
    try {
      const client = JSON.parse(localStorage.getItem("optipilot_client") || "{}");
      if (client.id) {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/questionnaires`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("optipilot_token") || ""}`,
          },
          body: JSON.stringify({
            clientId: client.id,
            profession: finalData.profession,
            tempsEcran: finalData.tempsEcran,
            sport: finalData.sport || false,
            typeSport: finalData.typeSport || null,
            conduiteNuit: finalData.conduiteNuit || false,
            photophobie: finalData.photophobie || false,
            preferenceMonture: finalData.preferenceMonture,
            budget: finalData.budget,
          }),
        });
      }
    } catch {
      // Continue sans backend
    }

    router.push("/recommandations");
  }

  function update(patch: Partial<QuestionnaireData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="page-bg min-h-screen flex flex-col">
      {/* Header retour + compteur */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={back}
          className="flex items-center gap-2 font-semibold text-xl"
          style={{ color: "#5331D0" }}
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" stroke="#5331D0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Retour
        </motion.button>
        <span className="text-lg font-medium" style={{ color: "#6b7280" }}>
          {step} / {TOTAL_STEPS}
        </span>
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center mb-6"
      >
        <img
          src="/assets/images/Logo-OptiPilot.png"
          alt="OptiPilot"
          className="h-16 w-auto object-contain"
          style={{ filter: "drop-shadow(0 0 20px rgba(124,58,237,0.6)) drop-shadow(0 0 40px rgba(124,58,237,0.35))" }}
        />
      </motion.div>

      {/* Barre de progression fine */}
      <div className="px-6 mb-8">
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(124,58,237,0.15)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #5331D0, #9B96DA)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <main className="flex-1 px-6 pb-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepCard key="s1">
              <QuestionTitle>Quelle est votre activité principale ?</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Cela nous aide à vous recommander les traitements adaptés.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {PROFESSIONS.map((p) => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { update({ profession: p.id }); next(); }}
                    className="rounded-2xl py-6 px-5 text-left border-2 transition-all"
                    style={{
                      background: data.profession === p.id ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
                      borderColor: data.profession === p.id ? "#5331D0" : "rgba(155,150,218,0.2)",
                    }}
                  >
                    <p className="text-xl font-bold" style={{ color: data.profession === p.id ? "#9B96DA" : "#FDFDFE" }}>
                      {p.label}
                    </p>
                    <p className="text-base mt-1" style={{ color: "rgba(155,150,218,0.55)" }}>
                      {p.sub}
                    </p>
                  </motion.button>
                ))}
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard key="s2">
              <QuestionTitle>Temps quotidien sur écran ?</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Ordinateur, tablette, smartphone confondus.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { value: 2, label: "Moins de 3h", sub: "Utilisation légère" },
                  { value: 4, label: "3 à 6h", sub: "Utilisation modérée" },
                  { value: 8, label: "Plus de 6h", sub: "Utilisation intensive" },
                ].map((opt) => (
                  <ChoiceButton
                    key={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    selected={data.tempsEcran === opt.value}
                    onClick={() => { update({ tempsEcran: opt.value }); next(); }}
                  />
                ))}
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard key="s3">
              <QuestionTitle>Pratiquez-vous un sport régulièrement ?</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Sport en salle, plein air, natation, vélo…
              </p>
              <div className="flex flex-col gap-4">
                <ChoiceButton label="Oui, régulièrement" selected={data.sport === true}
                  onClick={() => update({ sport: true })} />
                <ChoiceButton label="Non / Occasionnel" selected={data.sport === false}
                  onClick={() => { update({ sport: false, typeSport: undefined }); next(); }} />
              </div>

              <AnimatePresence>
                {data.sport === true && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <p className="text-lg font-semibold mb-3" style={{ color: "#FDFDFE" }}>
                      Quel type de sport ?
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {SPORTS_TYPES.map((s) => (
                        <motion.button
                          key={s.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => update({ typeSport: s.id })}
                          className="rounded-2xl py-4 px-4 text-left border-2 transition-all"
                          style={{
                            background: data.typeSport === s.id ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
                            borderColor: data.typeSport === s.id ? "#5331D0" : "rgba(155,150,218,0.2)",
                          }}
                        >
                          <p className="text-base font-bold" style={{ color: data.typeSport === s.id ? "#9B96DA" : "#FDFDFE" }}>
                            {s.label}
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: "rgba(155,150,218,0.55)" }}>
                            {s.sub}
                          </p>
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence>
                      {data.typeSport && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={next}
                          className="w-full py-5 rounded-2xl text-white font-bold text-xl mt-5"
                          style={{
                            background: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
                            boxShadow: "0 4px 24px rgba(83,49,208,0.5)",
                          }}
                        >
                          Continuer
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard key="s4">
              <QuestionTitle>Conduisez-vous souvent la nuit ?</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Halos et éblouissements nocturnes peuvent être corrigés.
              </p>
              <div className="flex flex-col gap-4">
                <ChoiceButton label="Oui, souvent" selected={data.conduiteNuit === true}
                  onClick={() => { update({ conduiteNuit: true }); next(); }} />
                <ChoiceButton label="Rarement ou jamais" selected={data.conduiteNuit === false}
                  onClick={() => { update({ conduiteNuit: false }); next(); }} />
              </div>
            </StepCard>
          )}

          {step === 5 && (
            <StepCard key="s5">
              <QuestionTitle>Votre confort visuel</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Ces informations orientent le choix de traitements spécifiques.
              </p>
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-lg font-semibold mb-3" style={{ color: "#FDFDFE" }}>
                    Sensibilité à la lumière
                  </p>
                  <div className="flex flex-col gap-3">
                    <ChoiceButton label="Oui, je suis photosensible" selected={data.photophobie === true}
                      onClick={() => update({ photophobie: true })} compact />
                    <ChoiceButton label="Non" selected={data.photophobie === false}
                      onClick={() => update({ photophobie: false })} compact />
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={next}
                  className="w-full py-5 rounded-2xl text-white font-bold text-xl mt-2"
                  style={{
                    background: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
                    boxShadow: "0 4px 24px rgba(83,49,208,0.5)",
                  }}
                >
                  Continuer
                </motion.button>
              </div>
            </StepCard>
          )}

          {step === 6 && (
            <StepCard key="s6">              <QuestionTitle>Quel type de monture vous attire ?</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Cela nous aide à orienter nos conseils. Vous pourrez toujours changer en magasin.
              </p>
              <div className="flex flex-col gap-4">
                {MONTURES.map((m) => (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { update({ preferenceMonture: m.id }); next(); }}
                    className="flex items-center gap-5 rounded-2xl py-5 px-6 text-left border-2 transition-all"
                    style={{
                      background: data.preferenceMonture === m.id ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
                      borderColor: data.preferenceMonture === m.id ? "#5331D0" : "rgba(155,150,218,0.2)",
                    }}
                  >
                    <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: data.preferenceMonture === m.id ? "rgba(83,49,208,0.3)" : "rgba(83,49,208,0.1)" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="9" width="8" height="6" rx="3" stroke={data.preferenceMonture === m.id ? "#9B96DA" : "rgba(155,150,218,0.6)"} strokeWidth="2"/>
                        <rect x="14" y="9" width="8" height="6" rx="3" stroke={data.preferenceMonture === m.id ? "#9B96DA" : "rgba(155,150,218,0.6)"} strokeWidth="2"/>
                        <path d="M10 12h4" stroke={data.preferenceMonture === m.id ? "#9B96DA" : "rgba(155,150,218,0.6)"} strokeWidth="2" strokeLinecap="round"/>
                        <path d="M2 12H1M22 12h1" stroke={data.preferenceMonture === m.id ? "#9B96DA" : "rgba(155,150,218,0.6)"} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xl font-bold" style={{ color: data.preferenceMonture === m.id ? "#9B96DA" : "#FDFDFE" }}>{m.label}</p>
                      <p className="text-base mt-0.5" style={{ color: "rgba(155,150,218,0.55)" }}>{m.sub}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={next}
                className="w-full py-4 rounded-2xl font-semibold text-lg mt-5"
                style={{ background: "rgba(83,49,208,0.2)", color: "#9B96DA", border: "1px solid rgba(83,49,208,0.35)" }}
              >
                Passer cette étape
              </motion.button>
            </StepCard>
          )}

          {step === 7 && (
            <StepCard key="s7">              <QuestionTitle>Quelle est votre mutuelle ?</QuestionTitle>
              <p className="text-lg mt-2 mb-6" style={{ color: "#9B96DA" }}>
                Pour un remboursement précis et personnalisé.
              </p>
              <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1 pb-1">
                {MUTUELLES.map((m) => (
                  <motion.button
                    key={m}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => update({ mutuelle: m })}
                    className="py-4 px-4 rounded-xl text-lg font-medium border-2 text-left transition-all"
                    style={{
                      background: data.mutuelle === m ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
                      borderColor: data.mutuelle === m ? "#5331D0" : "rgba(155,150,218,0.2)",
                      color: data.mutuelle === m ? "#9B96DA" : "#FDFDFE",
                    }}
                  >
                    {m}
                  </motion.button>
                ))}
              </div>
              <AnimatePresence>
                {data.mutuelle && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6"
                  >
                    <p className="text-lg font-semibold mb-3" style={{ color: "#FDFDFE" }}>
                      Niveau de garantie
                    </p>
                    <div className="flex gap-3">
                      {["Base", "Confort", "Premium"].map((n) => (
                        <motion.button
                          key={n}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => update({ niveauGarantie: n.toLowerCase() })}
                          className="flex-1 py-5 rounded-xl text-lg font-bold border-2 transition-all"
                          style={{
                            background: data.niveauGarantie === n.toLowerCase() ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
                            borderColor: data.niveauGarantie === n.toLowerCase() ? "#5331D0" : "rgba(155,150,218,0.2)",
                            color: data.niveauGarantie === n.toLowerCase() ? "#9B96DA" : "#FDFDFE",
                          }}
                        >
                          {n}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {data.mutuelle && data.niveauGarantie && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={next}
                    className="w-full py-5 rounded-2xl text-white font-bold text-xl mt-6"
                    style={{
                      background: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
                      boxShadow: "0 4px 24px rgba(83,49,208,0.5)",
                    }}
                  >
                    Continuer
                  </motion.button>
                )}
              </AnimatePresence>
            </StepCard>
          )}

          {step === 8 && (
            <StepCard key="s8">
              <QuestionTitle>Votre budget lunettes</QuestionTitle>
              <p className="text-lg mt-2 mb-8" style={{ color: "#9B96DA" }}>
                Après remboursements Sécu et mutuelle.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { value: "economique", label: "100% Santé", sub: "Reste à charge 0€ — remboursement intégral" },
                  { value: "standard", label: "Standard", sub: "Bon rapport qualité / prix" },
                  { value: "premium", label: "Premium", sub: "Le meilleur de la technologie optique" },
                ].map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => update({ budget: opt.value })}
                    className="rounded-2xl py-6 px-6 text-left border-2 transition-all"
                    style={{
                      background: data.budget === opt.value ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
                      borderColor: data.budget === opt.value ? "#5331D0" : "rgba(155,150,218,0.2)",
                    }}
                  >
                    <p className="text-xl font-bold" style={{ color: data.budget === opt.value ? "#9B96DA" : "#FDFDFE" }}>
                      {opt.label}
                    </p>
                    <p className="text-base mt-1" style={{ color: "rgba(155,150,218,0.55)" }}>
                      {opt.sub}
                    </p>
                  </motion.button>
                ))}
              </div>

              {/* RGPD */}
              <div
                className="mt-8 p-5 rounded-2xl"
                style={{ background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.3)" }}
              >
                <p className="text-lg font-bold mb-4" style={{ color: "#9B96DA" }}>
                  Consentements
                </p>
                <label className="flex items-start gap-4 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-6 h-6 accent-violet-600"
                    checked={data.consentementRgpd || false}
                    onChange={(e) => update({ consentementRgpd: e.target.checked })}
                  />
                  <span className="text-lg" style={{ color: "#FDFDFE" }}>
                    J’accepte que mes données optiques soient utilisées pour générer mon devis personnalisé.
                  </span>
                </label>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-6 h-6 accent-violet-600"
                    checked={data.consentementRelance || false}
                    onChange={(e) => update({ consentementRelance: e.target.checked })}
                  />
                  <span className="text-lg" style={{ color: "#FDFDFE" }}>
                    J’accepte de recevoir des relances et offres personnalisées.
                  </span>
                </label>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={next}
                disabled={!data.budget || !data.consentementRgpd}
                className="w-full py-5 rounded-2xl text-white font-bold text-xl mt-6"
                style={{
                  background: data.budget && data.consentementRgpd
                    ? "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)"
                    : "rgba(83,49,208,0.3)",
                  boxShadow: data.budget && data.consentementRgpd ? "0 4px 24px rgba(83,49,208,0.5)" : "none",
                  cursor: data.budget && data.consentementRgpd ? "pointer" : "not-allowed",
                }}
              >
                Voir mes recommandations →
              </motion.button>
            </StepCard>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="rounded-3xl p-8 w-full"
      style={{
        background: "rgba(10,3,56,0.75)",
        border: "1.5px solid rgba(83,49,208,0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </motion.div>
  );
}

function QuestionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-black leading-snug" style={{ color: "#FDFDFE" }}>
      {children}
    </h2>
  );
}

function ChoiceButton({
  label,
  sub,
  selected,
  onClick,
  compact = false,
}: {
  label: string;
  sub?: string;
  selected?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center justify-between border-2 rounded-2xl text-left transition-all w-full"
      style={{
        padding: compact ? "16px 22px" : "22px 26px",
        background: selected ? "rgba(83,49,208,0.2)" : "rgba(10,3,56,0.6)",
        borderColor: selected ? "#5331D0" : "rgba(155,150,218,0.2)",
      }}
    >
      <div>
        <p className="text-xl font-bold" style={{ color: selected ? "#9B96DA" : "#FDFDFE" }}>
          {label}
        </p>
        {sub && (
          <p className="text-base mt-0.5" style={{ color: "rgba(155,150,218,0.55)" }}>
            {sub}
          </p>
        )}
      </div>
      {selected && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-4"
          style={{ background: "#5331D0" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}
