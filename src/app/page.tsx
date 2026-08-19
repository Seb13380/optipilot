import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "OptiPilot — Logiciel IA pour Opticiens | +15% panier moyen",
  description:
    "OptiPilot est le copilote IA pour opticiens : scanner d’ordonnances, recommandations personnalisées, calcul mutuelle en temps réel, relances automatiques. Gagnez 22h/mois, +900€ à +1 800€ de CA. 1 mois offert.",
  keywords: [
    "logiciel opticien",
    "logiciel optique",
    "IA opticien",
    "scanner ordonnance IA",
    "recommandation verres IA",
    "gestion client opticien",
    "relances devis opticien",
    "copilote opticien",
    "OptiPilot",
    "application opticien tablette",
  ],
  openGraph: {
    title: "OptiPilot — Le Copilote IA des Opticiens",
    description:
      "Gagnez 22h/mois, augmentez votre CA de +900€ à +1 800€/mois. Scanner d’ordonnances, recommandations IA, relances automatiques. 1 mois offert.",
    url: "https://optipilot.fr",
    siteName: "OptiPilot",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "https://optipilot.fr/assets/images/OptiPilot2.0Logo-transparent.png",
        width: 512,
        height: 512,
        alt: "OptiPilot — Logiciel IA pour opticiens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OptiPilot — Le Copilote IA pour Opticiens",
    description: "Gagnez 22h/mois, augmentez votre CA de +900€ à +1 800€/mois. 1 mois offert.",
    images: ["https://optipilot.fr/assets/images/OptiPilot2.0Logo-transparent.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
  alternates: {
    canonical: "https://optipilot.fr",
  },
};

export default function Home() {
  return <LandingPage />;
}
