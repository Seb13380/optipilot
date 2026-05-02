"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { io, Socket } from "socket.io-client";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";
import type { OffreVerre } from "@/lib/recommandation";

interface ClientInfo {
  nom?: string;
  prenom?: string;
  email?: string;
  mutuelle?: string;
  niveauGarantie?: string;
}

interface MontureStock {
  id: string | number;
  marque: string;
  reference: string;
  couleur?: string;
  matiere?: string;
  genre?: string;
  prix: number;
  stock?: number;
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
  const [devisId, setDevisId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // RAC temps réel
  const [racStatut, setRacStatut] = useState<RacStatut>("idle");
  const [racResult, setRacResult] = useState<RacResult | null>(null);

  // Prix monture (saisie opticien)
  const [prixMonture, setPrixMonture] = useState(120);
  const [questionnaire, setQuestionnaire] = useState<Record<string, unknown>>({});
  const [conseillerOpen, setConseillerOpen] = useState(false);

  // Bridge Optimum
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [optimumStatut, setOptimumStatut] = useState<OptimumStatut>("idle");
  const [optimumError, setOptimumError] = useState<string | null>(null);

  // Remise opticien
  const [remise, setRemise] = useState(0);

  // Sélection monture depuis le stock Optimum
  const [montureSelectionnee, setMontureSelectionnee] = useState<MontureStock | null>(null);
  const [monturesStock, setMonturesStock] = useState<MontureStock[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockPanelOpen, setStockPanelOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState("");

  // Saisie manuelle monture (bridge non connecté)
  const [montureManuelle, setMontureManuelle] = useState({ fabricant: "", marque: "", modele: "", calibreOeil: "", calibrePont: "", calibreBranche: "" });

  // Client — email & recherche
  const [clientEmail, setClientEmail] = useState("");
  const [emailInputOpen, setEmailInputOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<{id: string; nom: string; prenom: string; email?: string; mutuelle?: string}[]>([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState("");
  const [clientCreateOpen, setClientCreateOpen] = useState(false);
  const [clientCreateForm, setClientCreateForm] = useState({ prenom: "", nom: "", email: "", tel: ["","","","",""], mutuelle: "", dateNaissance: "", adresse: "", numeroSecu: "" });
  const [clientCreateLoading, setClientCreateLoading] = useState(false);

  const MUTUELLES = ["","Harmonie Mutuelle","MGEN","Malakoff Humanis","AG2R La Mondiale","Groupama","MAAF","GMF","MAIF","MACIF","Mutuelle de France","Generali","April","Allianz","AXA","Covéa","Swiss Life","Intégrance","Mutuelle des Motards","Smatis","Eovi-MCD","Apicil","Klesia","Pro BTP","Solimut","Amphivia","Autre"];

  useEffect(() => {
    const offreRaw = localStorage.getItem("optipilot_offre_selectionnee");
    const clientRaw = localStorage.getItem("optipilot_client");
    const ordoRaw = localStorage.getItem("optipilot_ordonnance");
    const questRaw = localStorage.getItem("optipilot_questionnaire");

    if (offreRaw) setOffre(JSON.parse(offreRaw));
    if (clientRaw) {
      const c = JSON.parse(clientRaw);
      setClient(c);
      setClientEmail(c.email || "");
      // Synchronise optipilot_client_id si le scan mutuelle a renvoyé un id
      if (c.id && !localStorage.getItem("optipilot_client_id")) {
        localStorage.setItem("optipilot_client_id", c.id);
      }
    }
    if (ordoRaw) setOrdonnance(JSON.parse(ordoRaw));
    if (questRaw) {
      const q = JSON.parse(questRaw);
      setQuestionnaire(q);
      if (!clientRaw) setClient({ mutuelle: q.mutuelle, niveauGarantie: q.niveauGarantie });
    }

    // Monture sélectionnée depuis le catalogue (stock Optimum)
    const montureStockRaw = localStorage.getItem("optipilot_monture_stock");
    if (montureStockRaw) {
      try {
        const m = JSON.parse(montureStockRaw);
        setMontureSelectionnee(m);
        if (m.prix) setPrixMonture(m.prix);
        localStorage.removeItem("optipilot_monture_stock"); // consommé une seule fois
      } catch { /* ignore */ }
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
  const totalBrut = prixMonture + totalVerres;
  const totalDevis = totalBrut - remise;
  const remboursement = offre ? offre.remboursementSecu + offre.remboursementMutuelle : 0;
  const resteACharge = Math.max(0, totalDevis - remboursement);

  async function rechercherClient(q: string) {
    setClientSearchQuery(q);
    if (q.length < 2) { setClientSearchResults([]); return; }
    setClientSearchLoading(true);
    try {
      const token = localStorage.getItem("optipilot_token") || "";
      const userRaw = localStorage.getItem("optipilot_user");
      const magasin = userRaw ? JSON.parse(userRaw).magasinId : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients/search?nom=${encodeURIComponent(q)}&magasinId=${magasin}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setClientSearchResults(await res.json());
    } catch { /* offline */ }
    setClientSearchLoading(false);
  }

  async function creerClientInline() {
    if (!clientCreateForm.nom.trim() || !clientCreateForm.prenom.trim()) return;
    setClientCreateLoading(true);
    try {
      const token = localStorage.getItem("optipilot_token") || "";
      const userRaw = localStorage.getItem("optipilot_user");
      const magasinId = userRaw ? JSON.parse(userRaw).magasinId : "";
      const telephone = clientCreateForm.tel.join("");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prenom: clientCreateForm.prenom, nom: clientCreateForm.nom, email: clientCreateForm.email, telephone, mutuelle: clientCreateForm.mutuelle, dateNaissance: clientCreateForm.dateNaissance || null, adresse: clientCreateForm.adresse || null, numeroSecu: clientCreateForm.numeroSecu || null, magasinId }),
      });
      if (res.ok) {
        const created = await res.json();
        selectionnerClient(created);
        setClientCreateOpen(false);
        setClientCreateForm({ prenom: "", nom: "", email: "", tel: ["","","","",""], mutuelle: "", dateNaissance: "", adresse: "", numeroSecu: "" });
      }
    } catch { /* offline */ }
    setClientCreateLoading(false);
  }

  function selectionnerClient(c: { id: string; nom: string; prenom: string; email?: string; mutuelle?: string }) {
    localStorage.setItem("optipilot_client_id", c.id);
    localStorage.setItem("optipilot_client", JSON.stringify(c));
    setClient({ nom: c.nom, prenom: c.prenom, email: c.email, mutuelle: c.mutuelle });
    setClientEmail(c.email || "");
    setClientSearchOpen(false);
    setClientSearchQuery("");
    setClientSearchResults([]);
  }

  async function envoyerDevis() {
    const emailFinal = clientEmail.trim();
    if (!emailFinal) { setEmailInputOpen(true); return; }
    setSending(true);
    try {
      const token = localStorage.getItem("optipilot_token") || "";
      const userRaw = localStorage.getItem("optipilot_user");
      const magasin = userRaw ? JSON.parse(userRaw).magasinId : "demo-magasin";
      const clientId = localStorage.getItem("optipilot_client_id") || "";
      if (!clientId) {
        alert("Veuillez d'abord rechercher et sélectionner le client.");
        setSending(false);
        return;
      }

      const montantSS  = racResult ? racResult.secu  : (offre?.remboursementSecu  ?? 0);
      const montantMut = racResult ? racResult.mutuelle : (offre?.remboursementMutuelle ?? 0);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId,
          magasinId: magasin,
          statut: "en_cours",
          offreChoisie: offre?.nom?.toLowerCase(),
          totalConfort: totalDevis,
          racConfort: resteACharge,
          remboursementSS:  montantSS,
          remboursementMutuelle: montantMut,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newDevisId = data.id ?? null;
        setDevisId(newDevisId);
        // Envoyer le devis par email
        if (newDevisId) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devis/${newDevisId}/email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ email: emailFinal }),
            });
          } catch { /* email non bloquant */ }
        }
        setEmailSentTo(emailFinal);
      }
    } catch {
      // Mode démo
    }
    setSent(true);
    setSending(false);
  }

  async function confirmerVente() {
    if (!devisId) return;
    setConfirming(true);
    try {
      const token = localStorage.getItem("optipilot_token") || "";
      const montantSS  = racResult ? racResult.secu  : (offre?.remboursementSecu  ?? 0);
      const montantMut = racResult ? racResult.mutuelle : (offre?.remboursementMutuelle ?? 0);
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/devis/${devisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          statut: "accept\u00e9",
          remboursementSS:  montantSS,
          remboursementMutuelle: montantMut,
        }),
      });
      setConfirmed(true);
    } catch {
      // Mode démo
    } finally {
      setConfirming(false);
    }
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
    const ligneMonture = montureSelectionnee
      ? `${montureSelectionnee.marque} — ${montureSelectionnee.reference} : ${prixMonture}€`
      : `Monture : ${prixMonture}€`;
    const texte = `DEVIS OPTIPILOT
Client: ${client.prenom || ""} ${client.nom || ""}
Date: ${new Date().toLocaleDateString("fr-FR")}

ORDONNANCE:
OD: Sph ${ordonnance.odSphere || "?"} Cyl ${ordonnance.odCylindre || "?"} Axe ${ordonnance.odAxe || "?"}°
OG: Sph ${ordonnance.ogSphere || "?"} Cyl ${ordonnance.ogCylindre || "?"} Axe ${ordonnance.ogAxe || "?"}°
ADD: ${ordonnance.odAddition || "—"}

DEVIS ${offre?.nom?.toUpperCase()}:
${ligneMonture}
Verres (${offre?.verrier} ${offre?.gamme}): ${totalVerres}€
Sous-total: ${totalBrut}€${remise > 0 ? `\nRemise opticien: -${remise}€\nTotal net: ${totalDevis}€` : ""}
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

  async function chargerStock() {
    setStockLoading(true);
    try {
      const res = await fetch(`/api/montures?prixMax=9999`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.montures)) {
        setMonturesStock(data.montures);
      }
    } catch {
      // Bridge non disponible — saisie manuelle conservée
    } finally {
      setStockLoading(false);
    }
  }

  return (
      <OpticianGuard>
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
                        ? "#a855f7"
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
              <div className={!montureSelectionnee && prixMonture === 120 ? "pulse-border" : ""}>
              <DevisLigne
                label={montureSelectionnee ? `${montureSelectionnee.marque} — ${montureSelectionnee.reference}` : "Monture"}
                value={`${prixMonture}€`}
                sub={montureSelectionnee?.couleur}
                editable
                onEdit={(v) => setPrixMonture(parseInt(v) || 0)}
              />
              </div>
              <DevisLigne
                label={`Verres — ${offre?.verrier || ""} ${offre?.gamme || ""}`}
                value={`${totalVerres}€`}
                sub={offre ? `Indice ${offre.indice} • Classe ${offre.classe100ps}` : undefined}
              />
              <div className="pt-2" style={{ borderTop: "1px solid rgba(10,3,56,0.8)" }} />
              <DevisLigne
                label="Sous-total"
                value={`${totalBrut}€`}
                bold
              />
              {/* Remise */}
              {remise > 0 && (
                <div className="flex items-center justify-between py-1.5 px-1">
                  <span className="text-base" style={{ color: "#c084fc" }}>Remise opticien</span>
                  <span className="text-base font-bold" style={{ color: "#c084fc" }}>-{remise}€</span>
                </div>
              )}
              {remise > 0 && (
                <>
                  <div className="pt-2" style={{ borderTop: "1px solid rgba(10,3,56,0.8)" }} />
                  <DevisLigne
                    label="Total net"
                    value={`${totalDevis}€`}
                    bold
                  />
                </>
              )}
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
            {/* ─── CLIENT ─── */}
            <div className="rounded-2xl p-5" style={{ background: "#0A0338", border: "1px solid rgba(83,49,208,0.4)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="section-label">CLIENT</p>
                <button
                  onClick={() => setClientSearchOpen((v) => !v)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold"
                  style={{ background: "rgba(83,49,208,0.18)", color: "#9B96DA" }}
                >
                  Rechercher
                </button>
              </div>
              {(client.nom || client.prenom) ? (
                <div className="flex flex-col gap-2">
                  <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>{client.prenom} {client.nom}</p>
                  {clientEmail ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm" style={{ color: "#9B96DA" }}>{clientEmail}</p>
                      <button onClick={() => setEmailInputOpen((v) => !v)} className="text-xs" style={{ color: "rgba(155,150,218,0.55)" }}>✏</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEmailInputOpen(true)}
                      className="text-xs text-left"
                      style={{ color: "#e879f9" }}
                    >
                      + Ajouter un email (requis pour l'envoi)
                    </button>
                  )}
                  {emailInputOpen && (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="email@client.fr"
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                        style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.35)" }}
                        onKeyDown={(e) => e.key === "Enter" && setEmailInputOpen(false)}
                        autoFocus
                      />
                      <button
                        onClick={() => setEmailInputOpen(false)}
                        className="px-3 py-1.5 rounded-lg text-sm font-bold"
                        style={{ background: "rgba(83,49,208,0.25)", color: "#FDFDFE" }}
                      >
                        OK
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "rgba(155,150,218,0.6)" }}>Aucun client sélectionné</p>
              )}
              {clientSearchOpen && (
                <div className="mt-3">
                  <input
                    value={clientSearchQuery}
                    onChange={(e) => rechercherClient(e.target.value)}
                    placeholder="Nom du client…"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                    style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                    autoFocus
                  />
                  {clientSearchLoading && <p className="text-xs text-center py-2" style={{ color: "#9B96DA" }}>Recherche…</p>}
                  {clientSearchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectionnerClient(c)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left mb-1"
                      style={{ background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.2)" }}
                    >
                      <span className="text-sm font-semibold" style={{ color: "#FDFDFE" }}>{c.prenom} {c.nom}</span>
                      <span className="text-xs" style={{ color: "#9B96DA" }}>{c.email || "sans email"}</span>
                    </button>
                  ))}
                  {clientSearchQuery.length >= 2 && !clientSearchLoading && clientSearchResults.length === 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs mb-2" style={{ color: "rgba(155,150,218,0.6)" }}>Client introuvable</p>
                      <button
                        onClick={() => { setClientCreateOpen(true); setClientSearchOpen(false); }}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                        style={{ background: "rgba(83,49,208,0.2)", color: "#9B96DA" }}
                      >
                        + Créer ce client
                      </button>
                    </div>
                  )}
              </div>
              )}
              {clientCreateOpen && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs font-bold mb-1" style={{ color: "#c084fc" }}>Nouveau client</p>
                  {/* Prénom / Nom */}
                  <div className="flex gap-2">
                    {(["prenom","nom"] as const).map((k) => (
                      <input key={k} type="text" placeholder={k === "prenom" ? "Prénom *" : "Nom *"}
                        value={clientCreateForm[k]}
                        onChange={(e) => setClientCreateForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                      />
                    ))}
                  </div>
                  {/* Email */}
                  <input type="email" placeholder="Email"
                    value={clientCreateForm.email}
                    onChange={(e) => setClientCreateForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                  />
                  {/* Téléphone — 5 cases de 2 chiffres */}
                  <div className="flex gap-1 items-center">
                    <span className="text-xs shrink-0" style={{ color: "#9B96DA" }}>+33</span>
                    {clientCreateForm.tel.map((v, i) => (
                      <input key={i} type="text" inputMode="numeric" maxLength={2} value={v}
                        placeholder="00"
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                          setClientCreateForm((f) => { const t = [...f.tel]; t[i] = val; return { ...f, tel: t }; });
                          if (val.length === 2 && i < 4) {
                            const next = document.getElementById(`tel-create-${i+1}`);
                            if (next) (next as HTMLInputElement).focus();
                          }
                        }}
                        id={`tel-create-${i}`}
                        className="w-10 text-center px-1 py-2 rounded-lg text-sm outline-none"
                        style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                      />
                    ))}
                  </div>
                  {/* Date de naissance */}
                  <input type="date"
                    value={clientCreateForm.dateNaissance}
                    onChange={(e) => setClientCreateForm((f) => ({ ...f, dateNaissance: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)", colorScheme: "dark" }}
                  />
                  {/* Adresse */}
                  <input type="text" placeholder="Adresse postale"
                    value={clientCreateForm.adresse}
                    onChange={(e) => setClientCreateForm((f) => ({ ...f, adresse: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                  />
                  {/* Numéro sécu */}
                  <input type="text" placeholder="N° Sécurité Sociale" maxLength={15}
                    value={clientCreateForm.numeroSecu}
                    onChange={(e) => setClientCreateForm((f) => ({ ...f, numeroSecu: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                    style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)", letterSpacing: "0.1em" }}
                  />
                  {/* Mutuelle */}
                  <select
                    value={clientCreateForm.mutuelle}
                    onChange={(e) => setClientCreateForm((f) => ({ ...f, mutuelle: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "rgba(20,10,60,0.95)", color: clientCreateForm.mutuelle ? "#FDFDFE" : "rgba(155,150,218,0.6)", border: "1px solid rgba(83,49,208,0.3)" }}
                  >
                    <option value="">Mutuelle…</option>
                    {MUTUELLES.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={creerClientInline}
                      disabled={clientCreateLoading || !clientCreateForm.nom || !clientCreateForm.prenom}
                      className="flex-1 py-2 rounded-lg text-sm font-bold"
                      style={{ background: "rgba(83,49,208,0.5)", color: "#FDFDFE", opacity: clientCreateLoading ? 0.6 : 1 }}
                    >
                      {clientCreateLoading ? "Création…" : "Créer et sélectionner"}
                    </button>
                    <button
                      onClick={() => setClientCreateOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm"
                      style={{ background: "rgba(83,49,208,0.1)", color: "#9B96DA" }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ─── SÉLECTION MONTURE STOCK ─── */}
            <div className="rounded-2xl p-5" style={{ background: "#0A0338", border: "1px solid rgba(83,49,208,0.4)" }}>
              <p className="section-label mb-3">MONTURE</p>
              {montureSelectionnee ? (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(83,49,208,0.15)" }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#FDFDFE" }}>
                      {montureSelectionnee.marque} — {montureSelectionnee.reference}
                    </p>
                    {montureSelectionnee.couleur && (
                      <p className="text-xs mt-0.5" style={{ color: "#9B96DA" }}>{montureSelectionnee.couleur}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold" style={{ color: "#9B96DA" }}>{montureSelectionnee.prix}€</span>
                    <button
                      onClick={() => setMontureSelectionnee(null)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: "rgba(155,150,218,0.7)", background: "rgba(83,49,208,0.12)" }}
                    >
                      Changer
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setStockPanelOpen((v) => !v); if (!stockPanelOpen && monturesStock.length === 0) chargerStock(); }}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "rgba(83,49,208,0.15)", color: "#9B96DA", border: "1.5px dashed rgba(83,49,208,0.5)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="#9B96DA" strokeWidth="2"/>
                    <path d="M21 21l-4-4" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Choisir depuis le stock Optimum
                </button>
              )}
              <AnimatePresence>
                {stockPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(83,49,208,0.3)", background: "rgba(10,3,56,0.9)" }}
                  >
                    <div className="p-3 pb-2">
                      <input
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        placeholder="Rechercher (marque, référence…)"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                      />
                    </div>
                    {stockLoading ? (
                      <div className="flex items-center justify-center py-6 gap-3">
                        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#9B96DA" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15"/>
                        </svg>
                        <span className="text-sm" style={{ color: "#9B96DA" }}>Chargement du stock…</span>
                      </div>
                    ) : monturesStock.length === 0 ? (
                      <div className="p-4">
                        <p className="text-xs font-semibold mb-3" style={{ color: "#9B96DA" }}>
                          Saisie manuelle — bridge Optimum non connecté
                        </p>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: "rgba(155,150,218,0.7)" }}>Fabricant</label>
                              <input
                                value={montureManuelle.fabricant}
                                onChange={(e) => setMontureManuelle((p) => ({ ...p, fabricant: e.target.value }))}
                                placeholder="ex: Luxottica"
                                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                                style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs mb-1 block" style={{ color: "rgba(155,150,218,0.7)" }}>Marque</label>
                              <input
                                value={montureManuelle.marque}
                                onChange={(e) => setMontureManuelle((p) => ({ ...p, marque: e.target.value }))}
                                placeholder="ex: Ray-Ban"
                                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                                style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "rgba(155,150,218,0.7)" }}>Modèle / Référence</label>
                            <input
                              value={montureManuelle.modele}
                              onChange={(e) => setMontureManuelle((p) => ({ ...p, modele: e.target.value }))}
                              placeholder="ex: Wayfarer RB2140"
                              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                              style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                            />
                          </div>
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "rgba(155,150,218,0.7)" }}>Taille — calibre œil / pont / branche</label>
                            <div className="flex gap-2">
                              <input
                                value={montureManuelle.calibreOeil}
                                onChange={(e) => setMontureManuelle((p) => ({ ...p, calibreOeil: e.target.value }))}
                                placeholder="52"
                                className="w-1/3 px-3 py-2 rounded-lg text-sm text-center outline-none"
                                style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                              />
                              <input
                                value={montureManuelle.calibrePont}
                                onChange={(e) => setMontureManuelle((p) => ({ ...p, calibrePont: e.target.value }))}
                                placeholder="18"
                                className="w-1/3 px-3 py-2 rounded-lg text-sm text-center outline-none"
                                style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                              />
                              <input
                                value={montureManuelle.calibreBranche}
                                onChange={(e) => setMontureManuelle((p) => ({ ...p, calibreBranche: e.target.value }))}
                                placeholder="145"
                                className="w-1/3 px-3 py-2 rounded-lg text-sm text-center outline-none"
                                style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs mb-1 block" style={{ color: "rgba(155,150,218,0.7)" }}>Tarif (€)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={prixMonture}
                                onChange={(e) => setPrixMonture(Math.max(0, parseInt(e.target.value) || 0))}
                                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                                style={{ background: "rgba(83,49,208,0.1)", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.3)" }}
                              />
                              <span className="text-sm font-bold" style={{ color: "#9B96DA" }}>€</span>
                              <button
                                onClick={() => {
                                  if (!montureManuelle.marque) return;
                                  const taille = [montureManuelle.calibreOeil, montureManuelle.calibrePont, montureManuelle.calibreBranche].filter(Boolean).join("-");
                                  const reference = [montureManuelle.modele, montureManuelle.fabricant].filter(Boolean).join(" · ");
                                  setMontureSelectionnee({ id: -1, marque: montureManuelle.marque, reference, couleur: taille || undefined, prix: prixMonture });
                                  setStockPanelOpen(false);
                                }}
                                disabled={!montureManuelle.marque}
                                className="px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{
                                  background: montureManuelle.marque ? "linear-gradient(135deg, #5331D0, #7c3aed)" : "rgba(83,49,208,0.2)",
                                  color: montureManuelle.marque ? "#FDFDFE" : "rgba(155,150,218,0.4)",
                                }}
                              >
                                Valider
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto">
                        {monturesStock
                          .filter((m) => {
                            const q = stockSearch.toLowerCase();
                            return !q || m.marque?.toLowerCase().includes(q) || m.reference?.toLowerCase().includes(q);
                          })
                          .slice(0, 30)
                          .map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { setMontureSelectionnee(m); setPrixMonture(m.prix); setStockPanelOpen(false); setStockSearch(""); }}
                              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                              style={{ borderTop: "1px solid rgba(83,49,208,0.12)" }}
                            >
                              <div>
                                <p className="text-sm font-bold" style={{ color: "#FDFDFE" }}>{m.marque} — {m.reference}</p>
                                {m.couleur && <p className="text-xs" style={{ color: "#9B96DA" }}>{m.couleur}</p>}
                              </div>
                              <span className="text-sm font-bold ml-4 shrink-0" style={{ color: "#9B96DA" }}>{m.prix}€</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── REMISE OPTICIEN ─── */}
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: "#0A0338", border: "1px solid rgba(192,132,252,0.35)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9.5 9.5h.01M14.5 14.5h.01M9 15L15 9" stroke="#c084fc" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="#c084fc" strokeWidth="2"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "#c084fc" }}>REMISE OPTICIEN</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(192,132,252,0.65)" }}>Offre commerciale, promo, fidélité…</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold" style={{ color: "#c084fc" }}>−</span>
                <input
                  type="number"
                  min="0"
                  value={remise}
                  onChange={(e) => setRemise(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 text-right px-2 py-1.5 rounded-lg text-lg font-bold outline-none"
                  style={{ background: "rgba(192,132,252,0.1)", color: "#c084fc", border: "1px solid rgba(192,132,252,0.35)" }}
                />
                <span className="text-base font-bold" style={{ color: "#c084fc" }}>€</span>
              </div>
            </div>

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
                    background: "linear-gradient(135deg, #5331D0, #7c3aed)",
                    boxShadow: "0 6px 28px rgba(83,49,208,0.45)",
                  }}
                >
                  <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>►</span>
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
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.15)", border: "2px solid rgba(139,92,246,0.5)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div>
                      <p className="text-xl font-bold" style={{ color: "#a78bfa" }}>Remboursement confirmé</p>
                      <p className="text-base" style={{ color: "#9B96DA" }}>{racResult.detail}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mb-4" style={{ borderTop: "1px solid rgba(139,92,246,0.25)", paddingTop: 16 }}>
                    <div className="flex justify-between items-center">
                      <span className="text-base" style={{ color: "#9B96DA" }}>Sécurité Sociale</span>
                      <span className="text-lg font-bold" style={{ color: "#a78bfa" }}>-{racResult.secu}€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-base" style={{ color: "#9B96DA" }}>{client.mutuelle || "Mutuelle"}</span>
                      <span className="text-lg font-bold" style={{ color: "#a78bfa" }}>-{racResult.mutuelle}€</span>
                    </div>
                    <div
                      className="flex justify-between items-center p-3 rounded-xl mt-1"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.4)" }}
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

            {/* Envoi + confirmation vente */}
          {confirmed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-5 rounded-2xl text-center space-y-1"
              style={{ background: "rgba(83,49,208,0.18)", border: "2px solid rgba(139,92,246,0.5)" }}
            >
              <p className="text-2xl"></p>
              <p className="font-bold text-xl" style={{ color: "#a78bfa" }}>Vente confirmée !</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                Le suivi des remboursements SS &amp; mutuelle a été initialisé automatiquement.
              </p>
            </motion.div>
          ) : sent && devisId ? (
            <AnimatePresence>
              <motion.button
                key="confirmer-vente"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={confirmerVente}
                disabled={confirming}
                className="w-full py-5 rounded-2xl text-white font-bold text-xl flex items-center justify-center gap-3"
                style={{
                  background: "linear-gradient(135deg, #5331D0, #7c3aed)",
                  boxShadow: "0 6px 28px rgba(83,49,208,0.4)",
                }}
              >
                {confirming ? (
                  <>
                    <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                    Confirmation…
                  </>
                ) : (
                  <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <div className="text-left">
                      <div>Confirmer la vente</div>
                      <div style={{ fontSize: "0.85rem", opacity: 0.85, fontWeight: 500 }}>
                        Lance le suivi SS &amp; mutuelle
                      </div>
                    </div>
                  </>
                )}
              </motion.button>
            </AnimatePresence>
          ) : sent ? (
            <div
              className="py-4 rounded-2xl text-center font-semibold text-lg"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "2px solid #22c55e" }}
            >
              ✓ Devis envoyé à {emailSentTo || "(email non renseigné)"}
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

          {/* ─── SYNCHRONISATION OPTIMUM LIVE (mode cloud) ─── */}
          {!bridgeUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid rgba(83,49,208,0.4)", background: "rgba(10,3,56,0.7)" }}
            >
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(83,49,208,0.2)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(155,150,218,0.5)" }} />
                  <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>Envoyer vers Optimum Live</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA" }}>
                  Cloud
                </span>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm mb-3" style={{ color: "#9B96DA" }}>
                  Ouvre le formulaire de devis dans Optimum Live et pré-remplit les champs automatiquement via l&apos;extension Chrome.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const payload = {
                      nom: client.nom || "",
                      prenom: client.prenom || "",
                      mutuelle: client.mutuelle || "",
                      verrier: offre?.verrier || "",
                      gamme: offre?.gamme || "",
                      offre: offre?.nom || "",
                      prixVerres: totalVerres,
                      prixMonture,
                      prixTotal: totalDevis,
                      remboursementSecu: offre?.remboursementSecu || 0,
                      remboursementMutuelle: offre?.remboursementMutuelle || 0,
                    };
                    const hash = encodeURIComponent(JSON.stringify(payload));
                    window.open(`https://livebyoptimum.com#optipilot-devis=${hash}`, "_blank");
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #5331D0, #7c3aed)",
                    boxShadow: "0 4px 20px rgba(83,49,208,0.45)",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Ouvrir dans Optimum Live
                </motion.button>
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
    </OpticianGuard>
  );
}

// ─── Conseiller IA ─────────────────────────────────────────

interface ChatMessage {
  from: "client" | "ia";
  texte: string;
}

function ConseillerIA({
  offre,
  open,
  onToggle,
}: {
  questionnaire: Record<string, unknown>;
  offre: OffreVerre | null;
  open: boolean;
  onToggle: () => void;
  onUpgrade: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "ia", texte: "Bonjour ! Avez-vous des questions sur votre devis, vos verres, votre correction ou vos remboursements ? Je suis là pour vous aider." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendQuestion() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { from: "client", texte: q }]);
    setLoading(true);
    try {
      const contexte = offre ? `Offre choisie : ${offre.nom} — ${offre.gamme} (${offre.verrier}), indice ${offre.indice}, ${offre.prixVerres}€. Remboursement Sécu : ${offre.remboursementSecu}€, Mutuelle : ${offre.remboursementMutuelle}€. Reste à charge : ${offre.resteACharge}€.` : "";
      const res = await fetch("/api/conseil-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, contexte }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { from: "ia", texte: data.reponse || "Je n'ai pas pu répondre. Reformulez votre question." }]);
    } catch {
      setMessages((m) => [...m, { from: "ia", texte: "Une erreur est survenue. Veuillez réessayer." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid rgba(167,139,250,0.35)", background: "rgba(83,49,208,0.1)" }}
    >
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.4)" }}>
            <Image src="/assets/images/IA_Optipilot.png" alt="OptiPilot IA" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <p className="text-base font-bold" style={{ color: "#a78bfa" }}>Assistant optique</p>
            <p className="text-sm" style={{ color: "#9B96DA" }}>Vous avez des questions ?</p>
          </div>
        </div>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
          <path d="M6 9l6 6 6-6" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-col gap-3">
              {/* Messages */}
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.from === "client" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        maxWidth: "85%",
                        background: msg.from === "client"
                          ? "linear-gradient(135deg, #5331D0, #7B5CE5)"
                          : "rgba(10,3,56,0.85)",
                        color: "#FDFDFE",
                        border: msg.from === "ia" ? "1px solid rgba(83,49,208,0.3)" : "none",
                      }}
                    >
                      {msg.texte}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: "rgba(10,3,56,0.85)", color: "#9B96DA", border: "1px solid rgba(83,49,208,0.3)" }}>
                      <span className="animate-pulse">En train de répondre…</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Saisie */}
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
                  placeholder="Posez votre question sur vos lunettes…"
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(8,2,40,0.8)", color: "#FDFDFE", border: "1.5px solid rgba(83,49,208,0.35)", caretColor: "#a78bfa" }}
                />
                <button
                  onClick={sendQuestion}
                  disabled={!input.trim() || loading}
                  className="px-4 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: input.trim() && !loading ? "linear-gradient(135deg, #5331D0, #7B5CE5)" : "rgba(83,49,208,0.25)", color: "white", transition: "all 0.2s" }}
                >
                  Envoyer
                </button>
              </div>
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
