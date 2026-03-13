// ─── Analyse clinique d'une ordonnance optique ───────────────────────────────
// Seuils basés sur les standards de l'optométrie française (HAS / SNOF)

export interface AnalyseOrdonnance {
  typeCorrection: string;         // ex: "Astigmatisme myopique bilatéral"
  intensite: string;              // ex: "moyenne" | "forte"
  intensiteLabel: string;         // ex: "Correction moyenne"
  presbytie: null | "débutante" | "confirmée" | "avancée";
  indiceRecommande: string;       // ex: "1.6 ou supérieur"
  typeVerre: "unifocal" | "progressif";
  message: string;                // Message naturel à afficher à l'opticien
  details: string[];              // Bullet points supplémentaires
  couleur: string;                // couleur d'accentuation selon intensité
}

function abs(v: string | undefined): number {
  const n = parseFloat(v || "0");
  return Math.abs(isNaN(n) ? 0 : n);
}
function val(v: string | undefined): number {
  const n = parseFloat(v || "0");
  return isNaN(n) ? 0 : n;
}

// Intensité de la myopie/hypermétropie (valeur absolue de la sphère)
function intensiteSphere(maxAbs: number, type: "myopie" | "hypermétropie"): "légère" | "modérée" | "forte" {
  if (type === "myopie") {
    if (maxAbs <= 3) return "légère";
    if (maxAbs <= 6) return "modérée";
    return "forte";
  } else {
    if (maxAbs <= 2) return "légère";
    if (maxAbs <= 4) return "modérée";
    return "forte";
  }
}

// Intensité de l'astigmatisme (valeur absolue du cylindre)
function intensiteAstigmatisme(maxAbs: number): "léger" | "modéré" | "fort" {
  if (maxAbs <= 1) return "léger";
  if (maxAbs <= 2) return "modéré";
  return "fort";
}

// Presbytie d'après l'addition
function classerPresbyti(add: number): null | "débutante" | "confirmée" | "avancée" {
  if (add < 0.75) return null;
  if (add < 1.5) return "débutante";
  if (add < 2.5) return "confirmée";
  return "avancée";
}

// Indice recommandé selon la correction maximale
function indiceRecommande(maxSphereAbs: number, maxCylAbs: number): string {
  const total = maxSphereAbs + maxCylAbs * 0.5;
  if (total < 2) return "1.5 (standard)";
  if (total < 4) return "1.6 (verres fins recommandés)";
  if (total < 6) return "1.67 (verres ultra-fins fortement recommandés)";
  return "1.74 (verres ultra-fins obligatoires)";
}

export function analyserOrdonnance(
  ordo: {
    civilite?: string;
    prenomPatient?: string;
    nomPatient?: string;
    odSphere?: string;
    odCylindre?: string;
    ogSphere?: string;
    ogCylindre?: string;
    odAddition?: string;
    ogAddition?: string;
  }
): AnalyseOrdonnance {
  const odS = val(ordo.odSphere);
  const ogS = val(ordo.ogSphere);
  const odC = abs(ordo.odCylindre);
  const ogC = abs(ordo.ogCylindre);
  const addition = Math.max(val(ordo.odAddition), val(ordo.ogAddition));

  const hasAstig = odC >= 0.75 || ogC >= 0.75;
  const maxCyl = Math.max(odC, ogC);
  const maxSphereAbs = Math.max(abs(ordo.odSphere), abs(ordo.ogSphere));

  // ─── Type de correction ───────────────────────────────────────────────────
  let typeCorrection = "";
  let intensite: "légère" | "modérée" | "forte" = "légère";
  let intensiteLabel = "";

  const bothNeg = odS < -0.25 && ogS < -0.25;
  const bothPos = odS > 0.25 && ogS > 0.25;
  const oneNegOnePos = (odS < -0.25 && ogS > 0.25) || (odS > 0.25 && ogS < -0.25);

  if (oneNegOnePos) {
    // Astigmatisme mixte ou anisométropie
    typeCorrection = hasAstig ? "Astigmatisme mixte avec anisométropie" : "Anisométropie";
    intensite = maxSphereAbs >= 3 ? "forte" : maxSphereAbs >= 1.5 ? "modérée" : "légère";
  } else if (bothNeg) {
    intensite = intensiteSphere(maxSphereAbs, "myopie");
    if (hasAstig) {
      typeCorrection = `Astigmatisme myopique bilatéral`;
    } else {
      typeCorrection = "Myopie bilatérale";
    }
  } else if (bothPos) {
    intensite = intensiteSphere(maxSphereAbs, "hypermétropie");
    if (hasAstig) {
      typeCorrection = `Astigmatisme hypermétropique bilatéral`;
    } else {
      typeCorrection = "Hypermétropie bilatérale";
    }
  } else if (odS < -0.25 || ogS < -0.25) {
    // Un seul œil myope
    intensite = intensiteSphere(maxSphereAbs, "myopie");
    typeCorrection = hasAstig ? "Astigmatisme myopique" : "Myopie unilatérale";
  } else if (odS > 0.25 || ogS > 0.25) {
    intensite = intensiteSphere(maxSphereAbs, "hypermétropie");
    typeCorrection = hasAstig ? "Astigmatisme hypermétropique" : "Hypermétropie";
  } else if (hasAstig) {
    // Sphère nulle mais cylindre présent
    const astigInt = intensiteAstigmatisme(maxCyl);
    typeCorrection = "Astigmatisme pur";
    intensite = astigInt === "fort" ? "forte" : astigInt === "modéré" ? "modérée" : "légère";
  } else {
    // Aucune correction significative
    typeCorrection = "Correction faible";
    intensite = "légère";
  }

  // Surcharger intensité si astigmatisme fort
  if (hasAstig && intensiteAstigmatisme(maxCyl) === "fort" && intensite === "légère") {
    intensite = "modérée";
  }

  switch (intensite) {
    case "légère":   intensiteLabel = "Correction légère"; break;
    case "modérée":  intensiteLabel = "Correction modérée"; break;
    case "forte":    intensiteLabel = "Correction forte"; break;
  }

  // ─── Presbytie ─────────────────────────────────────────────────────────────
  const presbytie = classerPresbyti(addition);
  const typeVerre: "unifocal" | "progressif" = presbytie !== null ? "progressif" : "unifocal";

  // ─── Indice recommandé ─────────────────────────────────────────────────────
  const indice = indiceRecommande(maxSphereAbs, maxCyl);

  // ─── Message naturel ───────────────────────────────────────────────────────
  const prenom = ordo.prenomPatient?.trim();
  const nom = ordo.nomPatient?.trim();
  const civ = ordo.civilite?.trim() || "";
  const appelPatient = prenom || nom
    ? `${civ ? civ + " " : ""}${[prenom, nom].filter(Boolean).join(" ")}`
    : null;

  let message = "";
  if (appelPatient) {
    message += `${appelPatient}, votre ordonnance présente `;
  } else {
    message += "Cette ordonnance présente ";
  }

  message += `une **${typeCorrection.toLowerCase()}** d'intensité **${intensite}**`;

  if (presbytie) {
    const ages: Record<string, string> = {
      débutante: "débuts de presbytie (vers 40-45 ans)",
      confirmée: "presbytie confirmée",
      avancée: "presbytie avancée",
    };
    message += `, avec des **${ages[presbytie]}**`;
  }

  message += ".";

  // ─── Bullet détails ────────────────────────────────────────────────────────
  const details: string[] = [];

  if (hasAstig) {
    const ai = intensiteAstigmatisme(maxCyl);
    details.push(`Astigmatisme ${ai} (cylindre max ${maxCyl.toFixed(2)} D) — les axes OD/OG doivent être respectés à la pose`);
  }

  if (typeVerre === "progressif") {
    const presLabels: Record<string, string> = {
      débutante: "Addition faible (+0.75 à +1.50) — progressif de première équipement",
      confirmée: "Addition moyenne (+1.50 à +2.50) — progressif standard",
      avancée: "Addition forte (> +2.50) — progressif spécialisé",
    };
    details.push(presLabels[presbytie!]);
  }

  if (intensite === "forte") {
    details.push("Forte correction : indice élevé indispensable pour des verres fins et légers");
  }

  if (oneNegOnePos) {
    details.push("Anisométropie : différence significative entre les deux yeux — adaptation progressive possible");
  }

  if (maxSphereAbs >= 6) {
    details.push("Correction très forte : vérifier la tolérance en progressif, unifocal possible en alternative");
  }

  // Couleur selon intensité
  const couleur = intensite === "forte" ? "#f472b6" : intensite === "modérée" ? "#c084fc" : "#9B96DA";

  return {
    typeCorrection,
    intensite,
    intensiteLabel,
    presbytie,
    indiceRecommande: indice,
    typeVerre,
    message,
    details,
    couleur,
  };
}
