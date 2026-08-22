// ─────────────────────────────────────────────────────────────────────────────
// MODÈLE DE DOMAINE UNIVERSEL OPTIPILOT
// ─────────────────────────────────────────────────────────────────────────────
// Ce fichier définit le format de données commun utilisé par TOUT OptiPilot,
// indépendamment du logiciel opticien connecté (Optimum, MyEasyOptic, Cosium,
// WinOptics...).
//
// Chaque logiciel a sa propre façon de nommer/organiser ses données. Un
// "connecteur" (un par logiciel) a pour unique responsabilité de traduire le
// format du logiciel source vers ce modèle commun. Le reste d'OptiPilot
// (routes, IA, calculs de reste à charge, interface) ne travaille QUE avec ce
// modèle — il ne sait jamais d'où viennent les données.
//
//   Logiciel source (Optimum, MyEasyOptic, Cosium...)
//           │
//           ▼
//     Connecteur (implémente LogicielConnector)
//           │
//           ▼
//     Modèle universel (ce fichier) ── OptiPilot ne connaît que ça
//
// Ne pas ajouter de champ spécifique à un seul logiciel ici : les champs
// propres à un connecteur particulier restent dans son propre code.
// ─────────────────────────────────────────────────────────────────────────────

export interface Client {
  /** Identifiant du client dans le logiciel source (pas l'id OptiPilot) */
  id: string;
  civilite?: string;
  nom: string;
  prenom: string;
  /** ISO 8601 (ex: "1985-03-12") */
  dateNaissance?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  mutuelle?: string;
  numeroMutuelle?: string;
}

export interface Ordonnance {
  id?: string;
  clientId: string;
  dateOrdonnance?: string;
  prescripteur?: string;
  odSphere?: number;
  odCylindre?: number;
  odAxe?: number;
  odAddition?: number;
  ogSphere?: number;
  ogCylindre?: number;
  ogAxe?: number;
  ogAddition?: number;
  ecartPupillaire?: number;
}

export interface Monture {
  reference?: string;
  marque?: string;
  modele?: string;
  couleur?: string;
  prixVente?: number;
}

export interface VerreDevis {
  verrierNom?: string;
  gamme?: string;
  indice?: number;
  traitement?: string;
  prixVente?: number;
}

export interface Devis {
  id?: string;
  clientId: string;
  ordonnanceId?: string;
  dateDevis?: string;
  /** "en_cours" | "envoye" | "accepte" | "refuse" — libre selon le logiciel source */
  statut?: string;
  monture?: Monture;
  verres?: VerreDevis[];
  prixTotal?: number;
}

/**
 * Résultat d'une cotation / demande de prise en charge (PEC) — c'est le cœur
 * de la promesse OptiPilot : le montant OFFICIEL calculé par le logiciel de
 * l'opticien via son réseau tiers payant (Almerys, Viamedis, Kalixia...),
 * qu'OptiPilot se contente de LIRE — jamais de calculer lui-même ni de
 * transmettre directement aux réseaux.
 */
export interface Cotation {
  devisId?: string;
  dateReponse?: string;
  /** "en_attente" | "recue" | "rejetee" */
  statut?: string;
  montantSecuriteSociale?: number;
  montantMutuelle?: number;
  resteACharge?: number;
  detail?: string;
}

export interface Reglement {
  devisId?: string;
  /** "Sécurité Sociale" ou le nom de la mutuelle */
  organisme?: string;
  montant?: number;
  dateReglement?: string;
  statut?: string;
  motifRejet?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRAT COMMUN À TOUS LES CONNECTEURS
// ─────────────────────────────────────────────────────────────────────────────
// Chaque logiciel opticien supporté (Optimum, MyEasyOptic, Cosium...) doit
// avoir un connecteur qui implémente cette interface. Peu importe qu'il soit
// basé sur une API officielle, une extension Chrome (lecture du DOM/réseau) ou
// un agent Windows (lecture d'une base locale) : la forme de sortie est
// toujours la même.
export interface LogicielConnector {
  /** Identifiant court du logiciel : "optimum" | "myeasyoptic" | "cosium" | ... */
  readonly nom: string;

  rechercherClients(query: string): Promise<Client[]>;
  recupererOrdonnance(clientId: string): Promise<Ordonnance | null>;
  recupererDevis(clientId: string): Promise<Devis[]>;
  recupererCotation(devisId: string): Promise<Cotation | null>;
}
