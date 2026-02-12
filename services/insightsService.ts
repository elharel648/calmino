/**
 * Insights Service - מנוע תובנות חכמות שמנתח דפוסים ומציע פעולות
 * This is the core differentiator vs Baby Daybook: we don't just TRACK problems, we SOLVE them.
 */

import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { logger } from '../utils/logger';

export type InsightType =
    | 'poor_sleep'
    | 'growth_concern'
    | 'feeding_gap'
    | 'crying_pattern'
    | 'book_sitter_recommended'
    | 'doctor_checkup'
    | 'all_good';

export interface Insight {
    type: InsightType;
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    actionLabel?: string;
    actionType?: 'book_sitter' | 'call_doctor' | 'view_growth' | 'set_reminder';
    actionData?: any;
    icon: string;
}

/**
 * פונקציה ראשית: מנתחת את כל הנתונים ומחזירה את התובנה הכי חשובה
 */
export async function getTopInsight(childId: string, userId: string): Promise<Insight | null> {
    if (!childId || !userId) return null;

    try {
        // Get events from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const eventsQuery = query(
            collection(db, 'events'),
            where('childId', '==', childId),
            where('timestamp', '>=', Timestamp.fromDate(sevenDaysAgo)),
            orderBy('timestamp', 'desc'),
            limit(200)
        );

        const snapshot = await getDocs(eventsQuery);
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Run all analysis functions
        const insights: Insight[] = [];

        // 1. Sleep Analysis
        const sleepInsight = analyzeSleepPatterns(events);
        if (sleepInsight) insights.push(sleepInsight);

        // 2. Crying Pattern Analysis
        const cryingInsight = analyzeCryingPatterns(events);
        if (cryingInsight) insights.push(cryingInsight);

        // 3. Feeding Gap Analysis
        const feedingInsight = analyzeFeedingGaps(events);
        if (feedingInsight) insights.push(feedingInsight);

        // Sort by severity (high → medium → low)
        insights.sort((a, b) => {
            const severityOrder = { high: 3, medium: 2, low: 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });

        // Return top insight, or "all good" if none
        if (insights.length > 0) {
            return insights[0];
        }

        return {
            type: 'all_good',
            severity: 'low',
            title: 'הכל נראה טוב! 💚',
            description: 'הילד/ה שלך אוכל/ת וישן/ה היטב',
            icon: '✨',
        };
    } catch (error) {
        logger.error('Error getting top insight:', error);
        return null;
    }
}

/**
 * ניתוח שינה: אם התינוק ישן פחות מ-X שעות ביום ב-3 ימים ברצף, להציע בייביסיטר
 */
function analyzeSleepPatterns(events: any[]): Insight | null {
    const sleepEvents = events.filter(e => e.type === 'sleep');
    if (sleepEvents.length < 3) return null;

    // Group by day
    const sleepByDay: Record<string, number> = {};
    sleepEvents.forEach(event => {
        const date = event.timestamp.toDate?.() || new Date(event.timestamp);
        const dayKey = date.toISOString().split('T')[0];
        const duration = event.duration || 0;
        sleepByDay[dayKey] = (sleepByDay[dayKey] || 0) + duration;
    });

    // Check last 3 days
    const last3Days = Object.keys(sleepByDay)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 3);

    const poorSleepDays = last3Days.filter(day => {
        const totalMinutes = sleepByDay[day] / 60;
        return totalMinutes < 240; // Less than 4 hours per day
    });

    if (poorSleepDays.length >= 2) {
        return {
            type: 'poor_sleep',
            severity: 'high',
            title: 'שינה לא מספקת בימים האחרונים',
            description: 'נראה שהתינוק ישן פחות מהרגיל. אולי הגיע הזמן להזמין עזרה?',
            actionLabel: 'הזמנ/י בייביסיטר להערב',
            actionType: 'book_sitter',
            actionData: { reason: 'poor_sleep', urgency: 'tonight' },
            icon: '😴',
        };
    }

    return null;
}

/**
 * ניתוח בכי: אם יש יותר מ-5 אירועי בכי בשבוע, להציע עזרה
 */
function analyzeCryingPatterns(events: any[]): Insight | null {
    const cryingEvents = events.filter(e =>
        e.type === 'custom' &&
        (e.note?.includes('בכי') || e.note?.includes('crying') || e.subType === 'cry')
    );

    if (cryingEvents.length >= 5) {
        return {
            type: 'crying_pattern',
            severity: 'medium',
            title: 'אירועי בכי תכופים',
            description: 'נראה שהתינוק בוכה יותר מהרגיל. קצת הפוגה יכולה לעזור',
            actionLabel: 'מצא/י בייביסיטר זמין/ה',
            actionType: 'book_sitter',
            actionData: { reason: 'crying_pattern', urgency: 'today' },
            icon: '😢',
        };
    }

    return null;
}

/**
 * ניתוח הזנה: אם יש פערים גדולים בין הזנות, להתריע
 */
function analyzeFeedingGaps(events: any[]): Insight | null {
    const feedingEvents = events
        .filter(e => e.type === 'food')
        .sort((a, b) => {
            const dateA = a.timestamp.toDate?.() || new Date(a.timestamp);
            const dateB = b.timestamp.toDate?.() || new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
        });

    if (feedingEvents.length < 2) return null;

    const lastFeed = feedingEvents[0].timestamp.toDate?.() || new Date(feedingEvents[0].timestamp);
    const now = new Date();
    const hoursSinceLastFeed = (now.getTime() - lastFeed.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastFeed > 5) {
        return {
            type: 'feeding_gap',
            severity: 'medium',
            title: 'פער גדול מההזנה האחרונה',
            description: `עברו ${Math.floor(hoursSinceLastFeed)} שעות מההזנה האחרונה`,
            actionLabel: 'הוסף/י הזנה',
            actionType: 'set_reminder',
            icon: '🍼',
        };
    }

    return null;
}

/**
 * Get personalized recommendations based on child age
 */
export async function getAgeBasedRecommendations(ageMonths: number): Promise<string[]> {
    const recommendations: string[] = [];

    if (ageMonths < 3) {
        recommendations.push('תינוקות עד 3 חודשים צריכים 14-17 שעות שינה ביממה');
        recommendations.push('הזנה כל 2-3 שעות היא נורמלית');
    } else if (ageMonths < 6) {
        recommendations.push('תינוקות בגיל 3-6 חודשים צריכים 12-15 שעות שינה');
        recommendations.push('כדאי להתחיל שגרת שינה קבועה');
    } else if (ageMonths < 12) {
        recommendations.push('תינוקות בגיל 6-12 חודשים צריכים 12-14 שעות שינה');
        recommendations.push('אפשר להתחיל במזון מוצק');
    }

    return recommendations;
}
