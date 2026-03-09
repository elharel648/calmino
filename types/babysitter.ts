/**
 * Babysitter System Types
 * טיפוסים למערכת בייביסיטרים
 */

import { Timestamp } from 'firebase/firestore';

// ===================
// BABYSITTER PROFILE
// ===================

export type AgeRange = '0-1' | '1-3' | '3-6' | '6+';
export type Certification = 'cpr' | 'first_aid' | 'education' | 'nursing' | 'special_needs';

export interface BabysitterProfile {
    isActive: boolean;
    hourlyRate: number;
    ageRanges: AgeRange[];
    radius: number; // km
    bio: string;
    certifications: Certification[];
    responseTimeMinutes: number; // average
    completedShifts: number;
    repeatFamilies: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ===================
// AVAILABILITY SYSTEM
// ===================

export interface DayAvailability {
    available: boolean;
    start: string; // "09:00"
    end: string;   // "18:00"
}

export type ExceptionType = 'unavailable' | 'custom';

export interface AvailabilityException {
    id: string; // unique ID for this exception
    date: string; // "2026-02-15" (YYYY-MM-DD format)
    type: ExceptionType;
    start?: string; // for 'custom' type: "10:00"
    end?: string;   // for 'custom' type: "16:00"
    reason?: string; // "רופא", "אירוע משפחתי"
    createdAt: Timestamp;
}

export interface Vacation {
    id: string; // unique ID for this vacation
    startDate: string; // "2026-02-22" (YYYY-MM-DD)
    endDate: string;   // "2026-02-28" (YYYY-MM-DD)
    reason?: string; // "חופשה בחו\"ל", "אירוע משפחתי"
    createdAt: Timestamp;
}

export interface SitterAvailability {
    // Weekly default pattern
    weeklyPattern: {
        sunday: DayAvailability | null;
        monday: DayAvailability | null;
        tuesday: DayAvailability | null;
        wednesday: DayAvailability | null;
        thursday: DayAvailability | null;
        friday: DayAvailability | null;
        saturday: DayAvailability | null;
    };

    // Date-specific exceptions
    exceptions: AvailabilityException[];

    // Long vacations
    vacations: Vacation[];

    updatedAt: Timestamp;
}

// ===================
// BOOKING
// ===================

export type BookingStatus =
    | 'pending'      // waiting for babysitter response
    | 'confirmed'    // babysitter accepted
    | 'declined'     // babysitter declined
    | 'active'       // shift in progress
    | 'completed'    // shift ended
    | 'cancelled';   // parent cancelled

export interface BabysitterBooking {
    id: string;
    parentId: string;
    parentName?: string; // Parent display name
    parentPhone?: string; // Parent phone number for contact
    babysitterId: string;
    sitterName?: string; // Sitter display name
    childIds?: string[]; // Child IDs involved in booking
    status: BookingStatus;

    // Scheduled time
    date: Timestamp;
    startTime: string; // "18:00"
    endTime: string;   // "22:00"
    hours?: number; // Scheduled duration in hours

    // Actual time (for timer)
    actualStart?: Timestamp;
    actualEnd?: Timestamp;
    totalMinutes?: number; // Actual duration in minutes
    pausedMinutes?: number; // total paused time (legacy, use totalMinutes)

    // Payment
    hourlyRate?: number; // Hourly rate for this booking
    totalPrice?: number; // Planned cost (hours × hourlyRate)
    totalAmount?: number; // Actual payment (totalMinutes ÷ 60 × hourlyRate)

    // Meta
    location?: string;
    notes?: string;
    isRated?: boolean; // Has parent rated this booking?
    ratedAt?: Timestamp; // When was it rated?
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

// ===================
// ACTIVE SHIFT (Timer Widget)
// ===================

export interface ActiveShift {
    id: string;
    bookingId: string;
    parentId: string;
    babysitterId: string;
    babysitterName: string;
    babysitterPhoto?: string;

    // Timer state
    startedAt: Timestamp;
    isPaused: boolean;
    pausedAt?: Timestamp;
    totalPausedSeconds: number;

    // Rate
    hourlyRate: number;

    // Status
    isActive: boolean;
}

// ===================
// REVIEW
// ===================

export type ReviewTag =
    | 'reliable'
    | 'punctual'
    | 'great_with_babies'
    | 'great_with_toddlers'
    | 'kids_loved_her'
    | 'clean_organized'
    | 'flexible'
    | 'professional';

export interface Review {
    id: string;
    bookingId: string;
    parentId: string;
    babysitterId: string;
    parentName?: string; // For display purposes

    rating: number; // 1-5
    text?: string;
    tags?: ReviewTag[];

    // New features
    helpfulCount?: number; // How many found this helpful
    helpfulBy?: string[]; // User IDs who marked as helpful
    sitterResponse?: {
        text: string;
        createdAt: Timestamp;
    };
    isVerified?: boolean; // Verified booking review
    categoryRatings?: {
        reliability?: number; // 1-5
        professionalism?: number; // 1-5
        kidsInteraction?: number; // 1-5
        cleanliness?: number; // 1-5
    };

    createdAt: Timestamp;
}

// ===================
// CHAT
// ===================

export interface Chat {
    id: string;
    parentId: string;
    babysitterId: string;

    lastMessage?: string;
    lastMessageAt?: Timestamp;
    unreadByParent: number;
    unreadByBabysitter: number;

    createdAt: Timestamp;
}

export interface ChatMessage {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt: Timestamp;
    readAt?: Timestamp;
}

// ===================
// DISPLAY HELPERS
// ===================

export interface BabysitterCardData {
    id: string;
    name: string;
    photoUrl?: string;
    rating: number;
    reviewCount: number;
    hourlyRate: number;
    distance: number; // km
    responseTime: number; // minutes
    repeatFamilies: number;
    certifications: Certification[];
    isAvailableToday: boolean;
    mutualFriends?: number;
}

export const CERTIFICATION_LABELS: Record<Certification, string> = {
    cpr: 'החייאה',
    first_aid: 'עזרה ראשונה',
    education: 'לימודי חינוך',
    nursing: 'סיעוד',
    special_needs: 'חינוך מיוחד',
};

export const REVIEW_TAG_LABELS: Record<ReviewTag, string> = {
    reliable: 'אמינה',
    punctual: 'דייקנית',
    great_with_babies: 'מצוינת עם תינוקות',
    great_with_toddlers: 'מצוינת עם פעוטות',
    kids_loved_her: 'הילדים אהבו אותה',
    clean_organized: 'מסודרת ונקייה',
    flexible: 'גמישה',
    professional: 'מקצועית',
};

export const REVIEW_TAG_LABELS_MALE: Record<ReviewTag, string> = {
    reliable: 'אמין',
    punctual: 'דייקן',
    great_with_babies: 'מצוין עם תינוקות',
    great_with_toddlers: 'מצוין עם פעוטות',
    kids_loved_her: 'הילדים אהבו אותו',
    clean_organized: 'מסודר ונקי',
    flexible: 'גמיש',
    professional: 'מקצועי',
};

// ===================
// BADGES
// ===================

export type SitterBadge =
    | 'top_sitter'        // ⭐ סיטר מוביל - מעל 4.8 עם 20+ ביקורות
    | 'highly_recommended' // 🏆 מומלץ ביותר - לפחות 10 ביקורות + מעל 95% המלצות (4-5 כוכבים)
    | 'vip_sitter'        // 💎 סיטר VIP - מעל 50 ביקורות
    | 'rising_star'       // ✨ חדש ומומלץ - סיטר חדש עם ביקורות מעולות
    | 'available_now';    // ⚡ זמין עכשיו - זמין כרגע

export interface BadgeInfo {
    type: SitterBadge;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
}

export const BADGE_INFO: Record<SitterBadge, BadgeInfo> = {
    top_sitter: {
        type: 'top_sitter',
        label: 'סיטר מוביל',
        icon: '⭐',
        color: '#FBBF24',
        bgColor: '#FEF3C7',
    },
    highly_recommended: {
        type: 'highly_recommended',
        label: 'מומלץ ביותר',
        icon: '🏆',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
    },
    vip_sitter: {
        type: 'vip_sitter',
        label: 'סיטר VIP',
        icon: '💎',
        color: '#8B5CF6',
        bgColor: '#EDE9FE',
    },
    rising_star: {
        type: 'rising_star',
        label: 'חדש ומומלץ',
        icon: '✨',
        color: '#10B981',
        bgColor: '#D1FAE5',
    },
    available_now: {
        type: 'available_now',
        label: 'זמין עכשיו',
        icon: '', // No icon - minimalistic design
        color: '#3B82F6',
        bgColor: '#DBEAFE',
    },
};
