"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

const NIVEAUX = [
  {
    nom: "Essentiel",
    couleur: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.35)",
    pour: "Budget maîtrisé · correction simple",
    indice: "1.5",
    type: "Unifocal standard",
    lensRx: 22,
    lensLabel: "Épaisseur standard",
  },
  {
    nom: "Confort",
    couleur: "#7c5fec",
    bg: "rgba(124,95,236,0.12)",
    border: "rgba(124,95,236,0.5)",
    pour: "Quotidien · écrans · conduite",
    indice: "1.6",
    type: "Progressif HD",
    lensRx: 15,
    lensLabel: "Verres fins",
  },
  {
    nom: "Premium",
    couleur: "#c084fc",
    bg: "rgba(192,132,252,0.10)",
    border: "rgba(192,132,252,0.4)",
    pour: "Forte correction · exigence maximale",
    indice: "1.67",
    type: "Progressif Digital",
    lensRx: 9,
    lensLabel: "Verres ultra-fins",
  },
];

const FEATURES: { label: string; values: string[]; ticks: (boolean | "yes" | "partial")[] }[] = [
  {
    label: "Type de verre",
    values: ["Unifocal standard", "Progressif HD", "Progressif Digital"],
    ticks: ["yes", "yes", "yes"],
  },
  {
    label: "Indice de réfraction",
    values: ["1.5", "1.6", "1.67 (ultra-fin)"],
    ticks: ["partial", "yes", "yes"],
  },
  {
    label: "Traitement antireflet",
    values: ["Standard", "Avancé", "Premium UV"],
    ticks: ["partial", "yes", "yes"],
  },
  {
    label: "Filtre lumière bleue",
    values: ["Non inclus", "Inclus", "Inclus HD"],
    ticks: [false, "yes", "yes"],
  },
  {
    label: "Durcissement",
    values: ["Standard", "Renforcé", "Maximum"],
    ticks: ["partial", "yes", "yes"],
  },
  {
    label: "Garantie casse",
    values: ["—", "1 an", "2 ans"],
    ticks: [false, "yes", "yes"],
  },
  {
    label: "100% Santé",
    values: ["Oui", "Oui", "Oui"],
    ticks: ["yes", "yes", "yes"],
  },
];

const TRAITEMENTS = [
  {
    titre: "Antireflet",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="5" stroke="#9B96DA" strokeWidth="2"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#9B96DA" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    description: "Élimine les reflets sur les faces du verre. Améliore le confort visuel, réduit la fatigue en conduite nocturne et devant les écrans.",
    pourqui: "Indispensable pour tous",
    couleur: "#9B96DA",
  },
  {
    titre: "Filtre lumière bleue",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="#93c5fd" strokeWidth="2"/>
        <path d="M8 21h8M12 17v4" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round"/>
        <path d="M7 8h10M7 11h6" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    description: "Absorbe une partie du spectre bleu émis par écrans et LED. Réduit la fatigue oculaire en fin de journée et améliore la qualité du sommeil.",
    pourqui: "Recommandé dès 4h/jour sur écrans",
    couleur: "#93c5fd",
  },
  {
    titre: "Indice élevé = verres plus fins",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14M15 8l4 4-4 4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 8l-4 4 4 4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    description: "Un indice 1.67 versus 1.5 permet un verre jusqu'à 40% plus fin à correction identique. Crucial dès -4 ou +3 pour éviter les verres épais et lourds.",
    pourqui: "Essentiel pour les fortes corrections",
    couleur: "#a78bfa",
  },
  {
    titre: "Verre progressif",
    icone: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#f472b6" strokeWidth="2"/>
        <path d="M12 7v5l3 3" stroke="#f472b6" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="12" cy="9" rx="3" ry="2" stroke="#f472b6" strokeWidth="1.5" opacity="0.4"/>
        <ellipse cx="12" cy="16" rx="2" ry="1.5" stroke="#f472b6" strokeWidth="1.5" opacity="0.4"/>
      </svg>
    ),
    description: "Un seul verre pour voir de loin, intermédiaire et de près. Pas de ligne visible. Plus confortable qu'un bifocal, avec des zones de vision plus larges sur les versions HD.",
    pourqui: "Pour les presbytes (+40 ans)",
    couleur: "#f472b6",
  },
];

function TickIcon({ value }: { value: boolean | "yes" | "partial" }) {
  if (value === false) {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(239,68,68,0.5)" strokeWidth="2"/><path d="M8 8l8 8M16 8l-8 8" stroke="rgba(239,68,68,0.7)" strokeWidth="2" strokeLinecap="round"/></svg>;
  }
  if (value === "partial") {
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(251,191,36,0.5)" strokeWidth="2"/><path d="M8 12h8" stroke="rgba(251,191,36,0.9)" strokeWidth="2" strokeLinecap="round"/></svg>;
  }
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="rgba(34,197,94,0.5)" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="rgba(34,197,94,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function LensSideView({ rx, color }: { rx: number; color: string }) {
  return (
    <svg width="60" height="96" viewBox="0 0 60 96">
      <ellipse cx="30" cy="48" rx={rx} ry="46" fill={`${color}18`} stroke={color} strokeWidth="2" />
      {/* center line */}
      <line x1="30" y1="4" x2="30" y2="92" stroke={`${color}40`} strokeWidth="1" strokeDasharray="3 3"/>
    </svg>
  );
}

export default function ComparateurPage() {
  const router = useRouter();

  return (
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader
        title="Comparer les verres"
        showBack
        onBack={() => router.back()}
      />

      <main className="flex-1 px-5 pb-10 pt-4 w-full max-w-4xl mx-auto">

        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl"
          style={{ background: "rgba(83,49,208,0.14)", border: "1px solid rgba(83,49,208,0.3)" }}
        >
          <p className="text-base font-semibold" style={{ color: "#9B96DA" }}>
            Ce guide aide à comprendre les différences entre les 3 niveaux — en toute transparence.
          </p>
        </motion.div>

        {/* ─── SECTION 1 : ÉPAISSEUR ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-8"
        >
          <h2 className="text-xl font-black mb-1" style={{ color: "#FDFDFE" }}>Épaisseur des verres</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(155,150,218,0.95)" }}>
            Plus l&apos;indice est élevé, plus les verres sont fins — à correction identique.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {NIVEAUX.map((n, i) => (
              <motion.div
                key={n.nom}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="rounded-2xl p-5 flex flex-col items-center gap-3"
                style={{ background: n.bg, border: `1.5px solid ${n.border}` }}
              >
                <LensSideView rx={n.lensRx} color={n.couleur} />
                <div className="text-center">
                  <p className="text-lg font-black" style={{ color: n.couleur }}>{n.nom}</p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: "#FDFDFE" }}>Indice {n.indice}</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(155,150,218,0.9)" }}>{n.lensLabel}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ─── SECTION 2 : CHAMP DE VISION ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-black mb-1" style={{ color: "#FDFDFE" }}>Champ de vision — Progressif</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(155,150,218,0.95)" }}>
            Le progressif HD offre des zones de vision plus larges et une transition plus douce.
          </p>
          <div className="grid grid-cols-2 gap-5">
            {/* Standard */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(34,197,94,0.08)", border: "1.5px solid rgba(34,197,94,0.3)" }}>
              <p className="text-base font-bold text-center mb-4" style={{ color: "#22c55e" }}>Essentiel — Standard</p>
              <div className="flex justify-center">
                <svg width="120" height="150" viewBox="0 0 120 150">
                  <ellipse cx="60" cy="30" rx="30" ry="24" fill="rgba(34,197,94,0.2)" stroke="#22c55e" strokeWidth="1.5"/>
                  <text x="60" y="34" textAnchor="middle" fontSize="10" fill="#22c55e">Loin</text>
                  <line x1="30" y1="54" x2="90" y2="54" stroke="rgba(34,197,94,0.3)" strokeWidth="1.5"/>
                  <ellipse cx="60" cy="80" rx="20" ry="18" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.4)" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <text x="60" y="84" textAnchor="middle" fontSize="9" fill="rgba(34,197,94,0.95)">Interméd.</text>
                  <line x1="40" y1="98" x2="80" y2="98" stroke="rgba(34,197,94,0.3)" strokeWidth="1.5"/>
                  <ellipse cx="60" cy="122" rx="15" ry="20" fill="rgba(34,197,94,0.15)" stroke="#22c55e" strokeWidth="1.5"/>
                  <text x="60" y="127" textAnchor="middle" fontSize="10" fill="#22c55e">Près</text>
                </svg>
              </div>
              <p className="text-xs text-center mt-2" style={{ color: "rgba(155,150,218,0.9)" }}>Zones de vision étroites</p>
            </div>
            {/* HD */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(124,95,236,0.1)", border: "1.5px solid rgba(124,95,236,0.45)" }}>
              <p className="text-base font-bold text-center mb-4" style={{ color: "#7c5fec" }}>Confort / Premium — HD</p>
              <div className="flex justify-center">
                <svg width="120" height="150" viewBox="0 0 120 150">
                  <ellipse cx="60" cy="28" rx="46" ry="24" fill="rgba(124,95,236,0.2)" stroke="#7c5fec" strokeWidth="1.5"/>
                  <text x="60" y="32" textAnchor="middle" fontSize="10" fill="#7c5fec">Loin (large)</text>
                  <line x1="14" y1="52" x2="106" y2="52" stroke="rgba(124,95,236,0.3)" strokeWidth="1.5"/>
                  <ellipse cx="60" cy="80" rx="32" ry="20" fill="rgba(124,95,236,0.1)" stroke="rgba(124,95,236,0.4)" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <text x="60" y="84" textAnchor="middle" fontSize="9" fill="rgba(124,95,236,1)">Interméd. (confort)</text>
                  <line x1="28" y1="100" x2="92" y2="100" stroke="rgba(124,95,236,0.3)" strokeWidth="1.5"/>
                  <ellipse cx="60" cy="125" rx="28" ry="22" fill="rgba(124,95,236,0.15)" stroke="#7c5fec" strokeWidth="1.5"/>
                  <text x="60" y="130" textAnchor="middle" fontSize="10" fill="#7c5fec">Près (large)</text>
                </svg>
              </div>
              <p className="text-xs text-center mt-2" style={{ color: "rgba(155,150,218,0.9)" }}>Zones plus larges, transition douce</p>
            </div>
          </div>
        </motion.section>

        {/* ─── SECTION 2b : PHOTOS RÉELLES ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h2 className="text-xl font-black mb-1" style={{ color: "#FDFDFE" }}>Photos réelles des verres</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(155,150,218,0.95)" }}>
            Voici à quoi ressemblent les verres progressifs et les verres Transitions en conditions réelles.
          </p>

          {/* Verres progressifs */}
          <div className="mb-5">
            <p className="text-base font-bold mb-3" style={{ color: "#c084fc" }}>Verres progressifs</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { src: "/assets/images/prog.webp", label: "Vue de profil" },
                { src: "/assets/images/progs.webp", label: "Zones de vision" },
                { src: "/assets/images/progs2.webp", label: "Vue frontale" },
              ].map(({ src, label }) => (
                <div key={src} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#0a0338", border: "1px solid rgba(192,132,252,0.5)" }}>
                  <div className="relative w-full" style={{ aspectRatio: "1" }}>
                    <Image src={src} alt={label} fill className="object-contain" sizes="(max-width: 768px) 33vw, 25vw" quality={95} />
                  </div>
                  <p className="text-xs text-center py-2 font-semibold" style={{ color: "#c084fc" }}>{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2 px-1" style={{ color: "rgba(155,150,218,0.85)" }}>
              Le verre progressif comprend 3 zones invisibles : vision de loin (haut), intermédiaire (milieu) et de près (bas). Un seul verre pour toutes les distances.
            </p>
          </div>

          {/* Verres Transitions */}
          <div>
            <p className="text-base font-bold mb-3" style={{ color: "#60a5fa" }}>Verres Transitions (photochromiques)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { src: "/assets/images/transitions.webp", label: "En intérieur (clairs)" },
                { src: "/assets/images/verres-transitions.webp", label: "En extérieur (foncés)" },
              ].map(({ src, label }) => (
                <div key={src} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#0a0338", border: "1px solid rgba(96,165,250,0.5)" }}>
                  <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
                    <Image src={src} alt={label} fill className="object-cover" sizes="(max-width: 768px) 50vw, 40vw" quality={95} />
                  </div>
                  <p className="text-xs text-center py-2 font-semibold" style={{ color: "#60a5fa" }}>{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-2 px-1" style={{ color: "rgba(155,150,218,0.85)" }}>
              Les verres Transitions s&apos;obscurcissent automatiquement au soleil et redeviennent clairs à l&apos;intérieur en 30 secondes. Ils remplacent les lunettes de soleil au quotidien.
            </p>
          </div>
        </motion.section>

        {/* ─── SECTION 3 : TABLEAU COMPARATIF ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mb-8"
        >
          <h2 className="text-xl font-black mb-5" style={{ color: "#FDFDFE" }}>Tableau comparatif</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(83,49,208,0.35)" }}>
            {/* Header */}
            <div className="grid grid-cols-4 gap-0" style={{ background: "rgba(10,3,56,0.9)" }}>
              <div className="p-3 text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(155,150,218,0.5)" }}>Fonctionnalité</div>
              {NIVEAUX.map((n) => (
                <div key={n.nom} className="p-3 text-center">
                  <p className="text-sm font-black" style={{ color: n.couleur }}>{n.nom}</p>
                </div>
              ))}
            </div>
            {/* Rows */}
            {FEATURES.map((f, i) => (
              <div
                key={f.label}
                className="grid grid-cols-4 gap-0"
                style={{ background: i % 2 === 0 ? "rgba(83,49,208,0.06)" : "rgba(10,3,56,0.5)", borderTop: "1px solid rgba(83,49,208,0.15)" }}
              >
                <div className="p-3">
                  <p className="text-sm font-semibold" style={{ color: "#FDFDFE" }}>{f.label}</p>
                </div>
                {f.values.map((v, j) => (
                  <div key={j} className="p-3 flex flex-col items-center gap-1">
                    <TickIcon value={f.ticks[j]} />
                    <p className="text-xs text-center" style={{ color: "rgba(155,150,218,0.95)" }}>{v}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Légende */}
          <div className="flex gap-5 mt-3 px-1">
            <div className="flex items-center gap-1.5"><TickIcon value="yes"/><span className="text-xs" style={{ color: "rgba(155,150,218,0.9)" }}>Inclus</span></div>
            <div className="flex items-center gap-1.5"><TickIcon value="partial"/><span className="text-xs" style={{ color: "rgba(155,150,218,0.9)" }}>Version standard</span></div>
            <div className="flex items-center gap-1.5"><TickIcon value={false}/><span className="text-xs" style={{ color: "rgba(155,150,218,0.9)" }}>Non inclus</span></div>
          </div>
        </motion.section>

        {/* ─── SECTION 4 : TRAITEMENTS ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="mb-8"
        >
          <h2 className="text-xl font-black mb-2" style={{ color: "#FDFDFE" }}>À quoi servent les traitements ?</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(155,150,218,0.95)" }}>Ces traitements sont appliqués sur la surface du verre.</p>
          <div className="grid grid-cols-1 gap-4">
            {TRAITEMENTS.map((t, i) => (
              <motion.div
                key={t.titre}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.38 + i * 0.07 }}
                className="rounded-2xl p-4 flex items-start gap-4"
                style={{ background: "rgba(10,3,56,0.65)", border: "1px solid rgba(83,49,208,0.25)" }}
              >
                <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${t.couleur}15`, border: `1px solid ${t.couleur}35` }}>
                  {t.icone}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>{t.titre}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${t.couleur}18`, color: t.couleur, border: `1px solid ${t.couleur}35` }}>
                      {t.pourqui}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(155,150,218,0.95)" }}>{t.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA retour aux recommandations */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/recommandations")}
          className="w-full py-5 rounded-2xl text-white font-bold text-xl"
          style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 24px rgba(83,49,208,0.4)" }}
        >
          Voir mes recommandations →
        </motion.button>

      </main>
    </div>
  );
}
