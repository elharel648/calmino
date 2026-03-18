// components/Legal/LegalContentDE.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

const LAST_UPDATED = '15. März 2026';
const CONTACT_EMAIL = 'calminogroup@gmail.com';

const styles = StyleSheet.create({
  bodyText: { fontSize: 14, lineHeight: 24, textAlign: 'left' },
  updated: { fontSize: 12 },
  section: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  subsection: { fontSize: 14, fontWeight: '600' },
  bold: { fontWeight: '700' },
});

export const PrivacyContentDE = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Version 1.1 | Letzte Aktualisierung: {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Einleitung{'\n'}</Text>
    Calmino ("wir", "uns", "das Unternehmen") verpflichtet sich zum Schutz der Privatsphäre seiner Nutzer. Diese Datenschutzrichtlinie ("die Richtlinie") erklärt, welche personenbezogenen Daten wir erheben, wie wir sie verwenden und welche Rechte Sie haben.{'\n'}
    Diese Richtlinie entspricht:{'\n'}
    • Israelisches Datenschutzgesetz, 5741-1981 und Datenschutzverordnung (Datensicherheit), 5777-2017{'\n'}
    • EU-Datenschutz-Grundverordnung (DSGVO) 2016/679{'\n'}
    • US-amerikanisches Gesetz zum Schutz der Privatsphäre von Kindern im Internet (COPPA){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Wer wir sind{'\n'}</Text>
    Calmino ist eine Gesundheits-Tracking-App für Babys und Kinder, betrieben und entwickelt von der Calmino Group.{'\n'}
    Für Datenschutzanfragen: {CONTACT_EMAIL}{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Informationen, die wir erheben{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>a. Informationen, die Sie direkt bereitstellen:{'\n'}</Text>
    • Kontodaten: vollständiger Name, E-Mail-Adresse, verschlüsseltes Passwort{'\n'}
    • Kinderprofil: Name, Geburtsdatum, Geschlecht, Profilbild{'\n'}
    • Tracking-Daten: Fütterung (Zeit, Menge, Art), Schlaf (Start-/Endzeiten), Windelwechsel, Nahrungsergänzungsmittel, Impfungen, Medikamente, Wachstumsmessungen (Gewicht, Größe, Kopfumfang){'\n'}
    • Standortdaten (GPS) — ausschließlich für Babysitter-Suchdienste in Ihrer Nähe, mit Ihrer ausdrücklichen Genehmigung{'\n'}
    • Chat-Nachrichten zwischen Eltern und Babysittern über die App{'\n'}
    • Notizen und Aufzeichnungen, die Sie manuell eingeben{'\n'}
    • Fotos und magische Momente, die Sie speichern möchten{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>b. Automatisch erfasste Informationen:{'\n'}</Text>
    • Gerätetyp, Betriebssystemversion und eindeutige Gerätekennung{'\n'}
    • Push-Benachrichtigungstoken (nur zum Senden von Erinnerungen){'\n'}
    • IP-Adresse (nur für Sicherheits- und Fehlerbehebungszwecke — nicht langfristig gespeichert){'\n'}
    • Anonyme Absturzberichte zur Verbesserung der App-Stabilität{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>c. Informationen von Dritten:{'\n'}</Text>
    • Bei Anmeldung mit Google: vollständiger Name und E-Mail-Adresse aus Ihrem Google-Konto{'\n'}
    • Bei Anmeldung mit Apple: E-Mail-Adresse (die von Apple verborgen werden kann){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Wie wir Ihre Informationen verwenden{'\n'}</Text>
    Wir verwenden Ihre Informationen ausschließlich für folgende Zwecke:{'\n'}
    • Bereitstellung, Wartung und Verbesserung der App-Dienste{'\n'}
    • Anzeige persönlicher Daten, Diagramme und Statistiken{'\n'}
    • Teilen von Daten mit Familienmitgliedern und Babysittern gemäß Ihren Berechtigungseinstellungen{'\n'}
    • Senden von ausdrücklich angeforderten Benachrichtigungen und Erinnerungen{'\n'}
    • Bereitstellung technischen Supports{'\n'}
    • Erfüllung gesetzlicher Pflichten{'\n'}
    • Verbesserung des Dienstes nur mit aggregierten und anonymen Daten{'\n\n'}
    Wir verwenden Ihre Informationen <Text style={styles.bold}>nicht</Text> für gezielte Werbung und verkaufen keine Daten an kommerzielle Unternehmen.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Weitergabe von Informationen an Dritte{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>Wesentliche Dienstleister (autorisierte Auftragsverarbeiter):{'\n'}</Text>
    • <Text style={styles.bold}>Google Firebase</Text> (Firestore, Authentication, Cloud Storage, Cloud Functions) — Datenspeicherung, Benutzerauthentifizierung und Backend-Verarbeitung. Firebase entspricht der DSGVO und dem EU-US Data Privacy Framework. Wir haben eine Auftragsverarbeitungsvereinbarung (AVV) mit Google gemäß Art. 28 DSGVO geschlossen.{'\n'}
    • <Text style={styles.bold}>Apple</Text> (Sign in with Apple, APNs) — Benutzerauthentifizierung und iOS-Benachrichtigungen{'\n'}
    • <Text style={styles.bold}>Expo (Expo Go / EAS)</Text> — Entwicklungsplattform und plattformübergreifende Push-Benachrichtigungen{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> — Verwaltung von Abonnements und In-App-Käufen. Verarbeitet nur Benutzer-ID und Kaufhistorie{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> — Wetterdaten. Kann allgemeine Standortdaten zur Anzeige von Vorhersagen verwenden{'\n\n'}
    Wir verkaufen, vermieten, tauschen oder vermarkten Ihre Informationen <Text style={styles.bold}>in keiner Weise</Text>.{'\n'}
    Wir geben Informationen nur weiter, wenn: (1) durch eine gültige gerichtliche Anordnung verlangt; (2) gesetzlich vorgeschrieben; (3) zum Schutz der öffentlichen Sicherheit erforderlich.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Internationale Datenübermittlung{'\n'}</Text>
    Ihre Daten werden auf Google-Firebase-Servern gespeichert, die sich in den USA und/oder in Europa befinden können. Firebase erfüllt die DSGVO-Anforderungen und bietet geeignete Schutzmaßnahmen. Durch die Nutzung des Dienstes stimmen Sie dieser Übermittlung zu.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Datensicherheit{'\n'}</Text>
    Wir setzen verschiedene Sicherheitsmaßnahmen ein:{'\n'}
    • Verschlüsselung aller Daten im Transit (TLS 1.2+){'\n'}
    • Verschlüsselung gespeicherter Daten über Firebase Security Rules{'\n'}
    • Strenge Zugriffskontrollen — jeder Nutzer kann nur auf seine eigenen Daten zugreifen{'\n'}

    • Anomalieerkennung und Protokollierung von Sicherheitsereignissen{'\n\n'}
    Wichtig: Kein digitales System ist vollständig sicher. Bei Verdacht auf eine Sicherheitsverletzung informieren Sie uns sofort unter {CONTACT_EMAIL}.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Datenaufbewahrung{'\n'}</Text>
    • Wir bewahren Ihre Daten auf, solange Ihr Konto aktiv ist{'\n'}
    • Bei Kontolöschung: persönliche Daten werden <Text style={styles.bold}>sofort gelöscht</Text>{'\n'}
    • Technische Backups können bis zu <Text style={styles.bold}>90 Tage</Text> aufbewahrt werden{'\n'}
    • Gesetzlich erforderliche Informationen werden für die gesetzlich vorgeschriebene Dauer aufbewahrt{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Datenschutz für Kinder{'\n'}</Text>
    Die App ist für Eltern und erwachsene Betreuer (16+) bestimmt. Informationen über Kinder werden ausschließlich erhoben:{'\n'}
    • Von ihren Eltern / gesetzlichen Vormündern{'\n'}
    • Nur zu persönlichen Gesundheits-Tracking-Zwecken{'\n'}
    • Ohne Weitergabe an kommerzielle Unternehmen{'\n'}
    • Ohne kinderbezogene gezielte Werbung{'\n\n'}
    Wir erheben keine Informationen direkt von Kindern. Wenn Sie glauben, dass ein Kind unter 13 Jahren ohne elterliche Zustimmung ein Konto erstellt hat, kontaktieren Sie uns und wir werden die Daten sofort löschen.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Ihre Rechte{'\n'}</Text>
    Gemäß dem israelischen Datenschutzgesetz und der DSGVO haben Sie:{'\n'}
    • <Text style={styles.bold}>Auskunftsrecht</Text> — eine Kopie der über Sie gespeicherten Daten erhalten{'\n'}
    • <Text style={styles.bold}>Recht auf Berichtigung</Text> — unrichtige oder veraltete Daten korrigieren{'\n'}
    • <Text style={styles.bold}>Recht auf Löschung</Text> — das "Recht auf Vergessenwerden" — alle Ihre Daten löschen{'\n'}
    • <Text style={styles.bold}>Recht auf Datenübertragbarkeit</Text> — Ihre Daten in einem maschinenlesbaren Format erhalten{'\n'}
    • <Text style={styles.bold}>Widerspruchsrecht</Text> — bestimmter Verarbeitung Ihrer Daten widersprechen{'\n'}
    • <Text style={styles.bold}>Widerruf der Einwilligung</Text> — erteilte Einwilligungen jederzeit widerrufen{'\n\n'}
    Zur Ausübung Ihrer Rechte: {CONTACT_EMAIL} — wir antworten innerhalb von <Text style={styles.bold}>30 Tagen</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Änderungen dieser Richtlinie{'\n'}</Text>
    Über wesentliche Änderungen informieren wir Sie über die App und/oder per E-Mail mindestens <Text style={styles.bold}>30 Tage</Text> im Voraus.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Kontakt{'\n'}</Text>
    Für Fragen, Anträge oder Beschwerden zum Datenschutz:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

export const TermsContentDE = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Version 1.1 | Letzte Aktualisierung: {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Annahme der Bedingungen{'\n'}</Text>
    Durch das Herunterladen, Installieren oder Nutzen der Calmino-App ("die App" / "der Dienst") stimmen Sie diesen Nutzungsbedingungen ("die Bedingungen") zu. Wenn Sie nicht einverstanden sind, beenden Sie die Nutzung sofort und löschen Sie die App.{'\n'}
    Diese Bedingungen stellen eine verbindliche rechtliche Vereinbarung zwischen Ihnen und Calmino dar.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Dienstbeschreibung{'\n'}</Text>
    Calmino ist eine Gesundheits-Tracking-App für Babys und Kinder, die ermöglicht:{'\n'}
    • Tracking von Fütterung, Schlaf, Windeln, Nahrungsergänzung, Impfungen und Medikamenten{'\n'}
    • Messung von Wachstumsindikatoren und Wachstumskurven{'\n'}
    • Teilen von Daten mit Familienmitgliedern und Babysittern{'\n'}
    • Erstellung von Statistiken, Berichten und Analysen{'\n'}
    • Aufzeichnung magischer Momente und Meilensteine{'\n'}
    • Verwaltung personalisierter Erinnerungen und Benachrichtigungen{'\n'}
    • Babysitter-Such-, Buchungsvermittlung und Chat-Nachrichten{'\n\n'}
    <Text style={styles.bold}>Mindestalter: 16 Jahre.</Text> Der Dienst ist nicht für Nutzer unter 16 Jahren bestimmt.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Benutzerkonto{'\n'}</Text>
    3.1 <Text style={styles.bold}>Registrierung:</Text> Sie müssen wahrheitsgemäße, genaue und aktuelle Angaben machen.{'\n'}
    3.2 <Text style={styles.bold}>Sicherheit:</Text> Sie sind für die Vertraulichkeit Ihres Passworts verantwortlich.{'\n'}
    3.3 <Text style={styles.bold}>Einzelkonto:</Text> Jede Person darf nur ein persönliches Konto besitzen.{'\n'}
    3.4 <Text style={styles.bold}>Verantwortung:</Text> Sie sind allein verantwortlich für alle Aktivitäten in Ihrem Konto.{'\n'}
    3.5 <Text style={styles.bold}>Löschung:</Text> Sie können Ihr Konto jederzeit über die Einstellungen löschen.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Erlaubte und verbotene Nutzung{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>Erlaubt:{'\n'}</Text>
    • Persönliche und familiäre Nutzung zur Betreuung Ihrer Kinder{'\n'}
    • Teilen von Daten mit autorisierten Familienmitgliedern und Babysittern{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>Streng verboten:{'\n'}</Text>
    • Kommerzielle Nutzung ohne schriftliche Lizenz{'\n'}
    • Hochladen illegaler, beleidigender, irreführender oder rechtsverletzender Inhalte{'\n'}
    • Unbefugter Zugriff auf Daten anderer Nutzer{'\n'}
    • Reverse Engineering, Disassemblierung oder Kopieren des App-Codes{'\n'}
    • Verwendung von Bots, Skripten oder automatisierten Tools{'\n'}
    • Verbreitung von Spam, Malware oder schädlichen Inhalten{'\n'}
    • Nutzung zur Belästigung oder Verletzung der Privatsphäre anderer{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Benutzerinhalte{'\n'}</Text>
    Von Ihnen eingegebene Informationen bleiben Ihr Eigentum. Durch das Hochladen gewähren Sie uns eine begrenzte, nicht-exklusive Lizenz zur Speicherung, Sicherung und Anzeige ausschließlich zur Erbringung des Dienstes.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Premium-Dienst{'\n'}</Text>
    6.1 Calmino bietet kostenpflichtige Abonnements ("Premium") mit erweiterten Funktionen.{'\n'}
    6.2 Zahlungen werden über <Text style={styles.bold}>Apple App Store</Text> oder <Text style={styles.bold}>Google Play Store</Text> abgewickelt.{'\n'}
    6.3 Abonnements verlängern sich <Text style={styles.bold}>automatisch</Text>; jederzeit kündbar über die Store-Einstellungen.{'\n'}
    6.4 Keine Rückerstattung für genutzte Zeiträume, sofern gesetzlich nicht vorgeschrieben.{'\n'}
    6.5 Preisänderungen mit <Text style={styles.bold}>30 Tagen</Text> Vorankündigung vorbehalten.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Dienste Dritter{'\n'}</Text>
    Die App nutzt externe Dienste:{'\n'}
    • <Text style={styles.bold}>Google Firebase</Text> — Datenspeicherung, Authentifizierung und Infrastruktur{'\n'}
    • <Text style={styles.bold}>Apple</Text> — Authentifizierung und Push-Benachrichtigungen{'\n'}
    • <Text style={styles.bold}>Expo</Text> — Entwicklungsplattform und Updates{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> — Verwaltung von Abonnements und Käufen{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> — Wetterdaten{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Haftungsbeschränkung, medizinischer Haftungsausschluss und Babysitter-Dienste{'\n'}</Text>
    8.1 Der Dienst wird <Text style={styles.bold}>"wie besehen"</Text> ohne jegliche Garantie bereitgestellt.{'\n'}
    8.2 <Text style={styles.bold}>Die App ersetzt keine professionelle medizinische Beratung.</Text> Konsultieren Sie immer einen qualifizierten Kinderarzt.{'\n'}
    8.3 <Text style={styles.bold}>Babysitter-Dienste — nur Vermittlungsplattform:</Text> Calmino <Text style={styles.bold}>beschäftigt, empfiehlt, befürwortet, überprüft, garantiert und übernimmt keine Verantwortung</Text> für Babysitter. <Text style={styles.bold}>Die alleinige Verantwortung</Text> für Eignungsprüfung, Identitätsverifizierung und Hintergrundüberprüfung liegt beim Elternteil.{'\n'}
    8.4 Calmino haftet nicht für direkte, indirekte, zufällige, besondere oder Folgeschäden.{'\n'}
    8.5 Unsere Gesamthaftung übersteigt nicht den im letzten Jahr gezahlten Betrag oder 200 ₪ — je nachdem, welcher Betrag geringer ist.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Geistiges Eigentum{'\n'}</Text>
    Alle Rechte an der App sind ausschließliches Eigentum von Calmino und durch Urheberrechts-, Marken- und Patentgesetze geschützt.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Kontokündigung und Sperrung{'\n'}</Text>
    Wir behalten uns das Recht vor, Konten bei Verstoß gegen die Bedingungen zu sperren oder zu schließen.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Freistellung{'\n'}</Text>
    Sie erklären sich bereit, Calmino von allen Ansprüchen freizustellen, die aus Ihrer Nutzung des Dienstes entstehen.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Änderungen der Bedingungen{'\n'}</Text>
    Wesentliche Änderungen werden mindestens <Text style={styles.bold}>30 Tage</Text> im Voraus mitgeteilt.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>13. Salvatorische Klausel{'\n'}</Text>
    Sollte eine Bestimmung unwirksam sein, wird sie durch eine gültige Bestimmung ähnlicher Absicht ersetzt.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>14. Anwendbares Recht und Streitbeilegung{'\n'}</Text>
    Diese Bedingungen unterliegen den Gesetzen des Staates Israel. Streitigkeiten werden <Text style={styles.bold}>ausschließlich vor den zuständigen Gerichten im Bezirk Tel Aviv-Jaffa</Text> verhandelt.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>15. Kontakt{'\n'}</Text>
    Für Fragen, Beschwerden oder rechtliche Anfragen:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);
