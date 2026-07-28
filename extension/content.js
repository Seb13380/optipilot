(function () {
  "use strict";

  if (document.getElementById("optipilot-btn")) return;

  function getLineContents() {
    return Array.from(document.querySelectorAll("span.line_content"))
      .map((el) => el?.textContent?.trim() || "")
      .filter(Boolean);
  }

  /** Lit l'adresse directement depuis les inputs du formulaire Optimum Live */
  function extractAdresseFromForm() {
    const adresse   = document.querySelector("input[name='infos_client[adresse][ligne_1]']")?.value?.trim() || "";
    const cp        = document.querySelector("input[name='infos_client[adresse][code_postal]']")?.value?.trim()
                   || document.querySelector("input[id*='code_postal']")?.value?.trim() || "";
    const ville     = document.querySelector("input[name='infos_client[adresse][ville]']")?.value?.trim()
                   || document.querySelector("input[id*='ville']")?.value?.trim() || "";
    return { adresse, codePostal: cp, ville };
  }

  /** Lit nom et prénom directement depuis les inputs du formulaire Optimum Live */
  function extractNomPrenomFromForm() {
    const nom    = document.querySelector("input[name='infos_client[nom]']")?.value?.trim()
                || document.querySelector("input[id*='nom_client']")?.value?.trim()
                || document.querySelector("input[name*='[nom]']")?.value?.trim() || "";
    const prenom = document.querySelector("input[name='infos_client[prenom]']")?.value?.trim()
                || document.querySelector("input[id*='prenom_client']")?.value?.trim()
                || document.querySelector("input[name*='[prenom]']")?.value?.trim() || "";
    return { nom, prenom };
  }

  function parseName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    const nomParts = [];
    const prenomParts = [];
    for (const word of parts) {
      if (word === word.toUpperCase() && /[A-Z]/.test(word)) {
        nomParts.push(word);
      } else {
        prenomParts.push(word);
      }
    }
    return { nom: nomParts.join(" "), prenom: prenomParts.join(" ") };
  }

  /**
   * Extrait tous les champs depuis les span.line_content.
   * Structure Optimum Live connue :
   *   'TEST Devis', '01/06/2005 (21 ans)', '+(33) 6 44 26 98 96',
   *   'email@gmail.com', 'Ajouter un rendez-vous', 'NOM Prenom – ID',
   *   'VL+VP...', 'OD :...', 'OG :...', ..., 'MUTUELLE NOM (code)', ...
   */
  function extractAllFields(lines) {
    const result = { nom: "", prenom: "", ddn: "", telephone: "", email: "", adresse: "", codePostal: "", ville: "", mutuelle: "", numAdherent: "", numContrat: "" };

    // Patterns à ignorer pour la mutuelle
    const mutuellSkip = [
      /^(OD|OG)\s/i,
      /^(VL|VP|ADD|Ajouter|PEC|TEST|Historique)/i,
      /\d{2}\/\d{2}\/\d{4}/,
      /\u2013\s*\d{5,}/,   // ligne "NOM – ID"
      /@/,                  // email
      /^\+|^0[0-9]/,        // téléphone
      /RPPS|ADELI|FINESS/i, // identifiants professionnels de santé
      /\bDr\.?\b|\bDocteur\b|\bOphtalmolog|\bOphtalmique|\bMédecin\b|\bCabinet\b|\bClinic|\bCENTRE\s+OPHTALMIQUE/i, // médecins
    ];

    for (const line of lines) {
      if (!line) continue;

      // Date de naissance
      if (!result.ddn && /\d{2}\/\d{2}\/\d{4}/.test(line)) {
        result.ddn = line.match(/\d{2}\/\d{2}\/\d{4}/)[0];
        continue;
      }

      // Téléphone : commence par + ou 0X (après suppression espaces)
      if (!result.telephone && /^(\+|0[0-9])/.test(line.replace(/\s/g, ""))) {
        result.telephone = line.trim();
        continue;
      }

      // Email
      if (!result.email && line.includes("@")) {
        result.email = line.trim();
        continue;
      }

      // Lignes à ignorer pour le nom : ophtalmologue, médecin, ordonnance
      const isDoctor = /\bDr\.?\b|\bDocteur\b|\bOphtalmolog|\bMédecin\b|\bRPPS\b|\bADELI\b|\bCabinet\b|\bClinic|\bCenter\b/i.test(line);

      // Nom + ID client : "BOUTESELLE Jean – 331037531" (em dash ou tiret normal)
      // ou "BOUTESELLE Jean - 331037531" ou "BOUTESELLE Jean (331037531)"
      if (!result.nom && !isDoctor && /[\u2013\u2014\-]\s*\d{5,}/.test(line)) {
        const nameOnly = line.replace(/\s*[\u2013\u2014\-]\s*\d+.*$/, "").trim();
        const parsed = parseName(nameOnly);
        if (parsed.nom) { result.nom = parsed.nom; result.prenom = parsed.prenom; continue; }
      }
      // Fallback : ligne dont le premier mot est entièrement en majuscules (ex: "BOUTESELLE Jean")
      if (!result.nom && !isDoctor && !result.ddn && !/@/.test(line) && !/^(\+|0[0-9])/.test(line.replace(/\s/g,""))) {
        const firstWord = line.trim().split(/\s+/)[0];
        if (firstWord && firstWord === firstWord.toUpperCase() && /^[A-Z]{2,}/.test(firstWord) && !/^(OD|OG|VL|VP|ADD|PEC|TEST|Ajouter|Historique)/i.test(line)) {
          const parsed = parseName(line.trim());
          if (parsed.nom) { result.nom = parsed.nom; result.prenom = parsed.prenom; continue; }
        }
      }

      // Numéro adhérent : "N° adhérent : 123456789" ou "Adhérent : 123456789" ou "N°Adhérent 123456789"
      if (!result.numAdherent && /adh[eé]rent/i.test(line)) {
        const m = line.match(/[:\s]([A-Z0-9]{6,20})\s*$/i);
        if (m) { result.numAdherent = m[1].trim(); continue; }
      }

      // Numéro de contrat : "N° contrat : 123456" ou "Contrat : 123456"
      if (!result.numContrat && /contrat/i.test(line)) {
        const m = line.match(/[:\s]([A-Z0-9]{4,20})\s*$/i);
        if (m) { result.numContrat = m[1].trim(); continue; }
      }

      // Code postal + ville : ligne contenant un code postal à 5 chiffres
      if (!result.codePostal && /\b\d{5}\b/.test(line)) {
        const cpMatch = line.match(/\b(\d{5})\b/);
        if (cpMatch) {
          result.codePostal = cpMatch[1];
          // La ville est souvent le texte après le code postal
          const afterCP = line.replace(/.*\b\d{5}\b\s*/, "").trim();
          if (afterCP) result.ville = afterCP;
          continue;
        }
      }

      // Adresse : ligne contenant "rue", "avenue", "bd", "boulevard", "allée",
      // "chemin", "impasse", "place", "route", "voie", ou qui commence par un numéro suivi d'une lettre
      if (!result.adresse && /\b(rue|avenue|av\.|bd|boulevard|allée|allee|chemin|impasse|place|route|voie|lotissement|résidence|residence)\b/i.test(line)) {
        result.adresse = line.trim();
        continue;
      }
      // Fallback adresse : commence par un chiffre suivi d'un mot (ex: "12 Sentier des Rosiers")
      if (!result.adresse && /^\d+\s+[A-Za-z]/.test(line) && !/@/.test(line) && !/\d{2}\/\d{2}\/\d{4}/.test(line)) {
        result.adresse = line.trim();
        continue;
      }

      // Mutuelle : au moins 2 mots entièrement en majuscules (3+ lettres)
      // ex: "MGEN BOUCHES DU RHONE (91 – 131 – 0506)"
      if (!result.mutuelle && !isDoctor && !mutuellSkip.some((p) => p.test(line))) {
        const upperWords = (line.match(/[A-Z]{3,}/g) || []);
        if (upperWords.length >= 2) {
          result.mutuelle = line.trim();
        }
      }
    }

    return result;
  }

  /** Fallback : cherche le nom dans les éléments de titre de la page */
  function extractNameFromDOM() {
    // Optimum Live affiche souvent le nom du client dans un h1, h2, ou un élément avec classe contenant "client" ou "nom"
    const selectors = [
      "h1", "h2",
      "[class*='client-name']", "[class*='client_name']",
      "[class*='nom-client']", "[class*='nom_client']",
      "[class*='fiche-client']", "[class*='fiche_client']",
      ".patient-name", ".client-title",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent?.trim();
        // Exclure si c'est un médecin/ophtalmo
        if (text && text.length > 2 && text.length < 80 && !/\bDr\.?\b|\bDocteur\b|\bOphtalmolog/i.test(text)) {
          const parsed = parseName(text.replace(/\s*[\u2013\u2014\-]\s*\d+.*$/, "").trim());
          if (parsed.nom) return parsed;
        }
      }
    }
    // Dernier recours : titre de l'onglet (contient souvent "NOM Prenom | Optimum Live")
    const title = document.title?.trim();
    if (title && title.length > 2 && !/\bDr\.?\b|\bDocteur\b/i.test(title)) {
      const cleaned = title.replace(/\s*[\u2013\u2014\-\|].*$/, "").trim();
      const parsed = parseName(cleaned);
      if (parsed.nom) return parsed;
    }
    return null;
  }

  function getClientId() {
    const match = window.location.pathname.match(/\/clients\/synthese\/index\/(\d+)/);
    return match ? match[1] : "";
  }

  // ── Bouton ────────────────────────────────────────────────────────────────

  const btn = document.createElement("button");
  btn.id = "optipilot-btn";
  btn.title = "Ouvrir dans OptiPilot";
  btn.innerHTML = `
    <img src="https://www.optipilot.fr/assets/images/logo.png"
         onerror="this.style.display='none'"
         style="height:20px;vertical-align:middle;flex-shrink:0;" />
    <span id="optipilot-btn-label" style="
      max-width:0;overflow:hidden;white-space:nowrap;
      transition:max-width 0.3s ease,margin-left 0.3s ease;
      margin-left:0;font-size:13px;font-weight:bold;">
      Ouvrir dans OptiPilot
    </span>
  `;

  Object.assign(btn.style, {
    position: "fixed",
    top: "72px",
    right: "0px",
    zIndex: "99999",
    padding: "8px 10px",
    background: "linear-gradient(135deg, #5331D0, #9B96DA)",
    color: "#fff",
    border: "none",
    borderRadius: "8px 0 0 8px",
    fontFamily: "sans-serif",
    cursor: "pointer",
    boxShadow: "-3px 3px 12px rgba(83,49,208,0.4)",
    display: "flex",
    alignItems: "center",
    transition: "padding 0.3s ease",
  });

  const label = btn.querySelector("#optipilot-btn-label");
  btn.addEventListener("mouseenter", () => {
    label.style.maxWidth = "180px";
    label.style.marginLeft = "8px";
    btn.style.padding = "8px 14px 8px 10px";
  });
  btn.addEventListener("mouseleave", () => {
    label.style.maxWidth = "0";
    label.style.marginLeft = "0";
    btn.style.padding = "8px 10px";
  });

  btn.addEventListener("click", () => {
    const lines = getLineContents();
    if (lines.length === 0) {
      alert("OptiPilot : impossible de trouver les données client sur cette page.");
      return;
    }

    const fields = extractAllFields(lines);

    // Nom/prénom lus en priorité depuis les inputs du formulaire Optimum Live
    const nomForm = extractNomPrenomFromForm();
    if (nomForm.nom) { fields.nom = nomForm.nom; fields.prenom = nomForm.prenom; }

    // Adresse lue directement depuis les inputs du formulaire Optimum Live
    const adresseForm = extractAdresseFromForm();
    if (adresseForm.adresse) fields.adresse = adresseForm.adresse;
    if (adresseForm.codePostal) fields.codePostal = adresseForm.codePostal;
    if (adresseForm.ville) fields.ville = adresseForm.ville;

    // Si le nom n'a pas été trouvé dans les span.line_content, on cherche dans le DOM
    if (!fields.nom) {
      const fallback = extractNameFromDOM();
      if (fallback) { fields.nom = fallback.nom; fields.prenom = fallback.prenom; }
    }

    const optimumId = getClientId();

    const params = new URLSearchParams();
    if (fields.nom)        params.set("nom", fields.nom);
    if (fields.prenom)     params.set("prenom", fields.prenom);
    if (fields.ddn)        params.set("ddn", fields.ddn);
    if (fields.telephone)  params.set("telephone", fields.telephone);
    if (fields.email)      params.set("email", fields.email);
    if (fields.adresse)      params.set("adresse", fields.adresse);
    if (fields.codePostal)   params.set("codePostal", fields.codePostal);
    if (fields.ville)        params.set("ville", fields.ville);
    if (fields.mutuelle)     params.set("mutuelle", fields.mutuelle);
    if (fields.numAdherent)  params.set("numAdherent", fields.numAdherent);
    if (fields.numContrat)   params.set("numContrat", fields.numContrat);
    if (optimumId)           params.set("optimumId", optimumId);
    params.set("source", "optimum");

    // Ouvrir sur le PC (comportement existant)
    window.open("https://www.optipilot.fr/nouveau-client?" + params.toString(), "_blank");

    // Envoyer aussi au cloud → iPad récupère automatiquement
    try {
      chrome.runtime.sendMessage({
        type: "CLIENT_PUSH",
        payload: Object.fromEntries(params.entries()),
      });
    } catch {
      // Extension context invalidated — ignorer (rafraîchir la page résout le problème)
    }
  });

  document.body.appendChild(btn);
})();
