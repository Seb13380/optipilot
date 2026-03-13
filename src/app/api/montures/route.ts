import { NextRequest, NextResponse } from "next/server";

// Route PUBLIQUE — accessible sans authentification (mode kiosque client)
// Proxy vers le bridge Optimum qui tourne localement sur le PC du magasin
export async function GET(req: NextRequest) {
  const bridgeUrl =
    process.env.BRIDGE_URL ||
    process.env.NEXT_PUBLIC_BRIDGE_URL ||
    "http://localhost:5174";

  const { searchParams } = new URL(req.url);
  const params = new URLSearchParams();

  if (searchParams.get("q"))       params.set("q",       searchParams.get("q")!);
  if (searchParams.get("marque"))  params.set("marque",  searchParams.get("marque")!);
  if (searchParams.get("genre"))   params.set("genre",   searchParams.get("genre")!);
  if (searchParams.get("prixMax")) params.set("prixMax", searchParams.get("prixMax")!);

  try {
    const res = await fetch(`${bridgeUrl}/api/montures?${params}`, {
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Bridge non disponible", montures: [] },
      { status: 503 }
    );
  }
}
