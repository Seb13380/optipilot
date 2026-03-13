"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface MutuelleData {
  nom?: string | null;
  prenom?: string | null;
  numAdherent?: string | null;
  mutuelle?: string | null;
  niveauGarantie?: string | null;
  dateValidite?: string | null;
  organisme?: string | null;
}

type Step = "camera" | "preview" | "result";

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

  function frameDiff(a: ImageData, b: ImageData): number {
    let total = 0;
    const len = a.data.length;
    for (let i = 0; i < len; i += 16) total += Math.abs(a.data[i] - b.data[i]);
    return total / (len / 16);
  }

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraStarted(true);
          setTimeout(startStabilityLoop, 800);
        };
      }
    } catch {
      setCameraStarted(false);
    }
  }, [startStabilityLoop]);

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
    setTimeout(() => router.push("/client"), 1200);
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
          <p className="text-lg font-bold" style={{ color: "#FDFDFE" }}>Scanner ma mutuelle</p>
          <p className="text-sm" style={{ color: "#9B96DA" }}>Photographiez votre carte de tiers payant</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Étape 1 : Caméra */}
        {step === "camera" && (
          <div className="flex-1 flex flex-col">
            {!cameraStarted ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
                <div className="rounded-2xl p-6" style={{ background: "rgba(83,49,208,0.18)", border: "1.5px solid rgba(83,49,208,0.4)" }}>
                  <svg width="56" height="56" fill="none" viewBox="0 0 24 24" style={{ color: "#7B5CE5", margin: "0 auto 12px" }}>
                    <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
                    <path d="M6 15h4M14 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <p className="text-center text-base font-semibold" style={{ color: "#FDFDFE" }}>
                    Préparez votre carte mutuelle
                  </p>
                  <p className="text-center text-sm mt-2" style={{ color: "#9B96DA" }}>
                    Posez-la sur une surface bien éclairée,<br />face visible.
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={startCamera}
                  className="px-8 py-4 rounded-2xl text-lg font-bold w-full max-w-xs"
                  style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 100%)", color: "white" }}
                >
                  Activer la caméra
                </motion.button>
              </div>
            ) : (
              <div className="relative flex-1">
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
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Étape 2 : Aperçu */}
        {step === "preview" && (
          <div className="flex-1 flex flex-col items-center gap-5 px-6 py-6">
            <p className="text-lg font-bold" style={{ color: "#DDDAF5" }}>Photo prise — bonne qualité ?</p>
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Carte mutuelle"
                className="rounded-2xl shadow-xl w-full max-w-sm object-contain"
                style={{ maxHeight: 260, background: "#0A0338" }}
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
                style={{ background: "rgba(83,49,208,0.2)", color: "#C4C1EA", border: "1px solid rgba(83,49,208,0.4)" }}
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
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{ background: "rgba(8,2,40,0.96)", border: "1px solid rgba(83,49,208,0.45)" }}
                >
                  <p className="text-base font-bold mb-1" style={{ color: "#FDFDFE" }}>Informations détectées</p>
                  {[
                    { label: "Nom", value: mutuelle.nom },
                    { label: "Prénom", value: mutuelle.prenom },
                    { label: "N° adhérent", value: mutuelle.numAdherent },
                    { label: "Mutuelle", value: mutuelle.mutuelle },
                    { label: "Niveau de garantie", value: mutuelle.niveauGarantie },
                    { label: "Validité", value: mutuelle.dateValidite },
                    { label: "Organisme", value: mutuelle.organisme },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid rgba(83,49,208,0.2)" }}>
                        <span className="text-sm" style={{ color: "#9B96DA" }}>{label}</span>
                        <span className="text-sm font-semibold" style={{ color: "#DDDAF5" }}>{value}</span>
                      </div>
                    ) : null
                  )}
                </div>

                <p className="text-sm text-center px-4" style={{ color: "#9B96DA" }}>
                  Votre opticien vérifiera ces données avant de contacter votre mutuelle.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { setStep("camera"); startCamera(); }}
                    className="py-3.5 rounded-2xl font-semibold text-base"
                    style={{ background: "rgba(83,49,208,0.2)", color: "#C4C1EA", border: "1px solid rgba(83,49,208,0.4)" }}
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
      </div>
    </div>
  );
}
