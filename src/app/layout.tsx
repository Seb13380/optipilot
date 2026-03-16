import type { Metadata, Viewport } from "next";
import "./globals.css";
import OptiPilotFooter from "@/components/OptiPilotFooter";

export const metadata: Metadata = {
  title: "OptiPilot — Copilote IA Opticien",
  description: "Logiciel IA complémentaire pour opticiens",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/assets/images/logo-OptiPilot.png", type: "image/png" },
    ],
    apple: [
      { url: "/assets/images/logo-OptiPilot.png", type: "image/png" },
    ],
    shortcut: "/assets/images/logo-OptiPilot.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OptiPilot",
    startupImage: "/assets/images/logo-OptiPilot.png",
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
        {children}
        <OptiPilotFooter />
      </body>
    </html>
  );
}

