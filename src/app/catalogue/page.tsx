"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import { MONTURES, type Monture } from "@/data/montures";
import { analyserOrdonnance } from "@/lib/analyseOrdonnance";

// ─── Types ────────────────────────────────────────────────────────────────────
type Genre  = "tous" | "homme" | "femme" | "mixte";
type Forme  = "toutes" | "ronde" | "carrée" | "ovale" | "papillon" | "rectangle";
type Taille = "toutes" | "S" | "M" | "L";
type Style  = "tous" | "sport" | "ville" | "classique" | "tendance";

interface Filtres {
  genre: Genre;
  forme: Forme;
  taille: Taille;
  style: Style;
  recommandeSeulement: boolean;
}

// ─── Couleurs par style ───────────────────────────────────────────────────────
const STYLE_COLOR: Record<string, string> = {
  sport:     "#34D399",
  ville:     "#9B96DA",
  classique: "#C4A97A",
  tendance:  "#F472B6",
};
const MATIERE_BG: Record<string, string> = {
  plastique: "rgba(167,139,250,0.13)",
  metal:     "rgba(148,163,184,0.13)",
  nylor:     "rgba(52,211,153,0.10)",
  percée:    "rgba(251,191,36,0.09)",
};
const MATIERE_LABEL: Record<string, string> = {
  plastique: "Plastique",
  metal:     "Métal",
  nylor:     "Nylor",
  percée:    "Percée",
};
const FORME_LABEL: Record<string, string> = {
  ronde:     "Ronde",
  carrée:    "Carrée",
  ovale:     "Ovale",
  papillon:  "Papillon",
  rectangle: "Rectangle",
};

// ─── Lunettes SVG par forme ───────────────────────────────────────────────────
function GlassesIcon({ forme, color }: { forme: string; color: string }) {
  const s = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const bridge = <line x1="31" y1="20" x2="49" y2="20" {...s} />;
  const temples = (
    <>
      <line x1="6"  y1="13" x2="0"  y2="8" {...s} />
      <line x1="74" y1="13" x2="80" y2="8" {...s} />
    </>
  );
  let lenses: React.ReactNode;
  switch (forme) {
    case "ronde":
      lenses = <><circle cx="20" cy="20" r="14" {...s} /><circle cx="60" cy="20" r="14" {...s} /></>;
      break;
    case "carrée":
      lenses = <><rect x="6"  y="9" width="25" height="22" rx="4" {...s} /><rect x="49" y="9" width="25" height="22" rx="4" {...s} /></>;
      break;
    case "ovale":
      lenses = <><ellipse cx="20" cy="20" rx="16" ry="11" {...s} /><ellipse cx="60" cy="20" rx="16" ry="11" {...s} /></>;
      break;
    case "papillon":
      lenses = (
        <>
          <path d="M6 22 Q8 8 20 9 Q31 10 31 20 Q31 30 18 30 Q6 28 6 22Z"  {...s} />
          <path d="M74 22 Q72 8 60 9 Q49 10 49 20 Q49 30 62 30 Q74 28 74 22Z" {...s} />
        </>
      );
      break;
    default: // rectangle
      lenses = <><rect x="4"  y="11" width="27" height="18" rx="2" {...s} /><rect x="49" y="11" width="27" height="18" rx="2" {...s} /></>;
  }
  return (
    <svg viewBox="0 0 80 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {lenses}{bridge}{temples}
    </svg>
  );
}

// ─── Score de recommandation ──────────────────────────────────────────────────
function scoreMonture(
  m: Monture,
  quest: Record<string, unknown> | null,
  presbytie: string | null
): number {
  let score = 0;
  if (!quest) return score;

  // Préférence matière ("nylon" dans questionnaire = "nylor" dans catalogue)
  const rawPref = quest.preferenceMonture as string | undefined;
  const prefMat = rawPref === "nylon" ? "nylor" : rawPref;
  if (prefMat && m.matiere === prefMat) score += 4;

  // Sport
  if (quest.sport && m.style === "sport")  score += 3;
  if (!quest.sport && m.style !== "sport") score += 1;

  // Budget
  if (quest.budget === "economique" && m.prixIndicatif <= 60) score += 2;
  if (quest.budget === "premium"    && m.prixIndicatif >= 80) score += 2;
  if (quest.budget === "standard"   && m.prixIndicatif >= 45 && m.prixIndicatif <= 85) score += 1;

  // Presbytie avancée → grande taille (progressifs épais nécessitent plus de surface)
  if (presbytie === "avancée" && m.taille === "L") score += 2;

  return score;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl font-semibold text-white text-sm shadow-xl"
      style={{ background: "rgba(83,49,208,0.95)", border: "1px solid rgba(167,139,250,0.4)" }}
    >
      {message}
    </motion.div>
  );
}

// ─── Chip de filtre ───────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
      style={{
        background: active ? "rgba(83,49,208,0.85)" : "rgba(255,255,255,0.06)",
        color:      active ? "#FDFDFE" : "#9B96DA",
        border:     `1px solid ${active ? "rgba(167,139,250,0.5)" : "rgba(155,150,218,0.2)"}`,
      }}
    >
      {label}
    </motion.button>
  );
}

// ─── Carte monture ────────────────────────────────────────────────────────────
function MontureCard({
  monture,
  recommande,
  selectionne,
  onSelect,
}: {
  monture: Monture;
  recommande: boolean;
  selectionne: boolean;
  onSelect: (id: string) => void;
}) {
  const accent = STYLE_COLOR[monture.style] ?? "#9B96DA";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "rgba(10,3,56,0.7)", border: `1px solid ${recommande ? "rgba(167,139,250,0.45)" : "rgba(255,255,255,0.08)"}` }}
    >
      {/* Zone illustration */}
      <div
        className="flex items-center justify-center px-6 pt-6 pb-4"
        style={{ background: MATIERE_BG[monture.matiere], minHeight: 96 }}
      >
        <div className="w-full max-w-[140px] h-12">
          <GlassesIcon forme={monture.forme} color={accent} />
        </div>
      </div>

      {/* Infos */}
      <div className="flex flex-col flex-1 px-4 pb-4 pt-2 gap-1.5">
        {recommande && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start"
            style={{ background: "rgba(167,139,250,0.18)", color: "#C4B5FD" }}>
            ⭐ Recommandé
          </span>
        )}

        <p className="text-base font-bold text-white leading-tight">{monture.nom}</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{monture.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${accent}22`, color: accent }}>
            {FORME_LABEL[monture.forme]}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
            {monture.taille}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>
            {MATIERE_LABEL[monture.matiere]}
          </span>
        </div>

        <p className="text-sm font-bold mt-auto pt-2" style={{ color: accent }}>
          {monture.prixIndicatif} € <span className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>indicatif</span>
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(monture.id)}
          className="w-full py-2.5 rounded-xl text-sm font-bold mt-1 transition-all"
          style={selectionne
            ? { background: "rgba(52,211,153,0.18)", color: "#34D399", border: "1px solid rgba(52,211,153,0.35)" }
            : { background: "rgba(83,49,208,0.6)", color: "#DDDAF5", border: "1px solid rgba(167,139,250,0.3)" }
          }
        >
          {selectionne ? "✓ Sélectionnée" : "Demander disponibilité"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CataloguePage() {
  const router = useRouter();

  const [filtres, setFiltres] = useState<Filtres>({
    genre: "tous",
    forme: "toutes",
    taille: "toutes",
    style: "tous",
    recommandeSeulement: false,
  });

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Profil client chargé depuis localStorage
  const [quest, setQuest] = useState<Record<string, unknown> | null>(null);
  const [presbytie, setPresbyti] = useState<string | null>(null);

  useEffect(() => {
    const ordoRaw = localStorage.getItem("optipilot_ordonnance");
    const questRaw = localStorage.getItem("optipilot_questionnaire");
    const selRaw = localStorage.getItem("optipilot_selection_montures");

    if (questRaw) setQuest(JSON.parse(questRaw));
    if (selRaw)   setSelection(new Set(JSON.parse(selRaw)));

    if (ordoRaw) {
      const ordo = JSON.parse(ordoRaw);
      const analyse = analyserOrdonnance(ordo);
      setPresbyti(analyse.presbytie);
    }
  }, []);

  // Scores pré-calculés
  const scores = useMemo(
    () => Object.fromEntries(MONTURES.map((m) => [m.id, scoreMonture(m, quest, presbytie)])),
    [quest, presbytie]
  );

  // Montures filtrées + triées (recommandées en tête)
  const montruresFiltrees = useMemo(() => {
    return MONTURES
      .filter((m) => {
        if (filtres.genre  !== "tous"    && m.genre  !== filtres.genre)  return false;
        if (filtres.forme  !== "toutes"  && m.forme  !== filtres.forme)  return false;
        if (filtres.taille !== "toutes"  && m.taille !== filtres.taille) return false;
        if (filtres.style  !== "tous"    && m.style  !== filtres.style)  return false;
        if (filtres.recommandeSeulement  && scores[m.id] < 4)            return false;
        return true;
      })
      .sort((a, b) => scores[b.id] - scores[a.id]);
  }, [filtres, scores]);

  function setFiltre<K extends keyof Filtres>(key: K, val: Filtres[K]) {
    setFiltres((prev) => ({ ...prev, [key]: val }));
  }

  function handleSelect(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setToast("Retirée de la sélection");
      } else {
        next.add(id);
        const nom = MONTURES.find((m) => m.id === id)?.nom ?? "";
        setToast(`${nom} ajoutée à votre sélection`);
      }
      localStorage.setItem("optipilot_selection_montures", JSON.stringify([...next]));
      return next;
    });
  }

  const nbRecommandeesTotal = useMemo(() => MONTURES.filter((m) => scores[m.id] >= 4).length, [scores]);

  return (
    <div className="page-bg min-h-screen flex flex-col pb-10">
      <OptiPilotHeader
        title="Catalogue montures"
        showBack
        onBack={() => router.back()}
        rightAction={
          selection.size > 0 ? (
            <span className="px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(52,211,153,0.18)", color: "#34D399" }}>
              {selection.size} choisie{selection.size > 1 ? "s" : ""}
            </span>
          ) : undefined
        }
      />

      <div className="px-4 pt-2 space-y-5 flex-1">

        {/* Recommandation callout */}
        {nbRecommandeesTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-5 py-4"
            style={{ background: "rgba(83,49,208,0.18)", border: "1px solid rgba(167,139,250,0.3)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "#C4B5FD" }}>
              ⭐ {nbRecommandeesTotal} monture{nbRecommandeesTotal > 1 ? "s" : ""} recommandée{nbRecommandeesTotal > 1 ? "s" : ""} pour ce client
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(196,181,253,0.65)" }}>
              Basé sur la préférence monture, le budget et l&apos;ordonnance
            </p>
          </motion.div>
        )}

        {/* Filtres ─ Genre */}
        <div>
          <p className="text-xs font-semibold mb-2 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>Genre</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["tous", "homme", "femme", "mixte"] as Genre[]).map((g) => (
              <Chip key={g} label={g === "tous" ? "Tous" : g.charAt(0).toUpperCase() + g.slice(1)}
                active={filtres.genre === g} onClick={() => setFiltre("genre", g)} />
            ))}
          </div>
        </div>

        {/* Filtres ─ Forme */}
        <div>
          <p className="text-xs font-semibold mb-2 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>Forme</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["toutes", "ronde", "carrée", "ovale", "papillon", "rectangle"] as Forme[]).map((f) => (
              <Chip key={f} label={f === "toutes" ? "Toutes" : FORME_LABEL[f]}
                active={filtres.forme === f} onClick={() => setFiltre("forme", f)} />
            ))}
          </div>
        </div>

        {/* Filtres ─ Taille + Style sur la même ligne */}
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-2 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>Taille</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(["toutes", "S", "M", "L"] as Taille[]).map((t) => (
                <Chip key={t} label={t === "toutes" ? "Toutes" : t}
                  active={filtres.taille === t} onClick={() => setFiltre("taille", t)} />
              ))}
            </div>
          </div>
        </div>

        {/* Filtres ─ Style */}
        <div>
          <p className="text-xs font-semibold mb-2 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>Style</p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["tous", "sport", "ville", "classique", "tendance"] as Style[]).map((s) => (
              <Chip key={s} label={s === "tous" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
                active={filtres.style === s} onClick={() => setFiltre("style", s)} />
            ))}
          </div>
        </div>

        {/* Toggle recommandées seulement */}
        {nbRecommandeesTotal > 0 && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setFiltre("recommandeSeulement", !filtres.recommandeSeulement)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl"
            style={{
              background: filtres.recommandeSeulement ? "rgba(83,49,208,0.3)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filtres.recommandeSeulement ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <span className="text-lg">⭐</span>
            <span className="text-sm font-semibold flex-1 text-left" style={{ color: filtres.recommandeSeulement ? "#C4B5FD" : "rgba(255,255,255,0.6)" }}>
              Recommandées pour ce client uniquement
            </span>
            <div className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: filtres.recommandeSeulement ? "#5331D0" : "rgba(255,255,255,0.15)" }}>
              <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: filtres.recommandeSeulement ? "calc(100% - 18px)" : "2px" }} />
            </div>
          </motion.button>
        )}

        {/* Compteur résultats */}
        <p className="text-sm px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          {montruresFiltrees.length} monture{montruresFiltrees.length !== 1 ? "s" : ""} trouvée{montruresFiltrees.length !== 1 ? "s" : ""}
        </p>

        {/* Grille */}
        <AnimatePresence mode="popLayout">
          {montruresFiltrees.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-3"
            >
              <span className="text-5xl">🔍</span>
              <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Aucune monture ne correspond</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>Élargissez les filtres pour voir plus de résultats</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {montruresFiltrees.map((m) => (
                <MontureCard
                  key={m.id}
                  monture={m}
                  recommande={scores[m.id] >= 4}
                  selectionne={selection.has(m.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
