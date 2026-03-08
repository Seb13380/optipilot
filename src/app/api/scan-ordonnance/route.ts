import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Si pas de clé API → retourner des données démo
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

    // Appel Claude Vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
              {
                type: "text",
                text: `Analysez cette ordonnance optique et extrayez UNIQUEMENT les données suivantes au format JSON strict.
                
Retournez UNIQUEMENT ce JSON, sans texte avant ou après :
{
  "odSphere": "valeur ou null",
  "odCylindre": "valeur ou null",
  "odAxe": "valeur numérique ou null",
  "odAddition": "valeur ou null",
  "ogSphere": "valeur ou null",
  "ogCylindre": "valeur ou null",
  "ogAxe": "valeur numérique ou null",
  "ogAddition": "valeur ou null",
  "ecartPupillaire": "valeur ou null",
  "prescripteur": "nom du médecin ou null",
  "dateOrdonnance": "YYYY-MM-DD ou null",
  "validiteMois": 36
}

Règles :
- OD = Œil Droit (Right)
- OG = Œil Gauche (Left)
- Les sphères et cylindres incluent le signe + ou -
- ADD = Addition (presbytie)
- Si une valeur n'est pas lisible, mettre null`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || "{}";

    // Parser le JSON retourné par Claude
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format JSON invalide");

    const ordonnance = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ordonnance, source: "claude" });
  } catch (error) {
    console.error("Scan ordonnance error:", error);

    // En cas d'erreur → données démo
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
