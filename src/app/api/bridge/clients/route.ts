import { NextRequest, NextResponse } from "next/server";

const BRIDGE = () =>
  process.env.BRIDGE_URL ||
  process.env.NEXT_PUBLIC_BRIDGE_URL ||
  "http://localhost:5174";

// GET /api/bridge/clients?q=Dupont  → recherche dans Optimum
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const res = await fetch(
      `${BRIDGE()}/api/clients/search?q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Bridge non disponible", clients: [] },
      { status: 503 }
    );
  }
}

// POST /api/bridge/clients  → crée ou met à jour un client dans Optimum
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BRIDGE()}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Bridge non disponible" },
      { status: 503 }
    );
  }
}
