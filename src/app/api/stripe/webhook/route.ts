import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Signature Stripe manquante" }, { status: 400 });
  }

  // ── Vérification de la signature — sécurité obligatoire ──────────────────
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature invalide:", (err as Error).message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // ── Traitement des événements ─────────────────────────────────────────────
  try {
    switch (event.type) {
      // Paiement réussi → activer le plan Pro
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const magasinId = session.metadata?.magasinId;
        if (!magasinId) break;

        await prisma.magasin.update({
          where: { id: magasinId },
          data: {
            plan: "pro",
            stripeSubId: session.subscription as string,
            stripeCustomerId: session.customer as string,
          },
        });
        console.log(`✅ Magasin ${magasinId} passé en Pro`);
        break;
      }

      // Abonnement renouvelé → maintenir Pro
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as { subscription?: string }).subscription;
        if (!subId) break;

        await prisma.magasin.updateMany({
          where: { stripeSubId: subId },
          data: { plan: "pro" },
        });
        break;
      }

      // Paiement échoué → repasser en trial
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as { subscription?: string }).subscription;
        if (!subId) break;

        await prisma.magasin.updateMany({
          where: { stripeSubId: subId },
          data: { plan: "trial" },
        });
        console.log(`⚠️  Paiement échoué pour sub ${subId} — plan repassé en trial`);
        break;
      }

      // Résiliation → repasser en trial
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.magasin.updateMany({
          where: { stripeSubId: sub.id },
          data: { plan: "trial", stripeSubId: null },
        });
        console.log(`🔴 Abonnement ${sub.id} résilié`);
        break;
      }

      // Changement de statut (suspension, réactivation…)
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.status === "active") {
          await prisma.magasin.updateMany({
            where: { stripeSubId: sub.id },
            data: { plan: "pro" },
          });
        } else if (sub.status === "past_due" || sub.status === "unpaid" || sub.status === "canceled") {
          await prisma.magasin.updateMany({
            where: { stripeSubId: sub.id },
            data: { plan: "trial" },
          });
        }
        break;
      }

      default:
        // Événement ignoré
        break;
    }
  } catch (err) {
    console.error("Erreur traitement webhook:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
