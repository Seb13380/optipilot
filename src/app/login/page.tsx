"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@optipilot.fr");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Mode démo — connexion directe sans backend
      if (email === "demo@optipilot.fr" && password === "demo1234") {
        localStorage.setItem(
          "optipilot_user",
          JSON.stringify({
            id: "demo-user",
            nom: "Dr. Martin",
            email,
            role: "admin",
            magasinId: "demo-magasin",
            magasinNom: "Optique Lumière",
          })
        );
        router.push("/dashboard");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, motDePasse: password }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur connexion");

      localStorage.setItem("optipilot_token", data.token);
      localStorage.setItem("optipilot_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #020017 0%, #0A0338 40%, #5331D0 100%)" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-12"
      >
        <img
          src="/assets/images/logo-OptiPilot.png"
          alt="OptiPilot"
          className="h-32 w-auto object-contain mb-3 drop-shadow-2xl"
        />
        <p className="text-xl mt-1 font-semibold" style={{ color: "#9B96DA" }}>
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
        </div>
      </motion.div>
    </div>
  );
}
