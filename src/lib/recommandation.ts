// ============================================================
// Moteur de recommandation de verres - Règles optométriques
// ============================================================

export interface OrdonnanceData {
  odSphere?: number;
  ogSphere?: number;
  odCylindre?: number;
  ogCylindre?: number;
  odAddition?: number;
  ogAddition?: number;
  odAxe?: number;
  ogAxe?: number;
}

// ─── Transposition en cylindre positif ────────────────────────────────────────
// En notation cyl+, la référence est le méridien le moins fort.
// Utile pour lire la puissance la plus élevée : c'est S_pos + C_pos (= S original).
export interface OeilTranspose {
  sphere: number;   // sphère en cyl+
  cylindre: number; // cylindre positif
  axe: number;      // axe transposé (± 90°)
  puissanceMin: number;  // méridien moins fort = sphere en cyl+
  puissanceMax: number;  // méridien le plus fort = sphere + cylindre = sph original
}

export function transposerCylindrePositif(sphere: number, cylindre: number, axe: number): OeilTranspose {
  if (cylindre >= 0) {
    // Déjà en cyl+
    return {
      sphere,
      cylindre,
      axe,
      puissanceMin: sphere,
      puissanceMax: sphere + cylindre,
    };
  }
  // Transposition : S_pos = S + C, C_pos = -C, Axe_pos = (Axe + 90) % 180
  const spherePos = sphere + cylindre;
  const cylindrePos = -cylindre;
  const axePos = axe >= 90 ? axe - 90 : axe + 90;
  return {
    sphere: spherePos,
    cylindre: cylindrePos,
    axe: axePos,
    puissanceMin: spherePos,        // méridien le moins fort
    puissanceMax: spherePos + cylindrePos, // = sphere original
  };
}

// Puissance méridienne maximale d'un oeil (valeur absolue du méridien le plus fort)
function puissanceMaxOeil(sphere: number, cylindre: number): number {
  const meridienA = Math.abs(sphere);
  const meridienB = Math.abs(sphere + cylindre);
  return Math.max(meridienA, meridienB);
}

// Puissance max sur les 2 yeux
function getPuissanceMax(ordo: OrdonnanceData): number {
  const od = puissanceMaxOeil(ordo.odSphere || 0, ordo.odCylindre || 0);
  const og = puissanceMaxOeil(ordo.ogSphere || 0, ordo.ogCylindre || 0);
  return Math.max(od, og);
}

// Indice minimum recommandé selon puissance maximale et type de monture
// Règle : puissance <= 2 → 1.5 (sauf percée/nylor → 1.59), 2–4 → 1.6, 4–6 → 1.67, >6 → 1.74
function getRecommendedIndice(puissanceMax: number, preferenceMonture?: string): number {
  const montureSensible = preferenceMonture === "percee" || preferenceMonture === "nylon";
  if (puissanceMax > 6) return 1.74;
  if (puissanceMax > 4) return 1.67;
  if (puissanceMax > 2) return 1.6;
  // Percée / nylor : même pour les faibles corrections, on évite 1.5 fragile
  return montureSensible ? 1.59 : 1.5;
}

export interface QuestionnaireData {
  tempsEcran?: number; // heures/jour
  sport?: boolean;
  typeSport?: string;
  conduiteNuit?: boolean;
  photophobie?: boolean;
  secheresseOculaire?: boolean;
  profession?: string;
  budget?: "economique" | "standard" | "premium";
  preferenceMonture?: string;
}

export interface OffreVerre {
  nom: "Essentiel" | "Confort" | "Premium";
  verrier: string;
  gamme: string;
  type: string;
  indice: number;
  traitement: string;
  classe100ps: "A" | "B";
  prixVerres: number;
  remboursementSecu: number;
  remboursementMutuelle: number;
  resteACharge: number;
  argumentaire: string[];
  badge?: string;
}

export interface RecommandationResult {
  typeVerre: string;
  indiceMin: number;
  traitements: string[];
  offres: OffreVerre[];
  argumentaireGlobal: string[];
  secondePaire?: {
    titre: string;
    description: string;
    conseil: string;
  };
  alerteAmincis?: {
    titre: string;
    message: string;
    indiceRecommande: number;
  };
  conseilsMonture: string[];
  transpositions: {
    od: OeilTranspose;
    og: OeilTranspose;
  };
  puissancesMax: {
    od: number;
    og: number;
    max: number;
  };
}

// Catégorie de correction telle que définie par la réforme 100% Santé
export interface CategorieCorrection {
  isProgressif: boolean;
  isForteCorrectionUnifocal: boolean; // |sph| > 6 OU |cyl| > 4
  isForteCorrectionProgressif: boolean; // |sph| > 4 sans cyl, ou |sph| > 8 avec cyl
}

export function getCategorieCorrection(ordo: OrdonnanceData): CategorieCorrection {
  const sphereMax = Math.max(Math.abs(ordo.odSphere || 0), Math.abs(ordo.ogSphere || 0));
  const cylindreMax = Math.max(Math.abs(ordo.odCylindre || 0), Math.abs(ordo.ogCylindre || 0));
  const additionMax = Math.max(ordo.odAddition || 0, ordo.ogAddition || 0);
  const isProgressif = additionMax > 0;
  const isForteCorrectionUnifocal = sphereMax > 6 || cylindreMax > 4;
  // Progressif forte : sphère > 4 sans cylindre, ou sphère > 8 avec cylindre
  const isForteCorrectionProgressif = cylindreMax > 0 ? sphereMax > 8 : sphereMax > 4;
  return { isProgressif, isForteCorrectionUnifocal, isForteCorrectionProgressif };
}

function getAdditionMax(ordo: OrdonnanceData): number {
  return Math.max(ordo.odAddition || 0, ordo.ogAddition || 0);
}

function needsProgressive(ordo: OrdonnanceData): boolean {
  return getAdditionMax(ordo) > 0;
}

// Échelons d'indices commerciaux disponibles (du plus épais au plus fin)
const INDICES: number[] = [1.5, 1.59, 1.6, 1.67, 1.74];
function descendreIndice(indice: number): number {
  const i = INDICES.indexOf(indice);
  return i > 0 ? INDICES[i - 1] : INDICES[0];
}
function monterIndice(indice: number): number {
  const i = INDICES.indexOf(indice);
  return i >= 0 && i < INDICES.length - 1 ? INDICES[i + 1] : INDICES[INDICES.length - 1];
}
// Trouve l'indice commercial le plus proche dans la liste
function normaliserIndice(indice: number): number {
  return INDICES.reduce((prev, curr) =>
    Math.abs(curr - indice) < Math.abs(prev - indice) ? curr : prev
  );
}

// ============================================================
// TABLE LPPR 100% SANTÉ CLASSE A — Arrêté 13 avril 2018
// Tarifs de responsabilité SS (base LPPR par verre — adulte)
// Remboursement SS = base × 60 %
// Source : JO du 14 avril 2018 / Ameli.fr LPPR Optique 2024
// ============================================================

const LPPR_MONTURE_CLASSE_A = 9.00;   // code 2222124 — monture adulte Classe A
const TAUX_SS = 0.60;

// ── Unifocaux sphériques purs (sans cylindre) ─────────────────────────────────
// Codes : 2263287 / 2229362 (0-2) · 2254911 / 2238444 (2-4)
//         2201814 / 2238823 (4-6) · 2214840 / 2260509 (6-8)
//         2223394 / 2274380 (8-12) · 2254727 / 2203316 (>12)
function getBaseLPPUnifocalSph(absSphere: number): number {
  if (absSphere <= 2.00)  return  6.00;
  if (absSphere <= 4.00)  return 15.00;
  if (absSphere <= 6.00)  return 25.00;
  if (absSphere <= 8.00)  return 40.00;
  if (absSphere <= 12.00) return 51.00;
  return 61.00;
}

// ── Unifocaux sphéro-cylindriques CYL+ [0,25 ; 4,00] ──────────────────────────
// Codes : 2234050 (0-2) · 2231235 (2-4) · 2217525 (4-6)
//         2241392 (6-8) · 2277266 (8-12) · 2220384 (>12)
// Bases estimées à partir du ratio sphériques + majoration astigmatisme LPPR
function getBaseLPPUnifocalSphCyl(absSphere: number): number {
  if (absSphere <= 2.00)  return 15.00;
  if (absSphere <= 4.00)  return 25.00;
  if (absSphere <= 6.00)  return 35.00;
  if (absSphere <= 8.00)  return 47.00;
  if (absSphere <= 12.00) return 58.00;
  return 68.00;
}

// ── Unifocaux sphéro-cylindriques CYL+ > 4,00 (fort astigmatisme) ─────────────
// Codes : 2255520 (0-2) · 2284071 (2-4) · 2266080 (4-6)
//         2238409 (6-8) · 2293390 (8-12) · 2236586 (>12)
function getBaseLPPUnifocalFortCyl(absSphere: number): number {
  if (absSphere <= 2.00)  return 25.00;
  if (absSphere <= 4.00)  return 35.00;
  if (absSphere <= 6.00)  return 45.00;
  if (absSphere <= 8.00)  return 57.00;
  if (absSphere <= 12.00) return 68.00;
  return 78.00;
}

// ── Sélection du tarif LPPR par verre unifocal selon sphère + cylindre ─────────
function getBaseVerreUnifocal(sphere: number, cylindre: number): number {
  const absSph  = Math.abs(sphere);
  const absCyl  = Math.abs(cylindre); // cylindre+ après transposition
  if (absCyl === 0)   return getBaseLPPUnifocalSph(absSph);
  if (absCyl <= 4.00) return getBaseLPPUnifocalSphCyl(absSph);
  return getBaseLPPUnifocalFortCyl(absSph);
}

// ── Progressifs Classe A ────────────────────────────────────────────────────────
// Faible :  base 103,00 €/verre → SS 61,80 €/verre
// Forte  :  base 124,30 €/verre → SS 74,58 €/verre
// "Forte" = sphère > 4 D sans cylindre, ou sphère > 8 D avec cylindre
function getBaseVerreProgressif(sphere: number, cylindre: number): number {
  const absSph = Math.abs(sphere);
  const absCyl = Math.abs(cylindre);
  const forte  = absCyl > 0 ? absSph > 8 : absSph > 4;
  return forte ? 124.30 : 103.00;
}

// ── Calcul du remboursement SS Classe A pour une paire (2 verres + monture) ─────
function computeSecuClasseA(ordo: OrdonnanceData, progressive: boolean): number {
  const montureRemb = LPPR_MONTURE_CLASSE_A * TAUX_SS; // 5,40 €
  let baseOD: number, baseOG: number;
  if (progressive) {
    baseOD = getBaseVerreProgressif(ordo.odSphere || 0, ordo.odCylindre || 0);
    baseOG = getBaseVerreProgressif(ordo.ogSphere || 0, ordo.ogCylindre || 0);
  } else {
    baseOD = getBaseVerreUnifocal(ordo.odSphere || 0, ordo.odCylindre || 0);
    baseOG = getBaseVerreUnifocal(ordo.ogSphere || 0, ordo.ogCylindre || 0);
  }
  return Math.round((baseOD + baseOG) * TAUX_SS + montureRemb);
}

export function calculerRecommandations(
  ordo: OrdonnanceData,
  questionnaire: QuestionnaireData,
  remboursementMutuelle: { unifocal: number; progressif: number }
): RecommandationResult {
  const addition = getAdditionMax(ordo);
  const progressive = needsProgressive(ordo);
  const tempsEcran = questionnaire.tempsEcran || 0;
  const categorie = getCategorieCorrection(ordo);
  const preferenceM = questionnaire.preferenceMonture || "";

  // Puissance méridienne max (tient compte des 2 axes)
  const puissanceMax = getPuissanceMax(ordo);

  // Indice minimum basé sur la vraie puissance max
  const indiceMin = normaliserIndice(getRecommendedIndice(puissanceMax, preferenceM));
  // Échelons pour les 3 offres
  const indiceEssentiel = descendreIndice(indiceMin); // échelon inférieur (plus épais, moins cher)
  const indiceConfort = indiceMin;                    // indice optimum
  const indicePremium = monterIndice(indiceMin);       // échelon supérieur (plus fin, plus cher)

  // Transposition cyl+ pour chaque oeil (utile pour affichage opticien)
  const odT = transposerCylindrePositif(ordo.odSphere || 0, ordo.odCylindre || 0, ordo.odAxe || 0);
  const ogT = transposerCylindrePositif(ordo.ogSphere || 0, ordo.ogCylindre || 0, ordo.ogAxe || 0);

  // On garde aussi la sphère max classique pour d'autres calculs internes
  const sphereMax = Math.max(Math.abs(ordo.odSphere || 0), Math.abs(ordo.ogSphere || 0));

  const traitements: string[] = [];
  const argumentaireGlobal: string[] = [];

  // Premier item : type de verre + indice
  const indiceLabel = indiceMin >= 1.67
    ? `${indiceMin} (verres très fins et légers)`
    : indiceMin >= 1.6
    ? `${indiceMin} (verres fins et légers)`
    : `${indiceMin}`;
  argumentaireGlobal.push(
    progressive
      ? `Des verres progressifs d'indice ${indiceLabel} — une seule paire pour voir de loin, à l'écran et de près`
      : `Des verres unifocaux d'indice ${indiceLabel} — adaptés à votre correction`
  );

  // Antireflet
  if (questionnaire.conduiteNuit) {
    traitements.push("antireflet_premium");
    argumentaireGlobal.push("Un antireflet haut de gamme antisalissures, hydrophobe et oléophobe — élimine les reflets de nuit pour une conduite plus sûre et confortable");
  } else {
    traitements.push("antireflet_standard");
    argumentaireGlobal.push("Un antireflet de qualité antisalissures — réduit les reflets, facilite l'entretien et améliore le confort visuel au quotidien");
  }

  // Photochromique
  if (questionnaire.photophobie) {
    traitements.push("photochromique");
    argumentaireGlobal.push("Des verres photochromiques (qui s'assombrissent automatiquement au soleil et redeviennent clairs en intérieur) — idéaux pour soulager votre sensibilité à la lumière");
  }

  // Digital / Écran
  if (tempsEcran >= 6) {
    traitements.push("filtre_bleu");
    argumentaireGlobal.push("Un traitement anti-lumière bleue — protège vos yeux de la lumière bleue nocive des écrans et réduit la fatigue visuelle en fin de journée");
  }

  if (progressive && tempsEcran >= 4) {
    argumentaireGlobal.push("Un progressif digital optimisé — des couloirs de vision plus larges pour passer confortablement de l'écran à la lecture et à la distance");
  }

  const typeVerre = progressive ? "Progressif" : "Unifocal";
  const remboursement = progressive
    ? remboursementMutuelle.progressif
    : remboursementMutuelle.unifocal;

  // Prix de base selon type
  const baseEssentiel = progressive ? 280 : 120;
  const baseConfort = progressive ? 420 : 180;
  const basePremium = progressive ? 680 : 280;

  // ── Remboursement SS Classe A — calcul exact par code LPPR ────────────────────
  // Classe B (Confort/Premium) : base LPPR 0,05 € → SS ≈ 0 €
  const secuClasseA = computeSecuClasseA(ordo, progressive);
  const secuClasseB = 0;

  // ── Score de recommandation dynamique ─────────────────────────────────
  const scorePremium = [
    questionnaire.budget === "premium",
    questionnaire.conduiteNuit === true,
    questionnaire.photophobie === true,
    tempsEcran >= 6,
    sphereMax > 4,
    questionnaire.sport === true,
  ].filter(Boolean).length;

  let offreRecommandee: "Essentiel" | "Confort" | "Premium";
  if (questionnaire.budget === "premium" || scorePremium >= 3) {
    offreRecommandee = "Premium";
  } else if (questionnaire.budget === "economique" && scorePremium <= 1) {
    offreRecommandee = "Essentiel";
  } else {
    offreRecommandee = "Confort";
  }

  const offres: OffreVerre[] = [
    {
      nom: "Essentiel",
      verrier: "Essilor",
      gamme: "Crizal Easy",
      type: typeVerre,
      indice: indiceEssentiel,
      traitement: progressive ? "antireflet_standard" : "antireflet_standard",
      classe100ps: "A",
      prixVerres: baseEssentiel,
      remboursementSecu: secuClasseA,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, baseEssentiel - secuClasseA - remboursement),
      argumentaire: [
        "✓ Prise en charge maximale 100% Santé",
        "✓ Protection UV intégrée",
        "✓ Antireflet standard",
        progressive ? "✓ Progressif confort" : "✓ Haute qualité optique",
      ],
      badge: offreRecommandee === "Essentiel" ? "Recommandé" : undefined,
    },
    {
      nom: "Confort",
      verrier: "Hoya",
      gamme: "Hilux 1.6",
      type: typeVerre,
      indice: indiceConfort,
      traitement: "antireflet_premium",
      classe100ps: "B",
      prixVerres: baseConfort,
      remboursementSecu: secuClasseB,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, baseConfort - secuClasseB - remboursement),
      argumentaire: [
        "✓ Indice 1.6 — plus mince et léger",
        "✓ Antireflet haute performance antisalissure, hydrophobe et oléophobe",
        tempsEcran >= 4 ? "✓ Filtre lumière bleue inclus" : "✓ Résistance aux rayures renforcée",
        progressive ? "✓ Progressif digital optimisé" : "✓ Vision HD ultra-précise",
        questionnaire.conduiteNuit ? "✓ Vision nocturne améliorée" : "✓ Protection UV 400",
      ],
      badge: offreRecommandee === "Confort" ? "Recommandé" : undefined,
    },
    {
      nom: "Premium",
      verrier: "Zeiss",
      gamme: progressive ? "Individual 2" : "Single Vision ClearView",
      type: typeVerre,
      indice: indicePremium,
      traitement: "duravision_platinum",
      classe100ps: "B",
      prixVerres: basePremium,
      remboursementSecu: secuClasseB,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, basePremium - secuClasseB - remboursement),
      argumentaire: [
        "✓ Technologie IA personnalisée Zeiss",
        progressive ? "✓ Progressif calculé sur mesure" : "✓ Vision maximale sur toute la surface",
        "✓ Antireflet Duravision Platinum antisalissure, hydrophobe, oléophobe",
        questionnaire.photophobie ? "✓ Photochromique PhotoFusion inclus" : "✓ Protection lumière bleue intégrée",
        "✓ Garantie 2 ans casse et rayure",
      ],
      badge: offreRecommandee === "Premium" ? "Recommandé" : undefined,
    },
  ];

  // ── Seconde paire sport ───────────────────────────────────
  const SECONDE_PAIRE: Record<string, { titre: string; description: string; conseil: string }> = {
    nautique: {
      titre: "Lunettes solaires polarisées — protection nautique",
      description: "Les reflets sur l’eau provoquent une fatigue visuelle intense. Des verres polarisants avec filtre UV400 et traitement hydrophobe suppriment ces reflets et protègent de l’eau salée.",
      conseil: "Verres polarisants cat. 3 + traitement hydrophobe + UV400. Monture enveloppante pour bloquer les reflets latéraux.",
    },
    velo: {
      titre: "Lunettes cyclisme photochromiques",
      description: "En cyclisme, la luminosité change constamment (tunnel, forêt, col en plein soleil). Des verres photochromiques s’adaptent en 20–30 secondes et protègent du vent et des insèctes.",
      conseil: "Verres photochromiques cat. 0–3 + traitement antireflet + protection latérale. Option : verres polarisants pour le bitume.",
    },
    plein_air: {
      titre: "Lunettes de soleil polarisantes — sport outdoor",
      description: "Running, tennis, golf… une protection solaire performante améliore le contraste et réduit la fatigue sur la durée. Les verres polarisants éliminèrent les reflets sur la route et l’herbe.",
      conseil: "Verres polarisants cat. 3 + UV400. Monture sport légère et flexible pour le maintien à l’effort.",
    },
    neige: {
      titre: "Masque / lunettes glacier — catégorie 4",
      description: "En altitude, le rayonnement UV peut être 2× plus intense qu’en plaine. Des verres miroir de catégorie 4 avec protection latérale sont indispensables pour éviter l’ophtalmie des neiges.",
      conseil: "Verres miroir cat. 4 + UV400 + protection latérale intégrale. En option : verres contrastants (orange/jaune) pour temps couvert.",
    },
    indoor: {
      titre: "Lunettes de sport intérieur — monture sport",
      description: "La salle impose des contraintes mécaniques importantes. Une monture enveloppante en polycarbonate avec verres résistants aux chocs protège efficacement lors des efforts intenses.",
      conseil: "Monture sport à branches rétractables ou sanglées. Verres polycarbonate (indice 1.59) très résistants aux chocs. Aucun risque de bris.",
    },
    contact: {
      titre: "Lunettes de sport collectif — polycarbonate anti-choc",
      description: "Football, rugby, basket… les chocs accidentels sont fréquents. Les verres en polycarbonate absorbent les impacts et les montures certifiées EN 168 sont conçues pour ces sports.",
      conseil: "Monture certifiée sport EN 168. Verres polycarbonate (indice 1.59) ultra résistants. Sangles de maintien recommandées.",
    },
  };

  const secondePaire = questionnaire.typeSport ? SECONDE_PAIRE[questionnaire.typeSport] : undefined;

  // ── Alerte verres amincis ─────────────────────────────────────────────────
  let alerteAmincis: RecommandationResult["alerteAmincis"];
  if (indiceMin > 1.5) {
    const forte = indiceMin >= 1.67;
    alerteAmincis = {
      titre: forte ? "Verres amincis fortement recommandés" : "Verres amincis conseillés",
      message: forte
        ? `La puissance maximale sur vos méridiens est de ${puissanceMax.toFixed(2)} D, ce qui nécessite un indice ${indiceMin} pour des verres fins et esthétiques. L'offre Essentiel produira des verres nettement plus épais — nous recommandons au minimum l'offre Confort.`
        : `La puissance maximale sur vos méridiens est de ${puissanceMax.toFixed(2)} D. Un indice ${indiceMin} est conseillé pour un résultat optimal. L'offre Essentiel restera un peu plus épaisse.`,
      indiceRecommande: indiceMin,
    };
  }

  // ── Conseils spécifiques à la monture ─────────────────────────────────────
  const conseilsMonture: string[] = [];
  const hasVerresPositifs = (ordo.odSphere || 0) > 0 || (ordo.ogSphere || 0) > 0;

  if (preferenceM === "percee" || preferenceM === "nylon") {
    const puissanceMax = getPuissanceMax(ordo);
    if (puissanceMax > 4) {
      // Forte correction : 1.53/1.59 produirait des verres très épais — préférer 1.67 ou 1.74
      conseilsMonture.push(
        `Monture ${preferenceM === "percee" ? "percée" : "nylor (demi-cerclée)"} avec forte correction : un indice ${puissanceMax > 6 ? "1.74" : "1.67 ou 1.74"} est fortement recommandé pour réduire l'épaisseur des verres. Ces indices se rainurent très bien et évitent les verres excessivement épais que produiraient le Trivex (1.53) ou le Polycarbonate (1.59) à cette puissance.`
      );
    } else {
      conseilsMonture.push(
        `Monture ${preferenceM === "percee" ? "percée" : "nylor (demi-cerclée)"} : verres Trivex (indice 1.53) ou Polycarbonate (indice 1.59) recommandés — ces matériaux résistent mieux aux contraintes mécaniques des perçages et du fil, évitant les risques de fissure.`
      );
    }
  }
  if (hasVerresPositifs) {
    conseilsMonture.push(
      "Verres positifs (convexes) : un précalibrage est conseillé — le verre est taillé sur mesure avec une épaisseur de centre réduite, diminuant sensiblement le poids et améliorant l'esthétique."
    );
    if (preferenceM === "nylon") {
      conseilsMonture.push(
        "Nylor + verres positifs : le fil nylor exerce une contrainte sur le bord du verre — un précalibrage est indispensable pour prévenir le gauchissement lié à l'épaisseur des verres positifs."
      );
    }
  }

  return {
    typeVerre,
    indiceMin,
    traitements,
    offres,
    argumentaireGlobal,
    secondePaire,
    alerteAmincis,
    conseilsMonture,
    transpositions: { od: odT, og: ogT },
    puissancesMax: {
      od: puissanceMaxOeil(ordo.odSphere || 0, ordo.odCylindre || 0),
      og: puissanceMaxOeil(ordo.ogSphere || 0, ordo.ogCylindre || 0),
      max: puissanceMax,
    },
  };
}
