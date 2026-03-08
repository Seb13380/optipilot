import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { hashPassword, comparePassword, signToken } from "../lib/auth";

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

    const user = await prisma.utilisateur.findUnique({ where: { email } });
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
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role, magasinId: user.magasinId },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── Clients ──────────────────────────────────────────────
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [devisJour, ventesJour, devisSemaine, devisTotal] = await Promise.all([
      prisma.devis.count({
        where: { magasinId: req.params.magasinId, createdAt: { gte: today } },
      }),
      prisma.devis.count({
        where: {
          magasinId: req.params.magasinId,
          statut: "accepté",
          createdAt: { gte: today },
        },
      }),
      prisma.devis.count({
        where: {
          magasinId: req.params.magasinId,
          createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.devis.aggregate({
        where: { magasinId: req.params.magasinId, statut: "accepté" },
        _avg: { totalConfort: true },
        _count: true,
      }),
    ]);

    const panierMoyen = devisTotal._avg.totalConfort
      ? Math.round(Number(devisTotal._avg.totalConfort))
      : 0;

    res.json({ devisJour, ventesJour, devisSemaine, panierMoyen });
  } catch (err) {
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
const PORT = process.env.BACKEND_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`✅ OptiPilot Backend démarré sur http://localhost:${PORT}`);
});
