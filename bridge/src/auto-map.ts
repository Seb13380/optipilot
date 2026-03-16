import fs from "fs";
import path from "path";

// ── Schéma résolu — même forme que SCHEMA dans schema-map.ts ─────────────────
export interface SchemaMap {
  clients: {
    table: string; id: string; civilite: string; nom: string; prenom: string;
    telephone: string; email: string; dateNaissance: string;
    mutuelle: string; numeroMutuelle: string;
  };
  ordonnances: {
    table: string; id: string; idClient: string; prescripteur: string;
    dateOrdonnance: string;
    odSphere: string; odCylindre: string; odAxe: string; odAddition: string;
    ogSphere: string; ogCylindre: string; ogAxe: string; ogAddition: string;
    ecartPupillaire: string;
  };
  devis: {
    table: string; id: string; idClient: string; idOrdonnance: string;
    dateDevis: string; statut: string;
    verrierNom: string; verrierGamme: string; verrierIndice: string; verrierClasse: string;
    prixVerres: string; montureNom: string; prixMonture: string; prixTotal: string;
    remboursementSS: string; remboursementMutuelle: string; resteACharge: string;
    offreNom: string; originOptiPilot: string;
  };
  cotations: {
    table: string; id: string; idDevis: string; dateReponse: string; statut: string;
    montantSS: string; montantMutuelle: string; resteACharge: string; detail: string;
  };
  reglements: {
    table: string; id: string; idDevis: string; organisme: string; montant: string;
    dateReglement: string; statut: string; motifRejet: string; reference: string;
  };
  montures: {
    table: string; id: string; reference: string; codeEAN: string;
    marque: string; modele: string; couleur: string; matiere: string;
    genre: string; taille: string; prixVente: string; prixAchat: string;
    quantiteStock: string; imageUrl: string; categorie: string;
  };
}

export interface TableInfo {
  table: string;
  columns: string[];
}

// ── Résultat de la détection ──────────────────────────────────────────────────
export interface DetectionResult {
  schema: SchemaMap;
  // Score de confiance 0-100 pour chaque section
  confidence: { clients: number; ordonnances: number; devis: number; cotations: number; montures: number };
  // Champs dont la correspondance est incertaine (score bas)
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Chemin du fichier d'override (à la racine du dossier bridge)
// En production compilé : __dirname = bridge/dist/src → ../../ = bridge/
// ─────────────────────────────────────────────────────────────────────────────
const OVERRIDE_PATH = path.join(__dirname, "../../schema-override.json");

// ── Helpers de matching ───────────────────────────────────────────────────────

/** Cherche la première colonne dont le nom contient l'un des mots-clés (exacts d'abord, puis partiel). */
function matchCol(cols: string[], ...groups: string[][]): string {
  for (const group of groups) {
    // Correspondance exacte (insensible à la casse)
    for (const kw of group) {
      const found = cols.find(c => c.toUpperCase() === kw.toUpperCase());
      if (found) return found;
    }
    // Correspondance partielle
    for (const kw of group) {
      const found = cols.find(c => c.toUpperCase().includes(kw.toUpperCase()));
      if (found) return found;
    }
  }
  return cols[0] ?? "COLONNE_INCONNUE";
}

/** Score une table pour un concept donné : nb de mots-clés présents dans son nom. */
function tableNameScore(name: string, keywords: string[]): number {
  const u = name.toUpperCase();
  return keywords.reduce((s, kw) => s + (u.includes(kw.toUpperCase()) ? 1 : 0), 0);
}

/** Score un table pour un concept : score nom × 3 + score présence colonnes caractéristiques. */
function scoreTable(t: TableInfo, nameKw: string[], colKw: string[]): number {
  const ns = tableNameScore(t.table, nameKw) * 3;
  const cs = colKw.reduce((s, kw) =>
    s + (t.columns.some(c => c.toUpperCase().includes(kw.toUpperCase())) ? 1 : 0), 0);
  return ns + cs;
}

/** Trouve la table la plus probable pour un concept. */
function findBestTable(tables: TableInfo[], nameKw: string[], colKw: string[]): TableInfo | null {
  let best: TableInfo | null = null;
  let bestScore = -1;
  for (const t of tables) {
    const s = scoreTable(t, nameKw, colKw);
    if (s > bestScore) { bestScore = s; best = t; }
  }
  return bestScore > 0 ? best : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Détection automatique
// Prend les tables/colonnes découvertes par /api/schema et retourne un mapping
// ─────────────────────────────────────────────────────────────────────────────
export function autoDetectSchema(tables: TableInfo[]): DetectionResult {
  const warnings: string[] = [];

  // ── CLIENTS ───────────────────────────────────────────────────────────────
  const clientT = findBestTable(tables,
    ["CLIENT", "PATIENT", "TIERS", "ADHERENT", "PERSONNE", "CONTACT"],
    ["NOM", "PRENOM", "TELEPHONE", "CIVILITE", "MUTUELLE"]);

  const clientConf = clientT
    ? Math.min(100, tableNameScore(clientT.table, ["CLIENT", "PATIENT", "TIERS"]) * 25 +
        (clientT.columns.some(c => /NOM/i.test(c)) ? 25 : 0) +
        (clientT.columns.some(c => /PRENOM/i.test(c)) ? 25 : 0) + 25)
    : 0;
  if (!clientT) warnings.push("clients: aucune table trouvée — fallback sur CLIENT");

  const clients: SchemaMap["clients"] = clientT ? {
    table:          clientT.table,
    id:             matchCol(clientT.columns, ["ID_CLIENT","IDCLIENT","CL_ID"], ["ID","CODE_CLIENT","NO_CLIENT","PK"]),
    civilite:       matchCol(clientT.columns, ["CIVILITE","TITRE","SEXE"], ["GENRE","CGU"]),
    nom:            matchCol(clientT.columns, ["NOM","NOM_CLIENT","LASTNAME","NOM_FAMILLE"]),
    prenom:         matchCol(clientT.columns, ["PRENOM","FIRSTNAME","PRENOM_CLIENT"]),
    telephone:      matchCol(clientT.columns, ["TELEPHONE","TEL","MOBILE","PORTABLE"], ["TEL1","TEL_PRINCIPAL"]),
    email:          matchCol(clientT.columns, ["EMAIL","MAIL","ADRESSE_MAIL"], ["COURRIEL"]),
    dateNaissance:  matchCol(clientT.columns, ["DATE_NAISSANCE","DATENAISSANCE","DDN"], ["NAISSANCE","BIRTH"]),
    mutuelle:       matchCol(clientT.columns, ["MUTUELLE","ORGANISME","ASSURANCE","COMPLEMENTAIRE"], ["CAISSE"]),
    numeroMutuelle: matchCol(clientT.columns, ["NUM_MUTUELLE","NUMERO_MUTUELLE","NO_ADHERENT"], ["NUM_ADHERENT","MATRICULE"]),
  } : {
    table: "CLIENT", id: "ID_CLIENT", civilite: "CIVILITE", nom: "NOM",
    prenom: "PRENOM", telephone: "TELEPHONE", email: "EMAIL",
    dateNaissance: "DATE_NAISSANCE", mutuelle: "MUTUELLE", numeroMutuelle: "NUM_MUTUELLE",
  };

  // ── ORDONNANCES ───────────────────────────────────────────────────────────
  const ordoT = findBestTable(tables,
    ["ORDONNANCE","ORDO","PRESCRIPTION","CORRECTION","FICHE_VERRE","LUNETTE","EQUIPEMENT"],
    ["SPHERE","CYLINDRE","ADDITION","SPH","CYL","OD_","OG_"]);

  const ordoConf = ordoT
    ? Math.min(100,
        (ordoT.columns.some(c => /SPH|SPHERE/i.test(c)) ? 35 : 0) +
        (ordoT.columns.some(c => /CYL|CYLINDRE/i.test(c)) ? 30 : 0) +
        (ordoT.columns.some(c => /ADD|ADDITION/i.test(c)) ? 20 : 0) + 15)
    : 0;
  if (!ordoT) warnings.push("ordonnances: aucune table trouvée — fallback sur ORDONNANCE");

  const ordonnances: SchemaMap["ordonnances"] = ordoT ? {
    table:          ordoT.table,
    id:             matchCol(ordoT.columns, ["ID_ORDONNANCE","IDORDONNANCE","ORDO_ID"], ["ID","NO_ORDO"]),
    idClient:       matchCol(ordoT.columns, ["ID_CLIENT","IDCLIENT","FK_CLIENT"], ["NO_CLIENT","CL_ID"]),
    prescripteur:   matchCol(ordoT.columns, ["PRESCRIPTEUR","OPHTALMOLOGUE","MEDECIN","DOCTEUR"], ["DR","PRATICIEN"]),
    dateOrdonnance: matchCol(ordoT.columns, ["DATE_ORDONNANCE","DATE_ORDO"], ["DATE_PRESCRIPTION","DATE"]),
    // OD
    odSphere:       matchCol(ordoT.columns, ["OD_SPHERE","SPHERE_OD","SPH_OD","SPHD","SPH_DR"], ["OD_SPH","SPHERE_D"]),
    odCylindre:     matchCol(ordoT.columns, ["OD_CYLINDRE","CYLINDRE_OD","CYL_OD","CYLD"], ["OD_CYL","CYL_D"]),
    odAxe:          matchCol(ordoT.columns, ["OD_AXE","AXE_OD","AXED","AXE_D"], ["OD_AXIS","AX_D"]),
    odAddition:     matchCol(ordoT.columns, ["OD_ADDITION","ADDITION_OD","ADD_OD","ADDD"], ["OD_ADD","ADD_D"]),
    // OG
    ogSphere:       matchCol(ordoT.columns, ["OG_SPHERE","SPHERE_OG","SPH_OG","SPHG","SPH_GA"], ["OG_SPH","SPHERE_G"]),
    ogCylindre:     matchCol(ordoT.columns, ["OG_CYLINDRE","CYLINDRE_OG","CYL_OG","CYLG"], ["OG_CYL","CYL_G"]),
    ogAxe:          matchCol(ordoT.columns, ["OG_AXE","AXE_OG","AXEG","AXE_G"], ["OG_AXIS","AX_G"]),
    ogAddition:     matchCol(ordoT.columns, ["OG_ADDITION","ADDITION_OG","ADD_OG","ADDG"], ["OG_ADD","ADD_G"]),
    ecartPupillaire:matchCol(ordoT.columns, ["ECART_PUPILLAIRE","ECARTPUPILLAIRE","EP","PD"], ["PUPILLARY","ECART_PUP"]),
  } : {
    table: "ORDONNANCE", id: "ID_ORDONNANCE", idClient: "ID_CLIENT",
    prescripteur: "PRESCRIPTEUR", dateOrdonnance: "DATE_ORDONNANCE",
    odSphere: "OD_SPHERE", odCylindre: "OD_CYLINDRE", odAxe: "OD_AXE", odAddition: "OD_ADDITION",
    ogSphere: "OG_SPHERE", ogCylindre: "OG_CYLINDRE", ogAxe: "OG_AXE", ogAddition: "OG_ADDITION",
    ecartPupillaire: "ECART_PUPILLAIRE",
  };

  // ── DEVIS ─────────────────────────────────────────────────────────────────
  const devisT = findBestTable(tables,
    ["DEVIS","DOSSIER","VENTE","COMMANDE","FACTURE","EQUIPEMENT"],
    ["PRIX","RESTE","REMBOURSEMENT","VERRE","MONTANT"]);

  const devisConf = devisT
    ? Math.min(100,
        tableNameScore(devisT.table, ["DEVIS","DOSSIER","VENTE"]) * 20 +
        (devisT.columns.some(c => /PRIX|MONTANT/i.test(c)) ? 30 : 0) +
        (devisT.columns.some(c => /RESTE|RAC/i.test(c)) ? 30 : 0) + 20)
    : 0;
  if (!devisT) warnings.push("devis: aucune table trouvée — fallback sur DEVIS");

  const devis: SchemaMap["devis"] = devisT ? {
    table:                devisT.table,
    id:                   matchCol(devisT.columns, ["ID_DEVIS","IDDEVIS"], ["ID","NO_DEVIS"]),
    idClient:             matchCol(devisT.columns, ["ID_CLIENT","IDCLIENT"], ["NO_CLIENT","CL_ID"]),
    idOrdonnance:         matchCol(devisT.columns, ["ID_ORDONNANCE","IDORDONNANCE"], ["NO_ORDO"]),
    dateDevis:            matchCol(devisT.columns, ["DATE_DEVIS","DATE_CREATION"], ["DATE"]),
    statut:               matchCol(devisT.columns, ["STATUT","ETAT","STATUS"]),
    verrierNom:           matchCol(devisT.columns, ["VERRIER_NOM","NOM_VERRE","VERRE_NOM"], ["VERRIER","NOM_VERRIER"]),
    verrierGamme:         matchCol(devisT.columns, ["VERRIER_GAMME","GAMME_VERRE"], ["GAMME"]),
    verrierIndice:        matchCol(devisT.columns, ["VERRIER_INDICE","INDICE_VERRE"], ["INDICE"]),
    verrierClasse:        matchCol(devisT.columns, ["CLASSE_VERRE","CLASSE100PS","CLASSE_SS"], ["CLASSE"]),
    prixVerres:           matchCol(devisT.columns, ["PRIX_VERRES","PX_VERRES"], ["MONTANT_VERRES"]),
    montureNom:           matchCol(devisT.columns, ["MONTURE_NOM","NOM_MONTURE"], ["MONTURE"]),
    prixMonture:          matchCol(devisT.columns, ["PRIX_MONTURE","PX_MONTURE"], ["MONTANT_MONTURE"]),
    prixTotal:            matchCol(devisT.columns, ["PRIX_TOTAL","PX_TOTAL","TOTAL"], ["MONTANT_TOTAL"]),
    remboursementSS:      matchCol(devisT.columns, ["REMBOURSEMENT_SS","REMB_SS"], ["SS","SECU"]),
    remboursementMutuelle:matchCol(devisT.columns, ["REMBOURSEMENT_MUTUELLE","REMB_MUTUELLE"], ["MUTUELLE_REMB"]),
    resteACharge:         matchCol(devisT.columns, ["RESTE_A_CHARGE","RESTEACHARGE","RAC"], ["RESTE","PARTICIPATION"]),
    offreNom:             matchCol(devisT.columns, ["OFFRE_NOM","NOM_OFFRE"], ["OFFRE"]),
    originOptiPilot:      matchCol(devisT.columns, ["SOURCE","ORIGINE","ORIGIN"]),
  } : {
    table: "DEVIS", id: "ID_DEVIS", idClient: "ID_CLIENT", idOrdonnance: "ID_ORDONNANCE",
    dateDevis: "DATE_DEVIS", statut: "STATUT", verrierNom: "VERRIER_NOM",
    verrierGamme: "VERRIER_GAMME", verrierIndice: "VERRIER_INDICE", verrierClasse: "CLASSE_VERRE",
    prixVerres: "PRIX_VERRES", montureNom: "MONTURE_NOM", prixMonture: "PRIX_MONTURE",
    prixTotal: "PRIX_TOTAL", remboursementSS: "REMBOURSEMENT_SS",
    remboursementMutuelle: "REMBOURSEMENT_MUTUELLE", resteACharge: "RESTE_A_CHARGE",
    offreNom: "OFFRE_NOM", originOptiPilot: "SOURCE",
  };

  // ── COTATIONS ─────────────────────────────────────────────────────────────
  const cotT = findBestTable(tables,
    ["COTATION","COTISATION","REMBOURSEMENT","TIERS_PAYANT","TP"],
    ["MONTANT","MUTUELLE","STATUT","REPONSE"]);

  const cotConf = cotT
    ? Math.min(100, tableNameScore(cotT.table, ["COTATION","COTISATION","TIERS"]) * 30 + 40)
    : 0;

  const cotations: SchemaMap["cotations"] = cotT ? {
    table:          cotT.table,
    id:             matchCol(cotT.columns, ["ID_COTATION","IDCOTATION"], ["ID"]),
    idDevis:        matchCol(cotT.columns, ["ID_DEVIS","IDDEVIS"], ["NO_DEVIS"]),
    dateReponse:    matchCol(cotT.columns, ["DATE_REPONSE","DATE_COTATION"], ["DATE"]),
    statut:         matchCol(cotT.columns, ["STATUT","ETAT","STATUS"]),
    montantSS:      matchCol(cotT.columns, ["MONTANT_SS","MONTANT_SECU"], ["SS","SECU"]),
    montantMutuelle:matchCol(cotT.columns, ["MONTANT_MUTUELLE","REMBOURSEMENT_MUTUELLE"], ["MUTUELLE"]),
    resteACharge:   matchCol(cotT.columns, ["RESTE_A_CHARGE","RAC","RESTE"], ["PARTICIPATION"]),
    detail:         matchCol(cotT.columns, ["DETAIL_JSON","DETAIL","REPONSE_JSON"], ["REPONSE","JSON"]),
  } : {
    table: "COTATION", id: "ID_COTATION", idDevis: "ID_DEVIS", dateReponse: "DATE_REPONSE",
    statut: "STATUT", montantSS: "MONTANT_SS", montantMutuelle: "MONTANT_MUTUELLE",
    resteACharge: "RESTE_A_CHARGE", detail: "DETAIL_JSON",
  };

  // ── MONTURES ─────────────────────────────────────────────────────────────
  const monT = findBestTable(tables,
    ["ARTICLE","MONTURE","PRODUIT","STOCK_ARTICLE","CATALOGUE","LUNETTERIE"],
    ["MARQUE","REFERENCE","MODELE","EAN","PRIX_VENTE"]);

  const monConf = monT
    ? Math.min(100,
        tableNameScore(monT.table, ["ARTICLE","MONTURE","PRODUIT"]) * 20 +
        (monT.columns.some(c => /MARQUE/i.test(c)) ? 30 : 0) +
        (monT.columns.some(c => /REFERENCE|EAN|CODE/i.test(c)) ? 30 : 0) + 20)
    : 0;
  if (!monT) warnings.push("montures: aucune table trouvée — fallback sur ARTICLE");

  const montures: SchemaMap["montures"] = monT ? {
    table:         monT.table,
    id:            matchCol(monT.columns, ["ID_ARTICLE","IDARTICLE","ID_PRODUIT"], ["ID","CODE_ARTICLE"]),
    reference:     matchCol(monT.columns, ["REFERENCE","REF","CODE_ARTICLE"], ["CODE_INTERNE"]),
    codeEAN:       matchCol(monT.columns, ["CODE_EAN","EAN","CODE_BARRE","BARCODE"], ["GENCOD"]),
    marque:        matchCol(monT.columns, ["MARQUE","MARQUE_MONTURE","BRAND"], ["FABRICANT"]),
    modele:        matchCol(monT.columns, ["MODELE","NOM","LIBELLE"], ["DESIGNATION","INTITULE"]),
    couleur:       matchCol(monT.columns, ["COULEUR","COLOR","COLORIS"], ["TEINTE"]),
    matiere:       matchCol(monT.columns, ["MATIERE","MATERIAU","MATERIAL"], ["MATIERE_MONTURE"]),
    genre:         matchCol(monT.columns, ["GENRE","SEXE","PUBLIQUE_CIBLE"], ["SEXE_CLIENT"]),
    taille:        matchCol(monT.columns, ["TAILLE","DIMENSIONS","CALIBRE"], ["CALBRE","DIM"]),
    prixVente:     matchCol(monT.columns, ["PRIX_VENTE_TTC","PRIX_VENTE","PV_TTC"], ["PRIX_TTC","TARIF_TTC"]),
    prixAchat:     matchCol(monT.columns, ["PRIX_ACHAT_HT","PA_HT","PRIX_ACHAT"], ["COUT_HT","PA"]),
    quantiteStock: matchCol(monT.columns, ["QUANTITE_STOCK","QTE_STOCK","STOCK"], ["QTE","QUANTITE"]),
    imageUrl:      matchCol(monT.columns, ["IMAGE_URL","IMAGE","PHOTO"], ["IMG","PHOTO_URL"]),
    categorie:     matchCol(monT.columns, ["CATEGORIE","TYPE_ARTICLE","FAMILLE"], ["RAYON","SOUS_FAMILLE"]),
  } : {
    table: "ARTICLE", id: "ID_ARTICLE", reference: "REFERENCE", codeEAN: "CODE_EAN",
    marque: "MARQUE", modele: "MODELE", couleur: "COULEUR", matiere: "MATIERE",
    genre: "GENRE", taille: "TAILLE", prixVente: "PRIX_VENTE_TTC", prixAchat: "PRIX_ACHAT_HT",
    quantiteStock: "QUANTITE_STOCK", imageUrl: "IMAGE_URL", categorie: "CATEGORIE",
  };

  // Avertissements pour les colonnes avec fallback générique
  const checkFallback = (section: string, map: Record<string, string>) => {
    Object.entries(map).forEach(([key, val]) => {
      if (val === "COLONNE_INCONNUE") warnings.push(`${section}.${key}: colonne non trouvée`);
    });
  };
  checkFallback("clients", clients as unknown as Record<string, string>);
  checkFallback("ordonnances", ordonnances as unknown as Record<string, string>);
  checkFallback("devis", devis as unknown as Record<string, string>);
  checkFallback("montures", montures as unknown as Record<string, string>);

  // ── REGLEMENTS NOEMIE ──────────────────────────────────────────────────────
  const reglT = findBestTable(tables,
    ["REGLEMENT_TP","RETOUR_NOEMIE","VIREMENT_TP","REGLEMENT_SS","PAIEMENT_TP","REMISE_NOEMIE"],
    ["ORGANISME","MONTANT_REGLE","DATE_REGLEMENT","MOTIF_REJET"]);

  const reglements: SchemaMap["reglements"] = reglT ? {
    table:         reglT.table,
    id:            matchCol(reglT.columns, ["ID_REGLEMENT","IDREGLEMENT"], ["ID"]),
    idDevis:       matchCol(reglT.columns, ["ID_DEVIS","IDDEVIS","FK_DEVIS"], ["NO_DEVIS"]),
    organisme:     matchCol(reglT.columns, ["ORGANISME","TYPE_ORGANISME","CAISSE"], ["SS","MUTUELLE"]),
    montant:       matchCol(reglT.columns, ["MONTANT_REGLE","MONTANT_PAYE","MONTANT"], ["VIREMENT"]),
    dateReglement: matchCol(reglT.columns, ["DATE_REGLEMENT","DATE_VIREMENT","DATE_PAIEMENT"], ["DATE"]),
    statut:        matchCol(reglT.columns, ["STATUT","ETAT","STATUS"]),
    motifRejet:    matchCol(reglT.columns, ["MOTIF_REJET","CODE_REJET","LIBELLE_REJET"], ["REJET","ERREUR"]),
    reference:     matchCol(reglT.columns, ["REFERENCE_VIREMENT","NO_VIREMENT","REF"], ["REFERENCE"]),
  } : {
    table: "REGLEMENT_TP", id: "ID_REGLEMENT", idDevis: "ID_DEVIS",
    organisme: "ORGANISME", montant: "MONTANT_REGLE", dateReglement: "DATE_REGLEMENT",
    statut: "STATUT", motifRejet: "MOTIF_REJET", reference: "REFERENCE_VIREMENT",
  };

  return {
    schema: { clients, ordonnances, devis, cotations, reglements, montures },
    confidence: {
      clients: clientConf,
      ordonnances: ordoConf,
      devis: devisConf,
      cotations: cotConf,
      montures: monConf,
    },
    warnings,
  };
}

// ── Persistance ───────────────────────────────────────────────────────────────

export function saveSchemaOverride(schema: SchemaMap): void {
  fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(schema, null, 2), "utf-8");
  console.log("[Schema] Override sauvegardé :", OVERRIDE_PATH);
}

export function loadSchemaOverride(): SchemaMap | null {
  if (!fs.existsSync(OVERRIDE_PATH)) return null;
  try {
    const raw = fs.readFileSync(OVERRIDE_PATH, "utf-8");
    return JSON.parse(raw) as SchemaMap;
  } catch {
    console.warn("[Schema] Impossible de lire schema-override.json — fallback sur défauts");
    return null;
  }
}

export function deleteSchemaOverride(): void {
  if (fs.existsSync(OVERRIDE_PATH)) {
    fs.unlinkSync(OVERRIDE_PATH);
    console.log("[Schema] Override supprimé — retour aux valeurs par défaut");
  }
}

export function hasSchemaOverride(): boolean {
  return fs.existsSync(OVERRIDE_PATH);
}
