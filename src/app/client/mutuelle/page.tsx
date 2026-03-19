"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface MutuelleData {
  nom?: string | null;
  prenom?: string | null;
  numAdherent?: string | null;
  numSecu?: string | null;
  numAmc?: string | null;
  dateNaissance?: string | null;
  adresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  mutuelle?: string | null;
  niveauGarantie?: string | null;
  dateValidite?: string | null;
  organisme?: string | null;
}

interface BridgeClient {
  id: number;
  civilite?: string;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  mutuelle?: string;
}

type Step = "camera" | "preview" | "result" | "lookup" | "create";

const STABILITY_THRESHOLD = 8;
const STABLE_FRAMES_NEEDED = 10;

export default function ClientMutuellePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const stableCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("camera");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [mutuelle, setMutuelle] = useState<MutuelleData>({});
  const [scanError, setScanError] = useState("");
  const [stableProgress, setStableProgress] = useState(0);
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<BridgeClient[]>([]);
  const [lookupError, setLookupError] = useState("");
  const [clientForm, setClientForm] = useState({ telephone: "", email: "", adresse: "", codePostal: "", ville: "" });
  const [createLoading, setCreateLoading] = useState(false);

  function frameDiff(a: ImageData, b: ImageData): number {
    let total = 0;
    const len = a.data.length;
    for (let i = 0; i < len; i += 16) total += Math.abs(a.data[i] - b.data[i]);
    return total / (len / 16);
  }

  function isBlackFrame(frame: ImageData): boolean {
    let total = 0;
    for (let i = 0; i < frame.data.length; i += 16) total += frame.data[i];
    return (total / (frame.data.length / 16)) < 10;
  }

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || video.readyState < 4) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    const scale = w < 1600 ? 2 : 1;
    const tmp = document.createElement("canvas");
    tmp.width = w * scale; tmp.height = h * scale;
    const tCtx = tmp.getContext("2d")!;
    tCtx.filter = "contrast(140%) brightness(104%)";
    tCtx.drawImage(canvas, 0, 0, w * scale, h * scale);
    tCtx.filter = "none";
    const dataUrl = tmp.toDataURL("image/jpeg", 0.96);
    setImageDataUrl(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("preview");
  }, []);

  const startStabilityLoop = useCallback(() => {
    const mini = document.createElement("canvas");
    mini.width = 80; mini.height = 60;
    const ctx = mini.getContext("2d");
    if (!ctx) return;
    stableCountRef.current = 0;
    setStableProgress(0);
    timerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      ctx.drawImage(video, 0, 0, 80, 60);
      const frame = ctx.getImageData(0, 0, 80, 60);
      if (isBlackFrame(frame)) {
        prevFrameRef.current = null;
        stableCountRef.current = 0;
        setStableProgress(0);
        return;
      }
      if (prevFrameRef.current) {
        const diff = frameDiff(prevFrameRef.current, frame);
        if (diff < STABILITY_THRESHOLD) {
          stableCountRef.current += 1;
          setStableProgress(Math.round((stableCountRef.current / STABLE_FRAMES_NEEDED) * 100));
          if (stableCountRef.current >= STABLE_FRAMES_NEEDED) {
            if (timerRef.current) clearInterval(timerRef.current);
            setAutoCapturing(true);
            setTimeout(() => { captureFrame(); setAutoCapturing(false); }, 300);
          }
        } else {
          stableCountRef.current = 0;
          setStableProgress(0);
        }
      }
      prevFrameRef.current = frame;
    }, 100);
  }, [captureFrame]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      // "ideal" = essaie caméra arrière, se rabat sur n'importe quelle caméra sans erreur
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      // Attacher au <video> dès qu'il est disponible
      const attach = (video: HTMLVideoElement) => {
        video.srcObject = stream;
        video.play().catch(() => {});
        setCameraStarted(true);
        setTimeout(startStabilityLoop, 800);
      };
      // videoRef est toujours monté (video toujours dans le DOM)
      if (videoRef.current) {
        attach(videoRef.current);
      }
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez que vous avez autorisé l'accès dans votre navigateur.");
    }
  }, [startStabilityLoop]);

  // Auto-démarrage de la caméra à l'ouverture de la page
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function analyseMutuelle() {
    setScanning(true);
    setScanError("");
    setStep("result");
    try {
      const res = await fetch("/api/scan-mutuelle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || "Erreur lors de l'analyse.");
      } else if (data.mutuelle) {
        setMutuelle(data.mutuelle);
      }
    } catch {
      setScanError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setScanning(false);
    }
  }

  function confirmer() {
    localStorage.setItem("optipilot_mutuelle", JSON.stringify(mutuelle));
    setConfirmed(true);
    setTimeout(async () => {
      setStep("lookup");
      setLookupLoading(true);
      setLookupError("");
      try {
        const ord = JSON.parse(localStorage.getItem("optipilot_ordonnance") || "{}");
        const q = mutuelle.nom || ord?.patient?.nom || "";
        if (!q) { setLookupLoading(false); setStep("create"); return; }
        const res = await fetch(`/api/bridge/clients?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.ok && data.clients?.length > 0) {
          setLookupResults(data.clients);
        } else {
          setStep("create");
        }
      } catch {
        setLookupError("Bridge non disponible.");
        setStep("create");
      } finally {
        setLookupLoading(false);
      }
    }, 800);
  }

  async function createClient() {
    setCreateLoading(true);
    const ord = JSON.parse(localStorage.getItem("optipilot_ordonnance") || "{}");
    const payload = {
      nom: mutuelle.nom || ord?.patient?.nom || "",
      prenom: mutuelle.prenom || ord?.patient?.prenom || "",
      telephone: clientForm.telephone,
      email: clientForm.email,
      adresse: clientForm.adresse ? `${clientForm.adresse}${clientForm.codePostal ? `, ${clientForm.codePostal}` : ""}${clientForm.ville ? ` ${clientForm.ville}` : ""}` : "",
      mutuelle: mutuelle.mutuelle,
      numeroMutuelle: mutuelle.numAdherent,
    };
    try {
      const res = await fetch("/api/bridge/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem("optipilot_client", JSON.stringify({ ...payload, id: data.id }));
      }
    } catch {
      // bridge indisponible — on continue quand même
    } finally {
      setCreateLoading(false);
      router.push("/questionnaire");
    }
  }

  function selectClient(client: BridgeClient) {
    localStorage.setItem("optipilot_client", JSON.stringify(client));
    router.push("/questionnaire");
  }

  return (
    <div className="page-bg min-h-screen flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(83,49,208,0.3)" }}
      >
        <button
          onClick={() => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (timerRef.current) clearInterval(timerRef.current);
            router.push("/client");
          }}
          className="p-2 rounded-xl"
          style={{ background: "rgba(83,49,208,0.2)", color: "#C4C1EA" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <p className="text-lg font-bold" style={{ color: "#111827" }}>Scanner ma mutuelle</p>
          <p className="text-sm" style={{ color: "#6b7280" }}>Photographiez votre carte de tiers payant</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Étape 1 : Caméra */}
        {step === "camera" && (
          <div className="flex-1 flex flex-col">
            {!cameraStarted && (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
                {cameraError ? (
                  <div className="rounded-2xl p-5 max-w-xs w-full text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.4)" }}>
                    <p className="text-base font-semibold mb-2" style={{ color: "#ef4444" }}>Caméra inaccessible</p>
                    <p className="text-sm mb-4" style={{ color: "#374151" }}>{cameraError}</p>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={startCamera}
                      className="px-6 py-3 rounded-2xl font-bold w-full"
                      style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)", color: "white" }}
                    >
                      Réessayer
                    </motion.button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl p-6" style={{ background: "rgba(83,49,208,0.18)", border: "1.5px solid rgba(83,49,208,0.4)" }}>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className="w-12 h-12 rounded-full border-4 mx-auto mb-4"
                        style={{ borderColor: "#5331D0", borderTopColor: "transparent" }}
                      />
                      <p className="text-center text-base font-semibold" style={{ color: "#111827" }}>
                        Activation de la caméra…
                      </p>
                      <p className="text-center text-sm mt-2" style={{ color: "#6b7280" }}>
                        Posez votre carte mutuelle sur une surface éclairée.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={startCamera}
                      className="px-8 py-3 rounded-2xl text-base font-semibold w-full max-w-xs"
                      style={{ background: "rgba(83,49,208,0.15)", color: "#5331D0", border: "1px solid rgba(83,49,208,0.35)" }}
                    >
                      Activer manuellement
                    </motion.button>
                  </>
                )}
              </div>
            )}
            {/* Vidéo toujours dans le DOM — videoRef jamais null au démarrage */}
            <div className="relative flex-1" style={{ display: cameraStarted ? "flex" : "none", flexDirection: "column" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ maxHeight: "65vh" }}
              />
              {/* Cadre carte horizontale */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="border-4 rounded-xl"
                  style={{
                    width: "80%",
                    maxWidth: 480,
                    aspectRatio: "1.586",
                    borderColor: autoCapturing ? "#22c55e" : `rgba(255,255,255,${0.4 + stableProgress * 0.006})`,
                    boxShadow: autoCapturing ? "0 0 24px rgba(34,197,94,0.6)" : "0 0 20px rgba(0,0,0,0.5)",
                    transition: "border-color 0.2s",
                  }}
                />
              </div>
              {/* Barre de stabilité */}
              <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 px-10">
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {autoCapturing ? "Capture en cours…" : stableProgress > 0 ? "Maintenez stable…" : "Cadrez votre carte mutuelle"}
                </p>
                <div className="w-full max-w-xs rounded-full h-2" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <motion.div
                    animate={{ width: `${stableProgress}%`, background: stableProgress === 100 ? "#22c55e" : "#5331D0" }}
                    transition={{ duration: 0.1 }}
                    className="h-2 rounded-full"
                  />
                </div>
              </div>
              {/* Bouton photo manuel */}
              <button
                onClick={captureFrame}
                className="absolute top-4 right-4 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(8px)" }}
              >
                Photo
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Étape 2 : Aperçu */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col items-center gap-5 px-6 py-6">
            <p className="text-lg font-bold" style={{ color: "#111827" }}>Photo prise — bonne qualité ?</p>
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Carte mutuelle"
                className="rounded-2xl shadow-xl w-full max-w-sm object-contain"
                style={{ maxHeight: 260, background: "#ffffff" }}
              />
            )}
            <p className="text-sm text-center px-4" style={{ color: "#9B96DA" }}>
              Vérifiez que le texte est net et lisible, sans reflets.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setImageDataUrl("");
                  setStep("camera");
                  startCamera();
                }}
                className="py-3.5 rounded-2xl font-semibold text-base"
                style={{ background: "rgba(83,49,208,0.55)", color: "white", border: "1px solid rgba(83,49,208,0.6)" }}
              >
                Reprendre
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={analyseMutuelle}
                className="py-3.5 rounded-2xl font-bold text-base"
                style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)", color: "white" }}
              >
                Analyser
              </motion.button>
            </div>
          </div>
        )}

        {/* Étape 3 : Résultat */}
        {step === "result" && (
          <div className="flex-1 flex flex-col px-6 py-6 gap-4">
            {scanning ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-12 h-12 rounded-full border-4"
                  style={{ borderColor: "#5331D0", borderTopColor: "transparent" }}
                />
                <p className="text-base font-semibold" style={{ color: "#9B96DA" }}>Analyse de la carte…</p>
              </div>
            ) : scanError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <p className="text-center text-base" style={{ color: "#f87171" }}>{scanError}</p>
                <button
                  onClick={() => { setStep("camera"); startCamera(); }}
                  className="px-6 py-3 rounded-2xl font-semibold"
                  style={{ background: "rgba(83,49,208,0.3)", color: "#C4C1EA" }}
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {confirmed && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl px-5 py-4 flex items-center gap-3"
                      style={{ background: "rgba(83,49,208,0.25)", border: "1.5px solid rgba(155,150,218,0.4)" }}
                    >
                      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" stroke="#9B96DA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="font-semibold" style={{ color: "#DDDAF5" }}>Informations enregistrées !</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(83,49,208,0.45)" }}
                >
                  <div className="px-4 py-2.5" style={{ background: "rgba(8,2,40,0.98)" }}>
                    <p className="text-sm font-bold" style={{ color: "#FDFDFE" }}>Informations détectées</p>
                  </div>
                  {[
                    { label: "Nom", value: mutuelle.nom },
                    { label: "Prénom", value: mutuelle.prenom },
                    { label: "Date de naissance", value: mutuelle.dateNaissance },
                    { label: "N° sécurité sociale (NNI)", value: mutuelle.numSecu },
                    { label: "N° adhérent", value: mutuelle.numAdherent },
                    { label: "N° AMC", value: mutuelle.numAmc },
                    { label: "Adresse", value: mutuelle.adresse },
                    { label: "Code postal", value: mutuelle.codePostal },
                    { label: "Ville", value: mutuelle.ville },
                    { label: "Mutuelle", value: mutuelle.mutuelle },
                    { label: "Niveau de garantie", value: mutuelle.niveauGarantie },
                    { label: "Validité", value: mutuelle.dateValidite },
                    { label: "Organisme", value: mutuelle.organisme },
                  ]
                    .filter(({ value }) => value)
                    .map(({ label, value }, idx) => (
                      <div
                        key={label}
                        className="flex items-center px-3 py-1.5 gap-1"
                        style={{ background: idx % 2 === 0 ? "rgba(8,2,40,0.92)" : "rgba(22,8,65,0.92)" }}
                      >
                        <span className="text-sm font-medium text-center" style={{ color: "#9B96DA", flex: 1 }}>{label}</span>
                        <span className="w-px self-stretch" style={{ background: "rgba(83,49,208,0.25)" }} />
                        <span className="text-sm font-bold text-center" style={{ color: "#DDDAF5", flex: 1 }}>{value}</span>
                      </div>
                    ))
                  }
                </div>

                <p className="text-sm text-center px-4" style={{ color: "#9B96DA" }}>
                  Votre opticien vérifiera ces données avant de contacter votre mutuelle.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setStep("camera"); startCamera(); }}
                    className="py-3.5 rounded-2xl font-semibold text-base"
                    style={{ background: "rgba(83,49,208,0.55)", color: "white", border: "1px solid rgba(83,49,208,0.6)" }}
                  >
                    Rescanner
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={confirmer}
                    className="py-3.5 rounded-2xl font-bold text-base"
                    style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)", color: "white" }}
                  >
                    Confirmer
                  </motion.button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Étape 4 : Recherche bridge */}
        {step === "lookup" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">
            {lookupLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-12 h-12 rounded-full border-4"
                  style={{ borderColor: "#5331D0", borderTopColor: "transparent" }}
                />
                <p className="text-base font-semibold" style={{ color: "#374151" }}>Recherche dans Optimum…</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-center" style={{ color: "#111827" }}>Client trouvé dans Optimum</p>
                {lookupError && <p className="text-sm text-center" style={{ color: "#ef4444" }}>{lookupError}</p>}
                <div className="w-full flex flex-col gap-3">
                  {lookupResults.map((c) => (
                    <motion.button
                      key={c.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectClient(c)}
                      className="w-full rounded-2xl p-4 text-left flex items-center justify-between"
                      style={{ background: "rgba(83,49,208,0.08)", border: "1.5px solid rgba(83,49,208,0.35)" }}
                    >
                      <div>
                        <p className="font-bold" style={{ color: "#111827" }}>{c.prenom} {c.nom}</p>
                        {c.telephone && <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{c.telephone}</p>}
                        {c.email && <p className="text-sm" style={{ color: "#6b7280" }}>{c.email}</p>}
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#5331D0", flexShrink: 0 }}>
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("create")}
                  className="w-full py-3 rounded-2xl font-semibold text-base mt-1"
                  style={{ background: "rgba(83,49,208,0.12)", color: "#5331D0", border: "1px solid rgba(83,49,208,0.3)" }}
                >
                  Ce n&apos;est pas moi → Nouveau client
                </motion.button>
              </>
            )}
          </div>
        )}

        {/* Étape 5 : Créer le client */}
        {step === "create" && (
          <div className="flex-1 flex flex-col px-6 py-6 gap-5 overflow-y-auto">
            <div>
              <p className="text-xl font-bold" style={{ color: "#111827" }}>Vos coordonnées</p>
              <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Pour que votre opticien puisse vous recontacter.</p>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { key: "telephone" as const, label: "Téléphone", type: "tel", placeholder: "06 xx xx xx xx" },
                { key: "email" as const, label: "E-mail", type: "email", placeholder: "prenom@exemple.fr" },
                { key: "adresse" as const, label: "Adresse", type: "text", placeholder: "15 rue des Lilas" },
                { key: "codePostal" as const, label: "Code postal", type: "text", placeholder: "13000" },
                { key: "ville" as const, label: "Ville", type: "text", placeholder: "Marseille" },
              ].map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }}>{label}</label>
                  <input
                    type={type}
                    value={clientForm[key]}
                    onChange={(e) => setClientForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-2xl text-base outline-none"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1.5px solid rgba(83,49,208,0.3)",
                      color: "#111827",
                    }}
                  />
                </div>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={createClient}
              disabled={createLoading}
              className="py-4 rounded-2xl font-bold text-lg mt-2"
              style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)", color: "white", opacity: createLoading ? 0.7 : 1 }}
            >
              {createLoading ? "Enregistrement…" : "Terminer"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/questionnaire")}
              className="py-3 rounded-2xl font-semibold text-base"
              style={{ background: "transparent", color: "#6b7280" }}
            >
              Passer cette étape
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
