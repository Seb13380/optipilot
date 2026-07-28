"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";

interface User {
  nom: string;
  magasinNom?: string;
  email?: string;
}

const FEATURES_STANDARD = [
  "📷 Scan ordonnance & carte mutuelle IA",
  "🧠 Analyse IA (myopie, astigmatisme, presbytie…)",
  "👤 Questionnaire client intelligent",
  "💡 Génération automatique de 3 devis (Essentiel / Confort / Premium)",
  "🧾 Devis avec reste à charge estimé",
  "📤 Export PDF & dossier client",
  "🤖 Copilote IA vendeur (suggestions pendant la vente)",
  "📱 Interface optimisée iPad / tablette",
];

const FEATURES_PREMIUM = [
  "⭐ Tout inclus dans Standard",
  "🧠 IA commerciale avancée (profil client + correction + activité)",
  "📊 Tableau de bord business (panier moyen, options vendues…)",
  "💰 Optimisation panier moyen (suggestions premium rentables)",
  "👓 Recommandation montures selon profil client",
  "🔁 Historique client intelligent (ancienne correction, propositions)",
  "📈 Statistiques vente par vendeur",
  "🤖 Coach vendeur IA (argumentaire commercial en temps réel)",
  "📄 Rapport mensuel IA (analyse ventes & opportunités)",
];

const FEATURES_AMBASSADEUR = [
  "⭐ Tout inclus dans Premium",
  "🤝 Onboarding personnalisé avec l'équipe OptiPilot",
  "📣 Statut Ambassadeur officiel (badge + page partenaire)",
  "💸 Commission sur chaque opticien recommandé",
  "📞 Support prioritaire & accès direct fondateurs",
  "🔔 Accès anticipé aux nouvelles fonctionnalités",
];

const PLANS = [
  {
    id: "standard",
    label: "Standard",
    price: 249,
    unit: "/ mois",
    badge: null,
    sub: null,
    features: FEATURES_STANDARD,
  },
  {
    id: "premium",
    label: "Premium",
    price: 299,
    unit: "/ mois",
    badge: "Recommandé",
    sub: "Accès complet + bridge Optimum",
    features: FEATURES_PREMIUM,
  },
  {
    id: "ambassadeur",
    label: "Ambassadeur",
    price: 199,
    unit: "/ mois",
    badge: "Partenaire",
    sub: "Premium + commission prescripteur",
    features: FEATURES_AMBASSADEUR,
  },
];

export default function AbonnementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "premium" | "ambassadeur">("premium");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [slots, setSlots] = useState<{ restants: number; total: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("optipilot_user");
    if (stored) setUser(JSON.parse(stored));
    fetch("/api/ambassadeur")
      .then((r) => r.json())
      .then(setSlots)
      .catch(() => setSlots({ restants: 0, total: 10 }));
  }, []);

  async function handleUpgrade() {
    setSending(true);
    try {
      const token = localStorage.getItem("optipilot_token");
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await res.json();
      if (res.status === 409) {
        setSending(false);
        alert("Désolé, toutes les places Ambassadeur sont prises !");
        setSlots({ restants: 0, total: 10 });
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      // Redirection vers Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setSending(false);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  }

  return (
    <OpticianGuard>
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader
        showBack
        onBack={() => router.back()}
        title="Passer Pro"
      />

      <main className="flex-1 px-6 pb-10 pt-4 w-full max-w-2xl mx-auto">

        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}
          >
            ⚡
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: "#FDFDFE" }}>
            Passez à OptiPilot Pro
          </h1>
          <p className="text-lg" style={{ color: "#9B96DA" }}>
            Déverrouillez toutes les fonctionnalités pour {user?.magasinNom || "votre magasin"}
          </p>
        </motion.div>

        {/* Sélecteur de plan */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 mb-6"
        >
          {PLANS.map((plan) => {
            const isAmbassadeur = plan.id === "ambassadeur";
            const isFull = isAmbassadeur && slots !== null && slots.restants <= 0;
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => !isFull && setSelectedPlan(plan.id as "standard" | "premium" | "ambassadeur")}
                disabled={isFull}
                className="flex-1 rounded-2xl p-4 relative transition-all"
                style={{
                  background: isFull
                    ? "rgba(10,3,56,0.4)"
                    : isSelected
                    ? isAmbassadeur
                      ? "linear-gradient(135deg, #92400e, #b45309)"
                      : "linear-gradient(135deg, #5331D0, #7B5CE5)"
                    : "rgba(10,3,56,0.85)",
                  border: `2px solid ${isFull ? "rgba(75,85,99,0.3)" : isSelected ? (isAmbassadeur ? "#fbbf24" : "#7B5CE5") : "rgba(83,49,208,0.3)"}`,
                  opacity: isFull ? 0.6 : 1,
                  cursor: isFull ? "not-allowed" : "pointer",
                }}
              >
                {plan.badge && !isFull && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: isAmbassadeur ? "#fbbf24" : "#22c55e", color: isAmbassadeur ? "#000" : "#fff" }}
                  >
                    {plan.badge}
                  </span>
                )}
                {isFull && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: "#4b5563", color: "#fff" }}
                  >
                    Complet
                  </span>
                )}
                <p className="text-lg font-bold mb-1" style={{ color: "#FDFDFE" }}>
                  {plan.label}
                </p>
                <p className="text-3xl font-black" style={{ color: isSelected ? "#fff" : "#9B96DA" }}>
                  {plan.price}€
                  <span className="text-base font-normal ml-1">{plan.unit}</span>
                </p>
                {isAmbassadeur && slots !== null && !isFull && (
                  <p className="text-xs font-semibold mt-1" style={{ color: isSelected ? "#fde68a" : "#fbbf24" }}>
                    🔥 {slots.restants} place{slots.restants > 1 ? "s" : ""} restante{slots.restants > 1 ? "s" : ""} / {slots.total}
                  </p>
                )}
                {!isAmbassadeur && plan.sub && (
                  <p className="text-sm mt-1" style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#9B96DA" }}>
                    {plan.sub}
                  </p>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Comparaison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {/* Standard */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: selectedPlan === "standard" ? "linear-gradient(135deg, rgba(83,49,208,0.18), rgba(83,49,208,0.08))" : "rgba(10,3,56,0.85)",
              border: `1px solid ${selectedPlan === "standard" ? "rgba(83,49,208,0.5)" : "rgba(83,49,208,0.25)"}`,
            }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: selectedPlan === "standard" ? "#a78bfa" : "#9B96DA" }}>
              Standard — 249€/mois
            </p>
            <div className="flex flex-col gap-2">
              {FEATURES_STANDARD.map((f) => (
                <p key={f} className="text-xs flex items-start gap-1.5" style={{ color: "#FDFDFE" }}>
                  <span style={{ color: "#22c55e" }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
          </div>

          {/* Premium */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: selectedPlan === "premium" ? "linear-gradient(135deg, rgba(83,49,208,0.25), rgba(123,92,229,0.15))" : "rgba(10,3,56,0.85)",
              border: `2px solid ${selectedPlan === "premium" ? "rgba(123,92,229,0.7)" : "rgba(83,49,208,0.25)"}`,
            }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: "#a78bfa" }}>
              ⚡ Premium — 299€/mois
            </p>
            <div className="flex flex-col gap-2">
              {FEATURES_PREMIUM.map((f) => (
                <p key={f} className="text-xs flex items-start gap-1.5" style={{ color: "#FDFDFE" }}>
                  <span style={{ color: "#22c55e" }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
          </div>

          {/* Ambassadeur */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: selectedPlan === "ambassadeur" ? "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(234,179,8,0.08))" : "rgba(10,3,56,0.85)",
              border: `2px solid ${selectedPlan === "ambassadeur" ? "rgba(234,179,8,0.7)" : "rgba(83,49,208,0.25)"}`,
            }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: selectedPlan === "ambassadeur" ? "#fbbf24" : "#9B96DA" }}>
              🤝 Ambassadeur — 199€/mois
            </p>
            <div className="flex flex-col gap-2">
              {FEATURES_AMBASSADEUR.map((f) => (
                <p key={f} className="text-xs flex items-start gap-1.5" style={{ color: "#FDFDFE" }}>
                  <span style={{ color: "#fbbf24" }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tableau comparatif */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="rounded-2xl overflow-hidden mb-6"
          style={{ border: "1px solid rgba(83,49,208,0.3)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(83,49,208,0.25)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "#9B96DA" }}>Fonctionnalité</th>
                <th className="text-center px-3 py-3 font-semibold" style={{ color: "#9B96DA" }}>Standard</th>
                <th className="text-center px-3 py-3 font-semibold" style={{ color: "#a78bfa" }}>⭐ Premium</th>
                <th className="text-center px-3 py-3 font-semibold" style={{ color: "#fbbf24" }}>🤝 Ambassadeur</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Scan ordonnance IA", true, true, true],
                ["Génération 3 devis automatiques", true, true, true],
                ["Copilote IA vendeur", true, true, true],
                ["Export PDF & dossier client", true, true, true],
                ["Analyse business magasin", false, true, true],
                ["Optimisation panier moyen", false, true, true],
                ["Statistiques vente vendeurs", false, true, true],
                ["Coach vendeur IA temps réel", false, true, true],
                ["Rapport mensuel IA", false, true, true],
                ["Onboarding personnalisé", false, false, true],
                ["Statut & badge Ambassadeur", false, false, true],
                ["Commission prescripteur", false, false, true],
                ["Support prioritaire fondateurs", false, false, true],
              ].map(([label, std, prem, amb], i) => (
                <tr key={i as number} style={{ background: i % 2 === 0 ? "rgba(10,3,56,0.6)" : "rgba(10,3,56,0.85)" }}>
                  <td className="px-4 py-2.5" style={{ color: "#FDFDFE" }}>{label as string}</td>
                  <td className="text-center px-3 py-2.5" style={{ color: std ? "#22c55e" : "#4b5563" }}>{std ? "✓" : "—"}</td>
                  <td className="text-center px-3 py-2.5" style={{ color: prem ? "#22c55e" : "#4b5563" }}>{prem ? "✓" : "—"}</td>
                  <td className="text-center px-3 py-2.5" style={{ color: amb ? "#fbbf24" : "#4b5563" }}>{amb ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Argument Premium */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-2xl p-4 mb-6 text-center"
          style={{ background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.3)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#a78bfa" }}>
            {selectedPlan === "ambassadeur"
              ? "🤝 En tant qu'Ambassadeur, vous bénéficiez de Premium à tarif réduit + une commission sur chaque opticien que vous nous recommandez."
              : "💡 Une seule vente premium supplémentaire par mois couvre l'écart de 50€ entre les deux plans."}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          {sent ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(34,197,94,0.12)", border: "2px solid #22c55e" }}
            >
              <p className="text-xl font-bold mb-1" style={{ color: "#22c55e" }}>
                ✓ Demande envoyée !
              </p>
              <p className="text-base" style={{ color: "#9B96DA" }}>
                Nous vous contactons sous 24h pour finaliser votre abonnement Pro.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-4 px-6 py-3 rounded-xl font-semibold text-base"
                style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA" }}
              >
                Retour au dashboard
              </button>
            </div>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleUpgrade}
                disabled={sending}
                className="w-full py-5 rounded-2xl text-white font-bold text-xl"
                style={{
                  background: "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
                  boxShadow: "0 6px 28px rgba(83,49,208,0.45)",
                  opacity: sending ? 0.75 : 1,
                }}
              >
                {sending
                  ? "Redirection vers le paiement…"
                  : `Démarrer ${selectedPlan === "premium" ? "Premium — 249€/mois" : "Standard — 199€/mois"} →`}
              </motion.button>
              <p className="text-center text-sm mt-3" style={{ color: "#9B96DA" }}>
                Sans engagement pour la formule mensuelle · Résiliable à tout moment
              </p>
            </>
          )}
        </motion.div>

      </main>
    </div>
    </OpticianGuard>
  );
}
