import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Tu es un assistant expert en optique médicale et lunetterie, intégré dans une application pour opticiens.
Tu réponds AUX CLIENTS qui consultent leur devis en magasin ou sur tablette.

TU RÉPONDS UNIQUEMENT aux questions liées à :
- La correction visuelle (myopie, hypermétropie, astigmatisme, presbytie, sphère, cylindre, addition)
- Les verres ophtalmiques (indices, traitements antireflet, lumière bleue, photochromique, progressif, unifocal)
- Les montures (matériaux, formes, tailles, cerclées, percées, nylor)
- Le remboursement optique (Sécurité Sociale, mutuelle, tiers-payant, 100% Santé, reste à charge)
- Le devis optique (prix, offres, garanties, durée de validité)
- L'adaptation, le port, l'entretien des lunettes
- Les examens de vue (quand en faire, déroulement)

SI la question est hors sujet (météo, politique, cuisine, actualités, etc.), réponds UNIQUEMENT :
"Je suis spécialisé en optique. Je ne peux pas répondre à cette question, mais n'hésitez pas à demander tout ce qui concerne vos lunettes ou votre correction !"

Sois chaleureux, rassurant, pédagogue. Réponds en 2-4 phrases maximum. Utilise des termes simples, le client n'est pas forcément expert.`;

export async function POST(req: NextRequest) {
  try {
    const { question, contexte } = await req.json();
    if (!question?.trim()) {
      return NextResponse.json({ error: "Question vide" }, { status: 400 });
    }

    const userMessage = contexte
      ? `Contexte du devis : ${contexte}\n\nQuestion du client : ${question}`
      : question;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    const reponse = completion.choices[0]?.message?.content?.trim() || "Je n'ai pas pu générer une réponse. Veuillez reformuler votre question.";
    return NextResponse.json({ reponse });
  } catch (err) {
    console.error("[conseil-client]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
