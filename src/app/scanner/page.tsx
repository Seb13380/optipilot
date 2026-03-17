"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import { analyserOrdonnance } from "@/lib/analyseOrdonnance";

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
  const [scanError, setScanError] = useState("");
  const [stableProgress, setStableProgress] = useState(0); // 0-100
  const [autoCapturing, setAutoCapturing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [magasinNom, setMagasinNom] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
    if (user.magasinNom) setMagasinNom(user.magasinNom);
  }, []);

  // Calcul de la différence entre deux frames
  function frameDiff(a: ImageData, b: ImageData): number {
    let total = 0;
    const len = a.data.length;
    for (let i = 0; i < len; i += 16) {
      total += Math.abs(a.data[i] - b.data[i]);
    }
    return total / (len / 16);
  }

  const captureAndAnalyse = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);

    // Prétraitement : contraste fort + netteté pour manuscrit et imprimé
    // On upscale ×2 si résolution native < 1600px pour améliorer la lisibilité GPT
    const scale = w < 1600 ? 2 : 1;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = w * scale;
    tmpCanvas.height = h * scale;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    // Contraste élevé : encre foncée sur fond clair (imprimé ET manuscrit)
    tmpCtx.filter = "contrast(160%) brightness(102%) saturate(70%)";
    tmpCtx.drawImage(canvas, 0, 0, w * scale, h * scale);
    tmpCtx.filter = "none";

    // JPEG haute qualité (0.98 pour perdre le moins possible de netteté)
    const dataUrl = tmpCanvas.toDataURL("image/jpeg", 0.98);
    setImageDataUrl(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    setStep("preview");
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
      if (!video || video.readyState < 2) return;

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
    router.push("/questionnaire");
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
      <OptiPilotHeader title="Scanner l'ordonnance" showBack onBack={() => router.push("/dashboard")} />

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
                  <p className="text-sm font-bold" style={{ color: "#5331D0" }}>Conseils pour un scan réussi</p>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: "#6b7280" }}>
                    Posez l&apos;ordonnance sur une surface plane · bonne lumière (pas de reflet) · la capture est automatique dès que l&apos;image est stable
                  </p>
                </div>
              </div>

              {/* Viewfinder */}
              <div className="rounded-2xl overflow-hidden relative shadow-lg" style={{ background: "#000", minHeight: 300 }}>
                <video ref={videoRef} className="w-full object-cover" style={{ minHeight: 300, display: cameraStarted ? "block" : "none" }} playsInline muted />
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
                      <p className="text-center font-bold text-xl" style={{ color: "#22c55e" }}>✓ Capture en cours…</p>
                    ) : stableProgress > 0 ? (
                      <>
                        <p className="text-center font-bold text-lg text-white mb-2">Ne bougez plus…</p>
                        <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${stableProgress}%`, background: stableProgress > 70 ? "#22c55e" : "#facc15" }} />
                        </div>
                      </>
                    ) : (
                      <p className="text-center font-bold text-xl text-white">Placez l'ordonnance dans le cadre</p>
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
                    <p className="text-white font-bold text-2xl text-center">Appareil photo</p>
                    <p className="font-semibold text-lg text-center" style={{ color: "#9B96DA" }}>La photo sera prise automatiquement</p>
                  </div>
                )}
              </div>

              {/* Boutons */}
              <div className="flex flex-col gap-4">
                {!cameraStarted ? (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={startCamera}
                    className="py-5 rounded-2xl text-white font-bold text-xl"
                    style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                    📸 Démarrer la caméra
                  </motion.button>
                ) : (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={captureAndAnalyse}
                    className="py-4 rounded-2xl font-bold text-lg"
                    style={{ background: "rgba(83,49,208,0.15)", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.4)" }}>
                    📷 Capturer manuellement
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ÉTAPE 2 : APERÇU ── */}
          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <p className="text-center font-bold text-xl" style={{ color: "#FDFDFE" }}>Vérifiez la photo</p>
              <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "rgba(10,3,56,0.8)", minHeight: 280 }}>
                {imageDataUrl ? (
                  <img src={imageDataUrl} alt="Ordonnance" className="w-full object-contain" style={{ maxHeight: 400 }} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 gap-3" style={{ minHeight: 280 }}>
                    <span className="text-7xl">📄</span>
                    <p className="font-bold text-xl text-white">Document prêt</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={resetCamera}
                  className="flex-1 py-5 rounded-2xl font-bold text-lg"
                  style={{ background: "#0A0338", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.35)" }}>
                  ↩ Reprendre
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={analyseOrdonnance}
                  className="flex-1 py-5 rounded-2xl text-white font-bold text-lg"
                  style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                  🤖 Analyser
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
                  <p className="text-2xl font-bold text-white">Analyse en cours…</p>
                  <p className="text-lg" style={{ color: "#9B96DA" }}>L'IA lit votre ordonnance</p>
                </div>
              ) : scanError ? (
                <div className="flex flex-col gap-5">
                  <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.4)" }}>
                    <p className="text-2xl mb-2">⚠️</p>
                    <p className="font-bold text-xl text-white mb-1">Lecture impossible</p>
                    <p className="text-lg" style={{ color: "#fca5a5" }}>{scanError}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={resetCamera}
                    className="py-5 rounded-2xl text-white font-bold text-xl"
                    style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                    📸 Reprendre le scan
                  </motion.button>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl p-5 shadow-sm" style={{ background: "#0A0338" }}>
                    <div className="flex items-center gap-3 mb-5">
                      <span className="px-3 py-1.5 rounded-full font-bold text-base text-white" style={{ background: editMode ? "#ec4899" : "#22c55e" }}>
                      </span>
                      <h2 className="text-xl font-bold" style={{ color: "#FDFDFE" }}>Résultats de l'ordonnance</h2>
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
                              <p className="text-base font-bold uppercase tracking-wider" style={{ color: analyse.couleur }}>Analyse OptiPilot</p>
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
                              <p className="text-base font-semibold" style={{ color: "rgba(155,150,218,0.6)" }}>Indice recommandé</p>
                              <p className="text-lg font-bold mt-1" style={{ color: "#FDFDFE" }}>{analyse.indiceRecommande}</p>
                            </div>
                            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "rgba(10,3,56,0.5)", border: "1px solid rgba(83,49,208,0.25)" }}>
                              <p className="text-base font-semibold" style={{ color: "rgba(155,150,218,0.6)" }}>Type de verre</p>
                              <p className="text-lg font-bold mt-1" style={{ color: "#FDFDFE" }}>
                                {analyse.typeVerre === "progressif" ? "Progressif" : "Unifocal"}
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
                        <p className="text-sm font-bold" style={{ color: "#f472b6" }}>Correction du patient</p>
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
                          {normaliseCivilite(ordonnance.civilite)} {[ordonnance.prenomPatient, ordonnance.nomPatient].filter(Boolean).join(" ")}{magasinNom ? `, Bienvenue chez ${magasinNom}` : ", Bienvenue !"}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <OrdonnanceSection label="OD — Œil Droit" sphere={ordonnance.odSphere} cylindre={ordonnance.odCylindre} axe={ordonnance.odAxe} addition={ordonnance.odAddition} color="#5331D0"
                        onChange={(field, val) => setOrdonnance((prev) => ({ ...prev, [`od${field.charAt(0).toUpperCase() + field.slice(1)}`]: val }))} />
                      <OrdonnanceSection label="OG — Œil Gauche" sphere={ordonnance.ogSphere} cylindre={ordonnance.ogCylindre} axe={ordonnance.ogAxe} addition={ordonnance.ogAddition} color="#5331D0"
                        onChange={(field, val) => setOrdonnance((prev) => ({ ...prev, [`og${field.charAt(0).toUpperCase() + field.slice(1)}`]: val }))} />
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {editMode ? (
                        <>
                          <p className="text-sm font-bold mb-1" style={{ color: "#f472b6" }}>Correction du médecin et de la date</p>
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

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <motion.button whileTap={{ scale: 0.97 }} onClick={resetCamera}
                        className="flex-1 py-4 rounded-2xl font-bold text-base"
                        style={{ background: "#0A0338", color: "#9B96DA", border: "2px solid rgba(83,49,208,0.35)" }}>
                        📸 Reprendre la photo
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditMode((v) => !v)}
                        className="flex-1 py-4 rounded-2xl font-bold text-base"
                        style={{
                          background: editMode ? "rgba(139,92,246,0.85)" : "rgba(10,3,56,0.8)",
                          color: "#FDFDFE",
                          border: editMode ? "2px solid #a78bfa" : "2px solid rgba(83,49,208,0.35)"
                        }}>
                        {editMode ? "Fermer correction" : "Corriger manuellement"}
                      </motion.button>
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={confirmerOrdonnance}
                      className="py-5 rounded-2xl text-white font-bold text-xl"
                      style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)", boxShadow: "0 4px 20px rgba(83,49,208,0.5)" }}>
                      ✓ Confirmer
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
