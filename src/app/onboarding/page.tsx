"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface MagasinResult {
  siret: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
}

interface MagasinForm {
  nom: string;
  siret: string;
  adresse: string;
  ville: string;
  codePostal: string;
  email: string;
  telephone: string;
  reseauMutuelle: string;
}

const RESEAUX = [
  "Aucun (indépendant)",
  "Optic 2000",
  "Krys",
  "Atol",
  "Optical Center",
  "Générale d'Optique",
  "Afflelou",
  "Grand Optical",
  "Vision Plus",
  "Julbo",
  "Autre réseau",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MagasinResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MagasinResult | null>(null);
  const [form, setForm] = useState<MagasinForm>({
    nom: "", siret: "", adresse: "", ville: "", codePostal: "",
    email: "", telephone: "", reseauMutuelle: "Aucun (indépendant)",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputStyle = {
    borderColor: "rgba(83,49,208,0.35)",
    background: "rgba(2,0,23,0.7)",
    color: "#FDFDFE",
  };

  // Rediriger si déjà onboardé
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
    if (!user.magasinId) {
      router.replace("/login");
    } else if (user.onboardingDone) {
      router.replace("/dashboard");
    }
  }, [router]);

  // Recherche avec debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.length < 2) { setResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/recherche-magasin?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.magasins || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query]);

  function selectMagasin(m: MagasinResult) {
    setSelected(m);
    setForm((prev) => ({
      ...prev,
      nom: m.nom,
      siret: m.siret,
      adresse: m.adresse,
      ville: m.ville,
      codePostal: m.codePostal,
    }));
    setStep(2);
  }

  function entrieManuellement() {
    setSelected(null);
    setForm((prev) => ({ ...prev, nom: query }));
    setStep(2);
  }

  async function handleSave() {
    if (!form.nom || !form.email || !form.telephone) {
      setError("Nom, email et téléphone sont obligatoires");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("optipilot_user") || "{}");
      const token = localStorage.getItem("optipilot_token") || "";

      if (!user.magasinId) {
        setError("Session expirée. Veuillez vous reconnecter.");
        setTimeout(() => router.replace("/login"), 2000);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/magasin/${user.magasinId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...form, onboardingDone: true }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 404 || body.code === "P2025") {
          setError("Session expirée. Reconnexion en cours…");
          setTimeout(() => {
            localStorage.removeItem("optipilot_token");
            localStorage.removeItem("optipilot_user");
            router.replace("/login");
          }, 2000);
          return;
        }
        throw new Error(body.error || "Erreur sauvegarde");
      }
      const magasin = await res.json();

      // Mettre à jour localStorage
      localStorage.setItem("optipilot_user", JSON.stringify({
        ...user,
        magasinNom: magasin.nom,
        onboardingDone: true,
      }));

      setStep(3);
      setTimeout(() => router.replace("/dashboard"), 2500);
    } catch (e: unknown) {
      const msg = (e as Error)?.message;
      setError(msg && msg !== "Erreur sauvegarde" ? msg : "Impossible de joindre le serveur. Vérifiez que le backend est démarré.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 py-4 rounded-2xl text-base border-2 outline-none transition-all";

  return (
    <div
      className="page-bg min-h-screen flex flex-col items-center justify-start px-6 py-10"
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <img
          src="/assets/images/Logo-OptiPilot.png"
          alt="OptiPilot"
          className="h-40 w-auto object-contain mx-auto mb-3 drop-shadow-2xl"
        />
        <p className="text-lg font-semibold" style={{ color: "#9B96DA" }}>
          Configuration de votre magasin
        </p>
      </motion.div>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all"
              style={{
                background: step >= s ? "linear-gradient(135deg, #5331D0, #9B96DA)" : "rgba(83,49,208,0.2)",
                color: step >= s ? "#FDFDFE" : "#9B96DA",
              }}
            >
              {step > s ? "✓" : s}
            </div>
            {s < 3 && (
              <div className="w-16 h-0.5 rounded" style={{ background: step > s ? "#5331D0" : "rgba(83,49,208,0.2)" }} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ─── ÉTAPE 1 : Recherche ─── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-2xl"
          >
            <div className="rounded-3xl p-7" style={{ background: "rgba(10,3,56,0.85)", border: "1.5px solid rgba(83,49,208,0.4)" }}>
              <h2 className="text-2xl font-black mb-2" style={{ color: "#FDFDFE" }}>
                🔍 Trouvez votre magasin
              </h2>
              <p className="text-base mb-6" style={{ color: "#9B96DA" }}>
                Recherchez par nom ou ville. Nous utilisons les données officielles des entreprises françaises.
              </p>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="Ex: Optique Lumière Paris, Krys Bordeaux..."
                autoFocus
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
              />

              {/* Résultats */}
              {searching && (
                <div className="flex items-center gap-3 mt-4" style={{ color: "#9B96DA" }}>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#9B96DA" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  <span>Recherche en cours...</span>
                </div>
              )}

              {!searching && results.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {results.map((m) => (
                    <motion.button
                      key={m.siret}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectMagasin(m)}
                      className="flex items-start gap-4 p-4 rounded-2xl text-left w-full transition-all"
                      style={{ background: "rgba(83,49,208,0.12)", border: "1px solid rgba(83,49,208,0.25)" }}
                    >
                      <div className="text-2xl mt-0.5">🏪</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ color: "#FDFDFE" }}>{m.nom}</p>
                        <p className="text-sm mt-0.5 truncate" style={{ color: "#9B96DA" }}>
                          {m.adresse && `${m.adresse}, `}{m.codePostal} {m.ville}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "rgba(155,150,218,0.5)" }}>
                          SIRET {m.siret}
                        </p>
                      </div>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="shrink-0 mt-1">
                        <path d="M9 18l6-6-6-6" stroke="#9B96DA" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </motion.button>
                  ))}
                </div>
              )}

              {!searching && query.length >= 2 && results.length === 0 && (
                <div className="mt-4 text-center">
                  <p className="text-base mb-3" style={{ color: "#9B96DA" }}>
                    Aucun résultat pour &quot;{query}&quot;
                  </p>
                </div>
              )}

              {query.length >= 2 && !searching && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={entrieManuellement}
                  className="w-full mt-4 py-3 rounded-2xl font-medium text-base"
                  style={{ background: "rgba(83,49,208,0.15)", color: "#9B96DA", border: "1px dashed rgba(83,49,208,0.4)" }}
                >
                  ✏️ Saisir manuellement &quot;{query}&quot;
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── ÉTAPE 2 : Confirmation + complétion ─── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full max-w-2xl"
          >
            <div className="rounded-3xl p-7" style={{ background: "rgba(10,3,56,0.85)", border: "1.5px solid rgba(83,49,208,0.4)" }}>
              <h2 className="text-2xl font-black mb-2" style={{ color: "#FDFDFE" }}>
                🏪 Confirmez vos informations
              </h2>
              <p className="text-base mb-6" style={{ color: "#9B96DA" }}>
                Vérifiez et complétez les informations de votre magasin.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>NOM DU MAGASIN *</label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                  />
                </div>

                {/* Adresse */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>ADRESSE</label>
                    <input
                      type="text"
                      value={form.adresse}
                      onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="12 rue de la Paix"
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>CODE POSTAL</label>
                    <input
                      type="text"
                      value={form.codePostal}
                      onChange={(e) => setForm((p) => ({ ...p, codePostal: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="75001"
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>VILLE</label>
                    <input
                      type="text"
                      value={form.ville}
                      onChange={(e) => setForm((p) => ({ ...p, ville: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="Paris"
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>EMAIL PROFESSIONNEL *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="contact@monmagasin.fr"
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>TÉLÉPHONE *</label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                      placeholder="01 23 45 67 89"
                      onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                    />
                  </div>
                </div>

                {/* Réseau */}
                <div>
                  <label className="block text-sm font-bold mb-1.5" style={{ color: "#9B96DA" }}>RÉSEAU / ENSEIGNE</label>
                  <select
                    value={form.reseauMutuelle}
                    onChange={(e) => setForm((p) => ({ ...p, reseauMutuelle: e.target.value }))}
                    className={inputClass}
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%239B96DA' stroke-width='2' stroke-linecap='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      backgroundSize: "20px",
                      paddingRight: "40px",
                    } as React.CSSProperties}
                  >
                    {RESEAUX.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {form.siret && (
                  <p className="text-sm" style={{ color: "rgba(155,150,218,0.5)" }}>
                    SIRET : {form.siret}
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 rounded-2xl font-medium"
                  style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA" }}
                >
                  ← Retour
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving || !form.nom || !form.email || !form.telephone}
                  className="flex-2 py-4 rounded-2xl text-white font-bold text-lg"
                  style={{
                    background: saving || !form.nom || !form.email || !form.telephone
                      ? "rgba(155,150,218,0.5)"
                      : "linear-gradient(135deg, #5331D0, #9B96DA)",
                    boxShadow: "0 4px 20px rgba(83,49,208,0.4)",
                  }}
                >
                  {saving ? "Enregistrement..." : "Valider et continuer →"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── ÉTAPE 3 : Succès ─── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl text-center"
          >
            <div className="rounded-3xl p-12" style={{ background: "rgba(10,3,56,0.85)", border: "1.5px solid rgba(83,49,208,0.4)" }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}
              >
                <span className="text-4xl">✓</span>
              </motion.div>
              <h2 className="text-3xl font-black mb-3" style={{ color: "#FDFDFE" }}>
                Bienvenue sur OptiPilot !
              </h2>
              <p className="text-lg" style={{ color: "#9B96DA" }}>
                {form.nom} est configuré. Redirection vers le dashboard...
              </p>
              <div className="mt-6 flex items-center justify-center gap-2" style={{ color: "#5331D0" }}>
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#5331D0" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
