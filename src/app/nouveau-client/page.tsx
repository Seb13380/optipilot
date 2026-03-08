"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import OptiPilotHeader from "@/components/OptiPilotHeader";

interface ClientForm {
  nom: string;
  prenom: string;
  dateNaissance: string;
  email: string;
  telephone: string;
}

export default function NouveauClientPage() {
  const router = useRouter();
  const [form, setForm] = useState<ClientForm>({
    nom: "",
    prenom: "",
    dateNaissance: "",
    email: "",
    telephone: "",
  });
  const [loading, setLoading] = useState(false);

  function update(field: keyof ClientForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.prenom) return;

    setLoading(true);
    localStorage.setItem("optipilot_client", JSON.stringify(form));

    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          magasinId: "demo-magasin",
        }),
      });
    } catch {
      // Mode démo : continuer sans backend
    }

    setLoading(false);
    router.push("/scanner");
  }

  const inputClass =
    "w-full px-4 py-4 rounded-2xl text-base border-2 outline-none transition-all";
  const inputStyle = {
    borderColor: "#e5e7eb",
    background: "#f9fafb",
    color: "#1a1a2e",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f0f4f8" }}>
      <OptiPilotHeader
        title="Nouveau Client"
        showBack
        onBack={() => router.push("/dashboard")}
      />

      <main className="flex-1 px-6 pb-8 pt-5 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 shadow-sm"
          style={{ background: "white" }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>
            Informations client
          </h2>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
            Ces données seront liées au devis
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Prénom *
                </label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => update("prenom", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Marie"
                  onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                  Nom *
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => update("nom", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Dupont"
                  onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Date de naissance
              </label>
              <input
                type="date"
                value={form.dateNaissance}
                onChange={(e) => update("dateNaissance", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, colorScheme: "light" }}
                onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="marie.dupont@exemple.fr"
                onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Téléphone
              </label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => update("telephone", e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="06 12 34 56 78"
                onFocus={(e) => (e.target.style.borderColor = "#1e3a8a")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </div>

            <div className="flex gap-3 mt-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => router.push("/scanner")}
                className="flex-1 py-4 rounded-2xl font-medium"
                style={{ background: "#f3f4f6", color: "#6b7280" }}
              >
                Passer
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading || !form.nom || !form.prenom}
                className="flex-[2] py-4 rounded-2xl text-white font-semibold"
                style={{
                  background:
                    !form.nom || !form.prenom
                      ? "#9ca3af"
                      : "linear-gradient(135deg, #1e3a8a, #3b5fc0)",
                  boxShadow: !form.nom || !form.prenom ? "none" : "0 4px 20px rgba(30,58,138,0.35)",
                }}
              >
                {loading ? "Enregistrement..." : "Continuer →"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
