"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";

// ─── Types ────────────────────────────────────────────────────
interface OrdoValues {
  se: number;           // Équivalent sphérique (pire œil)
  cyl: number;          // Cylindre max (astigmatisme)
  add: number;          // Addition (presbytie → progressif)
  isProgressif: boolean;
  sign: "myopie" | "hypermetropie" | "none";
  hasData: boolean;
  label: string;
}

// ─── Lecture ordonnance localStorage ─────────────────────────
function parseOrdonnance(): OrdoValues {
  try {
    const raw = localStorage.getItem("optipilot_ordonnance");
    if (!raw) throw new Error("no data");
    const o = JSON.parse(raw);
    const seOD = (parseFloat(o.odSphere) || 0) + (parseFloat(o.odCylindre) || 0) / 2;
    const seOG = (parseFloat(o.ogSphere) || 0) + (parseFloat(o.ogCylindre) || 0) / 2;
    const se = Math.abs(seOD) >= Math.abs(seOG) ? seOD : seOG;
    const cyl = Math.max(
      Math.abs(parseFloat(o.odCylindre) || 0),
      Math.abs(parseFloat(o.ogCylindre) || 0)
    );
    const add = parseFloat(o.odAddition || o.ogAddition || o.addition || "0") || 0;
    if (se === 0 && cyl === 0 && add === 0) throw new Error("zero");
    const isProgressif = add > 0;
    const sign: OrdoValues["sign"] = se < 0 ? "myopie" : se > 0 ? "hypermetropie" : "none";
    const signLabel = sign === "myopie" ? "Myopie" : sign === "hypermetropie" ? "Hypermétropie" : "Emmétrope";
    const cylLabel = cyl > 0.5 ? ` + Astigmatisme (cyl. ${cyl.toFixed(2)})` : "";
    const addLabel = isProgressif ? ` · Add. +${add.toFixed(2)}` : "";
    return {
      se, cyl, add, isProgressif, sign, hasData: true,
      label: `${signLabel}${se !== 0 ? " " + (se > 0 ? "+" : "") + se.toFixed(2) + " D" : ""}${cylLabel}${addLabel}`.trim(),
    };
  } catch {
    return { se: -3, cyl: 1.25, add: 0, isProgressif: false, sign: "myopie", hasData: false, label: "Myopie −3.00 D (exemple)" };
  }
}

// ─── Calcul du flou selon équivalent sphérique ───────────────
function getBlurPx(se: number): number {
  const abs = Math.abs(se);
  if (abs < 0.25) return 0;
  if (abs < 0.75) return 2;
  if (abs < 1.5)  return 5;
  if (abs < 2.5)  return 9;
  if (abs < 4)    return 15;
  if (abs < 6)    return 22;
  return 30;
}

function getBlurLabel(px: number): string {
  if (px === 0)  return "Aucune correction nécessaire";
  if (px <= 2)   return "Légère";
  if (px <= 5)   return "Modérée";
  if (px <= 9)   return "Significative";
  if (px <= 15)  return "Forte";
  if (px <= 22)  return "Très forte";
  return "Sévère";
}

// ─── Scènes SVG ──────────────────────────────────────────────
function SceneNuit() {
  return (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="250" fill="#04040e" />
      {/* Stars */}
      {[[20,15,1.5],[80,8,1],[150,22,1.5],[300,12,1],[360,8,1.5],[50,45,1],[320,35,1],[250,18,1],[180,40,1],[130,10,1],[270,55,1.5],[380,30,1]].map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.25 + (i%4)*0.1} />
      ))}
      {/* Road perspective */}
      <polygon points="80,250 320,250 230,140 170,140" fill="#0e0e1c" />
      {/* Road markings */}
      <rect x="193" y="158" width="14" height="30" fill="rgba(255,255,255,0.85)" rx="2" />
      <rect x="193" y="198" width="14" height="22" fill="rgba(255,255,255,0.7)" rx="2" />
      <rect x="193" y="228" width="14" height="14" fill="rgba(255,255,255,0.5)" rx="2" />
      {/* Left light beam */}
      <polygon points="100,250 168,250 195,140 172,140" fill="rgba(255,235,80,0.06)" />
      {/* Right light beam */}
      <polygon points="232,250 300,250 228,140 205,140" fill="rgba(255,235,80,0.06)" />
      {/* Left headlight halo */}
      <ellipse cx="148" cy="248" rx="55" ry="30" fill="rgba(255,230,80,0.35)" />
      <ellipse cx="148" cy="248" rx="28" ry="15" fill="rgba(255,245,160,0.6)" />
      <circle cx="148" cy="248" r="11" fill="#fffbe0" />
      {/* Right headlight halo */}
      <ellipse cx="252" cy="248" rx="55" ry="30" fill="rgba(255,230,80,0.35)" />
      <ellipse cx="252" cy="248" rx="28" ry="15" fill="rgba(255,245,160,0.6)" />
      <circle cx="252" cy="248" r="11" fill="#fffbe0" />
      {/* Oncoming car headlights */}
      <ellipse cx="282" cy="158" rx="20" ry="10" fill="rgba(255,255,220,0.2)" />
      <circle cx="277" cy="157" r="5" fill="rgba(255,255,200,0.95)" />
      <circle cx="290" cy="157" r="5" fill="rgba(255,255,200,0.95)" />
      {/* Tail lights distant */}
      <circle cx="330" cy="178" r="3.5" fill="rgba(255,40,40,0.9)" />
      <circle cx="340" cy="178" r="3.5" fill="rgba(255,40,40,0.9)" />
      {/* Street lamp left */}
      <line x1="45" y1="42" x2="45" y2="250" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <ellipse cx="45" cy="50" rx="40" ry="25" fill="rgba(255,220,100,0.18)" />
      <circle cx="45" cy="45" r="8" fill="#fff8d0" />
      {/* Street lamp right */}
      <line x1="360" y1="55" x2="360" y2="250" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <ellipse cx="360" cy="62" rx="32" ry="20" fill="rgba(255,220,100,0.1)" />
      <circle cx="360" cy="58" r="6" fill="#fff8d0" />
    </svg>
  );
}

function SceneEcran() {
  const codeLines = [
    { w: 90, c: "#7ee8ff" }, { w: 140, c: "#f97316" }, { w: 65, c: "#22c55e" },
    { w: 110, c: "#7ee8ff" }, { w: 125, c: "#a78bfa" }, { w: 50, c: "#22c55e" },
    { w: 145, c: "#7ee8ff" }, { w: 80, c: "#f97316" }, { w: 105, c: "#a78bfa" },
    { w: 60, c: "#7ee8ff" }, { w: 130, c: "#f97316" }, { w: 75, c: "#22c55e" },
    { w: 115, c: "#7ee8ff" },
  ];
  return (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="250" fill="#0c0f16" />
      {/* Monitor frame */}
      <rect x="60" y="15" width="280" height="185" rx="10" fill="#15192a" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      {/* Screen */}
      <rect x="70" y="25" width="260" height="165" rx="5" fill="#0d1117" />
      {/* Tab bar */}
      <rect x="70" y="25" width="260" height="20" fill="#161b22" />
      <rect x="73" y="28" width="58" height="14" rx="3" fill="#21262d" />
      <rect x="133" y="28" width="50" height="14" rx="3" fill="#0d1117" />
      <rect x="185" y="28" width="50" height="14" rx="3" fill="#0d1117" />
      {/* Sidebar */}
      <rect x="70" y="45" width="38" height="145" fill="#131a24" />
      {/* Line numbers + code */}
      {codeLines.map((line, i) => (
        <g key={i}>
          <text x="80" y={56 + i * 11} fill="rgba(255,255,255,0.18)" fontSize="7" fontFamily="monospace">{String(i + 1).padStart(2, " ")}</text>
          <rect x="115" y={50 + i * 11} width={line.w} height="5" rx="2" fill={line.c} opacity="0.82" />
          {i % 4 === 0 && <rect x={115 + line.w + 5} y={50 + i * 11} width={30} height="5" rx="2" fill="rgba(255,255,255,0.12)" />}
        </g>
      ))}
      {/* Cursor blink */}
      <rect x="115" y="183" width="2" height="9" fill="rgba(255,255,255,0.7)" />
      {/* Stand */}
      <rect x="188" y="200" width="24" height="22" fill="#15192a" />
      <rect x="163" y="220" width="74" height="9" rx="4" fill="#15192a" />
      {/* Keyboard hint */}
      <rect x="120" y="236" width="160" height="10" rx="3" fill="#15192a" opacity="0.7" />
    </svg>
  );
}

function SceneLecture() {
  const textLines = [220, 198, 210, 188, 215, 195, 205, 182, 212, 190, 200, 175, 208, 192, 185];
  return (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      {/* Table */}
      <rect width="400" height="250" fill="#1a1520" />
      <rect width="400" height="20" y="230" fill="#120f18" />
      {/* Book shadow */}
      <rect x="63" y="22" width="280" height="212" rx="5" fill="rgba(0,0,0,0.4)" />
      {/* Book / paper */}
      <rect x="58" y="18" width="284" height="214" rx="5" fill="#f4efe4" />
      {/* Book spine */}
      <rect x="58" y="18" width="8" height="214" rx="3" fill="#ddd5c0" />
      {/* Title */}
      <rect x="86" y="40" width="145" height="13" rx="3" fill="#1a1a2e" />
      <rect x="86" y="57" width="90" height="8" rx="2" fill="rgba(60,60,100,0.45)" />
      {/* Body text */}
      {textLines.map((w, i) => (
        <rect key={i} x="86" y={80 + i * 10.5} width={w} height="5" rx="2" fill="#2a2a3e" opacity={0.68 + (i % 3) * 0.06} />
      ))}
      {/* Second paragraph */}
      <rect x="86" y="248" width="168" height="4" rx="2" fill="#2a2a3e" opacity="0.5" />
      {/* Page number */}
      <text x="200" y="222" textAnchor="middle" fill="rgba(40,40,80,0.4)" fontSize="9" fontFamily="Georgia, serif">— 42 —</text>
    </svg>
  );
}

function SceneJour() {
  return (
    <svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a4c8e" />
          <stop offset="100%" stopColor="#4a8fd4" />
        </linearGradient>
        <radialGradient id="sunG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff5a0" />
          <stop offset="60%" stopColor="#ffe055" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffcc00" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Sky */}
      <rect width="400" height="175" fill="url(#skyG)" />
      {/* Sun */}
      <ellipse cx="330" cy="52" rx="60" ry="60" fill="url(#sunG)" opacity="0.7" />
      <circle cx="330" cy="52" r="22" fill="#ffe87a" />
      {/* Clouds */}
      <ellipse cx="110" cy="62" rx="55" ry="22" fill="rgba(255,255,255,0.22)" />
      <ellipse cx="88" cy="68" rx="42" ry="18" fill="rgba(255,255,255,0.18)" />
      <ellipse cx="140" cy="65" rx="38" ry="16" fill="rgba(255,255,255,0.14)" />
      <ellipse cx="230" cy="45" rx="35" ry="14" fill="rgba(255,255,255,0.12)" />
      {/* Street */}
      <rect width="400" height="75" y="175" fill="#1e1e2e" />
      <rect width="400" height="16" y="175" fill="#28283a" />
      {/* Pavement */}
      <rect width="400" height="20" y="230" fill="#16161e" />
      {/* Left building */}
      <rect x="0" y="55" width="90" height="122" fill="#0f1424" />
      <rect x="0" y="75" width="90" height="102" fill="#111a2e" />
      {[[8,82],[30,82],[52,82],[8,102],[30,102],[52,102],[8,122],[30,122],[52,122],[8,142],[30,142],[52,142]].map(([wx,wy],i) => (
        <rect key={i} x={wx} y={wy} width="17" height="13" rx="2" fill={i % 4 === 0 ? "rgba(255,230,100,0.6)" : i % 3 === 0 ? "rgba(100,160,255,0.35)" : "rgba(30,35,55,0.9)"} />
      ))}
      {/* Right tower */}
      <rect x="280" y="30" width="120" height="147" fill="#111a2e" />
      {[[288,45],[310,45],[332,45],[354,45],[288,68],[310,68],[332,68],[354,68],[288,91],[310,91],[332,91],[354,91],[288,114],[310,114],[332,114],[354,114],[288,137],[310,137],[332,137],[354,137]].map(([wx,wy],i) => (
        <rect key={i} x={wx} y={wy} width="18" height="14" rx="2" fill={i % 5 === 0 ? "rgba(255,220,80,0.55)" : i % 3 === 0 ? "rgba(80,140,255,0.3)" : "rgba(25,30,50,0.95)"} />
      ))}
      {/* Storefront */}
      <rect x="90" y="138" width="190" height="39" fill="#0d1220" />
      <rect x="95" y="142" width="180" height="31" fill="rgba(255,255,255,0.04)" />
      <rect x="100" y="147" width="85" height="12" rx="2" fill="rgba(255,255,255,0.75)" />
      <rect x="100" y="162" width="58" height="5" rx="2" fill="rgba(255,255,255,0.35)" />
      {/* Awning */}
      <polygon points="90,138 280,138 275,148 95,148" fill="#1C0B62" opacity="0.8" />
      {/* Street line */}
      <rect x="190" y="183" width="20" height="40" fill="rgba(255,255,255,0.06)" />
    </svg>
  );
}

// ─── Configuration scènes ─────────────────────────────────────
const SCENES = [
  { id: "nuit",    label: "Nuit",    icon: "🌃", component: <SceneNuit /> },
  { id: "ecran",   label: "Écran",   icon: "💻", component: <SceneEcran /> },
  { id: "lecture", label: "Lecture", icon: "📖", component: <SceneLecture /> },
  { id: "jour",    label: "Extérieur", icon: "☀️", component: <SceneJour /> },
] as const;

// ─── Configuration verres ─────────────────────────────────────
const LENTILLES = [
  {
    id: "none",
    label: "Sans correction",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.35)",
    points: ["Vision floue (prescription)", "Reflets non traités", "Fatigue visuelle rapide", "Risques en conduite nocturne"],
  },
  {
    id: "essentiel",
    label: "Essentiel",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.35)",
    points: ["Vision corrigée ✓", "Légères réflexions résiduelles", "Traitement antireflet standard", "Idéal pour correction simple"],
  },
  {
    id: "confort",
    label: "Confort",
    color: "#7c5fec",
    bg: "rgba(124,95,236,0.12)",
    border: "rgba(124,95,236,0.5)",
    points: ["Vision nette HD ✓", "Antireflet avancé ✓", "Filtre lumière bleue ✓", "Confort écrans & conduite ✓"],
  },
  {
    id: "premium",
    label: "Premium",
    color: "#c084fc",
    bg: "rgba(192,132,252,0.10)",
    border: "rgba(192,132,252,0.4)",
    points: ["Vision ultra-précise ✓", "Zéro reflet ✓", "Protection UV & lumière bleue ✓", "Contraste & netteté maximaux ✓"],
  },
] as const;

type LentilleId = typeof LENTILLES[number]["id"];

// ─── Config couloir progressif ────────────────────────────────
const CORRIDORS: Record<LentilleId, { topHalf: number; botHalf: number; blur: number; opacity: number } | null> = {
  none:      null,
  essentiel: { topHalf: 10, botHalf: 18, blur: 6,   opacity: 0.55 },
  confort:   { topHalf: 16, botHalf: 27, blur: 3.5,  opacity: 0.38 },
  premium:   { topHalf: 24, botHalf: 38, blur: 1.5,  opacity: 0.15 },
};

// ─── Points mode progressif ───────────────────────────────────
const POINTS_PROGRESSIF: Record<LentilleId, string[]> = {
  none:      ["Presbytie non corrigée ✗", "Fatigue visuelle intense ✗", "Vision de près floue ✗", "Difficultés à lire ✗"],
  essentiel: ["Correction loin et près ✓", "Couloir de vision étroit", "Distorsions périphériques fortes", "Temps d'adaptation long"],
  confort:   ["Couloir intermédiaire large ✓", "Distorsions réduites ✓", "Adaptation rapide ✓", "Confort écran & lecture ✓"],
  premium:   ["Grand couloir panoramique ✓", "Distorsions quasi nulles ✓", "Adaptation naturelle ✓", "Vision loin / écran / près ✓"],
};

// ─── Overlay champs visuels progressif ───────────────────────
function ProgressiveFieldsOverlay({ topHalf, botHalf, blur, opacity }: {
  topHalf: number; botHalf: number; blur: number; opacity: number;
}) {
  const tl = 50 - topHalf;
  const tr = 50 + topHalf;
  const bl = 50 - botHalf;
  const br = 50 + botHalf;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {/* Périphérie gauche */}
      <div className="absolute inset-0" style={{
        clipPath: `polygon(0% 0%, ${tl}% 0%, ${bl}% 100%, 0% 100%)`,
        backdropFilter: `blur(${blur}px)`,
        background: `rgba(8,4,24,${opacity})`,
      }} />
      {/* Périphérie droite */}
      <div className="absolute inset-0" style={{
        clipPath: `polygon(${tr}% 0%, 100% 0%, 100% 100%, ${br}% 100%)`,
        backdropFilter: `blur(${blur}px)`,
        background: `rgba(8,4,24,${opacity})`,
      }} />
      {/* Bordures du couloir */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1={tl} y1="0" x2={bl} y2="100" stroke="rgba(251,191,36,0.55)" strokeWidth="0.35" />
        <line x1={tr} y1="0" x2={br} y2="100" stroke="rgba(251,191,36,0.55)" strokeWidth="0.35" />
      </svg>
      {/* Étiquettes zones */}
      <div className="absolute" style={{ top: "6%", left: "50%", transform: "translateX(-50%)", zIndex: 6, whiteSpace: "nowrap" }}>
        <span style={{ background: "rgba(10,3,56,0.82)", color: "rgba(155,150,218,0.95)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em" }}>LOIN</span>
      </div>
      <div className="absolute" style={{ top: "44%", left: "50%", transform: "translateX(-50%)", zIndex: 6, whiteSpace: "nowrap" }}>
        <span style={{ background: "rgba(10,3,56,0.82)", color: "rgba(155,150,218,0.95)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em" }}>INTER.</span>
      </div>
      <div className="absolute" style={{ bottom: "6%", left: "50%", transform: "translateX(-50%)", zIndex: 6, whiteSpace: "nowrap" }}>
        <span style={{ background: "rgba(10,3,56,0.82)", color: "rgba(155,150,218,0.95)", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em" }}>PRÈS</span>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────
export default function SimulateurVisionPage() {
  const router = useRouter();
  const [ordo, setOrdo] = useState<OrdoValues>({ se: -3, cyl: 1.25, add: 0, isProgressif: false, sign: "myopie", hasData: false, label: "Myopie −3.00 D (exemple)" });
  const [scene, setScene] = useState<string>("nuit");
  const [lentille, setLentille] = useState<LentilleId>("confort");
  const [modeVerre, setModeVerre] = useState<"unifocal" | "progressif">("unifocal");
  const [sliderX, setSliderX] = useState(48);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseOrdonnance();
    setOrdo(parsed);
    if (parsed.isProgressif) setModeVerre("progressif");
  }, []);

  const blurPx = getBlurPx(ordo.se);

  // Filtre AVANT (sans correction)
  const filterBefore = blurPx > 0
    ? `blur(${blurPx}px) saturate(0.72) contrast(0.8) brightness(0.82)`
    : "saturate(0.72) contrast(0.8) brightness(0.82)";

  // Filtre APRÈS selon qualité du verre
  const filterAfter: Record<LentilleId, string> = {
    none: filterBefore,
    essentiel: "none",
    confort: "saturate(1.08) contrast(1.04) brightness(1.01)",
    premium: "saturate(1.18) contrast(1.1) brightness(1.04)",
  };

  // Gestion du slider (souris + tactile)
  const handlePointerMove = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderX(Math.min(94, Math.max(6, pct)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handlePointerMove(e.clientX);
    const onTouch = (e: TouchEvent) => handlePointerMove(e.touches[0].clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handlePointerMove]);

  const currentScene = SCENES.find(s => s.id === scene)?.component;
  const selectedLentille = LENTILLES.find(l => l.id === lentille)!;
  const blurLabel = getBlurLabel(blurPx);
  const blurPct = Math.min(100, Math.round((blurPx / 30) * 100));
  const blurColor = blurPx <= 5 ? "#22c55e" : blurPx <= 12 ? "#f97316" : "#ef4444";
  const corridorConfig = modeVerre === "progressif" ? CORRIDORS[lentille] : null;
  const displayPoints = modeVerre === "progressif" ? POINTS_PROGRESSIF[lentille] : [...selectedLentille.points];

  return (
    <OpticianGuard>
      <div className="page-bg min-h-screen flex flex-col">
        <OptiPilotHeader title="Simulateur de vision" showBack onBack={() => router.back()} />

        <main className="flex-1 px-4 pb-12 pt-4 w-full max-w-2xl mx-auto flex flex-col gap-5">

          {/* ─── Carte ordonnance ─── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{
              background: ordo.hasData ? "rgba(83,49,208,0.15)" : "rgba(251,191,36,0.1)",
              border: `1.5px solid ${ordo.hasData ? "rgba(83,49,208,0.5)" : "rgba(251,191,36,0.4)"}`,
            }}
          >
            <span style={{ fontSize: 32 }}>{ordo.hasData ? "👁️" : "⚠️"}</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "#FDFDFE" }}>{ordo.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(155,150,218,0.8)" }}>
                {ordo.hasData
                  ? "Simulation calibrée sur l'ordonnance scannée"
                  : "Aucune ordonnance scannée — exemple −3.00 D utilisé"}
              </p>
            </div>
          </motion.div>

          {/* ─── Intensité de correction ─── */}
          {blurPx > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.1 } }}
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(28,11,98,0.5)", border: "1px solid rgba(83,49,208,0.25)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold" style={{ color: "#9B96DA" }}>Intensité de correction requise</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${blurColor}22`, color: blurColor }}>
                  {blurLabel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: "rgba(155,150,218,0.5)" }}>Légère</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(83,49,208,0.2)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${blurPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(to right, #22c55e, #f97316, #ef4444)` }}
                  />
                </div>
                <span className="text-xs" style={{ color: "rgba(155,150,218,0.5)" }}>Sévère</span>
              </div>
              {ordo.cyl > 0.75 && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "rgba(251,191,36,0.8)" }}>
                  <span>⚠</span>
                  <span>Astigmatisme (cyl. {ordo.cyl.toFixed(2)}) — distorsion directionnelle simulée</span>
                </p>
              )}
            </motion.div>
          )}

          {/* ─── Mode Unifocal / Progressif ─── */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "rgba(155,150,218,0.6)" }}>
              Type de verre
              {!ordo.isProgressif && <span className="ml-2 px-1.5 py-0.5 rounded" style={{ background: "rgba(83,49,208,0.2)", color: "rgba(155,150,218,0.55)", fontSize: 9, fontWeight: 600 }}>démo</span>}
              {ordo.isProgressif && <span className="ml-2 px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#86efac", fontSize: 9, fontWeight: 600 }}>détecté</span>}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["unifocal", "progressif"] as const).map(m => (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setModeVerre(m)}
                  className="py-3 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: modeVerre === m ? "rgba(83,49,208,0.32)" : "rgba(28,11,98,0.45)",
                    border: `1.5px solid ${modeVerre === m ? "rgba(83,49,208,0.75)" : "rgba(83,49,208,0.18)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{m === "unifocal" ? "🔵" : "🔶"}</span>
                  <span className="text-sm font-semibold" style={{ color: modeVerre === m ? "#FDFDFE" : "#9B96DA" }}>
                    {m === "unifocal" ? "Unifocal" : "Progressif"}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ─── Sélecteur de scène ─── */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "rgba(155,150,218,0.6)" }}>Situation</p>
            <div className="grid grid-cols-4 gap-2">
              {SCENES.map(s => (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setScene(s.id)}
                  className="py-3 rounded-xl flex flex-col items-center gap-1.5"
                  style={{
                    background: scene === s.id ? "rgba(83,49,208,0.32)" : "rgba(28,11,98,0.45)",
                    border: `1.5px solid ${scene === s.id ? "rgba(83,49,208,0.75)" : "rgba(83,49,208,0.18)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: scene === s.id ? "#FDFDFE" : "#9B96DA" }}>{s.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ─── Sélecteur de verre (APRÈS) ─── */}
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "rgba(155,150,218,0.6)" }}>Comparer avec</p>
            <div className="grid grid-cols-4 gap-2">
              {LENTILLES.map(l => (
                <motion.button
                  key={l.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setLentille(l.id)}
                  className="py-3 px-1 rounded-xl flex items-center justify-center"
                  style={{
                    background: lentille === l.id ? l.bg : "rgba(28,11,98,0.45)",
                    border: `1.5px solid ${lentille === l.id ? l.border : "rgba(83,49,208,0.18)"}`,
                    transition: "all 0.15s",
                    minHeight: 48,
                  }}
                >
                  <span className="text-xs font-bold text-center leading-tight" style={{ color: lentille === l.id ? l.color : "#9B96DA" }}>
                    {l.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ─── Slider AVANT / APRÈS ─── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid rgba(83,49,208,0.55)", boxShadow: "0 8px 48px rgba(83,49,208,0.25)" }}
            >
              {/* En-tête */}
              <div
                className="flex justify-between items-center px-4 py-2.5"
                style={{ background: "rgba(10,3,56,0.95)", borderBottom: "1px solid rgba(83,49,208,0.25)" }}
              >
                <span className="text-xs font-bold" style={{ color: "#ef4444" }}>← Sans correction</span>
                <div className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M8 4l-4 8 4 8M16 4l4 8-4 8" stroke="rgba(155,150,218,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-xs" style={{ color: "rgba(155,150,218,0.5)" }}>Glisser</span>
                </div>
                <span className="text-xs font-bold" style={{ color: selectedLentille.color }}>{selectedLentille.label} →</span>
              </div>

              {/* Zone de comparaison */}
              <div
                ref={containerRef}
                className="relative overflow-hidden select-none"
                style={{ aspectRatio: "16/10", background: "#04040e", cursor: "col-resize" }}
                onMouseDown={(e) => { setDragging(true); handlePointerMove(e.clientX); }}
                onTouchStart={(e) => { setDragging(true); handlePointerMove(e.touches[0].clientX); }}
                onClick={(e) => handlePointerMove(e.clientX)}
              >
                {/* Couche AVANT — floue, pleine largeur */}
                <div
                  className="absolute inset-0"
                  style={{ filter: filterBefore }}
                >
                  {currentScene}
                </div>

                {/* Couche APRÈS — nette, clippée à droite du slider */}
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `inset(0 0 0 ${sliderX}%)`,
                    filter: filterAfter[lentille],
                    willChange: "clip-path",
                  }}
                >
                  {currentScene}
                  {/* Reflets résiduels pour verre Essentiel */}
                  {lentille === "essentiel" && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: [
                          "radial-gradient(ellipse at 22% 18%, rgba(255,255,255,0.24) 0%, transparent 28%)",
                          "radial-gradient(ellipse at 74% 12%, rgba(200,200,255,0.18) 0%, transparent 22%)",
                          "radial-gradient(ellipse at 48% 70%, rgba(255,255,255,0.10) 0%, transparent 16%)",
                        ].join(","),
                        mixBlendMode: "screen",
                      }}
                    />
                  )}
                </div>

                {/* Champs visuels progressif — clippé côté APRÈS */}
                {corridorConfig && (
                  <div
                    className="absolute inset-0"
                    style={{ clipPath: `inset(0 0 0 ${sliderX}%)`, willChange: "clip-path" }}
                  >
                    <ProgressiveFieldsOverlay {...corridorConfig} />
                  </div>
                )}

                {/* Ligne séparatrice */}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{
                    left: `${sliderX}%`,
                    width: 2,
                    background: "rgba(255,255,255,0.95)",
                    boxShadow: "0 0 10px rgba(255,255,255,0.7)",
                  }}
                />

                {/* Poignée slider */}
                <div
                  className="absolute flex items-center justify-center rounded-full"
                  style={{
                    top: "50%",
                    left: `${sliderX}%`,
                    transform: "translate(-50%, -50%)",
                    width: 44,
                    height: 44,
                    background: "white",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.55)",
                    cursor: "col-resize",
                    zIndex: 10,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M8 4l-4 8 4 8M16 4l4 8-4 8" stroke="#5331D0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Labels flottants sur l'image */}
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg pointer-events-none" style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.4)" }}>
                  <span className="text-xs font-bold" style={{ color: "#fca5a5" }}>Avant</span>
                </div>
                <div className="absolute top-3 right-3 px-2 py-1 rounded-lg pointer-events-none" style={{ background: `${selectedLentille.bg}`, border: `1px solid ${selectedLentille.border}` }}>
                  <span className="text-xs font-bold" style={{ color: selectedLentille.color }}>Après</span>
                </div>
              </div>

              {/* Description verre sélectionné */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={lentille}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="px-5 py-4"
                  style={{ background: "rgba(10,3,56,0.9)", borderTop: "1px solid rgba(83,49,208,0.2)" }}
                >
                  <p className="text-sm font-bold mb-2.5" style={{ color: selectedLentille.color }}>
                    {selectedLentille.label === "Sans correction"
                      ? "Sans correction"
                      : `Verre ${selectedLentille.label}${modeVerre === "progressif" ? " Progressif" : ""}`}
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {displayPoints.map((p, i) => (
                      <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: p.includes("✓") ? "#86efac" : "rgba(155,150,218,0.8)" }}>
                        {p.includes("✓")
                          ? <span style={{ color: "#22c55e", flexShrink: 0 }}>✓</span>
                          : p.includes("✗")
                          ? <span style={{ color: "#ef4444", flexShrink: 0 }}>✗</span>
                          : <span style={{ color: "#9B96DA", flexShrink: 0 }}>·</span>}
                        <span>{p.replace(" ✓", "").replace(" ✗", "")}</span>
                      </p>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* ─── Mention légale simulateur ─── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.4 } }}
            className="rounded-xl px-4 py-3 flex gap-3 items-start"
            style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.18)" }}
          >
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚖️</span>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(155,150,218,0.6)" }}>
              <strong style={{ color: "rgba(251,191,36,0.75)" }}>Simulation à titre illustratif uniquement.</strong>
              {" "}La perception visuelle réelle dépend de l'adaptation individuelle, de l'anatomie oculaire, de la posture de port et du centrage des verres. Cette simulation ne se substitue pas à l'essai en magasin ni à l'avis de votre opticien diplômé.
            </p>
          </motion.div>

          {/* ─── CTA ─── */}
          <div className="flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/devis")}
              className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3"
              style={{
                background: "linear-gradient(135deg, #5331D0, #7c3aed)",
                color: "#FDFDFE",
                boxShadow: "0 6px 28px rgba(83,49,208,0.45)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Choisir cet équipement
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/comparateur")}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm"
              style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA", border: "1px solid rgba(83,49,208,0.3)" }}
            >
              Comparer les verres en détail
            </motion.button>
          </div>

        </main>
      </div>
    </OpticianGuard>
  );
}
