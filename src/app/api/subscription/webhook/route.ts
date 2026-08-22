// Alias de /api/stripe/webhook — maintenu pour compatibilité avec l'URL
// configurée dans le dashboard Stripe (ngrok ou ancienne URL de déploiement).
// Pour les nouveaux déploiements, mettre à jour l'URL dans Stripe Dashboard
// vers /api/stripe/webhook.
export { POST } from "@/app/api/stripe/webhook/route";
