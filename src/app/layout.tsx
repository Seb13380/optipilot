import type { Metadata, Viewport } from "next";
import "./globals.css";
import OptiPilotFooter from "@/components/OptiPilotFooter";
import { AppProvider } from "@/lib/AppContext";

export const metadata: Metadata = {
  title: {
    default: "OptiPilot — Copilote IA pour Opticiens Indépendants",
    template: "%s | OptiPilot",
  },
  description: "OptiPilot est le logiciel IA pour opticiens indépendants. Scanner d'ordonnances, recommandations personnalisées, calcul mutuelle, relances automatiques. Essai gratuit 14 jours.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/assets/images/Logo-OptiPilot.png", type: "image/png" },
    ],
    apple: [
      { url: "/assets/images/Logo-OptiPilot.png", type: "image/png" },
    ],
    shortcut: "/assets/images/Logo-OptiPilot.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OptiPilot",
    startupImage: "/assets/images/Logo-OptiPilot.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased page-bg">
        <AppProvider>
          {children}
          <OptiPilotFooter />
        </AppProvider>
      </body>
    </html>
  );
}

