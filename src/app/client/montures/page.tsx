"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Monture {
  id: string | number;
  reference: string;
  codeEAN?: string;
  marque: string;
  modele: string;
  couleur?: string;
  matiere?: string;
  prixVente: number;
  stock: number;
  genre?: string;
  taille?: string;
  imageUrl?: string;
}

const GENRE_LABELS: Record<string, string> = {
  tout:    "Tous",
  homme:   "Homme",
  femme:   "Femme",
  enfant:  "Enfant",
  mixte:   "Mixte",
};

function GlassesIcon({ size = 72, color = "#5331D0" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={Math.round(size * 0.56)} viewBox="0 0 72 40" fill="none">
      <rect x="2" y="8" width="28" height="22" rx="10" stroke={color} strokeWidth="3" />
      <rect x="42" y="8" width="28" height="22" rx="10" stroke={color} strokeWidth="3" />
      <path d="M30 19h12" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M2 19H0M70 19h2" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-4 py-3 rounded-xl"
      style={{ background: "rgba(83,49,208,0.15)", border: "1px solid rgba(83,49,208,0.25)" }}
    >
      <p className="text-xs font-semibold" style={{ color: "#9B96DA" }}>{label}</p>
      <p className="text-base font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}

export default function MonturesClientPage() {
  const router = useRouter();
  const [montures, setMontures] = useState<Monture[]>([]);
  const [loading, setLoading] = useState(true);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("tout");
  const [selected, setSelected] = useState<Monture | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/montures")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setMontures(data.montures ?? []);
        } else {
          setBridgeError(data.error || "Données non disponibles");
        }
      })
      .catch(() => setBridgeError("Bridge non connecté"))
      .finally(() => setLoading(false));
  }, []);

  const brands = useMemo(() => [...new Set(montures.map((m) => m.marque))].sort(), [montures]);

  const filtered = useMemo(() => {
    return montures.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        m.marque?.toLowerCase().includes(q) ||
        m.modele?.toLowerCase().includes(q) ||
        m.couleur?.toLowerCase().includes(q) ||
        m.reference?.toLowerCase().includes(q);
      const matchGenre = genreFilter === "tout" || m.genre === genreFilter;
      return matchSearch && matchGenre;
    });
  }, [montures, search, genreFilter]);

  return (
    <div className="page-bg min-h-screen">
      {/* ── Header sticky ── */}
      <div
        className="sticky top-0 z-20 px-4 pt-5 pb-3"
        style={{ background: "rgba(2,0,23,0.97)", backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-base font-semibold"
            style={{ background: "rgba(83,49,208,0.28)", color: "#9B96DA" }}
          >
            ← Retour
          </motion.button>
          <h1 className="flex-1 text-2xl font-black" style={{ color: "#FDFDFE" }}>
            Nos montures
          </h1>
          {!loading && !bridgeError && (
            <span
              className="text-sm font-semibold px-3 py-1 rounded-lg"
              style={{ background: "rgba(83,49,208,0.25)", color: "#c4b5fd" }}
            >
              {filtered.length} modèle{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Barre de recherche */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Marque, modèle, couleur, référence…"
          className="w-full px-4 py-3 rounded-2xl text-base outline-none"
          style={{
            background: "rgba(83,49,208,0.18)",
            color: "#FDFDFE",
            border: "1px solid rgba(155,150,218,0.18)",
          }}
        />

        {/* Filtres genre */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {Object.entries(GENRE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGenreFilter(key)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              style={{
                background: genreFilter === key ? "#5331D0" : "rgba(83,49,208,0.18)",
                color: genreFilter === key ? "#fff" : "#9B96DA",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ── */}
      <main className="px-4 pb-10 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="w-10 h-10 rounded-full mb-6"
              style={{ border: "3px solid rgba(83,49,208,0.3)", borderTopColor: "#5331D0" }}
            />
            <p className="text-lg font-semibold" style={{ color: "#C4C1EA" }}>
              Chargement du catalogue…
            </p>
          </div>
        ) : bridgeError ? (
          <div className="text-center py-32 px-8">
            <div className="text-7xl mb-5">🔌</div>
            <p className="text-2xl font-black text-white mb-2">Catalogue non disponible</p>
            <p className="text-base" style={{ color: "#9B96DA" }}>
              {bridgeError}
            </p>
            <p className="text-sm mt-2" style={{ color: "#6B5E9A" }}>
              Le bridge Optimum doit être démarré sur le PC du magasin
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32">
            <div className="text-7xl mb-5">🔍</div>
            <p className="text-2xl font-black text-white mb-2">Aucune monture</p>
            <p style={{ color: "#9B96DA" }}>Essayez d&apos;autres filtres</p>
            {brands.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {brands.slice(0, 8).map((b) => (
                  <button
                    key={b}
                    onClick={() => { setSearch(b); setGenreFilter("tout"); }}
                    className="px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: "rgba(83,49,208,0.25)", color: "#c4b5fd" }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((m, i) => (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.6) }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(m)}
                className="rounded-2xl overflow-hidden text-left"
                style={{
                  background: "rgba(8,2,40,0.96)",
                  border: "1px solid rgba(83,49,208,0.28)",
                }}
              >
                {/* Image */}
                <div
                  className="w-full flex items-center justify-center"
                  style={{ background: "rgba(83,49,208,0.07)", aspectRatio: "4/3" }}
                >
                  {m.imageUrl ? (
                    <img
                      src={m.imageUrl}
                      alt={`${m.marque} ${m.modele}`}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <GlassesIcon size={70} color="rgba(83,49,208,0.55)" />
                  )}
                </div>

                {/* Infos */}
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#7B5CE5" }}>
                    {m.marque}
                  </p>
                  <p className="text-base font-black text-white mt-0.5 leading-tight">
                    {m.modele}
                  </p>
                  {m.couleur && (
                    <p className="text-sm mt-1" style={{ color: "#C4C1EA" }}>
                      {m.couleur}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xl font-black" style={{ color: "#c4b5fd" }}>
                      {m.prixVente}€
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{
                        background:
                          m.stock > 0
                            ? "rgba(34,197,94,0.14)"
                            : "rgba(239,68,68,0.12)",
                        color: m.stock > 0 ? "#4ade80" : "#f87171",
                      }}
                    >
                      {m.stock > 0 ? "En stock" : "Sur cde"}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>

      {/* ── Fiche détail (bottom sheet) ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="detail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(2,0,23,0.82)", backdropFilter: "blur(12px)" }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              key="detail-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="w-full max-w-2xl rounded-t-3xl p-8 pb-10"
              style={{
                background: "rgba(8,2,40,0.99)",
                border: "1.5px solid rgba(83,49,208,0.45)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div
                className="w-12 h-1.5 rounded-full mx-auto mb-6"
                style={{ background: "rgba(155,150,218,0.35)" }}
              />

              {/* Image */}
              <div
                className="w-full h-52 flex items-center justify-center rounded-2xl mb-6"
                style={{ background: "rgba(83,49,208,0.08)" }}
              >
                {selected.imageUrl ? (
                  <img
                    src={selected.imageUrl}
                    alt={`${selected.marque} ${selected.modele}`}
                    className="h-full object-contain p-4"
                  />
                ) : (
                  <GlassesIcon size={110} color="rgba(83,49,208,0.5)" />
                )}
              </div>

              {/* Marque + modèle */}
              <p
                className="text-sm font-bold uppercase tracking-wider mb-1"
                style={{ color: "#7B5CE5" }}
              >
                {selected.marque}
              </p>
              <h2 className="text-3xl font-black text-white">{selected.modele}</h2>

              {/* Grille de détails */}
              <div className="grid grid-cols-2 gap-3 my-5">
                {selected.couleur && <DetailChip label="Couleur" value={selected.couleur} />}
                {selected.matiere && <DetailChip label="Matière" value={selected.matiere} />}
                {selected.taille && <DetailChip label="Taille" value={selected.taille} />}
                {selected.genre && (
                  <DetailChip
                    label="Pour"
                    value={GENRE_LABELS[selected.genre] ?? selected.genre}
                  />
                )}
                {selected.reference && (
                  <DetailChip label="Référence" value={selected.reference} />
                )}
                {selected.codeEAN && <DetailChip label="Code EAN" value={selected.codeEAN} />}
              </div>

              {/* Prix + stock */}
              <div
                className="flex items-center justify-between py-5 border-t border-b"
                style={{ borderColor: "rgba(83,49,208,0.28)" }}
              >
                <div>
                  <p className="text-sm" style={{ color: "#9B96DA" }}>
                    Prix
                  </p>
                  <p className="text-4xl font-black" style={{ color: "#c4b5fd" }}>
                    {selected.prixVente}€
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: "#9B96DA" }}>
                    Disponibilité
                  </p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: selected.stock > 0 ? "#4ade80" : "#f87171" }}
                  >
                    {selected.stock > 0
                      ? `${selected.stock} en stock`
                      : "Sur commande"}
                  </p>
                </div>
              </div>

              <p
                className="text-center mt-6 text-base"
                style={{ color: "#9B96DA" }}
              >
                Demandez à votre opticien pour l&apos;essayer 😊
              </p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(null)}
                className="w-full mt-4 py-4 rounded-2xl text-base font-bold"
                style={{ background: "rgba(83,49,208,0.28)", color: "#DDDAF5" }}
              >
                Fermer
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
