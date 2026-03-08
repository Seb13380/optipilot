"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

interface QuestionnaireData {
  tempsEcran?: number;
  sport?: boolean;
  conduiteNuit?: boolean;
  photophobie?: boolean;
  secheresseOculaire?: boolean;
  profession?: string;
  budget?: string;
  mutuelle?: string;
  niveauGarantie?: string;
  consentementRgpd?: boolean;
  consentementRelance?: boolean;
}

const PROFESSIONS = [
  { id: "bureautique", label: "Bureautique\n/ Bureau", icon: "💻" },
  { id: "artisan", label: "Artisan\n/ Chantier", icon: "🔧" },
  { id: "sante", label: "Santé\n/ Médical", icon: "🏥" },
  { id: "conduite", label: "Transport\n/ Conduite", icon: "🚗" },
  { id: "exterieur", label: "Extérieur\n/ Sport", icon: "⛰️" },
  { id: "autre", label: "Autre", icon: "👤" },
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

const TOTAL_STEPS = 7;

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<QuestionnaireData>({});

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
    router.push("/recommandations");
  }

  function update(patch: Partial<QuestionnaireData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <OptiPilotHeader title="Profil Client" showBack onBack={back} />

      {/* Barre de progression */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full flex-1"
              animate={{
                background: i < step ? "#1e3a8a" : "#e5e7eb",
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>
          Question {step}/{TOTAL_STEPS}
        </p>
      </div>

      <main className="flex-1 flex flex-col px-6 pb-8 pt-3 w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepWrapper key="s1">
              <QuestionTitle>
                Quel est votre type d'activité principale ?
              </QuestionTitle>
              <div className="grid grid-cols-3 gap-3 mt-6">
                {PROFESSIONS.map((p) => (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      update({ profession: p.id });
                      next();
                    }}
                    className="rounded-2xl py-5 px-2 flex flex-col items-center gap-2 border-2 transition-all"
                    style={{
                      background: data.profession === p.id ? "#eff6ff" : "white",
                      borderColor: data.profession === p.id ? "#1e3a8a" : "#e5e7eb",
                    }}
                  >
                    <span className="text-3xl">{p.icon}</span>
                    <span
                      className="text-xs font-semibold text-center leading-tight"
                      style={{
                        color: data.profession === p.id ? "#1e3a8a" : "#374151",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {p.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper key="s2">
              <QuestionTitle>
                Combien de temps passez-vous sur l'ordinateur ?
              </QuestionTitle>
              <div className="flex flex-col gap-3 mt-6">
                {[
                  { value: 2, label: "Moins de 3h", sub: "Utilisation occasionnelle", icon: "🌿" },
                  { value: 4, label: "3 à 6h", sub: "Utilisation modérée", icon: "💼" },
                  { value: 8, label: "Plus de 6h", sub: "Utilisation intensive", icon: "⚡" },
                ].map((opt) => (
                  <ChoiceButton
                    key={opt.value}
                    label={opt.label}
                    sub={opt.sub}
                    icon={opt.icon}
                    selected={data.tempsEcran === opt.value}
                    onClick={() => {
                      update({ tempsEcran: opt.value });
                      next();
                    }}
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper key="s3">
              <QuestionTitle>Pratiquez-vous un sport régulièrement ?</QuestionTitle>
              <div className="flex flex-col gap-3 mt-6">
                <YesNoButtons
                  onYes={() => { update({ sport: true }); next(); }}
                  onNo={() => { update({ sport: false }); next(); }}
                  selected={data.sport}
                  yesLabel="Oui, régulièrement"
                  yesIcon="🏃"
                  noLabel="Non / Occasionnel"
                  noIcon="🛋️"
                />
              </div>
            </StepWrapper>
          )}

          {step === 4 && (
            <StepWrapper key="s4">
              <QuestionTitle>Conduisez-vous souvent la nuit ?</QuestionTitle>
              <div className="flex flex-col gap-3 mt-6">
                <YesNoButtons
                  onYes={() => { update({ conduiteNuit: true }); next(); }}
                  onNo={() => { update({ conduiteNuit: false }); next(); }}
                  selected={data.conduiteNuit}
                  yesLabel="Oui, souvent"
                  yesIcon="🌙"
                  noLabel="Rarement ou jamais"
                  noIcon="☀️"
                />
              </div>
            </StepWrapper>
          )}

          {step === 5 && (
            <StepWrapper key="s5">
              <QuestionTitle>
                Êtes-vous sensible à la lumière ou souffrez-vous de sécheresse oculaire ?
              </QuestionTitle>
              <div className="flex flex-col gap-4 mt-6">
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: "#6b7280" }}>
                    Sensibilité à la lumière
                  </p>
                  <YesNoButtons
                    onYes={() => update({ photophobie: true })}
                    onNo={() => update({ photophobie: false })}
                    selected={data.photophobie}
                    yesLabel="Oui, photophobie"
                    yesIcon="😎"
                    noLabel="Non"
                    noIcon="👁️"
                    compact
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: "#6b7280" }}>
                    Sécheresse oculaire
                  </p>
                  <YesNoButtons
                    onYes={() => update({ secheresseOculaire: true })}
                    onNo={() => update({ secheresseOculaire: false })}
                    selected={data.secheresseOculaire}
                    yesLabel="Oui, souvent"
                    yesIcon="💧"
                    noLabel="Non"
                    noIcon="✓"
                    compact
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={next}
                  className="py-4 rounded-2xl text-white font-semibold mt-2"
                  style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)" }}
                >
                  Suivant →
                </motion.button>
              </div>
            </StepWrapper>
          )}

          {step === 6 && (
            <StepWrapper key="s6">
              <QuestionTitle>Quelle est votre mutuelle ?</QuestionTitle>
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {MUTUELLES.map((m) => (
                    <motion.button
                      key={m}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => update({ mutuelle: m })}
                      className="py-3 px-3 rounded-xl text-sm font-medium border-2 text-left transition-all"
                      style={{
                        background: data.mutuelle === m ? "#eff6ff" : "white",
                        borderColor: data.mutuelle === m ? "#1e3a8a" : "#e5e7eb",
                        color: data.mutuelle === m ? "#1e3a8a" : "#374151",
                      }}
                    >
                      {m}
                    </motion.button>
                  ))}
                </div>

                {data.mutuelle && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                    <p className="text-sm font-medium mb-2" style={{ color: "#374151" }}>
                      Niveau de garantie
                    </p>
                    <div className="flex gap-2">
                      {["Base", "Confort", "Premium"].map((n) => (
                        <motion.button
                          key={n}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => update({ niveauGarantie: n.toLowerCase() })}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                          style={{
                            background: data.niveauGarantie === n.toLowerCase() ? "#eff6ff" : "white",
                            borderColor: data.niveauGarantie === n.toLowerCase() ? "#1e3a8a" : "#e5e7eb",
                            color: data.niveauGarantie === n.toLowerCase() ? "#1e3a8a" : "#374151",
                          }}
                        >
                          {n}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {data.mutuelle && data.niveauGarantie && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={next}
                    className="w-full py-4 rounded-2xl text-white font-semibold mt-4"
                    style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)" }}
                  >
                    Suivant →
                  </motion.button>
                )}
              </div>
            </StepWrapper>
          )}

          {step === 7 && (
            <StepWrapper key="s7">
              <QuestionTitle>Quel est votre budget ?</QuestionTitle>
              <div className="flex flex-col gap-3 mt-6">
                {[
                  { value: "economique", label: "Économique", sub: "100% Santé — Reste à charge 0€", icon: "💚", color: "#15803d" },
                  { value: "standard", label: "Standard", sub: "Bon rapport qualité / prix", icon: "💙", color: "#1e3a8a" },
                  { value: "premium", label: "Premium", sub: "Le meilleur de la technologie optique", icon: "⭐", color: "#7e22ce" },
                ].map((opt) => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { update({ budget: opt.value }); next(); }}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                    style={{
                      background: data.budget === opt.value ? "#f8fafc" : "white",
                      borderColor: data.budget === opt.value ? opt.color : "#e5e7eb",
                    }}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <div>
                      <p className="font-semibold" style={{ color: opt.color }}>
                        {opt.label}
                      </p>
                      <p className="text-sm" style={{ color: "#6b7280" }}>
                        {opt.sub}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* RGPD */}
              <div
                className="mt-5 p-4 rounded-xl"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: "#92400e" }}>
                  🔒 Consentements RGPD
                </p>
                <label className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4"
                    checked={data.consentementRgpd || false}
                    onChange={(e) => update({ consentementRgpd: e.target.checked })}
                  />
                  <span className="text-xs" style={{ color: "#78350f" }}>
                    J'accepte que mes données optiques soient utilisées pour générer mon devis personnalisé.
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4"
                    checked={data.consentementRelance || false}
                    onChange={(e) => update({ consentementRelance: e.target.checked })}
                  />
                  <span className="text-xs" style={{ color: "#78350f" }}>
                    J'accepte de recevoir des relances et offres personnalisées.
                  </span>
                </label>
              </div>
            </StepWrapper>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StepWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col flex-1 fade-in"
    >
      {children}
    </motion.div>
  );
}

function QuestionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold leading-snug" style={{ color: "#1a1a2e" }}>
      {children}
    </h2>
  );
}

function ChoiceButton({
  label,
  sub,
  icon,
  selected,
  onClick,
  compact = false,
}: {
  label: string;
  sub?: string;
  icon?: string;
  selected?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex items-center gap-4 border-2 rounded-2xl text-left transition-all"
      style={{
        padding: compact ? "12px 16px" : "16px 20px",
        background: selected ? "#eff6ff" : "white",
        borderColor: selected ? "#1e3a8a" : "#e5e7eb",
      }}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <p className="font-semibold" style={{ color: selected ? "#1e3a8a" : "#1a1a2e" }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
            {sub}
          </p>
        )}
      </div>
      {selected && (
        <span className="ml-auto text-blue-700 font-bold text-lg">✓</span>
      )}
    </motion.button>
  );
}

function YesNoButtons({
  onYes,
  onNo,
  selected,
  yesLabel,
  noLabel,
  yesIcon,
  noIcon,
  compact = false,
}: {
  onYes: () => void;
  onNo: () => void;
  selected?: boolean;
  yesLabel: string;
  noLabel: string;
  yesIcon?: string;
  noIcon?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ChoiceButton
        label={yesLabel}
        icon={yesIcon}
        selected={selected === true}
        onClick={onYes}
        compact={compact}
      />
      <ChoiceButton
        label={noLabel}
        icon={noIcon}
        selected={selected === false}
        onClick={onNo}
        compact={compact}
      />
    </div>
  );
}
