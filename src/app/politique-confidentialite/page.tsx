export const metadata = {
  title: "Politique de confidentialité — OptiPilot",
  description: "Politique de confidentialité de l'extension Chrome OptiPilot et du service optipilot.fr",
};

export default function PolitiqueConfidentialite() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 12 juin 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Responsable du traitement</h2>
        <p>
          OptiPilot est édité par <strong>SGDIGITAL</strong>, micro-entreprise de Sébastien Giordano, domiciliée en France.
          Contact : <a href="mailto:sgdigitalweb13@gmail.com" className="text-blue-600 underline">sgdigitalweb13@gmail.com</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Données collectées</h2>
        <p className="mb-3">
          L&apos;extension Chrome <strong>OptiPilot — Import Optimum</strong> accède, uniquement à la demande
          explicite de l&apos;utilisateur (clic sur le bouton « Importer »), aux informations affichées
          sur la fiche client du logiciel Optimum Live :
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nom et prénom du client</li>
          <li>Date de naissance</li>
          <li>Numéro de téléphone</li>
          <li>Adresse e-mail</li>
          <li>Nom de la mutuelle</li>
        </ul>
        <p className="mt-3">
          Ces données sont transmises <strong>uniquement</strong> vers le compte OptiPilot connecté
          sur le même navigateur (service hébergé sur <code>optipilot.fr</code>). Elles ne sont ni
          revendues, ni partagées avec des tiers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Données de connexion</h2>
        <p>
          L&apos;extension lit le cookie de session <code>ci_sessions</code> du domaine
          <code> livebyoptimum.com</code> afin d&apos;authentifier les requêtes vers l&apos;API Optimum Live.
          Ce cookie n&apos;est jamais transmis à des serveurs tiers ni stocké en dehors du navigateur.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Stockage local</h2>
        <p>
          L&apos;extension utilise <code>chrome.storage.local</code> pour mémoriser votre token
          d&apos;authentification OptiPilot et les préférences de configuration. Ces données restent
          sur votre appareil et ne sont pas synchronisées avec d&apos;autres appareils.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Données du service OptiPilot</h2>
        <p>
          Le service web <strong>optipilot.fr</strong> stocke les informations nécessaires au
          fonctionnement du logiciel opticien (fiches clients, ordonnances, devis) dans une base
          de données sécurisée hébergée en Europe. Ces données appartiennent à l&apos;opticien
          titulaire du compte et peuvent être supprimées sur demande.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Durée de conservation</h2>
        <p>
          Les données sont conservées pendant toute la durée d&apos;activité du compte, puis supprimées
          dans un délai de 30 jours suivant la résiliation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Vos droits (RGPD)</h2>
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, de suppression
          et de portabilité de vos données. Pour exercer ces droits, contactez-nous à{" "}
          <a href="mailto:sgdigitalweb13@gmail.com" className="text-blue-600 underline">sgdigitalweb13@gmail.com</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Sécurité</h2>
        <p>
          Les communications entre l&apos;extension, le navigateur et les serveurs OptiPilot sont
          chiffrées via HTTPS. Les mots de passe sont hashés (bcrypt) avant stockage.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
        <p>
          Pour toute question relative à cette politique :{" "}
          <a href="mailto:sgdigitalweb13@gmail.com" className="text-blue-600 underline">sgdigitalweb13@gmail.com</a>
        </p>
      </section>
    </main>
  );
}
