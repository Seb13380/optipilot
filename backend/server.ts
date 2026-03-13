import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword, signToken } from "../src/lib/auth";

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "OptiPilot Backend" });
});

// ─── Auth ─────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, motDePasse } = req.body;
    if (!email || !motDePasse) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const user = await prisma.utilisateur.findUnique({
      where: { email },
      include: { magasin: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const valid = await comparePassword(motDePasse, user.motDePasse);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    const token = signToken({
      userId: user.id,
      magasinId: user.magasinId,
      role: user.role,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        magasinId: user.magasinId,
        magasinNom: user.magasin.nom,
        onboardingDone: user.magasin.onboardingDone,
        plan: user.magasin.plan,
        trialEndsAt: user.magasin.trialEndsAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Inscription ───────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { nom, email, motDePasse } = req.body;
    if (!nom || !email || !motDePasse) {
      return res.status(400).json({ error: "Nom, email et mot de passe requis" });
    }
    if (motDePasse.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit faire au moins 8 caractères" });
    }

    const existing = await prisma.utilisateur.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Créer le magasin puis l'utilisateur (transaction interactive non supportée par proxy Prisma)
    const magasin = await prisma.magasin.create({
      data: {
        nom: `Magasin de ${nom}`,
        plan: "trial",
        trialEndsAt,
        onboardingDone: false,
      },
    });

    let utilisateur;
    try {
      const hash = await hashPassword(motDePasse);
      utilisateur = await prisma.utilisateur.create({
        data: {
          magasinId: magasin.id,
          nom,
          email,
          motDePasse: hash,
          role: "admin",
        },
      });
    } catch (innerErr: unknown) {
      // Nettoyage si la création utilisateur échoue
      await prisma.magasin.delete({ where: { id: magasin.id } }).catch(() => {});
      // Email déjà utilisé (Prisma P2002)
      const code = (innerErr as { code?: string }).code;
      if (code === "P2002") {
        return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
      }
      throw innerErr;
    }

    const token = signToken({
      userId: utilisateur.id,
      magasinId: magasin.id,
      role: utilisateur.role,
      email: utilisateur.email,
    });

    return res.status(201).json({
      token,
      user: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        magasinId: magasin.id,
        magasinNom: magasin.nom,
        onboardingDone: false,
        plan: "trial",
        trialEndsAt: magasin.trialEndsAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Clients ──────────────────────────────────────────────
// Recherche client par nom/prénom dans un magasin
app.get("/api/clients/search", async (req, res) => {
  try {
    const { nom, prenom, magasinId } = req.query as Record<string, string>;
    if (!magasinId) return res.status(400).json({ error: "magasinId requis" });

    const where: Record<string, unknown> = { magasinId };
    if (nom) where.nom = { contains: nom, mode: "insensitive" };
    if (prenom) where.prenom = { contains: prenom, mode: "insensitive" };

    const clients = await prisma.client.findMany({
      where,
      include: { ordonnances: { orderBy: { dateOrdonnance: "desc" }, take: 1 } },
      take: 5,
    });
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/clients/:id", async (req, res) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour client" });
  }
});

app.get("/api/clients/:magasinId", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { magasinId: req.params.magasinId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création client" });
  }
});

// ─── Devis ────────────────────────────────────────────────
app.get("/api/devis/:magasinId", async (req, res) => {
  try {
    const devis = await prisma.devis.findMany({
      where: { magasinId: req.params.magasinId },
      include: { client: true, ordonnance: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(devis);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/devis", async (req, res) => {
  try {
    const devis = await prisma.devis.create({ data: req.body });
    io.to(req.body.magasinId).emit("nouveau_devis", devis);
    res.json(devis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création devis" });
  }
});

app.patch("/api/devis/:id", async (req, res) => {
  try {
    const devis = await prisma.devis.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(devis);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour devis" });
  }
});

// ─── Stats Dashboard ──────────────────────────────────────
app.get("/api/stats/:magasinId", async (req, res) => {
  try {
    const { magasinId } = req.params;
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      devisJour,
      ventesJour,
      devisSemaine,
      ventesSemaine,
      devisMois,
      totalClients,
      clientsSemaine,
      clientsMois,
      panierData,
      dernierDevis,
      magasin,
    ] = await Promise.all([
      // Devis créés aujourd'hui
      prisma.devis.count({ where: { magasinId, createdAt: { gte: today, lt: tomorrow } } }),
      // Devis acceptés aujourd'hui
      prisma.devis.count({ where: { magasinId, statut: "accepté", createdAt: { gte: today, lt: tomorrow } } }),
      // Devis cette semaine
      prisma.devis.count({ where: { magasinId, createdAt: { gte: weekAgo } } }),
      // Ventes cette semaine
      prisma.devis.count({ where: { magasinId, statut: "accepté", createdAt: { gte: weekAgo } } }),
      // Devis ce mois
      prisma.devis.count({ where: { magasinId, createdAt: { gte: monthAgo } } }),
      // Total clients
      prisma.client.count({ where: { magasinId } }),
      // Nouveaux clients cette semaine
      prisma.client.count({ where: { magasinId, createdAt: { gte: weekAgo } } }),
      // Nouveaux clients ce mois
      prisma.client.count({ where: { magasinId, createdAt: { gte: monthAgo } } }),
      // Panier moyen (devis acceptés, total confort en priorité sinon essentiel)
      prisma.devis.findMany({
        where: { magasinId, statut: "accepté", createdAt: { gte: monthAgo } },
        select: { totalConfort: true, totalEssentiel: true, racConfirme: true, racReel: true },
      }),
      // 5 derniers devis avec client
      prisma.devis.findMany({
        where: { magasinId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { client: { select: { nom: true, prenom: true } } },
      }),
      // Info magasin (plan, trial)
      prisma.magasin.findUnique({
        where: { id: magasinId },
        select: { plan: true, trialEndsAt: true, nom: true },
      }),
    ]);

    // Calcul panier moyen
    const panierValues = panierData
      .map((d) => Number(d.totalConfort ?? d.totalEssentiel ?? 0))
      .filter((v) => v > 0);
    const panierMoyen = panierValues.length > 0
      ? Math.round(panierValues.reduce((a, b) => a + b, 0) / panierValues.length)
      : 0;

    // Taux de conversion
    const tauxConversionJour = devisJour > 0 ? Math.round((ventesJour / devisJour) * 100) : 0;
    const tauxConversionSemaine = devisSemaine > 0 ? Math.round((ventesSemaine / devisSemaine) * 100) : 0;

    // Jours de trial restants
    let trialDaysLeft: number | null = null;
    if (magasin?.plan === "trial" && magasin?.trialEndsAt) {
      const diff = new Date(magasin.trialEndsAt).getTime() - now.getTime();
      trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Derniers devis formatés
    const recentDevis = dernierDevis.map((d) => ({
      id: d.id,
      client: `${d.client.prenom} ${d.client.nom}`,
      statut: d.statut,
      total: Number(d.totalConfort ?? d.totalEssentiel ?? 0),
      createdAt: d.createdAt,
    }));

    res.json({
      // Aujourd'hui
      devisJour,
      ventesJour,
      panierMoyen,
      tauxConversionJour,
      // Semaine
      devisSemaine,
      ventesSemaine,
      tauxConversionSemaine,
      // Mois
      devisMois,
      clientsMois,
      // Clients
      totalClients,
      clientsSemaine,
      // Récents
      recentDevis,
      // Plan
      plan: magasin?.plan ?? "trial",
      trialDaysLeft,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Erreur stats" });
  }
});

// ─── Ordonnances ──────────────────────────────────────────
app.post("/api/ordonnances", async (req, res) => {
  try {
    const ordonnance = await prisma.ordonnance.create({ data: req.body });
    res.json(ordonnance);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur création ordonnance" });
  }
});

// ─── Magasin ──────────────────────────────────────────────
app.get("/api/magasin/:id", async (req, res) => {
  try {
    const magasin = await prisma.magasin.findUnique({
      where: { id: req.params.id },
    });
    if (!magasin) return res.status(404).json({ error: "Magasin non trouvé" });
    res.json(magasin);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/api/magasin/:id", async (req, res) => {
  try {
    const {
      nom, siret, adresse, ville, codePostal,
      email, telephone, reseauMutuelle, loginMutuelle, mdpMutuelle,
      onboardingDone,
    } = req.body;

    // Vérifier si le siret est déjà utilisé par UN AUTRE magasin
    let siretToSave: string | undefined = siret;
    if (siret) {
      const existingSiret = await prisma.magasin.findUnique({ where: { siret } });
      if (existingSiret && existingSiret.id !== req.params.id) {
        // SIRET pris par un autre compte → on l'ignore silencieusement
        siretToSave = undefined;
      }
    }

    const magasin = await prisma.magasin.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(siretToSave !== undefined && { siret: siretToSave }),
        ...(adresse !== undefined && { adresse }),
        ...(ville !== undefined && { ville }),
        ...(codePostal !== undefined && { codePostal }),
        ...(email !== undefined && { email }),
        ...(telephone !== undefined && { telephone }),
        ...(reseauMutuelle !== undefined && { reseauMutuelle }),
        ...(loginMutuelle !== undefined && { loginMutuelle }),
        ...(mdpMutuelle !== undefined && { mdpMutuelle }),
        ...(onboardingDone !== undefined && { onboardingDone }),
      },
    });
    res.json(magasin);
  } catch (err: unknown) {
    console.error("PUT /api/magasin error:", err);
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      return res.status(404).json({ error: "Magasin introuvable. Reconnectez-vous.", code: "P2025" });
    }
    if (code === "P2002") {
      return res.status(409).json({ error: "SIRET déjà utilisé.", code: "P2002" });
    }
    res.status(500).json({ error: "Erreur mise à jour magasin" });
  }
});

// ─── Questionnaires ───────────────────────────────────────
app.post("/api/questionnaires", async (req, res) => {
  try {
    const questionnaire = await prisma.questionnaire.create({ data: req.body });
    io.to(req.body.magasinId || "").emit("questionnaire_complete", questionnaire);
    res.json(questionnaire);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur questionnaire" });
  }
});

// ─── Mutuelles ────────────────────────────────────────────
app.get("/api/mutuelles", async (_req, res) => {
  try {
    const mutuelles = await prisma.mutuelle.findMany({
      orderBy: [{ nom: "asc" }, { niveau: "asc" }],
    });
    res.json(mutuelles);
  } catch (err) {
    res.status(500).json({ error: "Erreur mutuelles" });
  }
});

app.get("/api/mutuelles/:nom/:niveau", async (req, res) => {
  try {
    const mutuelle = await prisma.mutuelle.findFirst({
      where: { nom: req.params.nom, niveau: req.params.niveau },
    });
    res.json(mutuelle || { remboursementUnifocal: 0, remboursementProgressif: 0, tarifsDetail: null });
  } catch (err) {
    res.status(500).json({ error: "Erreur mutuelle" });
  }
});

// Mise à jour des tarifs d'une mutuelle (admin) — met à jour tarifsDetail + champs plats
app.put("/api/mutuelles/:id", async (req, res) => {
  try {
    const { tarifsDetail, remboursementUnifocal, remboursementProgressif, remboursementSolaire } = req.body as {
      tarifsDetail?: object;
      remboursementUnifocal?: number;
      remboursementProgressif?: number;
      remboursementSolaire?: number;
    };
    const updated = await prisma.mutuelle.update({
      where: { id: req.params.id },
      data: {
        ...(tarifsDetail !== undefined && { tarifsDetail }),
        ...(remboursementUnifocal !== undefined && { remboursementUnifocal }),
        ...(remboursementProgressif !== undefined && { remboursementProgressif }),
        ...(remboursementSolaire !== undefined && { remboursementSolaire }),
      },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour mutuelle" });
  }
});

// ─── Verres catalogue ─────────────────────────────────────
app.get("/api/verres", async (_req, res) => {
  try {
    const verres = await prisma.verre.findMany({
      orderBy: [{ verrier: "asc" }, { type: "asc" }, { indice: "asc" }],
    });
    res.json(verres);
  } catch (err) {
    res.status(500).json({ error: "Erreur verres" });
  }
});

// ─── Config tarifs magasin ────────────────────────────────
app.get("/api/config-tarifs/:magasinId", async (req, res) => {
  try {
    const tarifs = await prisma.configTarif.findMany({
      where: { magasinId: req.params.magasinId },
      include: { verre: true },
    });
    res.json(tarifs);
  } catch (err) {
    res.status(500).json({ error: "Erreur config tarifs" });
  }
});

app.put("/api/config-tarifs/:id", async (req, res) => {
  try {
    const tarif = await prisma.configTarif.update({
      where: { id: req.params.id },
      data: { prixVente: req.body.prixVente, coefficient: req.body.coefficient },
    });
    res.json(tarif);
  } catch (err) {
    res.status(500).json({ error: "Erreur mise à jour tarif" });
  }
});

// ─── RAC Mutuelle — flux temps réel ──────────────────────
// L'agent local PC envoie le résultat ici après Playwright
app.post("/api/rac-result", (req, res) => {
  const { magasinId, clientId, resultat } = req.body as {
    magasinId: string;
    clientId: string;
    resultat: {
      montant: number;
      secu: number;
      mutuelle: number;
      detail: string;
      statut: string;
    };
  };

  if (!magasinId || !resultat) {
    return res.status(400).json({ error: "magasinId et resultat requis" });
  }

  // Mise à jour BDD asynchrone si devis existant
  if (clientId) {
    prisma.devis
      .updateMany({
        where: { magasinId, statut: "en_cours" },
        data: { racConfirme: true, racReel: resultat.montant },
      })
      .catch(console.error);
  }

  // Push temps réel vers l'iPad via Socket.io
  io.to(magasinId).emit("rac-confirme", resultat);

  return res.json({ ok: true, pushed: true });
});

// L'iPad demande une cotation → le backend route vers l'agent local
app.post("/api/rac-request", (req, res) => {
  const { magasinId, ...cotationData } = req.body as {
    magasinId: string;
    clientId: string;
    mutuelle: string;
    niveauGarantie: string;
    typeVerre: string;
    totalDevis: number;
    offre: string;
  };

  if (!magasinId) {
    return res.status(400).json({ error: "magasinId requis" });
  }

  // Envoyer la demande à l'agent local (s'il est connecté dans la room)
  io.to(magasinId).emit("cotation_request", { magasinId, ...cotationData });

  return res.json({ ok: true, message: "Demande envoyée à l'agent local" });
});

// ─── Relances ─────────────────────────────────────────────
// Retourne les devis en_cours/relance avec données client pour la page de relances
app.get("/api/relances/:magasinId", async (req, res) => {
  try {
    const devis = await prisma.devis.findMany({
      where: {
        magasinId: req.params.magasinId,
        statut: { in: ["en_cours", "relance"] },
      },
      include: {
        client: {
          select: { nom: true, prenom: true, email: true, telephone: true, consentementRelance: true },
        },
      },
      orderBy: { updatedAt: "asc" }, // plus anciens = plus urgents
    });

    const now = Date.now();
    const relances = devis.map((d) => ({
      id: d.id,
      nom: `${d.client.prenom} ${d.client.nom}`,
      telephone: d.client.telephone || "",
      email: d.client.email || "",
      consentementRelance: d.client.consentementRelance,
      devis: `DEV-${d.id.slice(-6).toUpperCase()}`,
      montant: Number(d.totalConfort ?? d.totalEssentiel ?? d.totalPremium ?? 0),
      dateDevis: d.createdAt,
      joursSansReponse: Math.floor((now - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      statut: d.statut === "relance" ? "relance" : "a_relancer",
      offre: d.offreChoisie
        ? d.offreChoisie.charAt(0).toUpperCase() + d.offreChoisie.slice(1)
        : "Non spécifié",
    }));

    res.json(relances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur relances" });
  }
});

// ─── Socket.io ────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("Client connecté:", socket.id);

  socket.on("rejoindre_magasin", (magasinId: string) => {
    socket.join(magasinId);
    console.log(`Socket ${socket.id} rejoint magasin ${magasinId}`);
  });

  socket.on("cotation_request", (data) => {
    socket.to(data.magasinId).emit("cotation_request", data);
  });

  // L'agent local PC envoie le résultat Playwright ici
  socket.on("cotation_result", (data) => {
    const resultat = {
      montant: data.racReel,
      secu: data.secu,
      mutuelle: data.remboursementMutuelle,
      detail: data.detail,
      statut: data.statut,
    };
    socket.to(data.magasinId).emit("rac-confirme", resultat);
  });

  socket.on("questionnaire_reponse", (data) => {
    socket.to(data.magasinId).emit("questionnaire_reponse", data);
  });

  socket.on("disconnect", () => {
    console.log("Client déconnecté:", socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || process.env.BACKEND_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`✅ OptiPilot Backend démarré sur port ${PORT}`);
});
