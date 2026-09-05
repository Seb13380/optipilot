import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  fondateur: process.env.STRIPE_PRICE_FONDATEUR!,
  regulier:  process.env.STRIPE_PRICE_REGULIER!,
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

  // ── Garde Fondateurs : vérifier les places restantes ──────────────────────
  if (plan === "fondateur") {
    const config = await prisma.configGlobale.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global", ambassadeursRestants: 10, ambassadeursTotal: 10 },
    });
    if (config.ambassadeursRestants <= 0) {
      return NextResponse.json({ error: "Plus de places Fondateurs disponibles" }, { status: 409 });
    }
  }

  // ── Récupération du magasin ───────────────────────────────────────────────
  const magasin = await prisma.magasin.findUnique({
    where: { id: payload.magasinId },
  });
  if (!magasin) {
    return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 });
  }

  // ── Création ou récupération du client Stripe ─────────────────────────────
  // Le customerId stocké peut appartenir à un autre mode Stripe (test/live) —
  // on vérifie qu'il existe bien dans le mode courant avant de le réutiliser.
  let customerId = magasin.stripeCustomerId;
  if (customerId) {
    try {
      await stripe.customers.retrieve(customerId);
    } catch {
      customerId = null;
    }
  }
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

  // 1er mois offert : uniquement si le magasin n'a jamais eu d'abonnement Stripe
  const premierAbonnement = !magasin.stripeSubId;

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { magasinId: magasin.id, plan },
      subscription_data: premierAbonnement ? { trial_period_days: 30 } : undefined,
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/abonnement`,
      locale: "fr",
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Erreur création session Stripe Checkout:", err);
    return NextResponse.json({ error: "Impossible de créer la session de paiement" }, { status: 500 });
  }
}
