"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────
interface MutuelleData {
  nom: string | null;
  prenom: string | null;
  numAdherent: string | null;
  mutuelle: string | null;
  niveauGarantie: string | null;
  dateValidite: string | null;
  organisme: string | null;
}

interface ClientFound {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  mutuelle: string | null;
  niveauGarantie: string | null;
  numAdherent: string | null;
  adresse: string | null;
  ordonnances: Array<{ dateOrdonnance: string | null }>;
}

type Step = "scan" | "analyse" | "lookup" | "confirm-existing" | "new-client" | "saving" | "done";

const NIVEAUX = ["Non renseigné", "Base", "Confort", "Confort+", "Premium", "Option 1", "Option 2", "Option 3"];

// ─── Composant Caméra ─────────────────────────────────────────────
function CameraCapture({ label, onCapture, onSkip }: {
  label: string;
  onCapture: (b64: string) => void;
  onSkip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: 1280, height: 720 } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setCameraError("Caméra inaccessible — vérifiez les permissions"));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-base font-semibold text-center" style={{ color: "#9B96DA" }}>{label}</p>
      {cameraError ? (
        <div className="w-full rounded-2xl p-6 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p className="text-base mb-3" style={{ color: "#ef4444" }}>📷 {cameraError}</p>
          <button onClick={onSkip} className="px-6 py-3 rounded-xl text-base font-bold" style={{ background: "linear-gradient(135deg,#5331D0,#9B96DA)", color: "#fff" }}>
            Saisie manuelle →
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9", background: "#000", border: "2px solid rgba(83,49,208,0.4)" }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-4/5 h-3/5 rounded-xl" style={{ border: "2px dashed rgba(155,150,218,0.7)" }} />
            </div>
            {ready && (
              <div className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-full" style={{ background: "rgba(0,200,0,0.7)", color: "#fff" }}>
                ● EN DIRECT
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-3 w-full">
            <motion.button whileTap={{ scale: 0.96 }} onClick={capture} disabled={!ready}
              className="flex-1 py-4 rounded-2xl text-white font-bold text-base"
              style={{ background: ready ? "linear-gradient(135deg,#5331D0,#9B96DA)" : "rgba(155,150,218,0.4)", boxShadow: ready ? "0 4px 20px rgba(83,49,208,0.4)" : "none" }}>
              📷 Prendre la photo
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onSkip}
              className="px-5 py-4 rounded-2xl font-medium text-sm"
              style={{ background: "rgba(83,49,208,0.12)", color: "#9B96DA" }}>
              Passer
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────
export default function NouveauClientPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("scan");
  const [mutuelleData, setMutuelleData] = useState<MutuelleData | null>(null);
  const [clientFound, setClientFound] = useState<ClientFound | null>(null);
  const [scanSource, setScanSource] = useState<"ai" | "demo" | "manual">("manual");
  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "", adresse: "",
    mutuelle: "", niveauGarantie: "Non renseigné", numAdherent: "",
    consentementRgpd: false, consentementRelance: false,
  });
  const [error, setError] = useState("");

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("optipilot_user") || "{}")
    : {};

  function setField(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const handleMutuelleCapture = useCallback(async (b64: string) => {
    setStep("analyse");
    try {
      const res = await fetch("/api/scan-mutuelle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const m: MutuelleData = data.mutuelle;
      setMutuelleData(m);
      setScanSource(data.source);
      setForm((p) => ({
        ...p,
        nom: m.nom || "",
        prenom: m.prenom || "",
        mutuelle: m.mutuelle || "",
        numAdherent: m.numAdherent || "",
        niveauGarantie: m.niveauGarantie || "Non renseigné",
      }));
      await lookupClient(m.nom || "", m.prenom || "");
    } catch {
      setStep("new-client");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function lookupClient(nom: string, prenom: string) {
    if (!nom && !prenom) { setStep("new-client"); return; }
    setStep("lookup");
    try {
      const token = localStorage.getItem("optipilot_token") || "";
      const params = new URLSearchParams({ magasinId: user.magasinId });
      if (nom) params.append("nom", nom);
      if (prenom) params.append("prenom", prenom);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients/search?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const clients: ClientFound[] = await res.json();
      if (clients.length > 0) {
        const best = clients[0];
        setClientFound(best);
        setForm((p) => ({
          ...p,
          nom: best.nom,
          prenom: best.prenom,
          email: best.email || "",
          telephone: best.telephone || "",
          adresse: best.adresse || "",
          mutuelle: p.mutuelle || best.mutuelle || "",
          numAdherent: p.numAdherent || best.numAdherent || "",
          niveauGarantie: p.niveauGarantie !== "Non renseigné" ? p.niveauGarantie : (best.niveauGarantie || "Non renseigné"),
          consentementRgpd: true,
        }));
        setStep("confirm-existing");
      } else {
        setStep("new-client");
      }
    } catch {
      setStep("new-client");
    }
  }

  async function handleSave() {
    if (!form.nom || !form.prenom) { setError("Nom et prénom obligatoires"); return; }
    if (!clientFound && !form.consentementRgpd) { setError("Le consentement RGPD est obligatoire"); return; }
    setStep("saving");
    const token = localStorage.getItem("optipilot_token") || "";
    try {
      let client;
      if (clientFound) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients/${clientFound.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nom: form.nom, prenom: form.prenom,
            email: form.email || null, telephone: form.telephone || null,
            adresse: form.adresse || null, mutuelle: form.mutuelle || null,
            niveauGarantie: form.niveauGarantie !== "Non renseigné" ? form.niveauGarantie : null,
            numAdherent: form.numAdherent || null,
          }),
        });
        client = await res.json();
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            magasinId: user.magasinId, nom: form.nom, prenom: form.prenom,
            email: form.email || null, telephone: form.telephone || null,
            adresse: form.adresse || null, mutuelle: form.mutuelle || null,
            niveauGarantie: form.niveauGarantie !== "Non renseigné" ? form.niveauGarantie : null,
            numAdherent: form.numAdherent || null,
            consentementRgpd: form.consentementRgpd, consentementRelance: form.consentementRelance,
          }),
        });
        client = await res.json();
      }
      localStorage.setItem("optipilot_client", JSON.stringify(client));
      setStep("done");
      setTimeout(() => router.push("/scanner"), 2000);
    } catch {
      setError("Erreur lors de la sauvegarde");
      setStep(clientFound ? "confirm-existing" : "new-client");
    }
  }

  const cardStyle = { background: "rgba(10,3,56,0.92)", border: "1.5px solid rgba(83,49,208,0.4)" };
  const inputStyle = { borderColor: "rgba(83,49,208,0.35)", background: "rgba(2,0,23,0.7)", color: "#FDFDFE" };
  const inputClass = "w-full px-4 py-3.5 rounded-2xl text-base border-2 outline-none transition-all";
  const labelClass = "block text-xs font-bold mb-1.5 tracking-wider uppercase";

  function InputField({ label, value, onChange, type = "text", placeholder = "", required = false }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string; required?: boolean;
  }) {
    return (
      <div>
        <label className={labelClass} style={{ color: "#9B96DA" }}>{label}{required && " *"}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required} className={inputClass} style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
        />
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen px-4 py-8">
      <div className="flex items-center gap-4 mb-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="text-2xl" style={{ color: "#9B96DA" }}>←</button>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#FDFDFE" }}>Nouveau client</h1>
          <p className="text-sm" style={{ color: "#9B96DA" }}>
            {step === "scan" && "Scannez la carte mutuelle"}
            {(step === "analyse" || step === "lookup") && "Analyse en cours..."}
            {step === "confirm-existing" && "Client reconnu — confirmez les informations"}
            {step === "new-client" && "Nouveau client — complétez le profil"}
            {(step === "saving" || step === "done") && "Enregistrement..."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── SCAN ── */}
        {step === "scan" && (
          <motion.div key="scan" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="max-w-2xl mx-auto rounded-3xl p-6" style={cardStyle}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg,#5331D0,#9B96DA)" }}>💳</div>
              <div>
                <h2 className="text-lg font-black" style={{ color: "#FDFDFE" }}>Carte mutuelle</h2>
                <p className="text-sm" style={{ color: "#9B96DA" }}>L&apos;IA lit le nom, n° adhérent et la mutuelle</p>
              </div>
            </div>
            <CameraCapture label="Placez la carte dans le cadre pointillé" onCapture={handleMutuelleCapture} onSkip={() => setStep("new-client")} />
          </motion.div>
        )}

        {/* ── ANALYSE/LOOKUP ── */}
        {(step === "analyse" || step === "lookup") && (
          <motion.div key="analyse" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto rounded-3xl p-10 text-center" style={cardStyle}>
            <svg className="animate-spin mx-auto mb-5" width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#9B96DA" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            <p className="text-xl font-bold mb-2" style={{ color: "#FDFDFE" }}>
              {step === "analyse" ? "Analyse de la carte..." : "Recherche du client..."}
            </p>
            <p className="text-base" style={{ color: "#9B96DA" }}>
              {step === "analyse" ? "GPT-4o lit les données de la mutuelle" : "Vérification dans vos dossiers"}
            </p>
          </motion.div>
        )}

        {/* ── CLIENT CONNU ── */}
        {step === "confirm-existing" && clientFound && (
          <motion.div key="existing" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="max-w-2xl mx-auto flex flex-col gap-4">
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(83,49,208,0.2)", border: "1px solid rgba(83,49,208,0.5)" }}>
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-black text-lg" style={{ color: "#FDFDFE" }}>Client reconnu</p>
                <p className="text-sm" style={{ color: "#9B96DA" }}>
                  Dernière visite : {clientFound.ordonnances?.[0]?.dateOrdonnance
                    ? new Date(clientFound.ordonnances[0].dateOrdonnance).toLocaleDateString("fr-FR")
                    : "inconnue"}
                  {scanSource === "ai" && " · Carte mutuelle scannée ✓"}
                </p>
              </div>
            </div>
            <div className="rounded-3xl p-6" style={cardStyle}>
              <h3 className="text-xs font-black mb-4 tracking-wider" style={{ color: "#9B96DA" }}>IDENTITÉ</h3>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nom" value={form.nom} onChange={(v) => setField("nom", v)} required />
                <InputField label="Prénom" value={form.prenom} onChange={(v) => setField("prenom", v)} required />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <InputField label="Email" value={form.email} onChange={(v) => setField("email", v)} type="email" />
                <InputField label="Téléphone" value={form.telephone} onChange={(v) => setField("telephone", v)} type="tel" />
              </div>
              <div className="mt-3">
                <InputField label="Adresse" value={form.adresse} onChange={(v) => setField("adresse", v)} placeholder="Rue, code postal, ville" />
              </div>
            </div>
            <div className="rounded-3xl p-6" style={cardStyle}>
              <h3 className="text-xs font-black mb-4 tracking-wider" style={{ color: "#9B96DA" }}>
                MUTUELLE {scanSource === "ai" && <span className="text-xs font-normal ml-2" style={{ color: "#22c55e" }}>✓ Scannée</span>}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Mutuelle" value={form.mutuelle} onChange={(v) => setField("mutuelle", v)} />
                <InputField label="N° Adhérent" value={form.numAdherent} onChange={(v) => setField("numAdherent", v)} />
              </div>
              <div className="mt-3">
                <label className={labelClass} style={{ color: "#9B96DA" }}>Niveau de garantie</label>
                <select value={form.niveauGarantie} onChange={(e) => setField("niveauGarantie", e.target.value)}
                  className={inputClass} style={{ ...inputStyle, appearance: "none" } as React.CSSProperties}>
                  {NIVEAUX.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep("scan")}
                className="flex-1 py-4 rounded-2xl font-medium" style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA" }}>
                ← Retour
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                className="py-4 rounded-2xl text-white font-bold text-base"
                style={{ flex: 2, background: "linear-gradient(135deg,#5331D0,#9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.4)" }}>
                Confirmer et passer au scanner →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── NOUVEAU CLIENT ── */}
        {step === "new-client" && (
          <motion.div key="new" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            className="max-w-2xl mx-auto flex flex-col gap-4">
            {mutuelleData && (
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(83,49,208,0.15)", border: "1px solid rgba(83,49,208,0.3)" }}>
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-bold" style={{ color: "#FDFDFE" }}>Carte mutuelle lue par IA</p>
                  <p className="text-sm" style={{ color: "#9B96DA" }}>
                    {mutuelleData.mutuelle} · N° {mutuelleData.numAdherent || "—"}
                    {scanSource === "demo" && " (démo)"}
                  </p>
                </div>
              </div>
            )}
            <div className="rounded-3xl p-6" style={cardStyle}>
              <h3 className="text-xs font-black mb-4 tracking-wider" style={{ color: "#9B96DA" }}>IDENTITÉ</h3>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Nom" value={form.nom} onChange={(v) => setField("nom", v)} required />
                <InputField label="Prénom" value={form.prenom} onChange={(v) => setField("prenom", v)} required />
              </div>
            </div>
            <div className="rounded-3xl p-6" style={cardStyle}>
              <h3 className="text-xs font-black mb-1 tracking-wider" style={{ color: "#9B96DA" }}>COORDONNÉES</h3>
              <p className="text-xs mb-4" style={{ color: "rgba(155,150,218,0.6)" }}>Demandez au client son email, téléphone et adresse</p>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Email" value={form.email} onChange={(v) => setField("email", v)} type="email" placeholder="client@email.fr" />
                <InputField label="Téléphone" value={form.telephone} onChange={(v) => setField("telephone", v)} type="tel" placeholder="06 12 34 56 78" />
              </div>
              <div className="mt-3">
                <InputField label="Adresse postale" value={form.adresse} onChange={(v) => setField("adresse", v)} placeholder="12 rue de la Paix, 75001 Paris" />
              </div>
            </div>
            <div className="rounded-3xl p-6" style={cardStyle}>
              <h3 className="text-xs font-black mb-4 tracking-wider" style={{ color: "#9B96DA" }}>
                MUTUELLE {mutuelleData && <span className="text-xs font-normal ml-2" style={{ color: "#22c55e" }}>✓ Pré-remplie</span>}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Mutuelle" value={form.mutuelle} onChange={(v) => setField("mutuelle", v)} placeholder="MGEN, Harmonie..." />
                <InputField label="N° Adhérent" value={form.numAdherent} onChange={(v) => setField("numAdherent", v)} placeholder="123456789" />
              </div>
              <div className="mt-3">
                <label className={labelClass} style={{ color: "#9B96DA" }}>Niveau de garantie</label>
                <select value={form.niveauGarantie} onChange={(e) => setField("niveauGarantie", e.target.value)}
                  className={inputClass} style={{ ...inputStyle, appearance: "none" } as React.CSSProperties}>
                  {NIVEAUX.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="rounded-3xl p-5" style={cardStyle}>
              <h3 className="text-xs font-black mb-4 tracking-wider" style={{ color: "#9B96DA" }}>CONSENTEMENTS RGPD</h3>
              {[
                { key: "consentementRgpd", label: "J'accepte la collecte et l'utilisation de mes données pour la gestion de mon dossier optique *", required: true },
                { key: "consentementRelance", label: "J'accepte de recevoir des communications commerciales (relances, promotions)" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 mb-3 cursor-pointer">
                  <div onClick={() => setField(key, !(form as Record<string, unknown>)[key])}
                    className="mt-0.5 w-6 h-6 rounded-lg shrink-0 flex items-center justify-center"
                    style={{
                      background: (form as Record<string, unknown>)[key] ? "linear-gradient(135deg,#5331D0,#9B96DA)" : "rgba(83,49,208,0.15)",
                      border: "2px solid " + ((form as Record<string, unknown>)[key] ? "#5331D0" : "rgba(83,49,208,0.35)"),
                    }}>
                    {(form as Record<string, unknown>)[key] && <span className="text-white text-sm font-bold">✓</span>}
                  </div>
                  <span className="text-sm" style={{ color: "#9B96DA" }}>{label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div className="flex gap-3 pb-6">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep("scan")}
                className="flex-1 py-4 rounded-2xl font-medium" style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA" }}>
                ← Retour
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave}
                disabled={!form.nom || !form.prenom || !form.consentementRgpd}
                className="py-4 rounded-2xl text-white font-bold text-base"
                style={{
                  flex: 2,
                  background: !form.nom || !form.prenom || !form.consentementRgpd ? "rgba(155,150,218,0.4)" : "linear-gradient(135deg,#5331D0,#9B96DA)",
                  boxShadow: !form.nom || !form.prenom || !form.consentementRgpd ? "none" : "0 4px 20px rgba(83,49,208,0.4)",
                }}>
                Enregistrer et scanner →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── SAVING ── */}
        {step === "saving" && (
          <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto rounded-3xl p-10 text-center" style={cardStyle}>
            <svg className="animate-spin mx-auto mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#9B96DA" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            <p className="text-lg font-bold" style={{ color: "#FDFDFE" }}>Enregistrement en cours...</p>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto rounded-3xl p-10 text-center" style={cardStyle}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg,#5331D0,#9B96DA)" }}>
              <span className="text-3xl">✓</span>
            </motion.div>
            <p className="text-2xl font-black mb-2" style={{ color: "#FDFDFE" }}>
              {clientFound ? "Client mis à jour !" : "Client enregistré !"}
            </p>
            <p className="text-base" style={{ color: "#9B96DA" }}>
              {form.prenom} {form.nom} · Redirection vers le scanner...
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

