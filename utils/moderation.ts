/**
 * Content Moderation Utility
 * Filters inappropriate words and phrases
 */

// List of inappropriate words/phrases (Hebrew and English)
const BAD_WORDS = [
    // Hebrew inappropriate words
    'זונה', 'כלבה', 'מטומטם', 'אידיוט', 'מפגר', 'דפוק', 'משוגע',
    // English inappropriate words
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'idiot', 'stupid',
    // Common spam/phishing patterns
    'click here', 'free money', 'winner', 'prize',
];

// Negative sentiment words/phrases (Hebrew and English)
const NEGATIVE_WORDS = [
    // Hebrew negative words
    'לא אהבתי', 'לא מומלץ', 'גרוע', 'רע', 'נורא', 'איום', 'פחדתי', 'לא בטוח',
    'לא נקי', 'מלוכלך', 'לא מקצועי', 'לא אמין', 'לא הגיע', 'איחר', 'ביטל',
    'לא עבד', 'לא טוב', 'לא מומלץ', 'לא ממליץ', 'זהירות', 'לא לקחת',
    // English negative words
    'not good', 'bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointed',
    'not recommended', 'do not', "don't", 'avoid', 'warning', 'unsafe', 'dirty',
    'unprofessional', 'unreliable', 'late', 'canceled', 'did not show',
];

/**
 * Check if text contains inappropriate content
 */
export function containsInappropriateContent(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check against bad words list
    for (const word of BAD_WORDS) {
        if (lowerText.includes(word.toLowerCase())) {
            return true;
        }
    }
    
    // Check for excessive caps (spam indicator)
    const capsRatio = (text.match(/[A-Zא-ת]/g) || []).length / text.length;
    if (capsRatio > 0.7 && text.length > 20) {
        return true;
    }
    
    // Check for excessive special characters (spam indicator)
    const specialCharRatio = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length / text.length;
    if (specialCharRatio > 0.3) {
        return true;
    }
    
    return false;
}

/**
 * Check if text has negative sentiment (for reviews)
 * Returns true if text appears to be negative despite positive rating
 */
export function hasNegativeSentiment(text: string): boolean {
    const lowerText = text.toLowerCase();
    let negativeCount = 0;
    
    // Count negative words/phrases
    for (const word of NEGATIVE_WORDS) {
        if (lowerText.includes(word.toLowerCase())) {
            negativeCount++;
        }
    }
    
    // If more than 1 negative word/phrase, likely negative review
    if (negativeCount >= 2) {
        return true;
    }
    
    // Check for negative patterns
    const negativePatterns = [
        /לא\s+(מומלץ|ממליץ|אהבתי|טוב|עובד|בטוח)/,
        /(גרוע|רע|נורא|איום|פחדתי)/,
        /(do not|don't|avoid|warning|unsafe)/i,
    ];
    
    for (const pattern of negativePatterns) {
        if (pattern.test(text)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Sanitize text - remove inappropriate content
 */
export function sanitizeText(text: string): string {
    let sanitized = text;
    
    // Remove bad words
    for (const word of BAD_WORDS) {
        const regex = new RegExp(word, 'gi');
        sanitized = sanitized.replace(regex, '***');
    }
    
    return sanitized.trim();
}
