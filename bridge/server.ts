import "dotenv/config";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { testConnection } from "./src/db";
import { router } from "./src/routes";

const PORT = parseInt(process.env.BRIDGE_PORT || "5174", 10);
const TOKEN = process.env.BRIDGE_TOKEN || "optipilot-bridge-secret";

const app = express();

// ── Sécurité : token obligatoire sur toutes les routes ──────────────────────
app.use((req, res, next) => {
  // La route /health est publique (pour le test de connexion depuis la tablette)
  if (req.path === "/health") return next();
  const auth = req.headers["x-bridge-token"] || req.query.token;
  if (auth !== TOKEN) {
    res.status(401).json({ error: "Token invalide" });
    return;
  }
  next();
});

app.use(cors({ origin: "*" })); // LAN uniquement — pas exposé sur internet
app.use(express.json());

// ── Routes API ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "OptiPilot Bridge", version: "1.0.0" });
});

// Diagnostic connexion SQL — public (pas de token requis, utile à l'installation)
app.get("/diagnostic", async (_req, res) => {
  const ok = await testConnection();
  res.json({
    bridge: "ok",
    sqlServer: process.env.SQL_SERVER || "localhost\\SQLEXPRESS",
    database: process.env.SQL_DATABASE || "Optimum",
    auth: process.env.SQL_WINDOWS_AUTH === "true" ? "windows" : "sql",
    connected: ok,
    message: ok
      ? "Connexion SQL Server réussie ✓"
      : "Impossible de se connecter à SQL Server — vérifiez SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD dans .env",
  });
});

app.use("/api", router);

// ── Serveur HTTP + WebSocket ─────────────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

// Stocke tous les clients WebSocket connectés (les tablettes)
const wsClients = new Set<WebSocket>();

wss.on("connection", (ws, req) => {
  const token = new URL(req.url || "", `http://localhost`).searchParams.get("token");
  if (token !== TOKEN) {
    ws.close(4001, "Token invalide");
    return;
  }
  wsClients.add(ws);
  console.log(`[WS] Tablette connectée — ${wsClients.size} client(s)`);

  ws.on("close", () => {
    wsClients.delete(ws);
    console.log(`[WS] Tablette déconnectée — ${wsClients.size} client(s)`);
  });
});

// Exporte la fonction pour pousser un événement vers toutes les tablettes
export function broadcast(event: string, data: unknown) {
  const payload = JSON.stringify({ event, data, ts: Date.now() });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ── Démarrage ────────────────────────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", async () => {
  console.log(`\n✅ OptiPilot Bridge démarré sur le port ${PORT}`);
  console.log(`   → URL locale : http://<IP-DU-PC>:${PORT}`);
  console.log(`   → Token      : ${TOKEN}\n`);

  const ok = await testConnection();
  if (ok) {
    console.log("✅ Connexion SQL Server Optimum : OK\n");
  } else {
    console.warn("⚠️  SQL Server non connecté — vérifiez le fichier .env\n");
  }
});
