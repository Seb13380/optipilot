// ── Mapping schema Optimum → OptiPilot ──────────────────────────────────────
//
// Au premier lancement, les valeurs ci-dessous sont des estimations.
// Après avoir appelé POST /api/setup/detect, un fichier schema-override.json
// est créé à la racine du bridge avec les vrais noms détectés automatiquement.
// Ce fichier est rechargé au démarrage — vous n'avez rien à modifier manuellement.
//
// Pour forcer une re-détection : DELETE /api/setup/reset puis POST /api/setup/detect
// ─────────────────────────────────────────────────────────────────────────────
import { loadSchemaOverride, type SchemaMap } from "./auto-map";

const SCHEMA_DEFAULT: SchemaMap = {
  // ─── Table des clients / patients ─────────────────────────────────────────
  clients: {
    table:     "CLIENT",           // ou "PATIENT", "Clients", "dbo.CLIENT"
    id:        "ID_CLIENT",        // clé primaire
    civilite:  "CIVILITE",         // "M.", "Mme"
    nom:       "NOM",
    prenom:    "PRENOM",
    telephone: "TELEPHONE",
    email:     "EMAIL",
    dateNaissance: "DATE_NAISSANCE",
    mutuelle:  "MUTUELLE",
    numeroMutuelle: "NUM_MUTUELLE",
  },

  // ─── Table des ordonnances ─────────────────────────────────────────────────
  ordonnances: {
    table:         "ORDONNANCE",
    id:            "ID_ORDONNANCE",
    idClient:      "ID_CLIENT",      // clé étrangère vers clients.id
    prescripteur:  "PRESCRIPTEUR",
    dateOrdonnance: "DATE_ORDONNANCE",
    // Œil droit
    odSphere:      "OD_SPHERE",
    odCylindre:    "OD_CYLINDRE",
    odAxe:         "OD_AXE",
    odAddition:    "OD_ADDITION",
    // Œil gauche
    ogSphere:      "OG_SPHERE",
    ogCylindre:    "OG_CYLINDRE",
    ogAxe:         "OG_AXE",
    ogAddition:    "OG_ADDITION",
    // Mesures
    ecartPupillaire: "ECART_PUPILLAIRE",
  },

  // ─── Table des devis ──────────────────────────────────────────────────────
  devis: {
    table:          "DEVIS",
    id:             "ID_DEVIS",
    idClient:       "ID_CLIENT",
    idOrdonnance:   "ID_ORDONNANCE",
    dateDevis:      "DATE_DEVIS",
    statut:         "STATUT",        // "EN_ATTENTE", "ENVOYE", "ACCEPTE"
    // Verres
    verrierNom:     "VERRIER_NOM",
    verrierGamme:   "VERRIER_GAMME",
    verrierIndice:  "VERRIER_INDICE",
    verrierClasse:  "CLASSE_VERRE",
    prixVerres:     "PRIX_VERRES",
    // Monture
    montureNom:     "MONTURE_NOM",
    prixMonture:    "PRIX_MONTURE",
    // Totaux
    prixTotal:      "PRIX_TOTAL",
    remboursementSS: "REMBOURSEMENT_SS",
    remboursementMutuelle: "REMBOURSEMENT_MUTUELLE",
    resteACharge:   "RESTE_A_CHARGE",
    // Offre OptiPilot
    offreNom:       "OFFRE_NOM",     // "Essentiel", "Confort", "Premium"
    originOptiPilot: "SOURCE",       // valeur = "OPTIPILOT" pour les tracer
  },

  // ─── Table des cotations mutuelle ─────────────────────────────────────────
  cotations: {
    table:         "COTATION",
    id:            "ID_COTATION",
    idDevis:       "ID_DEVIS",
    dateReponse:   "DATE_REPONSE",
    statut:        "STATUT",         // "EN_ATTENTE", "REPONDU", "ERREUR"
    montantSS:     "MONTANT_SS",
    montantMutuelle: "MONTANT_MUTUELLE",
    resteACharge:  "RESTE_A_CHARGE",
    detail:        "DETAIL_JSON",    // réponse complète en JSON si dispo
  },

  // ─── Table des montures / articles en stock ───────────────────────────────
  //
  // ⚠️  Noms estimés — à ajuster avec GET /api/schema une fois connecté.
  //
  // Dans Optimum, les montures sont souvent dans une table ARTICLE ou PRODUIT.
  // Colonnes typiques selon les versions du logiciel :
  //   ARTICLE_MONTURE / PRODUIT / STOCK_LUNETTE / CATALOGUE_MONTURE
  //
  // Pour trouver les vrais noms, lancez le bridge et appellez :
  //   GET http://<IP-PC>:5174/api/schema
  // ─────────────────────────────────────────────────────────────────────────
  montures: {
    table:         "ARTICLE",          // ou "PRODUIT", "MONTURE", "STOCK_ARTICLE"
    id:            "ID_ARTICLE",       // ou "CODE_ARTICLE", "ID_PRODUIT"
    reference:     "REFERENCE",        // référence interne magasin
    codeEAN:       "CODE_EAN",         // code-barres EAN-13 (utile pour les images)
    marque:        "MARQUE",           // "Essilor", "Maui Jim", "Ray-Ban"…
    modele:        "MODELE",           // nom du modèle / libellé
    couleur:       "COULEUR",
    matiere:       "MATIERE",          // "Acétate", "Métal", "TR90", "Titane"
    genre:         "GENRE",            // "homme", "femme", "enfant", "mixte"
    taille:        "TAILLE",           // "52-18-140"
    prixVente:     "PRIX_VENTE_TTC",
    prixAchat:     "PRIX_ACHAT_HT",
    quantiteStock: "QUANTITE_STOCK",
    imageUrl:      "IMAGE_URL",
    categorie:     "CATEGORIE",
  },
};

// ── Chargement dynamique ──────────────────────────────────────────────────────
// Si un schema-override.json existe (créé par POST /api/setup/detect),
// il remplace les valeurs par défaut ci-dessus sans redémarrage.
export let SCHEMA: SchemaMap = loadSchemaOverride() ?? SCHEMA_DEFAULT;

export function reloadSchema(): void {
  SCHEMA = loadSchemaOverride() ?? SCHEMA_DEFAULT;
  console.log("[Schema] Rechargé —", hasOverride() ? "override actif" : "valeurs par défaut");
}

function hasOverride(): boolean {
  try {
    const { hasSchemaOverride } = require("./auto-map");
    return hasSchemaOverride();
  } catch { return false; }
}

export type SchemaKey = keyof SchemaMap;
