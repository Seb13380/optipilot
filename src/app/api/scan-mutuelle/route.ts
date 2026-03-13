import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROMPT = `Tu es un assistant expert en cartes de mutuelle santé françaises.
Analyse cette image de carte mutuelle et extrais UNIQUEMENT les données suivantes au format JSON strict.

Retourne UNIQUEMENT ce JSON, sans texte avant ou après :
{
  "nom": "nom de famille en majuscules ou null",
  "prenom": "prénom ou null",
  "numAdherent": "numéro d'adhérent ou numéro de carte ou null",
  "mutuelle": "nom de la mutuelle/organisme (ex: MGEN, Harmonie Mutuelle, Malakoff Humanis, etc.) ou null",
  "niveauGarantie": "niveau/formule si visible (ex: Confort, Premium, Base, etc.) ou null",
  "dateValidite": "YYYY-MM ou null",
  "organisme": "nom de l'organisme de tiers payant si différent ou null"
}

Règles :
- Le numéro d'adhérent peut aussi être appelé numéro de carte, numéro de membre, N° bénéficiaire
- Si plusieurs noms sont présents, prendre le titulaire principal
- Si la valeur est illisible ou absente, mettre null
- Ne jamais inventer de données`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

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
    if (!jsonMatch) throw new Error("Réponse IA invalide");

    const mutuelle = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ mutuelle, source: "ai" });
  } catch (err) {
    console.error("scan-mutuelle error:", err);
    return NextResponse.json({ error: "Erreur lors du scan" }, { status: 500 });
  }
}
