// ── Mapping schema Optimum → OptiPilot ──────────────────────────────────────
//
// Ce fichier contient la correspondance entre les noms de tables/colonnes
// d'Optimum (SQL Server local) et les concepts d'OptiPilot.
//
// ⚠️  Ces noms sont des estimations basées sur les standards français des
//     logiciels d'optique. Il faudra les ajuster une fois qu'on a accès
//     au schéma réel via GET /api/schema sur le bridge.
//
// Pour découvrir les vrais noms : lancez le bridge et appelez :
//   GET http://<IP-PC>:5174/api/schema?token=<TOKEN>
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEMA = {
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
    prixVente:     "PRIX_VENTE_TTC",   // ou "PRIX_VENTE", "PV_TTC"
    prixAchat:     "PRIX_ACHAT_HT",    // non affiché au client
    quantiteStock: "QUANTITE_STOCK",   // ou colonne dans une table STOCK séparée
    imageUrl:      "IMAGE_URL",        // chemin local ou URL — peut être null
    categorie:     "CATEGORIE",        // "monture", "solaire", "lentilles" — filtre optionnel
  },
} as const;

export type SchemaKey = keyof typeof SCHEMA;
