"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import OptiPilotHeader from "@/components/OptiPilotHeader";
import { useApp } from "@/lib/AppContext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

interface Magasin {
  id: string;
  nom: string;
  email?: string | null;
  plan: string;
  createdAt: string;
  _count: { utilisateurs: number; clients: number; devis: number };
}

interface Employe {
  id: string;
  nom: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  createdAt: string;
}

interface StripeInfo {
  statut: string;
  montantMensuel?: number | null;
  dateDebut?: string | null;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  dernierPaiement?: { date: string; montant: number } | null;
  prochainPaiement?: string | null;
}

interface Finances {
  clientsPayants: number;
  mrr: number;
  caEncaisse: number;
  provisionUrssaf: number;
  netEstime: number;
  essaisEnCours: number;
  impayes: number;
  resiliationsCeMois: number;
  prochaineDeclaration: string;
  tauxUrssaf: number;
  declarationFrequence: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("optipilot_token") || "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AdminPage() {
  const router = useRouter();
  const { theme } = useApp();
  const textMain = theme === "dark" ? "#FDFDFE" : "#111827";
  const textMuted = theme === "dark" ? "#9B96DA" : "#6b7280";
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [selected, setSelected] = useState<Magasin | null>(null);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [stripeInfo, setStripeInfo] = useState<StripeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [creation, setCreation] = useState({ nom: "", email: "", motDePasse: "", role: "vendeur" });
  const [finances, setFinances] = useState<Finances | null>(null);
  const [erreurFinances, setErreurFinances] = useState("");
  const [parametresOuvert, setParametresOuvert] = useState(false);
  const [tauxInput, setTauxInput] = useState("0");
  const [frequenceInput, setFrequenceInput] = useState("mensuelle");

  const chargerMagasins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin/magasins`, { headers: authHeaders() });
      if (res.status === 403) { setAutorise(false); return; }
      if (!res.ok) throw new Error("Erreur chargement");
      setMagasins(await res.json());
      setAutorise(true);
    } catch {
      setErreur("Impossible de charger les magasins");
    } finally {
      setLoading(false);
    }
  }, []);

  const chargerFinances = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/admin/finances`, { headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Erreur /api/admin/finances:", res.status, data);
        setErreurFinances(data.error || `Erreur ${res.status}`);
        return;
      }
      const data = await res.json();
      setFinances(data);
      setTauxInput(String(data.tauxUrssaf));
      setFrequenceInput(data.declarationFrequence);
    } catch (e) {
      setErreurFinances(e instanceof Error ? e.message : "Erreur réseau");
    }
  }, []);

  useEffect(() => {
    const userRaw = localStorage.getItem("optipilot_user");
    if (!userRaw) { router.replace("/login"); return; }
    chargerMagasins();
    chargerFinances();
  }, [chargerMagasins, chargerFinances, router]);

  async function sauvegarderFiscalite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND}/api/admin/fiscalite`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ tauxUrssaf: parseFloat(tauxInput) || 0, declarationFrequence: frequenceInput }),
      });
      if (!res.ok) throw new Error();
      setParametresOuvert(false);
      chargerFinances();
    } catch {
      alert("Erreur lors de la sauvegarde");
    }
  }

  async function ouvrirMagasin(m: Magasin) {
    setSelected(m);
    setStripeInfo(null);
    setErreur("");
    try {
      const res = await fetch(`${BACKEND}/api/admin/magasins/${m.id}`, { headers: authHeaders() });
      const data = await res.json();
      setEmployes(data.utilisateurs || []);
    } catch {
      setErreur("Impossible de charger les employés");
    }
  }

  async function chargerStripe(magasinId: string) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/magasins/${magasinId}/stripe`, { headers: authHeaders() });
      setStripeInfo(await res.json());
    } catch {
      setErreur("Impossible de charger le statut Stripe");
    }
  }

  async function reinitialiserMdp(employeId: string) {
    const nouveauMotDePasse = prompt("Nouveau mot de passe (8 caractères min.) :");
    if (!nouveauMotDePasse) return;
    try {
      const res = await fetch(`${BACKEND}/api/admin/utilisateurs/${employeId}/reset-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ nouveauMotDePasse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Mot de passe réinitialisé.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function modifierEmail(employe: Employe) {
    const email = prompt("Nouvel email :", employe.email);
    if (!email || email === employe.email) return;
    try {
      const res = await fetch(`${BACKEND}/api/admin/utilisateurs/${employe.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (selected) ouvrirMagasin(selected);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function supprimerEmploye(employeId: string) {
    if (!confirm("Supprimer définitivement ce compte employé ?")) return;
    try {
      const res = await fetch(`${BACKEND}/api/admin/utilisateurs/${employeId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (selected) ouvrirMagasin(selected);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur — le compte a peut-être des devis liés");
    }
  }

  async function creerEmploye(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await fetch(`${BACKEND}/api/admin/utilisateurs`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...creation, magasinId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreation({ nom: "", email: "", motDePasse: "", role: "vendeur" });
      ouvrirMagasin(selected);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (autorise === false) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <p style={{ color: textMain }}>Accès réservé.</p>
      </div>
    );
  }

  return (
    <div className="page-bg min-h-screen flex flex-col">
      <OptiPilotHeader title="Administration" showBack onBack={() => router.push("/dashboard")} />
      <main className="flex-1 px-6 pb-10 pt-4 w-full max-w-5xl mx-auto">

        {/* ─── Cockpit financier ─── */}
        {erreurFinances && <p className="mb-4 text-sm font-semibold" style={{ color: "#f87171" }}>Cockpit financier indisponible : {erreurFinances}</p>}
        {finances && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: textMain }}>Cockpit financier</h2>
              <button
                onClick={() => setParametresOuvert((o) => !o)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(83,49,208,0.18)", color: "#7B5CE5", border: "1px solid rgba(83,49,208,0.4)" }}
              >
                Paramètres · Fiscalité
              </button>
            </div>

            {parametresOuvert && (
              <form onSubmit={sauvegarderFiscalite} className="rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3" style={{ background: "rgba(10,3,56,0.85)", border: "1.5px solid rgba(83,49,208,0.3)" }}>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: "#9B96DA" }}>Taux URSSAF (%)</label>
                  <input
                    type="number" step="0.1" min="0" max="100"
                    value={tauxInput} onChange={(e) => setTauxInput(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm w-28"
                    style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.4)" }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: "#9B96DA" }}>Fréquence de déclaration</label>
                  <select
                    value={frequenceInput} onChange={(e) => setFrequenceInput(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.4)" }}
                  >
                    <option value="mensuelle">Mensuelle</option>
                    <option value="trimestrielle">Trimestrielle</option>
                  </select>
                </div>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}>
                  Enregistrer
                </button>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
              {[
                { label: "Clients payants", val: finances.clientsPayants },
                { label: "MRR", val: `${finances.mrr.toLocaleString("fr-FR")} €` },
                { label: "CA encaissé ce mois", val: `${finances.caEncaisse.toLocaleString("fr-FR")} €` },
                { label: "URSSAF provisionnée", val: `${finances.provisionUrssaf.toLocaleString("fr-FR")} €` },
                { label: "Net estimé", val: `${finances.netEstime.toLocaleString("fr-FR")} €` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl p-3" style={{ background: "rgba(10,3,56,0.85)", border: "1.5px solid rgba(83,49,208,0.3)" }}>
                  <p className="text-xs mb-1" style={{ color: "#9B96DA" }}>{c.label}</p>
                  <p className="text-lg font-black" style={{ color: "#FDFDFE" }}>{c.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Essais en cours", val: finances.essaisEnCours },
                { label: "Impayés", val: finances.impayes },
                { label: "Résiliations (mois)", val: finances.resiliationsCeMois },
                { label: "Prochaine déclaration", val: new Date(finances.prochaineDeclaration).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) },
              ].map((c) => (
                <div key={c.label} className="rounded-xl p-3" style={{ background: "rgba(10,3,56,0.5)", border: "1px solid rgba(83,49,208,0.2)" }}>
                  <p className="text-xs mb-1" style={{ color: "#9B96DA" }}>{c.label}</p>
                  <p className="text-base font-bold" style={{ color: "#FDFDFE" }}>{c.val}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Liste des magasins */}
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ color: textMain }}>Magasins ({magasins.length})</h2>
          {loading && <p style={{ color: textMuted }}>Chargement…</p>}
          {erreur && <p style={{ color: "#f87171" }}>{erreur}</p>}
          <div className="flex flex-col gap-2">
            {magasins.map((m) => (
              <button
                key={m.id}
                onClick={() => ouvrirMagasin(m)}
                className="text-left rounded-xl p-4"
                style={{
                  background: selected?.id === m.id ? "rgba(83,49,208,0.3)" : "rgba(10,3,56,0.85)",
                  border: `1.5px solid ${selected?.id === m.id ? "#7B5CE5" : "rgba(83,49,208,0.3)"}`,
                }}
              >
                <p className="font-bold" style={{ color: "#FDFDFE" }}>{m.nom}</p>
                <p className="text-xs" style={{ color: "#9B96DA" }}>
                  Plan : {m.plan} · {m._count.utilisateurs} employé(s) · {m._count.clients} client(s) · {m._count.devis} devis
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Détail du magasin sélectionné */}
        <section>
          {!selected ? (
            <p style={{ color: textMuted }}>Sélectionne un magasin pour voir ses employés.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold" style={{ color: textMain }}>{selected.nom}</h2>
                <button
                  onClick={() => chargerStripe(selected.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA" }}
                >
                  Statut Stripe
                </button>
              </div>

              {stripeInfo && (
                <div className="rounded-xl p-3 mb-4 text-xs flex flex-col gap-1" style={{ background: "rgba(83,49,208,0.12)", color: "#a78bfa" }}>
                  <div>Statut : <strong>{stripeInfo.statut}</strong>{stripeInfo.montantMensuel ? <> · {stripeInfo.montantMensuel}€/mois</> : null}</div>
                  {stripeInfo.dateDebut && <div>Début abonnement : {new Date(stripeInfo.dateDebut).toLocaleDateString("fr-FR")}</div>}
                  {stripeInfo.dernierPaiement && <div>Dernier paiement : {stripeInfo.dernierPaiement.montant}€ le {new Date(stripeInfo.dernierPaiement.date).toLocaleDateString("fr-FR")}</div>}
                  {stripeInfo.currentPeriodEnd && <div>Prochain paiement : {new Date(stripeInfo.currentPeriodEnd).toLocaleDateString("fr-FR")}</div>}
                  {stripeInfo.cancelAtPeriodEnd && <div>⚠ Résiliation programmée en fin de période</div>}
                </div>
              )}

              <div className="flex flex-col gap-2 mb-6">
                {employes.map((emp) => (
                  <div key={emp.id} className="rounded-xl p-4" style={{ background: "rgba(10,3,56,0.85)", border: "1.5px solid rgba(83,49,208,0.3)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold" style={{ color: "#FDFDFE" }}>{emp.nom} {emp.isSuperAdmin && "★"}</p>
                        <p className="text-xs" style={{ color: "#9B96DA" }}>{emp.email} · {emp.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => reinitialiserMdp(emp.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA" }}>
                        Réinit. mdp
                      </button>
                      <button onClick={() => modifierEmail(emp)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(83,49,208,0.25)", color: "#9B96DA" }}>
                        Modifier email
                      </button>
                      <button onClick={() => supprimerEmploye(emp.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold mb-2" style={{ color: textMain }}>Créer un employé</h3>
              <form onSubmit={creerEmploye} className="flex flex-col gap-2">
                <input required placeholder="Nom" value={creation.nom} onChange={(e) => setCreation((c) => ({ ...c, nom: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.4)" }} />
                <input required type="email" placeholder="Email" value={creation.email} onChange={(e) => setCreation((c) => ({ ...c, email: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.4)" }} />
                <input required type="password" placeholder="Mot de passe (8+ car.)" value={creation.motDePasse} onChange={(e) => setCreation((c) => ({ ...c, motDePasse: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.4)" }} />
                <select value={creation.role} onChange={(e) => setCreation((c) => ({ ...c, role: e.target.value }))} className="px-3 py-2 rounded-lg text-sm" style={{ background: "#0A0338", color: "#FDFDFE", border: "1px solid rgba(83,49,208,0.4)" }}>
                  <option value="vendeur">Vendeur</option>
                  <option value="admin">Admin magasin</option>
                </select>
                <button type="submit" className="py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #5331D0, #9B96DA)" }}>
                  Créer
                </button>
              </form>
            </>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}
