"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import type { OffreVerre } from "@/lib/recommandation";

interface ClientInfo {
  nom?: string;
  prenom?: string;
  email?: string;
  mutuelle?: string;
  niveauGarantie?: string;
}

export default function DevisPage() {
  const router = useRouter();
  const devisRef = useRef<HTMLDivElement>(null);
  const [offre, setOffre] = useState<OffreVerre | null>(null);
  const [client, setClient] = useState<ClientInfo>({});
  const [ordonnance, setOrdonnance] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Prix monture (saisie opticien)
  const [prixMonture, setPrixMonture] = useState(120);

  useEffect(() => {
    const offreRaw = localStorage.getItem("optipilot_offre_selectionnee");
    const clientRaw = localStorage.getItem("optipilot_client");
    const ordoRaw = localStorage.getItem("optipilot_ordonnance");
    const questRaw = localStorage.getItem("optipilot_questionnaire");

    if (offreRaw) setOffre(JSON.parse(offreRaw));
    if (clientRaw) setClient(JSON.parse(clientRaw));
    if (ordoRaw) setOrdonnance(JSON.parse(ordoRaw));
    if (questRaw) {
      const q = JSON.parse(questRaw);
      if (!clientRaw) setClient({ mutuelle: q.mutuelle, niveauGarantie: q.niveauGarantie });
    }
  }, []);

  const totalVerres = offre?.prixVerres || 0;
  const totalDevis = prixMonture + totalVerres;
  const remboursement = offre ? offre.remboursementSecu + offre.remboursementMutuelle : 0;
  const resteACharge = Math.max(0, totalDevis - remboursement);

  async function envoyerDevis() {
    setSending(true);
    try {
      // Enregistrer le devis
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.nom || "demo",
          magasinId: "demo-magasin",
          statut: "en_cours",
          offreChoisie: offre?.nom?.toLowerCase(),
          totalConfort: totalDevis,
          racConfort: resteACharge,
        }),
      });
    } catch {
      // Mode démo
    }
    setSent(true);
    setSending(false);
  }

  async function exporterPDF() {
    if (typeof window === "undefined") return;
    const element = devisRef.current;
    if (!element) return;

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf()
        .set({
          margin: 8,
          filename: `devis-optipilot-${Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } catch {
      alert("Export PDF non disponible — utilisez la fonction impression du navigateur");
    }
  }

  function copierDonnees() {
    const texte = `DEVIS OPTIPILOT
Client: ${client.prenom || ""} ${client.nom || ""}
Date: ${new Date().toLocaleDateString("fr-FR")}

ORDONNANCE:
OD: Sph ${ordonnance.odSphere || "?"} Cyl ${ordonnance.odCylindre || "?"} Axe ${ordonnance.odAxe || "?"}°
OG: Sph ${ordonnance.ogSphere || "?"} Cyl ${ordonnance.ogCylindre || "?"} Axe ${ordonnance.ogAxe || "?"}°
ADD: ${ordonnance.odAddition || "—"}

DEVIS ${offre?.nom?.toUpperCase()}:
Monture: ${prixMonture}€
Verres (${offre?.verrier} ${offre?.gamme}): ${totalVerres}€
Total: ${totalDevis}€
Remboursement SS + mutuelle: -${remboursement}€
Reste à charge: ${resteACharge}€`;

    navigator.clipboard.writeText(texte).then(() => {
      alert("✓ Données copiées dans le presse-papier");
    });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <OptiPilotHeader
        title="Votre Devis"
        showBack
        onBack={() => router.push("/recommandations")}
      />

      <main className="flex-1 px-6 pb-8 pt-5 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Carte devis */}
          <div ref={devisRef}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 shadow-sm"
              style={{ background: "white" }}
            >
            {/* En-tête */}
            <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1a1a2e" }}>
                  Devis {offre?.nom || "Confort"}
                </h2>
                <p className="text-sm" style={{ color: "#9ca3af" }}>
                  {new Date().toLocaleDateString("fr-FR")} • Valable 30 jours
                </p>
              </div>
              {offre && (
                <span
                  className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                  style={{
                    background:
                      offre.nom === "Essentiel"
                        ? "#22c55e"
                        : offre.nom === "Confort"
                        ? "#1e3a8a"
                        : "#7e22ce",
                  }}
                >
                  {offre.nom}
                </span>
              )}
            </div>

            {/* Client */}
            {(client.nom || client.prenom) && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-1" style={{ color: "#9ca3af" }}>
                  CLIENT
                </p>
                <p className="font-semibold" style={{ color: "#1a1a2e" }}>
                  {client.prenom} {client.nom}
                </p>
                {client.mutuelle && (
                  <p className="text-sm" style={{ color: "#6b7280" }}>
                    {client.mutuelle} — {client.niveauGarantie}
                  </p>
                )}
              </div>
            )}

            {/* Ordonnance résumé */}
            {ordonnance.odSphere && (
              <div
                className="mb-4 p-3 rounded-xl"
                style={{ background: "#f8fafc", border: "1px solid #e5e7eb" }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "#9ca3af" }}>
                  ORDONNANCE
                </p>
                <p className="text-sm font-mono" style={{ color: "#374151" }}>
                  OD : {ordonnance.odSphere} ({ordonnance.odCylindre}) {ordonnance.odAxe}°
                  {ordonnance.odAddition && ` ADD ${ordonnance.odAddition}`}
                </p>
                <p className="text-sm font-mono" style={{ color: "#374151" }}>
                  OG : {ordonnance.ogSphere} ({ordonnance.ogCylindre}) {ordonnance.ogAxe}°
                  {ordonnance.ogAddition && ` ADD ${ordonnance.ogAddition}`}
                </p>
              </div>
            )}

            {/* Détail financier */}
            <div className="flex flex-col gap-2">
              <DevisLigne
                label="Monture"
                value={`${prixMonture}€`}
                editable
                onEdit={(v) => setPrixMonture(parseInt(v) || 0)}
              />
              <DevisLigne
                label={`Verres — ${offre?.verrier || ""} ${offre?.gamme || ""}`}
                value={`${totalVerres}€`}
                sub={offre ? `Indice ${offre.indice} • Classe ${offre.classe100ps}` : undefined}
              />
              <div className="pt-2" style={{ borderTop: "1px solid #f3f4f6" }} />
              <DevisLigne
                label="Sous-total"
                value={`${totalDevis}€`}
                bold
              />
              <DevisLigne
                label="Remboursement Sécurité Sociale"
                value={`-${offre?.remboursementSecu || 0}€`}
                green
              />
              <DevisLigne
                label={`Remboursement Mutuelle (${client.mutuelle || "—"})`}
                value={`-${offre?.remboursementMutuelle || 0}€`}
                green
              />
              <div
                className="flex items-center justify-between p-4 rounded-xl mt-1"
                style={{ background: "linear-gradient(135deg, #1e3a8a08, #3b5fc015)" }}
              >
                <p className="text-base font-bold" style={{ color: "#1a1a2e" }}>
                  Reste à Charge
                </p>
                <p className="text-3xl font-black" style={{ color: "#1e3a8a" }}>
                  {resteACharge}€
                </p>
              </div>
            </div>

            {/* Verre détail */}
            {offre && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #f3f4f6" }}>
                <p className="text-xs font-medium mb-2" style={{ color: "#9ca3af" }}>
                  INCLUS DANS L'OFFRE
                </p>
                {offre.argumentaire.map((arg, i) => (
                  <p key={i} className="text-xs py-0.5" style={{ color: "#6b7280" }}>
                    {arg}
                  </p>
                ))}
              </div>
            )}

            {/* Mentions légales */}
            <p
              className="text-xs mt-4 pt-3"
              style={{ borderTop: "1px solid #f3f4f6", color: "#9ca3af" }}
            >
              Devis établi conformément aux articles L. 441-2 et suivants du Code de la consommation.
              Valable 30 jours à compter de la date d'émission. Les remboursements mutuelles sont
              donnés à titre indicatif.
            </p>
            </motion.div>
          </div>

          {/* Boutons d'action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
          {sent ? (
            <div
              className="py-4 rounded-2xl text-center font-semibold"
              style={{ background: "#f0fdf4", color: "#15803d", border: "2px solid #22c55e" }}
            >
              ✓ Devis envoyé par email !
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={envoyerDevis}
              disabled={sending}
              className="py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)",
                boxShadow: "0 4px 20px rgba(30,58,138,0.35)",
              }}
            >
              {sending ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Envoi...
                </>
              ) : (
                "📧 Envoyer le Devis"
              )}
            </motion.button>
          )}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={exporterPDF}
              className="flex-1 py-4 rounded-2xl font-medium flex items-center justify-center gap-2"
              style={{ background: "white", color: "#374151", border: "2px solid #e5e7eb" }}
            >
              📄 Exporter PDF
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={copierDonnees}
              className="flex-1 py-4 rounded-2xl font-medium flex items-center justify-center gap-2"
              style={{ background: "white", color: "#374151", border: "2px solid #e5e7eb" }}
            >
              📋 Copier données
            </motion.button>
          </div>

          {/* Offre complémentaire */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/offre-complementaire")}
            className="py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #7e22ce, #a855f7)",
              color: "white",
            }}
          >
            ⭐ Voir l'offre complémentaire
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="py-3.5 rounded-2xl font-medium"
            style={{ background: "#f3f4f6", color: "#6b7280" }}
          >
            Retour à l'accueil
          </motion.button>
        </motion.div>
        </div>
      </main>
    </div>
  );
}

function DevisLigne({
  label,
  value,
  sub,
  bold,
  green,
  editable,
  onEdit,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  green?: boolean;
  editable?: boolean;
  onEdit?: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p
          className="text-sm"
          style={{
            color: bold ? "#1a1a2e" : "#6b7280",
            fontWeight: bold ? 700 : 400,
          }}
        >
          {label}
        </p>
        {sub && (
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            {sub}
          </p>
        )}
      </div>
      {editable ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            defaultValue={parseInt(value)}
            onChange={(e) => onEdit?.(e.target.value)}
            className="w-20 text-right text-sm font-semibold px-2 py-1 rounded-lg border outline-none"
            style={{ color: "#1a1a2e", borderColor: "#e5e7eb" }}
          />
          <span className="text-sm" style={{ color: "#6b7280" }}>€</span>
        </div>
      ) : (
        <p
          className="text-sm font-semibold"
          style={{ color: green ? "#15803d" : bold ? "#1a1a2e" : "#374151" }}
        >
          {value}
        </p>
      )}
    </div>
  );
}
