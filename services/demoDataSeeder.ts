/**
 * Demo Data Seeder — App Store screenshot mockup
 * Seeds realistic Hebrew baby tracking data for the last 24 hours
 */

import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { logger } from '../utils/logger';

function hoursAgo(h: number, extraMins = 0): Date {
    const d = new Date();
    d.setHours(d.getHours() - h, d.getMinutes() - extraMins, 0, 0);
    return d;
}

function minsToStr(mins: number): string {
    const m = Math.floor(mins);
    const s = 0;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const DEMO_EVENTS = [
    // Early morning
    {
        type: 'food', subType: 'breast',
        note: `ימין: ${minsToStr(18)}`,
        duration: 18 * 60,
        timestamp: hoursAgo(10, 30),
    },
    {
        type: 'diaper', subType: 'dirty',
        note: 'מלוכלך',
        timestamp: hoursAgo(10),
    },
    // Morning
    {
        type: 'sleep',
        duration: 55 * 60,
        note: '',
        timestamp: hoursAgo(9),
    },
    {
        type: 'food', subType: 'bottle',
        note: `זמן: ${minsToStr(12)} · 90מ"ל`,
        duration: 12 * 60,
        timestamp: hoursAgo(7, 45),
    },
    {
        type: 'diaper', subType: 'wet',
        note: 'רטוב',
        timestamp: hoursAgo(7),
    },
    // Midday
    {
        type: 'food', subType: 'breast',
        note: `שמאל: ${minsToStr(20)}`,
        duration: 20 * 60,
        timestamp: hoursAgo(5, 30),
    },
    {
        type: 'sleep',
        duration: 90 * 60,
        note: '',
        timestamp: hoursAgo(4),
    },
    // Afternoon
    {
        type: 'food', subType: 'bottle',
        note: `זמן: ${minsToStr(15)} · 120מ"ל`,
        duration: 15 * 60,
        timestamp: hoursAgo(2, 30),
    },
    {
        type: 'diaper', subType: 'dirty',
        note: 'מלוכלך',
        timestamp: hoursAgo(2),
    },
    // Evening
    {
        type: 'food', subType: 'breast',
        note: `ימין: ${minsToStr(16)}`,
        duration: 16 * 60,
        timestamp: hoursAgo(1),
    },
    {
        type: 'diaper', subType: 'wet',
        note: 'רטוב',
        timestamp: hoursAgo(0, 20),
    },
];

export async function seedDemoData(userId: string, childId: string): Promise<void> {
    logger.log('🌱 Seeding demo data...');
    const ref = collection(db, 'events');

    for (const event of DEMO_EVENTS) {
        await addDoc(ref, {
            ...event,
            userId,
            childId,
            timestamp: Timestamp.fromDate(event.timestamp),
            isDemo: true,
            createdAt: serverTimestamp(),
        });
    }

    logger.log(`✅ Seeded ${DEMO_EVENTS.length} demo events`);
}

export async function clearDemoData(userId: string, childId: string): Promise<void> {
    // Query and delete all isDemo=true events
    const { query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
    const q = query(
        collection(db, 'events'),
        where('userId', '==', userId),
        where('childId', '==', childId),
        where('isDemo', '==', true)
    );
    const snap = await getDocs(q);
    const deletes = snap.docs.map(d => deleteDoc(doc(db, 'events', d.id)));
    await Promise.all(deletes);
    logger.log(`🗑️ Cleared ${snap.docs.length} demo events`);
}
