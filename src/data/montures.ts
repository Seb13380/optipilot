// ─── Catalogue de montures génériques OptiPilot ───────────────────────────────
// 50 montures sans marque — base de départ pour le mini catalogue

export interface Monture {
  id: string;
  nom: string;
  genre: "homme" | "femme" | "mixte";
  forme: "ronde" | "carrée" | "ovale" | "papillon" | "rectangle";
  taille: "S" | "M" | "L";
  style: "sport" | "ville" | "classique" | "tendance";
  matiere: "plastique" | "metal" | "nylor" | "percée";
  prixIndicatif: number; // € après remboursements indicatifs
  description: string;
}

export const MONTURES: Monture[] = [
  // ── Plastique ──────────────────────────────────────────────────────────────
  { id: "kalos",  nom: "Kalos",  genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "plastique", prixIndicatif: 65, description: "Esprit vintage, couleurs vives — un classique revisité" },
  { id: "onyx",   nom: "Onyx",   genre: "homme",  forme: "carrée",    taille: "M", style: "ville",     matiere: "plastique", prixIndicatif: 55, description: "Carrée et affirmée, pour un look urbain assumé" },
  { id: "aura",   nom: "Aura",   genre: "mixte",  forme: "ovale",     taille: "M", style: "classique", matiere: "plastique", prixIndicatif: 45, description: "Ovale intemporel, s'adapte à tous les visages" },
  { id: "vega",   nom: "Vega",   genre: "femme",  forme: "papillon",  taille: "S", style: "tendance",  matiere: "plastique", prixIndicatif: 70, description: "Papillon moderne, légèreté et féminité" },
  { id: "titan",  nom: "Titan",  genre: "homme",  forme: "carrée",    taille: "L", style: "ville",     matiere: "plastique", prixIndicatif: 60, description: "Grande carrée, présence naturelle et caractère" },
  { id: "iris",   nom: "Iris",   genre: "mixte",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "plastique", prixIndicatif: 50, description: "Petite ronde délicate, tendance minimaliste" },
  { id: "clair",  nom: "Clair",  genre: "homme",  forme: "rectangle", taille: "M", style: "classique", matiere: "plastique", prixIndicatif: 55, description: "Rectangle sobre, allure professionnelle" },
  { id: "flora",  nom: "Flora",  genre: "femme",  forme: "ovale",     taille: "M", style: "classique", matiere: "plastique", prixIndicatif: 48, description: "Ovale doux en acétate, confort quotidien" },
  { id: "storm",  nom: "Storm",  genre: "mixte",  forme: "carrée",    taille: "L", style: "sport",     matiere: "plastique", prixIndicatif: 75, description: "Carrée robuste, tient face à toutes les activités" },
  { id: "bloom",  nom: "Bloom",  genre: "femme",  forme: "papillon",  taille: "M", style: "tendance",  matiere: "plastique", prixIndicatif: 68, description: "Papillon évasé, audacieux et élégant" },
  { id: "dalia",  nom: "Dalia",  genre: "femme",  forme: "papillon",  taille: "S", style: "tendance",  matiere: "plastique", prixIndicatif: 72, description: "Mini papillon, sophistiqué et original" },
  { id: "yuma",   nom: "Yuma",   genre: "homme",  forme: "carrée",    taille: "M", style: "sport",     matiere: "plastique", prixIndicatif: 60, description: "Carrée sport, légère et enveloppante" },
  { id: "gael",   nom: "Gaël",   genre: "homme",  forme: "carrée",    taille: "M", style: "ville",     matiere: "plastique", prixIndicatif: 50, description: "Carrée fine en acétate, sobre et moderne" },
  { id: "kera",   nom: "Kera",   genre: "femme",  forme: "ovale",     taille: "S", style: "tendance",  matiere: "plastique", prixIndicatif: 62, description: "Ovale petite taille, doux et tendance" },
  { id: "sena",   nom: "Sena",   genre: "femme",  forme: "papillon",  taille: "L", style: "tendance",  matiere: "plastique", prixIndicatif: 75, description: "Grand papillon audacieux, fort caractère" },

  // ── Métal ──────────────────────────────────────────────────────────────────
  { id: "atlas",  nom: "Atlas",  genre: "homme",  forme: "rectangle", taille: "M", style: "classique", matiere: "metal",     prixIndicatif: 50, description: "Rectangle métal sobre, indétrônable dans le bureau" },
  { id: "luna",   nom: "Luna",   genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "metal",     prixIndicatif: 60, description: "Petite ronde métal dorée, charme intemporel" },
  { id: "helio",  nom: "Hélio",  genre: "mixte",  forme: "ovale",     taille: "M", style: "ville",     matiere: "metal",     prixIndicatif: 52, description: "Ovale métal fin, léger et discret" },
  { id: "ares",   nom: "Arès",   genre: "homme",  forme: "rectangle", taille: "L", style: "classique", matiere: "metal",     prixIndicatif: 58, description: "Grand rectangle métal, sérieux et élégant" },
  { id: "lyra",   nom: "Lyra",   genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "metal",     prixIndicatif: 55, description: "Ronde fine argentée, raffinée et actuelle" },
  { id: "orion",  nom: "Orion",  genre: "homme",  forme: "carrée",    taille: "M", style: "ville",     matiere: "metal",     prixIndicatif: 62, description: "Carrée métal structurée, allure contemporaine" },
  { id: "zara",   nom: "Zara",   genre: "femme",  forme: "ovale",     taille: "M", style: "classique", matiere: "metal",     prixIndicatif: 50, description: "Ovale classique métal, élégance naturelle" },
  { id: "pax",    nom: "Pax",    genre: "mixte",  forme: "rectangle", taille: "L", style: "ville",     matiere: "metal",     prixIndicatif: 65, description: "Rectangle large métal, affirmé et moderne" },
  { id: "clio",   nom: "Clio",   genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "metal",     prixIndicatif: 48, description: "Petite ronde accessible, chic sans effort" },
  { id: "rex",    nom: "Rex",    genre: "homme",  forme: "carrée",    taille: "L", style: "classique", matiere: "metal",     prixIndicatif: 70, description: "Grande carrée métal, autorité naturelle" },
  { id: "solis",  nom: "Solis",  genre: "mixte",  forme: "ovale",     taille: "M", style: "classique", matiere: "metal",     prixIndicatif: 55, description: "Ovale polyvalent, convient à tous" },
  { id: "elna",   nom: "Elna",   genre: "femme",  forme: "ronde",     taille: "M", style: "classique", matiere: "metal",     prixIndicatif: 52, description: "Ronde moyenne métal, classique revisité" },
  { id: "zola",   nom: "Zola",   genre: "mixte",  forme: "ronde",     taille: "M", style: "tendance",  matiere: "metal",     prixIndicatif: 62, description: "Ronde épaisseur mixte, entre classique et tendance" },
  { id: "alva",   nom: "Alva",   genre: "femme",  forme: "rectangle", taille: "M", style: "ville",     matiere: "metal",     prixIndicatif: 58, description: "Rectangle métal femme, profil net et affûté" },
  { id: "rion",   nom: "Rion",   genre: "homme",  forme: "carrée",    taille: "M", style: "classique", matiere: "metal",     prixIndicatif: 65, description: "Carrée métal précise, look professionnel" },
  { id: "vira",   nom: "Vira",   genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "metal",     prixIndicatif: 58, description: "Ronde micro métal, minimaliste et mode" },

  // ── Nylor ──────────────────────────────────────────────────────────────────
  { id: "zeno",   nom: "Zeno",   genre: "homme",  forme: "rectangle", taille: "M", style: "sport",     matiere: "nylor",     prixIndicatif: 72, description: "Demi-cerclée sport, le fil se fait oublier" },
  { id: "solea",  nom: "Soléa",  genre: "femme",  forme: "ovale",     taille: "M", style: "ville",     matiere: "nylor",     prixIndicatif: 68, description: "Nylor ovale légère, entre discrétion et style" },
  { id: "nova",   nom: "Nova",   genre: "mixte",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "nylor",     prixIndicatif: 75, description: "Petite ronde nylor, légèreté maximale" },
  { id: "aero",   nom: "Aero",   genre: "homme",  forme: "rectangle", taille: "L", style: "sport",     matiere: "nylor",     prixIndicatif: 82, description: "Grande nylor sport, tient en toutes circonstances" },
  { id: "sera",   nom: "Séra",   genre: "femme",  forme: "ovale",     taille: "S", style: "classique", matiere: "nylor",     prixIndicatif: 70, description: "Ovale nylor fine, élégance légère" },
  { id: "vox",    nom: "Vox",    genre: "homme",  forme: "carrée",    taille: "M", style: "ville",     matiere: "nylor",     prixIndicatif: 65, description: "Carrée nylor urbaine, structure et légèreté" },
  { id: "mela",   nom: "Méla",   genre: "mixte",  forme: "ovale",     taille: "M", style: "classique", matiere: "nylor",     prixIndicatif: 68, description: "Ovale nylor mixte, polyvalente et confortable" },
  { id: "lumo",   nom: "Lumo",   genre: "mixte",  forme: "rectangle", taille: "M", style: "sport",     matiere: "nylor",     prixIndicatif: 78, description: "Nylor rectangle sport, dynamique et moderne" },
  { id: "teva",   nom: "Teva",   genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "nylor",     prixIndicatif: 72, description: "Ronde nylor petite, délicate et originale" },
  { id: "brex",   nom: "Brex",   genre: "homme",  forme: "carrée",    taille: "L", style: "sport",     matiere: "nylor",     prixIndicatif: 85, description: "Grande carrée nylor sport, résistance maximale" },
  { id: "bryn",   nom: "Bryn",   genre: "homme",  forme: "rectangle", taille: "L", style: "sport",     matiere: "nylor",     prixIndicatif: 88, description: "Nylor grande rectangle, vision large garantie" },
  { id: "coxa",   nom: "Coxa",   genre: "mixte",  forme: "rectangle", taille: "L", style: "sport",     matiere: "nylor",     prixIndicatif: 92, description: "Rectangle nylor XL sport, pour les grands gabarits" },

  // ── Percée ─────────────────────────────────────────────────────────────────
  { id: "silky",  nom: "Silky",  genre: "femme",  forme: "ovale",     taille: "S", style: "tendance",  matiere: "percée",    prixIndicatif: 90,  description: "Percée ovale ultra-légère, pour sentir presque rien" },
  { id: "puro",   nom: "Puro",   genre: "homme",  forme: "rectangle", taille: "M", style: "classique", matiere: "percée",    prixIndicatif: 88,  description: "Rectangle percé minimaliste, la discrétion absolue" },
  { id: "aria",   nom: "Aria",   genre: "femme",  forme: "ronde",     taille: "S", style: "tendance",  matiere: "percée",    prixIndicatif: 95,  description: "Ronde percée invisible, légèreté et élégance" },
  { id: "lino",   nom: "Lino",   genre: "mixte",  forme: "ovale",     taille: "M", style: "ville",     matiere: "percée",    prixIndicatif: 85,  description: "Ovale percée neutre, s'efface sur tous les visages" },
  { id: "mino",   nom: "Mino",   genre: "homme",  forme: "rectangle", taille: "M", style: "classique", matiere: "percée",    prixIndicatif: 90,  description: "Rectangle percé classique, rigueur et élégance" },
  { id: "mara",   nom: "Mara",   genre: "femme",  forme: "ovale",     taille: "M", style: "classique", matiere: "percée",    prixIndicatif: 95,  description: "Ovale percée classique femme, intemporel" },
  { id: "trex",   nom: "Trex",   genre: "homme",  forme: "carrée",    taille: "L", style: "ville",     matiere: "plastique", prixIndicatif: 55,  description: "Grande carrée plastique citadine, look déterminé" },
];
