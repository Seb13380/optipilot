import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROMPT = `Tu es un assistant expert en cartes de mutuelle santé françaises (cartes de tiers payant optique/santé).
Analyse cette image avec attention et extrais les données en respectant STRICTEMENT les libellés visibles sur la carte.

Retourne UNIQUEMENT ce JSON valide, sans texte avant ou après :
{
  "nom": "nom de famille en majuscules ou null",
  "prenom": "prénom ou null",
  "dateNaissance": "date de naissance JJ/MM/AAAA ou null",
  "numSecu": "valeur du champ NNI ou N°NNI ou NIR ou N° Sécurité Sociale (13 ou 15 chiffres) ou null",
  "numAdherent": "valeur du champ N°Adhérent ou Adhérent ou N° de carte ou Numéro adhérent. Identifiant court (6-12 caractères) DIFFÉRENT du NNI et du N°AMC. Valeur sous ce libellé exact uniquement ou null",
  "numAmc": "valeur du champ N°AMC ou Code AMC ou AMC ou numéro organisme complémentaire ou null",
  "adresse": "numéro et nom de la voie ou null",
  "codePostal": "code postal 5 chiffres ou null",
  "ville": "nom de la ville ou null",
  "mutuelle": "nom exact de la mutuelle tel qu'il apparaît sur la carte (ex: IRP AUTO, MGEN, Harmonie Mutuelle) ou null",
  "niveauGarantie": "niveau ou formule si visible (ex: Confort, Premium, Base) ou null",
  "dateValidite": "période de validité lisible sur la carte. Si deux dates (début et fin) : retourner \"JJ/MM/AAAA au JJ/MM/AAAA\". Si une seule date de fin : \"YYYY-MM\". Cherche : \"Validité du ... au ...\", \"Valable du ... au ...\", \"Du ... au ...\", \"Valable jusqu'au ...\", \"Date d'expiration\", \"Fin de droits\". ou null",
  "organisme": "nom de l'organisme de tiers payant tel qu'il apparaît (champ souvent libellé Organisme, Tiers Payant, Gestionnaire, ou dans le bas de la carte) ou null"
}

RÈGLES CRITIQUES :
1. numSecu : cherche le libellé NNI, N°NNI, NIR, N° Sécu. C'est un numéro de 13 ou 15 chiffres. NE PAS confondre avec numAdherent ou numAmc.
2. numAdherent : cherche spécifiquement "N°Adhérent", "Adhérent N°", "N° de carte", "Numéro adhérent". C'est identifiant court PROPRE à la mutuelle — ne pas y mettre le NNI ni l'AMC.
3. numAmc : cherche "N°AMC", "AMC", "Code AMC", "N° organisme". Souvent 9 chiffres commençant par 9.
4. dateValidite : si la carte indique "du JJ/MM/AAAA au JJ/MM/AAAA", retourner "JJ/MM/AAAA au JJ/MM/AAAA". Si uniquement une date de fin, retourner "YYYY-MM".
5. organisme : cherche "Organisme", "Tiers payant", "Gestionnaire", "Caisse", ou le nom en bas/en-tête de carte.
6. Lire chaque valeur UNIQUEMENT sous son libellé — ne pas mélanger les champs.
7. Si un champ est absent ou illisible : null. Ne jamais inventer.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const image: string = body?.image || "";

    if (!image) {
      return NextResponse.json({ error: "Image manquante" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Données démo si pas de clé
      return NextResponse.json({
        mutuelle: {
          nom: "DUPONT",
          prenom: "Sophie",
          numAdherent: "123456789",
          mutuelle: "MGEN",
          niveauGarantie: "Confort",
          dateValidite: "2027-12",
          organisme: null,
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
      max_tokens: 500,
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

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Pas de JSON dans la réponse : image illisible ou pas une carte mutuelle
      return NextResponse.json(
        { error: "Impossible de lire la carte. Vérifiez que la carte est bien visible et réessayez." },
        { status: 422 }
      );
    }

    const mutuelle = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ mutuelle, source: "ai" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("scan-mutuelle error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
