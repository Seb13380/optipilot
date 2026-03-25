"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";

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

// ─── Fade-in-up wrapper ───────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
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

// ─── Main Component ─────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [navScrolled, setNavScrolled] = useState(false);
  const [demoSent, setDemoSent] = useState(false);
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

  function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(
      `Nom : ${demoForm.nom}\nMagasin : ${demoForm.magasin}\nTél : ${demoForm.tel}\n\nDemande de démo OptiPilot.`
    );
    window.open(
      `mailto:sgdigitalweb13@gmail.com?subject=Demande de d%C3%A9mo OptiPilot — ${encodeURIComponent(demoForm.magasin)}&body=${body}`,
      "_blank"
    );
    setDemoSent(true);
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
                  description: "Plan Pro — accès complet, essai gratuit 14 jours",
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
                      text: "L'essai gratuit dure 14 jours avec accès complet à toutes les fonctionnalités. Aucune carte bancaire requise à l'inscription. À l'issue de la période, vous choisissez librement de continuer ou non.",
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

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden sm:inline-flex text-sm font-bold px-4 py-2 rounded-xl transition-colors"
              style={{ color: "#5331D0", border: "1px solid rgba(83,49,208,0.3)" }}
            >
              Connexion
            </a>
            <button
              onClick={scrollToDemo}
              className="text-sm font-bold px-4 py-2 rounded-xl text-white"
              style={{ background: "#5331D0", boxShadow: "0 4px 14px rgba(83,49,208,0.4)" }}
            >
              Demander une démo
            </button>
          </div>
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
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-8"
              style={{ background: "rgba(83,49,208,0.1)", color: "#5331D0", border: "1px solid rgba(83,49,208,0.2)" }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Conçu pour les opticiens indépendants
            </span>

            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6" style={{ color: "#1C0B62" }}>
              Le Copilote IA des
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #5331D0 0%, #a855f7 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Opticiens Indépendants
              </span>
            </h1>

            <p className="text-xl md:text-2xl font-medium mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: "#4b5563" }}>
              Gagnez <strong style={{ color: "#5331D0" }}>2 heures par jour</strong>, augmentez votre panier moyen de{" "}
              <strong style={{ color: "#5331D0" }}>+15%</strong> et ne perdez plus aucun devis.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
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
              <a
                href="/login"
                className="w-full sm:w-auto text-xl font-bold px-8 py-5 rounded-2xl text-center transition-all"
                style={{ color: "#5331D0", border: "2px solid rgba(83,49,208,0.3)" }}
              >
                Se connecter
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-5">
              {["✓ Essai gratuit 14 jours", "✓ Sans engagement", "✓ Données RGPD sécurisées"].map((t) => (
                <span key={t} className="text-sm font-semibold" style={{ color: "#6b7280" }}>{t}</span>
              ))}
            </div>

            {/* Hero image placeholder – screenshot of dashboard */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-16 relative mx-auto rounded-3xl overflow-hidden shadow-2xl"
              style={{
                maxWidth: 860,
                border: "1.5px solid rgba(83,49,208,0.2)",
                background: "linear-gradient(135deg,#0a0318,#1e1b4b)",
                aspectRatio: "16/9",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                <Image
                  src="/assets/images/Logo-OptiPilot.png"
                  alt="Aperçu OptiPilot dashboard"
                  width={80}
                  height={80}
                  className="object-contain opacity-50"
                />
                <p className="text-sm font-semibold opacity-50 text-white">Aperçu du tableau de bord OptiPilot</p>
              </div>
              {/* Decorative coloured orbs */}
              <div className="absolute top-8 left-12 w-40 h-40 rounded-full opacity-30" style={{ background: "radial-gradient(#5331D0, transparent)" }} />
              <div className="absolute bottom-8 right-12 w-32 h-32 rounded-full opacity-20" style={{ background: "radial-gradient(#a855f7, transparent)" }} />
            </motion.div>
          </motion.div>
        </section>

        {/* ══════════════════════════ PROBLÈME ══════════════════════════ */}
        <section id="probleme" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <p className="text-center text-sm font-black uppercase tracking-widest mb-3" style={{ color: "#5331D0" }}>Le constat</p>
              <h2 className="text-3xl md:text-4xl font-black text-center mb-4" style={{ color: "#1C0B62" }}>
                Ce que vivent les opticiens indépendants chaque jour
              </h2>
              <p className="text-center text-lg mb-14" style={{ color: "#6b7280" }}>
                Sans outil adapté, chaque consultation coûte du temps et de l&apos;argent.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "6 à 10 min de saisie par client",
                  desc: "Ordonnances copiées à la main, calculs remboursements chronophages, devis assemblés manuellement… un luxe de temps que les grandes enseignes n'ont plus.",
                  accent: "#ef4444",
                },
                {
                  icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 22 17 22 11" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "1 devis sur 3 ne se concrétise pas",
                  desc: "Le client « réfléchit » et ne revient pas. Sans relance structurée, ce chiffre d'affaires est définitivement perdu.",
                  accent: "#f59e0b",
                },
                {
                  icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "La concurrence digitalise son expérience",
                  desc: "Les grandes enseignes investissent dans des outils numériques. L'optique indépendante peine à offrir la même fluidité, la même confiance client.",
                  accent: "#8b5cf6",
                },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.1}>
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
                </Reveal>
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
                  title: "L'IA recommande les verres idéaux",
                  desc: "En croisant l'ordonnance, le questionnaire lifestyle (conduite de nuit, sport, écrans…) et le budget, OptiPilot génère 3 offres adaptées et argumentées.",
                  color: "#7c3aed",
                },
                {
                  step: "03",
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="2" stroke="white" strokeWidth="1.5"/><line x1="12" y1="18" x2="12.01" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>,
                  title: "Présentez le devis en live sur tablette",
                  desc: "Retournez la tablette vers votre client. Il voit les 3 offres, les remboursements en temps réel, les restes à charge. Il comprend, fait confiance, choisit.",
                  color: "#a855f7",
                },
                {
                  step: "04",
                  icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                  title: "Relancez automatiquement les devis oubliés",
                  desc: "OptiPilot détecte les devis sans réponse et vous alerte. Chaque relance au bon moment, sans effort. Plus aucun potentiel client ne tombe dans l'oubli.",
                  color: "#c084fc",
                },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.1}>
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
                </Reveal>
              ))}
            </div>
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
                Des résultats concrets, pas des promesses
              </h2>
              <p className="text-center text-lg mb-16" style={{ color: "rgba(255,255,255,0.7)" }}>
                Basés sur l&apos;utilisation quotidienne d&apos;OptiPilot par des opticiens indépendants.
              </p>
            </Reveal>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: 6, suffix: " min", label: "par dossier avec OptiPilot", sub: "au lieu de 10 à 16 min sans outil" },
                { value: 15, suffix: "%", label: "de panier moyen en plus", sub: "grâce aux recommandations IA" },
                { value: 1500, suffix: "€", label: "de CA/mois estimés", sub: "+900€ à +1 800€ selon le volume" },
                { value: 22, suffix: "h", label: "libérées par mois", sub: "pour vous concentrer sur vos clients" },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.08}>
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
                </Reveal>
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
                <Reveal key={i} delay={(i % 3) * 0.08}>
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
                </Reveal>
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
              <Reveal delay={0.1}>
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
              </Reveal>

              {/* ── Plan Premium ── */}
              <Reveal delay={0.2}>
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
                      { text: "Tout le plan Standard", highlight: true },
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
                    14 jours gratuits · Sans engagement · Résiliable à tout moment
                  </p>
                </div>
              </Reveal>

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
                  a: "L'essai gratuit dure 14 jours avec accès complet à toutes les fonctionnalités. Aucune carte bancaire requise à l'inscription. À l'issue de la période, vous choisissez librement de continuer ou non.",
                },
                {
                  q: "OptiPilot remplace-t-il mon logiciel de gestion actuel ?",
                  a: "Non. OptiPilot est un outil complémentaire axé sur la phase de consultation et de vente : scan ordonnance, recommandations IA, devis, relances. Il ne gère pas la comptabilité ni le stock.",
                },
                {
                  q: "Les données de mes clients sont-elles sécurisées ?",
                  a: "Oui. OptiPilot est conforme RGPD. Toutes les données sont chiffrées en transit (HTTPS/TLS) et au repos. Hébergeées en Europe. Elles ne sont jamais partagées ni revendues.",
                },
                {
                  q: "Combien de temps pour la prise en main ?",
                  a: "La plupart des opticiens sont opérationnels en moins d'une heure. L'interface est conçue pour être intuitive. Une démo de 30 minutes avec notre équipe suffit pour maîtriser l'essentiel.",
                },
                {
                  q: "Puis-je utiliser OptiPilot sur tablette en magasin ?",
                  a: "Oui, c'est l'usage principal recommandé. OptiPilot est optimisé pour tablette iPad et Android — idéal pour la présentation client en face à face.",
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
                Prêt à transformer votre cabinet ?
              </h2>
              <p className="text-center text-lg mb-10" style={{ color: "#9B96DA" }}>
                Réservez une démo gratuite de 30 minutes. On vous montre comment OptiPilot s&apos;adapte concrètement à votre magasin.
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
                    type="submit"
                    className="w-full py-5 rounded-2xl text-xl font-black text-white mt-2"
                    style={{ background: "linear-gradient(135deg,#5331D0,#7B5CE5)", boxShadow: "0 6px 24px rgba(83,49,208,0.5)" }}
                  >
                    Demander ma démo gratuite →
                  </motion.button>
                  <p className="text-center text-xs" style={{ color: "rgba(155,150,218,0.5)" }}>
                    Aucun engagement · Réponse sous 24h · Données RGPD sécurisées
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/assets/images/Logo-OptiPilot.png" alt="OptiPilot" width={32} height={32} className="object-contain" />
                  <span className="text-lg font-black text-white">OptiPilot</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(155,150,218,0.7)" }}>
                  Le copilote IA des opticiens indépendants. Gagnez du temps, augmentez votre CA, fidélisez vos clients.
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
                  <li><a href="mailto:sgdigitalweb13@gmail.com" className="text-sm hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.6)" }}>sgdigitalweb13@gmail.com</a></li>
                  <li><a href="tel:0644269896" className="text-sm hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.6)" }}>06 44 26 98 96</a></li>
                  <li><p className="text-sm" style={{ color: "rgba(155,150,218,0.6)" }}>Plan-de-Cuques (13380)</p></li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between pt-6" style={{ borderTop: "1px solid rgba(155,150,218,0.12)" }}>
              <p className="text-xs" style={{ color: "rgba(155,150,218,0.4)" }}>
                © {new Date().getFullYear()} SG Digital Web — OptiPilot. Tous droits réservés.
              </p>
              <a href="/login" className="text-xs mt-2 sm:mt-0 hover:text-white transition-colors" style={{ color: "rgba(155,150,218,0.4)" }}>
                Connexion opticien
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
