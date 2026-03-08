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
    borderColor: "rgba(83,49,208,0.35)",
    background: "rgba(2,0,23,0.7)",
    color: "#FDFDFE",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#020017" }}>
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
          style={{ background: "#0A0338" }}
        >
          <h2 className="text-xl font-bold mb-1" style={{ color: "#FDFDFE" }}>
            Informations client
          </h2>
          <p className="text-base mb-6" style={{ color: "#9B96DA" }}>
            Ces données seront liées au devis
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#FDFDFE" }}>
                  Prénom *
                </label>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => update("prenom", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Marie"
                  onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#FDFDFE" }}>
                  Nom *
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => update("nom", e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Dupont"
                  onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#FDFDFE" }}>
                Date de naissance
              </label>
              <input
                type="date"
                value={form.dateNaissance}
                onChange={(e) => update("dateNaissance", e.target.value)}
                className={inputClass}
                style={{ ...inputStyle, colorScheme: "light" }}
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#FDFDFE" }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="marie.dupont@exemple.fr"
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#FDFDFE" }}>
                Téléphone
              </label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => update("telephone", e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="06 12 34 56 78"
                onFocus={(e) => (e.target.style.borderColor = "#5331D0")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(83,49,208,0.35)")}
              />
            </div>

            <div className="flex gap-3 mt-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => router.push("/scanner")}
                className="flex-1 py-4 rounded-2xl font-medium"
                style={{ background: "rgba(10,3,56,0.8)", color: "#9B96DA" }}
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
                      ? "rgba(155,150,218,0.6)"
                      : "linear-gradient(135deg, #5331D0, #9B96DA)",
                  boxShadow: !form.nom || !form.prenom ? "none" : "0 4px 20px rgba(83,49,208,0.5)",
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
