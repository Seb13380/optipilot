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
// OBJECTIONS COMMERCIALES
// ────────────────────────────────────────────────────────────

interface EntreeObjection {
  /** Patterns déclencheurs (normalisés) */
  patterns: string[];
  /** Signal court pour les logs / analytics */
  signal: string;
  repondre: (ctx: ContexteClient) => ReponseConseiller;
}

const OBJECTIONS: EntreeObjection[] = [

  // ── "C'est cher" / "trop cher" / "c'est le prix ?" ─────────
  {
    signal: "objection_prix",
    patterns: ["c'est cher", "trop cher", "c est cher", "c est trop cher", "prix eleve", "ca coute cher",
                "beaucoup d'argent", "beaucoup d argent", "pas les moyens", "hors budget", "trop couteux",
                "couteux", "c est quoi ce prix", "c est le prix", "si cher"],
    repondre: (ctx) => {
      const budgetMsg = ctx.budget === "economique"
        ? "Je comprends tout à fait votre contrainte de budget. "
        : "";
      const mutuelleMsg = "Votre mutuelle prend en charge une partie importante de ce devis — le RAC final peut être bien inférieur au prix affiché.";
      const dureeMsg = "Rapporté à 2 ans d'utilisation quotidienne, le coût journalier est souvent inférieur à 1 €.";
      return {
        texte: `${budgetMsg}Le prix d'un équipement optique de qualité reflète la précision de fabrication et les traitements appliqués. ${mutuelleMsg}`,
        conseils: [
          dureeMsg,
          ctx.typeVerre === "progressif"
            ? "Sur un progressif, la qualité du verre impacte directement le confort — une économie en entrée de gamme peut se traduire par une paire que l'on porte peu."
            : "Un verre avec antireflet, traitement durci et filtre adaptés protège votre vision sur la durée.",
          "Le 100% Santé (Classe A) est disponible si vous souhaitez un équipement sans reste à charge.",
          ctx.conduiteNuit ? "En conduite de nuit, un verre de qualité n'est pas un luxe — c'est une question de sécurité." : "Un équipement bien adapté réduit la fatigue visuelle et améliore votre quotidien.",
        ],
        attention: "Demandez à voir le détail du remboursement mutuelle — le RAC réel est souvent bien inférieur au prix catalogue.",
      };
    },
  },

  // ── "Je vais réfléchir" / "je vais y penser" ───────────────
  {
    signal: "objection_reflexion",
    patterns: ["je vais reflechir", "je vais y penser", "j'y pense", "je reflechi", "reflechir",
                "pas decide", "pas encore decide", "prendre le temps", "comparer ailleurs",
                "je reviendrai", "on verra", "peut etre", "voir ailleurs"],
    repondre: (ctx) => ({
      texte: "Tout à fait, prendre le temps de choisir est important pour un équipement que vous portez tous les jours. Permettez-moi de résumer les points clés de cette recommandation pour que vous puissiez y réfléchir.",
      conseils: [
        ctx.typeVerre === "progressif"
          ? "Sur un premier progressif, la qualité du verre facilite vraiment l'adaptation — c'est l'investissement le plus impactant."
          : "L'antireflet et l'indice recommandés sont adaptés à votre correction spécifique.",
        "Votre mutuelle vous rembourse une partie fixe quel que soit le magasin — le vrai critère est la qualité du service et du verre.",
        "Les tarifs en ligne peuvent sembler moins chers, mais sans essayage et centrage professionnel, le confort est souvent moindre.",
        "Votre ordonnance est valable 3 ans — vous pouvez revenir, mais les prix évoluent.",
      ],
      attention: "Si vous avez des questions spécifiques sur les verres ou les prix, n'hésitez pas — je suis là pour comparer clairement.",
    }),
  },

  // ── "Mon ancien opticien" / "j'avais avant" / "chez mon opticien" ──
  {
    signal: "objection_fidelite",
    patterns: ["mon ancien opticien", "mon opticien", "mon autre opticien", "j'avais chez", "j avais chez",
                "avant j avais", "avant je payais", "mon opticien habituel", "je connais mon opticien",
                "d habitude", "d'habitude", "ma paire precedente", "ma precedente paire"],
    repondre: (ctx) => ({
      texte: "Votre expérience avec votre équipement précédent est une référence utile. Permettez-moi de vous expliquer en quoi ce devis correspond précisément à votre profil actuel.",
      conseils: [
        "Les verres progressent : les gammes actuelles offrent souvent plus de confort et de traitements qu'il y a 2-3 ans.",
        ctx.typeVerre === "progressif"
          ? "Si votre précédent progressif vous a semblé difficile, les designs actuels ont des couloirs élargis — l'adaptation est généralement meilleure."
          : "Les antireflets modernes ont des propriétés antisalissures que les anciens modèles n'avaient pas.",
        "Votre ordonnance a peut-être évolué — la nouvelle correction est adaptée à votre vision actuelle.",
        "N'hésitez pas à comparer précisément les caractéristiques des verres (indice, traitements, design) — pas seulement le prix.",
      ],
      attention: "Si vous avez apprécié ou eu des difficultés avec votre paire précédente, dites-le moi — je peux adapter la recommandation.",
    }),
  },

  // ── "Ma mutuelle rembourse combien" / "c'est remboursé ?" ───
  {
    signal: "objection_remboursement",
    patterns: ["ma mutuelle", "remboursement", "remboursé", "rembourse", "secu", "securite sociale",
                "ce qui reste", "reste a charge", "rac", "je vais payer combien", "combien je paie",
                "prise en charge", "pris en charge"],
    repondre: (ctx) => ({
      texte: "Bonne question — le remboursement dépend de votre contrat mutuelle et du type de verres choisi. Voici ce qui s'applique généralement :",
      conseils: [
        "La Sécurité Sociale rembourse une base forfaitaire : environ 2,84 € par verre unifocal, 2,84 € par verre progressif.",
        "Votre mutuelle complète ce remboursement selon votre contrat — consultez votre tableau de garanties.",
        "Pour les verres Classe A (100% Santé), la prise en charge totale est garantie.",
        "Pour les verres Classe B (hors 100% Santé), la prise en charge partielle dépend de votre niveau de mutuelle.",
        "Le simulateur RAC de cet outil vous donne une estimation basée sur les valeurs de remboursement de votre contrat.",
      ],
      attention: "Consultez votre carte mutuelle ou votre espace adhérent en ligne pour connaître votre barème exact.",
    }),
  },

  // ── "J'ai déjà des lunettes" / "mes lunettes actuelles marchent" ──
  {
    signal: "objection_pas_envie",
    patterns: ["j ai deja", "j'ai deja", "j'ai mes lunettes", "mes lunettes marchent", "mes lunettes actuelles",
                "pas envie de changer", "pas besoin", "ca va bien", "elles sont bonnes", "j en ai pas besoin",
                "pas vraiment besoin"],
    repondre: (ctx) => ({
      texte: "Si votre correction actuelle vous convient, c'est une bonne base. Cependant, votre ordonnance a évolué — votre nouvelle correction est différente de la précédente.",
      conseils: [
        "Porter une correction inadaptée fatigue davantage les yeux et peut générer des maux de tête.",
        ctx.intensite === "forte"
          ? "Avec une correction significative, un décalage entre l'ordonnance et vos verres est rapidement perceptible."
          : "Même un léger décalage de correction peut provoquer de la fatigue visuelle en fin de journée.",
        ctx.conduiteNuit
          ? "En conduite de nuit particulièrement, une correction à jour améliore la sécurité."
          : "Les yeux compensent naturellement un certain temps — puis la fatigue s'installe.",
        "Un essayage avec les nouveaux verres vous permettrait de percevoir directement la différence.",
      ],
      attention: "Votre ophtalmologiste a prescrit cette nouvelle correction pour une raison — le confort visuel s'améliorera avec un équipement mis à jour.",
    }),
  },

  // ── "Je vois bien sans lunettes" / "je mets pas souvent mes lunettes" ──
  {
    signal: "objection_vision_correcte",
    patterns: ["je vois bien", "je vois correct", "je porte peu", "je mets peu", "je mets pas souvent",
                "je porte rarement", "j oublie mes lunettes", "sans lunettes ca va"],
    repondre: (ctx) => ({
      texte: "C'est possible si votre correction est légère — mais ne pas corriger sa vision a des conséquences progressives sur le confort et la santé visuelle.",
      conseils: [
        "Les yeux non corrigés compensent en forçant les muscles oculaires — source de fatigue et maux de tête.",
        ctx.typeCorrection?.toLowerCase().includes("myopie")
          ? "En myopie, ne pas corriger peut aussi ralentir les reflexes de distance (utile en voiture, sport)."
          : "En hypermétropie, l'effort d'accommodation constant est plus fatigant qu'il n'y paraît.",
        "Des verres légers et confortables (bon antireflet, indice adapté) se portent naturellement plus souvent.",
        "La photophobie et la sensibilité lumineuse augmentent souvent sans correction adaptée.",
      ],
    }),
  },

  // ── "En ligne c'est moins cher" / "je vais commander sur internet" ──
  {
    signal: "objection_internet",
    patterns: ["en ligne", "internet", "sur le net", "commande en ligne", "moins cher sur", "site opticien",
                "sur internet", "afflelou en ligne", "optical center en ligne", "pas cher en ligne",
                "dollar eyeglasses", "zenni", "commander sur"],
    repondre: (ctx) => ({
      texte: "Les prix en ligne peuvent paraître attractifs, mais plusieurs éléments essentiels manquent à la commande en ligne.",
      conseils: [
        "Le centrage des verres (distance pupillaire, hauteur de mont.) doit être précis — une erreur de 1-2 mm change le confort.",
        "En magasin, l'opticien mesure avec précision et garantit l'adaptation à votre monture.",
        ctx.typeVerre === "progressif"
          ? "Sur un progressif, le centrage est critique — un mauvais centrage rend le verre inconfortable malgré la qualité."
          : "Les verres avec cylindre (astigmatisme) sont particulièrement sensibles au positionnement.",
        "En cas de problème (vision floue, inconfort), le retour est complexe en ligne. En magasin, l'opticien ajuste.",
        "Le prix total (verre + livraison + retouche éventuelle) est souvent comparable.",
      ],
      attention: "La sécurité sociale et de nombreuses mutuelles ne remboursent pas les achats sur certains sites en ligne.",
    }),
  },

  // ── "Je préfère attendre" / "pas urgent" ───────────────────
  {
    signal: "objection_attente",
    patterns: ["pas urgent", "pas presse", "je peux attendre", "j'attends", "pas tout de suite",
                "plus tard", "ca peut attendre", "dans quelques mois", "l annee prochaine"],
    repondre: (ctx) => ({
      texte: "Je comprends qu'il n'y ait pas d'urgence immédiate. Voici tout de même quelques éléments à garder en tête.",
      conseils: [
        "Votre ordonnance est valable 3 ans — mais votre correction actuelle peut ne plus correspondre à vos yeux.",
        ctx.conduiteNuit ? "La conduite nocturne avec une correction inadaptée représente un risque réel." : "Plus vous attendez, plus les yeux compensent — et plus l'adaptation à une nouvelle correction demande du temps.",
        ctx.presbytie ? "La presbytie progresse — attendre quelques mois ne résoudra pas l'inconfort de lecture." : "",
        "Les délais de fabrication sont de 7 à 10 jours — commander maintenant, c'est être équipé dans la semaine.",
      ].filter(Boolean) as string[],
    }),
  },

  // ── "Mon médecin / ophtalmo m'a dit" ────────────────────────
  {
    signal: "objection_medecin",
    patterns: ["mon ophtalmo", "mon medecin", "mon ophtalmologiste", "mon docteur", "le medecin m a dit",
                "l ophtalmo m a dit", "le specialiste", "mon specialiste"],
    repondre: (ctx) => ({
      texte: "L'avis de votre ophtalmologiste est la référence absolue pour votre santé visuelle. L'opticien est complémentaire : il réalise votre correction selon la prescription.",
      conseils: [
        "L'ordonnance de l'ophtalmologiste définit la correction (sphère, cylindre, addition) — l'opticien choisit le verre le mieux adapté à votre usage.",
        "Si votre ophtalmologiste a fait des recommandations particulières (type de verre, traitement), mentionnez-les.",
        "En cas de doute sur la correction, un contrôle de vision en magasin peut confirmer le confort.",
        "Les verres proposés correspondent exactement à la prescription de votre ordonnance.",
      ],
    }),
  },

  // ── "Ça va prendre du temps" / "je suis pressé" ─────────────
  {
    signal: "objection_temps",
    patterns: ["j ai pas le temps", "je suis presse", "ca prend du temps", "vite fait", "rapidement",
                "en combien de temps", "combien de temps ca prend", "c est long"],
    repondre: () => ({
      texte: "La prise de mesures et le choix de votre équipement prennent 20 à 30 minutes. La fabrication est ensuite réalisée en atelier sous 5 à 10 jours.",
      conseils: [
        "Certains magasins proposent des verres en 1 heure pour des corrections simples — renseignez-vous.",
        "La prise de mesures rapide (centrage, distance pupillaire) est réalisée en quelques minutes avec nos outils.",
        "Vous pouvez pré-sélectionner vos montures et valider le devis rapidement sur ce support.",
        "Un bon équipement bien centré vaut 30 minutes d'attention — c'est du confort pour 2 ans.",
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

/** Détecte si la question contient un signal d'objection commerciale */
function detecterObjection(q: string, ctx: ContexteClient): ReponseConseiller | null {
  for (const obj of OBJECTIONS) {
    for (const pattern of obj.patterns) {
      if (q.includes(normaliser(pattern))) {
        return obj.repondre(ctx);
      }
    }
  }
  return null;
}

export function repondreQuestion(
  question: string,
  contexte: ContexteClient
): ReponseConseiller {
  const q = normaliser(question);

  // Priorité 1 : objection commerciale
  const objectionReponse = detecterObjection(q, contexte);
  if (objectionReponse) return objectionReponse;

  // Priorité 2 : base de connaissances métier
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

/** Retourne les réponses aux objections les plus fréquentes (pour affichage proactif) */
export function objectionsSuggerees(): string[] {
  return [
    "C'est trop cher",
    "Ma mutuelle rembourse combien ?",
    "Je vais réfléchir",
    "En ligne c'est moins cher",
    "Mon ancien opticien faisait autrement",
  ];
}

/** Retourne toutes les questions disponibles */
export function toutesLesQuestions(): { label: string; mots: string[] }[] {
  return KNOWLEDGE.map((e) => ({ label: e.questionLabel, mots: e.mots }));
}
