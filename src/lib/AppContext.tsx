"use client";
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

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
    historyTitle:          "Mes\nPerformances",
    historyDescription:    "Devis, ventes et stats",
    relancesTitle:         "Relancer\nmes clients",
    relancesDescription:   "Relances automatiques",
    launchClient:          "Lancer une vente en 2 scans",
    launchClientSub:       "Ordonnance + mutuelle → devis prêt immédiatement",
    basedOnActivity:       "Basé sur votre activité actuelle",
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
    // Dashboard — sections & stats
    impactTitle:           "Impact OptiPilot · Aujourd'hui",
    todayTitle:            "Aujourd'hui",
    thisWeek:              "Cette semaine",
    clientsTitle:          "Clients",
    recentQuotes:          "Derniers devis",
    quotesEstablished:     "Devis établis",
    salesTitle:            "Ventes",
    conversionLabel:       "Conversion",
    avgCart:               "Panier moyen",
    withOptiPilot:         "Avec OptiPilot ✓",
    withoutOptiPilot:      "Sans OptiPilot",
    standardSale:          "Vente standard",
    optimizedSale:         "Vente optimisée",
    conversionRate:        "Taux de conversion",
    totalClients:          "Total clients",
    thisMonth:             "Ce mois",
    viewAllClients:        "Voir tous les clients →",
    viewAllHistory:        "Voir tout l'historique →",
    noQuotesYet:           "Aucun devis pour l'instant",
    detectedOpportunities: "Opportunités détectées",
    whyPro:                "Pourquoi passer en Pro ?",
    upgradeNow:            "Passer en Pro maintenant →",
    subscriptionActivated: "Abonnement activé avec succès !",
    subscriptionActivatedSub: "Bienvenue sur OptiPilot Pro — toutes les fonctionnalités sont maintenant disponibles.",
    trialPeriod:           "Période d'essai",
    daysRemaining:         "jours restant",
    goPro:                 "Passer Pro →",
    quotesLabel:           "Devis",
    newClientsLabel:       "Nouveaux clients",
    statusAccepted:        "Accepté",
    statusInProgress:      "En cours",
    statusRefused:         "Refusé",
    // Recommendations page
    calculating:           "Calcul des recommandations...",
    chooseOffer:           "Choisir cette offre →",
    lensPrice:             "Prix verres",
    reimbursement:         "Remboursement",
    outOfPocket:           "Reste à charge",
    compareVisually:       "Comparer visuellement les verres →",
    advisorTitle:          "Conseiller OptiPilot",
    advisorSub:            "Posez vos questions — je connais votre ordonnance et vos besoins",
    frequentQuestions:     "Questions fréquentes pour votre profil :",
    askQuestion:           "Posez votre question…",
    advisorDisclaimer:     "Conseils généraux uniquement — votre opticien est votre référence pour les décisions finales.",
    // Scanner page
    scanTitle:             "Scanner l'ordonnance",
    scanTips:              "Conseils pour un scan réussi",
    scanTipsBody:          "Posez l'ordonnance sur une surface plane · bonne lumière (pas de reflet) · la capture est automatique dès que l'image est stable",
    captureInProgress:     "✓ Capture en cours…",
    holdStill:             "Ne bougez plus…",
    placeInFrame:          "Placez l'ordonnance dans le cadre",
    cameraTitle:           "Appareil photo",
    autoCapture:           "La photo sera prise automatiquement",
    enableCamera:          "Activer la caméra",
    captureManually:       "Capturer manuellement",
    checkPhoto:            "Vérifiez la photo",
    noCapture:             "Aucune capture",
    retake:                "Reprendre",
    analyze:               "Analyser",
    analyzingPrescription: "Analyse en cours…",
    aiReading:             "L'IA lit votre ordonnance",
    cannotRead:            "Lecture impossible",
    retryScan:             "Reprendre le scan",
    prescriptionResults:   "Résultats de l'ordonnance",
    analyzeTitle:          "Analyse OptiPilot",
    recommendedIndex:      "Indice recommandé",
    lensTypeLabel:         "Type de verre",
    progressive:           "Progressif",
    unifocal:              "Unifocal",
    patientEdit:           "Correction du patient",
    doctorEdit:            "Correction du médecin et de la date",
    retakePhoto:           "Reprendre la photo",
    editManually:          "Corriger manuellement",
    closeEdit:             "Fermer correction",
    confirmPrescription:   "✓ Confirmer",
    rightEye:              "OD — Œil Droit",
    leftEye:               "OG — Œil Gauche",
    welcomeAt:             "Bienvenue chez",
    welcomeExcl:           "Bienvenue !",
    // Recommandations page (remaining)
    recommendedBadge:      "Recommandé",
    optiPilotEstimates:    "OptiPilot estime que l'offre",
    bestForProfile:        "vous apportera le meilleur rapport qualité / prix pour votre profil.",
    analysisTitle:         "D'après l'analyse de votre correction et vos réponses au questionnaire, nous vous recommandons :",
    analysisPrefix:        ", d'après l'analyse de votre correction et vos réponses au questionnaire, nous vous recommandons :",
    askOptician:           "Demandez à votre opticien",
    forMoreInfo:           "pour plus d'informations.",
    frameAdviceTitle:      "Conseils spécifiques à votre monture",
    opticianData:          "Données opticien — puissances méridionales",
    maxPower:              "Puissance max",
    powerForIndex:         "Puissance retenue pour l'indice",
    supplementaryEquip:    "Équipement complémentaire recommandé",
    opticianAdvice:        "Conseil opticien",
    profileEssentiel:      "100% Santé · budget maîtrisé · correction simple",
    profileConfort:        "Quotidien · écrans · conduite · meilleur rapport qualité/prix",
    profilePremium:        "Forte correction · exigence visuelle maximale · précision",
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
    historyTitle:          "My\nPerformances",
    historyDescription:    "Quotes, sales & stats",
    relancesTitle:         "Re-engage\nClients",
    relancesDescription:   "Automated follow-ups",
    launchClient:          "Start a sale in 2 scans",
    launchClientSub:       "Prescription + insurance → quote ready instantly",
    basedOnActivity:       "Based on your current activity",
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
    // Dashboard — sections & stats
    impactTitle:           "OptiPilot Impact · Today",
    todayTitle:            "Today",
    thisWeek:              "This week",
    clientsTitle:          "Clients",
    recentQuotes:          "Recent quotes",
    quotesEstablished:     "Quotes set up",
    salesTitle:            "Sales",
    conversionLabel:       "Conversion",
    avgCart:               "Average cart",
    withOptiPilot:         "With OptiPilot ✓",
    withoutOptiPilot:      "Without OptiPilot",
    standardSale:          "Standard sale",
    optimizedSale:         "Optimised sale",
    conversionRate:        "Conversion rate",
    totalClients:          "Total clients",
    thisMonth:             "This month",
    viewAllClients:        "View all clients →",
    viewAllHistory:        "View full history →",
    noQuotesYet:           "No quotes yet",
    detectedOpportunities: "Detected opportunities",
    whyPro:                "Why upgrade to Pro?",
    upgradeNow:            "Upgrade to Pro now →",
    subscriptionActivated: "Subscription activated!",
    subscriptionActivatedSub: "Welcome to OptiPilot Pro — all features are now available.",
    trialPeriod:           "Trial period",
    daysRemaining:         "days remaining",
    goPro:                 "Go Pro →",
    quotesLabel:           "Quotes",
    newClientsLabel:       "New clients",
    statusAccepted:        "Accepted",
    statusInProgress:      "In progress",
    statusRefused:         "Declined",
    // Recommendations page
    calculating:           "Calculating recommendations...",
    chooseOffer:           "Choose this offer →",
    lensPrice:             "Lens price",
    reimbursement:         "Reimbursement",
    outOfPocket:           "Out of pocket",
    compareVisually:       "Compare lenses visually →",
    advisorTitle:          "OptiPilot Advisor",
    advisorSub:            "Ask your questions — I know your prescription and your needs",
    frequentQuestions:     "Frequent questions for your profile:",
    askQuestion:           "Type your question…",
    advisorDisclaimer:     "General advice only — your optician is your reference for all final decisions.",
    // Scanner page
    scanTitle:             "Scan Prescription",
    scanTips:              "Tips for a successful scan",
    scanTipsBody:          "Place the prescription on a flat surface · good light (no glare) · capture is automatic when the image is stable",
    captureInProgress:     "✓ Capturing…",
    holdStill:             "Hold still…",
    placeInFrame:          "Place prescription in frame",
    cameraTitle:           "Camera",
    autoCapture:           "Photo will be taken automatically",
    enableCamera:          "Enable camera",
    captureManually:       "Capture manually",
    checkPhoto:            "Check the photo",
    noCapture:             "No capture",
    retake:                "Retake",
    analyze:               "Analyze",
    analyzingPrescription: "Analyzing…",
    aiReading:             "AI is reading your prescription",
    cannotRead:            "Cannot read",
    retryScan:             "Retry scan",
    prescriptionResults:   "Prescription results",
    analyzeTitle:          "OptiPilot Analysis",
    recommendedIndex:      "Recommended index",
    lensTypeLabel:         "Lens type",
    progressive:           "Progressive",
    unifocal:              "Single vision",
    patientEdit:           "Patient data",
    doctorEdit:            "Doctor & date details",
    retakePhoto:           "Retake photo",
    editManually:          "Edit manually",
    closeEdit:             "Close edit",
    confirmPrescription:   "✓ Confirm",
    rightEye:              "RE — Right Eye",
    leftEye:               "LE — Left Eye",
    welcomeAt:             "Welcome at",
    welcomeExcl:           "Welcome!",
    // Recommandations page (remaining)
    recommendedBadge:      "Recommended",
    optiPilotEstimates:    "OptiPilot estimates that the",
    bestForProfile:        "will give you the best value for your profile.",
    analysisTitle:         "Based on your prescription analysis and questionnaire answers, we recommend:",
    analysisPrefix:        ", based on your prescription analysis and questionnaire answers, we recommend:",
    askOptician:           "Ask your optician",
    forMoreInfo:           "for more information.",
    frameAdviceTitle:      "Specific advice for your frame",
    opticianData:          "Optician data — meridional powers",
    maxPower:              "Max power",
    powerForIndex:         "Power used for index",
    supplementaryEquip:    "Recommended supplementary equipment",
    opticianAdvice:        "Optician advice",
    profileEssentiel:      "100% Health · controlled budget · simple correction",
    profileConfort:        "Daily · screens · driving · best value",
    profilePremium:        "Strong correction · maximum visual precision",
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

  // ── Déconnexion automatique après 30 min d'inactivité ────────────────────
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    function resetTimer() {
      // Ne rien faire si l'utilisateur n'est pas connecté
      if (!localStorage.getItem("optipilot_token")) return;

      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        localStorage.removeItem("optipilot_token");
        localStorage.removeItem("optipilot_user");
        window.location.href = "/login";
      }, INACTIVITY_MS);
    }

    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));

    // Démarrer le timer dès le montage si connecté
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={{ lang, setLang, t: T[lang] as Record<string, string>, theme, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
