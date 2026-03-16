// ============================================================
// Conseiller Opticien Expert — Base de connaissances métier
// Répond aux questions courantes en tenant compte du profil client.
// Ne prend jamais parti pour une marque.
// ============================================================

export interface ContexteClient {
  typeCorrection?: string;       // ex: "Myopie", "Astigmatisme mixte"
  intensite?: string;            // "légère" | "modérée" | "forte"
  presbytie?: string | null;     // "débutante" | "confirmée" | "avancée" | null
  indiceRecommande?: string;     // ex: "1.6"
  typeVerre?: "unifocal" | "progressif";
  tempsEcran?: number;
  conduiteNuit?: boolean;
  photophobie?: boolean;
  sport?: boolean;
  preferenceMonture?: string;
  budget?: string;
}

export interface ReponseConseiller {
  texte: string;
  conseils?: string[];    // bullets supplémentaires
  attention?: string;     // point important à retenir
}

interface EntreeKnowledge {
  mots: string[];                                      // keywords déclencheurs
  questionLabel: string;                               // libellé affiché en puce
  repondre: (ctx: ContexteClient) => ReponseConseiller;
}

// ────────────────────────────────────────────────────────────
// BASE DE CONNAISSANCES
// ────────────────────────────────────────────────────────────
const KNOWLEDGE: EntreeKnowledge[] = [
  // ── Verres progressifs ──────────────────────────────────
  {
    mots: ["progressif", "progressive", "progressives", "progressifs", "addition", "près", "loin", "deux foyers"],
    questionLabel: "C'est quoi les verres progressifs ?",
    repondre: (ctx) => ({
      texte: ctx.typeVerre === "progressif"
        ? "Votre ordonnance présente une addition, ce qui signifie que vous avez besoin de deux corrections : une pour voir de loin et une pour voir de près. Un verre progressif intègre ces deux corrections en une seule paire de lunettes — pas de ligne visible, transitions naturelles."
        : "Les verres progressifs sont prescrits lorsqu'une ordonnance comporte une addition (valeur Add.). Ils intègrent en un seul verre la vision de loin, intermédiaire (écran) et de près. Il n'y a pas de rupture visible — la vision est naturelle.",
      conseils: [
        "La zone de vision de loin se trouve en haut du verre, et la zone de près en bas.",
        "Il faut un temps d'adaptation de quelques jours à quelques semaines selon les personnes.",
        "Les progressifs haut de gamme ont des couloirs de vision plus larges et sont plus confortables.",
        "Pour une première paire de progressifs, préférez un verre de qualité correcte dès le départ.",
      ],
      attention: ctx.typeVerre === "progressif"
        ? "Pour votre profil, c'est un verre progressif qui est recommandé. La qualité du verre influence directement le confort d'adaptation."
        : undefined,
    }),
  },

  // ── Indice du verre ─────────────────────────────────────
  {
    mots: ["indice", "1.5", "1.6", "1.67", "1.74", "mince", "épais", "épaisseur", "lourd", "léger"],
    questionLabel: "Pourquoi un indice de verre élevé ?",
    repondre: (ctx) => ({
      texte: `L'indice d'un verre mesure sa capacité à dévier la lumière. Plus l'indice est élevé, plus le verre peut être mince à correction identique. Pour votre profil${ctx.indiceRecommande ? `, nous recommandons un indice ${ctx.indiceRecommande}` : ""}.`,
      conseils: [
        "Indice 1.5 : verre standard, adapté aux corrections faibles.",
        "Indice 1.6 : verre fin — bon rapport confort / prix pour corrections moyennes.",
        "Indice 1.67 : verre très fin — recommandé pour les fortes corrections.",
        "Indice 1.74 : verre ultra-fin — réservé aux très fortes corrections.",
        "Un verre plus mince est aussi plus léger et plus esthétique.",
      ],
      attention: ctx.intensite === "forte"
        ? "Avec une correction forte, l'indice élevé fait une vraie différence d'épaisseur et de confort."
        : undefined,
    }),
  },

  // ── Antireflet ──────────────────────────────────────────
  {
    mots: ["antireflet", "anti-reflet", "reflet", "reflets", "éblouissement", "éblouissements", "halo", "halos", "briller"],
    questionLabel: "À quoi sert l'antireflet ?",
    repondre: (ctx) => ({
      texte: "L'antireflet est un traitement appliqué sur les deux faces du verre qui supprime les reflets parasites. Sans antireflet, une partie de la lumière est réfléchie sur le verre, créant des halos et éblouissements — particulièrement la nuit ou devant les écrans.",
      conseils: [
        "Un antireflet standard élimine les reflets et facilite l'entretien quotidien.",
        "Un antireflet premium ajoute des propriétés antisalissures, hydrophobes et oléophobes — la pluie et les traces de doigts glissent.",
        ctx.conduiteNuit ? "Pour la conduite nocturne, un antireflet haute performance est conseillé pour réduire les halos des phares." : "En usage quotidien, même un antireflet standard améliore significativement le confort.",
        "Les verres sans antireflet fatiguent davantage les yeux car ils laissent passer moins de lumière utile.",
      ],
      attention: ctx.conduiteNuit
        ? "Votre profil inclut de la conduite de nuit — un antireflet haut de gamme est particulièrement recommandé pour vous."
        : undefined,
    }),
  },

  // ── Filtre lumière bleue ─────────────────────────────────
  {
    mots: ["lumière bleue", "lumiere bleue", "blue light", "filtre bleu", "écran", "ecran", "ordinateur", "tablette", "fatigue visuelle", "yeux fatigués"],
    questionLabel: "C'est quoi le filtre lumière bleue ?",
    repondre: (ctx) => ({
      texte: "Les écrans (ordinateur, smartphone, tablette) émettent de la lumière bleue à haute énergie. Une exposition prolongée peut provoquer de la fatigue visuelle, des maux de tête et perturber le sommeil. Un traitement anti-lumière bleue filtre une partie de ces longueurs d'onde.",
      conseils: [
        ctx.tempsEcran && ctx.tempsEcran >= 6
          ? `Avec ${ctx.tempsEcran}h d'écran par jour, ce traitement est particulièrement pertinent pour votre profil.`
          : "Pour une utilisation modérée des écrans, l'antireflet standard suffit souvent.",
        "Ce traitement peut légèrement teinter les verres — certaines personnes le perçoivent, d'autres non.",
        "La règle 20-20-20 aide aussi : toutes les 20 minutes, regarder à 20 mètres pendant 20 secondes.",
      ],
      attention: undefined,
    }),
  },

  // ── Verres photochromiques ───────────────────────────────
  {
    mots: ["photochromique", "photochromiques", "soleil", "s'assombrit", "colore", "coloré", "transition", "transitions", "teintent", "automatique"],
    questionLabel: "Comment fonctionnent les verres photochromiques ?",
    repondre: (ctx) => ({
      texte: "Les verres photochromiques contiennent des molécules qui réagissent aux UV : ils s'assombrissent automatiquement en plein soleil (comme des lunettes de soleil) et redeviennent clairs en quelques minutes en intérieur. Ils remplacent une deuxième paire de lunettes solaires pour un usage courant.",
      conseils: [
        "Le changement de teinte prend environ 30 à 60 secondes en s'exposant au soleil.",
        "Le retour au clair prend 3 à 5 minutes en intérieur.",
        "Attention : en voiture, le pare-brise filtre les UV — les verres peuvent ne pas assombrir complètement.",
        ctx.photophobie ? "Pour votre sensibilité à la lumière, ce type de verre est particulièrement adapté." : "Pour un usage ponctuel au soleil, une deuxième paire de lunettes solaires peut être plus efficace.",
        "La teinte au soleil est en catégorie 2-3 — suffisante pour la ville et le quotidien, mais pas pour la montagne ou la mer.",
      ],
      attention: "En voiture, les photochromiques se comportent comme des verres clairs car le pare-brise bloque les UV.",
    }),
  },

  // ── Myopie ──────────────────────────────────────────────
  {
    mots: ["myopie", "myope", "loin", "flou", "myopique", "sphère négative", "signe moins"],
    questionLabel: "C'est quoi la myopie ?",
    repondre: (ctx) => ({
      texte: "La myopie est un défaut de vision de loin : les objets proches sont nets, mais ceux à distance apparaissent flous. Elle est corrigée par des verres dont la puissance (sphère) est notée avec un signe négatif (−).",
      conseils: [
        "La myopie se stabilise généralement vers 20-25 ans.",
        "Une myopie légère (−1 à −3 dioptries) est courante et bien corrigée par des verres standard.",
        "Une myopie forte (au-delà de −6 dioptries) nécessite un indice de verre plus élevé pour limiter l'épaisseur.",
        "Porter ses lunettes régulièrement ne fait pas progresser la myopie.",
      ],
      attention: ctx.intensite === "forte"
        ? "Votre correction est forte — l'indice de verre recommandé est important pour votre confort."
        : undefined,
    }),
  },

  // ── Hypermétropie ────────────────────────────────────────
  {
    mots: ["hypermétropie", "hypermétrope", "hypertrope", "sphère positive", "signe plus", "fatigue", "yeux qui travaillent"],
    questionLabel: "C'est quoi l'hypermétropie ?",
    repondre: (ctx) => ({
      texte: "L'hypermétropie est l'inverse de la myopie : l'œil doit travailler en permanence pour compenser, même pour voir de près. Cela provoque souvent de la fatigue visuelle, des maux de tête et des difficultés de concentration. Elle est corrigée par des verres à sphère positive (+).",
      conseils: [
        "Chez les jeunes, l'hypermétropie peut être compensée naturellement par l'accommodation de l'œil.",
        "Avec l'âge, cette compensation devient plus difficile et les symptômes apparaissent.",
        "Porter ses lunettes soulage les muscles oculaires et réduit la fatigue.",
        "Ne pas confondre avec la presbytie — les deux peuvent coexister.",
      ],
    }),
  },

  // ── Astigmatisme ─────────────────────────────────────────
  {
    mots: ["astigmatisme", "astigmate", "cylindre", "axe", "flou", "dédoublé"],
    questionLabel: "C'est quoi l'astigmatisme ?",
    repondre: (ctx) => ({
      texte: "L'astigmatisme est dû à une courbure irrégulière de la cornée (comme un ballon de rugby plutôt qu'une balle ronde). Il provoque une vision floue ou dédoublée à toutes les distances. Il est corrigé par le cylindre et un axe précis dans l'ordonnance.",
      conseils: [
        "L'axe du cylindre est crucial : une erreur de quelques degrés peut réduire le confort.",
        "L'astigmatisme est souvent associé à la myopie ou à l'hypermétropie.",
        "Un astigmatisme faible (< 1 dioptrie) peut parfois ne pas nécessiter de correction.",
        "À la pose de nouvelles lunettes, un léger temps d'adaptation peut être ressenti.",
      ],
      attention: ctx.typeCorrection?.toLowerCase().includes("astigmatisme")
        ? "Votre ordonnance présente de l'astigmatisme — les axes de vos verres doivent être respectés avec précision à la pose."
        : undefined,
    }),
  },

  // ── Presbytie ────────────────────────────────────────────
  {
    mots: ["presbytie", "presbyte", "addition", "vieux", "âge", "lire", "bras", "loin les bras"],
    questionLabel: "C'est quoi la presbytie ?",
    repondre: (ctx) => ({
      texte: "La presbytie est une évolution naturelle de l'œil qui apparaît généralement entre 40 et 50 ans. Le cristallin perd progressivement sa souplesse pour s'accommoder (faire la mise au point de près). Elle se traduit par une difficulté croissante à lire de près.",
      conseils: [
        "La presbytie n'est pas une maladie, c'est un phénomène naturel qui touche tout le monde.",
        ctx.presbytie === "débutante" ? "Votre presbytie est débutante — une correction légère suffit à ce stade." : "",
        ctx.presbytie === "confirmée" ? "Votre presbytie est confirmée — un progressif de qualité correcte est recommandé." : "",
        ctx.presbytie === "avancée" ? "Votre presbytie est avancée — un progressif adapté avec une bonne addition est essentiel." : "",
        "Elle progresse jusqu'à 60 ans puis se stabilise.",
        "Les progressifs permettent de ne pas avoir à changer de lunettes selon la distance.",
      ].filter(Boolean) as string[],
      attention: ctx.presbytie
        ? `Votre ordonnance présente une presbytie ${ctx.presbytie} — les verres progressifs sont la solution la plus confortable.`
        : undefined,
    }),
  },

  // ── Montures ────────────────────────────────────────────
  {
    mots: ["monture", "montures", "plastique", "métal", "metal", "nylon", "percée", "percee", "invisible", "cerclee", "cerclée"],
    questionLabel: "Quelle monture choisir selon ma correction ?",
    repondre: (ctx) => {
      const conseils: string[] = [
        "Monture plastique : idéale pour la personnalisation (couleurs, formes). Les verres sont positionnés dans un cadre plein — bonne protection.",
        "Monture métal : légère, discrète, très solide. Les branches fines limitent la visibilité de la monture.",
        "Monture nylon (demi-cerclée) : le verre est tenu par un fil fin en bas — légère et semi-invisible.",
        "Monture percée (invisible) : aucun cadre autour du verre — vissée directement dans le verre. Très discret mais fragilise les verres minces.",
      ];
      let attention: string | undefined;
      if (ctx.intensite === "forte") {
        attention = "Avec une forte correction, les verres sont plus épais en périphérie. Les montures cerclées (plastique ou métal) sont préférables pour cacher les tranches. Les montures percées ne conviennent pas aux corrections importantes.";
      } else if (ctx.preferenceMonture === "percee" && ctx.intensite === "modérée") {
        attention = "Pour votre niveau de correction, les montures percées sont possibles mais demandez conseil à l'opticien sur la faisabilité avec votre verre.";
      }
      return { texte: "Chaque type de monture a ses avantages — le choix dépend de votre style, votre correction et votre mode de vie.", conseils, attention };
    },
  },

  // ── 100% Santé ───────────────────────────────────────────
  {
    mots: ["100% santé", "100 santé", "classe a", "reste à charge zéro", "gratuit", "remboursé", "totalement remboursé"],
    questionLabel: "Le 100% Santé, c'est vraiment bien ?",
    repondre: (ctx) => ({
      texte: "Le 100% Santé optique (réforme 2020) garantit une prise en charge à 100% par la Sécu + mutuelle sur une sélection de montures et verres. C'est une avancée réelle pour l'accès aux soins visuels.",
      conseils: [
        "Les verres Class A offrent une correction correcte avec antireflet inclus.",
        "Le choix de montures Classe A est limité mais s'est bien développé depuis 2020.",
        "Pour les corrections fortes ou la presbytie, les verres hors Classe A (Classe B) offrent souvent plus de confort.",
        ctx.intensite === "forte"
          ? "Avec votre niveau de correction, les verres Classe B apportent un réel gain de confort sur l'épaisseur."
          : "Pour une correction modérée, le 100% Santé peut être une option satisfaisante au quotidien.",
        "Il est possible de choisir une monture de son choix avec des verres Classe A.",
      ],
      attention: undefined,
    }),
  },

  // ── Durée de vie des verres ──────────────────────────────
  {
    mots: ["durée", "duree", "combien de temps", "changer", "remplacer", "rayer", "rayure", "garantie"],
    questionLabel: "Combien de temps durent les verres ?",
    repondre: () => ({
      texte: "En moyenne, une paire de lunettes se renouvelle tous les 2 à 3 ans. C'est aussi la périodicité de remboursement par la Sécurité Sociale (2 ans pour les adultes, 1 an pour les enfants).",
      conseils: [
        "Un verre antireflet de qualité inclut généralement une résistance aux rayures renforcée.",
        "Nettoyer les verres avec de l'eau tiède et un chiffon microfibre — jamais à sec.",
        "Éviter les produits ménagers et le papier — ils rayent les traitements.",
        "En cas de chute de correction ou de gêne, un renouvellement peut être fait avant 2 ans.",
        "Certaines garanties couvrent la casse sur 1 à 2 ans — renseignez-vous sur les conditions.",
      ],
    }),
  },

  // ── Adaptation aux progressifs ───────────────────────────
  {
    mots: ["adaptation", "s'adapter", "s'habituer", "habituels", "mal", "nausée", "nausees", "tête qui tourne", "flotter"],
    questionLabel: "Comment s'adapter à de nouvelles lunettes ?",
    repondre: (ctx) => ({
      texte: ctx.typeVerre === "progressif"
        ? "L'adaptation à des verres progressifs demande en général quelques jours à 2 semaines. Le cerveau doit apprendre à utiliser les différentes zones du verre."
        : "Pour des verres unifocaux, l'adaptation est généralement rapide — quelques heures à quelques jours.",
      conseils: [
        "Porter ses nouvelles lunettes dès le matin et toute la journée accélère l'adaptation.",
        ctx.typeVerre === "progressif" ? "Pour les progressifs : regarder de loin en haut, à l'écran au milieu, lire en bas — c'est la posture naturelle." : "",
        "Si des nausées ou maux de tête persistent au-delà de 2 semaines, contacter votre opticien.",
        "Ne pas alterner entre ancienne et nouvelle paire pendant la période d'adaptation.",
        "La qualité du progressif influence directement la facilité d'adaptation.",
      ].filter(Boolean) as string[],
      attention: ctx.typeVerre === "progressif" && ctx.presbytie === "débutante"
        ? "C'est votre première paire de progressifs — l'adaptation est generalement bonne car la correction est encore faible."
        : undefined,
    }),
  },

  // ── Protection UV ──────────────────────────────────────────
  {
    mots: ["uv", "ultraviolet", "soleil", "protection", "cancer", "rétine", "cataracte"],
    questionLabel: "Les verres protègent-ils du soleil ?",
    repondre: () => ({
      texte: "La plupart des verres correcteurs modernes intègrent une protection UV 400 partielle. Elle est renforcée dans les verres photochromiques et indispensable dans des lunettes de soleil dédiées.",
      conseils: [
        "La protection UV est recommandée pour tous, pas seulement en cas de forte correction.",
        "En montagne, mer ou environnements très ensoleillés, des lunettes solaires catégorie 3 ou 4 sont conseillées.",
        "Les UV s'accumulent toute la vie — une protection précoce protège la rétine et le cristallin.",
        "Les verres organiques standards ne filtrent pas complètement les UV sans traitement dédié.",
      ],
    }),
  },
];

// ────────────────────────────────────────────────────────────
// MOTEUR DE RECHERCHE
// ────────────────────────────────────────────────────────────

function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

export function repondreQuestion(
  question: string,
  contexte: ContexteClient
): ReponseConseiller {
  const q = normaliser(question);
  let meilleure: EntreeKnowledge | null = null;
  let scoreMax = 0;

  for (const entree of KNOWLEDGE) {
    let score = 0;
    for (const mot of entree.mots) {
      if (q.includes(normaliser(mot))) score += mot.split(" ").length; // mots composés = score plus élevé
    }
    if (score > scoreMax) {
      scoreMax = score;
      meilleure = entree;
    }
  }

  if (!meilleure || scoreMax === 0) {
    return {
      texte: "Je n'ai pas bien compris votre question. Essayez des mots-clés comme : progressif, antireflet, indice, photochromique, presbytie, astigmatisme, myopie, lumière bleue, monture, 100% Santé…",
      conseils: ["Vous pouvez aussi poser votre question directement à votre opticien qui pourra vous apporter une réponse personnalisée."],
    };
  }

  return meilleure.repondre(contexte);
}

/** Retourne les questions suggérées selon le profil client */
export function questionsSuggerees(contexte: ContexteClient): string[] {
  const suggestions: string[] = [];

  if (contexte.typeVerre === "progressif") suggestions.push("C'est quoi les verres progressifs ?");
  suggestions.push("Pourquoi un indice de verre élevé ?");
  if (contexte.conduiteNuit) suggestions.push("À quoi sert l'antireflet ?");
  if (contexte.photophobie) suggestions.push("Comment fonctionnent les verres photochromiques ?");
  if ((contexte.tempsEcran || 0) >= 4) suggestions.push("C'est quoi le filtre lumière bleue ?");
  if (contexte.presbytie) suggestions.push("C'est quoi la presbytie ?");
  if (contexte.typeCorrection?.toLowerCase().includes("astigmatisme")) suggestions.push("C'est quoi l'astigmatisme ?");
  suggestions.push("Quelle monture choisir selon ma correction ?");
  if (contexte.budget === "economique") suggestions.push("Le 100% Santé, c'est vraiment bien ?");
  suggestions.push("Comment s'adapter à de nouvelles lunettes ?");

  return suggestions.slice(0, 5);
}

/** Retourne toutes les questions disponibles */
export function toutesLesQuestions(): { label: string; mots: string[] }[] {
  return KNOWLEDGE.map((e) => ({ label: e.questionLabel, mots: e.mots }));
}
