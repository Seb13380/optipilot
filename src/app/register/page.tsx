"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputBase = "w-full px-5 py-4 rounded-2xl text-xl border-2 outline-none transition-all";
  const inputStyle = {
    borderColor: "rgba(83,49,208,0.4)",
    background: "rgba(2,0,23,0.7)",
    color: "#FDFDFE",
  };

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom, email, motDePasse: password }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du compte");

      localStorage.setItem("optipilot_token", data.token);
      localStorage.setItem("optipilot_user", JSON.stringify(data.user));

      // Toujours vers onboarding pour un nouveau compte
      router.push("/onboarding");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-bg min-h-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mb-10"
      >
        <img
          src="/assets/images/Logo-OptiPilot.png"
          alt="OptiPilot"
          className="h-28 w-auto object-contain mb-3 drop-shadow-2xl"
        />
        <p className="text-xl font-semibold" style={{ color: "#9B96DA" }}>
          Essai gratuit 14 jours — sans carte bancaire
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="w-full max-w-lg"
      >
        <div
          className="rounded-3xl p-10 shadow-2xl"
          style={{ background: "rgba(10,3,56,0.97)", border: "2px solid rgba(83,49,208,0.5)" }}
        >
          <h2 className="text-4xl font-black mb-2" style={{ color: "#FDFDFE" }}>
            Créer un compte
          </h2>
          <p className="text-lg mb-8" style={{ color: "#9B96DA" }}>
            Votre magasin opérationnel en 2 minutes
          </p>

          <form onSubmit={handleRegister} className="flex flex-col gap-5">
            {/* Nom */}
            <div>
              <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>
                Votre nom
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className={inputBase}
                style={inputStyle}
                placeholder="Dr. Dupont"
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.4)")}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>
                Email professionnel
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputBase}
                style={inputStyle}
                placeholder="vous@monmagasin.fr"
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.4)")}
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputBase}
                style={inputStyle}
                placeholder="8 caractères minimum"
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.4)")}
              />
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-base font-semibold mb-2" style={{ color: "#9B96DA" }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={inputBase}
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password
                    ? "#ef4444"
                    : confirm && confirm === password
                    ? "#22c55e"
                    : "rgba(83,49,208,0.4)",
                }}
                placeholder="••••••••"
                onFocus={(e) => {
                  if (!confirm || confirm === password) e.target.style.borderColor = "#5331D0";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = confirm && confirm !== password
                    ? "#ef4444"
                    : confirm && confirm === password
                    ? "#22c55e"
                    : "rgba(83,49,208,0.4)";
                }}
              />
              {confirm && confirm !== password && (
                <p className="text-sm mt-1.5" style={{ color: "#ef4444" }}>
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-base bg-red-500/10 rounded-xl px-4 py-3"
                style={{ color: "#ef4444" }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || !nom || !email || !password || !confirm}
              className="w-full py-5 rounded-2xl text-white text-2xl font-bold mt-2"
              style={{
                background:
                  loading || !nom || !email || !password || !confirm
                    ? "rgba(155,150,218,0.5)"
                    : "linear-gradient(135deg, #5331D0 0%, #9B96DA 100%)",
                boxShadow:
                  loading || !nom || !email || !password || !confirm
                    ? "none"
                    : "0 4px 24px rgba(83,49,208,0.5)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  Création du compte...
                </span>
              ) : (
                "Démarrer l'essai gratuit →"
              )}
            </motion.button>
          </form>

          {/* Lien vers login */}
          <p className="mt-6 text-center text-base" style={{ color: "#9B96DA" }}>
            Déjà un compte ?{" "}
            <Link href="/login" className="font-bold underline" style={{ color: "#9B96DA" }}>
              Se connecter
            </Link>
          </p>

          {/* Reassurance */}
          <div className="mt-5 flex items-center justify-center gap-6 text-sm" style={{ color: "rgba(155,150,218,0.55)" }}>
            <span>🔒 Données sécurisées</span>
            <span>🚫 Sans CB</span>
            <span>✓ 14 jours offerts</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
