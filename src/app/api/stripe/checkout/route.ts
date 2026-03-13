import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  standard: process.env.STRIPE_PRICE_STANDARD!,
  premium: process.env.STRIPE_PRICE_PREMIUM!,
};

export async function POST(req: NextRequest) {
  // ── Authentification ──────────────────────────────────────────────────────
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyToken(auth.slice(7));
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  // ── Validation du plan ────────────────────────────────────────────────────
  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  // ── Récupération du magasin ───────────────────────────────────────────────
  const magasin = await prisma.magasin.findUnique({
    where: { id: payload.magasinId },
  });
  if (!magasin) {
    return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 });
  }

  // ── Création ou récupération du client Stripe ─────────────────────────────
  let customerId = magasin.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: payload.email,
      name: magasin.nom,
      metadata: { magasinId: magasin.id },
    });
    customerId = customer.id;
    await prisma.magasin.update({
      where: { id: magasin.id },
      data: { stripeCustomerId: customerId },
    });
  }

  // ── Création de la session Stripe Checkout ────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { magasinId: magasin.id },
    success_url: `${appUrl}/dashboard?upgraded=1`,
    cancel_url: `${appUrl}/abonnement`,
    locale: "fr",
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
