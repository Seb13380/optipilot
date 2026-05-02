"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import { analyserOrdonnance } from "@/lib/analyseOrdonnance";
import { useApp } from "@/lib/AppContext";

interface OrdonnanceData {
  civilite?: string;
  nomPatient?: string;
  prenomPatient?: string;
  odSphere?: string;
  odCylindre?: string;
  odAxe?: string;
  odAddition?: string;
  ogSphere?: string;
  ogCylindre?: string;
  ogAxe?: string;
  ogAddition?: string;
  ecartPupillaire?: string;
  prescripteur?: string;
  dateOrdonnance?: string;
}

type Step = "camera" | "preview" | "result";

// Seuil de stabilité : différence moyenne de pixels entre 2 frames
const STABILITY_THRESHOLD = 8;
const STABLE_FRAMES_NEEDED = 12; // ~1.2s à 10fps

export default function ScannerPage() {
  const router = useRouter();
  const { t } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const stableCountRef = useRef(0);
  const autoScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("camera");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [ordonnance, setOrdonnance] = useState<OrdonnanceData>({});
  const [cameraStarted, setCameraStarted] = useState(false);
  const [videoRotation, setVideoRotation] = useState(0); // 0 ou 90 — correction rotation iOS
  const videoRotationRef = useRef(0);
  const [scanError, setScanError] = useState("");
  const [stableProgress, setStableProgress] = useState(0); // 0-100
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [magasinNom, setMagasinNom] = useState("");
  const [champsIncertains, setChampsIncertains] = useState<string[]>([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
    if (user.magasinNom) setMagasinNom(user.magasinNom);
  }, []);

  // Synchronise la ref (accessible dans les callbacks)
  useEffect(() => { videoRotationRef.current = videoRotation; }, [videoRotation]);

  // Détection rotation iOS : flux paysage sur écran portrait
  useEffect(() => {
    if (!cameraStarted) return;
    const timer = setTimeout(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      const isLandscapeStream = video.videoWidth > video.videoHeight * 1.3;
      const isPortraitDevice = window.innerWidth < window.innerHeight;
      const rot = isLandscapeStream && isPortraitDevice ? 90 : 0;
      setVideoRotation(rot);
      videoRotationRef.current = rot;
    }, 600);
    return () => clearTimeout(timer);
  }, [cameraStarted]);

  // Calcul de la différence entre deux frames
  function frameDiff(a: ImageData, b: ImageData): number {
    let total = 0;
    const len = a.data.length;
    for (let i = 0; i < len; i += 16) {
      total += Math.abs(a.data[i] - b.data[i]);
    }
    return total / (len / 16);
  }

  const captureAndAnalyse = useCallback((force = false) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || video.videoWidth === 0) return;
    if (video.readyState < 4) return;

    const w = video.videoWidth;
    const h = video.videoHeight || 720;
    const needsRotation = videoRotationRef.current !== 0;

    let outW: number, outH: number;
    if (needsRotation) {
      outW = h; outH = w;
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(video, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      outW = w; outH = h;
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, w, h);
    }

    // Vérifier que le contenu capturé n'est pas noir
    if (!force) {
      const sampleCtx = canvas.getContext("2d")!;
      const sample = sampleCtx.getImageData(0, 0, Math.min(outW, 80), Math.min(outH, 60));
      let bright = 0;
      for (let i = 0; i < sample.data.length; i += 4) bright += sample.data[i];
      if ((bright / (sample.data.length / 4)) < 12) {
        stableCountRef.current = 0;
        setStableProgress(0);
        prevFrameRef.current = null;
        setAutoCapturing(false);
        setTimeout(startStabilityLoop, 1000);
        return;
      }
    }

    const scale = outW < 1600 ? 2 : 1;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = outW * scale;
    tmpCanvas.height = outH * scale;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.filter = "contrast(160%) brightness(102%) saturate(70%)";
    tmpCtx.drawImage(canvas, 0, 0, outW * scale, outH * scale);
    tmpCtx.filter = "none";

    const dataUrl = tmpCanvas.toDataURL("image/jpeg", 0.98);
    setImageDataUrl(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    setStep("preview");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boucle de détection de stabilité
  const startStabilityLoop = useCallback(() => {
    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = 80;
    miniCanvas.height = 60;
    const ctx = miniCanvas.getContext("2d");
    if (!ctx) return;

    stableCountRef.current = 0;
    setStableProgress(0);

    autoScanTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 4) return;

      ctx.drawImage(video, 0, 0, 80, 60);
      const frame = ctx.getImageData(0, 0, 80, 60);

      if (prevFrameRef.current) {
        const diff = frameDiff(prevFrameRef.current, frame);
        if (diff < STABILITY_THRESHOLD) {
          stableCountRef.current += 1;
          setStableProgress(Math.round((stableCountRef.current / STABLE_FRAMES_NEEDED) * 100));
          if (stableCountRef.current >= STABLE_FRAMES_NEEDED) {
            if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
            setAutoCapturing(true);
            setTimeout(() => {
              captureAndAnalyse();
              setAutoCapturing(false);
            }, 300);
          }
        } else {
          stableCountRef.current = 0;
          setStableProgress(0);
        }
      }
      prevFrameRef.current = frame;
    }, 100);
  }, [captureAndAnalyse]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      const attach = (video: HTMLVideoElement) => {
        video.srcObject = stream;
        video.play().catch(() => {});
        setCameraStarted(true);
        setTimeout(startStabilityLoop, 800);
      };
      if (videoRef.current) {
        attach(videoRef.current);
      } else {
        setTimeout(() => { if (videoRef.current) attach(videoRef.current!); }, 150);
      }
    } catch {
      setCameraStarted(false);
    }
  }, [startStabilityLoop]);

  // Auto-démarrage caméra
  useEffect(() => { startCamera(); }, [startCamera]);

  // Nettoyage à la sortie de la page
  useEffect(() => {
    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function analyseOrdonnance() {
    setScanning(true);
    setScanError("");
    setStep("result");
    try {
      const res = await fetch("/api/scan-ordonnance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error || "Erreur lors de l'analyse. Reprenez la photo.");
        setOrdonnance({});
      } else if (data.ordonnance) {
        setOrdonnance(data.ordonnance);
        setChampsIncertains(data.champsIncertains || []);
      }
    } catch {
      setScanError("Erreur réseau. Vérifiez votre connexion.");
      setOrdonnance({});
    } finally {
      setScanning(false);
    }
  }

  async function confirmerOrdonnance() {
    localStorage.setItem("optipilot_ordonnance", JSON.stringify(ordonnance));
    try {
      const client = JSON.parse(localStorage.getItem("optipilot_client") || "{}");
      if (client.id) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/ordonnances`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("optipilot_token") || ""}`,
          },
          body: JSON.stringify({
            clientId: client.id,
            dateOrdonnance: ordonnance.dateOrdonnance ? new Date(ordonnance.dateOrdonnance).toISOString() : null,
            validiteMois: 36,
            odSphere: ordonnance.odSphere ? parseFloat(ordonnance.odSphere) : null,
            odCylindre: ordonnance.odCylindre ? parseFloat(ordonnance.odCylindre) : null,
            odAxe: ordonnance.odAxe ? parseInt(ordonnance.odAxe) : null,
            odAddition: ordonnance.odAddition ? parseFloat(ordonnance.odAddition) : null,
            ogSphere: ordonnance.ogSphere ? parseFloat(ordonnance.ogSphere) : null,
            ogCylindre: ordonnance.ogCylindre ? parseFloat(ordonnance.ogCylindre) : null,
            ogAxe: ordonnance.ogAxe ? parseInt(ordonnance.ogAxe) : null,
            ogAddition: ordonnance.ogAddition ? parseFloat(ordonnance.ogAddition) : null,
            prescripteur: ordonnance.prescripteur || null,
          }),
        });
        const ordo = await res.json();
        if (res.ok) localStorage.setItem("optipilot_ordonnance_db", JSON.stringify(ordo));
      }
    } catch { /* Continue sans backend */ }
    router.push("/client/mutuelle");
  }

  function resetCamera() {
    if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStep("camera");
    setCameraStarted(false);
    setImageDataUrl("");
    setStableProgress(0);
    stableCountRef.current = 0;
    prevFrameRef.current = null;
  }

  function normaliseCivilite(c?: string): string {
    if (!c) return "";
    const t = c.trim();
    if (/^madame$/i.test(t)) return "Mme";
    if (/^monsieur$/i.test(t)) return "M.";
    return t;
  }

  return (
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader title={t.scanTitle} showBack onBack={() => router.push("/dashboard")} />

      <main className="flex-1 flex flex-col px-5 pt-5 pb-8 w-full">
        <AnimatePresence mode="wait">

          {/* ── ÉTAPE 1 : CAMÉRA ── */}
          {step === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">

              {/* Conseils de scan */}
              <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(83,49,208,0.25)", backdropFilter: "blur(6px)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10" stroke="#9B96DA" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#5331D0" }}>{t.scanTips}</p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: "#6b7280" }}>
                    {t.scanTipsBody}
                  </p>
                </div>
              </div>

              {/* Viewfinder */}
              <div
                className="rounded-2xl overflow-hidden relative shadow-lg"
                style={{
                  background: "#000",
                  minHeight: videoRotation !== 0 ? "75vw" : 300,
                  height: videoRotation !== 0 ? "75vw" : undefined,
                }}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={videoRotation !== 0 ? {
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "75vw",
                    height: "100vw",
                    transform: "translate(-50%, -50%) rotate(90deg)",
                    objectFit: "cover",
                    display: cameraStarted ? "block" : "none",
                  } : {
                    width: "100%",
                    objectFit: "cover",
                    minHeight: 300,
                    display: cameraStarted ? "block" : "none",
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Cadre de guidage bien visible */}
                {cameraStarted && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Coins du cadre */}
                    <div className="relative" style={{ width: "84%", height: "65%" }}>
                      {/* coin haut-gauche */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: autoCapturing ? "#22c55e" : stableProgress > 50 ? "#facc15" : "#fff" }} />
                      {/* coin haut-droit */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: autoCapturing ? "#22c55e" : stableProgress > 50 ? "#facc15" : "#fff" }} />
                      {/* coin bas-gauche */}
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: autoCapturing ? "#22c55e" : stableProgress > 50 ? "#facc15" : "#fff" }} />
                      {/* coin bas-droit */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: autoCapturing ? "#22c55e" : stableProgress > 50 ? "#facc15" : "#fff" }} />
                    </div>
                  </div>
                )}

                {/* Message d'état en overlay */}
                {cameraStarted && (
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-6" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
                    {autoCapturing ? (
                      <p className="text-center font-bold text-xl" style={{ color: "#22c55e" }}>{t.captureInProgress}</p>
                    ) : stableProgress > 0 ? (
                      <>
                        <p className="text-center font-bold text-lg text-white mb-2">{t.holdStill}</p>
                        <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${stableProgress}%`, background: stableProgress > 70 ? "#22c55e" : "#facc15" }} />
                        </div>
                      </>
                    ) : (
                      <p className="text-center font-bold text-xl text-white">{t.placeInFrame}</p>
                    )}
                  </div>
                )}

                {/* Écran avant démarrage caméra */}
                {!cameraStarted && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(83,49,208,0.3)" }}>
                      <svg width="44" height="44" fill="none" viewBox="0 0 24 24">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5" />
                      </svg>
                    </div>
                    <p className="text-white font-bold text-2xl text-center">{t.cameraTitle}</p>
                    <p className="font-semibold text-lg text-center" style={{ color: "#9B96DA" }}>{t.autoCapture}</p>
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div className="flex flex-col gap-4">
                {!cameraStarted ? (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={startCamera}
                    className="py-5 rounded-2xl text-white font-bold text-xl"
                    style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                    {t.enableCamera}
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => captureAndAnalyse(true)}
                    className="py-4 rounded-2xl font-bold text-lg"
                    style={{ background: "rgba(83,49,208,0.15)", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.4)" }}>
                    {t.captureManually}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ÉTAPE 2 : APERÇU ── */}
          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <p className="text-center font-bold text-xl" style={{ color: "#111827" }}>{t.checkPhoto}</p>
              <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "#f3f4f6", minHeight: 280, border: "1.5px solid #e5e7eb" }}>
                {imageDataUrl ? (
                  <img src={imageDataUrl} alt="Ordonnance" className="w-full object-contain" style={{ maxHeight: 400 }} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 gap-3" style={{ minHeight: 280 }}>
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" style={{ color: "#9ca3af" }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="8" cy="14" r="1.5" fill="currentColor"/>
                    </svg>
                    <p className="font-bold text-base" style={{ color: "#9ca3af" }}>{t.noCapture}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={resetCamera}
                  className="flex-1 py-5 rounded-2xl font-bold text-lg"
                  style={{ background: "#0A0338", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.35)" }}>
                  {t.retake}
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={analyseOrdonnance}
                  className="flex-1 py-5 rounded-2xl text-white font-bold text-lg"
                  style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                  {t.analyze}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── ÉTAPE 3 : RÉSULTAT ── */}
          {step === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              {scanning ? (
                <div className="flex flex-col items-center justify-center gap-6 py-20">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}>
                    <svg className="animate-spin" width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold text-white">{t.analyzingPrescription}</p>
                  <p className="text-lg" style={{ color: "#9B96DA" }}>{t.aiReading}</p>
                </div>
              ) : scanError ? (
                <div className="flex flex-col gap-5">
                  <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.4)" }}>
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" className="mx-auto mb-3" style={{ color: "#ef4444" }}>
                      <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                    <p className="font-bold text-xl text-white mb-1">{t.cannotRead}</p>
                    <p className="text-lg" style={{ color: "#fca5a5" }}>{scanError}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={resetCamera}
                    className="py-5 rounded-2xl text-white font-bold text-xl"
                    style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                    {t.retryScan}
                  </motion.button>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl p-5 shadow-sm" style={{ background: "#0A0338" }}>
                    <div className="flex items-center gap-3 mb-5">
                      <span className="px-3 py-1.5 rounded-full font-bold text-base text-white" style={{ background: editMode ? "#ec4899" : "#22c55e" }}>
                      </span>
                      <h2 className="text-xl font-bold" style={{ color: "#FDFDFE" }}>{t.prescriptionResults}</h2>
                    </div>

                    {/* ─── Analyse clinique ─── */}
                    {!editMode && (ordonnance.odSphere || ordonnance.ogSphere) && (() => {
                      const analyse = analyserOrdonnance(ordonnance);
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-4 rounded-2xl p-4"
                          style={{ background: `${analyse.couleur}12`, border: `1.5px solid ${analyse.couleur}45` }}
                        >
                          {/* Titre */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${analyse.couleur}20` }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <circle cx="11" cy="11" r="8" stroke={analyse.couleur} strokeWidth="2"/>
                                <path d="M21 21l-4.35-4.35" stroke={analyse.couleur} strokeWidth="2" strokeLinecap="round"/>
                                <path d="M11 8v6M8 11h6" stroke={analyse.couleur} strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-base font-bold uppercase tracking-wider" style={{ color: analyse.couleur }}>{t.analyzeTitle}</p>
                              <p className="text-2xl font-black" style={{ color: "#FDFDFE" }}>
                                {analyse.typeCorrection}
                                <span className="ml-2 text-lg font-semibold px-3 py-1 rounded-full" style={{ background: `${analyse.couleur}20`, color: analyse.couleur }}>
                                  {analyse.intensiteLabel}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Message naturel */}
                          <p className="text-lg leading-relaxed mb-4" style={{ color: "rgba(253,253,254,0.85)" }}>
                            {analyse.message.split(/\*\*(.+?)\*\*/g).map((part, i) =>
                              i % 2 === 1
                                ? <strong key={i} style={{ color: analyse.couleur }}>{part}</strong>
                                : <span key={i}>{part}</span>
                            )}
                          </p>

                          {/* Détails */}
                          {analyse.details.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              {analyse.details.map((d, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: analyse.couleur }} />
                                  <p className="text-base leading-relaxed" style={{ color: "rgba(155,150,218,0.85)" }}>{d}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Indice + Type verre */}
                          <div className="flex gap-3 mt-3">
                            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "rgba(10,3,56,0.5)", border: "1px solid rgba(83,49,208,0.25)" }}>
                              <p className="text-base font-semibold" style={{ color: "rgba(155,150,218,0.6)" }}>{t.recommendedIndex}</p>
                              <p className="text-lg font-bold mt-1" style={{ color: "#FDFDFE" }}>{analyse.indiceRecommande}</p>
                            </div>
                            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "rgba(10,3,56,0.5)", border: "1px solid rgba(83,49,208,0.25)" }}>
                              <p className="text-base font-semibold" style={{ color: "rgba(155,150,218,0.6)" }}>{t.lensTypeLabel}</p>
                              <p className="text-lg font-bold mt-1" style={{ color: "#FDFDFE" }}>
                                {analyse.typeVerre === "progressif" ? t.progressive : t.unifocal}
                                {analyse.presbytie && <span className="text-base ml-1" style={{ color: analyse.couleur }}>({analyse.presbytie})</span>}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}

                    {/* Bienvenue + édition patient en mode correction */}
                    {editMode ? (
                      <div className="mb-4 rounded-xl p-4 flex flex-col gap-3" style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.3)" }}>
                        <p className="text-sm font-bold" style={{ color: "#f472b6" }}>{t.patientEdit}</p>
                        <div className="flex gap-2">
                          <select value={ordonnance.civilite || ""}
                            onChange={(e) => setOrdonnance((p) => ({ ...p, civilite: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-base font-bold outline-none"
                            style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(236,72,153,0.4)", minWidth: 80 }}>
                            <option value="">—</option>
                            <option value="M.">M.</option>
                            <option value="Mme">Mme</option>
                          </select>
                          <input value={ordonnance.prenomPatient || ""} placeholder="Prénom"
                            onChange={(e) => setOrdonnance((p) => ({ ...p, prenomPatient: e.target.value }))}
                            className="flex-1 px-3 py-2 rounded-lg text-base outline-none"
                            style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(236,72,153,0.4)" }} />
                          <input value={ordonnance.nomPatient || ""} placeholder="NOM"
                            onChange={(e) => setOrdonnance((p) => ({ ...p, nomPatient: e.target.value.toUpperCase() }))}
                            className="flex-1 px-3 py-2 rounded-lg text-base font-bold outline-none uppercase"
                            style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(236,72,153,0.4)" }} />
                        </div>
                      </div>
                    ) : (ordonnance.nomPatient || ordonnance.prenomPatient) && (
                      <div className="mb-4 px-4 py-3 rounded-xl" style={{ background: "rgba(83,49,208,0.15)", border: "1px solid rgba(83,49,208,0.3)" }}>
                        <p className="font-bold text-xl" style={{ color: "#FDFDFE" }}>
                          {normaliseCivilite(ordonnance.civilite)} {[ordonnance.prenomPatient, ordonnance.nomPatient].filter(Boolean).join(" ")}{magasinNom ? `, ${t.welcomeAt} ${magasinNom}` : `, ${t.welcomeExcl}`}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <OrdonnanceSection label={t.rightEye} sphere={ordonnance.odSphere} cylindre={ordonnance.odCylindre} axe={ordonnance.odAxe} addition={ordonnance.odAddition} color="#5331D0"
                        onChange={(field, val) => setOrdonnance((prev) => ({ ...prev, [`od${field.charAt(0).toUpperCase() + field.slice(1)}`]: val }))} />
                      <OrdonnanceSection label={t.leftEye} sphere={ordonnance.ogSphere} cylindre={ordonnance.ogCylindre} axe={ordonnance.ogAxe} addition={ordonnance.ogAddition} color="#5331D0"
                        onChange={(field, val) => setOrdonnance((prev) => ({ ...prev, [`og${field.charAt(0).toUpperCase() + field.slice(1)}`]: val }))} />
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {editMode ? (
                        <>
                          <p className="text-sm font-bold mb-1" style={{ color: "#f472b6" }}>{t.doctorEdit}</p>
                          <input value={ordonnance.prescripteur || ""} placeholder="Dr. Prénom NOM"
                            onChange={(e) => setOrdonnance((p) => ({ ...p, prescripteur: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-base outline-none"
                            style={{ background: "#0A0338", color: "#9B96DA", border: "1px solid rgba(236,72,153,0.4)" }} />
                          <input value={ordonnance.dateOrdonnance || ""} placeholder="AAAA-MM-JJ" type="date"
                            onChange={(e) => setOrdonnance((p) => ({ ...p, dateOrdonnance: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-base outline-none"
                            style={{ background: "#0A0338", color: "rgba(155,150,218,0.8)", border: "1px solid rgba(236,72,153,0.4)" }} />
                          <input value={ordonnance.ecartPupillaire || ""} placeholder="Écart pupillaire (mm)"
                            onChange={(e) => setOrdonnance((p) => ({ ...p, ecartPupillaire: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-base outline-none"
                            style={{ background: "#0A0338", color: "rgba(155,150,218,0.8)", border: "1px solid rgba(236,72,153,0.4)" }} />
                        </>
                      ) : (
                        <>
                          {ordonnance.prescripteur && (
                            <p className="text-lg font-semibold" style={{ color: "#9B96DA" }}>🩺 {ordonnance.prescripteur}</p>
                          )}
                          {ordonnance.dateOrdonnance && (() => {
                            const raw = ordonnance.dateOrdonnance!;
                            let label: string;
                            // ISO YYYY-MM-DD → affichage direct sans décalage fuseau horaire
                            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                              const [y, m, d] = raw.split("-");
                              label = `${d}/${m}/${y}`;
                            } else {
                              const d = new Date(raw);
                              label = isNaN(d.getTime()) ? raw : d.toLocaleDateString("fr-FR", { timeZone: "UTC" });
                            }
                            return <p className="text-lg" style={{ color: "rgba(155,150,218,0.8)" }}>📅 {label}</p>;
                          })()}
                          {ordonnance.ecartPupillaire && (
                            <p className="text-lg" style={{ color: "rgba(155,150,218,0.8)" }}>EP : {ordonnance.ecartPupillaire} mm</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Champs non lus par l'OCR — invite à vérifier */}
                  {!scanning && champsIncertains.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl px-4 py-3"
                      style={{ background: "rgba(155,150,218,0.1)", border: "1px solid rgba(155,150,218,0.35)" }}
                    >
                      <p className="text-sm font-semibold mb-1" style={{ color: "#9B96DA" }}>
                        Vérifiez les champs suivants — non lus sur l'ordonnance :
                      </p>
                      <p className="text-sm" style={{ color: "rgba(155,150,218,0.75)" }}>
                        {champsIncertains.join(" · ")}
                      </p>
                    </motion.div>
                  )}

                  {/* Alerte ordonnance > 3 ans */}
                  {!scanning && ordonnance.dateOrdonnance && (() => {
                    const raw = ordonnance.dateOrdonnance!;
                    const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
                      ? new Date(raw + "T00:00:00")
                      : new Date(raw);
                    const limit = new Date();
                    limit.setFullYear(limit.getFullYear() - 3);
                    if (isNaN(d.getTime()) || d >= limit) return null;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl px-4 py-3"
                        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.4)" }}
                      >
                        <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
                          Ordonnance datée de plus de 3 ans — vérifier la validité avant de continuer
                        </p>
                      </motion.div>
                    );
                  })()}

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <motion.button whileTap={{ scale: 0.97 }} onClick={resetCamera}
                        className="flex-1 py-4 rounded-2xl font-bold text-base"
                        style={{ background: "#0A0338", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.35)" }}>
                        {t.retakePhoto}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditMode((v) => !v)}
                        className="flex-1 py-4 rounded-2xl font-bold text-base"
                        style={{
                          background: editMode ? "rgba(139,92,246,0.85)" : "rgba(10,3,56,0.8)",
                          color: "#FDFDFE",
                          border: editMode ? "2px solid #a78bfa" : "2px solid rgba(83,49,208,0.35)"
                        }}>
                        {editMode ? t.closeEdit : t.editManually}
                      </motion.button>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmerOrdonnance}
                      className="py-5 rounded-2xl text-white font-bold text-xl"
                      style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                      {t.confirmPrescription}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

function OrdonnanceSection({ label, sphere, cylindre, axe, addition, color, onChange }: {
  label: string; sphere?: string; cylindre?: string; axe?: string; addition?: string; color: string;
  onChange: (field: string, val: string) => void;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(10,3,56,0.6)", border: `2px solid ${color}30` }}>
      <p className="text-xl font-bold mb-3" style={{ color }}>{label}</p>
      {[
        { field: "sphere", label: "Sphère", value: sphere },
        { field: "cylindre", label: "Cyl.", value: cylindre },
        { field: "axe", label: "Axe", value: axe },
        ...(addition ? [{ field: "addition", label: "Add.", value: addition }] : []),
      ].map((row) => (
        <div key={row.field} className="flex items-center justify-between mb-2">
          <span className="text-lg font-medium" style={{ color: "#9B96DA" }}>{row.label}</span>
          <input type="text" value={row.value || ""} onChange={(e) => onChange(row.field, e.target.value)}
            className="text-lg font-bold text-right w-24 px-2 py-1 rounded-lg border outline-none"
            style={{ color, borderColor: `${color}30`, background: "#0A0338" }} />
        </div>
      ))}
    </div>
  );
}
