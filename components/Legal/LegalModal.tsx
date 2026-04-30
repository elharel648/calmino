// components/Legal/LegalModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { PrivacyContentAR, TermsContentAR } from './LegalContentAR';
import { PrivacyContentFR, TermsContentFR } from './LegalContentFR';
import { PrivacyContentDE, TermsContentDE } from './LegalContentDE';
import { PrivacyContentES, TermsContentES } from './LegalContentES';

export type LegalType = 'terms' | 'privacy';

interface LegalModalProps {
  visible: boolean;
  type: LegalType;
  onClose: () => void;
}

const LAST_UPDATED_HE = '16 באפריל 2026';
const LAST_UPDATED_EN = 'April 16, 2026';
const CONTACT_EMAIL = 'calminogroup@gmail.com';

// ─────────────────────────────────────────────
// Privacy Policy Content — Hebrew
// ─────────────────────────────────────────────
const PrivacyContentHE = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>גרסה 1.1 | עדכון אחרון: {LAST_UPDATED_HE}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. מבוא{'\n'}</Text>
    Calmino ("אנחנו", "אנו", "החברה") מחויבת להגן על פרטיות המשתמשים שלה. מדיניות פרטיות זו ("המדיניות") מסבירה אילו נתונים אישיים אנחנו אוספים, כיצד אנחנו משתמשים בהם, ואילו זכויות יש לך עליהם.{'\n'}
    מדיניות זו עומדת בדרישות:{'\n'}
    • חוק הגנת הפרטיות, תשמ"א-1981 ותקנות הגנת הפרטיות (אבטחת מידע), תשע"ז-2017{'\n'}
    • תקנות הגנת המידע הכלליות של האיחוד האירופי (GDPR) 2016/679{'\n'}
    • חוק הגנת פרטיות ילדים מקוונים האמריקאי (COPPA){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. מי אנחנו{'\n'}</Text>
    Calmino היא אפליקציית מעקב ובריאות לתינוקות וילדים, המופעלת ומפותחת על ידי קבוצת Calmino.{'\n'}
    לפניות בנושאי פרטיות: {CONTACT_EMAIL}{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. מידע שאנחנו אוספים{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>א. מידע שאתה מספק ישירות:{'\n'}</Text>
    • פרטי חשבון: שם מלא, כתובת אימייל, סיסמה מוצפנת{'\n'}
    • פרופיל ילד: שם, תאריך לידה, מגדר, תמונת פרופיל{'\n'}
    • נתוני מעקב: האכלה (שעה, כמות, סוג), שינה (שעות כניסה ויציאה), החלפת חיתול, תוספי תזונה, חיסונים, תרופות, מדדי גדילה (משקל, גובה, היקף ראש){'\n'}
    • נתוני מיקום (GPS) — כדי לאפשר איתור בייביסיטרים קרובים, האפליקציה אוספת נתוני מיקום כלליים ומדויקים שלך אך ורק באישורך הברור ובזמן השימוש. נתונים אלו אינם נשמרים בהיסטוריה, אינם נסחרים וניתן לבטלם מתי שתרצה דרך ההגדרות.{'\n'}
    • הערות ותיעוד שתזין ידנית{'\n'}
    • תמונות ורגעים קסומים שתבחר לשמור{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>ב. מידע הנאסף אוטומטית:{'\n'}</Text>
    • סוג מכשיר, גרסת מערכת הפעלה, ומזהה מכשיר ייחודי{'\n'}
    • Token להתראות Push (לצורך שליחת תזכורות בלבד){'\n'}
    • כתובת IP (לצרכי אבטחה וזיהוי תקלות בלבד — אינה נשמרת לאורך זמן){'\n'}
    • נתוני שימוש אנונימיים ודיווחי קריסה (Crash Reports) דרך שירותים חיצוניים (כדוגמת Sentry) לאיתור באגים מהיר ושיפור יציבות. המידע אינו מכיל נתונים מזהים כלל.{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>ג. מידע מצדדים שלישיים:{'\n'}</Text>
    • בהתחברות עם Google: שם מלא וכתובת אימייל מחשבון Google בלבד{'\n'}
    • בהתחברות עם Apple: כתובת אימייל (שיכולה להיות מוסתרת על ידי Apple){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. מטרות השימוש במידע{'\n'}</Text>
    אנחנו משתמשים במידע אך ורק למטרות אלה:{'\n'}
    • מתן שירותי האפליקציה, תחזוקתה ושיפורה{'\n'}
    • הצגת נתונים, גרפים וסטטיסטיקות אישיות{'\n'}
    • שיתוף נתונים עם בני משפחה ובייביסיטרים בהתאם להרשאות שקבעת{'\n'}
    • שליחת התראות ותזכורות שביקשת מפורשות{'\n'}
    • מתן תמיכה טכנית{'\n'}
    • עמידה בחובות חוקיות{'\n'}
    • שיפור השירות באמצעות נתונים מצטברים ואנונימיים בלבד{'\n\n'}
    אנחנו <Text style={styles.bold}>לא</Text> משתמשים במידע שלך לפרסום ממוקד, ולא מוכרים נתונים לגורמים מסחריים.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. שיתוף מידע עם צדדים שלישיים{'\n'}</Text>
    אנו נעזרים בספקי שירות חיצוניים ומוכרים לתפעול האפליקציה:{'\n'}
    • תשתיות, ניהול משתמשים ואחסון נתונים במסד מאובטח (<Text style={styles.bold}>Google Firebase</Text>){'\n'}
    • מערכת התחברות לחשבון ושירותי התראות (<Text style={styles.bold}>Apple</Text>){'\n'}
    • פלטפורמת פיתוח ושליחת התראות למכשיר (<Text style={styles.bold}>Expo / EAS</Text>){'\n'}
    • ניהול מנויים ורכישות מאובטח מול חנויות האפליקציות (<Text style={styles.bold}>RevenueCat</Text>){'\n'}
    • טעינת נתוני מזג אוויר מקומי מבוססי מיקום (<Text style={styles.bold}>Apple WeatherKit</Text>){'\n\n'}
    אנחנו <Text style={styles.bold}>לא</Text> מוכרים, משכירים, מחליפים, או מסחרים במידע שלך בשום אופן.{'\n'}
    נחשוף מידע לגורם חיצוני רק אם: (1) נדרשנו לכך בצו שיפוטי תקף; (2) נדרש לפי חוק; (3) הכרחי להגנה על בטיחות הציבור.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. העברת מידע בינלאומית{'\n'}</Text>
    נתוניך מאוחסנים בשרתי Google Firebase שיכולים להיות ממוקמים בארה"ב ו/או באירופה. Firebase עומד בדרישות GDPR ומספק הגנות מתאימות. בשימושך בשירות, אתה מסכים להעברה זו.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. אבטחת מידע{'\n'}</Text>
    אנחנו נוקטים במגוון אמצעי אבטחה:{'\n'}
    • הצפנת כל תעבורת הנתונים (TLS 1.2+){'\n'}
    • הצפנת נתונים באחסון באמצעות Firebase Security Rules{'\n'}
    • הרשאות גישה מחמירות — כל משתמש ניגש רק לנתוניו{'\n'}

    • ניטור חריגות ורישום אירועי אבטחה{'\n\n'}
    חשוב להבין: אין מערכת דיגיטלית בטוחה לחלוטין. אם יש לך חשד לפרצת אבטחה, הודע לנו מיד בכתובת {CONTACT_EMAIL}.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. שמירת מידע{'\n'}</Text>
    • נשמור את נתוניך כל עוד חשבונך פעיל{'\n'}
    • לאחר מחיקת חשבון: מידע אישי <Text style={styles.bold}>יימחק מיידית</Text> עם השלמת תהליך המחיקה{'\n'}
    • גיבויים טכניים עשויים להישמר עד <Text style={styles.bold}>90 יום</Text> נוספים בלבד{'\n'}
    • מידע הנדרש לשמירה על פי חוק (כגון: עסקאות כספיות) יישמר לתקופה הנדרשת בחוק{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. פרטיות ילדים{'\n'}</Text>
    השירות מיועד להורים (16+) בלבד. המידע הנוגע לילדים נאסף אך ורק:{'\n'}
    • מיוזמתם, הזנתם ושליטתם המלאה של הוריהם / אפוטרופוסיהם החוקיים{'\n'}
    • למטרות מעקב בריאות אישי בלבד, ללא כל שיתוף מסחרי וללא פרסום ממוקד{'\n\n'}
    כהורה, שמורה לך הזכות המוחלטת למחוק את כל נתוני ילדיך מהשרתים שלנו לצמיתות ובאופן מיידי ("הזכות להישכח") דרך האפליקציה. איננו אוספים מידע ישירות מילדים.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. זכויותיך{'\n'}</Text>
    בהתאם לחוק הגנת הפרטיות הישראלי ול-GDPR, יש לך:{'\n'}
    • <Text style={styles.bold}>זכות עיון</Text> — לקבל עותק של המידע שאנחנו מחזיקים עליך{'\n'}
    • <Text style={styles.bold}>זכות תיקון</Text> — לתקן מידע שגוי או לא מעודכן{'\n'}
    • <Text style={styles.bold}>זכות מחיקה</Text> — "הזכות להישכח" — למחוק את כל המידע שלך{'\n'}
    • <Text style={styles.bold}>זכות ניוד</Text> — לקבל את נתוניך בפורמט קריא-מכונה{'\n'}
    • <Text style={styles.bold}>זכות התנגדות</Text> — להתנגד לעיבוד מסוים של מידע{'\n'}
    • <Text style={styles.bold}>ביטול הסכמה</Text> — לבטל הסכמה שנתת בכל עת{'\n\n'}
    לממש זכויותיך: {CONTACT_EMAIL} — נגיב תוך <Text style={styles.bold}>30 יום</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. שינויים במדיניות{'\n'}</Text>
    נודיע על שינויים מהותיים דרך האפליקציה ו/או בדוא"ל לפחות <Text style={styles.bold}>30 יום</Text> מראש. המשך שימוש לאחר קבלת ההודעה מהווה הסכמה לשינויים.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. יצירת קשר{'\n'}</Text>
    לשאלות, בקשות או תלונות בנושא פרטיות:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

// ─────────────────────────────────────────────
// Privacy Policy Content — English
// ─────────────────────────────────────────────
const PrivacyContentEN = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyTextLTR, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Version 1.1 | Last Updated: {LAST_UPDATED_EN}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Introduction{'\n'}</Text>
    Calmino ("we", "us", "the Company") is committed to protecting the privacy of its users. This Privacy Policy ("Policy") explains what personal data we collect, how we use it, and what rights you have over it.{'\n'}
    This Policy complies with:{'\n'}
    • Israeli Privacy Protection Law, 5741-1981 and Privacy Protection Regulations (Data Security), 5777-2017{'\n'}
    • EU General Data Protection Regulation (GDPR) 2016/679{'\n'}
    • U.S. Children's Online Privacy Protection Act (COPPA){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Who We Are{'\n'}</Text>
    Calmino is a baby and child health tracking application, operated and developed by Calmino Group.{'\n'}
    For privacy inquiries: {CONTACT_EMAIL}{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. Information We Collect{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>a. Information you provide directly:{'\n'}</Text>
    • Account details: full name, email address, encrypted password{'\n'}
    • Child profile: name, date of birth, gender, profile photo{'\n'}
    • Tracking data: feeding (time, amount, type), sleep (start/end times), diaper changes, nutritional supplements, vaccinations, medications, growth measurements (weight, height, head circumference){'\n'}
    • Location data (GPS) — the app may collect location data only with your explicit permission and only while using the app. This data is not retained in history, is not sold, and can be revoked at any time.{'\n'}
    • Notes and records you enter manually{'\n'}
    • Photos and magic moments you choose to save{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>b. Information collected automatically:{'\n'}</Text>
    • Device type, operating system version, and unique device identifier{'\n'}
    • Push notification token (for sending reminders only){'\n'}
    • IP address (for security and troubleshooting only — not stored long-term){'\n'}
    • Anonymous usage data and crash reports via external services (e.g., Sentry) purely to identify bugs and improve stability. This information does not contain personally identifiable data.{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>c. Information from third parties:{'\n'}</Text>
    • When signing in with Google: full name and email address from your Google account only{'\n'}
    • When signing in with Apple: email address (which may be hidden by Apple){'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. How We Use Your Information{'\n'}</Text>
    We use your information solely for these purposes:{'\n'}
    • Providing, maintaining, and improving the app's services{'\n'}
    • Displaying personal data, charts, and statistics{'\n'}
    • Sharing data with family members according to permissions you set{'\n'}
    • Sending notifications and reminders you explicitly requested{'\n'}
    • Providing technical support{'\n'}
    • Complying with legal obligations{'\n'}
    • Improving the service using aggregated and anonymous data only{'\n\n'}
    We do <Text style={styles.bold}>not</Text> use your information for targeted advertising, and we do not sell data to commercial entities.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. Sharing Information with Third Parties{'\n'}</Text>
    We use reputable external service providers to operate the App:{'\n'}
    • <Text style={styles.bold}>Google Firebase</Text> - Data storage and user management (complies with international security standards).{'\n'}
    • <Text style={styles.bold}>Apple</Text> - Account sign-in and notification system.{'\n'}
    • <Text style={styles.bold}>Expo / EAS</Text> - App infrastructure and push notifications.{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> - Secure subscription and purchase management via app stores.{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> - Local weather data services.{'\n\n'}
    We do <Text style={styles.bold}>not</Text> sell, rent, exchange, or commercialize your information in any way.{'\n'}
    We will disclose information to an external party only if: (1) required by a valid court order; (2) required by law; (3) necessary to protect public safety.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. International Data Transfers{'\n'}</Text>
    Your data is stored on Google Firebase servers that may be located in the USA and/or Europe. Firebase meets GDPR requirements and provides appropriate safeguards. By using the service, you consent to this transfer.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Data Security{'\n'}</Text>
    We employ a variety of security measures:{'\n'}
    • Encryption of all data in transit (TLS 1.2+){'\n'}
    • Encryption of data at rest via Firebase Security Rules{'\n'}
    • Strict access controls — each user can only access their own data{'\n'}

    • Anomaly monitoring and security event logging{'\n\n'}
    Important: no digital system is completely secure. If you suspect a security breach, notify us immediately at {CONTACT_EMAIL}.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Data Retention{'\n'}</Text>
    • We retain your data as long as your account is active{'\n'}
    • Upon account deletion: personal data is <Text style={styles.bold}>deleted immediately</Text> upon completion of the deletion process{'\n'}
    • Technical backups may be retained for up to <Text style={styles.bold}>90 days</Text> only{'\n'}
    • Information required by law (such as financial transactions) will be retained for the legally required period{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Children's Privacy{'\n'}</Text>
    The service is exclusively for use by parents (16+). Information regarding children is collected solely:{'\n'}
    • Under the direct initiative, entry, and full control of their parents / guardians{'\n'}
    • For personal health tracking only, with zero commercial sharing or targeted advertising{'\n\n'}
    As a parent, you retain the absolute right to delete all of your children's data from our servers permanently and immediately ("Right to be Forgotten") via the App. We never collect information directly from children.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Your Rights{'\n'}</Text>
    Under Israeli Privacy Protection Law and GDPR, you have:{'\n'}
    • <Text style={styles.bold}>Right of Access</Text> — to receive a copy of the information we hold about you{'\n'}
    • <Text style={styles.bold}>Right to Rectification</Text> — to correct inaccurate or outdated information{'\n'}
    • <Text style={styles.bold}>Right to Erasure</Text> — the "right to be forgotten" — to delete all your data{'\n'}
    • <Text style={styles.bold}>Right to Data Portability</Text> — to receive your data in a machine-readable format{'\n'}
    • <Text style={styles.bold}>Right to Object</Text> — to object to certain processing of your data{'\n'}
    • <Text style={styles.bold}>Withdrawal of Consent</Text> — to withdraw consent you have given at any time{'\n\n'}
    To exercise your rights: {CONTACT_EMAIL} — we will respond within <Text style={styles.bold}>30 days</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Changes to This Policy{'\n'}</Text>
    We will notify you of material changes via the app and/or email at least <Text style={styles.bold}>30 days</Text> in advance. Continued use after receiving notice constitutes acceptance of the changes.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Contact Us{'\n'}</Text>
    For questions, requests, or complaints regarding privacy:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

// ─────────────────────────────────────────────
// Terms of Service Content — Hebrew
// ─────────────────────────────────────────────
const TermsContentHE = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>גרסה 1.1 | עדכון אחרון: {LAST_UPDATED_HE}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. הסכמה לתנאים{'\n'}</Text>
    בהורדה, התקנה, או שימוש באפליקציית Calmino ("האפליקציה" / "השירות"), הנך מסכים לתנאי שימוש אלה ("התנאים"). אם אינך מסכים, הפסק את השימוש באלתר ומחק את האפליקציה.{'\n'}
    תנאים אלה מהווים הסכם משפטי מחייב בינך לבין Calmino. השימוש באפליקציה מהווה אישור שקראת, הבנת ומסכים לכל התנאים המפורטים להלן.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. תיאור השירות{'\n'}</Text>
    Calmino היא אפליקציית מעקב ובריאות לתינוקות וילדים, המאפשרת:{'\n'}
    • מעקב אחר האכלה, שינה, חיתולים, תוספי תזונה, חיסונים ותרופות{'\n'}
    • מדידת מדדי גדילה ועקומות צמיחה{'\n'}
    • שיתוף נתונים עם בני / בנות משפחה ובייביסיטרים{'\n'}
    • יצירת סטטיסטיקות, דוחות ותובנות{'\n'}
    • תיעוד רגעים קסומים ואבני דרך{'\n'}
    • ניהול תזכורות והתראות מותאמות אישית{'\n'}
    • שירותי איתור בייביסיטרים וחיבור בין הורים לבייביסיטרים עצמאיים{'\n\n'}
    <Text style={styles.bold}>הגיל המינימלי לשימוש: 16.</Text> השירות אינו מיועד למשתמשים מתחת לגיל 16.{'\n'}
    <Text style={styles.bold}>גיל מינימלי לרישום כבייביסיטר: 18.</Text> הרשמה כבייביסיטר מחייבת גיל 18 ומעלה.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. חשבון משתמש{'\n'}</Text>
    3.1 <Text style={styles.bold}>רישום:</Text> עליך לספק פרטים אמיתיים, מדויקים ועדכניים.{'\n'}
    3.2 <Text style={styles.bold}>אבטחה:</Text> אתה אחראי לשמירת סודיות סיסמתך ואמצעי הכניסה לחשבונך. הודע לנו מיד על כל שימוש לא מורשה.{'\n'}
    3.3 <Text style={styles.bold}>חשבון יחיד:</Text> כל אדם רשאי להחזיק חשבון אישי אחד בלבד.{'\n'}
    3.4 <Text style={styles.bold}>אחריות:</Text> אתה האחראי הבלעדי לכל פעילות שמתבצעת בחשבונך.{'\n'}
    3.5 <Text style={styles.bold}>מחיקה:</Text> תוכל למחוק את חשבונך בכל עת דרך מסך ההגדרות.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. שימוש מותר ואסור{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>מותר:{'\n'}</Text>
    • שימוש אישי ומשפחתי לניהול טיפול בילדיך{'\n'}
    • שיתוף נתונים עם בני / בנות משפחה ובייביסיטרים שמינית{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>אסור בהחלט:{'\n'}</Text>
    • שימוש מסחרי ללא רישיון כתוב מאתנו{'\n'}
    • העלאת תוכן בלתי חוקי, פוגעני, מטעה, או מפר זכויות{'\n'}
    • ניסיון לגשת לנתוני משתמשים אחרים ללא אישור{'\n'}
    • הנדסה לאחור, פירוק, או שכפול הקוד של האפליקציה{'\n'}
    • שימוש בבוטים, סקריפטים, או כלים אוטומטיים{'\n'}
    • הפצת ספאם, malware, או תוכן זדוני{'\n'}
    • שימוש לעקיבה, הטרדה, או פגיעה בפרטיות אחרים{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. תוכן המשתמש{'\n'}</Text>
    המידע שתזין לאפליקציה (תמונות, הערות, רשומות) נשאר שלך. על ידי העלאתו, אתה מעניק לנו רישיון מוגבל, לא בלעדי, לאחסן, לגבות ולהציג אותו לצורכי מתן השירות בלבד.{'\n'}
    אתה מתחייב שהתוכן שתעלה: אינו מפר זכויות יוצרים או קניין רוחני; אינו בלתי חוקי, פוגעני, או מטעה; ואינו מכיל מידע רגיש של אחרים ללא הסכמתם.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. שירות פרמיום{'\n'}</Text>
    6.1 Calmino מציעה תוכניות מנוי בתשלום ("פרמיום") עם תכונות מורחבות.{'\n'}
    6.2 תשלומים מעובדים דרך <Text style={styles.bold}>Apple App Store</Text> או <Text style={styles.bold}>Google Play Store</Text> בלבד — Calmino אינה מחזיקה את פרטי כרטיס האשראי שלך.{'\n'}
    6.3 מנויים <Text style={styles.bold}>מתחדשים אוטומטית</Text> בתום כל תקופה; ניתן לבטל בכל עת דרך הגדרות החנות.{'\n'}
    6.4 לא יינתנו החזרים כספיים לתקופות שבהן בוצע שימוש, אלא אם נדרש על פי חוק.{'\n'}
    6.5 שמורה לנו הזכות לשנות תמחור עם הודעה מוקדמת של <Text style={styles.bold}>30 יום</Text>.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. שירותים של צדדים שלישיים{'\n'}</Text>
    האפליקציה מסתמכת על שירותים חיצוניים:{'\n'}
    • תשתית, אחסון נתונים ואימות משתמשים (<Text style={styles.bold}>Google Firebase</Text>){'\n'}
    • אימות ומערכת התראות (<Text style={styles.bold}>Apple</Text>){'\n'}
    • פלטפורמת פיתוח ועדכונים (<Text style={styles.bold}>Expo / EAS</Text>){'\n'}
    • ניהול מנויים ורכישות מאובטח (<Text style={styles.bold}>RevenueCat</Text>){'\n'}
    • שירות נתוני מזג אוויר (<Text style={styles.bold}>Apple WeatherKit</Text>){'\n\n'}
    שימושך בשירותים אלה כפוף גם למדיניות ותנאי השימוש שלהם. Calmino אינה אחראית לזמינות, ביצועים, או שינויים בשירותי צד שלישי.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. הגבלת אחריות, אחריות רפואית ושירותי בייביסיטר{'\n'}</Text>
    8.1 השירות מסופק <Text style={styles.bold}>"כפי שהוא" (AS IS)</Text> ו-"כפי שהוא זמין" (AS AVAILABLE) ללא אחריות מכל סוג.{'\n'}
    8.2 <Text style={styles.bold}>האפליקציה אינה מחליפה ייעוץ רפואי מקצועי.</Text> המידע המוצג הוא לצרכי תיעוד ומעקב בלבד. תמיד התייעץ עם רופא ילדים מוסמך בכל שאלה רפואית.{'\n'}
    8.3 <Text style={styles.bold}>שירות העסקת בייביסיטרים — פטור מוחלט ויסודי מאחריות:</Text> Calmino מספקת פלטפורמה דיגיטלית ("לוח מודעות") המקשרת בין הורים לבייביסיטרים עצמאיים. <Text style={styles.bold}>החברה אינה סוכנות כוח אדם, אינה מעסיקה את הבייביסיטרים, אינה מראיינת אותם, אינה מבצעת בדיקות רקע, יושר או רישום פלילי מכל סוג שהוא, ואינה ערבה להם.</Text> כל התקשרות, העסקה או מפגש שנוצרים דרך האפליקציה נעשים על אחריותם הבלעדית והמלאה של ההורים. חלה עליך (ההורה) החובה לבצע משנה זהירות, לבקש תעודות מזהות ולבדוק המלצות לפני הפקדת ילדיך.{'\n'}
    <Text style={styles.bold}>יצירת קשר מחוץ לפלטפורמה:</Text> התקשורת בין הורים לבייביסיטרים מתבצעת דרך שירותי הודעות חיצוניים (כגון WhatsApp). Calmino אינה צד בתקשורת זו, אינה מנטרת אותה ואינה אחראית לתוכנה או לתוצאותיה.{'\n'}
    <Text style={styles.bold}>ויתור מוחלט על תביעות:</Text> בעצם השימוש באפליקציה לאיתור בייביסיטר, אתה מוותר בזאת ויתור מוחלט, סופי ובלתי חוזר על כל טענה, דרישה או תביעה כלפי Calmino, מנהליה, או עובדיה בגין כל נזק ישיר או עקיף, פגיעה גופנית, נזק לרכוש, גניבה, רשלנות או מעשה פלילי שייגרמו על ידי בייביסיטר שמצאת דרך הפלטפורמה.{'\n'}
    8.4 Calmino אינה נושאת באחריות לנזקים ישירים, עקיפים, נסיבתיים, מיוחדים, עונשיים, או תוצאתיים הנובעים מ: שימוש או אי-יכולת לשתמש בשירות; אובדן נתונים; הסתמכות על מידע מהאפליקציה; מפגש עם בייביסיטר; או כשל טכני.{'\n'}
    8.5 אחריותנו הכוללת לא תעלה על הסכום שאתה שילמת בשנת הרישום האחרונה, או 200 ₪ — הנמוך מביניהם.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. קניין רוחני{'\n'}</Text>
    כל הזכויות באפליקציה — לרבות קוד מקור, עיצוב, ממשק משתמש, לוגו, שם "Calmino", וכל תוכן שיצרנו — הינן קניינה הבלעדי של Calmino ומוגנות בחוק זכויות יוצרים, סימני מסחר ופטנטים.{'\n'}
    חל איסור מוחלט על: שכפול, הפצה, שינוי, יצירת נגזרות, הצגה ציבורית, או שימוש מסחרי — ללא אישור מפורש בכתב. הפרה תוביל לתביעה אזרחית ו/או פלילית.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. ביטול חשבון והשעיה{'\n'}</Text>
    שמורה לנו הזכות להשעות או לסגור חשבון שהפר את התנאים, עם הודעה מוקדמת במידת האפשר. בסגירה מרצון: תוכל לייצא את נתוניך לפני המחיקה הסופית באמצעות כפתור "הורד את המידע שלי" בהגדרות.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. פיצוי{'\n'}</Text>
    הנך מסכים לשפות ולהגן על Calmino, עובדיה, מנהליה, בעלי מניותיה ושותפיה מפני כל תביעה, נזק, אחריות, הפסד, עלות ושכר טרחה משפטי הנובעים מ: שימושך בשירות; הפרת תנאים אלה; הפרת זכויות צד שלישי; או כל תוכן שהעלית.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. שינויים בתנאים{'\n'}</Text>
    נודיע על שינויים מהותיים בתנאים דרך האפליקציה ו/או בדוא"ל לפחות <Text style={styles.bold}>30 יום</Text> מראש. המשך שימוש לאחר קבלת ההודעה מהווה הסכמה לתנאים המעודכנים. אם אינך מסכים — עליך להפסיק את השימוש ולמחוק את חשבונך.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>13. היפרדות סעיפים{'\n'}</Text>
    אם סעיף כלשהו בתנאים אלה יימצא בלתי תקף או לא ניתן לאכיפה, הוא ייפרד מהתנאים ויוחלף בסעיף תקף עם כוונה דומה — בעוד שאר התנאים יישארו בתוקף מלא.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>14. דין חל ויישוב סכסוכים{'\n'}</Text>
    תנאים אלה כפופים לחוקי מדינת ישראל. כל מחלוקת תידון בבתי המשפט המוסמכים <Text style={styles.bold}>במחוז תל אביב-יפו בלבד</Text>.{'\n'}
    הצדדים מתחייבים לנסות להגיע להסכמה ידידותית תוך 30 יום טרם פנייה לבית משפט.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>15. יצירת קשר{'\n'}</Text>
    לשאלות, תלונות, או בקשות משפטיות:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

// ─────────────────────────────────────────────
// Terms of Service Content — English
// ─────────────────────────────────────────────
const TermsContentEN = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyTextLTR, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>Version 1.1 | Last Updated: {LAST_UPDATED_EN}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. Acceptance of Terms{'\n'}</Text>
    By downloading, installing, or using the Calmino application ("the App" / "the Service"), you agree to these Terms of Service ("the Terms"). If you do not agree, discontinue use immediately and delete the app.{'\n'}
    These Terms constitute a binding legal agreement between you and Calmino. Using the app confirms that you have read, understood, and agree to all Terms outlined below.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. Service Description{'\n'}</Text>
    Calmino is a baby and child health tracking application that enables:{'\n'}
    • Tracking feeding, sleep, diapers, nutritional supplements, vaccinations, and medications{'\n'}
    • Measuring growth metrics and growth curves{'\n'}
    • Sharing data with family members{'\n'}
    • Creating statistics, reports, and insights{'\n'}
    • Recording magic moments and milestones{'\n'}
    • Managing customized reminders and notifications{'\n\n'}
    <Text style={styles.bold}>Minimum age for use: 16.</Text> The service is not intended for users under the age of 16.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>3. User Account{'\n'}</Text>
    3.1 <Text style={styles.bold}>Registration:</Text> You must provide truthful, accurate, and current information.{'\n'}
    3.2 <Text style={styles.bold}>Security:</Text> You are responsible for maintaining the confidentiality of your password and login credentials. Notify us immediately of any unauthorized use.{'\n'}
    3.3 <Text style={styles.bold}>Single Account:</Text> Each person may hold only one personal account.{'\n'}
    3.4 <Text style={styles.bold}>Responsibility:</Text> You are solely responsible for all activity conducted through your account.{'\n'}
    3.5 <Text style={styles.bold}>Deletion:</Text> You may delete your account at any time through the Settings screen.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>4. Permitted and Prohibited Use{'\n'}</Text>
    <Text style={[styles.subsection, { color: textColor }]}>Permitted:{'\n'}</Text>
    • Personal and family use for managing care of your children{'\n'}
    • Sharing data with family members you have authorized{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>Strictly prohibited:{'\n'}</Text>
    • Commercial use without a written license from us{'\n'}
    • Uploading illegal, offensive, misleading, or rights-infringing content{'\n'}
    • Attempting to access other users' data without authorization{'\n'}
    • Reverse engineering, disassembly, or code duplication of the app{'\n'}
    • Use of bots, scripts, or automated tools{'\n'}
    • Distribution of spam, malware, or malicious content{'\n'}
    • Use for stalking, harassment, or violating others' privacy{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>5. User Content{'\n'}</Text>
    Information you enter into the app (photos, notes, records) remains yours. By uploading it, you grant us a limited, non-exclusive license to store, back up, and display it solely for the purpose of providing the service.{'\n'}
    You warrant that content you upload: does not infringe copyright or intellectual property rights; is not illegal, offensive, or misleading; and does not contain sensitive information of others without their consent.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. Premium Service{'\n'}</Text>
    6.1 Calmino offers paid subscription plans ("Premium") with enhanced features.{'\n'}
    6.2 Payments are processed through <Text style={styles.bold}>Apple App Store</Text> or <Text style={styles.bold}>Google Play Store</Text> only — Calmino does not hold your credit card details.{'\n'}
    6.3 Subscriptions <Text style={styles.bold}>renew automatically</Text> at the end of each period; you may cancel at any time through store settings.{'\n'}
    6.4 No refunds will be issued for periods during which the service was used, unless required by law.{'\n'}
    6.5 We reserve the right to change pricing with <Text style={styles.bold}>30 days</Text> advance notice.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. Third-Party Services{'\n'}</Text>
    The app relies on external services:{'\n'}
    • <Text style={styles.bold}>Google Firebase</Text> - Data storage, authentication, and infrastructure{'\n'}
    • <Text style={styles.bold}>Apple</Text> - Authentication and push notifications{'\n'}
    • <Text style={styles.bold}>Expo</Text> - Development platform and updates{'\n'}
    • <Text style={styles.bold}>RevenueCat</Text> - Subscription and purchase management{'\n'}
    • <Text style={styles.bold}>Apple WeatherKit</Text> - Weather data{'\n\n'}
    Your use of these services is also subject to their respective policies and terms of service. Calmino is not responsible for the availability, performance, or changes in third-party services.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. Limitation of Liability and Medical Disclaimer{'\n'}</Text>
    8.1 The service is provided <Text style={styles.bold}>"AS IS"</Text> and "AS AVAILABLE" without warranty of any kind.{'\n'}
    8.2 <Text style={styles.bold}>The app does not replace professional medical advice.</Text> The information displayed is for documentation and tracking purposes only. Always consult a qualified pediatrician for any medical questions.{'\n'}
    8.3 Calmino is not liable for direct, indirect, incidental, special, punitive, or consequential damages arising from: use or inability to use the service; data loss; reliance on information from the app; or technical failure.{'\n'}
    8.4 Our total liability shall not exceed the amount you paid in the last year of subscription, or ₪200 — whichever is less.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. Intellectual Property{'\n'}</Text>
    All rights in the app — including source code, design, user interface, logo, the name "Calmino", and all content we created — are the exclusive property of Calmino and are protected by copyright, trademark, and patent laws.{'\n'}
    Strictly prohibited: duplication, distribution, modification, creation of derivatives, public display, or commercial use — without express written permission. Violation will result in civil and/or criminal action.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. Account Termination and Suspension{'\n'}</Text>
    We reserve the right to suspend or close accounts that violate the Terms, with prior notice where possible. For voluntary closure: you may export your data before final deletion using the "Download My Data" button in Settings.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>11. Indemnification{'\n'}</Text>
    You agree to indemnify and hold harmless Calmino, its employees, directors, shareholders, and partners from any claim, damage, liability, loss, cost, and legal fees arising from: your use of the service; violation of these Terms; infringement of third-party rights; or any content you uploaded.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>12. Changes to Terms{'\n'}</Text>
    We will notify you of material changes to the Terms via the app and/or email at least <Text style={styles.bold}>30 days</Text> in advance. Continued use after receiving notice constitutes acceptance of the updated Terms. If you do not agree — you must discontinue use and delete your account.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>13. Severability{'\n'}</Text>
    If any provision of these Terms is found to be invalid or unenforceable, it shall be severed from the Terms and replaced with a valid provision with similar intent — while the remaining Terms shall remain in full force and effect.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>14. Governing Law and Dispute Resolution{'\n'}</Text>
    These Terms are governed by the laws of the State of Israel. Any dispute shall be heard in the competent courts <Text style={styles.bold}>in the Tel Aviv-Jaffa district only</Text>.{'\n'}
    The parties commit to attempting to reach an amicable resolution within 30 days before filing a court action.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>15. Contact Us{'\n'}</Text>
    For questions, complaints, or legal requests:{'\n'}
    📧 {CONTACT_EMAIL}{'\n'}
    🌐 www.calminogroup.co.il
  </Text>
);

// ─────────────────────────────────────────────
// Main Modal Component
// ─────────────────────────────────────────────
const TITLES: Record<string, { privacy: string; terms: string; close: string }> = {
  he: { privacy: 'מדיניות פרטיות', terms: 'תנאי שימוש', close: 'סגור' },
  en: { privacy: 'Privacy Policy', terms: 'Terms of Service', close: 'Close' },
  ar: { privacy: 'سياسة الخصوصية', terms: 'شروط الاستخدام', close: 'إغلاق' },
  fr: { privacy: 'Politique de Confidentialité', terms: "Conditions d'Utilisation", close: 'Fermer' },
  de: { privacy: 'Datenschutzrichtlinie', terms: 'Nutzungsbedingungen', close: 'Schließen' },
  es: { privacy: 'Política de Privacidad', terms: 'Términos de Servicio', close: 'Cerrar' },
};

function getPrivacyContent(lang: string, textColor: string, subtitleColor: string) {
  const props = { textColor, subtitleColor };
  switch (lang) {
    case 'he': return <PrivacyContentHE {...props} />;
    case 'ar': return <PrivacyContentAR {...props} />;
    case 'fr': return <PrivacyContentFR {...props} />;
    case 'de': return <PrivacyContentDE {...props} />;
    case 'es': return <PrivacyContentES {...props} />;
    default:  return <PrivacyContentEN {...props} />;
  }
}

function getTermsContent(lang: string, textColor: string, subtitleColor: string) {
  const props = { textColor, subtitleColor };
  switch (lang) {
    case 'he': return <TermsContentHE {...props} />;
    case 'ar': return <TermsContentAR {...props} />;
    case 'fr': return <TermsContentFR {...props} />;
    case 'de': return <TermsContentDE {...props} />;
    case 'es': return <TermsContentES {...props} />;
    default:  return <TermsContentEN {...props} />;
  }
}

export default function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const labels = TITLES[language] || TITLES.en;
  const title = type === 'privacy' ? labels.privacy : labels.terms;
  const closeLabel = labels.close;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          {
            backgroundColor: theme.card,
            paddingBottom: insets.bottom + 8,
          }
        ]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={theme.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {type === 'privacy'
              ? getPrivacyContent(language, theme.textPrimary, theme.textSecondary)
              : getTermsContent(language, theme.textPrimary, theme.textSecondary)
            }
          </ScrollView>

          {/* Close button at bottom */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>{closeLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bodyTextLTR: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  updated: {
    fontSize: 12,
  },
  section: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subsection: {
    fontSize: 14,
    fontWeight: '600',
  },
  bold: {
    fontWeight: '700',
  },
  doneBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
