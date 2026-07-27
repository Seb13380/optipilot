(function () {
  "use strict";

  // ── Détection du hash OptiPilot ───────────────────────────────────────────
  // OptiPilot encode les données du devis dans le hash :
  // https://livebyoptimum.com/...#optipilot-devis={"nom":"...","prixTotal":...}
  // Le payload est aussi stocké en sessionStorage pour survivre aux navigations
  // internes (page reload lors d'un clic vers le formulaire devis Optimum).

  const HASH_KEY = "optipilot-devis=";
  const SESSION_KEY = "optipilot_devis_payload";

  function getDevisPayload() {
    // 1. Priorité : hash URL (première arrivée)
    const hash = decodeURIComponent(window.location.hash || "");
    const idx = hash.indexOf(HASH_KEY);
    if (idx !== -1) {
      try {
        const p = JSON.parse(hash.slice(idx + HASH_KEY.length));
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(p)); // persiste pour la navigation
        return p;
      } catch { /* ignore */ }
    }
    // 2. Fallback : sessionStorage (page rechargée après navigation)
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }

  const payload = getDevisPayload();

  // ── Écoute des messages du background (relais iPad → cloud → PC) ──────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "OPTIPILOT_DEVIS_RELAY" && msg.payload) {
      afficherPanneau(msg.payload, true);
    }
  });

  if (!payload) return; // Pas de données via hash — attendre le relais cloud

  afficherPanneau(payload, false);

  function afficherPanneau(data, viaRelais) {

  // ── Panneau d'aide flottant ───────────────────────────────────────────────
  // Affiché tant qu'on n'a pas trouvé le bon formulaire Optimum
  // À compléter avec les vrais sélecteurs après inspection

  // Éviter la double injection
  if (document.getElementById("optipilot-devis-panel")) return;

  const panel = document.createElement("div");
  panel.id = "optipilot-devis-panel";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "99999",
    width: "320px",
    background: "linear-gradient(135deg, #0a0338, #1a0a5c)",
    border: "1.5px solid rgba(83,49,208,0.6)",
    borderRadius: "16px",
    fontFamily: "sans-serif",
    boxShadow: "0 8px 32px rgba(83,49,208,0.4)",
    overflow: "hidden",
  });

  // ── Données formatées pour affichage ─────────────────────────────────────
  const rows = [
    ["Client", `${data.nom || ""} ${data.prenom || ""}`.trim()],
    ["Mutuelle", data.mutuelle || "—"],
    ["Verrier", data.verrier || "—"],
    ["Gamme / Offre", data.offre || "—"],
    ["Prix verres", data.prixVerres ? `${data.prixVerres} €` : "—"],
    ["Prix monture", data.prixMonture ? `${data.prixMonture} €` : "—"],
    ["Total devis", data.prixTotal ? `${data.prixTotal} €` : "—"],
    ["Remb. Sécu", data.remboursementSecu ? `${data.remboursementSecu} €` : "—"],
    ["Remb. Mutuelle", data.remboursementMutuelle ? `${data.remboursementMutuelle} €` : "—"],
  ];

  const rowsHtml = rows.map(([label, val]) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(83,49,208,0.15);">
      <span style="color:rgba(155,150,218,0.7);font-size:12px;">${label}</span>
      <span style="color:#FDFDFE;font-size:13px;font-weight:600;">${val}</span>
    </div>
  `).join("");

  panel.innerHTML = `
    <div style="padding:14px 16px 10px;border-bottom:1px solid rgba(83,49,208,0.3);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="color:#FDFDFE;font-size:14px;font-weight:700;">📋 Devis OptiPilot</span>
        <button id="optipilot-devis-close"
          style="background:none;border:none;color:rgba(155,150,218,0.7);cursor:pointer;font-size:18px;line-height:1;padding:0;">×</button>
      </div>
      <p style="color:rgba(155,150,218,0.6);font-size:11px;margin-top:4px;">
        ${viaRelais ? "📲 Reçu depuis l'iPad — vérifiez les données." : "Ouvrez un nouveau devis dans Optimum puis cliquez \"Remplir\"."}
      </p>
    </div>
    <div style="padding:12px 16px;">${rowsHtml}</div>
    <div style="padding:0 16px 14px;">
      <button id="optipilot-devis-fill"
        style="width:100%;padding:10px;background:linear-gradient(135deg,#5331D0,#9B96DA);
               color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;
               cursor:pointer;margin-top:6px;">
        📋 Copier les données
      </button>
      <p id="optipilot-devis-status" style="color:rgba(155,150,218,0.6);font-size:11px;text-align:center;margin-top:6px;"></p>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById("optipilot-devis-close").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY); // efface le payload — plus de panel sur les prochaines pages
    panel.remove();
  });

  // ── Remplissage du formulaire ─────────────────────────────────────────────
  // ⚠️  LES SÉLECTEURS CI-DESSOUS SONT À RENSEIGNER APRÈS INSPECTION
  // Faire clic droit sur chaque champ dans Optimum Live → Inspecter
  // et noter les attributs name, id ou class du <input> ou <select>

  // ── Sélecteurs Optimum Live v5.8.x — relevés le 27/07/2026 ──────────────
  const SELECTORS = {
    // ── Prix par ligne (tbody) — lecture seule ────────────────────────────
    // Verres : lignes avec data-offre_detail_type_id="3"
    prixVerres:           'tr[data-offre_detail_type_id="3"] td.prix_vente_applique',
    prixVerresRemise:     'tr[data-offre_detail_type_id="3"] td.modif_prix_vente_remise',
    // Monture : lignes avec data-offre_detail_type_id="1"
    prixMonture:          'tr[data-offre_detail_type_id="1"] td.prix_vente_applique',
    prixMontureRemise:    'tr[data-offre_detail_type_id="1"] td.modif_prix_vente_remise',
    // Remboursements par ligne
    remboursementSecu:    'td.montant_pec_ro',
    remboursementMutuelle:'td.montant_pec_rc_1',
    // RAC par ligne
    racLigne:             'td.total_ligne_rac',
    // ── Totaux dans le tfoot (mis à jour après calcul TP) ─────────────────
    racSecu_output:       'td.total_ro',    // total remboursement SS
    racMutuelle_output:   'td.total_rc_1',  // total remboursement mutuelle (RC1)
    racTotal_output:      'td.total_rac',   // total RAC final
    // ── Autres totaux disponibles ─────────────────────────────────────────
    // 'td.total_brut'    → prix total TTC
    // 'td.total_remise'  → remise globale
    // 'td.total_net'     → net après remise
  };

  // ── URL du backend OptiPilot (cloud) ─────────────────────────────────────
  const BACKEND_URL = "https://optipilot-backend.onrender.com";

  function fillField(selector, value) {
    if (!selector || value === undefined || value === null) return false;
    const el = document.querySelector(selector);
    if (!el) return false;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    if (nativeInputValueSetter) {
      nativeInputValueSetter.set.call(el, String(value));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      el.value = String(value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }

  /** Lit une valeur numérique depuis un sélecteur DOM (texte ou input) */
  function readDomValue(selector) {
    if (!selector) return null;
    const el = document.querySelector(selector);
    if (!el) return null;
    const raw = (el.value !== undefined ? el.value : el.textContent || "").replace(/[^\d.,]/g, "").replace(",", ".");
    const val = parseFloat(raw);
    return isNaN(val) ? null : val;
  }

  // ── Envoi du RAC au backend → iPad reçoit en temps réel ──────────────────
  async function envoyerRACiPad(secu, mutuelle, statut = "accordé") {
    const magasinId = data.magasinId || "";
    if (!magasinId) {
      console.warn("[OptiPilot] magasinId absent du payload — RAC non envoyé");
      return false;
    }
    const montant = Math.max(0, (data.prixTotal || 0) - secu - mutuelle);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rac-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magasinId,
          clientId: null,
          resultat: {
            secu: parseFloat(secu) || 0,
            mutuelle: parseFloat(mutuelle) || 0,
            montant,
            detail: `${data.mutuelle || "Mutuelle"} — RAC confirmé via Optimum Live`,
            statut,
          },
        }),
      });
      return res.ok;
    } catch (err) {
      console.error("[OptiPilot] Erreur envoi RAC :", err);
      return false;
    }
  }

  // ── MutationObserver : détection automatique du RAC calculé par Optimum ──
  // (s'active uniquement si les sélecteurs _output sont renseignés)
  let autoSendDebounce = null;
  function tryAutoDetectRAC() {
    if (!SELECTORS.racSecu_output && !SELECTORS.racMutuelle_output) return;
    const secu    = readDomValue(SELECTORS.racSecu_output);
    const mutuelle = readDomValue(SELECTORS.racMutuelle_output);
    if (secu === null && mutuelle === null) return;
    // Mettre à jour les champs manuels
    const inputSecu = document.getElementById("optipilot-rac-secu");
    const inputMut  = document.getElementById("optipilot-rac-mut");
    if (inputSecu && secu !== null) inputSecu.value = secu;
    if (inputMut && mutuelle !== null) inputMut.value = mutuelle;
    // Auto-envoi avec debounce 2 secondes
    clearTimeout(autoSendDebounce);
    autoSendDebounce = setTimeout(() => {
      const s = parseFloat(document.getElementById("optipilot-rac-secu")?.value || "0") || 0;
      const m = parseFloat(document.getElementById("optipilot-rac-mut")?.value || "0") || 0;
      if (s > 0 || m > 0) {
        envoyerRACiPad(s, m).then((ok) => {
          const status = document.getElementById("optipilot-rac-status");
          if (status) {
            status.textContent = ok ? "✓ RAC envoyé automatiquement à l'iPad !" : "⚠️ Erreur envoi — réessayez manuellement.";
            status.style.color = ok ? "#22c55e" : "#f97316";
          }
        });
      }
    }, 2000);
  }

  const observer = new MutationObserver(() => tryAutoDetectRAC());
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  document.getElementById("optipilot-devis-fill").addEventListener("click", () => {
    const status = document.getElementById("optipilot-devis-status");

    // Optimum Live calcule les prix automatiquement — pas d'input direct.
    // On copie les infos clés dans le presse-papier pour faciliter la saisie manuelle.
    const lines = [
      data.verrier   ? `Verrier : ${data.verrier}` : "",
      data.offre     ? `Offre : ${data.offre}` : "",
      data.prixMonture !== undefined ? `Monture : ${data.prixMonture} €` : "",
      data.prixVerres  !== undefined ? `Verres : ${data.prixVerres} €` : "",
      data.prixTotal   !== undefined ? `Total : ${data.prixTotal} €` : "",
      data.remboursementSecu     ? `Remb. Sécu : ${data.remboursementSecu} €` : "",
      data.remboursementMutuelle ? `Remb. Mutuelle : ${data.remboursementMutuelle} €` : "",
    ].filter(Boolean).join("\n");

    if (lines) {
      navigator.clipboard.writeText(lines).then(() => {
        status.style.color = "#22c55e";
        status.textContent = "✓ Données copiées dans le presse-papier !";
      }).catch(() => {
        status.style.color = "#f97316";
        status.textContent = "⚠️ Copiez les données manuellement ci-dessus.";
      });
    } else {
      status.style.color = "#f97316";
      status.textContent = "⚠️ Aucune donnée devis disponible.";
    }

    // Tenter quand même de remplir le champ RC1 si trouvé
    fillField(SELECTORS.remboursementMutuelle, data.remboursementMutuelle);
  });

  // ── Section : Envoyer le RAC à l'iPad ────────────────────────────────────
  const racSection = document.createElement("div");
  Object.assign(racSection.style, {
    borderTop: "1px solid rgba(83,49,208,0.3)",
    padding: "12px 16px 14px",
  });
  racSection.innerHTML = `
    <p style="color:#FDFDFE;font-size:12px;font-weight:700;margin-bottom:8px;">
      📲 Envoyer le RAC à l'iPad
      ${data.magasinId ? "" : '<span style="color:#f97316;font-size:10px;margin-left:6px;">⚠️ magasinId manquant</span>'}
    </p>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <div style="flex:1;">
        <label style="color:rgba(155,150,218,0.7);font-size:10px;display:block;margin-bottom:3px;">Remb. Sécu (€)</label>
        <input id="optipilot-rac-secu" type="number" step="0.01" min="0"
          value="${data.remboursementSecu || 0}"
          style="width:100%;padding:6px 8px;border-radius:8px;border:1px solid rgba(83,49,208,0.5);
                 background:rgba(10,3,56,0.8);color:#FDFDFE;font-size:13px;box-sizing:border-box;outline:none;" />
      </div>
      <div style="flex:1;">
        <label style="color:rgba(155,150,218,0.7);font-size:10px;display:block;margin-bottom:3px;">Remb. Mutuelle (€)</label>
        <input id="optipilot-rac-mut" type="number" step="0.01" min="0"
          value="${data.remboursementMutuelle || 0}"
          style="width:100%;padding:6px 8px;border-radius:8px;border:1px solid rgba(83,49,208,0.5);
                 background:rgba(10,3,56,0.8);color:#FDFDFE;font-size:13px;box-sizing:border-box;outline:none;" />
      </div>
    </div>
    <button id="optipilot-rac-send"
      style="width:100%;padding:9px;background:linear-gradient(135deg,#ec4899,#9b59b6);
             color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
      📲 Envoyer à l'iPad maintenant
    </button>
    <p id="optipilot-rac-status" style="color:rgba(155,150,218,0.5);font-size:10px;text-align:center;margin-top:5px;min-height:14px;">
      ${SELECTORS.racSecu_output ? "Détection automatique active 🟢" : "Saisir les valeurs après calcul Optimum"}
    </p>
  `;
  panel.appendChild(racSection);

  document.getElementById("optipilot-rac-send").addEventListener("click", async () => {
    const status = document.getElementById("optipilot-rac-status");
    const secu = parseFloat(document.getElementById("optipilot-rac-secu").value) || 0;
    const mut  = parseFloat(document.getElementById("optipilot-rac-mut").value) || 0;
    status.textContent = "Envoi en cours…";
    status.style.color = "rgba(155,150,218,0.6)";
    const ok = await envoyerRACiPad(secu, mut);
    status.textContent = ok
      ? `✓ RAC envoyé ! (Sécu ${secu}€ + Mutuelle ${mut}€) — mis à jour sur l'iPad.`
      : "⚠️ Erreur réseau — vérifiez la connexion internet.";
    status.style.color = ok ? "#22c55e" : "#f97316";
  });
  } // fin afficherPanneau
})();
