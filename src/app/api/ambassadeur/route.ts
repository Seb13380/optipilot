import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/ambassadeur`, {
      next: { revalidate: 30 }, // cache 30s pour éviter les requêtes excessives
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Si le backend est inaccessible, on retourne 0 pour cacher l'offre
    return NextResponse.json({ restants: 0, total: 10 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string | undefined;

    const endpoint =
      action === "reset"
        ? `${BACKEND}/api/ambassadeur/reset`
        : `${BACKEND}/api/ambassadeur/reserver`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
