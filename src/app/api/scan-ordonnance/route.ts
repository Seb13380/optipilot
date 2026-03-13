import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROMPT = `Tu es un opticien expert en lecture d'ordonnances optiques françaises, imprimées OU manuscrites.
Analyse l'image avec le plus grand soin. L'ordonnance peut être manuscrite (écriture cursive ou script) ou imprimée.

═══ VALEURS OPTIQUES ═══
Structure courante : tableau OD/OG × SPH/CYL/AXE/ADD. En manuscrit les valeurs peuvent être écrites librement.
- OD = VD = OEil Droit = Right = "D" seul → od*
- OG = VG = OEil Gauche = Left = "G" seul → og*
- SPH / Sph / Sp / Sphère : TOUJOURS avec signe. Exemples : -1,00 → "-1.00" | +2.50 → "+2.50"
  "Plan" / "Pl" / "pl" / "0" sans signe → "+0.00"
  ⚠️ OBLIGATOIRE : si absent ou illisible → retourner "+0.00" (JAMAIS null)
- CYL / Cyl / C / Cylindre : avec signe. Si absent ou illisible → "+0.00" (JAMAIS null)
  Pas d'astigmatisme = "+0.00", PAS null
- AXE / Ax / A / ° : entier 0-180, supprimer le signe ° éventuel → "160" pas "160°"
  Si absente ou illisible → "0" (JAMAIS null)
- ADD / Add / Addition : TOUJOURS positif, ex: "+2.00". Si une seule valeur → idem OD et OG
- EP / PD / DP / Écart pupillaire : nombre en mm → "64"
⚠️ SIGNES CRITIQUES :
  - Lire le signe JUSTE avant le chiffre. En manuscrit un + mal tracé peut ressembler à -.
  - Une valeur écrite avec une virgule : remplacer la virgule par un point → -1,50 → "-1.50"
  - Confirmer chaque signe en croisant avec le contexte clinique habituel :
    • Sphère peut être + ou -. Cylindre est presque toujours négatif (-). Axe est toujours positif.
    • Addition est toujours positive (+) entre +0.50 et +3.50.

═══ PATIENT vs PRESCRIPTEUR ═══
Sur une ordonnance française il y a DEUX personnes distinctes :

1. LE PATIENT (la personne qui porte les lunettes) :
   - Cherche près de : "Nom :", "Prénom :", "Patient :", "M.", "Mme", "Assuré(e) :", "Prescrit pour :", "Nom et prénom :"
   - En manuscrit : souvent écrit sur une ligne pré-imprimée "Nom :" ou "M./Mme"
   - civilite = "M." ou "Mme" (normaliser "Monsieur"→"M.", "Madame"→"Mme")
   - nomPatient = NOM en MAJUSCULES, prenomPatient = Prénom

2. LE PRESCRIPTEUR (l'ophtalmologue/médecin qui SIGNE l'ordonnance) :
   - Son nom est dans l'EN-TÊTE du cabinet (haut de page) ou le tampon/signature (bas)
   - A souvent "Dr." / "Docteur" / "D^r" devant son nom
   - Peut avoir un n° RPPS / ADELI / AM / Sécu près de son nom
   - En manuscrit : son nom est souvent dans l'en-tête pré-imprimé ou dans le tampon encré
   - Format retourné : "Dr. Prénom NOM"
   - NE PAS confondre avec le nom du patient

⚠️ ATTENTION à ne PAS inclure dans nomPatient ou prenomPatient :
   - Les mots "Bienvenue", "Chez", "chez", "Optique", "Opticien", "Lunetterie" ou tout nom de magasin
   - Ces textes sont des mentions de l'opticien ou des formules de politesse imprimées sur le formulaire
   - Si tu lis "À Joëlle MARYSE Bienvenue chez Optique Truc" : nomPatient="MARYSE", prenomPatient="Joëlle", STOP là

═══ DATE ═══
Format français JJ/MM/AAAA (le jour TOUJOURS en premier) :
  "10/03/2026" = 10 mars 2026 → retourner "2026-03-10"
  "09/01/2023" = 9 janvier 2023 → retourner "2023-01-09"
En manuscrit : souvent écrite après "Le " ou "Fait le " ou "À [ville], le " ou seule près de la signature.
⚠️ NE PAS prendre la date de naissance du patient ni la date d'expiration.
Si ambiguïté entre JJ et MM (ex: 06/03 ou 03/06), préférer la lecture JJ/MM/AAAA.

═══ FORMAT DE SORTIE ═══
Retourne UNIQUEMENT ce JSON valide, sans aucun texte avant ni après :
{
  "civilite": null,
  "nomPatient": null,
  "prenomPatient": null,
  "odSphere": "+0.00",
  "odCylindre": "+0.00",
  "odAxe": "0",
  "odAddition": null,
  "ogSphere": "+0.00",
  "ogCylindre": "+0.00",
  "ogAxe": "0",
  "ogAddition": null,
  "ecartPupillaire": null,
  "prescripteur": null,
  "dateOrdonnance": null
}

═══ RÈGLES STRICTES ═══
1. Valeurs numériques = CHAÎNES entre guillemets : "-2.50", "90", "+2.00"
2. Séparateur décimal = POINT (pas virgule) : "-1.50" pas "-1,50"
3. Valeur absente, illisible ou incertaine = null (sans guillemets)
4. NE JAMAIS écrire la chaîne "null" entre guillemets
5. NE PAS inventer de valeur — mieux vaut null qu'une erreur
6. Pour les valeurs partiellement lisibles, faire le meilleur effort de lecture`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;

    // Si pas de clé API → données démo clairement marquées
    if (!apiKey) {
      return NextResponse.json({
        ordonnance: {
          nomPatient: "DEMO",
          prenomPatient: "Patient",
          odSphere: "-2.50", odCylindre: "+0.75", odAxe: "90", odAddition: null,
          ogSphere: "-3.00", ogCylindre: "+1.25", ogAxe: "85", ogAddition: null,
          ecartPupillaire: "64",
          prescripteur: "Dr. Dupont",
          dateOrdonnance: new Date().toISOString().split("T")[0],
          validiteMois: 36,
        },
        source: "demo",
      });
    }

    const openai = new OpenAI({ apiKey });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = (mimeMatch?.[1] || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format JSON invalide retourné par GPT-4o");

    const raw = JSON.parse(jsonMatch[0]);

    // Nettoyage : convertir les chaînes "null" en vrais null JSON
    const ordonnance: Record<string, string | null> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (val === null || val === undefined || val === "null" || val === "undefined" || val === "") {
        ordonnance[key] = null;
      } else {
        ordonnance[key] = String(val).trim();
      }
    }

    // Normalisation : les valeurs optiques ne peuvent jamais être nulles
    // Si GPT n'a pas trouvé une valeur, on met le zéro clinique approprié
    const OD_OG = ["od", "og"] as const;
    for (const eye of OD_OG) {
      if (!ordonnance[`${eye}Sphere`])   ordonnance[`${eye}Sphere`]   = "+0.00";
      if (!ordonnance[`${eye}Cylindre`]) ordonnance[`${eye}Cylindre`] = "+0.00";
      if (!ordonnance[`${eye}Axe`])      ordonnance[`${eye}Axe`]      = "0";
    }

    // Nettoyer le nomPatient : retirer tout ce qui suit "Bienvenue" si GPT a capturé du texte parasite
    if (ordonnance.nomPatient) {
      ordonnance.nomPatient = ordonnance.nomPatient
        .replace(/\s*(bienvenue|chez|optique|opticien|lunetterie).*/i, "")
        .trim();
      if (!ordonnance.nomPatient) ordonnance.nomPatient = null;
    }

    console.log("[scan-ordonnance] GPT raw:", raw);
    console.log("[scan-ordonnance] cleaned+normalized:", ordonnance);

    return NextResponse.json({ ordonnance, source: "gpt-4o" });

  } catch (error) {
    console.error("Scan ordonnance error:", error);
    return NextResponse.json(
      { error: "Impossible de lire l'ordonnance. Vérifiez la qualité de l'image.", detail: (error as Error).message },
      { status: 500 }
    );
  }
}
