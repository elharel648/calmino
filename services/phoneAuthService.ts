// services/phoneAuthService.ts - Phone Authentication Service using Firebase
import { auth } from './firebaseConfig';
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { logger } from '../utils/logger';
import { Platform } from 'react-native';

// Format Israeli phone number to international format
export const formatPhoneForFirebase = (phone: string): string => {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with +972
    if (cleaned.startsWith('0')) {
        cleaned = '+972' + cleaned.substring(1);
    } else if (!cleaned.startsWith('972')) {
        cleaned = '+972' + cleaned;
    } else {
        cleaned = '+' + cleaned;
    }
    
    return cleaned;
};

// Validate Israeli phone number format
export const validateIsraeliPhone = (phone: string): { valid: boolean; message?: string } => {
    const cleaned = phone.replace(/\D/g, '');
    
    // Israeli mobile numbers: 05X-XXXXXXX (10 digits starting with 05)
    if (cleaned.length < 9 || cleaned.length > 10) {
        return { valid: false, message: 'מספר טלפון חייב להיות 9-10 ספרות' };
    }
    
    if (!cleaned.startsWith('05') && !cleaned.startsWith('5')) {
        return { valid: false, message: 'מספר טלפון ישראלי חייב להתחיל ב-05' };
    }
    
    // Normalize to 10 digits
    const normalized = cleaned.startsWith('0') ? cleaned : '0' + cleaned;
    if (normalized.length !== 10) {
        return { valid: false, message: 'מספר טלפון לא תקין' };
    }
    
    return { valid: true };
};

// Initialize reCAPTCHA verifier (for web/testing)
let recaptchaVerifier: RecaptchaVerifier | null = null;

export const initializeRecaptcha = (containerId: string = 'recaptcha-container'): RecaptchaVerifier | null => {
    if (Platform.OS === 'web') {
        try {
            recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
                size: 'invisible',
                callback: () => {
                    logger.debug('✅ reCAPTCHA verified');
                },
                'expired-callback': () => {
                    logger.warn('⚠️ reCAPTCHA expired');
                },
            });
            return recaptchaVerifier;
        } catch (error) {
            logger.error('Failed to initialize reCAPTCHA:', error);
            return null;
        }
    }
    // On native, Firebase handles reCAPTCHA automatically
    return null;
};

// Send SMS verification code
export const sendVerificationCode = async (
    phoneNumber: string,
    recaptchaVerifier?: RecaptchaVerifier | null
): Promise<{ success: boolean; confirmation?: any; error?: string }> => {
    try {
        const formattedPhone = formatPhoneForFirebase(phoneNumber);
        logger.debug('📱 Sending SMS to:', formattedPhone);
        
        // On native platforms (iOS/Android), Firebase handles reCAPTCHA automatically
        // On web, we need to initialize and pass the verifier
        let verifier: RecaptchaVerifier | undefined = undefined;
        
        if (Platform.OS === 'web') {
            // For web, we need reCAPTCHA verifier
            if (!recaptchaVerifier) {
                // Try to initialize if not provided
                verifier = initializeRecaptcha('recaptcha-container') || undefined;
            } else {
                verifier = recaptchaVerifier;
            }
            
            if (!verifier) {
                return { 
                    success: false, 
                    error: 'reCAPTCHA לא זמין. יש להפעיל Phone Authentication ב-Firebase Console' 
                };
            }
        }
        
        const confirmation = await signInWithPhoneNumber(
            auth,
            formattedPhone,
            verifier
        );
        
        logger.debug('✅ SMS sent successfully');
        return { success: true, confirmation };
    } catch (error: any) {
        logger.error('❌ Failed to send SMS:', error);
        
        let errorMessage = 'שגיאה בשליחת SMS';
        switch (error.code) {
            case 'auth/invalid-phone-number':
                errorMessage = 'מספר טלפון לא תקין';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'יותר מדי בקשות. נסה שוב מאוחר יותר';
                break;
            case 'auth/quota-exceeded':
                errorMessage = 'מכסת SMS הושלמה. נסה שוב מחר';
                break;
            case 'auth/captcha-check-failed':
                errorMessage = 'אימות reCAPTCHA נכשל. נסה שוב';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Phone Authentication לא מופעל ב-Firebase Console. יש להפעיל את השירות';
                break;
        }
        
        return { success: false, error: errorMessage };
    }
};

// Verify SMS code
export const verifyCode = async (
    confirmation: any,
    code: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
        const result = await confirmation.confirm(code);
        logger.debug('✅ Phone verified successfully');
        return { success: true, user: result.user };
    } catch (error: any) {
        logger.error('❌ Failed to verify code:', error);
        
        let errorMessage = 'קוד אימות שגוי';
        switch (error.code) {
            case 'auth/invalid-verification-code':
                errorMessage = 'קוד אימות שגוי. נסה שוב';
                break;
            case 'auth/code-expired':
                errorMessage = 'קוד אימות פג תוקף. בקש קוד חדש';
                break;
            case 'auth/session-expired':
                errorMessage = 'פג תוקף. התחל מחדש';
                break;
        }
        
        return { success: false, error: errorMessage };
    }
};

// Cleanup reCAPTCHA
export const cleanupRecaptcha = () => {
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
            recaptchaVerifier = null;
        } catch (error) {
            logger.warn('Failed to cleanup reCAPTCHA:', error);
        }
    }
};
