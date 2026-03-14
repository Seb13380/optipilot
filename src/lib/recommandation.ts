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

function getSphereMax(ordo: OrdonnanceData): number {
  return Math.max(
    Math.abs(ordo.odSphere || 0),
    Math.abs(ordo.ogSphere || 0)
  );
}

function getAdditionMax(ordo: OrdonnanceData): number {
  return Math.max(ordo.odAddition || 0, ordo.ogAddition || 0);
}

function needsProgressive(ordo: OrdonnanceData): boolean {
  return getAdditionMax(ordo) > 0;
}

function getRecommendedIndice(sphere: number): number {
  if (sphere > 6) return 1.74;
  if (sphere > 4) return 1.67;
  if (sphere > 2) return 1.6;
  return 1.5;
}

export function calculerRecommandations(
  ordo: OrdonnanceData,
  questionnaire: QuestionnaireData,
  remboursementMutuelle: { unifocal: number; progressif: number }
): RecommandationResult {
  const sphereMax = getSphereMax(ordo);
  const addition = getAdditionMax(ordo);
  const progressive = needsProgressive(ordo);
  const indiceMin = getRecommendedIndice(sphereMax);
  const tempsEcran = questionnaire.tempsEcran || 0;
  const categorie = getCategorieCorrection(ordo);

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

  // Tarifs SS réels post-réforme 100% Santé (2020) — par paire
  // Taux de remboursement SS : 60 % de la base de remboursement (LPPR)
  let secu: number;
  if (progressive) {
    secu = categorie.isForteCorrectionProgressif ? 149 : 126;
    // forte progressif : 2 × 60% × 124.30€ ≈ 149€/paire
    // faible progressif: 2 × 60% × 105€    = 126€/paire
  } else {
    secu = categorie.isForteCorrectionUnifocal ? 56 : 36;
    // forte unifocal : 2 × 60% × 46.86€ ≈ 56€/paire
    // faible unifocal: 2 × 60% × 30€    = 36€/paire
  }

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
      indice: parseFloat(Math.max(1.5, indiceMin - 0.1).toFixed(2)),
      traitement: progressive ? "antireflet_standard" : "antireflet_standard",
      classe100ps: "A",
      prixVerres: baseEssentiel,
      remboursementSecu: secu,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, baseEssentiel - secu - remboursement),
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
      indice: parseFloat(Math.max(1.6, indiceMin).toFixed(2)),
      traitement: "antireflet_premium",
      classe100ps: "B",
      prixVerres: baseConfort,
      remboursementSecu: secu,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, baseConfort - secu - remboursement),
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
      indice: parseFloat(Math.max(1.67, indiceMin + 0.07).toFixed(2)),
      traitement: "duravision_platinum",
      classe100ps: "B",
      prixVerres: basePremium,
      remboursementSecu: secu,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, basePremium - secu - remboursement),
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

  return {
    typeVerre,
    indiceMin,
    traitements,
    offres,
    argumentaireGlobal,
    secondePaire,
  };
}
