import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getToken(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

// POST /api/bridge/client-push  → extension PC envoie un client Optimum vers l'iPad
export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let magasinId: string;
  try {
    magasinId = verifyToken(token).magasinId;
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
  try {
    const payload = await req.json();
    // Remplacer tout client pending existant (1 seul à la fois)
    await prisma.clientPending.deleteMany({ where: { magasinId, statut: "pending" } });
    const pending = await prisma.clientPending.create({
      data: { magasinId, payload, statut: "pending" },
    });
    return NextResponse.json({ id: pending.id });
  } catch (err) {
    console.error("client-push error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/bridge/client-push  → iPad récupère le client en attente
export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let magasinId: string;
  try {
    magasinId = verifyToken(token).magasinId;
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
  try {
    const pending = await prisma.clientPending.findFirst({
      where: { magasinId, statut: "pending" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pending ?? null);
  } catch (err) {
    console.error("client-pull error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/bridge/client-push  → iPad acquitte la réception
export async function DELETE(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    verifyToken(token);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    await prisma.clientPending.update({ where: { id }, data: { statut: "done" } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("client-ack error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
