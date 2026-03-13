import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed OptiPilot...");

  // ─── Magasin démo ─────────────────────────────────────────────
  const magasin = await prisma.magasin.upsert({
    where: { id: "demo-magasin" },
    update: { onboardingDone: true, plan: "standard" },
    create: {
      id: "demo-magasin",
      nom: "Optique Lumière",
      adresse: "12 Rue de la Paix",
      ville: "Paris",
      codePostal: "75001",
      email: "contact@optique-lumiere.fr",
      telephone: "01 23 45 67 89",
      onboardingDone: true,
      plan: "standard",
    },
  });
  console.log("✅ Magasin:", magasin.nom);

  // ─── Utilisateur admin démo ───────────────────────────────────
  const hash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.utilisateur.upsert({
    where: { email: "demo@optipilot.fr" },
    update: {},
    create: {
      id: "demo-user",
      magasinId: "demo-magasin",
      nom: "Dr. Martin",
      email: "demo@optipilot.fr",
      motDePasse: hash,
      role: "admin",
    },
  });
  console.log("✅ Utilisateur:", user.email);

  // ─── Verres catalogue ─────────────────────────────────────────
  const verres = [
    // ── Essilor ──
    {
      id: "verre-essilor-essentiel-1-5",
      verrier: "Essilor",
      gamme: "Eyezen Start",
      type: "unifocal",
      indice: 1.5,
      traitement: "antireflets",
      classe100ps: "A",
      prixTarif: 95,
      caracteristiques: { protection: "lumière bleue" },
    },
    {
      id: "verre-essilor-essentiel-1-6",
      verrier: "Essilor",
      gamme: "Eyezen Start",
      type: "unifocal",
      indice: 1.6,
      traitement: "antireflets",
      classe100ps: "A",
      prixTarif: 120,
      caracteristiques: { protection: "lumière bleue" },
    },
    {
      id: "verre-essilor-varilux-comfort",
      verrier: "Essilor",
      gamme: "Varilux Comfort",
      type: "progressif",
      indice: 1.6,
      traitement: "Crizal Prevencia",
      classe100ps: "B",
      prixTarif: 280,
      caracteristiques: { adaptation: "facile", zones: "larges" },
    },
    {
      id: "verre-essilor-varilux-xseries",
      verrier: "Essilor",
      gamme: "Varilux X Series",
      type: "progressif",
      indice: 1.67,
      traitement: "Crizal Sapphire",
      classe100ps: "B",
      prixTarif: 420,
      caracteristiques: { technologie: "xtend", zones: "très larges" },
    },
    // ── Nikon ──
    {
      id: "verre-nikon-lite-sp",
      verrier: "Nikon",
      gamme: "Lite SP",
      type: "unifocal",
      indice: 1.5,
      traitement: "SHR+ antireflets",
      classe100ps: "A",
      prixTarif: 85,
      caracteristiques: {},
    },
    {
      id: "verre-nikon-presio-power",
      verrier: "Nikon",
      gamme: "Presio Power",
      type: "progressif",
      indice: 1.6,
      traitement: "SHR+ antireflets",
      classe100ps: "B",
      prixTarif: 240,
      caracteristiques: { zones: "larges" },
    },
    // ── Zeiss ──
    {
      id: "verre-zeiss-singlev",
      verrier: "Zeiss",
      gamme: "Single Vision Plus",
      type: "unifocal",
      indice: 1.6,
      traitement: "DuraVision Platinum",
      classe100ps: "A",
      prixTarif: 140,
      caracteristiques: {},
    },
    {
      id: "verre-zeiss-progressive-plus",
      verrier: "Zeiss",
      gamme: "Progressive Plus 2",
      type: "progressif",
      indice: 1.67,
      traitement: "DuraVision Platinum",
      classe100ps: "B",
      prixTarif: 390,
      caracteristiques: { technologie: "Individual 2" },
    },
  ] as const;

  for (const v of verres) {
    await prisma.verre.upsert({
      where: { id: v.id },
      update: {},
      create: v as Parameters<typeof prisma.verre.create>["0"]["data"],
    });
  }
  console.log("✅ Verres catalogue:", verres.length, "articles");

  // ─── Config tarifs magasin (coefficient 1.0 = prix tarif) ─────
  for (const v of verres) {
    const existing = await prisma.configTarif.findFirst({
      where: { magasinId: "demo-magasin", verreId: v.id },
    });
    if (!existing) {
      await prisma.configTarif.create({
        data: {
          magasinId: "demo-magasin",
          verreId: v.id,
          coefficient: 1.0,
          prixVente: v.prixTarif,
        },
      });
    }
  }
  console.log("✅ Config tarifs magasin créés");

  // ─── Mutuelles ────────────────────────────────────────────────
  // Tarifs MGEN officiels extraits des grilles de garanties publiques (>18 ans)
  // tarifsDetail.parVerre = true → toutes valeurs en €/verre → ×2 pour la paire
  // Tarifs SS réels post-réforme 100% Santé (2020), taux 60% appliqué :
  //   unifocal faible  (|sph| ≤ 6, cyl ≤ 4) : base 30€ × 60% = 18€/verre → 36€/paire
  //   unifocal forte   (|sph| > 6 ou cyl > 4): base 46.86€ × 60% ≈ 28€/verre → 56€/paire
  //   progressif faible: base 105€ × 60% = 63€/verre → 126€/paire
  //   progressif forte : base 124.30€ × 60% ≈ 74€/verre → 149€/paire
  console.log("→ Création mutuelles...");

  type TarifsReseau = { unifocalFaible: number; unifocalForte: number; progressifFaible: number; progressifForte: number; monture: number };
  type TarifsDetail = { parVerre: true; horsReseau: TarifsReseau; dansReseau: TarifsReseau };

  const mutuelles: Array<{
    id: string; nom: string; reseau: string; niveau: string;
    remboursementUnifocal: number; remboursementProgressif: number;
    tarifsDetail: TarifsDetail;
  }> = [
    // ── MGEN — 4 niveaux officiels ─────────────────────────────────────────
    {
      id: "mut-mgen-initiale",
      nom: "MGEN", reseau: "direct", niveau: "Initiale",
      remboursementUnifocal: 45,    // 2 × hors réseau unifocal faible (22.50)
      remboursementProgressif: 170, // 2 × hors réseau progressif faible (85)
      tarifsDetail: {
        parVerre: true,
        horsReseau: { unifocalFaible: 22.50, unifocalForte: 85,  progressifFaible: 85,  progressifForte: 85,  monture: 30 },
        dansReseau:  { unifocalFaible: 27,    unifocalForte: 102, progressifFaible: 102, progressifForte: 102, monture: 30 },
      },
    },
    {
      id: "mut-mgen-equilibre",
      nom: "MGEN", reseau: "direct", niveau: "Équilibre",
      remboursementUnifocal: 45,
      remboursementProgressif: 170,
      tarifsDetail: {
        parVerre: true,
        horsReseau: { unifocalFaible: 22.50, unifocalForte: 85,  progressifFaible: 85,  progressifForte: 85,  monture: 30 },
        dansReseau:  { unifocalFaible: 27,    unifocalForte: 102, progressifFaible: 102, progressifForte: 102, monture: 30 },
      },
    },
    {
      id: "mut-mgen-reference",
      nom: "MGEN", reseau: "direct", niveau: "Référence",
      remboursementUnifocal: 90,    // 2 × 45 (hors réseau unifocal faible)
      remboursementProgressif: 210, // 2 × 105
      tarifsDetail: {
        parVerre: true,
        horsReseau: { unifocalFaible: 45,  unifocalForte: 105, progressifFaible: 105, progressifForte: 120, monture: 60 },
        dansReseau:  { unifocalFaible: 60,  unifocalForte: 140, progressifFaible: 140, progressifForte: 160, monture: 60 },
      },
    },
    {
      id: "mut-mgen-integrale",
      nom: "MGEN", reseau: "direct", niveau: "Intégrale",
      remboursementUnifocal: 120,   // 2 × 60 (hors réseau unifocal faible)
      remboursementProgressif: 240, // 2 × 120
      tarifsDetail: {
        parVerre: true,
        horsReseau: { unifocalFaible: 60,  unifocalForte: 120, progressifFaible: 120, progressifForte: 150, monture: 90 },
        dansReseau:  { unifocalFaible: 80,  unifocalForte: 160, progressifFaible: 160, progressifForte: 200, monture: 90 },
      },
    },
    // ── Autres mutuelles (valeurs officielles ou indicatives) ─────────────
    { id: "mut-harmonie-base",    nom: "Harmonie Mutuelle", reseau: "kalivia",    niveau: "Base",    remboursementUnifocal: 70,  remboursementProgressif: 100, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 35,  unifocalForte: 70,  progressifFaible: 50,  progressifForte: 55,  monture: 20 }, dansReseau: { unifocalFaible: 45,  unifocalForte: 90,  progressifFaible: 70,  progressifForte: 75,  monture: 25 } } },
    { id: "mut-harmonie-confort", nom: "Harmonie Mutuelle", reseau: "kalivia",    niveau: "Confort", remboursementUnifocal: 130, remboursementProgressif: 200, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 65,  unifocalForte: 110, progressifFaible: 100, progressifForte: 110, monture: 35 }, dansReseau: { unifocalFaible: 80,  unifocalForte: 135, progressifFaible: 130, progressifForte: 145, monture: 45 } } },
    { id: "mut-harmonie-premium", nom: "Harmonie Mutuelle", reseau: "kalivia",    niveau: "Premium", remboursementUnifocal: 250, remboursementProgressif: 400, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 125, unifocalForte: 200, progressifFaible: 200, progressifForte: 230, monture: 65 }, dansReseau: { unifocalFaible: 160, unifocalForte: 250, progressifFaible: 260, progressifForte: 300, monture: 80 } } },
    { id: "mut-malakoff-base",    nom: "Malakoff Humanis",  reseau: "itelis",     niveau: "Base",    remboursementUnifocal: 60,  remboursementProgressif: 90,  tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 30,  unifocalForte: 60,  progressifFaible: 45,  progressifForte: 50,  monture: 15 }, dansReseau: { unifocalFaible: 40,  unifocalForte: 80,  progressifFaible: 60,  progressifForte: 65,  monture: 20 } } },
    { id: "mut-malakoff-premium", nom: "Malakoff Humanis",  reseau: "itelis",     niveau: "Premium", remboursementUnifocal: 220, remboursementProgressif: 350, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 110, unifocalForte: 180, progressifFaible: 175, progressifForte: 200, monture: 55 }, dansReseau: { unifocalFaible: 140, unifocalForte: 220, progressifFaible: 225, progressifForte: 260, monture: 70 } } },
    { id: "mut-generali-base",    nom: "Generali",          reseau: "santeclair", niveau: "Base",    remboursementUnifocal: 65,  remboursementProgressif: 95,  tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 32,  unifocalForte: 65,  progressifFaible: 47,  progressifForte: 52,  monture: 18 }, dansReseau: { unifocalFaible: 42,  unifocalForte: 82,  progressifFaible: 62,  progressifForte: 67,  monture: 22 } } },
    { id: "mut-generali-premium", nom: "Generali",          reseau: "santeclair", niveau: "Premium", remboursementUnifocal: 200, remboursementProgressif: 380, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 100, unifocalForte: 170, progressifFaible: 190, progressifForte: 215, monture: 50 }, dansReseau: { unifocalFaible: 130, unifocalForte: 210, progressifFaible: 245, progressifForte: 280, monture: 65 } } },
    { id: "mut-ag2r-confort",     nom: "AG2R",              reseau: "direct",     niveau: "Confort", remboursementUnifocal: 140, remboursementProgressif: 220, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 70,  unifocalForte: 120, progressifFaible: 110, progressifForte: 120, monture: 38 }, dansReseau: { unifocalFaible: 90,  unifocalForte: 150, progressifFaible: 145, progressifForte: 160, monture: 50 } } },
    { id: "mut-ag2r-premium",     nom: "AG2R",              reseau: "direct",     niveau: "Premium", remboursementUnifocal: 270, remboursementProgressif: 450, tarifsDetail: { parVerre: true, horsReseau: { unifocalFaible: 135, unifocalForte: 215, progressifFaible: 225, progressifForte: 250, monture: 70 }, dansReseau: { unifocalFaible: 175, unifocalForte: 270, progressifFaible: 290, progressifForte: 325, monture: 90 } } },
  ];

  for (const m of mutuelles) {
    await prisma.mutuelle.upsert({
      where: { id: m.id },
      update: {
        remboursementUnifocal: m.remboursementUnifocal,
        remboursementProgressif: m.remboursementProgressif,
        tarifsDetail: m.tarifsDetail as object,
      },
      create: { ...m, tarifsDetail: m.tarifsDetail as object },
    });
  }
  console.log("✅ Mutuelles:", mutuelles.length, "entrées (tarifs officiels MGEN + autres mutuelles)");

  // ─── Client démo + ordonnance ─────────────────────────────────
  const clientDemo = await prisma.client.upsert({
    where: { id: "demo-client-1" },
    update: {},
    create: {
      id: "demo-client-1",
      magasinId: "demo-magasin",
      nom: "Dupont",
      prenom: "Sophie",
      dateNaissance: new Date("1975-04-12"),
      email: "sophie.dupont@email.fr",
      telephone: "06 12 34 56 78",
      mutuelle: "MGEN",
      niveauGarantie: "Confort",
      consentementRgpd: true,
      consentementRelance: true,
    },
  });

  await prisma.ordonnance.upsert({
    where: { id: "demo-ordo-1" },
    update: {},
    create: {
      id: "demo-ordo-1",
      clientId: "demo-client-1",
      dateOrdonnance: new Date("2025-11-20"),
      validiteMois: 36,
      odSphere: -2.5,
      odCylindre: 0.75,
      odAxe: 90,
      odAddition: 2.0,
      ogSphere: -3.0,
      ogCylindre: 1.25,
      ogAxe: 85,
      ogAddition: 2.0,
      prescripteur: "Dr. Lefebvre",
    },
  });
  console.log("✅ Client démo + ordonnance créés");

  console.log("\n🎉 Seed terminé !\n");
  console.log("─────────────────────────────────────────");
  console.log("  Login : demo@optipilot.fr");
  console.log("  Mot de passe : demo1234");
  console.log("  Magasin : Optique Lumière");
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
