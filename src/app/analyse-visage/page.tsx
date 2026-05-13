"use client";
import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import OpticianGuard from "@/components/OpticianGuard";
import type { AnalyseVisage } from "@/lib/analyseVisage";

// ─── Icônes morphologie ───────────────────────────────────────
const MORPHOLOGIE_EMOJI: Record<string, string> = {
  "Ovale": "🥚",
  "Ronde": "⭕",
  "Carrée": "⬜",
  "Cœur": "🫀",
  "Diamant": "💎",
  "Rectangulaire": "▬",
};

const CARNATION_COLOR: Record<string, string> = {
  "Chaudes": "#f59e0b",
  "Froides": "#60a5fa",
  "Neutres": "#a78bfa",
};

// ─── Composant principal ──────────────────────────────────────
export default function AnalyseVisagePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"idle" | "camera" | "preview" | "loading" | "result">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseVisage | null>(null);
  const [source, setSource] = useState<"gpt4o" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Caméra ─────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("camera");
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Miroir pour selfie naturel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    stopCamera();
    setMode("preview");
  }, [stopCamera]);

  // ─── Upload fichier ──────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── Analyse ────────────────────────────────────────────────
  const lancerAnalyse = useCallback(async () => {
    if (!preview) return;
    setMode("loading");
    setError(null);
    try {
      const res = await fetch("/api/analyse-visage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur");
      setAnalyse(data.analyse);
      setSource(data.source);
      setMode("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'analyse");
      setMode("preview");
    }
  }, [preview]);

  const reset = useCallback(() => {
    stopCamera();
    setMode("idle");
    setPreview(null);
    setAnalyse(null);
    setError(null);
    setSource(null);
  }, [stopCamera]);

  // ─── Rendu ──────────────────────────────────────────────────
  return (
    <OpticianGuard>
      <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0f0ff 0%, #e8e4ff 100%)" }}>
        <OptiPilotHeader />

        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-semibold"
              style={{ background: "#ede9fe", color: "#7c3aed" }}>
              ✨ Analyse IA
            </div>
            <h1 className="text-3xl font-black mb-2" style={{ color: "#1C0B62" }}>
              Analyse morphologie visage
            </h1>
            <p className="text-base" style={{ color: "#6b7280" }}>
              Prenez une photo ou importez une image pour obtenir des recommandations de montures personnalisées.
            </p>
          </div>

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-4 mb-6 text-sm font-medium flex items-center gap-3"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
              >
                <span>⚠️</span> {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── IDLE ── */}
          {mode === "idle" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl p-8 text-center"
              style={{ background: "#fff", boxShadow: "0 4px 32px rgba(124,58,237,0.08)" }}>
              <div className="text-6xl mb-6">🔍</div>
              <h2 className="text-xl font-black mb-2" style={{ color: "#1C0B62" }}>
                Choisissez comment prendre la photo
              </h2>
              <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>
                Le client doit être face à la caméra, visage bien éclairé
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={startCamera}
                  className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-white transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                  📷 Prendre une photo
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "#f3f4f6", color: "#374151" }}>
                  🖼️ Importer une image
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </motion.div>
          )}

          {/* ── CAMÉRA ── */}
          {mode === "camera" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 4px 32px rgba(124,58,237,0.15)" }}>
              <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }} />
                {/* Guide ovale */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-white border-opacity-60 rounded-full"
                    style={{ width: "45%", height: "65%", borderStyle: "dashed" }} />
                </div>
                <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm font-medium"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                  Centrez le visage dans le cadre
                </p>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-3 p-4" style={{ background: "#1C0B62" }}>
                <button onClick={reset} className="flex-1 py-3 rounded-2xl font-bold text-white opacity-70 hover:opacity-100"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  Annuler
                </button>
                <button onClick={capturePhoto}
                  className="flex-2 py-3 rounded-2xl font-bold text-white transition-transform hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                  📸 Capturer
                </button>
              </div>
            </motion.div>
          )}

          {/* ── PREVIEW ── */}
          {mode === "preview" && preview && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl overflow-hidden"
              style={{ background: "#fff", boxShadow: "0 4px 32px rgba(124,58,237,0.1)" }}>
              <img src={preview} alt="Photo à analyser" className="w-full object-cover"
                style={{ maxHeight: "400px", objectFit: "cover" }} />
              <div className="p-6 text-center">
                <p className="text-sm mb-4 font-medium" style={{ color: "#6b7280" }}>
                  Bonne photo ? Lancez l&apos;analyse IA.
                </p>
                <div className="flex gap-3">
                  <button onClick={reset}
                    className="flex-1 py-3 rounded-2xl font-bold transition-colors"
                    style={{ background: "#f3f4f6", color: "#374151" }}>
                    Reprendre
                  </button>
                  <button onClick={lancerAnalyse}
                  className="flex-2 py-3 rounded-2xl font-bold text-white transition-transform hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                    ✨ Analyser le visage
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LOADING ── */}
          {mode === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-3xl p-12 text-center"
              style={{ background: "#fff", boxShadow: "0 4px 32px rgba(124,58,237,0.1)" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-16 h-16 rounded-full border-4 mx-auto mb-6"
                style={{ borderColor: "#ede9fe", borderTopColor: "#7c3aed" }} />
              <h2 className="text-xl font-black mb-2" style={{ color: "#1C0B62" }}>Analyse en cours…</h2>
              <p className="text-sm" style={{ color: "#9ca3af" }}>
                L&apos;IA analyse la morphologie, le style et prépare vos recommandations
              </p>
            </motion.div>
          )}

          {/* ── RÉSULTAT ── */}
          {mode === "result" && analyse && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5">

              {source === "demo" && (
                <div className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2"
                  style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" }}>
                  ⚠️ Mode démo — résultats simulés (clé OpenAI non configurée)
                </div>
              )}

              {/* Photo + morphologie */}
              <div className="rounded-3xl overflow-hidden"
                style={{ background: "#fff", boxShadow: "0 4px 24px rgba(124,58,237,0.08)" }}>
                {preview && (
                  <img src={preview} alt="Visage analysé" className="w-full object-cover"
                    style={{ maxHeight: "280px", objectFit: "cover" }} />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{MORPHOLOGIE_EMOJI[analyse.morphologie] ?? "👤"}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "#7c3aed" }}>Morphologie</p>
                      <h2 className="text-2xl font-black" style={{ color: "#1C0B62" }}>Visage {analyse.morphologie}</h2>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                    {analyse.morphologieDescription}
                  </p>
                </div>
              </div>

              {/* Style + Carnation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-5"
                  style={{ background: "#fff", boxShadow: "0 2px 16px rgba(124,58,237,0.06)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#7c3aed" }}>Style</p>
                  <p className="text-xl font-black" style={{ color: "#1C0B62" }}>✨ {analyse.style}</p>
                </div>
                <div className="rounded-2xl p-5"
                  style={{ background: "#fff", boxShadow: "0 2px 16px rgba(124,58,237,0.06)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#7c3aed" }}>Carnation</p>
                  <p className="text-xl font-black" style={{ color: CARNATION_COLOR[analyse.carnation] ?? "#374151" }}>
                    🎨 {analyse.carnation}
                  </p>
                </div>
              </div>

              {/* Montures recommandées */}
              <div className="rounded-3xl p-6"
                style={{ background: "#fff", boxShadow: "0 2px 16px rgba(124,58,237,0.06)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#7c3aed" }}>
                  ✅ Montures recommandées
                </p>
                <div className="flex flex-wrap gap-2">
                  {analyse.monturesRecommandees.map((m, i) => (
                    <span key={i} className="px-4 py-2 rounded-full text-sm font-semibold"
                      style={{ background: "#ede9fe", color: "#5b21b6" }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Montures à éviter */}
              <div className="rounded-3xl p-6"
                style={{ background: "#fff", boxShadow: "0 2px 16px rgba(124,58,237,0.06)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#ef4444" }}>
                  ❌ À éviter
                </p>
                <div className="flex flex-wrap gap-2">
                  {analyse.monturesAEviter.map((m, i) => (
                    <span key={i} className="px-4 py-2 rounded-full text-sm font-semibold"
                      style={{ background: "#fef2f2", color: "#dc2626" }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Couleurs */}
              <div className="rounded-3xl p-6"
                style={{ background: "#fff", boxShadow: "0 2px 16px rgba(124,58,237,0.06)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#7c3aed" }}>
                  🎨 Couleurs conseillées
                </p>
                <div className="flex flex-wrap gap-2">
                  {analyse.couleursRecommandees.map((c, i) => (
                    <span key={i} className="px-4 py-2 rounded-full text-sm font-semibold"
                      style={{ background: "#f0fdf4", color: "#166534" }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Conseil personnalisé */}
              <div className="rounded-3xl p-6"
                style={{ background: "linear-gradient(135deg, #1C0B62, #5b21b6)", boxShadow: "0 4px 24px rgba(91,33,182,0.3)" }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 text-white opacity-70">
                  💡 Conseil opticien
                </p>
                <p className="text-white text-base leading-relaxed font-medium">
                  {analyse.conseil}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pb-4">
                <button onClick={reset}
                  className="flex-1 py-3 rounded-2xl font-bold transition-colors"
                  style={{ background: "#f3f4f6", color: "#374151" }}>
                  Nouvelle analyse
                </button>
                <button
                  onClick={() => {
                    const text = `Morphologie : ${analyse.morphologie}\nStyle : ${analyse.style}\nMontures : ${analyse.monturesRecommandees.join(", ")}\nCouleurs : ${analyse.couleursRecommandees.join(", ")}\n\n${analyse.conseil}`;
                    navigator.clipboard?.writeText(text);
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                  📋 Copier
                </button>
              </div>

            </motion.div>
          )}

        </div>
      </div>
    </OpticianGuard>
  );
}
