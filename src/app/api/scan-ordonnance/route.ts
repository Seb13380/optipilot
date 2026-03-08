import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROMPT = `Tu es un assistant optométriste expert.
Analyse cette ordonnance optique et extrais UNIQUEMENT les données suivantes au format JSON strict.

Retourne UNIQUEMENT ce JSON, sans texte avant ou après :
{
  "odSphere": "valeur avec signe (+/-) ou null",
  "odCylindre": "valeur avec signe (+/-) ou null",
  "odAxe": "valeur numérique ou null",
  "odAddition": "valeur avec signe (+/-) ou null",
  "ogSphere": "valeur avec signe (+/-) ou null",
  "ogCylindre": "valeur avec signe (+/-) ou null",
  "ogAxe": "valeur numérique ou null",
  "ogAddition": "valeur avec signe (+/-) ou null",
  "ecartPupillaire": "valeur ou null",
  "prescripteur": "nom du médecin ou null",
  "dateOrdonnance": "YYYY-MM-DD ou null",
  "validiteMois": 36
}

Règles :
- OD = Œil Droit (Right / R)
- OG = Œil Gauche (Left / L)
- Sphères et cylindres incluent toujours le signe + ou -
- ADD = Addition (presbytie)
- Si une valeur est illisible ou absente, mettre null`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;

    // Si pas de clé API → données démo
    if (!apiKey) {
      return NextResponse.json({
        ordonnance: {
          odSphere: "-2.50",
          odCylindre: "+0.75",
          odAxe: "90",
          odAddition: "+2.00",
          ogSphere: "-3.00",
          ogCylindre: "+1.25",
          ogAxe: "85",
          ogAddition: "+2.00",
          prescripteur: "Dr. Dupont",
          dateOrdonnance: new Date().toISOString().split("T")[0],
          validiteMois: 36,
        },
        source: "demo",
      });
    }

    const openai = new OpenAI({ apiKey });

    // Nettoyage du base64
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = (mimeMatch?.[1] || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 800,
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
            {
              type: "text",
              text: PROMPT,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";

    // Parser le JSON retourné par GPT-4o
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format JSON invalide retourné par GPT-4o");

    const ordonnance = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ordonnance, source: "gpt-4o" });
  } catch (error) {
    console.error("Scan ordonnance error (GPT-4o):", error);

    // En cas d'erreur → données démo pour ne pas bloquer le flux
    return NextResponse.json({
      ordonnance: {
        odSphere: "-2.50",
        odCylindre: "+0.75",
        odAxe: "90",
        odAddition: "+2.00",
        ogSphere: "-3.00",
        ogCylindre: "+1.25",
        ogAxe: "85",
        ogAddition: "+2.00",
        prescripteur: "Dr. Dupont",
        dateOrdonnance: new Date().toISOString().split("T")[0],
        validiteMois: 36,
      },
      source: "demo",
      error: (error as Error).message,
    });
  }
}
