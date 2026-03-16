"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function MentionsLegalesModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl p-7 space-y-5 overflow-y-auto"
        style={{
          background: "#1C0B62",
          border: "1px solid rgba(155,150,218,0.25)",
          maxHeight: "80vh",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Mentions légales</h2>
          <button onClick={onClose} className="text-3xl leading-none" style={{ color: "rgba(255,255,255,0.45)" }}>×</button>
        </div>

        <section className="space-y-1">
          <h3 className="font-bold" style={{ color: "#A78BFA" }}>Éditeur</h3>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.85)" }}>
            <strong>SG Digital Web</strong><br />
            Sébastien GIORDANO<br />
            Plan-de-Cuques (13380)<br />
            Email&nbsp;: <a href="mailto:sgdigitalweb13@gmail.com" className="underline" style={{ color: "#A78BFA" }}>sgdigitalweb13@gmail.com</a><br />
            Tél&nbsp;: <a href="tel:0644269896" style={{ color: "#A78BFA" }}>06.44.26.98.96</a>
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-bold" style={{ color: "#A78BFA" }}>Hébergement</h3>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.85)" }}>
            OptiPilot est une application web hébergée sur des serveurs sécurisés.
            Les données sont stockées en conformité avec le RGPD.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-bold" style={{ color: "#A78BFA" }}>Propriété intellectuelle</h3>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.85)" }}>
            OptiPilot et son contenu sont la propriété exclusive de SG Digital Web.
            Toute reproduction partielle ou totale est strictement interdite.
          </p>
        </section>

        <section className="space-y-1">
          <h3 className="font-bold" style={{ color: "#A78BFA" }}>Données personnelles</h3>
          <p className="text-base" style={{ color: "rgba(255,255,255,0.85)" }}>
            Les données collectées sont utilisées uniquement dans le cadre du service OptiPilot.
            Conformément au RGPD, vous pouvez exercer vos droits d&apos;accès, de rectification et de suppression
            en nous contactant à l&apos;adresse email ci-dessus.
          </p>
        </section>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-white text-base"
          style={{ background: "#5331D0" }}
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-7 space-y-5"
        style={{
          background: "#1C0B62",
          border: "1px solid rgba(155,150,218,0.25)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <button onClick={onClose} className="text-3xl leading-none" style={{ color: "rgba(255,255,255,0.45)" }}>×</button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-4 space-y-1" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <p className="text-xs font-semibold" style={{ color: "#A78BFA" }}>👤 Éditeur</p>
            <p className="font-bold text-white">Sébastien GIORDANO</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>SG Digital Web — Plan-de-Cuques (13380)</p>
          </div>

          <a
            href="mailto:sgdigitalweb13@gmail.com"
            className="flex items-center gap-3 rounded-2xl p-4 w-full"
            style={{ background: "rgba(83,49,208,0.2)", border: "1px solid rgba(83,49,208,0.35)" }}
          >
            <span className="text-2xl">✉️</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#A78BFA" }}>Email</p>
              <p className="font-semibold text-white text-sm">sgdigitalweb13@gmail.com</p>
            </div>
          </a>

          <a
            href="tel:0644269896"
            className="flex items-center gap-3 rounded-2xl p-4 w-full"
            style={{ background: "rgba(83,49,208,0.2)", border: "1px solid rgba(83,49,208,0.35)" }}
          >
            <span className="text-2xl">📞</span>
            <div>
              <p className="text-xl font-semibold" style={{ color: "#A78BFA" }}>Téléphone</p>
              <p className="font-semibold text-white text-xl">06.44.26.98.96</p>
            </div>
          </a>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-white text-base"
          style={{ background: "#5331D0" }}
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function OptiPilotFooter() {
  const [showMentions, setShowMentions] = useState(false);
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <footer
        className="w-full px-6 py-6 flex flex-col items-center gap-1.5 text-center"
        style={{ background: "transparent" }}
      >
        <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>
          © {new Date().getFullYear()} OptiPilot — SG Digital Web
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMentions(true)}
            className="text-xl underline"
            style={{ color: "rgba(155,150,218,0.7)" }}
          >
            Mentions légales
          </button>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <button
            onClick={() => setShowContact(true)}
            className="text-xl underline"
            style={{ color: "rgba(155,150,218,0.7)" }}
          >
            Contact
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {showMentions && <MentionsLegalesModal onClose={() => setShowMentions(false)} />}
        {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      </AnimatePresence>
    </>
  );
}
