// ─── Analyse IA du visage — morphologie, style, recommandations montures ──────

export interface AnalyseVisage {
  morphologie: string;              // "Ovale" | "Ronde" | "Carrée" | "Cœur" | "Diamant" | "Rectangulaire"
  morphologieDescription: string;   // Description courte de la morphologie
  carnation: string;                // "Chaudes" | "Froides" | "Neutres"
  style: string;                    // "Classique" | "Moderne" | "Fashion" | "Sportif" | "Minimaliste"
  monturesRecommandees: string[];   // ex: ["Rectangulaires", "Papillons", "Cat-eye"]
  monturesAEviter: string[];        // ex: ["Rondes", "Ovales trop larges"]
  couleursRecommandees: string[];   // ex: ["Écaille", "Doré", "Bordeaux"]
  conseil: string;                  // Conseil personnalisé naturel (1-2 phrases)
}

export const MORPHOLOGIES: Record<string, string> = {
  "Ovale":          "Visage équilibré, légèrement plus large aux pommettes. La plupart des formes de montures conviennent.",
  "Ronde":          "Contours arrondis, largeur et hauteur proches. Les montures angulaires allongent et structurent.",
  "Carrée":         "Mâchoire et front prononcés. Les montures rondes ou ovales adoucissent les traits.",
  "Cœur":           "Front large, menton pointu. Les montures plus larges en bas équilibrent les proportions.",
  "Diamant":        "Pommettes larges, front et menton étroits. Les montures ovales ou cat-eye mettent en valeur.",
  "Rectangulaire":  "Visage allongé, traits marqués. Les montures larges et hautes raccourcissent visuellement.",
};
