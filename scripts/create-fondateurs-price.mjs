// Script temporaire : crée le produit + prix Stripe "OptiPilot Fondateurs" (149€/mois) en mode TEST
// Usage: node scripts/create-fondateurs-price.mjs
import Stripe from "stripe";
import { readFileSync } from "fs";

const envContent = readFileSync(new URL("../.env", import.meta.url), "utf-8");
const match = envContent.match(/^STRIPE_SECRET_KEY="?([^"\n]+)"?/m);
if (!match) throw new Error("STRIPE_SECRET_KEY introuvable dans .env");
const stripe = new Stripe(match[1]);

const product = await stripe.products.create({
  name: "OptiPilot Fondateurs",
  description: "Offre Fondateurs — prix garanti à vie, réservée aux 10 premiers clients",
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 14900,
  currency: "eur",
  recurring: { interval: "month" },
});

console.log("✅ Produit créé :", product.id);
console.log("✅ Price créé   :", price.id, "→ 149.00€ / month");
