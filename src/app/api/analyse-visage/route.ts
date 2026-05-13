import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PROMPT = `Tu es un expert en morphologie du visage et en conseil optique.
Analyse cette photo de visage et retourne une analyse structurée pour aider un opticien à recommander des montures.

═══ MORPHOLOGIE ═══
Identifie la forme du visage parmi : Ovale, Ronde, Carrée, Cœur, Diamant, Rectangulaire
- Ovale : légèrement plus large aux pommettes, front légèrement plus large que le menton, lignes douces
- Ronde : largeur et hauteur similaires, joues pleines, menton arrondi
- Carrée : front large, mâchoire carrée et marquée, largeur front ≈ largeur mâchoire
- Cœur : front large, pommettes hautes, menton fin et pointu
- Diamant : pommettes très larges, front et menton étroits
- Rectangulaire : visage long, front/pommettes/mâchoire de largeur similaire

═══ CARNATION ═══
Détermine si les teintes de peau sont plutôt :
- Chaudes (peau dorée, miel, olive, ambre)
- Froides (peau rosée, beige porcelaine, ébène bleue)
- Neutres (mélange équilibré)

═══ STYLE ═══
Évalue le style apparent de la personne parmi : Classique, Moderne, Fashion, Sportif, Minimaliste

═══ RECOMMANDATIONS MONTURES ═══
En fonction de la morphologie :
- monturesRecommandees : 3 à 4 formes de montures qui mettent en valeur ce visage
- monturesAEviter : 1 à 2 formes à éviter
- couleursRecommandees : 3 teintes de montures adaptées à la carnation

═══ FORMAT DE SORTIE ═══
Retourne UNIQUEMENT ce JSON valide, sans texte avant ni après :
{
  "morphologie": "Ovale",
  "morphologieDescription": "Visage équilibré aux proportions harmonieuses",
  "carnation": "Chaudes",
  "style": "Classique",
  "monturesRecommandees": ["Rectangulaires", "Carrées", "Papillons"],
  "monturesAEviter": ["Trop petites", "Trop rondes"],
  "couleursRecommandees": ["Écaille", "Doré", "Bordeaux"],
  "conseil": "Votre visage ovale s'adapte à presque toutes les formes. Privilégiez des montures aussi larges que la partie la plus large de votre visage pour un résultat optimal."
}

═══ RÈGLES ═══
1. Si la photo est floue, mal cadrée ou ne montre pas clairement un visage → retourner null pour tous les champs sauf un message dans "conseil"
2. Rester positif et bienveillant dans le conseil
3. Les tableaux doivent contenir des chaînes courtes (2-4 mots max)
4. Ne jamais mentionner de marques commerciales`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;

    // Données démo si pas de clé API
    if (!apiKey) {
      return NextResponse.json({
        analyse: {
          morphologie: "Ovale",
          morphologieDescription: "Visage équilibré aux proportions harmonieuses",
          carnation: "Neutres",
          style: "Classique",
          monturesRecommandees: ["Rectangulaires", "Carrées", "Papillons", "Aviateur"],
          monturesAEviter: ["Trop petites", "Rondes trop marquées"],
          couleursRecommandees: ["Écaille", "Noir mat", "Doré"],
          conseil: "Votre visage ovale s'adapte à presque toutes les formes de montures. Choisissez une monture aussi large que la partie la plus large de votre visage pour un rendu parfaitement équilibré.",
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
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Réponse IA invalide" }, { status: 500 });
    }

    const analyse = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ analyse, source: "gpt4o" });

  } catch (err) {
    console.error("Erreur analyse visage:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}
