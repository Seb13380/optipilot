"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ─── Traductions ──────────────────────────────────────────
export const T = {
  FR: {
    // Navigation
    dashboard:        "Tableau de bord",
    newClient:        "Nouveau client",
    scanPrescription: "Scanner ordonnance",
    recommendations:  "Recommandations",
    quote:            "Devis",
    history:          "Historique",
    catalogue:        "Catalogue montures",
    reconciliations:  "Rapprochements",
    configuration:    "Configuration",
    subscription:     "Mon abonnement",
    logout:           "Se déconnecter",
    menu:             "Menu",
    back:             "Retour",
    // Dashboard
    scanPrescriptionTitle: "Scanner\nOrdonnance",
    scanDescription:       "Extraction auto des données",
    newClientTitle:        "Nouveau\nClient",
    newClientDescription:  "Fiche · Mutuelle · Antécédents",
    historyTitle:          "Historique",
    historyDescription:    "Devis, ventes et stats",
    relancesTitle:         "Relances",
    relancesDescription:   "Clients sans réponse",
    launchClient:          "Lancer l'expérience client",
    launchClientSub:       "Ordonnance · Mutuelle · Questionnaire · Montures",
    today:                 "aujourd'hui",
    timeFreed:             "Temps libéré",
    caGenerated:           "CA généré",
    sales:                 "ventes",
    opportunities:         "Opportunités",
    quotesInProgress:      "devis en cours",
    startFirstSale:        "Démarrez votre première vente pour voir votre impact",
    monthlyEstimate:       "Estimation mensuelle",
    liveNow:               "En direct",
    quit:                  "Quitter",
    greetings:             "Bonjour",
    // Config
    save:                  "Sauvegarder",
    // Mots communs
    loading:               "Chargement…",
    error:                 "Erreur",
    cancel:                "Annuler",
    confirm:               "Confirmer",
  },
  EN: {
    // Navigation
    dashboard:        "Dashboard",
    newClient:        "New client",
    scanPrescription: "Scan prescription",
    recommendations:  "Recommendations",
    quote:            "Quote",
    history:          "History",
    catalogue:        "Frame catalogue",
    reconciliations:  "Reconciliations",
    configuration:    "Configuration",
    subscription:     "My subscription",
    logout:           "Sign out",
    menu:             "Menu",
    back:             "Back",
    // Dashboard
    scanPrescriptionTitle: "Scan\nPrescription",
    scanDescription:       "Auto data extraction",
    newClientTitle:        "New\nClient",
    newClientDescription:  "File · Insurance · History",
    historyTitle:          "History",
    historyDescription:    "Quotes, sales & stats",
    relancesTitle:         "Follow-ups",
    relancesDescription:   "Clients without reply",
    launchClient:          "Launch client experience",
    launchClientSub:       "Prescription · Insurance · Questions · Frames",
    today:                 "today",
    timeFreed:             "Time saved",
    caGenerated:           "Revenue",
    sales:                 "sales",
    opportunities:         "Opportunities",
    quotesInProgress:      "quotes pending",
    startFirstSale:        "Start your first sale to see your impact",
    monthlyEstimate:       "Monthly estimate",
    liveNow:               "Live",
    quit:                  "Quit",
    greetings:             "Hello",
    // Config
    save:                  "Save",
    // Mots communs
    loading:               "Loading…",
    error:                 "Error",
    cancel:                "Cancel",
    confirm:               "Confirm",
  },
} as const;

export type Lang = "FR" | "EN";
export type ThemeMode = "light" | "dark";

interface AppCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Record<string, string>;
  theme: ThemeMode;
  toggleTheme: () => void;
}

const AppContext = createContext<AppCtx>({
  lang: "FR",
  setLang: () => {},
  t: T.FR,
  theme: "light",
  toggleTheme: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("FR");
  const [theme, setTheme] = useState<ThemeMode>("light");

  // Persist preferences
  useEffect(() => {
    const savedLang = localStorage.getItem("optipilot_lang") as Lang | null;
    const savedTheme = localStorage.getItem("optipilot_theme") as ThemeMode | null;
    if (savedLang === "FR" || savedLang === "EN") setLangState(savedLang);
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
  }, []);

  // Apply dark class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("optipilot_theme", theme);
  }, [theme]);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("optipilot_lang", l);
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <AppContext.Provider value={{ lang, setLang, t: T[lang] as Record<string, string>, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
