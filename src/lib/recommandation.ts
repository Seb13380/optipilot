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
  argumentaireGlobal: string;
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

  const traitements: string[] = [];
  const argumentaireGlobal: string[] = [];

  // Antireflet
  if (questionnaire.conduiteNuit) {
    traitements.push("antireflet_premium");
    argumentaireGlobal.push("Antireflet catégorie 1 recommandé pour la conduite nocturne");
  } else {
    traitements.push("antireflet_standard");
  }

  // Photochromique
  if (questionnaire.photophobie) {
    traitements.push("photochromique");
    argumentaireGlobal.push("Verres photochromiques pour soulager la sensibilité à la lumière");
  }

  // Digital / Écran
  if (tempsEcran >= 6) {
    traitements.push("filtre_bleu");
    argumentaireGlobal.push("Filtre lumière bleue recommandé : plus de 6h/j sur écran");
  }

  if (progressive && tempsEcran >= 4) {
    argumentaireGlobal.push("Progressif digital optimisé : temps écran élevé + addition");
  }

  const typeVerre = progressive ? "Progressif" : "Unifocal";
  const remboursement = progressive
    ? remboursementMutuelle.progressif
    : remboursementMutuelle.unifocal;

  // Prix de base selon type
  const baseEssentiel = progressive ? 280 : 120;
  const baseConfort = progressive ? 420 : 180;
  const basePremium = progressive ? 680 : 280;

  const secuUnifocal = 12.04;
  const secuProgressif = 32.13;
  const secu = progressive ? secuProgressif : secuUnifocal;

  const offres: OffreVerre[] = [
    {
      nom: "Essentiel",
      verrier: "Essilor",
      gamme: "Crizal Easy",
      type: typeVerre,
      indice: Math.max(1.5, indiceMin - 0.1),
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
    },
    {
      nom: "Confort",
      verrier: "Hoya",
      gamme: "Hilux 1.6",
      type: typeVerre,
      indice: Math.max(1.6, indiceMin),
      traitement: "antireflet_premium",
      classe100ps: "B",
      prixVerres: baseConfort,
      remboursementSecu: secu,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, baseConfort - secu - remboursement),
      argumentaire: [
        "✓ Indice 1.6 — plus mince et léger",
        "✓ Antireflet haute performance",
        tempsEcran >= 4 ? "✓ Filtre lumière bleue inclus" : "✓ Résistance aux rayures renforcée",
        progressive ? "✓ Progressif digital optimisé" : "✓ Vision HD ultra-précise",
        questionnaire.conduiteNuit ? "✓ Vision nocturne améliorée" : "✓ Protection UV 400",
      ],
      badge: "Recommandé",
    },
    {
      nom: "Premium",
      verrier: "Zeiss",
      gamme: progressive ? "Individual 2" : "Single Vision ClearView",
      type: typeVerre,
      indice: Math.max(1.67, indiceMin + 0.07),
      traitement: "duravision_platinum",
      classe100ps: "B",
      prixVerres: basePremium,
      remboursementSecu: secu,
      remboursementMutuelle: remboursement,
      resteACharge: Math.max(0, basePremium - secu - remboursement),
      argumentaire: [
        "✓ Technologie IA personnalisée Zeiss",
        progressive ? "✓ Progressif calculé sur mesure" : "✓ Vision maximale sur toute la surface",
        "✓ Duravision Platinum — ultra résistant",
        questionnaire.photophobie ? "✓ Photochromique PhotoFusion inclus" : "✓ Antireflet platinium",
        "✓ Garantie 2 ans casse et rayure",
      ],
    },
  ];

  return {
    typeVerre,
    indiceMin,
    traitements,
    offres,
    argumentaireGlobal: argumentaireGlobal.join(" | "),
  };
}
