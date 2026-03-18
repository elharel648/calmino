// components/Legal/LegalContentFR.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

const LAST_UPDATED = '15 mars 2026';
const CONTACT_EMAIL = 'calminogroup@gmail.com';

const styles = StyleSheet.create({
  bodyText: { fontSize: 14, lineHeight: 24, textAlign: 'left' },
  updated: { fontSize: 12 },
  section: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  subsection: { fontSize: 14, fontWeight: '600' },
  bold: { fontWeight: '700' },
});

export const PrivacyContentFR = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Version 1.1 | Dernière mise à jour : {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Introduction{'\n'}</Text>
    Calmino ("nous", "notre", "la Société") s'engage à protéger la vie privée de ses utilisateurs. Cette Politique de Confidentialité ("la Politique") explique quelles données personnelles nous collectons, comment nous les utilisons, et quels sont vos droits.{'\n'}
    Cette Politique est conforme à :{'\n'}
    • Loi israélienne sur la protection de la vie privée, 5741-1981 et Règlement sur la protection de la vie privée (Sécurité des données), 5777-2017{'\n'}
    • Règlement Général sur la Protection des Données de l'UE (RGPD) 2016/679{'\n'}
    • Loi américaine sur la protection de la vie privée des enfants en ligne (COPPA){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Qui sommes-nous{'\n'}</Text>
    Calmino est une application de suivi de santé pour bébés et enfants, exploitée et développée par Calmino Group.{'\n'}
    Pour les questions de confidentialité : {CONTACT_EMAIL}{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Informations que nous collectons{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>a. Informations que vous fournissez directement :{'\n'}</Text>
    • Détails du compte : nom complet, adresse email, mot de passe chiffré{'\n'}
    • Profil de l'enfant : nom, date de naissance, sexe, photo de profil{'\n'}
    • Données de suivi : alimentation (heure, quantité, type), sommeil (heures de début/fin), changes de couches, compléments alimentaires, vaccinations, médicaments, mesures de croissance (poids, taille, périmètre crânien){'\n'}
    • Données de localisation (GPS) — uniquement pour les services de recherche de baby-sitters dans votre zone, avec votre permission explicite{'\n'}
    • Messages de chat envoyés entre parents et baby-sitters via l'application{'\n'}
    • Notes et enregistrements que vous saisissez manuellement{'\n'}
    • Photos et moments magiques que vous choisissez de sauvegarder{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>b. Informations collectées automatiquement :{'\n'}</Text>
    • Type d'appareil, version du système d'exploitation et identifiant unique de l'appareil{'\n'}
    • Token de notification push (pour l'envoi de rappels uniquement){'\n'}
    • Adresse IP (à des fins de sécurité et de dépannage uniquement — non stockée à long terme){'\n'}
    • Rapports de plantage anonymes pour améliorer la stabilité de l'application{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>c. Informations provenant de tiers :{'\n'}</Text>
    • Lors de la connexion avec Google : nom complet et adresse email de votre compte Google uniquement{'\n'}
    • Lors de la connexion avec Apple : adresse email (qui peut être masquée par Apple){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Comment nous utilisons vos informations{'\n'}</Text>
    Nous utilisons vos informations uniquement aux fins suivantes :{'\n'}
    • Fournir, maintenir et améliorer les services de l'application{'\n'}
    • Afficher les données personnelles, graphiques et statistiques{'\n'}
    • Partager les données avec les membres de la famille et baby-sitters selon les autorisations que vous définissez{'\n'}
    • Envoyer les notifications et rappels que vous avez explicitement demandés{'\n'}
    • Fournir un support technique{'\n'}
    • Respecter les obligations légales{'\n'}
    • Améliorer le service en utilisant uniquement des données agrégées et anonymes{'\n\n'}
    Nous n'utilisons <Text style={styles.bold}>pas</Text> vos informations pour de la publicité ciblée, et nous ne vendons pas de données à des entités commerciales.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Partage d'informations avec des tiers{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>Fournisseurs de services essentiels (sous-traitants autorisés) :{'\n'}</Text>
    • <Text style={styles.bold}>Google Firebase</Text> (Firestore, Authentication, Cloud Storage, Cloud Functions) — stockage de données, authentification des utilisateurs et traitement backend. Firebase est conforme au RGPD et au cadre EU-US Data Privacy Framework. Nous avons signé un Accord de Traitement des Données (DPA) avec Google conformément à l'article 28 du RGPD.{'\n'}
    • <Text style={styles.bold}>Apple</Text> (Sign in with Apple, APNs) — authentification des utilisateurs et envoi de notifications iOS{'\n'}
    • <Text style={styles.bold}>Expo (Expo Go / EAS)</Text> — plateforme de développement et notifications push multiplateforme{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> — gestion des abonnements et achats intégrés. Traite uniquement l'identifiant utilisateur et l'historique des achats{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> — données météorologiques. Peut utiliser des données de localisation générales pour afficher les prévisions{'\n\n'}
    Nous ne vendons, ne louons, n'échangeons ni ne commercialisons <Text style={styles.bold}>en aucun cas</Text> vos informations.{'\n'}
    Nous ne divulguerons des informations à un tiers que si : (1) requis par une ordonnance judiciaire valide ; (2) requis par la loi ; (3) nécessaire pour protéger la sécurité publique.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Transferts internationaux de données{'\n'}</Text>
    Vos données sont stockées sur les serveurs Google Firebase qui peuvent être situés aux États-Unis et/ou en Europe. Firebase répond aux exigences du RGPD et fournit des garanties appropriées. En utilisant le service, vous consentez à ce transfert.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Sécurité des données{'\n'}</Text>
    Nous employons diverses mesures de sécurité :{'\n'}
    • Chiffrement de toutes les données en transit (TLS 1.2+){'\n'}
    • Chiffrement des données au repos via Firebase Security Rules{'\n'}
    • Contrôles d'accès stricts — chaque utilisateur ne peut accéder qu'à ses propres données{'\n'}

    • Surveillance des anomalies et journalisation des événements de sécurité{'\n\n'}
    Important : aucun système numérique n'est totalement sécurisé. Si vous soupçonnez une faille de sécurité, informez-nous immédiatement à {CONTACT_EMAIL}.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Conservation des données{'\n'}</Text>
    • Nous conservons vos données tant que votre compte est actif{'\n'}
    • À la suppression du compte : les données personnelles sont <Text style={styles.bold}>supprimées immédiatement</Text> à la fin du processus de suppression{'\n'}
    • Les sauvegardes techniques peuvent être conservées jusqu'à <Text style={styles.bold}>90 jours</Text> uniquement{'\n'}
    • Les informations requises par la loi (comme les transactions financières) seront conservées pour la période légalement requise{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Vie privée des enfants{'\n'}</Text>
    L'application est destinée aux parents et soignants adultes (16+). Les informations sur les enfants sont collectées exclusivement :{'\n'}
    • Par leurs parents / tuteurs légaux{'\n'}
    • À des fins de suivi de santé personnel uniquement{'\n'}
    • Sans partage avec des entités commerciales{'\n'}
    • Sans publicité ciblée liée aux enfants{'\n\n'}
    Nous ne collectons pas d'informations directement auprès des enfants. Si vous pensez qu'un enfant de moins de 13 ans a créé un compte sans le consentement parental, veuillez nous contacter et nous supprimerons les données immédiatement.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Vos droits{'\n'}</Text>
    En vertu de la loi israélienne sur la protection de la vie privée et du RGPD, vous disposez de :{'\n'}
    • <Text style={styles.bold}>Droit d'accès</Text> — obtenir une copie des informations que nous détenons sur vous{'\n'}
    • <Text style={styles.bold}>Droit de rectification</Text> — corriger des informations inexactes ou obsolètes{'\n'}
    • <Text style={styles.bold}>Droit à l'effacement</Text> — le "droit à l'oubli" — supprimer toutes vos données{'\n'}
    • <Text style={styles.bold}>Droit à la portabilité</Text> — recevoir vos données dans un format lisible par machine{'\n'}
    • <Text style={styles.bold}>Droit d'opposition</Text> — vous opposer à certains traitements de vos données{'\n'}
    • <Text style={styles.bold}>Retrait du consentement</Text> — retirer votre consentement à tout moment{'\n\n'}
    Pour exercer vos droits : {CONTACT_EMAIL} — nous répondrons sous <Text style={styles.bold}>30 jours</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Modifications de cette politique{'\n'}</Text>
    Nous vous informerons des changements importants via l'application et/ou par email au moins <Text style={styles.bold}>30 jours</Text> à l'avance. L'utilisation continue après réception de l'avis constitue l'acceptation des modifications.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Contactez-nous{'\n'}</Text>
    Pour toute question, demande ou réclamation concernant la confidentialité :{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

export const TermsContentFR = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Version 1.1 | Dernière mise à jour : {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Acceptation des conditions{'\n'}</Text>
    En téléchargeant, installant ou utilisant l'application Calmino ("l'Application" / "le Service"), vous acceptez ces Conditions d'Utilisation ("les Conditions"). Si vous n'êtes pas d'accord, cessez immédiatement l'utilisation et supprimez l'application.{'\n'}
    Ces Conditions constituent un accord juridique contraignant entre vous et Calmino.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Description du service{'\n'}</Text>
    Calmino est une application de suivi de santé pour bébés et enfants permettant :{'\n'}
    • Le suivi de l'alimentation, du sommeil, des couches, des compléments alimentaires, des vaccinations et des médicaments{'\n'}
    • La mesure des indicateurs de croissance et des courbes de croissance{'\n'}
    • Le partage de données avec les membres de la famille et les baby-sitters{'\n'}
    • La création de statistiques, rapports et analyses{'\n'}
    • L'enregistrement de moments magiques et d'étapes clés{'\n'}
    • La gestion de rappels et notifications personnalisés{'\n'}
    • Les services de recherche de baby-sitters, de coordination de réservations et de messagerie{'\n\n'}
    <Text style={styles.bold}>Âge minimum d'utilisation : 16 ans.</Text> Le service n'est pas destiné aux utilisateurs de moins de 16 ans.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Compte utilisateur{'\n'}</Text>
    3.1 <Text style={styles.bold}>Inscription :</Text> Vous devez fournir des informations véridiques, exactes et à jour.{'\n'}
    3.2 <Text style={styles.bold}>Sécurité :</Text> Vous êtes responsable de la confidentialité de votre mot de passe. Informez-nous immédiatement de toute utilisation non autorisée.{'\n'}
    3.3 <Text style={styles.bold}>Compte unique :</Text> Chaque personne ne peut détenir qu'un seul compte personnel.{'\n'}
    3.4 <Text style={styles.bold}>Responsabilité :</Text> Vous êtes seul responsable de toute activité sur votre compte.{'\n'}
    3.5 <Text style={styles.bold}>Suppression :</Text> Vous pouvez supprimer votre compte à tout moment via les Paramètres.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Utilisation autorisée et interdite{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>Autorisé :{'\n'}</Text>
    • Usage personnel et familial pour la gestion des soins de vos enfants{'\n'}
    • Partage de données avec les membres de la famille et baby-sitters autorisés{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>Strictement interdit :{'\n'}</Text>
    • Utilisation commerciale sans licence écrite de notre part{'\n'}
    • Téléchargement de contenu illégal, offensant, trompeur ou portant atteinte aux droits{'\n'}
    • Tentative d'accès aux données d'autres utilisateurs sans autorisation{'\n'}
    • Ingénierie inverse, désassemblage ou duplication du code{'\n'}
    • Utilisation de bots, scripts ou outils automatisés{'\n'}
    • Distribution de spam, malware ou contenu malveillant{'\n'}
    • Utilisation à des fins de harcèlement ou d'atteinte à la vie privée{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Contenu utilisateur{'\n'}</Text>
    Les informations que vous saisissez (photos, notes, enregistrements) restent votre propriété. En les téléchargeant, vous nous accordez une licence limitée et non exclusive pour les stocker, sauvegarder et afficher uniquement aux fins de fourniture du service.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Service Premium{'\n'}</Text>
    6.1 Calmino propose des abonnements payants ("Premium") avec des fonctionnalités avancées.{'\n'}
    6.2 Les paiements sont traités via <Text style={styles.bold}>Apple App Store</Text> ou <Text style={styles.bold}>Google Play Store</Text> uniquement.{'\n'}
    6.3 Les abonnements se <Text style={styles.bold}>renouvellent automatiquement</Text> ; annulable à tout moment via les paramètres du store.{'\n'}
    6.4 Aucun remboursement pour les périodes utilisées, sauf obligation légale.{'\n'}
    6.5 Nous nous réservons le droit de modifier les prix avec un préavis de <Text style={styles.bold}>30 jours</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Services tiers{'\n'}</Text>
    L'application repose sur des services externes :{'\n'}
    • <Text style={styles.bold}>Google Firebase</Text> — stockage, authentification et infrastructure{'\n'}
    • <Text style={styles.bold}>Apple</Text> — authentification et notifications Push{'\n'}
    • <Text style={styles.bold}>Expo</Text> — plateforme de développement et mises à jour{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> — gestion des abonnements et achats{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> — données météorologiques{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Limitation de responsabilité, avertissement médical et services de baby-sitter{'\n'}</Text>
    8.1 Le service est fourni <Text style={styles.bold}>"tel quel"</Text> sans garantie d'aucune sorte.{'\n'}
    8.2 <Text style={styles.bold}>L'application ne remplace pas un avis médical professionnel.</Text> Consultez toujours un pédiatre qualifié.{'\n'}
    8.3 <Text style={styles.bold}>Services de baby-sitter — Plateforme de mise en relation uniquement :</Text> Calmino <Text style={styles.bold}>n'emploie, ne recommande, n'approuve, ne vérifie, ne garantit ni n'assume la responsabilité</Text> d'aucun baby-sitter. <Text style={styles.bold}>La responsabilité exclusive</Text> de l'évaluation, la vérification d'identité et de compétences incombe entièrement au parent.{'\n'}
    8.4 Calmino n'est pas responsable des dommages directs, indirects, accessoires, spéciaux ou consécutifs.{'\n'}
    8.5 Notre responsabilité totale ne dépassera pas le montant payé la dernière année, ou 200 ₪ — le montant le moins élevé.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Propriété intellectuelle{'\n'}</Text>
    Tous les droits sur l'application sont la propriété exclusive de Calmino et sont protégés par les lois sur le droit d'auteur, les marques et les brevets.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Résiliation et suspension du compte{'\n'}</Text>
    Nous nous réservons le droit de suspendre ou fermer les comptes en violation des Conditions.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Indemnisation{'\n'}</Text>
    Vous acceptez d'indemniser et de dégager Calmino de toute responsabilité pour toute réclamation résultant de votre utilisation du service.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Modifications des conditions{'\n'}</Text>
    Nous vous informerons des changements importants au moins <Text style={styles.bold}>30 jours</Text> à l'avance.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>13. Divisibilité{'\n'}</Text>
    Si une disposition est jugée invalide, elle sera remplacée par une disposition valide d'intention similaire.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>14. Loi applicable et résolution des litiges{'\n'}</Text>
    Ces Conditions sont régies par les lois de l'État d'Israël. Tout litige sera soumis aux tribunaux compétents <Text style={styles.bold}>du district de Tel Aviv-Jaffa uniquement</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>15. Contactez-nous{'\n'}</Text>
    Pour toute question, réclamation ou demande juridique :{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);
