"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, motDePasse: password }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants incorrects");

      localStorage.setItem("optipilot_token", data.token);
      localStorage.setItem("optipilot_user", JSON.stringify(data.user));
      // Initialise le timestamp de dernière activité dès la connexion
      localStorage.setItem("optipilot_last_activity", String(Date.now()));
      router.push(data.user.onboardingDone ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      const message = (err as Error).message;
      // Fallback offline démo si le backend est inaccessible
      if (message.includes("fetch") || message.includes("network") || message.includes("Failed")) {
        if (email === "demo@optipilot.fr" && password === "demo1234") {
          localStorage.setItem("optipilot_user", JSON.stringify({
            id: "demo-user", nom: "Dr. Martin", email,
            role: "admin", magasinId: "demo-magasin", magasinNom: "Optique Lumière",
            onboardingDone: true,
          }));
          router.push("/dashboard");
          return;
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="page-bg min-h-screen flex flex-col items-center justify-center px-6"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-12"
      >
        <div className="relative flex items-center justify-center mb-3">
          <div
            className="absolute rounded-full"
            style={{
              inset: "-40px",
              background: "radial-gradient(ellipse at center, rgba(244,114,182,0.25) 0%, rgba(167,139,250,0.14) 55%, transparent 78%)",
              filter: "blur(18px)",
            }}
          />
          <img
            src="/assets/images/Logo-OptiPilot.png"
            alt="OptiPilot"
            className="relative w-80 h-auto object-contain drop-shadow-2xl"
          />
        </div>
        <p className="text-xl mt-1 font-semibold" style={{ color: "#5331D0" }}>
          Copilote IA pour opticiens
        </p>
      </motion.div>

      {/* Card Login */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-lg"
      >
        <div
          className="rounded-3xl p-10 shadow-2xl"
          style={{ background: "rgba(10,3,56,0.97)", border: "2px solid rgba(83,49,208,0.5)" }}
        >
          <h2 className="text-4xl font-black mb-2" style={{ color: "#FDFDFE" }}>
            Connexion
          </h2>
          <p className="text-xl mb-8" style={{ color: "#9B96DA" }}>
            Connectez-vous à votre magasin
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-lg font-semibold mb-2" style={{ color: "#9B96DA" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl text-xl border-2 outline-none transition-all"
                style={{
                  borderColor: "rgba(83,49,208,0.4)",
                  background: "rgba(2,0,23,0.7)",
                  color: "#FDFDFE",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.4)")}
                placeholder="votre@email.fr"
              />
            </div>

            <div>
              <label className="block text-lg font-semibold mb-2" style={{ color: "#9B96DA" }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl text-xl border-2 outline-none transition-all"
                style={{
                  borderColor: "rgba(83,49,208,0.4)",
                  background: "rgba(2,0,23,0.7)",
                  color: "#FDFDFE",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.4)")}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-base text-red-600 bg-red-50 rounded-xl px-4 py-3"
              >
                ⚠️ {error}
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl text-white text-2xl font-bold mt-2 relative overflow-hidden"
              style={{
                background: loading
                  ? "rgba(155,150,218,0.6)"
                  : "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(83,49,208,0.5)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </motion.button>
          </form>

          {/* Demo hint */}
          <div
            className="mt-6 p-4 rounded-xl text-base text-center font-medium"
            style={{ background: "rgba(83,49,208,0.15)", color: "#9B96DA" }}
          >
            🔵 Mode démo : demo@optipilot.fr / demo1234
          </div>

          {/* Lien inscription */}
          <p className="mt-5 text-center text-base" style={{ color: "#9B96DA" }}>
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-bold underline" style={{ color: "#FDFDFE" }}>
              Créer un compte gratuitement →
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
