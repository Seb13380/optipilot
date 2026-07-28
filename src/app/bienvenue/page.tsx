"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface OrdoData {
  odSphere?: string;
  ogSphere?: string;
  odCylindre?: string;
  ogCylindre?: string;
  odAddition?: string;
  ogAddition?: string;
}

interface DiagItem {
  label: string;
  detail: string;
  icon: string;
}

function parseSigned(v?: string): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(",", ".").replace(/[^\d.+-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function diagnosticVision(o: OrdoData): DiagItem[] {
  const items: DiagItem[] = [];
  const sphereOD = parseSigned(o.odSphere);
  const sphereOG = parseSigned(o.ogSphere);
  const cylOD = Math.abs(parseSigned(o.odCylindre));
  const cylOG = Math.abs(parseSigned(o.ogCylindre));
  const addOD = parseSigned(o.odAddition);
  const addOG = parseSigned(o.ogAddition);

  const sphereMax = Math.abs(sphereOD) >= Math.abs(sphereOG) ? sphereOD : sphereOG;
  const cylMax = Math.max(cylOD, cylOG);
  const addMax = Math.max(addOD, addOG);

  // Myopie / Hypermétropie
  if (sphereMax < -0.25) {
    const abs = Math.abs(sphereMax);
    const niveau = abs < 3 ? "légère" : abs < 6 ? "modérée" : "forte";
    items.push({ icon: "🔭", label: `Myopie ${niveau}`, detail: "Difficulté à voir de loin" });
  } else if (sphereMax > 0.25) {
    const niveau = sphereMax < 2 ? "légère" : sphereMax < 4 ? "modérée" : "forte";
    items.push({ icon: "🔍", label: `Hypermétropie ${niveau}`, detail: "Difficulté à voir de près" });
  }

  // Astigmatisme
  if (cylMax > 0.25) {
    const niveau = cylMax < 1 ? "léger" : cylMax < 2 ? "modéré" : "important";
    items.push({ icon: "🎯", label: `Astigmatisme ${niveau}`, detail: "Vision légèrement déformée" });
  }

  // Presbytie
  if (addMax >= 0.75) {
    const niveau = addMax < 1.5 ? "débutante" : addMax < 2.5 ? "confirmée" : "avancée";
    items.push({ icon: "📖", label: `Presbytie ${niveau}`, detail: "Difficulté à la lecture de près" });
  }

  return items;
}

export default function BienvenuePage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [civilite, setCivilite] = useState("");
  const [magasin, setMagasin] = useState("votre opticien");
  const [diagnostic, setDiagnostic] = useState<DiagItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const client = JSON.parse(localStorage.getItem("optipilot_client") || "{}");
      const user   = JSON.parse(localStorage.getItem("optipilot_user")   || "{}");
      const ordo   = JSON.parse(localStorage.getItem("optipilot_ordonnance") || "{}");

      if (client.prenom || client.nom) {
        setNom(`${client.prenom || ""} ${client.nom || ""}`.trim());
      }
      if (client.civilite) setCivilite(client.civilite);
      if (user.magasinNom) setMagasin(user.magasinNom);

      const diag = diagnosticVision(ordo);
      setDiagnostic(diag);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const salutation = civilite
    ? `${civilite} ${nom}`
    : nom || "Bienvenue";

  return (
    <div className="page-bg min-h-screen flex flex-col items-center justify-between px-6 pt-10 pb-10">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full flex justify-center mb-2"
      >
        <img
          src="/assets/images/Logo-OptiPilot.png"
          alt="OptiPilot"
          className="h-14 w-auto object-contain"
          style={{ filter: "drop-shadow(0 0 18px rgba(124,58,237,0.55))" }}
        />
      </motion.div>

      {/* Contenu principal */}
      {ready && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="flex flex-col items-center gap-6 w-full max-w-md"
        >

          {/* Accueil personnalisé */}
          <div className="text-center">
            <h1 className="text-4xl font-black mb-2" style={{ color: "#FDFDFE" }}>
              Bonjour {salutation}&nbsp;!
            </h1>
            <p className="text-lg font-medium" style={{ color: "#9B96DA" }}>
              Bienvenue chez <span style={{ color: "#FDFDFE", fontWeight: 700 }}>{magasin}</span>
            </p>
            <p className="text-base mt-1" style={{ color: "rgba(155,150,218,0.7)" }}>
              Je suis votre assistant OptiPilot.
            </p>
          </div>

          {/* Diagnostic visuel */}
          {diagnostic.length > 0 && (
            <div
              className="w-full rounded-2xl p-5"
              style={{ background: "rgba(83,49,208,0.1)", border: "1px solid rgba(83,49,208,0.3)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(155,150,218,0.6)" }}>
                Votre profil visuel
              </p>
              <div className="flex flex-col gap-3">
                {diagnostic.map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-2xl">{d.icon}</span>
                    <div>
                      <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>{d.label}</p>
                      <p className="text-sm" style={{ color: "rgba(155,150,218,0.7)" }}>{d.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {diagnostic.length === 0 && (
            <div
              className="w-full rounded-2xl p-5 text-center"
              style={{ background: "rgba(83,49,208,0.08)", border: "1px solid rgba(83,49,208,0.2)" }}
            >
              <p className="text-base" style={{ color: "#9B96DA" }}>
                Nous allons personnaliser votre expérience grâce à quelques questions.
              </p>
            </div>
          )}

          {/* Message questionnaire */}
          <p className="text-center text-base" style={{ color: "rgba(155,150,218,0.8)" }}>
            Pour vous proposer les meilleures recommandations,<br />
            veuillez répondre à quelques questions.
          </p>

        </motion.div>
      )}

      {/* Bouton CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full max-w-md"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/questionnaire")}
          className="w-full py-5 rounded-2xl text-white font-bold text-xl flex items-center justify-center gap-3"
          style={{
            background: "linear-gradient(135deg, #5331D0, #9B96DA)",
            boxShadow: "0 6px 28px rgba(83,49,208,0.5)",
          }}
        >
          Commencer le questionnaire
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </motion.div>

    </div>
  );
}
