(function () {
  "use strict";

  // ── Panneau OptiPilot sur MyEasyOptic (relais cloud iPad → PC) ────────────
  // Contrairement à Optimum Live, ici on n'a pas de flux "Ouvrir dans..." avec
  // hash — seul le relais cloud (background.js → OPTIPILOT_DEVIS_RELAY) est
  // utilisé pour l'instant.

  const BACKEND_URL = "https://optipilot-backend.onrender.com";

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "OPTIPILOT_DEVIS_RELAY" && msg.payload) {
      afficherPanneau(msg.payload);
    }
  });

  function afficherPanneau(data) {
    if (document.getElementById("optipilot-devis-panel")) return;

    const panel = document.createElement("div");
    panel.id = "optipilot-devis-panel";
    Object.assign(panel.style, {
      position: "fixed", bottom: "20px", right: "20px", zIndex: "99999", width: "320px",
      background: "linear-gradient(135deg, #0a0338, #1a0a5c)",
      border: "1.5px solid rgba(83,49,208,0.6)", borderRadius: "16px",
      fontFamily: "sans-serif", boxShadow: "0 8px 32px rgba(83,49,208,0.4)", overflow: "hidden",
    });

    const rows = [
      ["Client", `${data.nom || ""} ${data.prenom || ""}`.trim()],
      ["Mutuelle", data.mutuelle || "—"],
      ["Verrier", data.verrier || "—"],
      ["Gamme / Offre", data.offre || "—"],
      ["Prix verres", data.prixVerres ? `${data.prixVerres} €` : "—"],
      ["Prix monture", data.prixMonture ? `${data.prixMonture} €` : "—"],
      ["Total devis", data.prixTotal ? `${data.prixTotal} €` : "—"],
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
          <span style="color:#FDFDFE;font-size:14px;font-weight:700;">Devis OptiPilot</span>
          <button id="optipilot-devis-close" style="background:none;border:none;color:rgba(155,150,218,0.7);cursor:pointer;font-size:18px;line-height:1;padding:0;">×</button>
        </div>
        <p style="color:rgba(155,150,218,0.6);font-size:11px;margin-top:4px;">Reçu depuis l'iPad — saisissez les valeurs dans le devis MyEasyOptic.</p>
      </div>
      <div style="padding:12px 16px;">${rowsHtml}</div>
      <div style="padding:0 16px 14px;">
        <p id="optipilot-rac-status" style="color:rgba(155,150,218,0.6);font-size:11px;text-align:center;margin-top:6px;"></p>
      </div>
    `;
    document.body.appendChild(panel);
    document.getElementById("optipilot-devis-close").addEventListener("click", () => panel.remove());

    demarrerDetectionRAC(data);
  }

  // ── Détection automatique du RAC via les gwt-debug id stables ─────────────
  const SELECTORS = {
    rbtRO:      "#gwt-debug-totalRbtSSLabel",   // Rbt RO (Sécu)
    rbtRC:      "#gwt-debug-totalRbtMut1Label", // Rbt RC (Mutuelle)
    partClient: "#gwt-debug-partClientLabel",   // Part Client TTC (RAC final)
  };

  function lireMontant(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    const raw = (el.textContent || "").replace(/[^\d.,]/g, "").replace(",", ".");
    const val = parseFloat(raw);
    return isNaN(val) ? null : val;
  }

  function demarrerDetectionRAC(data) {
    let debounce = null;
    function tryDetect() {
      const secu = lireMontant(SELECTORS.rbtRO);
      const mutuelle = lireMontant(SELECTORS.rbtRC);
      if (secu === null && mutuelle === null) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => envoyerRACiPad(data, secu || 0, mutuelle || 0), 1500);
    }
    const observer = new MutationObserver(tryDetect);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    tryDetect();
  }

  async function envoyerRACiPad(data, secu, mutuelle) {
    const magasinId = data.magasinId || "";
    if (!magasinId) return;
    const montant = Math.max(0, (data.prixTotal || 0) - secu - mutuelle);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rac-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          magasinId,
          clientId: null,
          resultat: { secu, mutuelle, montant, detail: `${data.mutuelle || "Mutuelle"} — RAC confirmé via MyEasyOptic`, statut: "accordé" },
        }),
      });
      const status = document.getElementById("optipilot-rac-status");
      if (status) {
        status.textContent = res.ok ? "✓ RAC envoyé automatiquement à l'iPad !" : "⚠️ Erreur envoi — réessayez manuellement.";
        status.style.color = res.ok ? "#22c55e" : "#f97316";
      }
    } catch (err) {
      console.error("[OptiPilot] Erreur envoi RAC MyEasyOptic:", err);
    }
  }
})();
