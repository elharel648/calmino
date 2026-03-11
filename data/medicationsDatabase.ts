/**
 * Comprehensive Children's Medication Database
 * מאגר תרופות ילדים מקיף עם autocomplete ומידע מינון
 * 
 * DISCLAIMER: מידע כללי בלבד. יש להתייעץ עם רופא לפני מתן כל תרופה.
 */

export interface MedicationInfo {
    name: string;           // שם התרופה
    nameEn?: string;        // English name
    category: MedCategory;
    commonDosage?: string;  // מינון נפוץ (מידע כללי)
    form?: string;          // צורת התרופה: סירופ, טיפות, כדור, וכו'
    notes?: string;         // הערות כלליות
}

export type MedCategory =
    | 'pain_fever'       // כאב וחום
    | 'antibiotics'      // אנטיביוטיקה
    | 'allergy'          // אלרגיה
    | 'respiratory'      // נשימה ושיעול
    | 'digestive'        // עיכול
    | 'vitamins'         // ויטמינים ותוספים
    | 'skin'             // עור
    | 'eye_ear'          // עיניים ואוזניים
    | 'other';           // אחר

export const CATEGORY_LABELS: Record<MedCategory, string> = {
    pain_fever: '💊 כאב וחום',
    antibiotics: '💉 אנטיביוטיקה',
    allergy: '🤧 אלרגיה',
    respiratory: '🫁 נשימה ושיעול',
    digestive: '🍼 עיכול',
    vitamins: '💛 ויטמינים ותוספים',
    skin: '🧴 עור',
    eye_ear: '👁️ עיניים ואוזניים',
    other: '📦 אחר',
};

// ══════════════════════════════════════════════════════════════════════════════
// MEDICATIONS DATABASE
// ══════════════════════════════════════════════════════════════════════════════

export const MEDICATIONS_DB: MedicationInfo[] = [
    // ── כאב וחום ──────────────────────────────────────────────────────────────
    { name: 'אקמול', nameEn: 'Acamol', category: 'pain_fever', commonDosage: '10-15 מ"ג/ק"ג כל 4-6 שעות', form: 'סירופ / כדור / פתילה', notes: 'פרצטמול (Paracetamol)' },
    { name: 'אקמולי', nameEn: 'Acamoli', category: 'pain_fever', commonDosage: '10-15 מ"ג/ק"ג כל 4-6 שעות', form: 'סירופ / טיפות', notes: 'פרצטמול לתינוקות' },
    { name: 'דקסמול', nameEn: 'Dexamol', category: 'pain_fever', commonDosage: '10-15 מ"ג/ק"ג כל 4-6 שעות', form: 'סירופ / כדור', notes: 'פרצטמול' },
    { name: 'נורופן', nameEn: 'Nurofen', category: 'pain_fever', commonDosage: '5-10 מ"ג/ק"ג כל 6-8 שעות', form: 'סירופ / כדור', notes: 'איבופרופן. מגיל 3 חודשים' },
    { name: 'אדוויל', nameEn: 'Advil', category: 'pain_fever', commonDosage: '5-10 מ"ג/ק"ג כל 6-8 שעות', form: 'סירופ', notes: 'איבופרופן' },
    { name: 'פנדול', nameEn: 'Panadol', category: 'pain_fever', commonDosage: '10-15 מ"ג/ק"ג כל 4-6 שעות', form: 'סירופ / כדור', notes: 'פרצטמול' },
    { name: 'אופטלגין', nameEn: 'Optalgin', category: 'pain_fever', commonDosage: 'לפי הוראת רופא', form: 'טיפות / סירופ', notes: 'דיפירון (Dipyrone). מגיל 3 חודשים' },
    { name: 'מיניפן', nameEn: 'Minifen', category: 'pain_fever', commonDosage: '5-10 מ"ג/ק"ג כל 6-8 שעות', form: 'סירופ', notes: 'איבופרופן לילדים' },
    { name: 'נובימול', nameEn: 'Novimol', category: 'pain_fever', commonDosage: '10-15 מ"ג/ק"ג כל 4-6 שעות', form: 'סירופ / כדור / פתילה', notes: 'פרצטמול (Paracetamol)' },

    // ── אנטיביוטיקה ────────────────────────────────────────────────────────────
    { name: 'אוגמנטין', nameEn: 'Augmentin', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ / כדור', notes: 'אמוקסיצילין + חומצה קלבולנית' },
    { name: 'מוקסיפן', nameEn: 'Moxypen', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'אמוקסיצילין' },
    { name: 'אמוקסיצילין', nameEn: 'Amoxicillin', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'פניצילין רחב טווח' },
    { name: 'צפלקס', nameEn: 'Cephalex', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'צפלוספורין דור 1' },
    { name: 'זיתרומקס', nameEn: 'Zithromax', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ / כדור', notes: 'אזיתרומיצין' },
    { name: 'אזניל', nameEn: 'Azanil', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'אזיתרומיצין' },
    { name: 'רספרים', nameEn: 'Resprim', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'טרימתופרים + סולפמתוקסזול' },
    { name: 'פוסידין', nameEn: 'Fucidin', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'משחה', notes: 'חומצה פוסידית - לזיהומי עור' },
    { name: 'צפזין', nameEn: 'Cefzin', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'צפורוקסים' },
    { name: 'קלצף', nameEn: 'Klacef', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'צפקלור' },
    { name: 'סופרקס', nameEn: 'Suprax', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'צפיקסים' },

    // ── אלרגיה ──────────────────────────────────────────────────────────────────
    { name: 'פנסטיל', nameEn: 'Fenistil', category: 'allergy', commonDosage: 'לפי גיל ומשקל', form: 'טיפות / ג\'ל', notes: 'דימתינדן. מגיל חודש' },
    { name: 'טלפסט', nameEn: 'Telfast', category: 'allergy', commonDosage: 'לפי גיל', form: 'סירופ / כדור', notes: 'פקסופנדין' },
    { name: 'דספרין', nameEn: 'Deslorin', category: 'allergy', commonDosage: 'לפי גיל', form: 'סירופ', notes: 'דסלורטדין. מגיל 6 חודשים' },
    { name: 'אריוס', nameEn: 'Aerius', category: 'allergy', commonDosage: 'לפי גיל', form: 'סירופ', notes: 'דסלורטדין' },
    { name: 'לורטדין', nameEn: 'Loratadine', category: 'allergy', commonDosage: 'לפי גיל', form: 'סירופ / כדור', notes: 'אנטיהיסטמין. מגיל שנתיים' },
    { name: 'זירטק', nameEn: 'Zyrtec', category: 'allergy', commonDosage: 'לפי גיל', form: 'טיפות / סירופ', notes: 'צטיריזין. מגיל 6 חודשים' },
    { name: 'צטיריזין', nameEn: 'Cetirizine', category: 'allergy', commonDosage: 'לפי גיל', form: 'סירופ / טיפות', notes: 'אנטיהיסטמין' },
    { name: 'סינגולייר', nameEn: 'Singulair', category: 'allergy', commonDosage: 'לפי גיל', form: 'גרנולות / כדור', notes: 'מונטלוקסט. למניעת אסתמה ואלרגיה' },

    // ── נשימה ושיעול ────────────────────────────────────────────────────────────
    { name: 'ונטולין', nameEn: 'Ventolin', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'תרסיס / נוזל לאינהלציה', notes: 'סלבוטמול - מרחיב סמפונות' },
    { name: 'בריקניל', nameEn: 'Bricanyl', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'תרסיס / סירופ', notes: 'טרבוטלין' },
    { name: 'פלמיקורט', nameEn: 'Pulmicort', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'נוזל לאינהלציה', notes: 'בודזוניד - סטרואיד בשאיפה' },
    { name: 'פלוטיקזון', nameEn: 'Flutocasone', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'תרסיס', notes: 'סטרואיד בשאיפה' },
    { name: 'סטרואיד בשאיפה', nameEn: 'Inhaled Steroid', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'תרסיס / נוזל', notes: 'למניעת אסתמה' },
    { name: 'מוקוליט', nameEn: 'Mucolit', category: 'respiratory', commonDosage: 'לפי גיל', form: 'סירופ', notes: 'קרבוציסטאין - מדלל ליחה' },
    { name: 'דקסטרומתורפן', nameEn: 'Dextromethorphan', category: 'respiratory', commonDosage: 'לפי גיל. מגיל 6', form: 'סירופ', notes: 'מדכא שיעול' },
    { name: 'אטרוונט', nameEn: 'Atrovent', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'נוזל לאינהלציה', notes: 'איפרטרופיום - מרחיב סמפונות' },
    { name: 'תמי פלו', nameEn: 'Tamiflu', category: 'respiratory', commonDosage: 'לפי הוראת רופא', form: 'סירופ / כמוסות', notes: 'אוסלטמיביר - נגד שפעת' },
    { name: 'סינופרקס', nameEn: 'Sinuprex', category: 'respiratory', commonDosage: 'לפי גיל', form: 'סירופ', notes: 'לגודש באף' },
    { name: 'אוטריוין', nameEn: 'Otrivin', category: 'respiratory', commonDosage: 'עד 3 ימים', form: 'טיפות / תרסיס לאף', notes: 'קסילומטזולין - מכווץ אף' },
    { name: 'מי מלח לאף', nameEn: 'Saline Nasal', category: 'respiratory', commonDosage: 'ללא הגבלה', form: 'טיפות / תרסיס', notes: 'לשטיפת אף. בטוח מגיל לידה' },
    { name: 'סטרימר', nameEn: 'Sterimar', category: 'respiratory', commonDosage: 'ללא הגבלה', form: 'תרסיס לאף', notes: 'מי ים לשטיפת אף' },

    // ── עיכול ──────────────────────────────────────────────────────────────────
    { name: 'סימיקול', nameEn: 'Simicol', category: 'digestive', commonDosage: 'לפי הוראות', form: 'טיפות', notes: 'סימתיקון - נגד גזים' },
    { name: 'אינפקול', nameEn: 'Infacol', category: 'digestive', commonDosage: 'לפי הוראות', form: 'טיפות', notes: 'סימתיקון - נגד גזים. מגיל לידה' },
    { name: 'דנטינוקס', nameEn: 'Dentinox', category: 'digestive', commonDosage: 'לפני/אחרי ארוחה', form: 'טיפות', notes: 'נגד גזים' },
    { name: 'פרוביוטיקה', nameEn: 'Probiotics', category: 'digestive', commonDosage: 'לפי הוראות', form: 'טיפות / אבקה / כמוסות', notes: 'חיידקים ידידותיים' },
    { name: 'ביוגאיה', nameEn: 'BioGaia', category: 'digestive', commonDosage: '5 טיפות ביום', form: 'טיפות', notes: 'פרוביוטיקה לתינוקות' },
    { name: 'אימודיום', nameEn: 'Imodium', category: 'digestive', commonDosage: 'לפי גיל. מגיל 6', form: 'כדור / סירופ', notes: 'לופרמיד - נגד שלשול' },
    { name: 'הידרן', nameEn: 'Hydran', category: 'digestive', commonDosage: 'לפי הוראות', form: 'אבקה להמסה', notes: 'מלחים להתייבשות' },
    { name: 'מינרלי', nameEn: 'Minerali', category: 'digestive', commonDosage: 'לפי הוראות', form: 'אבקה / שקיות', notes: 'מלחים להתייבשות (ORS)' },

    // ── ויטמינים ותוספים ─────────────────────────────────────────────────────
    { name: 'ויטמין D', nameEn: 'Vitamin D', category: 'vitamins', commonDosage: '400 יח\' ביום', form: 'טיפות', notes: 'חובה מגיל לידה עד גיל שנתיים' },
    { name: 'טיפטיפות ויטמין D', nameEn: 'Tiptipot Vitamin D', category: 'vitamins', commonDosage: '400 יח\' ביום', form: 'טיפות', notes: 'ויטמין D מפוקח' },
    { name: 'ברזל', nameEn: 'Iron', category: 'vitamins', commonDosage: 'לפי הוראת רופא', form: 'טיפות / סירופ', notes: 'פרופר / סורביפר' },
    { name: 'פרופר', nameEn: 'Ferrofer', category: 'vitamins', commonDosage: 'לפי הוראת רופא', form: 'טיפות', notes: 'ברזל לתינוקות' },
    { name: 'ויטמין C', nameEn: 'Vitamin C', category: 'vitamins', commonDosage: 'לפי גיל', form: 'טיפות / סוכריות / כדור', notes: 'חומצה אסקורבית' },
    { name: 'מולטיויטמין', nameEn: 'Multivitamin', category: 'vitamins', commonDosage: 'לפי גיל', form: 'טיפות / סירופ / גומי', notes: 'ויטמינים משולבים' },
    { name: 'סנסטיבי', nameEn: 'Sensivi', category: 'vitamins', commonDosage: 'לפי הוראות', form: 'טיפות', notes: 'ויטמין D + DHA' },
    { name: 'אומגה 3', nameEn: 'Omega 3', category: 'vitamins', commonDosage: 'לפי גיל', form: 'כמוסות / סירופ', notes: 'DHA + EPA לפיתוח המוח' },
    { name: 'חלב אם/תמ"ל', nameEn: 'Formula', category: 'vitamins', commonDosage: 'לפי הוראות', form: 'נוזל / אבקה', notes: 'תחליף חלב אם' },

    // ── עור ──────────────────────────────────────────────────────────────────
    { name: 'סודוקרם', nameEn: 'Sudocrem', category: 'skin', commonDosage: 'למריחה מקומית', form: 'משחה', notes: 'נגד פריחת חיתול' },
    { name: 'דסיטין', nameEn: 'Desitin', category: 'skin', commonDosage: 'למריחה מקומית', form: 'משחה', notes: 'תחמוצת אבץ - נגד פריחת חיתול' },
    { name: 'אלוורה ג\'ל', nameEn: 'Aloe Vera Gel', category: 'skin', commonDosage: 'למריחה מקומית', form: 'ג\'ל', notes: 'להרגעת עור' },
    { name: 'קלמין', nameEn: 'Calamine', category: 'skin', commonDosage: 'למריחה מקומית', form: 'תחליב', notes: 'נגד גרד וכוויות' },
    { name: 'מיקונזול', nameEn: 'Miconazole', category: 'skin', commonDosage: 'למריחה מקומית', form: 'משחה', notes: 'נגד פטריות עור' },
    { name: 'הידרוקורטיזון', nameEn: 'Hydrocortisone', category: 'skin', commonDosage: 'לפי הוראת רופא', form: 'משחה', notes: 'סטרואיד מקומי - נגד דלקת עור' },
    { name: 'אלידל', nameEn: 'Elidel', category: 'skin', commonDosage: 'לפי הוראת רופא', form: 'משחה', notes: 'פימקרולימוס - אטופיק דרמטיטיס' },
    { name: 'אוקסיד אבץ', nameEn: 'Zinc Oxide', category: 'skin', commonDosage: 'למריחה מקומית', form: 'משחה', notes: 'הגנה על העור' },

    // ── עיניים ואוזניים ──────────────────────────────────────────────────────
    { name: 'טוברקס', nameEn: 'Tobrex', category: 'eye_ear', commonDosage: 'לפי הוראת רופא', form: 'טיפות עיניים', notes: 'טוברמיצין - אנטיביוטיקה לעיניים' },
    { name: 'כלורמפניקול', nameEn: 'Chloramphenicol', category: 'eye_ear', commonDosage: 'לפי הוראת רופא', form: 'טיפות / משחת עיניים', notes: 'אנטיביוטיקה לעיניים' },
    { name: 'אוטיפקס', nameEn: 'Otipax', category: 'eye_ear', commonDosage: 'לפי הוראת רופא', form: 'טיפות אוזניים', notes: 'נגד כאבי אוזניים' },
    { name: 'דקסוטיק', nameEn: 'Dexotic', category: 'eye_ear', commonDosage: 'לפי הוראת רופא', form: 'טיפות אוזניים', notes: 'אנטיביוטיקה + סטרואיד לאוזניים' },
    { name: 'פוסיטלמיק', nameEn: 'Fucithalmic', category: 'eye_ear', commonDosage: 'לפי הוראת רופא', form: 'ג\'ל עיניים', notes: 'חומצה פוסידית - לדלקת עיניים' },

    // ── אחר ──────────────────────────────────────────────────────────────────
    { name: 'דנטג\'ל', nameEn: "Dentgel", category: 'other', commonDosage: 'למריחה מקומית', form: 'ג\'ל', notes: 'להקלה בבקיעת שיניים' },
    { name: 'קמומיל תינוקות', nameEn: 'Chamomile Baby', category: 'other', commonDosage: 'לפי הוראות', form: 'טיפות / תה', notes: 'להרגעה ועיכול' },
    { name: 'גריפ ווטר', nameEn: 'Gripe Water', category: 'other', commonDosage: 'לפי הוראות', form: 'נוזל', notes: 'נגד גזים וכאבי בטן' },
    { name: 'לקטייז', nameEn: 'Lactase', category: 'other', commonDosage: 'לפי הוראות', form: 'טיפות', notes: 'אנזים לקטאז - לאי סבילות ללקטוז' },
    { name: 'ויגמוקס', nameEn: 'Vigamox', category: 'eye_ear', commonDosage: 'לפי הוראת רופא', form: 'טיפות עיניים', notes: 'מוקסיפלוקסצין - אנטיביוטיקה' },
    { name: 'פלגיל', nameEn: 'Flagyl', category: 'antibiotics', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'מטרונידזול - נגד טפילים וחיידקים' },
    { name: 'קונבולקס', nameEn: 'Convulex', category: 'other', commonDosage: 'לפי הוראת רופא', form: 'סירופ', notes: 'ולפרואט - נגד פרכוסים' },
    { name: 'דיאזפאם', nameEn: 'Diazepam', category: 'other', commonDosage: 'לפי הוראת רופא', form: 'פתילה', notes: 'לפרכוסי חום' },
];

/**
 * Search medications by name (Hebrew or English)
 * Returns matching medications sorted by relevance
 */
export const searchMedications = (query: string): MedicationInfo[] => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase().trim();

    return MEDICATIONS_DB
        .filter(med =>
            med.name.includes(q) ||
            (med.nameEn && med.nameEn.toLowerCase().includes(q)) ||
            (med.notes && med.notes.includes(q))
        )
        .sort((a, b) => {
            // Exact start match first
            const aStartsHe = a.name.startsWith(q) ? 0 : 1;
            const bStartsHe = b.name.startsWith(q) ? 0 : 1;
            if (aStartsHe !== bStartsHe) return aStartsHe - bStartsHe;

            // Then by English name start match
            const aStartsEn = a.nameEn?.toLowerCase().startsWith(q) ? 0 : 1;
            const bStartsEn = b.nameEn?.toLowerCase().startsWith(q) ? 0 : 1;
            return aStartsEn - bStartsEn;
        })
        .slice(0, 10); // Max 10 results
};

/**
 * Get medications by category
 */
export const getMedicationsByCategory = (category: MedCategory): MedicationInfo[] => {
    return MEDICATIONS_DB.filter(med => med.category === category);
};
