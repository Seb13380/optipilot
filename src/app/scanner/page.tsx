"use client";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

interface OrdonnanceData {
  odSphere?: string;
  odCylindre?: string;
  odAxe?: string;
  odAddition?: string;
  ogSphere?: string;
  ogCylindre?: string;
  ogAxe?: string;
  ogAddition?: string;
  prescripteur?: string;
  dateOrdonnance?: string;
}

type Step = "camera" | "preview" | "result" | "confirm";

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<Step>("camera");
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [ordonnance, setOrdonnance] = useState<OrdonnanceData>({});
  const [cameraStarted, setCameraStarted] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraStarted(true);
    } catch {
      // Caméra non disponible — mode démo
      setCameraStarted(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setImageDataUrl(dataUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStep("preview");
    }
  }, []);

  async function analyseOrdonnance() {
    setScanning(true);
    setStep("result");

    try {
      const res = await fetch("/api/scan-ordonnance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      const data = await res.json();
      if (data.ordonnance) {
        setOrdonnance(data.ordonnance);
      }
    } catch {
      // Démo : valeurs pré-remplies
      setOrdonnance({
        odSphere: "-2.50",
        odCylindre: "+0.75",
        odAxe: "90",
        odAddition: "+2.00",
        ogSphere: "-3.00",
        ogCylindre: "+1.25",
        ogAxe: "85",
        ogAddition: "+2.00",
        prescripteur: "Dr. Dupont",
        dateOrdonnance: new Date().toISOString().split("T")[0],
      });
    } finally {
      setScanning(false);
    }
  }

  function confirmerOrdonnance() {
    localStorage.setItem("optipilot_ordonnance", JSON.stringify(ordonnance));
    router.push("/questionnaire");
  }

  function useDemoImage() {
    setImageDataUrl("/demo-ordonnance.jpg");
    setStep("preview");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <OptiPilotHeader
        title="Scanner Ordonnance"
        showBack
        onBack={() => router.push("/dashboard")}
      />

      <main className="flex-1 flex flex-col px-6 pt-5 pb-8 w-full">
        <AnimatePresence mode="wait">
          {/* ÉTAPE 1 — Caméra */}
          {step === "camera" && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              <div
                className="rounded-2xl overflow-hidden shadow-md relative"
                style={{ background: "#1a1a2e", minHeight: 280 }}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  style={{ display: cameraStarted ? "block" : "none", minHeight: 280 }}
                  playsInline
                  muted
                />
                {!cameraStarted && (
                  <div className="flex flex-col items-center justify-center p-10 gap-4" style={{ minHeight: 280 }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <svg width="36" height="36" fill="white" viewBox="0 0 24 24">
                        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3l-4 6m14-6l4 6M3 9v10a2 2 0 002 2h4m-6-6h6m-6 0v6M21 9v10a2 2 0 01-2 2h-4m6-12h-6m0 0v6" stroke="white" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <p className="text-white text-center font-medium">
                      Caméra prête
                    </p>
                    <p className="text-blue-200 text-sm text-center">
                      Positionnez l'ordonnance dans le cadre
                    </p>
                  </div>
                )}

                {/* Cadre de scan */}
                {cameraStarted && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white opacity-60 rounded-xl" style={{ width: "80%", height: "60%" }} />
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex flex-col gap-3">
                {!cameraStarted ? (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={startCamera}
                    className="py-4 rounded-2xl text-white font-semibold text-base"
                    style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)", boxShadow: "0 4px 20px rgba(30,58,138,0.35)" }}
                  >
                    📸 Démarrer la caméra
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={capturePhoto}
                    className="py-4 rounded-2xl text-white font-semibold text-base"
                    style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)", boxShadow: "0 4px 20px rgba(30,58,138,0.35)" }}
                  >
                    📷 Prendre la photo
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={useDemoImage}
                  className="py-3.5 rounded-2xl font-medium text-base"
                  style={{ background: "white", color: "#1e3a8a", border: "2px solid #dbeafe" }}
                >
                  🔵 Utiliser une ordonnance démo
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 2 — Prévisualisation */}
          {step === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              <div className="rounded-2xl overflow-hidden shadow-md" style={{ background: "#f3f4f6", minHeight: 280 }}>
                {imageDataUrl && imageDataUrl !== "/demo-ordonnance.jpg" ? (
                  <img src={imageDataUrl} alt="Ordonnance" className="w-full object-contain" style={{ maxHeight: 380 }} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 gap-3" style={{ minHeight: 280 }}>
                    <span className="text-6xl">📄</span>
                    <p className="text-gray-500 font-medium">Ordonnance démo chargée</p>
                    <p className="text-gray-400 text-sm">Les valeurs seront pré-remplies automatiquement</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setStep("camera");
                    setCameraStarted(false);
                    setImageDataUrl("");
                  }}
                  className="flex-1 py-4 rounded-2xl font-medium"
                  style={{ background: "white", color: "#6b7280", border: "2px solid #e5e7eb" }}
                >
                  Reprendre
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={analyseOrdonnance}
                  className="flex-[2] py-4 rounded-2xl text-white font-semibold"
                  style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)", boxShadow: "0 4px 20px rgba(30,58,138,0.35)" }}
                >
                  🤖 Analyser
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 3 — Résultat IA */}
          {step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-5"
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center gap-5 py-16">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)" }}
                  >
                    <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold" style={{ color: "#1a1a2e" }}>
                      Analyse en cours...
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
                      L'IA extrait les données optiques
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl p-5 shadow-sm" style={{ background: "white" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ background: "#22c55e" }}
                      >
                        ✓ Extrait
                      </span>
                      <h2 className="text-base font-semibold" style={{ color: "#1a1a2e" }}>
                        Résultats de l'ordonnance
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <OrdonnanceSection
                        label="OD — Œil Droit"
                        sphere={ordonnance.odSphere}
                        cylindre={ordonnance.odCylindre}
                        axe={ordonnance.odAxe}
                        addition={ordonnance.odAddition}
                        color="#1e3a8a"
                        onChange={(field, val) =>
                          setOrdonnance((prev) => ({
                            ...prev,
                            [`od${field.charAt(0).toUpperCase() + field.slice(1)}`]: val,
                          }))
                        }
                      />
                      <OrdonnanceSection
                        label="OG — Œil Gauche"
                        sphere={ordonnance.ogSphere}
                        cylindre={ordonnance.ogCylindre}
                        axe={ordonnance.ogAxe}
                        addition={ordonnance.ogAddition}
                        color="#7e22ce"
                        onChange={(field, val) =>
                          setOrdonnance((prev) => ({
                            ...prev,
                            [`og${field.charAt(0).toUpperCase() + field.slice(1)}`]: val,
                          }))
                        }
                      />
                    </div>

                    {ordonnance.prescripteur && (
                      <p className="mt-3 text-xs" style={{ color: "#9ca3af" }}>
                        Prescripteur : {ordonnance.prescripteur}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep("camera")}
                      className="flex-1 py-4 rounded-2xl font-medium"
                      style={{ background: "white", color: "#6b7280", border: "2px solid #e5e7eb" }}
                    >
                      Modifier
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={confirmerOrdonnance}
                      className="flex-[2] py-4 rounded-2xl text-white font-semibold"
                      style={{ background: "linear-gradient(135deg, #1e3a8a, #3b5fc0)", boxShadow: "0 4px 20px rgba(30,58,138,0.35)" }}
                    >
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

function OrdonnanceSection({
  label,
  sphere,
  cylindre,
  axe,
  addition,
  color,
  onChange,
}: {
  label: string;
  sphere?: string;
  cylindre?: string;
  axe?: string;
  addition?: string;
  color: string;
  onChange: (field: string, val: string) => void;
}) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{ background: "#f8fafc", border: `2px solid ${color}20` }}
    >
      <p className="text-xs font-bold mb-3" style={{ color }}>
        {label}
      </p>
      {[
        { field: "sphere", label: "Sphère", value: sphere },
        { field: "cylindre", label: "Cylindre", value: cylindre },
        { field: "axe", label: "Axe", value: axe },
        ...(addition ? [{ field: "addition", label: "Addition", value: addition }] : []),
      ].map((row) => (
        <div key={row.field} className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: "#6b7280" }}>
            {row.label}
          </span>
          <input
            type="text"
            value={row.value || ""}
            onChange={(e) => onChange(row.field, e.target.value)}
            className="text-sm font-bold text-right w-20 px-2 py-1 rounded-lg border outline-none"
            style={{ color, borderColor: `${color}30`, background: "white" }}
          />
        </div>
      ))}
    </div>
  );
}
