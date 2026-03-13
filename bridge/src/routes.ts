import { Router, Request, Response } from "express";
import { getPool, discoverSchema, sql } from "./db";
import { SCHEMA } from "./schema-map";
import { broadcast } from "../server";

export const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/schema
// Découverte du schéma Optimum — à utiliser lors de la config initiale
// ─────────────────────────────────────────────────────────────────────────────
router.get("/schema", async (_req: Request, res: Response) => {
  try {
    const schema = await discoverSchema();
    res.json({ ok: true, tables: schema });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/clients/search?q=Dupont
// Recherche un client dans Optimum par nom ou prénom
// ─────────────────────────────────────────────────────────────────────────────
router.get("/clients/search", async (req: Request, res: Response) => {
  const q = String(req.query.q || "").trim();
  if (!q) { res.json({ ok: true, clients: [] }); return; }

  try {
    const p = await getPool();
    const c = SCHEMA.clients;
    const result = await p.request()
      .input("q", sql.NVarChar, `%${q}%`)
      .query(`
        SELECT TOP 10
          ${c.id}         AS id,
          ${c.civilite}   AS civilite,
          ${c.nom}        AS nom,
          ${c.prenom}     AS prenom,
          ${c.telephone}  AS telephone,
          ${c.email}      AS email,
          ${c.mutuelle}   AS mutuelle
        FROM ${c.table}
        WHERE ${c.nom} LIKE @q OR ${c.prenom} LIKE @q
        ORDER BY ${c.nom}
      `);
    res.json({ ok: true, clients: result.recordset });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/clients
// Crée ou met à jour un client dans Optimum
// ─────────────────────────────────────────────────────────────────────────────
router.post("/clients", async (req: Request, res: Response) => {
  const { civilite, nom, prenom, telephone, email, mutuelle, numeroMutuelle } = req.body;

  if (!nom || !prenom) {
    res.status(400).json({ ok: false, error: "nom et prenom requis" });
    return;
  }

  try {
    const p = await getPool();
    const c = SCHEMA.clients;

    // Vérifier si le client existe déjà (par nom + prenom exact)
    const existing = await p.request()
      .input("nom", sql.NVarChar, nom.toUpperCase())
      .input("prenom", sql.NVarChar, prenom)
      .query(`
        SELECT ${c.id} AS id FROM ${c.table}
        WHERE UPPER(${c.nom}) = @nom AND ${c.prenom} = @prenom
      `);

    if (existing.recordset.length > 0) {
      const id = existing.recordset[0].id;
      // Mise à jour
      await p.request()
        .input("id", sql.Int, id)
        .input("tel", sql.NVarChar, telephone || "")
        .input("email", sql.NVarChar, email || "")
        .input("mutuelle", sql.NVarChar, mutuelle || "")
        .input("numMutuelle", sql.NVarChar, numeroMutuelle || "")
        .query(`
          UPDATE ${c.table}
          SET ${c.telephone}=@tel, ${c.email}=@email,
              ${c.mutuelle}=@mutuelle, ${c.numeroMutuelle}=@numMutuelle
          WHERE ${c.id}=@id
        `);
      res.json({ ok: true, action: "updated", clientId: id });
    } else {
      // Insertion
      const insert = await p.request()
        .input("civilite", sql.NVarChar, civilite || "")
        .input("nom", sql.NVarChar, nom.toUpperCase())
        .input("prenom", sql.NVarChar, prenom)
        .input("tel", sql.NVarChar, telephone || "")
        .input("email", sql.NVarChar, email || "")
        .input("mutuelle", sql.NVarChar, mutuelle || "")
        .input("numMutuelle", sql.NVarChar, numeroMutuelle || "")
        .query(`
          INSERT INTO ${c.table}
            (${c.civilite}, ${c.nom}, ${c.prenom}, ${c.telephone},
             ${c.email}, ${c.mutuelle}, ${c.numeroMutuelle})
          OUTPUT INSERTED.${c.id}
          VALUES (@civilite, @nom, @prenom, @tel, @email, @mutuelle, @numMutuelle)
        `);
      const clientId = insert.recordset[0]?.[c.id];
      res.json({ ok: true, action: "created", clientId });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ordonnances
// Crée une ordonnance dans Optimum
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ordonnances", async (req: Request, res: Response) => {
  const {
    clientId, prescripteur, dateOrdonnance,
    odSphere, odCylindre, odAxe, odAddition,
    ogSphere, ogCylindre, ogAxe, ogAddition,
    ecartPupillaire,
  } = req.body;

  if (!clientId) { res.status(400).json({ ok: false, error: "clientId requis" }); return; }

  try {
    const p = await getPool();
    const o = SCHEMA.ordonnances;

    const result = await p.request()
      .input("clientId",       sql.Int,      clientId)
      .input("prescripteur",   sql.NVarChar, prescripteur || "")
      .input("dateOrdo",       sql.Date,     dateOrdonnance ? new Date(dateOrdonnance) : new Date())
      .input("odSphere",       sql.Decimal(5,2), parseFloat(odSphere)   || 0)
      .input("odCylindre",     sql.Decimal(5,2), parseFloat(odCylindre) || 0)
      .input("odAxe",          sql.Int,      parseInt(odAxe)            || 0)
      .input("odAddition",     sql.Decimal(5,2), parseFloat(odAddition) || 0)
      .input("ogSphere",       sql.Decimal(5,2), parseFloat(ogSphere)   || 0)
      .input("ogCylindre",     sql.Decimal(5,2), parseFloat(ogCylindre) || 0)
      .input("ogAxe",          sql.Int,      parseInt(ogAxe)            || 0)
      .input("ogAddition",     sql.Decimal(5,2), parseFloat(ogAddition) || 0)
      .input("ep",             sql.Decimal(5,1), parseFloat(ecartPupillaire) || 0)
      .query(`
        INSERT INTO ${o.table} (
          ${o.idClient}, ${o.prescripteur}, ${o.dateOrdonnance},
          ${o.odSphere}, ${o.odCylindre}, ${o.odAxe}, ${o.odAddition},
          ${o.ogSphere}, ${o.ogCylindre}, ${o.ogAxe}, ${o.ogAddition},
          ${o.ecartPupillaire}
        )
        OUTPUT INSERTED.${o.id}
        VALUES (
          @clientId, @prescripteur, @dateOrdo,
          @odSphere, @odCylindre, @odAxe, @odAddition,
          @ogSphere, @ogCylindre, @ogAxe, @ogAddition,
          @ep
        )
      `);

    const ordonnanceId = result.recordset[0]?.[o.id];
    res.json({ ok: true, ordonnanceId });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/devis
// Crée un devis complet dans Optimum et démarre le polling cotation
// ─────────────────────────────────────────────────────────────────────────────
router.post("/devis", async (req: Request, res: Response) => {
  const {
    clientId, ordonnanceId,
    offreNom, verrierNom, verrierGamme, verrierIndice, verrierClasse,
    prixVerres, montureNom, prixMonture, prixTotal,
    remboursementSS, remboursementMutuelle, resteACharge,
  } = req.body;

  if (!clientId) { res.status(400).json({ ok: false, error: "clientId requis" }); return; }

  try {
    const p = await getPool();
    const d = SCHEMA.devis;

    const result = await p.request()
      .input("clientId",    sql.Int,      clientId)
      .input("ordoId",      sql.Int,      ordonnanceId || null)
      .input("dateDevis",   sql.Date,     new Date())
      .input("statut",      sql.NVarChar, "EN_ATTENTE")
      .input("offreNom",    sql.NVarChar, offreNom    || "")
      .input("verrierNom",  sql.NVarChar, verrierNom  || "")
      .input("verrierGamme",sql.NVarChar, verrierGamme|| "")
      .input("indice",      sql.NVarChar, verrierIndice|| "")
      .input("classe",      sql.NVarChar, verrierClasse|| "")
      .input("prixVerres",  sql.Decimal(10,2), parseFloat(prixVerres)  || 0)
      .input("monture",     sql.NVarChar, montureNom  || "")
      .input("prixMonture", sql.Decimal(10,2), parseFloat(prixMonture) || 0)
      .input("prixTotal",   sql.Decimal(10,2), parseFloat(prixTotal)   || 0)
      .input("remSS",       sql.Decimal(10,2), parseFloat(remboursementSS)      || 0)
      .input("remMut",      sql.Decimal(10,2), parseFloat(remboursementMutuelle)|| 0)
      .input("rac",         sql.Decimal(10,2), parseFloat(resteACharge)         || 0)
      .input("source",      sql.NVarChar, "OPTIPILOT")
      .query(`
        INSERT INTO ${d.table} (
          ${d.idClient}, ${d.idOrdonnance}, ${d.dateDevis}, ${d.statut},
          ${d.offreNom}, ${d.verrierNom}, ${d.verrierGamme}, ${d.verrierIndice}, ${d.verrierClasse},
          ${d.prixVerres}, ${d.montureNom}, ${d.prixMonture}, ${d.prixTotal},
          ${d.remboursementSS}, ${d.remboursementMutuelle}, ${d.resteACharge},
          ${d.originOptiPilot}
        )
        OUTPUT INSERTED.${d.id}
        VALUES (
          @clientId, @ordoId, @dateDevis, @statut,
          @offreNom, @verrierNom, @verrierGamme, @indice, @classe,
          @prixVerres, @monture, @prixMonture, @prixTotal,
          @remSS, @remMut, @rac,
          @source
        )
      `);

    const devisId = result.recordset[0]?.[d.id];

    // Démarre le polling cotation pour ce devis (non-bloquant)
    startCotationPolling(devisId, clientId);

    res.json({ ok: true, devisId });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Polling cotation
// Vérifie toutes les 3s si Optimum a reçu une réponse de la mutuelle
// Envoie le résultat via WebSocket à la tablette dès que disponible
// ─────────────────────────────────────────────────────────────────────────────
function startCotationPolling(devisId: number, clientId: number) {
  const MAX_ATTEMPTS = 60; // 3 min max
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    if (attempts > MAX_ATTEMPTS) {
      clearInterval(interval);
      broadcast("cotation_timeout", { devisId, clientId });
      return;
    }

    try {
      const p = await getPool();
      const cot = SCHEMA.cotations;
      const d = SCHEMA.devis;

      // Cherche la cotation dans la table cotations
      // OU lit les champs directement mis à jour sur le devis par Optimum
      const result = await p.request()
        .input("devisId", sql.Int, devisId)
        .query(`
          SELECT TOP 1
            ${cot.statut}           AS statut,
            ${cot.montantSS}        AS montantSS,
            ${cot.montantMutuelle}  AS montantMutuelle,
            ${cot.resteACharge}     AS resteACharge,
            ${cot.detail}           AS detail
          FROM ${cot.table}
          WHERE ${cot.idDevis} = @devisId
            AND ${cot.statut} = 'REPONDU'
          ORDER BY ${cot.dateReponse} DESC
        `).catch(() =>
          // Fallback : lit directement le devis si pas de table cotation séparée
          p.request()
            .input("devisId", sql.Int, devisId)
            .query(`
              SELECT
                ${d.remboursementSS}       AS montantSS,
                ${d.remboursementMutuelle} AS montantMutuelle,
                ${d.resteACharge}          AS resteACharge,
                ${d.statut}                AS statut
              FROM ${d.table}
              WHERE ${d.id} = @devisId
                AND ${d.statut} IN ('COMPLETE', 'COTATION_OK', 'ACCEPTE')
            `)
        );

      if (result.recordset.length > 0) {
        clearInterval(interval);
        const row = result.recordset[0];
        broadcast("cotation_result", {
          devisId,
          clientId,
          montantSS:       row.montantSS,
          montantMutuelle: row.montantMutuelle,
          resteACharge:    row.resteACharge,
          detail:          row.detail || null,
        });
        console.log(`[COTATION] Résultat reçu pour devis #${devisId}`);
      }
    } catch (err) {
      console.error("[COTATION] Erreur polling :", (err as Error).message);
    }
  }, 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/cotation/:devisId
// Permet aussi de récupérer manuellement le statut de cotation
// ─────────────────────────────────────────────────────────────────────────────
router.get("/cotation/:devisId", async (req: Request, res: Response) => {
  const devisId = parseInt(req.params.devisId, 10);
  if (!devisId) { res.status(400).json({ ok: false, error: "devisId invalide" }); return; }

  try {
    const p = await getPool();
    const d = SCHEMA.devis;

    const result = await p.request()
      .input("devisId", sql.Int, devisId)
      .query(`
        SELECT
          ${d.statut}                AS statut,
          ${d.remboursementSS}       AS montantSS,
          ${d.remboursementMutuelle} AS montantMutuelle,
          ${d.resteACharge}          AS resteACharge
        FROM ${d.table}
        WHERE ${d.id} = @devisId
      `);

    if (result.recordset.length === 0) {
      res.status(404).json({ ok: false, error: "Devis non trouvé" });
      return;
    }

    res.json({ ok: true, cotation: result.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/montures
// Liste les montures en stock depuis Optimum
// Paramètres optionnels : q, marque, genre, prixMax
//
// ⚠️  Les noms de colonnes dans schema-map.ts sont des estimations.
//     Adaptez-les après avoir appelé GET /api/schema sur ce bridge.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/montures", async (req: Request, res: Response) => {
  const { q, marque, genre, prixMax } = req.query as Record<string, string | undefined>;

  try {
    const p = await getPool();
    const m = SCHEMA.montures;

    const conditions: string[] = [];
    const request = p.request();

    if (q) {
      request.input("q", sql.NVarChar, `%${q}%`);
      conditions.push(
        `(${m.marque} LIKE @q OR ${m.modele} LIKE @q OR ${m.couleur} LIKE @q OR ${m.reference} LIKE @q)`
      );
    }
    if (marque) {
      request.input("marque", sql.NVarChar, marque);
      conditions.push(`${m.marque} = @marque`);
    }
    if (genre && genre !== "tout") {
      request.input("genre", sql.NVarChar, genre);
      conditions.push(`${m.genre} = @genre`);
    }
    if (prixMax) {
      request.input("prixMax", sql.Decimal(10, 2), parseFloat(prixMax));
      conditions.push(`${m.prixVente} <= @prixMax`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await request.query(`
      SELECT TOP 300
        CAST(${m.id}             AS VARCHAR) AS id,
        ISNULL(${m.reference},   '')         AS reference,
        ISNULL(${m.codeEAN},     '')         AS codeEAN,
        ISNULL(${m.marque},      'Inconnu')  AS marque,
        ISNULL(${m.modele},      'Modèle')   AS modele,
        ISNULL(${m.couleur},     '')         AS couleur,
        ISNULL(${m.matiere},     '')         AS matiere,
        ISNULL(${m.genre},       'mixte')    AS genre,
        ISNULL(${m.taille},      '')         AS taille,
        ISNULL(${m.prixVente},   0)          AS prixVente,
        ISNULL(${m.quantiteStock}, 0)        AS stock,
        ISNULL(${m.imageUrl},    '')         AS imageUrl
      FROM ${m.table}
      ${where}
      ORDER BY ${m.marque}, ${m.modele}
    `);

    // Nettoyer les imageUrl vides
    const montures = result.recordset.map((row) => ({
      ...row,
      imageUrl: row.imageUrl || null,
      prixVente: typeof row.prixVente === "number" ? row.prixVente : parseFloat(row.prixVente) || 0,
      stock: typeof row.stock === "number" ? row.stock : parseInt(row.stock) || 0,
    }));

    res.json({ ok: true, montures, total: montures.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/montures/:id
// Détail d'une monture par son ID
// ─────────────────────────────────────────────────────────────────────────────
router.get("/montures/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const p = await getPool();
    const m = SCHEMA.montures;

    const result = await p.request()
      .input("id", sql.NVarChar, id)
      .query(`
        SELECT
          CAST(${m.id}             AS VARCHAR) AS id,
          ISNULL(${m.reference},   '')         AS reference,
          ISNULL(${m.codeEAN},     '')         AS codeEAN,
          ISNULL(${m.marque},      'Inconnu')  AS marque,
          ISNULL(${m.modele},      'Modèle')   AS modele,
          ISNULL(${m.couleur},     '')         AS couleur,
          ISNULL(${m.matiere},     '')         AS matiere,
          ISNULL(${m.genre},       'mixte')    AS genre,
          ISNULL(${m.taille},      '')         AS taille,
          ISNULL(${m.prixVente},   0)          AS prixVente,
          ISNULL(${m.quantiteStock}, 0)        AS stock,
          ISNULL(${m.imageUrl},    '')         AS imageUrl
        FROM ${m.table}
        WHERE ${m.id} = @id
      `);

    if (!result.recordset.length) {
      res.status(404).json({ ok: false, error: "Monture non trouvée" });
      return;
    }

    const row = result.recordset[0];
    res.json({
      ok: true,
      monture: { ...row, imageUrl: row.imageUrl || null },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
