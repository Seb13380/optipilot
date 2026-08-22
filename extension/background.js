// OptiPilot Background Service Worker
// 1. Lit le cookie ci_sessions d'Optimum Live et l'envoie au bridge local
// 2. Polling relais cloud : récupère les devis iPad en attente et les injecte dans Optimum Live

const BRIDGE_URL = "http://localhost:5174";
const BRIDGE_TOKEN = "optipilot-bridge-secret-CHANGEZ-MOI";
const OPTIMUM_URL = "https://livebyoptimum.com";
const BACKEND_URL = "https://optipilot-backend.onrender.com";
const POLL_INTERVAL_MS = 15000; // 15 secondes

// ── Pousser le cookie vers le bridge dès qu'un onglet Optimum Live est actif ──
async function pushSessionToBridge() {
  try {
    const cookie = await chrome.cookies.get({ url: OPTIMUM_URL, name: "ci_sessions" });
    if (!cookie) return;

    await fetch(`${BRIDGE_URL}/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-token": BRIDGE_TOKEN,
      },
      body: JSON.stringify({ ci_sessions: cookie.value }),
    });
  } catch {
    // Bridge non disponible — silencieux
  }
}

// ── Polling relais cloud → injection dans Optimum Live ───────────────────────
async function pollDevisPending() {
  try {
    const token = await getStoredToken();
    if (!token) return;

    const res = await fetch(`${BACKEND_URL}/api/bridge/devis-pull`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const devisList = await res.json();
    if (!devisList || devisList.length === 0) return;

    for (const devis of devisList) {
      await injecterDevisDansOptimum(devis);
      // Acquitter
      await fetch(`${BACKEND_URL}/api/bridge/devis-ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: devis.id, statut: "done" }),
      });
    }
  } catch {
    // Silencieux — backend peut être en cold start
  }
}

async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["optipilot_token"], (result) => {
      resolve(result.optipilot_token || null);
    });
  });
}

async function injecterDevisDansOptimum(devis) {
  const payload = devis.payload;

  // Trouver un onglet Optimum Live ouvert
  const tabs = await chrome.tabs.query({ url: "*://livebyoptimum.com/*" });
  if (tabs.length === 0) return;

  const tab = tabs[0];
  // Envoyer le payload au content script pour afficher le panneau de données
  chrome.tabs.sendMessage(tab.id, {
    type: "OPTIPILOT_DEVIS_RELAY",
    payload,
  });
}

// Démarrer le polling toutes les 15s
chrome.alarms.create("pollDevis", { periodInMinutes: 0.25 }); // ~15s
chrome.alarms.create("pollSearch", { periodInMinutes: 0.083 }); // ~5s — recherche client plus réactive
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pollDevis") pollDevisPending();
  if (alarm.name === "pollSearch") pollSearchRequests();
});

// ── Recherche client Optimum Live sur demande de l'iPad (sans bridge SQL) ────
// Poll search-pull → appelle directement l'API Optimum Live avec le cookie
// ci_sessions → poste le résultat via search-result.
async function pollSearchRequests() {
  try {
    const token = await getStoredToken();
    if (!token) return;

    const res = await fetch(`${BACKEND_URL}/api/bridge/search-pull`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const requests = await res.json();
    if (!requests || requests.length === 0) return;

    for (const request of requests) {
      await handleSearchRequest(request, token);
    }
  } catch {
    // Silencieux — backend peut être en cold start
  }
}

async function handleSearchRequest(request, token) {
  try {
    const cookie = await chrome.cookies.get({ url: OPTIMUM_URL, name: "ci_sessions" });
    if (!cookie) {
      await postSearchResult(request.id, token, { error: "Session Optimum Live introuvable — ouvrez un onglet livebyoptimum.com" });
      return;
    }

    const url = `${OPTIMUM_URL}/ref/get4json_clients_par_debut_nom?debut_nom=${encodeURIComponent(request.query)}&option_creer=true`;
    const resp = await fetch(url, {
      headers: {
        Cookie: `ci_sessions=${cookie.value}; language=fr; secteur_activite_type=1`,
        "X-Requested-With": "XMLHttpRequest",
        "X-Xhr-Referer": `${OPTIMUM_URL}/accueil`,
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
    });
    if (!resp.ok) {
      await postSearchResult(request.id, token, { error: `Optimum Live a répondu ${resp.status}` });
      return;
    }
    const data = await resp.json();
    const results = Array.isArray(data)
      ? data.map((c) => ({
          id: c.id_client || null,
          nom: c.nom || "",
          prenom: c.prenom || "",
          dateNaissance: c.date_naissance || "",
          source: "optimum-live",
        }))
      : [];
    await postSearchResult(request.id, token, { results });
  } catch (err) {
    await postSearchResult(request.id, token, { error: String(err) });
  }
}

async function postSearchResult(id, token, { results, error }) {
  try {
    await fetch(`${BACKEND_URL}/api/bridge/search-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, results, error }),
    });
  } catch {
    // Silencieux
  }
}

// Réception du message CLIENT_PUSH depuis content.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CLIENT_PUSH") {
    pushClientToBackend(message.payload);
  }
});

async function pushClientToBackend(payload) {
  try {
    const token = await getStoredToken();
    if (!token) return;
    await fetch(`https://optipilot.fr/api/bridge/client-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silencieux
  }
}

// Déclencher à chaque navigation sur livebyoptimum.com
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("livebyoptimum.com")) {
    pushSessionToBridge();
    pollDevisPending(); // vérifier immédiatement à chaque ouverture Optimum
    pollSearchRequests();
  }
});

// Déclencher au démarrage du navigateur si un onglet Optimum est déjà ouvert
chrome.tabs.query({ url: "*://livebyoptimum.com/*" }, (tabs) => {
  if (tabs.length > 0) pushSessionToBridge();
});
