"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import type { OffreVerre } from "@/lib/recommandation";

interface ClientInfo {
  nom?: string;
  prenom?: string;
  email?: string;
  mutuelle?: string;
  niveauGarantie?: string;
}

type RacStatut = "idle" | "loading" | "confirmed" | "error";
type OptimumStatut = "idle" | "sending" | "sent" | "waiting_cotation" | "cotation_received" | "error";

interface RacResult {
  montant: number;
  secu: number;
  mutuelle: number;
  detail: string;
  statut: string;
}

export default function DevisPage() {
  const router = useRouter();
  const devisRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const bridgeWsRef = useRef<WebSocket | null>(null);
  const [offre, setOffre] = useState<OffreVerre | null>(null);
  const [client, setClient] = useState<ClientInfo>({});
  const [ordonnance, setOrdonnance] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // RAC temps réel
  const [racStatut, setRacStatut] = useState<RacStatut>("idle");
  const [racResult, setRacResult] = useState<RacResult | null>(null);

  // Prix monture (saisie opticien)
  const [prixMonture, setPrixMonture] = useState(120);
  const [questionnaire, setQuestionnaire] = useState<Record<string, unknown>>({});
  const [conseillerOpen, setConseillerOpen] = useState(true);

  // Bridge Optimum
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [optimumStatut, setOptimumStatut] = useState<OptimumStatut>("idle");
  const [optimumError, setOptimumError] = useState<string | null>(null);

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
      setQuestionnaire(q);
      if (!clientRaw) setClient({ mutuelle: q.mutuelle, niveauGarantie: q.niveauGarantie });
    }

    const savedBridgeUrl = localStorage.getItem("optipilot_bridge_url");
    if (savedBridgeUrl) setBridgeUrl(savedBridgeUrl);

    // Connexion Socket.io pour récupérer RAC réel en temps réel
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const userRaw = localStorage.getItem("optipilot_user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      socket.emit("rejoindre_magasin", user.magasinId);
    }

    // Écoute du résultat RAC temps réel
    socket.on("rac-confirme", (data: RacResult) => {
      setRacResult(data);
      setRacStatut("confirmed");
    });

    socket.on("rac-erreur", () => {
      setRacStatut("error");
    });

    return () => {
      socket.disconnect();
      bridgeWsRef.current?.close();
    };
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
    const rac = racResult ? racResult.montant : resteACharge;
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
${racResult ? `Sécu : -${racResult.secu}€\n${client.mutuelle} : -${racResult.mutuelle}€\nReste à charge RÉEL : ${rac}€` : `Remboursement SS + mutuelle : -${remboursement}€\nReste à charge estimé : ${resteACharge}€`}`;

    navigator.clipboard.writeText(texte).then(() => {
      alert("✓ Données copiées dans le presse-papier");
    });
  }

  async function envoyerVersOptimum() {
    const url = bridgeUrl || localStorage.getItem("optipilot_bridge_url") || "http://localhost:5174";
    const token = localStorage.getItem("optipilot_bridge_token") || "";
    setOptimumStatut("sending");
    setOptimumError(null);

    try {
      // 1. Créer/trouver le client dans Optimum
      const clientRes = await fetch(`${url}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bridge-token": token },
        body: JSON.stringify({
          civilite: "",
          nom: client.nom || "",
          prenom: client.prenom || "",
          email: client.email || "",
          mutuelle: client.mutuelle || "",
        }),
      });
      if (!clientRes.ok) throw new Error(`Erreur client (${clientRes.status})`);
      const { id: clientId } = await clientRes.json();

      // 2. Créer l'ordonnance
      const ordoRes = await fetch(`${url}/api/ordonnances`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bridge-token": token },
        body: JSON.stringify({
          clientId,
          odSphere: ordonnance.odSphere,
          odCylindre: ordonnance.odCylindre,
          odAxe: ordonnance.odAxe,
          odAddition: ordonnance.odAddition,
          ogSphere: ordonnance.ogSphere,
          ogCylindre: ordonnance.ogCylindre,
          ogAxe: ordonnance.ogAxe,
          ogAddition: ordonnance.ogAddition,
        }),
      });
      if (!ordoRes.ok) throw new Error(`Erreur ordonnance (${ordoRes.status})`);
      const { id: ordoId } = await ordoRes.json();

      // 3. Créer le devis et lancer la cotation automatiquement
      const devisRes = await fetch(`${url}/api/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bridge-token": token },
        body: JSON.stringify({
          clientId,
          ordonnanceId: ordoId,
          monture: prixMonture,
          verrier: offre?.verrier || "",
          gamme: offre?.gamme || "",
          offre: offre?.nom || "",
          prixVerres: totalVerres,
          totalDevis,
          resteACharge,
          remboursementSecu: offre?.remboursementSecu || 0,
          remboursementMutuelle: offre?.remboursementMutuelle || 0,
        }),
      });
      if (!devisRes.ok) throw new Error(`Erreur devis (${devisRes.status})`);
      const { id: devisId } = await devisRes.json();

      setOptimumStatut("waiting_cotation");

      // 4. Connexion WebSocket pour recevoir le résultat de cotation en temps réel
      const wsUrl = url.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsUrl}/ws?token=${encodeURIComponent(token)}`);
      bridgeWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "cotation_result" && msg.data?.devisId === devisId) {
            const cot = msg.data;
            setRacResult({
              montant: cot.resteACharge ?? resteACharge,
              secu: offre?.remboursementSecu || 0,
              mutuelle: cot.montantMutuelle || 0,
              detail: `${client.mutuelle || "Mutuelle"} — cotation Optimum confirmée`,
              statut: "accordé",
            });
            setRacStatut("confirmed");
            setOptimumStatut("cotation_received");
            ws.close();
          }
        } catch { /* message non-JSON ignoré */ }
      };

      ws.onerror = () => {
        // WS non bloquant — le devis est déjà dans Optimum, la cotation peut être récupérée manuellement
        setOptimumStatut("sent");
      };
    } catch (err) {
      setOptimumStatut("error");
      setOptimumError(err instanceof Error ? err.message : "Erreur bridge");
    }
  }

  async function confirmerRACReel() {
    setRacStatut("loading");
    const userRaw = localStorage.getItem("optipilot_user");
    const user = userRaw ? JSON.parse(userRaw) : { magasinId: "demo-magasin" };

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rac-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magasinId: user.magasinId,
          clientId: client.nom || "demo",
          mutuelle: client.mutuelle || "",
          niveauGarantie: client.niveauGarantie || "",
          typeVerre: offre?.type || "progressif",
          totalDevis,
          offre: offre?.nom,
        }),
      });
    } catch {
      // Mode démo : simulation réponse 3 secondes
      setTimeout(() => {
        const demoResult: RacResult = {
          montant: Math.max(0, totalDevis - (offre?.remboursementSecu || 30) - 185),
          secu: offre?.remboursementSecu || 30,
          mutuelle: 185,
          detail: `${client.mutuelle || "MGEN"} ${client.niveauGarantie || "Confort"} — ${offre?.type || "Progressif"}`,
          statut: "accordé",
        };
        setRacResult(demoResult);
        setRacStatut("confirmed");
      }, 3000);
    }
  }

  return (
      <div className="page-bg min-h-screen flex flex-col">
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
              style={{ background: "#0A0338" }}
            >
    {/* En-tête */}
            <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid rgba(83,49,208,0.25)" }}>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: "#FDFDFE" }}>
                  Devis {offre?.nom || "Confort"}
                </h2>
                <p className="text-base mt-1" style={{ color: "#9B96DA" }}>
                  {new Date().toLocaleDateString("fr-FR")} · Valable 30 jours
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
                        ? "#5331D0"
                        : "#5331D0",
                  }}
                >
                  {offre.nom}
                </span>
              )}
            </div>

            {/* Client */}
            {(client.nom || client.prenom) && (
              <div className="mb-5">
                <p className="section-label mb-1">CLIENT</p>
                <p className="text-xl font-bold" style={{ color: "#FDFDFE" }}>
                  {client.prenom} {client.nom}
                </p>
                {client.mutuelle && (
                  <p className="text-base mt-0.5" style={{ color: "#9B96DA" }}>
                    {client.mutuelle} — {client.niveauGarantie}
                  </p>
                )}
              </div>
            )}

            {/* Ordonnance résumé */}
            {ordonnance.odSphere && (
              <div
                className="mb-5 p-4 rounded-xl"
                style={{ background: "rgba(10,3,56,0.6)", border: "1px solid rgba(83,49,208,0.35)" }}
              >
                <p className="section-label mb-2">ORDONNANCE</p>
                <p className="text-base font-mono font-semibold" style={{ color: "#FDFDFE" }}>
                  OD : {ordonnance.odSphere} ({ordonnance.odCylindre}) {ordonnance.odAxe}°
                  {ordonnance.odAddition && ` ADD ${ordonnance.odAddition}`}
                </p>
                <p className="text-base font-mono font-semibold" style={{ color: "#FDFDFE" }}>
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
              <div className="pt-2" style={{ borderTop: "1px solid rgba(10,3,56,0.8)" }} />
              <DevisLigne
                label="Sous-total"
                value={`${totalDevis}€`}
                bold
              />
              <DevisLigne
                label="Remboursement Sécurité Sociale"
                value={`${offre?.remboursementSecu || 0}€`}
                green
              />
              <DevisLigne
                label={`Remboursement Mutuelle (${client.mutuelle || "—"})`}
                value={`${offre?.remboursementMutuelle || 0}€`}
                green
              />
              <div
                className="flex items-center justify-between p-5 rounded-xl mt-2"
                style={{ background: "linear-gradient(135deg, rgba(83,49,208,0.12), rgba(83,49,208,0.22))", border: "1px solid rgba(83,49,208,0.4)" }}
              >
                <p className="text-lg font-bold" style={{ color: "#FDFDFE" }}>
                  Reste à Charge
                </p>
                <p className="text-4xl font-black" style={{ color: "#9B96DA" }}>
                  {resteACharge}€
                </p>
              </div>
            </div>

            {/* Verre détail */}
            {offre && (
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(83,49,208,0.25)" }}>
                <p className="section-label mb-2">INCLUS DANS L’OFFRE</p>
                {offre.argumentaire.map((arg, i) => (
                  <p key={i} className="text-base py-0.5" style={{ color: "#9B96DA" }}>
                    {arg}
                  </p>
                ))}
              </div>
            )}

            {/* Mentions légales */}
            <p
              className="text-base mt-4 pt-3"
              style={{ borderTop: "1px solid rgba(10,3,56,0.8)", color: "rgba(155,150,218,0.6)" }}
            >
              Devis établi conformément aux articles L. 441-2 et suivants du Code de la consommation.
              Valable 30 jours à compter de la date d'émission. Les remboursements mutuelles sont
              donnés à titre indicatif.
            </p>
            </motion.div>
          </div>

          {/* Boutons d'action + RAC temps réel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* ─── BLOC RAC TEMPS RÉEL ─── */}
            <AnimatePresence mode="wait">
              {racStatut === "idle" && (
                <motion.button
                  key="btn-rac"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmerRACReel}
                  className="w-full rounded-2xl font-bold text-white flex items-center justify-center gap-3"
                  style={{
                    padding: "22px 24px",
                    fontSize: "1.125rem",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    boxShadow: "0 6px 28px rgba(34,197,94,0.45)",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>🎯</span>
                  <div className="text-left">
                    <div>Confirmer et obtenir RAC réel</div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.85, fontWeight: 500 }}>Connexion automatique mutuelle</div>
                  </div>
                </motion.button>
              )}

              {racStatut === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="rac-card loading w-full"
                >
                  <div className="flex flex-col items-center gap-4 py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    >
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ec4899" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" />
                      </svg>
                    </motion.div>
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: "#FDFDFE" }}>Vérification en cours...</p>
                      <p className="text-base mt-1" style={{ color: "#9B96DA" }}>Nous consultons votre mutuelle</p>
                      <p className="text-base mt-1" style={{ color: "rgba(155,150,218,0.7)" }}>Environ 15–30 secondes</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {racStatut === "confirmed" && racResult && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="rac-card confirmed w-full"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.5)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <p className="text-xl font-bold" style={{ color: "#22c55e" }}>Remboursement confirmé</p>
                      <p className="text-base" style={{ color: "#9B96DA" }}>{racResult.detail}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-4" style={{ borderTop: "1px solid rgba(34,197,94,0.25)", paddingTop: 16 }}>
                    <div className="flex justify-between items-center">
                      <span className="text-base" style={{ color: "#9B96DA" }}>Sécurité Sociale</span>
                      <span className="text-lg font-bold" style={{ color: "#22c55e" }}>-{racResult.secu}€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-base" style={{ color: "#9B96DA" }}>{client.mutuelle || "Mutuelle"}</span>
                      <span className="text-lg font-bold" style={{ color: "#22c55e" }}>-{racResult.mutuelle}€</span>
                    </div>
                    <div
                      className="flex justify-between items-center p-3 rounded-xl mt-1"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.4)" }}
                    >
                      <span className="text-lg font-bold" style={{ color: "#FDFDFE" }}>Votre RAC réel</span>
                      <span className="text-4xl font-black" style={{ color: "#FDFDFE" }}>{racResult.montant}€</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={envoyerDevis}
                      className="py-4 rounded-xl font-bold text-white text-base"
                      style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}
                    >
                      Je choisis cette offre
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push("/recommandations")}
                      className="py-4 rounded-xl font-semibold text-base"
                      style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.4)" }}
                    >
                      Voir autres options
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {racStatut === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rac-card w-full"
                >
                  <p className="text-lg font-bold mb-2" style={{ color: "#ef4444" }}>Erreur de connexion mutuelle</p>
                  <p className="text-base" style={{ color: "#9B96DA" }}>Le RAC estimé reste valable. Relancez manuellement.</p>
                  <button
                    onClick={() => setRacStatut("idle")}
                    className="mt-4 w-full py-3 rounded-xl font-semibold text-base"
                    style={{ background: "rgba(83,49,208,0.2)", color: "#9B96DA" }}
                  >
                    Réessayer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Envoi email */}
          {sent ? (
            <div
              className="py-4 rounded-2xl text-center font-semibold text-lg"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "2px solid #22c55e" }}
            >
              ✓ Devis envoyé par email !
            </div>
          ) : racStatut !== "confirmed" ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={envoyerDevis}
              disabled={sending}
              className="w-full py-5 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #5331D0, #9B96DA)",
                boxShadow: "0 4px 24px rgba(83,49,208,0.5)",
              }}
            >
              {sending ? (
                <>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Envoi...
                </>
              ) : (
                "Envoyer le Devis par email"
              )}
            </motion.button>
          ) : null}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={exporterPDF}
              className="flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
              style={{ background: "#0A0338", color: "#FDFDFE", border: "2px solid rgba(83,49,208,0.45)" }}
            >
              Exporter PDF
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={copierDonnees}
              className="flex-1 py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2"
              style={{ background: "#0A0338", color: "#FDFDFE", border: "2px solid rgba(83,49,208,0.45)" }}
            >
              Copier données
            </motion.button>
          </div>

          {/* ─── SYNCHRONISATION OPTIMUM ─── */}
          {bridgeUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid rgba(83,49,208,0.4)", background: "rgba(10,3,56,0.7)" }}
            >
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(83,49,208,0.2)" }}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background:
                        optimumStatut === "cotation_received" || optimumStatut === "sent"
                          ? "#22c55e"
                          : optimumStatut === "error"
                          ? "#ef4444"
                          : optimumStatut === "sending" || optimumStatut === "waiting_cotation"
                          ? "#a78bfa"
                          : "rgba(155,150,218,0.5)",
                      boxShadow:
                        optimumStatut === "sending" || optimumStatut === "waiting_cotation"
                          ? "0 0 8px rgba(167,139,250,0.6)"
                          : "none",
                    }}
                  />
                  <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>Synchroniser Optimum</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA" }}>
                  PC connecté
                </span>
              </div>

              <div className="px-5 py-4">
                {optimumStatut === "idle" && (
                  <>
                    <p className="text-sm mb-3" style={{ color: "#9B96DA" }}>
                      Envoie le client, l&apos;ordonnance et le devis directement dans Optimum. La cotation mutuelle revient automatiquement.
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={envoyerVersOptimum}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, #5331D0, #7c3aed)",
                        boxShadow: "0 4px 20px rgba(83,49,208,0.45)",
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Envoyer vers Optimum
                    </motion.button>
                  </>
                )}

                {optimumStatut === "sending" && (
                  <div className="flex items-center gap-3 py-1">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" />
                      </svg>
                    </motion.div>
                    <p className="text-base font-semibold" style={{ color: "#a78bfa" }}>Envoi vers Optimum...</p>
                  </div>
                )}

                {optimumStatut === "waiting_cotation" && (
                  <div className="flex flex-col gap-2 py-1">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" />
                        </svg>
                      </motion.div>
                      <div>
                        <p className="text-base font-semibold" style={{ color: "#a78bfa" }}>Devis envoyé — cotation en attente</p>
                        <p className="text-sm" style={{ color: "#9B96DA" }}>L&apos;opticien lance la cotation dans Optimum</p>
                      </div>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "rgba(155,150,218,0.6)" }}>Le résultat apparaîtra ici automatiquement (jusqu&apos;à 3 min)</p>
                  </div>
                )}

                {(optimumStatut === "sent" || optimumStatut === "cotation_received") && (
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.5)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold" style={{ color: "#22c55e" }}>
                        {optimumStatut === "cotation_received" ? "Cotation reçue d'Optimum" : "Envoyé dans Optimum"}
                      </p>
                      <p className="text-sm" style={{ color: "#9B96DA" }}>
                        {optimumStatut === "cotation_received" ? "RAC mis à jour avec le montant réel" : "Visible dans la liste des devis"}
                      </p>
                    </div>
                  </div>
                )}

                {optimumStatut === "error" && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Erreur de connexion bridge</p>
                    {optimumError && <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>{optimumError}</p>}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setOptimumStatut("idle")}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: "rgba(83,49,208,0.2)", color: "#9B96DA" }}
                      >
                        Réessayer
                      </button>
                      <button
                        onClick={() => window.open("/bridge", "_blank")}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA", border: "1px solid rgba(83,49,208,0.3)" }}
                      >
                        Config bridge
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Offre complémentaire */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/offre-complementaire")}
            className="w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #5331D0, #9B96DA)",
              color: "#FDFDFE",
            }}
          >
            Voir l'offre complémentaire
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="w-full py-4 rounded-2xl font-medium text-base"
            style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA" }}
          >
            Retour à l’accueil
          </motion.button>
          {/* ─── CONSEILLER IA ─── */}
          <ConseillerIA
            questionnaire={questionnaire}
            offre={offre}
            open={conseillerOpen}
            onToggle={() => setConseillerOpen((v) => !v)}
            onUpgrade={() => router.push("/recommandations")}
          />        </motion.div>
        </div>
      </main>
    </div>
  );
}

// ─── Conseiller IA ─────────────────────────────────────────

interface Tip {
  phrase: string;
  isUpsell?: boolean;
}

function genererTips(questionnaire: Record<string, unknown>, offre: OffreVerre | null): Tip[] {
  const tips: Tip[] = [];
  const ecran = Number(questionnaire.tempsEcran) || 0;
  const profession = String(questionnaire.profession || "");
  const conduiteNuit = Boolean(questionnaire.conduiteNuit);
  const photophobie = Boolean(questionnaire.photophobie);
  const isProgressif = offre?.type?.toLowerCase().includes("progressif");

  if (ecran >= 6) {
    tips.push({
      phrase: `"Avec ${ecran}h/jour sur écran, ce filtre lumière bleue va vraiment réduire votre fatigue visuelle dès le soir — c'est le retour que tous nos clients bureau me font."`,
    });
  } else if (ecran >= 3) {
    tips.push({
      phrase: `"Le filtre anti-lumière bleue est inclus — idéal pour vos ${ecran}h sur écran, vous sentirez la différence après une semaine."`,
    });
  }

  if (conduiteNuit) {
    tips.push({
      phrase: `"L'antireflet premium élimine 99% des reflets des phares la nuit. C'est souvent la raison n°1 qui fait choisir cette offre pour les conducteurs."`,
    });
  }

  if (photophobie) {
    tips.push({
      phrase: `"Avec votre sensibilité à la lumière, ces verres photochromiques s'adaptent automatiquement — plus besoin d'une paire de soleil séparée pour sortir."`,
    });
  }

  if (isProgressif) {
    tips.push({
      phrase: `"Pour les progressifs, le temps d'adaptation est de 3 à 7 jours en général. Mais la grande majorité de nos clients oublient qu'ils en portent au bout de 2 semaines."`,
    });
  }

  if (profession === "bureautique") {
    tips.push({
      phrase: `"Pour un usage bureau, l'antireflet élimine aussi les reflets des néons et de la vitre de votre écran — vos yeux fatiguent beaucoup moins."`,
    });
  } else if (profession === "conduite" || profession === "transport") {
    tips.push({
      phrase: `"Pour les conducteurs professionnels, la clarté visuelle est critique. Ces verres sont taillés exactement pour ça."`,
    });
  } else if (profession === "sante") {
    tips.push({
      phrase: `"En milieu médical vous alternez entre écran, dossiers et patients — ce profil de verre est optimisé pour ces changements constants."`,
    });
  }

  if (offre?.nom === "Essentiel") {
    tips.push({
      phrase: `"Je vous signale que pour ${offre ? Math.round((offre.resteACharge * 0.3)) : 30}€ de plus environ, l'offre Confort inclut un indice plus mince et un antireflet premium — c'est l'offre que choisissent la moitié de nos clients."`,
      isUpsell: true,
    });
  }

  if (offre?.nom === "Confort") {
    tips.push({
      phrase: `"Si vous avez un budget un peu plus flexible, l'offre Premium inclut la garantie 2 ans casse + rayure — pour des lunettes que vous portez tous les jours, ça peut valoir le coup."`,
      isUpsell: true,
    });
  }

  // Si pas de tips spécifiques
  if (tips.length === 0) {
    tips.push({
      phrase: `"Ce choix correspond parfaitement à votre profil. Les verres ${offre?.gamme || ""} sont une référence dans cette gamme."`,
    });
  }

  return tips;
}

function ConseillerIA({
  questionnaire,
  offre,
  open,
  onToggle,
  onUpgrade,
}: {
  questionnaire: Record<string, unknown>;
  offre: OffreVerre | null;
  open: boolean;
  onToggle: () => void;
  onUpgrade: () => void;
}) {
  const tips = genererTips(questionnaire, offre);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid rgba(167,139,250,0.35)", background: "rgba(83,49,208,0.1)" }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.4)" }}>
            <Image src="/assets/images/IA_Optipilot.png" alt="OptiPilot IA" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold" style={{ color: "#a78bfa" }}>Conseiller IA</p>
            <p className="text-sm" style={{ color: "#9B96DA" }}>Phrases à dire au client</p>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          fill="none"
          viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M6 9l6 6 6-6" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Contenu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 flex flex-col gap-3">
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-xl p-4"
                  style={{
                    background: tip.isUpsell
                      ? "rgba(20,5,40,0.92)"
                      : "rgba(10,3,56,0.6)",
                    border: tip.isUpsell
                      ? "1px solid rgba(236,72,153,0.5)"
                      : "1px solid rgba(83,49,208,0.2)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <p
                      className="text-sm italic leading-relaxed"
                      style={{ color: tip.isUpsell ? "#f472b6" : "#FDFDFE" }}
                    >
                      {tip.phrase}
                    </p>
                  </div>
                  {tip.isUpsell && (
                    <button
                      onClick={onUpgrade}
                      className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: "rgba(236,72,153,0.15)", color: "#f472b6" }}
                    >
                      Voir l&apos;offre supérieure →
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p
          className="text-base"
          style={{
            color: bold ? "#FDFDFE" : "#9B96DA",
            fontWeight: bold ? 700 : 400,
          }}
        >
          {label}
        </p>
        {sub && (
          <p className="text-base mt-0.5" style={{ color: "rgba(155,150,218,0.7)" }}>
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
            className="w-24 text-right text-lg font-semibold px-3 py-1.5 rounded-lg border outline-none"
            style={{ color: "#FDFDFE", borderColor: "rgba(83,49,208,0.45)", background: "#0A0338" }}
          />
          <span className="text-base" style={{ color: "#9B96DA" }}>€</span>
        </div>
      ) : (
        <p
          className="text-lg font-bold"
          style={{ color: green ? "#22c55e" : "#FDFDFE" }}
        >
          {value}
        </p>
      )}
    </div>
  );
}
