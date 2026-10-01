import { useTitle } from '../hooks/useTitle';

export function PrivacyPage() {
  useTitle('Politique de confidentialité');
  return (
    <main className="container prose">
      <h1>Politique de confidentialité</h1>
      <p className="muted">Projet étudiant IPSSI — dernière mise à jour : octobre 2026.</p>

      <h2>Responsable du traitement</h2>
      <p>
        IPSSI Express Food (projet pédagogique). Contact pour exercer vos droits : [ADRESSE EMAIL DE CONTACT DE
        L'ÉQUIPE].
      </p>

      <h2>Données collectées et finalités</h2>
      <ul>
        <li>
          <strong>Clients</strong> : prénom, nom, email, mot de passe (stocké chiffré, jamais en clair), téléphone et
          adresse de livraison. Finalité : créer votre compte, livrer vos commandes et vous en informer.
        </li>
        <li>
          <strong>Commandes</strong> : plats commandés, montant, adresse et téléphone de livraison. Finalité :
          exécution de la commande et comptabilité.
        </li>
        <li>
          <strong>Livreurs</strong> : identité, email, statut (libre / en livraison) et dernière position connue,
          uniquement lorsque le livreur choisit de la partager. Aucun historique de trajet n'est conservé.
        </li>
      </ul>
      <p>
        Base légale : l'exécution du contrat (la commande). Les emails d'information sur le menu du jour reposent sur
        votre consentement, facultatif et retirable à tout moment depuis « Mon compte ».
      </p>

      <h2>Qui voit vos données ?</h2>
      <p>
        Le livreur ne voit que votre adresse, votre téléphone et le contenu de la commande qu'il livre. Vous ne voyez
        que le prénom du livreur, et sa position seulement pendant la livraison. Les administrateurs voient le prénom et
        l'initiale du nom des clients. Aucune donnée n'est vendue ni transmise à des tiers.
      </p>
      <p>
        La carte du suivi est affichée par OpenStreetMap, qui reçoit votre adresse IP pour charger les tuiles. Les
        polices sont hébergées sur nos propres serveurs. Le site n'utilise ni cookie publicitaire ni outil de mesure
        d'audience : le seul cookie est celui de votre session de connexion.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Vos données de compte sont conservées tant que votre compte est actif. Lorsque vous supprimez votre compte, vos
        informations personnelles sont effacées et vos anciennes commandes sont anonymisées (adresse et téléphone
        supprimés).
      </p>

      <h2>Vos droits</h2>
      <p>
        Depuis « Mon compte », vous pouvez à tout moment consulter et corriger vos informations (droit de
        rectification), télécharger toutes vos données (droits d'accès et de portabilité) et supprimer votre compte
        (droit à l'effacement). Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).
      </p>

      <h2>Sécurité</h2>
      <p>
        Les mots de passe sont hachés (bcrypt), la session est stockée dans un cookie sécurisé inaccessible au
        JavaScript, la base de données MongoDB Atlas est protégée par des comptes à privilèges limités et une liste
        d'adresses IP autorisées.
      </p>
    </main>
  );
}
