/**
 * Types for HomeScreen and related components
 */

export interface ChildProfile {
    id: string;
    name: string;
    birthDate: Date | any;
    ageMonths: number;
    photoUrl?: string;
    parentId?: string;
    gender?: 'boy' | 'girl' | 'other';
}

export interface WeatherData {
    temp: number;
    city: string;
    icon?: string;
    recommendation: string;
    loading: boolean;
    error?: string;
}

export interface CustomSupplement {
    id: string;
    name: string;
    icon: string; // lucide icon name
}

export interface MedicationsState {
    vitaminD: boolean;
    iron: boolean;
    custom?: Record<string, boolean>;
    hiddenDefaults?: string[];
}

export interface Medication {
    id: string;
    name: string;             // Free text: "אקמול"
    dosage: string;           // Free text: "5 מ״ל", "כדור אחד"
    frequency: number;        // Times per day (1-6)
    times: string[];          // ["08:00", "14:00", "20:00"]
    notes?: string;           // Optional notes
    remindersEnabled: boolean;
    createdAt: string;        // ISO timestamp
}

export interface HomeDataState {
    lastFeedTime: string;
    lastSleepTime: string;
    babyStatus: 'sleeping' | 'awake';
    aiTip: string;
    loadingAI: boolean;
}

export type TrackingType = 'food' | 'sleep' | 'diaper' | null;

export type GuardianRole = 'אבא' | 'אמא' | 'סבתא' | 'בייביסיטר';

export interface DynamicStyles {
    bg: string;
    text: string;
    textSub: string;
    aiBg: string;
    aiBorder: string;
    aiTextNight: string;
}

export const DEFAULT_CHILD_PROFILE: ChildProfile = {
    id: '',
    name: 'הבייבי שלי',
    birthDate: new Date(),
    ageMonths: 0,
};

export const GUARDIAN_ROLES: GuardianRole[] = ['אבא', 'אמא', 'סבתא', 'בייביסיטר'];
