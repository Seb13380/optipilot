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

const FEATURES_REGULIER = [
  "Scan ordonnance & carte mutuelle IA",
  "Analyse IA (myopie, astigmatisme, presbytie…)",
  "Questionnaire client intelligent",
  "Génération automatique de 3 devis (Essentiel / Confort / Premium)",
  "Devis avec reste à charge estimé",
  "Export PDF & dossier client",
  "Copilote IA vendeur (suggestions pendant la vente)",
  "Interface optimisée iPad / tablette",
];

const FEATURES_FONDATEUR = [
  "Tout inclus dans le plan régulier",
  "149€/mois à vie, garanti tant que vous restez abonné",
  "Onboarding personnalisé avec l'équipe OptiPilot",
  "Statut Fondateur officiel (badge + accès prioritaire)",
  "Accès anticipé aux nouvelles fonctionnalités",
  "Support prioritaire & accès direct fondateurs",
];

const REGULIER_PRIX = 199;
const FONDATEUR_PRIX = 149;

const PLANS = [
  {
    id: "fondateur",
    label: "Fondateurs",
    price: FONDATEUR_PRIX,
    unit: "/ mois",
    badge: "Places limitées",
    sub: "Tarif à vie, réservé aux 10 premiers clients",
    features: FEATURES_FONDATEUR,
  },
  {
    id: "regulier",
    label: "Régulier",
    price: REGULIER_PRIX,
    unit: "/ mois",
    badge: null,
    sub: "Tout inclus",
    features: FEATURES_REGULIER,
  },
];

export default function AbonnementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"fondateur" | "regulier">("regulier");
  const [sending, setSending] = useState(false);
  const [slots, setSlots] = useState<{ restants: number; total: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("optipilot_user");
    if (stored) setUser(JSON.parse(stored));
    fetch("/api/ambassadeur")
      .then((r) => r.json())
      .then((data) => {
        setSlots(data);
        if (data.restants > 0) setSelectedPlan("fondateur");
      })
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
        alert("Désolé, toutes les places Fondateurs sont prises !");
        setSlots({ restants: 0, total: 10 });
        setSelectedPlan("regulier");
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

  const fondateurDispo = slots !== null && slots.restants > 0;

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
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ border: "1.5px solid rgba(155,150,218,0.5)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" stroke="#9B96DA" strokeWidth="1.2" />
            </svg>
          </div>
          <h1 className="op-serif text-3xl mb-2" style={{ color: "#FDFDFE" }}>
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
            const isFondateur = plan.id === "fondateur";
            const isFull = isFondateur && slots !== null && slots.restants <= 0;
            const isSelected = selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => !isFull && setSelectedPlan(plan.id as "fondateur" | "regulier")}
                disabled={isFull}
                className="flex-1 rounded-2xl p-4 relative transition-all"
                style={{
                  background: isFull
                    ? "rgba(10,3,56,0.4)"
                    : isSelected
                    ? isFondateur
                      ? "linear-gradient(135deg, #92400e, #b45309)"
                      : "linear-gradient(135deg, #5331D0, #7B5CE5)"
                    : "rgba(10,3,56,0.85)",
                  border: `2px solid ${isFull ? "rgba(75,85,99,0.3)" : isSelected ? (isFondateur ? "#fbbf24" : "#7B5CE5") : "rgba(83,49,208,0.3)"}`,
                  opacity: isFull ? 0.6 : 1,
                  cursor: isFull ? "not-allowed" : "pointer",
                }}
              >
                {plan.badge && !isFull && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: isFondateur ? "#fbbf24" : "#22c55e", color: isFondateur ? "#000" : "#fff" }}
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
                {isFondateur && slots !== null && !isFull && (
                  <p className="text-xs font-semibold mt-1" style={{ color: isSelected ? "#fde68a" : "#fbbf24" }}>
                    {slots.restants} place{slots.restants > 1 ? "s" : ""} restante{slots.restants > 1 ? "s" : ""} / {slots.total}
                  </p>
                )}
                {plan.sub && (
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
          className="grid grid-cols-2 gap-3 mb-6"
        >
          {/* Fondateurs */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: selectedPlan === "fondateur" ? "linear-gradient(135deg, rgba(234,179,8,0.2), rgba(234,179,8,0.08))" : "rgba(10,3,56,0.85)",
              border: `2px solid ${selectedPlan === "fondateur" ? "rgba(234,179,8,0.7)" : "rgba(83,49,208,0.25)"}`,
            }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: selectedPlan === "fondateur" ? "#fbbf24" : "#9B96DA" }}>
              Fondateurs — {FONDATEUR_PRIX}€/mois
            </p>
            <div className="flex flex-col gap-2">
              {FEATURES_FONDATEUR.map((f) => (
                <p key={f} className="text-xs flex items-start gap-1.5" style={{ color: "#FDFDFE" }}>
                  <span style={{ color: "#fbbf24" }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
          </div>

          {/* Régulier */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: selectedPlan === "regulier" ? "linear-gradient(135deg, rgba(83,49,208,0.25), rgba(123,92,229,0.15))" : "rgba(10,3,56,0.85)",
              border: `2px solid ${selectedPlan === "regulier" ? "rgba(123,92,229,0.7)" : "rgba(83,49,208,0.25)"}`,
            }}
          >
            <p className="text-sm font-bold mb-3" style={{ color: "#a78bfa" }}>
              Régulier — {REGULIER_PRIX}€/mois
            </p>
            <div className="flex flex-col gap-2">
              {FEATURES_REGULIER.map((f) => (
                <p key={f} className="text-xs flex items-start gap-1.5" style={{ color: "#FDFDFE" }}>
                  <span style={{ color: "#22c55e" }}>✓</span>
                  {f}
                </p>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Argument */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-2xl p-4 mb-6 text-center"
          style={{ background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.3)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#a78bfa" }}>
            {fondateurDispo
              ? `Plus que ${slots?.restants} place${(slots?.restants ?? 0) > 1 ? "s" : ""} au tarif Fondateur : ${FONDATEUR_PRIX}€/mois à vie, garanti tant que vous restez abonné.`
              : "Toutes les fonctionnalités sont incluses dans le plan Régulier, sans surprise."}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleUpgrade}
            disabled={sending}
            className="w-full py-5 rounded-2xl text-white font-bold text-xl"
            style={{
              background: selectedPlan === "fondateur"
                ? "linear-gradient(135deg, #92400e 0%, #fbbf24 100%)"
                : "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
              boxShadow: "0 6px 28px rgba(83,49,208,0.45)",
              opacity: sending ? 0.75 : 1,
            }}
          >
            {sending
              ? "Redirection vers le paiement…"
              : `Démarrer ${selectedPlan === "fondateur" ? `Fondateur — ${FONDATEUR_PRIX}€/mois` : `Régulier — ${REGULIER_PRIX}€/mois`} →`}
          </motion.button>
          <p className="text-center text-sm mt-3" style={{ color: "#9B96DA" }}>
            1 mois offert · Sans engagement · Résiliable à tout moment
          </p>
        </motion.div>

      </main>
    </div>
    </OpticianGuard>
  );
}
