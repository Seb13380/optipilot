-- CreateTable
CREATE TABLE "magasins" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "reseauMutuelle" TEXT,
    "loginMutuelle" TEXT,
    "mdpMutuelle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magasins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "magasinId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'vendeur',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "magasinId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "email" TEXT,
    "telephone" TEXT,
    "mutuelle" TEXT,
    "niveauGarantie" TEXT,
    "numAdherent" TEXT,
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentementRelance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordonnances" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateOrdonnance" TIMESTAMP(3),
    "validiteMois" INTEGER DEFAULT 36,
    "odSphere" DECIMAL(65,30),
    "odCylindre" DECIMAL(65,30),
    "odAxe" INTEGER,
    "odAddition" DECIMAL(65,30),
    "ogSphere" DECIMAL(65,30),
    "ogCylindre" DECIMAL(65,30),
    "ogAxe" INTEGER,
    "ogAddition" DECIMAL(65,30),
    "ecartPupillaire" INTEGER,
    "prescripteur" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordonnances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verres" (
    "id" TEXT NOT NULL,
    "verrier" TEXT NOT NULL,
    "gamme" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "indice" DECIMAL(65,30),
    "traitement" TEXT,
    "classe100ps" TEXT,
    "prixTarif" DECIMAL(65,30) NOT NULL,
    "caracteristiques" JSONB,

    CONSTRAINT "verres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_tarifs" (
    "id" TEXT NOT NULL,
    "magasinId" TEXT NOT NULL,
    "verreId" TEXT NOT NULL,
    "coefficient" DECIMAL(65,30),
    "prixVente" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "config_tarifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutuelles" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "reseau" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "remboursementUnifocal" DECIMAL(65,30),
    "remboursementProgressif" DECIMAL(65,30),
    "remboursementSolaire" DECIMAL(65,30),

    CONSTRAINT "mutuelles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devis" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "magasinId" TEXT NOT NULL,
    "ordonnanceId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "offreChoisie" TEXT,
    "totalEssentiel" DECIMAL(65,30),
    "racEssentiel" DECIMAL(65,30),
    "totalConfort" DECIMAL(65,30),
    "racConfort" DECIMAL(65,30),
    "totalPremium" DECIMAL(65,30),
    "racPremium" DECIMAL(65,30),
    "racConfirme" BOOLEAN NOT NULL DEFAULT false,
    "racReel" DECIMAL(65,30),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "profession" TEXT,
    "tempsEcran" INTEGER,
    "sport" BOOLEAN NOT NULL DEFAULT false,
    "conduiteNuit" BOOLEAN NOT NULL DEFAULT false,
    "photophobie" BOOLEAN NOT NULL DEFAULT false,
    "secheresseOculaire" BOOLEAN NOT NULL DEFAULT false,
    "preferenceMonture" TEXT,
    "budget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "magasins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "magasins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordonnances" ADD CONSTRAINT "ordonnances_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_tarifs" ADD CONSTRAINT "config_tarifs_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "magasins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_tarifs" ADD CONSTRAINT "config_tarifs_verreId_fkey" FOREIGN KEY ("verreId") REFERENCES "verres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_magasinId_fkey" FOREIGN KEY ("magasinId") REFERENCES "magasins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis" ADD CONSTRAINT "devis_ordonnanceId_fkey" FOREIGN KEY ("ordonnanceId") REFERENCES "ordonnances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
