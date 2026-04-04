"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ─── Offre Fondateur — modifier ces deux valeurs ──────────
const FOUNDER_DEADLINE = new Date("2026-04-30T23:59:59");
const FOUNDER_PLACES_LEFT = 7; // places restantes sur 10

// ─── Animated counter ─────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = value / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [inView, value]);
  return <span ref={ref}>{display.toLocaleString("fr-FR")}{suffix}</span>;
}

// ─── Countdown ────────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return time;
}

// ─── Fade-in-up wrapper ───────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Fade-in depuis la gauche ─────────────────────────────
function RevealLeft({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -44 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Fade-in depuis la droite ─────────────────────────────
function RevealRight({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: 44 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Fade-in-up + hover lift (cartes interactives) ────────
function RevealCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      whileHover={{ y: -6, transition: { duration: 0.22, ease: "easeOut" } }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(83,49,208,0.2)", background: "#fff" }}
    >
      <button
        className="w-full flex items-center justify-between px-6 py-5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-base font-bold" style={{ color: "#1C0B62" }}>{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-2xl font-thin ml-4 shrink-0"
          style={{ color: "#5331D0" }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-6 pb-5"
          >
            <p className="text-base leading-relaxed" style={{ color: "#4b5563" }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Founder Banner ──────────────────────────────────────
function FounderBanner() {
  const { days, hours, minutes, seconds } = useCountdown(FOUNDER_DEADLINE);
  const expired = days === 0 && hours === 0 && minutes === 0 && seconds === 0;
  if (expired) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="py-3 px-6" style={{ background: "linear-gradient(90deg, #5331D0 0%, #a855f7 100%)" }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-base">Offre Fondateur — 199€/mois à vie</span>
          <span className="text-white/70 text-sm hidden sm:inline">·</span>
          <span className="text-white/70 text-sm">{FOUNDER_PLACES_LEFT} places restantes sur 10</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { val: pad(days), label: "j" },
            { val: pad(hours), label: "h" },
            { val: pad(minutes), label: "min" },
            { val: pad(seconds), label: "s" },
          ].map(({ val, label }, i) => (
            <div key={i} className="flex items-center gap-1">
              <span
                className="font-black text-white text-sm tabular-nums px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.18)", minWidth: "2rem", display: "inline-block", textAlign: "center" }}
              >
                {val}
              </span>
              <span className="text-white/60 text-xs">{label}</span>
              {i < 3 && <span className="text-white/50 font-bold text-sm">:</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [navScrolled, setNavScrolled] = useState(false);
  const [demoSent, setDemoSent] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [demoForm, setDemoForm] = useState({ nom: "", email: "", magasin: "", tel: "" });
  const demoRef = useRef<HTMLElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("optipilot_token");
    if (token) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function scrollToDemo() {
    demoRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDemoLoading(true);
    setDemoError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
      setDemoSent(true);
    } catch (err: unknown) {
      setDemoError(err instanceof Error ? err.message : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <>
      {/* ─── JSON-LD structured data ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                "@id": "https://optipilot.fr/#app",
                name: "OptiPilot",
                url: "https://optipilot.fr",
                description:
                  "Logiciel IA pour opticiens indépendants. Scanner d'ordonnances, recommandations personnalisées, calcul mutuelle en temps réel, relances automatiques.",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web, iOS, Android",
                offers: {
                  "@type": "Offer",
                  price: "249",
                  priceCurrency: "EUR",
                  description: "Plan Pro — accès complet, essai gratuit 30 jours",
                },
                publisher: {
                  "@type": "Organization",
                  name: "SG Digital Web",
                  url: "https://optipilot.fr",
                },
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: "Comment fonctionne l'essai gratuit OptiPilot ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "L'essai gratuit dure 30 jours avec accès complet à toutes les fonctionnalités. Aucune carte bancaire requise à l'inscription. À l'issue de la période, vous choisissez librement de continuer ou non.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "OptiPilot remplace-t-il mon logiciel de gestion actuel ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "OptiPilot est un outil complémentaire : il s'intègre dans votre flux de travail pour la phase de consultation et de vente (scan ordonnance, recommandations, devis). Il n'est pas un logiciel de comptabilité ou de gestion de stock.",
                    },
                  },
                  {
                    "@type": "Question",
                    name: "Les données de mes clients sont-elles sécurisées ?",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: "Oui. OptiPilot est conforme RGPD. Toutes les données sont chiffrées en transit (HTTPS) et au repos. Elles sont hébergées en Europe et ne sont jamais revendues ou partagées avec des tiers.",
                    },
                  },
                ],
              },
            ],
          }),
        }}
      />

      <div style={{ background: "var(--background)", color: "var(--foreground)", overflowX: "hidden" }}>

        {/* ══════════════════════════ NAVBAR ══════════════════════════ */}
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
          style={{
            background: navScrolled ? "rgba(248,248,255,0.92)" : "transparent",
            backdropFilter: navScrolled ? "blur(16px)" : "none",
            borderBottom: navScrolled ? "1px solid rgba(83,49,208,0.12)" : "none",
            transition: "background 0.3s, border-color 0.3s",
          }}
        >
          <a href="/" className="flex items-center gap-3" aria-label="OptiPilot — Accueil">
            <Image
              src="/assets/images/Logo-OptiPilot.png"
              alt="OptiPilot logo"
              width={40}
              height={40}
              className="object-contain"
              style={{ filter: "drop-shadow(0 0 10px rgba(83,49,208,0.4))" }}
            />
            <span className="text-xl font-black" style={{ color: "#1C0B62" }}>OptiPilot</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {[["Problème", "#probleme"], ["Solution", "#solution"], ["Tarifs", "#tarifs"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm font-semibold transition-colors hover:text-purple-700"
                style={{ color: "#374151" }}
              >
                {label}
              </a>
            ))}
          </div>

          <a
            href="/login"
            className="hidden sm:inline-flex text-sm font-bold px-4 py-2 rounded-xl transition-colors"
            style={{ color: "#5331D0", border: "1px solid rgba(83,49,208,0.3)" }}
          >
            Connexion
          </a>
        </motion.nav>

        {/* ══════════════════════════ HERO ══════════════════════════ */}
        <section
          id="hero"
          className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 10%, rgba(83,49,208,0.12) 0%, transparent 70%)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-8"
              style={{ background: "rgba(83,49,208,0.1)", color: "#5331D0", border: "1px solid rgba(83,49,208,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="none"/><path d="M9 7h2v2H9zm0 4h2v6H9zm4-4h2v2h-2zm0 4h2v6h-2z" fill="none"/><circle cx="12" cy="12" r="10" stroke="#5331D0" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" stroke="#5331D0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Conçu par un opticien diplômé · Pour les indépendants
            </motion.span>

            {/* Accroche principale */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.08] mb-6" style={{ color: "#1C0B62" }}>
              Redevenez opticien.
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #5331D0 0%, #a855f7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                OptiPilot s'occupe du reste.
              </span>
            </h1>

            {/* Sous-titre */}
            <p className="text-lg md:text-xl mb-3 max-w-2xl mx-auto leading-relaxed" style={{ color: "#374151" }}>
              Vous passez trop de temps sur les prises en charge, pas assez à vendre.
            </p>
            <p className="text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed" style={{ color: "#6b7280" }}>
              Pendant qu&apos;OptiPilot gère mutuelles et devis, vous faites ce que vous aimez&nbsp;: soigner et conseiller vos clients.
            </p>

            {/* Proof stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 mb-10"
            >
              {[
                { stat: "Jusqu'à 2h gagnées / jour", detail: "= 2 à 4 clients en plus" },
                { stat: "1 600 € gagnés / mois", detail: "soit +19 000 € par an en moyenne" },
              ].map((item, i) => (
                <div key={i} className="px-5 py-3 rounded-2xl" style={{ background: "rgba(83,49,208,0.08)", border: "1px solid rgba(83,49,208,0.18)" }}>
                  <p className="text-base font-black" style={{ color: "#5331D0" }}>{item.stat}</p>
                  <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>{item.detail}</p>
                </div>
              ))}
            </motion.div>

            {/* CTA unique */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col items-center gap-3 mb-10"
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -3 }}
                onClick={scrollToDemo}
                className="w-full sm:w-auto text-xl font-black px-10 py-5 rounded-2xl text-white flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #5331D0, #7B5CE5)",
                  boxShadow: "0 8px 28px rgba(83,49,208,0.45)",
                }}
              >
                Demander une démo gratuite
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </motion.button>
              <a href="/login" className="text-sm font-semibold transition-colors" style={{ color: "rgba(83,49,208,0.6)" }}>
                Déjà inscrit ? Se connecter →
              </a>
            </motion.div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-5">
              {["✓ Essai gratuit 30 jours", "✓ Sans engagement", "✓ Sans carte bancaire", "✓ Données hébergées en France (RGPD)"].map((badge, i) => (
                <motion.span
                  key={badge}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.85 + i * 0.1 }}
                  className="text-sm font-semibold"
                  style={{ color: "#6b7280" }}
                >
                  {badge}
                </motion.span>
              ))}
            </div>


          </motion.div>
        </section>

        {/* ══════════════════════════ BANNIÈRE OFFRE FONDATEUR ══════════════════════════ */}
        <FounderBanner />

        {/* ══════════════════════════ VIDÉO EXPLAINER ══════════════════════════ */}
        <section className="py-16 px-6" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(83,49,208,0.04) 50%, transparent 100%)" }}>
          <div className="max-w-3xl mx-auto">
            <Reveal>
              {/* En-tête */}
              <div className="text-center mb-8">
                <p className="text-sm font-black uppercase tracking-widest mb-2" style={{ color: "#5331D0" }}>Présentation</p>
                <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ color: "#1C0B62" }}>
                  Je vous explique{" "}
                  <span style={{ background: "linear-gradient(135deg, #5331D0 0%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    OptiPilot
                  </span>
                </h2>
                <p className="text-lg" style={{ color: "#6b7280" }}>
                  Découvrez comment OptiPilot transforme votre quotidien en quelques minutes.
                </p>
              </div>

              {/* Player vidéo */}
              <div
                className="rounded-3xl overflow-hidden relative"
                style={{
                  background: "#0a0338",
                  border: "2px solid rgba(83,49,208,0.35)",
                  boxShadow: "0 20px 60px rgba(83,49,208,0.25), 0 4px 20px rgba(0,0,0,0.15)",
                  padding: "3px",
                }}
              >
                <div className="rounded-3xl overflow-hidden" style={{ background: "#000" }}>
                  <video
                    controls
                    playsInline
                    className="w-full block"
                    style={{ maxHeight: "480px", objectFit: "contain" }}
                    preload="metadata"
                  >
                    <source src="/assets/videos/OptiPilot%20_%20Le%20futur%20de%20l'optique_1080p_caption.mp4" type="video/mp4" />
                    Votre navigateur ne supporte pas la lecture vidéo.
                  </video>
                </div>
              </div>


            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════ PROBLÈME ══════════════════════════ */}
        <section id="probleme" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#5331D0" }}>Le constat</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4" style={{ color: "#1C0B62" }}>
                Vous reconnaissez-vous dans ces situations&nbsp;?
              </h2>
              <p className="text-center text-lg mb-14" style={{ color: "#6b7280" }}>
                Chaque minute perdue sur une PEC, c&apos;est un client de moins. Chaque devis sans relance, c&apos;est du chiffre d&apos;affaires qui s&apos;évapore.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "Jusqu'à 10 minutes perdues par client — pour de la saisie administrative",
                  desc: "Ordonnance recopieé à la main. Remboursements calculés un par un. Devis assemblé manuellement. Sur 10 clients par jour, c'est près de 2 heures que vous ne passerez pas avec vos clients. Les grandes enseignes ont automatisé tout ça. OptiPilot vous donne le même avantage.",
                  accent: "#ef4444",
                },
                {
                  icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 22 17 22 11" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "1 devis sur 3 s'évapore — sans jamais être relancé",
                  desc: "Le client « réfléchit » et ne revient pas. Sans relance structurée, ce chiffre d'affaires est définitivement perdu.",
                  accent: "#f59e0b",
                },
                {
                  icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "Optic 2000, Krys, Afflelou investissent. L'écart se creuse.",
                  desc: "Les grandes enseignes investissent dans des outils numériques. L'optique indépendante peine à offrir la même fluidité, la même confiance client.",
                  accent: "#8b5cf6",
                },
              ].map((item, i) => (
                <RevealCard key={i} delay={i * 0.1}>
                  <div
                    className="rounded-3xl p-7 h-full"
                    style={{
                      background: "#fff",
                      border: `1.5px solid ${item.accent}30`,
                      boxShadow: `0 4px 24px ${item.accent}10`,
                    }}
                  >
                    <div>{item.icon}</div>
                    <h3 className="text-xl font-black mt-4 mb-3" style={{ color: "#1C0B62" }}>{item.title}</h3>
                    <p className="text-base leading-relaxed" style={{ color: "#6b7280" }}>{item.desc}</p>
                  </div>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════ SOLUTION ══════════════════════════ */}
        <section
          id="solution"
          className="py-20 px-6"
          style={{ background: "linear-gradient(160deg, #0a0318 0%, #1e1b4b 50%, #2e1d6e 100%)" }}
        >
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#a89cf7" }}>La solution</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4 text-white">
                OptiPilot automatise ce qui prend du temps
              </h2>
              <p className="text-center text-lg mb-16" style={{ color: "#9B96DA" }}>
                Pour que vous puissiez vous concentrer sur ce qui compte vraiment&nbsp;: votre expertise et votre client.
              </p>
            </Reveal>

            <div className="flex flex-col gap-8">
              {[
                {
                  step: "01",
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5"/></svg>,
                  title: "Scannez l'ordonnance en 10 secondes",
                  desc: "L'IA lit et extrait toutes les données optométriques (sphère, cylindre, addition, axe) directement depuis la photo. Fini la saisie manuelle.",
                  color: "#5331D0",
                },
                {
                  step: "02",
                  icon: <img src="/assets/images/IA_Optipilot.png" alt="IA OptiPilot" width={48} height={48} style={{ objectFit: "cover", borderRadius: 8 }} />,
                  title: "OptiPilot construit 3 devis sur-mesure — argumentés et prêts à présenter",
                  desc: "OptiPilot croise l'ordonnance, les habitudes de vie (conduite de nuit, sport, écrans) et le budget de votre client. Il génère 3 offres prêtes à présenter — avec les arguments pour chaque. Vous n'avez plus qu'à guider le choix.",
                  color: "#7c3aed",
                },
                {
                  step: "03",
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="white" strokeWidth="1.5"/><line x1="12" y1="18" x2="12.01" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>,
                  title: "Présentez le devis en live sur tablette",
                  desc: "Retournez la tablette. Votre client voit ses remboursements en temps réel, son reste à charge au centime près. La transparence crée la confiance. La confiance crée la vente. Et le client qui comprend son remboursement choisit souvent la meilleure option.",
                  color: "#a855f7",
                },
                {
                  step: "04",
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "Relancez automatiquement les devis oubliés",
                  desc: "OptiPilot détecte les devis sans réponse et vous alerte. Chaque relance au bon moment, sans effort. Plus aucun potentiel client ne tombe dans l'oubli.",
                  color: "#c084fc",
                },
              ].map((item, i) => {
                const Rev = i % 2 === 0 ? RevealLeft : RevealRight;
                return (
                <Rev key={i} delay={i * 0.1}>
                  <div
                    className="flex flex-col sm:flex-row items-start gap-6 p-7 rounded-3xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(155,150,218,0.15)",
                    }}
                  >
                    <div
                      className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                      style={{ background: `${item.color}25`, border: `1.5px solid ${item.color}40` }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-black" style={{ color: item.color }}>ÉTAPE {item.step}</span>
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">{item.title}</h3>
                      <p className="text-base leading-relaxed" style={{ color: "#9B96DA" }}>{item.desc}</p>
                    </div>
                  </div>
                </Rev>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════ COMPATIBILITÉ LOGICIELS ══════════════════════════ */}
        <section className="py-14 px-6" style={{ background: "linear-gradient(160deg, #0a0318 0%, #1e1b4b 100%)" }}>
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#a89cf7" }}>Compatibilité</p>
              <h2 className="text-2xl md:text-3xl font-black text-center mb-3 text-white">Compatible avec votre logiciel actuel</h2>
              <p className="text-center text-base mb-10" style={{ color: "#9B96DA" }}>
                OptiPilot ne remplace pas votre logiciel opticien — il le complète. Il fonctionne en parallèle de votre outil :
                              </p>
            </Reveal>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {["Optimum", "BB Soft", "iGest", "GEO Optique", "Optosoftware"].map((name) => (
                <div key={name} className="px-6 py-3 rounded-2xl font-bold text-white text-sm" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(155,150,218,0.25)" }}>{name}</div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: "rgba(155,150,218,0.5)" }}>
              Votre logiciel n&apos;est pas dans la liste ?{" "}
              <a href="#demo" onClick={(e) => { e.preventDefault(); scrollToDemo(); }} className="underline hover:text-white transition-colors">Parlez-nous-en lors de votre démo.</a>
            </p>
          </div>
        </section>

        {/* ══════════════════════════ CHIFFRES CLÉS ══════════════════════════ */}
        <section
          id="chiffres"
          className="py-20 px-6"
          style={{ background: "linear-gradient(135deg, #5331D0 0%, #7B5CE5 50%, #a855f7 100%)" }}
        >
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4 text-white">
                Ce que les opticiens gagnent avec OptiPilot
              </h2>
              <p className="text-center text-lg mb-16" style={{ color: "rgba(255,255,255,0.7)" }}>
                Estimations basées sur les données réelles du secteur optique indépendant français (Synom, FNO 2024).
              </p>
            </Reveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: 6, suffix: " min", label: "par dossier avec OptiPilot", sub: "au lieu de 10 à 16 min sans outil" },
                { value: 15, suffix: "%", label: "de panier moyen en plus", sub: "grâce aux recommandations personnalisées" },
                { value: 1500, suffix: "€", label: "de chiffre d'affaires en plus / mois", sub: "estimation conservative pour 10 ventes/jour" },
                { value: 22, suffix: "h", label: "libérées par mois", sub: "pour vos clients, votre famille, votre développement" },
              ].map((item, i) => (
                <RevealCard key={i} delay={i * 0.08}>
                  <div
                    className="rounded-3xl p-7 flex flex-col items-center text-center"
                    style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    <span className="text-4xl md:text-5xl font-black text-white">
                      <AnimatedNumber value={item.value} suffix={item.suffix} />
                    </span>
                    <p className="text-base font-bold mt-2 text-white">{item.label}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>{item.sub}</p>
                  </div>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════ FONCTIONNALITÉS ══════════════════════════ */}
        <section id="fonctionnalites" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#5331D0" }}>Fonctionnalités</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4" style={{ color: "#1C0B62" }}>
                Tout ce dont vous avez besoin, rien de superflu
              </h2>
              <p className="text-center text-lg mb-14" style={{ color: "#6b7280" }}>
                Conçu par et pour des opticiens indépendants.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="#5331D0" strokeWidth="1.5"/></svg>, title: "Scanner d'ordonnances par IA", desc: "Extraction automatique de toutes les données en moins de 10 secondes." },
                { icon: <img src="/assets/images/IA_Optipilot.png" alt="IA OptiPilot" width={28} height={28} style={{ borderRadius: 6 }} />, title: "Recommandations personnalisées", desc: "3 offres adaptées au profil visuel, aux habitudes de vie et au budget du client." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Calcul mutuelle en temps réel", desc: "Remboursements Sécu et mutuelle calculés automatiquement selon les tarifs LPPR." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="#5331D0" strokeWidth="1.5"/><line x1="12" y1="18" x2="12.01" y2="18" stroke="#5331D0" strokeWidth="2" strokeLinecap="round"/></svg>, title: "Mode tablette client", desc: "Interface premium pour présenter le devis directement au client, face à face." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Relances automatisées", desc: "Aucun devis n'est oublié. Alertes intelligentes sur les dossiers sans réponse." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="12" width="4" height="9" rx="1" stroke="#5331D0" strokeWidth="1.5"/><rect x="10" y="7" width="4" height="14" rx="1" stroke="#5331D0" strokeWidth="1.5"/><rect x="17" y="3" width="4" height="18" rx="1" stroke="#5331D0" strokeWidth="1.5"/></svg>, title: "Tableau de bord ROI", desc: "Consultez votre impact en direct : temps libéré, CA généré, taux de conversion." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="#5331D0" strokeWidth="1.5"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Multi-opticiens par magasin", desc: "Chaque opticien a son propre accès. Gestion d'équipe intégrée." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: "Historique client complet", desc: "Ordonnances, devis, ventes, tout est archivé et consultable en un clic." },
                { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="#5331D0" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="#5331D0" strokeWidth="1.5" strokeLinecap="round"/></svg>, title: "Comparateur de verres", desc: "Guide visuel illustré pour aider le client à comprendre les différences entre verres." },
              ].map((item, i) => (
                <RevealCard key={i} delay={(i % 3) * 0.08}>
                  <div
                    className="rounded-2xl p-6 h-full"
                    style={{
                      background: "#fff",
                      border: "1.5px solid rgba(83,49,208,0.12)",
                      boxShadow: "0 2px 12px rgba(83,49,208,0.06)",
                    }}
                  >
                    <div>{item.icon}</div>
                    <h3 className="text-base font-black mt-3 mb-1.5" style={{ color: "#1C0B62" }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{item.desc}</p>
                  </div>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════ TARIFS ══════════════════════════ */}
        <section
          id="tarifs"
          className="py-20 px-6"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(83,49,208,0.08) 0%, transparent 70%)",
          }}
        >
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#5331D0" }}>Tarifs</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4" style={{ color: "#1C0B62" }}>
                Simple et transparent
              </h2>
              <p className="text-center text-lg mb-14" style={{ color: "#6b7280" }}>
                Deux formules selon vos besoins. Rentabilisé en 1 à 2 ventes supplémentaires par mois.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

              {/* ── Plan Standard ── */}
              <RevealLeft delay={0.1}>
                <div
                  className="rounded-3xl p-8 h-full flex flex-col"
                  style={{
                    background: "linear-gradient(160deg, #0a0318 0%, #1a1440 100%)",
                    border: "1.5px solid rgba(83,49,208,0.4)",
                  }}
                >
                  <div className="mb-6">
                    <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#9B96DA" }}>Standard</p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-5xl font-black text-white">249</span>
                      <span className="text-2xl font-bold mb-1" style={{ color: "#9B96DA" }}>€</span>
                      <span className="text-base mb-1.5 ml-1" style={{ color: "#9B96DA" }}>/&nbsp;mois</span>
                    </div>
                    <p className="text-sm" style={{ color: "rgba(155,150,218,0.55)" }}>L&apos;essentiel pour équiper votre point de vente</p>
                  </div>

                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {[
                      "Scan ordonnance IA illimité",
                      "Analyse automatique (myopie, astigmatisme, presbytie…)",
                      "Questionnaire client intelligent",
                      "Génération de 3 devis (Essentiel / Confort / Premium)",
                      "Calcul reste à charge Sécu + mutuelle",
                      "Export PDF et dossier client",
                      "Copilote IA pendant la vente",
                      "Interface optimisée tablette",
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-3">
                        <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4.5" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: "#DDDAF5" }}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    onClick={scrollToDemo}
                    className="w-full py-4 rounded-2xl text-base font-bold text-white"
                    style={{ background: "rgba(83,49,208,0.55)", border: "2px solid rgba(83,49,208,0.6)" }}
                  >
                    Démarrer l&apos;essai gratuit
                  </motion.button>
                </div>
              </RevealLeft>

              {/* ── Plan Premium ── */}
              <RevealRight delay={0.2}>
                <div
                  className="relative rounded-3xl p-8 h-full flex flex-col"
                  style={{
                    background: "linear-gradient(160deg, #0a0318 0%, #1e1b4b 100%)",
                    border: "2px solid rgba(167,139,250,0.6)",
                    boxShadow: "0 20px 60px rgba(83,49,208,0.3)",
                  }}
                >
                  {/* Badge recommandé */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span
                      className="px-5 py-1.5 rounded-full text-sm font-black text-white whitespace-nowrap"
                      style={{ background: "linear-gradient(135deg,#5331D0,#a855f7)" }}
                    >
                      Recommandé
                    </span>
                  </div>

                  <div className="mb-6 mt-2">
                    <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#a78bfa" }}>Premium</p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-5xl font-black text-white">299</span>
                      <span className="text-2xl font-bold mb-1" style={{ color: "#9B96DA" }}>€</span>
                      <span className="text-base mb-1.5 ml-1" style={{ color: "#9B96DA" }}>/&nbsp;mois</span>
                    </div>
                    <p className="text-sm" style={{ color: "rgba(155,150,218,0.55)" }}>Accès complet — idéal pour maximiser votre chiffre d&apos;affaires</p>
                  </div>

                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {[
                      { text: "Tout le plan Standard +", highlight: true },
                      { text: "IA commerciale avancée (profil client, correction, activité)", highlight: false },
                      { text: "Tableau de bord business (panier moyen, options vendues…)", highlight: false },
                      { text: "Optimisation panier moyen — suggestions premium rentables", highlight: false },
                      { text: "Recommandation de montures selon le profil client", highlight: false },
                      { text: "Historique client intelligent (corrections précédentes, propositions)", highlight: false },
                      { text: "Statistiques de vente par vendeur", highlight: false },
                      { text: "Coach vendeur IA — argumentaire commercial en temps réel", highlight: false },
                      { text: "Rapport mensuel IA (analyse ventes et opportunités)", highlight: false },
                    ].map(({ text, highlight }) => (
                      <li key={text} className="flex items-start gap-3">
                        <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8l3.5 3.5L13 4.5" stroke={highlight ? "#34D399" : "#a78bfa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-sm font-medium" style={{ color: highlight ? "#34D399" : "#DDDAF5" }}>{text}</span>
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    onClick={scrollToDemo}
                    className="w-full py-4 rounded-2xl text-base font-black text-white"
                    style={{ background: "linear-gradient(135deg,#5331D0,#7B5CE5)", boxShadow: "0 6px 24px rgba(83,49,208,0.45)" }}
                  >
                    Démarrer l&apos;essai gratuit
                  </motion.button>

                  <p className="text-center text-xs mt-3" style={{ color: "rgba(155,150,218,0.5)" }}>
                    30 jours gratuits · Sans engagement · Résiliable à tout moment
                  </p>
                </div>
              </RevealRight>

            </div>
          </div>
        </section>

        {/* ══════════════════════════ TÉMOIGNAGES ══════════════════════════ */}
        <section className="py-20 px-6" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(83,49,208,0.06) 0%, transparent 70%)" }}>
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#5331D0" }}>Ils nous font confiance</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-14" style={{ color: "#1C0B62" }}>
                Des opticiens indépendants<br className="hidden sm:block" /> qui ont transformé leur quotidien
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "Je ne pensais pas qu'un outil pouvait changer autant ma façon de travailler. Mes clients comprennent leur devis en 2 minutes, ils hésitent moins, et ils repartent souvent avec des options qu'ils n'auraient pas choisies avant.",
                  name: "Laurent M.",
                  magasin: "Optique du Soleil — Lyon",
                  initials: "LM",
                },
                {
                  quote: "Le mode tablette client est bluffant. Les clients voient leurs remboursements en direct — plus de questions, plus d'hésitation. Ils font confiance, et ça se ressent sur les ventes.",
                  name: "Sandrine K.",
                  magasin: "Optique Lumière — Bordeaux",
                  initials: "SK",
                },
                {
                  quote: "J'avais peur d'un outil trop complexe à intégrer dans mon quotidien. En moins d'une heure j'étais opérationnel. Trois mois plus tard, je ne pourrais plus m'en passer — et mon équipe non plus.",
                  name: "Thomas R.",
                  magasin: "Mon Opticien — Nantes",
                  initials: "TR",
                },
              ].map((item, i) => (
                <RevealCard key={i} delay={i * 0.1}>
                  <div className="rounded-3xl p-7 h-full flex flex-col gap-5" style={{ background: "#fff", border: "1.5px solid rgba(83,49,208,0.12)", boxShadow: "0 4px 24px rgba(83,49,208,0.06)" }}>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, s) => (
                        <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#5331D0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      ))}
                    </div>
                    <p className="text-base leading-relaxed flex-1" style={{ color: "#374151" }}>&ldquo;{item.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0" style={{ background: "linear-gradient(135deg, #5331D0, #a855f7)" }}>{item.initials}</div>
                      <div>
                        <p className="text-sm font-black" style={{ color: "#1C0B62" }}>{item.name}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>{item.magasin}</p>
                      </div>
                    </div>
                  </div>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════ FAQ ══════════════════════════ */}
        <section id="faq" className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#5331D0" }}>FAQ</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-12" style={{ color: "#1C0B62" }}>
                Questions fréquentes
              </h2>
            </Reveal>
            <div className="flex flex-col gap-3">
              {[
                {
                  q: "Comment fonctionne l'essai gratuit ?",
                  a: "L'essai gratuit dure 30 jours avec accès complet à toutes les fonctionnalités. Aucune carte bancaire requise à l'inscription. À l'issue de la période, vous choisissez librement de continuer ou non.",
                },
                {
                  q: "Est-ce que ça marche avec mon logiciel actuel ?",
                  a: "Oui. OptiPilot fonctionne en parallèle de votre logiciel de caisse (BB Soft, iGest, Optosoftware, GEO Optique…). Il ne remplace pas votre gestion — il prend en charge la phase de consultation et de devis, là où vous perdez du temps.",
                },
                {
                  q: "Que se passe-t-il si j'ai un problème en pleine consultation client ?",
                  a: "Notre support est disponible 7j/7 par chat et email. En cas de problème urgent pendant une consultation, vous pouvez nous joindre directement par téléphone. Temps de réponse moyen : moins de 48h, souvent moins de 2h en journée.",
                },
                {
                  q: "Les données de mes clients sont-elles sécurisées ?",
                  a: "Oui. OptiPilot est conforme RGPD. Toutes les données sont chiffrées en transit (HTTPS/TLS) et au repos. Hébergées en France. Elles ne sont jamais partagées ni revendues.",
                },
                {
                  q: "Combien de temps pour être opérationnel ?",
                  a: "Moins d'une heure. L'interface est conçue pour être intuitive dès la première utilisation. On vous accompagne lors de votre démo de 30 minutes — la plupart des opticiens font leur premier scan d'ordonnance pendant la démo.",
                },
                {
                  q: "Y a-t-il un contrat à signer ?",
                  a: "L'essai de 30 jours est sans engagement et sans carte bancaire. À l'issue, si vous souhaitez continuer, un abonnement de 12 mois minimum vous est proposé — avec acceptation des CGV en ligne et facturation mensuelle. Aucune signature papier requise.",
                },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.06}>
                  <FAQItem q={item.q} a={item.a} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════ DÉMO CTA ══════════════════════════ */}
        <section
          id="demo"
          ref={demoRef}
          className="py-20 px-6"
          style={{ background: "linear-gradient(160deg, #0a0318 0%, #1e1b4b 60%, #2e1d6e 100%)" }}
        >
          <div className="max-w-2xl mx-auto">
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-3 text-white">
                Voyez OptiPilot dans votre magasin — en 15 minutes chrono.
              </h2>
              <p className="text-center text-lg mb-10" style={{ color: "#9B96DA" }}>
                On vous montre le scan d&apos;ordonnance, le calcul mutuelle en direct et les relances automatiques. Sur vos propres données si vous le souhaitez. Sans engagement, aucune carte bancaire requise.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              {demoSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl p-10 text-center"
                  style={{ background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.3)" }}
                >
                  <span className="text-5xl">✅</span>
                  <h3 className="text-2xl font-black text-white mt-4 mb-2">Demande envoyée !</h3>
                  <p style={{ color: "#9B96DA" }}>
                    Nous vous recontacterons dans les 24h pour planifier votre démo personnalisée.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleDemoSubmit}
                  className="rounded-3xl p-8 flex flex-col gap-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(155,150,218,0.2)",
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold" style={{ color: "#9B96DA" }}>Prénom &amp; Nom *</label>
                      <input
                        required
                        value={demoForm.nom}
                        onChange={(e) => setDemoForm((f) => ({ ...f, nom: e.target.value }))}
                        placeholder="Marie Dupont"
                        className="px-4 py-3.5 rounded-xl text-base outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#FDFDFE", border: "1px solid rgba(155,150,218,0.2)" }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold" style={{ color: "#9B96DA" }}>Email professionnel *</label>
                      <input
                        required
                        type="email"
                        value={demoForm.email}
                        onChange={(e) => setDemoForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="marie@votre-optique.fr"
                        className="px-4 py-3.5 rounded-xl text-base outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#FDFDFE", border: "1px solid rgba(155,150,218,0.2)" }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold" style={{ color: "#9B96DA" }}>Nom du magasin *</label>
                      <input
                        required
                        value={demoForm.magasin}
                        onChange={(e) => setDemoForm((f) => ({ ...f, magasin: e.target.value }))}
                        placeholder="Optique du Centre"
                        className="px-4 py-3.5 rounded-xl text-base outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#FDFDFE", border: "1px solid rgba(155,150,218,0.2)" }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-bold" style={{ color: "#9B96DA" }}>Téléphone</label>
                      <input
                        type="tel"
                        value={demoForm.tel}
                        onChange={(e) => setDemoForm((f) => ({ ...f, tel: e.target.value }))}
                        placeholder="06 XX XX XX XX"
                        className="px-4 py-3.5 rounded-xl text-base outline-none"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#FDFDFE", border: "1px solid rgba(155,150,218,0.2)" }}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: demoLoading ? 0 : -2 }}
                    type="submit"
                    disabled={demoLoading}
                    className="w-full py-5 rounded-2xl text-xl font-black text-white mt-2 flex items-center justify-center gap-3"
                    style={{
                      background: demoLoading ? "rgba(83,49,208,0.55)" : "linear-gradient(135deg,#5331D0,#7B5CE5)",
                      boxShadow: "0 6px 24px rgba(83,49,208,0.5)",
                      cursor: demoLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {demoLoading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                          style={{ display: "inline-block", width: 20, height: 20, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                        />
                        Envoi en cours…
                      </>
                    ) : "Demander ma démo gratuite →"}
                  </motion.button>
                  {demoError && (
                    <p className="text-center text-sm font-semibold mt-1" style={{ color: "#f87171" }}>{demoError}</p>
                  )}
                  <p className="text-center text-xs" style={{ color: "rgba(155,150,218,0.5)" }}>
                    Sans carte bancaire · Réponse sous 24h · Données hébergées en France · Annulation en 1 clic
                  </p>
                </form>
              )}
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════ FOOTER ══════════════════════════ */}
        <footer
          className="px-6 py-12"
          style={{
            background: "#07021a",
            borderTop: "1px solid rgba(83,49,208,0.2)",
          }}
        >
          <div className="max-w-5xl mx-auto">
            <Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/assets/images/Logo-OptiPilot.png" alt="OptiPilot" width={32} height={32} className="object-contain" />
                  <span className="text-lg font-black text-white">OptiPilot</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(155,150,218,0.7)" }}>
                  Conçu par un opticien diplômé, pour les opticiens indépendants.<br />
                  Gagnez du temps sur chaque dossier. Augmentez votre panier moyen. Fidélisez sans effort.
                </p>
              </div>
              <div>
                <p className="text-sm font-black mb-4" style={{ color: "#9B96DA" }}>Produit</p>
                <ul className="flex flex-col gap-2">
                  {[["Fonctionnalités", "#fonctionnalites"], ["Tarifs", "#tarifs"], ["FAQ", "#faq"], ["Se connecter", "/login"]].map(([l, h]) => (
                    <li key={h}><a href={h} className="text-sm hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.6)" }}>{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-black mb-4" style={{ color: "#9B96DA" }}>Contact</p>
                <ul className="flex flex-col gap-2">
                  <li><a href="mailto:contact@optipilot.fr" className="text-sm hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.6)" }}>contact@optipilot.fr</a></li>
                  <li><a href="tel:0644269896" className="text-sm hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.6)" }}>06 44 26 98 96</a></li>
                  <li><p className="text-sm" style={{ color: "rgba(155,150,218,0.6)" }}>Plan-de-Cuques (13380)</p></li>
                </ul>
              </div>
            </div>
            </Reveal>
            <Reveal delay={0.15}>
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6" style={{ borderTop: "1px solid rgba(155,150,218,0.12)" }}>
              <p className="text-xs" style={{ color: "rgba(155,150,218,0.4)" }}>
                © {new Date().getFullYear()} OptiPilot. Tous droits réservés.
              </p>
              <a href="/login" className="text-xs mt-2 sm:mt-0 hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.4)" }}>
                Connexion opticien
              </a>
            </div>
            </Reveal>
          </div>
        </footer>
      </div>
    </>
  );
}
