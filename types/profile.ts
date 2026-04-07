/**
 * Types for ProfileScreen and related components
 */

export interface GrowthStats {
    weight?: string;
    height?: string;
    headCircumference?: string;
}

// New: Growth measurement with full history
export interface GrowthMeasurement {
    id: string;
    date: any; // Firebase Timestamp
    weight?: number; // kg
    height?: number; // cm
    headCircumference?: number; // cm
    note?: string;
}

export interface Milestone {
    title: string;
    date: any; // Firebase Timestamp
}

// New: Categorized milestones for developmental tracking
export type MilestoneCategory = 'motor' | 'communication' | 'cognitive' | 'social' | 'other';

export interface CategorizedMilestone {
    id: string;
    category: MilestoneCategory;
    title: string;
    achievedDate?: any; // Firebase Timestamp
    expectedAgeMonths?: number;
    isAchieved: boolean;
    note?: string;
}

export interface CustomVaccine {
    id: string;
    name: string;
    isDone?: boolean;
    date?: string;
}

// New: Photo gallery entry
export interface PhotoEntry {
    id: string;
    url: string; // base64 or storage URL
    date: any; // Firebase Timestamp
    caption?: string;
}

export interface BabyProfileData {
    id: string;
    name: string;
    birthDate: any; // Firebase Timestamp
    gender: 'boy' | 'girl' | 'other';
    parentId: string;
    photoUrl?: string;
    stats?: GrowthStats;
    growthHistory?: GrowthMeasurement[]; // New
    album?: { [month: number]: string };
    photoGallery?: PhotoEntry[]; // New
    milestones?: Milestone[];
    categorizedMilestones?: CategorizedMilestone[]; // New
    vaccines?: { [key: string]: boolean | { isDone: boolean; date: any } };
    customVaccines?: CustomVaccine[];
}

export interface VaccineItem {
    key: string;
    name: string;
    description?: string;
}

export interface VaccineGroup {
    ageTitle: string;
    vaccines: VaccineItem[];
}

// Vaccine schedule from Ministry of Health (Israel) — Full protocol
export const VACCINE_SCHEDULE: VaccineGroup[] = [
    { ageTitle: 'לאחר הלידה', vaccines: [
        { key: 'hepB_1', name: 'צהבת B (מנה 1)', description: 'חיסון נגד דלקת כבד נגיפית B. ניתן בבית החולים בתוך 24 שעות מהלידה מונע הדבקה ומחלת כבד כרונית.' },
    ]},
    { ageTitle: 'גיל חודש', vaccines: [
        { key: 'hepB_2', name: 'צהבת B (מנה 2)', description: 'מנת חיזוק נגד צהבת B. מונעת סיבוכים ודלקת כבד זיהומית למשך כל החיים.' },
    ]},
    { ageTitle: 'גיל חודשיים', vaccines: [
        { key: 'm5_1', name: 'מחומשת (מנה 1)', description: 'חיסון משולב במנה אחת הניתן בזריקה נגד דיפטריה (אסכרה), טטנוס (פלצת), שעלת, המופילוס אינפלואנזה B ופוליו.' },
        { key: 'prevnar_1', name: 'פרבנר (מנה 1)', description: 'חיסון נגד חיידק הפנאומוקוק הגורם לדלקות אזניים חמורות, דלקת קרום המוח ודלקת ריאות.' },
        { key: 'rota_1', name: 'רוטה (מנה 1)', description: 'חיסון פומי (טיפות לפה) נגד נגיף הרוטה - הגורם המרכזי לשלשולים חריפים, הקאות והתייבשות בפעוטות.' },
    ]},
    { ageTitle: 'גיל 4 חודשים', vaccines: [
        { key: 'm5_2', name: 'מחומשת (מנה 2)', description: 'מנה שנייה של החיסון המחומש.' },
        { key: 'prevnar_2', name: 'פרבנר (מנה 2)', description: 'מנה שנייה של חיסון הפנאומוקוק למתן הגנה מיטבית.' },
        { key: 'rota_2', name: 'רוטה (מנה 2)', description: 'מנה שנייה של טיפות נגד נגיף הרוטה.' },
    ]},
    { ageTitle: 'גיל 6 חודשים', vaccines: [
        { key: 'm5_3', name: 'מחומשת (מנה 3)', description: 'מנה שלישית של החיסון המחומש בסדרת הילדות.' },
        { key: 'hepB_3', name: 'צהבת B (מנה 3)', description: 'מנה שלישית ואחרונה של סדרת צהבת נגיפית B.' },
        { key: 'rota_3', name: 'רוטה (מנה 3)', description: 'מנה שלישית ואחרונה של חיסון הרוטה. תופעת לוואי שכיחה: חסר שקט.' },
    ]},
    { ageTitle: 'גיל שנה', vaccines: [
        { key: 'mmrv_1', name: 'MMRV (מנה 1)', description: 'חיסון משולב הניתן בזריקה אחת נגד חצבת, חזרת, אדמת ואבעבועות רוח. פריחה קלה או חום עלולים להופיע 7-12 ימים לאחר החיסון.' },
        { key: 'prevnar_3', name: 'פרבנר (מנה 3)', description: 'מנת חיזוק מונעת (בוסטר) של חיסון הפנאומוקוק לשמירת על הגנה ארוכת טווח.' },
    ]},
    { ageTitle: 'גיל שנה וחצי', vaccines: [
        { key: 'm5_4', name: 'מחומשת (מנה 4)', description: 'מנת חיזוק (בוסטר) נגד דיפטריה, טטנוס, שעלת, פוליו והמופילוס.' },
        { key: 'hepA_1', name: 'צהבת A (מנה 1)', description: 'חיסון נגד Hepatitis A התוקף את הכבד. מחלה נפוצה בישראל שתסמיניה כוללים: חום, כאב ראש, בחילות והופעת צהבת.' },
    ]},
    { ageTitle: 'גיל שנתיים', vaccines: [
        { key: 'hepA_2', name: 'צהבת A (מנה 2)', description: 'מנה שנייה ואחרונה של צהבת A כדי להעניק חסינות לכל החיים ולמנוע את הרס הכבד הפוטנציאלי מהנגיף.' },
    ]},
    { ageTitle: 'כיתה ב\'', vaccines: [
        { key: 'dtap_ipv_5', name: 'DTaP-IPV (מנה 5)', description: 'חיסון "מרובעת" הניתן בבית הספר כמנת חיזוק נגד דיפטריה, טטנוס, שעלת ופוליו.' },
        { key: 'mmr_2', name: 'MMRV (מנה 2)', description: 'מנה שנייה נגד חצבת, חזרת, אדמת ואבעבועות רוח הניתנת בבית הספר.' },
    ]},
    { ageTitle: 'כיתה ח\'', vaccines: [
        { key: 'tdap', name: 'Tdap', description: 'מנת חיזוק נגד דדפת (דיפטריה), פלצת (טטנוס) ושעלת המותאמת לבני נוער ולמבוגרים.' },
        { key: 'hpv_1', name: 'HPV (מנה 1)', description: 'חיסון הניתן בכיתה ח\' נגד נגיף הפפילומה האנושי (HPV). מונע התפתחות סרטן צוואר הרחם, סרטן פי הטבעת, ויבלות באברי המין.' },
        { key: 'hpv_2', name: 'HPV (מנה 2)', description: 'מנה שנייה של חיסון הפפילומה - ניתנת חצי שנה לאחר קבלת המנה הראשונה בבית הספר.' },
    ]},
];

export interface EditMetricState {
    type: 'weight' | 'height' | 'head';
    value: string;
    title: string;
    unit: string;
}

// Milestone icon config helper
export interface MilestoneConfig {
    icon: any;
    color: [string, string];
    bg: string;
}
