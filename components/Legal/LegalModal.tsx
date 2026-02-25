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

export type LegalType = 'terms' | 'privacy';

interface LegalModalProps {
  visible: boolean;
  type: LegalType;
  onClose: () => void;
}

const LAST_UPDATED = '20 בינואר 2026';
const CONTACT_EMAIL = 'calminogroup@gmail.com';

// ─────────────────────────────────────────────
// Privacy Policy Content
// ─────────────────────────────────────────────
const PrivacyContent = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>גרסה 1.0 | עדכון אחרון: {LAST_UPDATED}{'\n\n'}</Text>

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
    • נתוני מעקב: האכלה (שעה, כמות, סוג), שינה (שעות כניסה ויציאה), החלפת חיתול, תוספי תזונה, חיסונים, מדדי גדילה (משקל, גובה, היקף ראש){'\n'}
    • הערות ותיעוד שתזין ידנית{'\n'}
    • תמונות ורגעים קסומים שתבחר לשמור{'\n\n'}
    <Text style={[styles.subsection, { color: textColor }]}>ב. מידע הנאסף אוטומטית:{'\n'}</Text>
    • סוג מכשיר, גרסת מערכת הפעלה, ומזהה מכשיר ייחודי{'\n'}
    • Token להתראות Push (לצורך שליחת תזכורות בלבד){'\n'}
    • כתובת IP (לצרכי אבטחה וזיהוי תקלות בלבד — אינה נשמרת לאורך זמן){'\n'}
    • Crash reports אנונימיים לשיפור יציבות האפליקציה{'\n\n'}
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
    <Text style={[styles.subsection, { color: textColor }]}>ספקי שירות חיוניים (מעבדי מידע מאושרים):{'\n'}</Text>
    • <Text style={styles.bold}>Google Firebase</Text> (Firestore, Authentication, Cloud Storage, Cloud Functions) — אחסון נתונים, אימות משתמשים ועיבוד בק-אנד. Firebase עומד ב-GDPR ובמסגרת EU-US Data Privacy Framework. מדיניות Firebase: firebase.google.com/support/privacy{'\n'}
    • <Text style={styles.bold}>Apple</Text> (Sign in with Apple, APNs) — אימות משתמשים ושליחת התראות ל-iOS{'\n'}
    • <Text style={styles.bold}>Expo (Expo Go / EAS)</Text> — פלטפורמת פיתוח ושליחת התראות Push חוצות-פלטפורמות{'\n\n'}
    כל ספקי השירות כפופים להסכמי עיבוד נתונים (DPA) ולסטנדרטים גבוהים של אבטחה.{'\n\n'}
    אנחנו <Text style={styles.bold}>לא</Text> מוכרים, משכירים, מחליפים, או מסחרים במידע שלך בשום אופן.{'\n'}
    נחשוף מידע לגורם חיצוני רק אם: (1) נדרשנו לכך בצו שיפוטי תקף; (2) נדרש לפי חוק; (3) הכרחי להגנה על בטיחות הציבור.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>6. העברת מידע בינלאומית{'\n'}</Text>
    נתוניך מאוחסנים בשרתי Google Firebase שיכולים להיות ממוקמים בארה"ב ו/או באירופה. Firebase עומד בדרישות GDPR ומספק הגנות מתאימות. בשימושך בשירות, אתה מסכים להעברה זו.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>7. אבטחת מידע{'\n'}</Text>
    אנחנו נוקטים במגוון אמצעי אבטחה:{'\n'}
    • הצפנת כל תעבורת הנתונים (TLS 1.2+){'\n'}
    • הצפנת נתונים באחסון באמצעות Firebase Security Rules{'\n'}
    • הרשאות גישה מחמירות — כל משתמש ניגש רק לנתוניו{'\n'}
    • אימות דו-שלבי אופציונלי (Face ID / Touch ID){'\n'}
    • ניטור חריגות ורישום אירועי אבטחה{'\n\n'}
    חשוב להבין: אין מערכת דיגיטלית בטוחה לחלוטין. אם יש לך חשד לפרצת אבטחה, הודע לנו מיד בכתובת {CONTACT_EMAIL}.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. שמירת מידע{'\n'}</Text>
    • נשמור את נתוניך כל עוד חשבונך פעיל{'\n'}
    • לאחר מחיקת חשבון: מידע אישי יימחק תוך <Text style={styles.bold}>30 יום</Text>{'\n'}
    • גיבויים טכניים עשויים להישמר עד <Text style={styles.bold}>90 יום</Text> נוספים בלבד{'\n'}
    • מידע הנדרש לשמירה על פי חוק (כגון: עסקאות כספיות) יישמר לתקופה הנדרשת בחוק{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. פרטיות ילדים{'\n'}</Text>
    האפליקציה מיועדת להורים ומטפלים בגירים (18+). מידע על ילדים נאסף אך ורק:{'\n'}
    • על ידי הוריהם / אפוטרופוסיהם החוקיים{'\n'}
    • למטרות מעקב בריאות אישי בלבד{'\n'}
    • ללא שיתוף עם גורמים מסחריים{'\n'}
    • ללא פרסום ממוקד הקשור לילדים{'\n\n'}
    אנחנו אינם אוספים מידע ישירות מילדים. אם הגעת למסקנה שילד מתחת לגיל 13 יצר חשבון ללא הסכמת הורה, אנא פנה אלינו ונמחק את הנתונים מיד.{'\n\n'}

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
// Terms of Service Content
// ─────────────────────────────────────────────
const TermsContent = ({ textColor, subtitleColor }: { textColor: string; subtitleColor: string }) => (
  <Text style={[styles.bodyText, { color: textColor }]}>
    <Text style={[styles.updated, { color: subtitleColor }]}>גרסה 1.0 | עדכון אחרון: {LAST_UPDATED}{'\n\n'}</Text>

    <Text style={[styles.section, { color: textColor }]}>1. הסכמה לתנאים{'\n'}</Text>
    בהורדה, התקנה, או שימוש באפליקציית Calmino ("האפליקציה" / "השירות"), הנך מסכים לתנאי שימוש אלה ("התנאים"). אם אינך מסכים, הפסק את השימוש באלתר ומחק את האפליקציה.{'\n'}
    תנאים אלה מהווים הסכם משפטי מחייב בינך לבין Calmino. השימוש באפליקציה מהווה אישור שקראת, הבנת ומסכים לכל התנאים המפורטים להלן.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>2. תיאור השירות{'\n'}</Text>
    Calmino היא אפליקציית מעקב ובריאות לתינוקות וילדים, המאפשרת:{'\n'}
    • מעקב אחר האכלה, שינה, חיתולים, תוספי תזונה וחיסונים{'\n'}
    • מדידת מדדי גדילה ועקומות צמיחה{'\n'}
    • שיתוף נתונים עם בני / בנות משפחה ובייביסיטרים{'\n'}
    • יצירת סטטיסטיקות, דוחות ותובנות{'\n'}
    • תיעוד רגעים קסומים ואבני דרך{'\n'}
    • ניהול תזכורות והתראות מותאמות אישית{'\n'}
    • שירותי איתור בייביסיטרים ותיאום הזמנות{'\n\n'}
    <Text style={styles.bold}>הגיל המינימלי לשימוש: 18.</Text> השירות אינו מיועד לקטינים.{'\n\n'}

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
    • <Text style={styles.bold}>Google Firebase</Text> — אחסון נתונים, אימות, ותשתית{'\n'}
    • <Text style={styles.bold}>Apple</Text> — אימות ו-Push Notifications{'\n'}
    • <Text style={styles.bold}>Expo</Text> — פלטפורמת פיתוח ועדכונים{'\n\n'}
    שימושך בשירותים אלה כפוף גם למדיניות ותנאי השימוש שלהם. Calmino אינה אחראית לזמינות, ביצועים, או שינויים בשירותי צד שלישי.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>8. הגבלת אחריות ואחריות רפואית{'\n'}</Text>
    8.1 השירות מסופק <Text style={styles.bold}>"כפי שהוא" (AS IS)</Text> ו-"כפי שהוא זמין" (AS AVAILABLE) ללא אחריות מכל סוג.{'\n'}
    8.2 <Text style={styles.bold}>האפליקציה אינה מחליפה ייעוץ רפואי מקצועי.</Text> המידע המוצג הוא לצרכי תיעוד ומעקב בלבד. תמיד התייעץ עם רופא ילדים מוסמך בכל שאלה רפואית.{'\n'}
    8.3 Calmino אינה נושאת באחריות לנזקים ישירים, עקיפים, נסיבתיים, מיוחדים, עונשיים, או תוצאתיים הנובעים מ: שימוש או אי-יכולת לשתמש בשירות; אובדן נתונים; הסתמכות על מידע מהאפליקציה; או כשל טכני.{'\n'}
    8.4 אחריותנו הכוללת לא תעלה על הסכום שאתה שילמת בשנת הרישום האחרונה, או 200 ₪ — הנמוך מביניהם.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>9. קניין רוחני{'\n'}</Text>
    כל הזכויות באפליקציה — לרבות קוד מקור, עיצוב, ממשק משתמש, לוגו, שם "Calmino", וכל תוכן שיצרנו — הינן קניינה הבלעדי של Calmino ומוגנות בחוק זכויות יוצרים, סימני מסחר ופטנטים.{'\n'}
    חל איסור מוחלט על: שכפול, הפצה, שינוי, יצירת נגזרות, הצגה ציבורית, או שימוש מסחרי — ללא אישור מפורש בכתב. הפרה תוביל לתביעה אזרחית ו/או פלילית.{'\n\n'}

    <Text style={[styles.section, { color: textColor }]}>10. ביטול חשבון והשעיה{'\n'}</Text>
    שמורה לנו הזכות להשעות או לסגור חשבון שהפר את התנאים, עם הודעה מוקדמת במידת האפשר. בסגירה מרצון: תוכל לייצא את נתוניך תוך 30 יום לפני המחיקה הסופית.{'\n\n'}

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
// Main Modal Component
// ─────────────────────────────────────────────
export default function LegalModal({ visible, type, onClose }: LegalModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const title = type === 'privacy' ? 'מדיניות פרטיות' : 'תנאי שימוש';

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
            {type === 'privacy' ? (
              <PrivacyContent textColor={theme.textPrimary} subtitleColor={theme.textSecondary} />
            ) : (
              <TermsContent textColor={theme.textPrimary} subtitleColor={theme.textSecondary} />
            )}
          </ScrollView>

          {/* Close button at bottom */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>סגור</Text>
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
