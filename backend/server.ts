import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword, signToken, verifyToken, TokenPayload } from "../src/lib/auth";

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

const allowedOrigins = [
  "http://localhost:3000",
  "https://optipilot.vercel.app",
  ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Auth Middleware ──────────────────────────────────────
interface AuthRequest extends Request { user?: TokenPayload; }

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Routes publiques — pas de JWT
  if (
    req.path === "/health" ||
    req.path.startsWith("/api/auth/") ||
    (req.method === "POST" && req.path === "/api/noemie/push")
  ) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  try {
    (req as AuthRequest).user = verifyToken(authHeader.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

app.use(requireAuth);

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

// ─── Utilisateur ─────────────────────────────────────────
// PATCH /api/utilisateur/:id  — mise à jour nom/email (+rôle si admin)
app.patch("/api/utilisateur/:id", async (req, res) => {
  try {
    const { nom, email, role } = req.body as { nom?: string; email?: string; role?: string };

    // Récupérer le rôle actuel de cet utilisateur pour savoir s'il peut changer le rôle
    const current = await prisma.utilisateur.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Utilisateur introuvable" });

    const data: Record<string, unknown> = {};
    if (nom  && nom.trim())  data.nom  = nom.trim();
    if (email && email.trim()) {
      // Vérifier unicité email si changé
      if (email.trim() !== current.email) {
        const exists = await prisma.utilisateur.findUnique({ where: { email: email.trim() } });
        if (exists) return res.status(409).json({ error: "Cet email est déjà utilisé" });
      }
      data.email = email.trim();
    }
    // Seul un admin peut changer le rôle
    if (role && current.role === "admin") {
      data.role = role;
    }

    const updated = await prisma.utilisateur.update({
      where: { id: req.params.id },
      data,
      select: { id: true, nom: true, email: true, role: true, magasinId: true },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour utilisateur" });
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
    const { nom, prenom, email, telephone, adresse, mutuelle, niveauGarantie, numAdherent, consentementRelance } = req.body as {
      nom?: string; prenom?: string; email?: string | null; telephone?: string | null;
      adresse?: string | null; mutuelle?: string | null; niveauGarantie?: string | null;
      numAdherent?: string | null; consentementRelance?: boolean;
    };
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: { nom, prenom, email, telephone, adresse, mutuelle, niveauGarantie, numAdherent, consentementRelance },
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
    const devis = await (prisma.devis as any).update({
      where: { id: req.params.id },
      data: req.body,
    });

    // ── Auto-init rapprochement tiers payant ─────────────────────────────────
    // Dès qu'un devis passe "accepté", si les montants SS/mutuelle sont connus
    // (remontés par le bridge ou saisis dans le devis), on initialise
    // automatiquement le suivi TP sans aucune action manuelle.
    if (req.body.statut === "accepté") {
      const remSS  = Number(devis.racReel ?? devis.racEssentiel ?? 0);  // montant SS = base remb sécu
      // La SS rembourse une base tarifaire fixe (environ 15,65 € par verre pour un unifocal)
      // On cherche d'abord dans les champs dédiés, sinon on laisse à 0
      const montantSS  = Number((devis as any).remboursementSS  ?? 0);
      const montantMut = Number((devis as any).remboursementMutuelle ?? 0);
      const initData: Record<string, unknown> = {};
      if (montantSS  > 0 && !(devis as any).statutPaiementSS)       { initData.statutPaiementSS = "en_attente"; initData.montantAttenduSS = montantSS; }
      if (montantMut > 0 && !(devis as any).statutPaiementMutuelle) { initData.statutPaiementMutuelle = "en_attente"; initData.montantAttenduMutuelle = montantMut; }
      if (Object.keys(initData).length > 0) {
        await (prisma.devis as any).update({ where: { id: req.params.id }, data: initData });
        console.log(`[TP] Auto-init rapprochement devis ${req.params.id} — SS:${montantSS}€ Mut:${montantMut}€`);
      }
    }

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

// ─── Rapprochements tiers payant ─────────────────────────

// POST /api/noemie/push
// Reçoit les règlements NOEMIE poussés par le bridge et met à jour
// automatiquement les statuts des dossiers concernés.
// Sécurisé par x-bridge-token (même token que le bridge, stocké en env var).
app.post("/api/noemie/push", async (req, res) => {
  const bridgeToken = req.headers["x-bridge-token"];
  const expectedToken = process.env.BRIDGE_TOKEN;
  if (!expectedToken || bridgeToken !== expectedToken) {
    return res.status(401).json({ error: "Token bridge invalide" });
  }

  const { reglements } = req.body as {
    reglements: {
      id: string;
      idDevis: string;
      organisme: string;         // "SS", "CPAM", "MUTUELLE", "AMC"…
      montant: number;
      dateReglement: string;
      statut: string;            // "REGLE", "REJETE", "PARTIEL"
      motifRejet?: string;
      reference?: string;
    }[];
  };

  if (!Array.isArray(reglements) || reglements.length === 0) {
    return res.json({ ok: true, traites: 0 });
  }

  let traites = 0;
  const erreurs: string[] = [];

  for (const reg of reglements) {
    try {
      // Retrouver le devis OptiPilot par son idDevis Optimum
      // Le devis est lié via son champ pdfUrl ou via un champ externe — 
      // on cherche d'abord par id direct, puis par correspondance approchée
      const devis = await (prisma.devis as any).findFirst({
        where: { id: reg.idDevis },
      });
      if (!devis) continue; // devis Optimum pas encore dans OptiPilot — ignoré

      const isSS = /SS|CPAM|SECURITE|SECU|AMO/i.test(reg.organisme);
      const isMut = /MUTUELLE|AMC|COMPLEMENTAIRE|CMU/i.test(reg.organisme);
      const statut = /REJET|KO|REFUSE/i.test(reg.statut) ? "rejete"
                   : /PARTIEL|PARTIELLE/i.test(reg.statut) ? "partiel"
                   : "recu";

      const data: Record<string, unknown> = {};
      if (isSS) {
        data.statutPaiementSS    = statut;
        data.montantRecuSS       = reg.montant;
        data.datePaiementSS      = new Date(reg.dateReglement);
        if (statut === "rejete") data.motifRejetSS = reg.motifRejet || "Rejet NOEMIE";
      } else if (isMut) {
        data.statutPaiementMutuelle    = statut;
        data.montantRecuMutuelle       = reg.montant;
        data.datePaiementMutuelle      = new Date(reg.dateReglement);
        if (statut === "rejete") data.motifRejetMutuelle = reg.motifRejet || "Rejet mutuelle";
      }

      if (Object.keys(data).length > 0) {
        await (prisma.devis as any).update({ where: { id: devis.id }, data });
        // Push temps réel vers la tablette
        io.to(devis.magasinId).emit("noemie_update", {
          devisId: devis.id,
          organisme: isSS ? "SS" : "Mutuelle",
          statut,
          montant: reg.montant,
          dateReglement: reg.dateReglement,
        });
        traites++;
      }
    } catch (e) {
      erreurs.push(`${reg.idDevis}: ${(e as Error).message}`);
    }
  }

  console.log(`[NOEMIE] Push traité — ${traites}/${reglements.length} dossiers mis à jour`);
  return res.json({ ok: true, traites, total: reglements.length, erreurs: erreurs.length > 0 ? erreurs : undefined });
});

// POST /api/rapprochements/import-releve
// Import d'un relevé bancaire CSV pour rapprochement semi-automatique.
// Format attendu : CSV avec colonnes date, libelle, montant (débit/crédit séparés ou combinés).
// Retourne les lignes qui ressemblent à des remboursements SS/mutuelle avec
// le dossier OptiPilot correspondant le plus probable.
app.post("/api/rapprochements/import-releve/:magasinId", async (req, res) => {
  try {
    const { magasinId } = req.params;
    const { csvContent, separateur } = req.body as { csvContent: string; separateur?: string };

    if (!csvContent) return res.status(400).json({ error: "csvContent requis" });

    const sep = separateur ?? (csvContent.includes(";") ? ";" : ",");
    const lines = csvContent.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: "Fichier vide ou invalide" });

    const headers = lines[0].split(sep).map((h) => h.trim().replace(/"/g, "").toUpperCase());

    // Détection souple des colonnes date / libellé / montant
    const iCol = (kws: string[]) => headers.findIndex((h) => kws.some((k) => h.includes(k)));
    const colDate    = iCol(["DATE","DATE_OPERATION","DATE_VAL","DT"]);
    const colLibelle = iCol(["LIBELLE","LABEL","DESCRIPTION","OPERATION","INTITULE"]);
    const colCredit  = iCol(["CREDIT","ENTREE","ENCAISSEMENT","AVOIR","MONTANT_CREDIT"]);
    const colMontant = colCredit === -1 ? iCol(["MONTANT","AMOUNT","VALEUR","SOMME"]) : -1;

    if (colDate === -1 || colLibelle === -1) {
      return res.status(400).json({
        error: "Colonnes date/libellé non trouvées",
        conseil: "Le fichier doit contenir au moins les colonnes DATE et LIBELLE",
        colonnesTrouvees: headers,
      });
    }

    // Mots-clés typiques des virements SS et mutuelle
    const patternSS  = /CPAM|CARSAT|AMELI|SECURITE SOCIALE|CPAM_|CAISSE PRIM|NOEMIE/i;
    const patternMut = /MUTUELLE|HARMONIE|MGEN|MALAKOFF|APICIL|APRIL|AXA SANTE|GROUPAMA SANTE|SWISS LIFE|GENERALI|MAAF|MATMUT|ALLIANZ|MNH|SMACL|KLESIA|ALAN SANTE|CCMO/i;

    const lignesTP: {
      date: string;
      libelle: string;
      montant: number;
      organisme: "SS" | "Mutuelle" | "Inconnu";
      dossierSuggere?: { id: string; client: string; montantAttendu: number; ecart: number };
    }[] = [];

    // Charger les dossiers en attente de ce magasin pour le rapprochement
    const dossiers = await (prisma.devis as any).findMany({
      where: {
        magasinId,
        statut: "accepté",
        OR: [
          { statutPaiementSS: "en_attente" },
          { statutPaiementMutuelle: "en_attente" },
        ],
      },
      include: { client: { select: { nom: true, prenom: true } } },
    });

    for (const line of lines.slice(1)) {
      const cols = line.split(sep).map((c) => c.trim().replace(/"/g, ""));
      const libelle = cols[colLibelle] ?? "";
      const dateStr = cols[colDate] ?? "";

      // Montant : credit direct ou montant positif
      let montant = 0;
      if (colCredit !== -1) {
        montant = parseFloat(cols[colCredit]?.replace(",", ".") ?? "0") || 0;
      } else if (colMontant !== -1) {
        montant = parseFloat(cols[colMontant]?.replace(",", ".") ?? "0") || 0;
      }

      if (montant <= 0) continue; // on ne garde que les crédits

      const isSS  = patternSS.test(libelle);
      const isMut = patternMut.test(libelle);
      if (!isSS && !isMut) continue; // pas un remboursement TP

      const organisme: "SS" | "Mutuelle" | "Inconnu" = isSS ? "SS" : isMut ? "Mutuelle" : "Inconnu";

      // Trouver le dossier dont le montant attendu est le plus proche
      let dossierSuggere;
      let minEcart = Infinity;
      for (const d of dossiers) {
        const attendu = organisme === "SS"
          ? Number(d.montantAttenduSS ?? 0)
          : Number(d.montantAttenduMutuelle ?? 0);
        if (attendu <= 0) continue;
        const ecart = Math.abs(attendu - montant);
        if (ecart < minEcart && ecart / attendu < 0.3) { // tolérance 30%
          minEcart = ecart;
          dossierSuggere = {
            id: d.id,
            client: `${d.client.prenom} ${d.client.nom}`,
            montantAttendu: attendu,
            ecart: Math.round(ecart * 100) / 100,
          };
        }
      }

      lignesTP.push({ date: dateStr, libelle, montant, organisme, dossierSuggere });
    }

    res.json({
      ok: true,
      lignes: lignesTP,
      total: lignesTP.length,
      message: lignesTP.length === 0
        ? "Aucune ligne de remboursement SS/mutuelle détectée dans ce relevé"
        : `${lignesTP.length} ligne(s) de remboursement tiers payant trouvée(s)`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur analyse relevé" });
  }
});

// POST /api/rapprochements/confirmer-releve
// Confirme une ou plusieurs lignes de relevé → met à jour les dossiers
app.post("/api/rapprochements/confirmer-releve", async (req, res) => {
  const { confirmations } = req.body as {
    confirmations: {
      devisId: string;
      organisme: "SS" | "Mutuelle";
      montant: number;
      date: string;
    }[];
  };

  if (!Array.isArray(confirmations)) return res.status(400).json({ error: "confirmations requis" });

  let ok = 0;
  for (const c of confirmations) {
    const key = c.organisme === "SS" ? "SS" : "Mutuelle";
    await (prisma.devis as any).update({
      where: { id: c.devisId },
      data: {
        [`statutPaiement${key}`]:   "recu",
        [`montantRecu${key}`]:      c.montant,
        [`datePaiement${key}`]:     new Date(c.date),
      },
    }).catch(() => {}); // devis introuvable → ignoré silencieusement
    ok++;
  }
  res.json({ ok: true, confirmes: ok });
});

// GET /api/rapprochements/:magasinId
// Liste les devis acceptés avec suivi du paiement SS et mutuelle
app.get("/api/rapprochements/:magasinId", async (req, res) => {
  try {
    const { magasinId } = req.params;
    const { filtre } = req.query as { filtre?: string };

    // Conditions de filtre sur les statuts TP
    let statutsWhere = {};
    if (filtre === "en_attente") {
      statutsWhere = {
        OR: [
          { statutPaiementSS: "en_attente" },
          { statutPaiementMutuelle: "en_attente" },
        ],
      };
    } else if (filtre === "probleme") {
      statutsWhere = {
        OR: [
          { statutPaiementSS: "rejete" },
          { statutPaiementSS: "partiel" },
          { statutPaiementMutuelle: "rejete" },
          { statutPaiementMutuelle: "partiel" },
        ],
      };
    } else if (filtre === "regle") {
      statutsWhere = {
        AND: [
          {
            OR: [
              { statutPaiementSS: null },
              { statutPaiementSS: "recu" },
            ],
          },
          {
            OR: [
              { statutPaiementMutuelle: null },
              { statutPaiementMutuelle: "recu" },
            ],
          },
          {
            OR: [
              { statutPaiementSS: "recu" },
              { statutPaiementMutuelle: "recu" },
            ],
          },
        ],
      };
    }

    const devis = await (prisma.devis as any).findMany({
      where: {
        magasinId,
        statut: "accepté",
        OR: [
          { statutPaiementSS: { not: null } },
          { statutPaiementMutuelle: { not: null } },
        ],
        ...statutsWhere,
      },
      include: {
        client: { select: { nom: true, prenom: true, mutuelle: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    // Calcul des stats globales pour ce magasin
    const tous = await (prisma.devis as any).findMany({
      where: {
        magasinId,
        statut: "accepté",
        OR: [
          { statutPaiementSS: { not: null } },
          { statutPaiementMutuelle: { not: null } },
        ],
      },
      select: {
        statutPaiementSS: true,
        montantAttenduSS: true,
        montantRecuSS: true,
        statutPaiementMutuelle: true,
        montantAttenduMutuelle: true,
        montantRecuMutuelle: true,
        updatedAt: true,
      },
    });

    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalAttenduSS = 0, totalAttenduMutuelle = 0;
    let countEnAttenteSS = 0, countEnAttenteMutuelle = 0;
    let countProblemes = 0, totalRecuMois = 0;

    for (const d of tous) {
      if (d.statutPaiementSS === "en_attente") {
        countEnAttenteSS++;
        totalAttenduSS += Number(d.montantAttenduSS ?? 0);
      }
      if (d.statutPaiementMutuelle === "en_attente") {
        countEnAttenteMutuelle++;
        totalAttenduMutuelle += Number(d.montantAttenduMutuelle ?? 0);
      }
      if (
        d.statutPaiementSS === "rejete" || d.statutPaiementSS === "partiel" ||
        d.statutPaiementMutuelle === "rejete" || d.statutPaiementMutuelle === "partiel"
      ) {
        countProblemes++;
      }
      if (new Date(d.updatedAt) >= debutMois) {
        if (d.statutPaiementSS === "recu") totalRecuMois += Number(d.montantRecuSS ?? 0);
        if (d.statutPaiementMutuelle === "recu") totalRecuMois += Number(d.montantRecuMutuelle ?? 0);
      }
    }

    res.json({
      dossiers: devis,
      stats: {
        countEnAttenteSS,
        totalAttenduSS,
        countEnAttenteMutuelle,
        totalAttenduMutuelle,
        countProblemes,
        totalRecuMois,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur rapprochements" });
  }
});

// PATCH /api/rapprochements/:devisId
// Met à jour le statut de paiement SS ou mutuelle d'un dossier
app.patch("/api/rapprochements/:devisId", async (req, res) => {
  try {
    const { devisId } = req.params;
    const {
      // SS
      statutPaiementSS, montantAttenduSS, montantRecuSS, datePaiementSS, motifRejetSS,
      // Mutuelle
      statutPaiementMutuelle, montantAttenduMutuelle, montantRecuMutuelle, datePaiementMutuelle, motifRejetMutuelle,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (statutPaiementSS !== undefined)       data.statutPaiementSS = statutPaiementSS;
    if (montantAttenduSS !== undefined)        data.montantAttenduSS = montantAttenduSS;
    if (montantRecuSS !== undefined)           data.montantRecuSS = montantRecuSS;
    if (datePaiementSS !== undefined)          data.datePaiementSS = datePaiementSS ? new Date(datePaiementSS) : null;
    if (motifRejetSS !== undefined)            data.motifRejetSS = motifRejetSS;
    if (statutPaiementMutuelle !== undefined)  data.statutPaiementMutuelle = statutPaiementMutuelle;
    if (montantAttenduMutuelle !== undefined)  data.montantAttenduMutuelle = montantAttenduMutuelle;
    if (montantRecuMutuelle !== undefined)     data.montantRecuMutuelle = montantRecuMutuelle;
    if (datePaiementMutuelle !== undefined)    data.datePaiementMutuelle = datePaiementMutuelle ? new Date(datePaiementMutuelle) : null;
    if (motifRejetMutuelle !== undefined)      data.motifRejetMutuelle = motifRejetMutuelle;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
    }

    const updated = await (prisma.devis as any).update({
      where: { id: devisId },
      data,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur mise à jour rapprochement" });
  }
});

// POST /api/rapprochements/init/:devisId
// Initialise le suivi TP sur un devis accepté qui n'en a pas encore
app.post("/api/rapprochements/init/:devisId", async (req, res) => {
  try {
    const { devisId } = req.params;
    const { montantAttenduSS, montantAttenduMutuelle } = req.body;

    const data: Record<string, unknown> = {};
    if (montantAttenduSS && Number(montantAttenduSS) > 0) {
      data.statutPaiementSS = "en_attente";
      data.montantAttenduSS = montantAttenduSS;
    }
    if (montantAttenduMutuelle && Number(montantAttenduMutuelle) > 0) {
      data.statutPaiementMutuelle = "en_attente";
      data.montantAttenduMutuelle = montantAttenduMutuelle;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "Au moins un montant attendu requis" });
    }

    const updated = await (prisma.devis as any).update({
      where: { id: devisId },
      data,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur init rapprochement" });
  }
});

// GET /api/rapprochements/devis-acceptes/:magasinId
// Devis acceptés sans suivi TP encore initialisé (pour créer un nouveau rapprochement)
app.get("/api/rapprochements/devis-acceptes/:magasinId", async (req, res) => {
  try {
    const devis = await (prisma.devis as any).findMany({
      where: {
        magasinId: req.params.magasinId,
        statut: "accepté",
        statutPaiementSS: null,
        statutPaiementMutuelle: null,
      },
      include: {
        client: { select: { nom: true, prenom: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    res.json(devis);
  } catch (err) {
    res.status(500).json({ error: "Erreur chargement devis" });
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
