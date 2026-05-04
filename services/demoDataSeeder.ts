/**
 * Demo Data Seeder — App Store screenshot mockup
 * Creates 4 children + 30 days of realistic events for statistics
 */

import { collection, addDoc, setDoc, doc, serverTimestamp, Timestamp, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { logger } from '../utils/logger';

// ─── Demo children ────────────────────────────────────────────────────────────
const DEMO_CHILDREN = [
    { name: 'נועם', lastName: 'כהן', gender: 'male',   daysOld: 42,
      photo: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=200&h=200&fit=crop' },
    { name: 'תמר', lastName: 'כהן', gender: 'female',  daysOld: 180,
      photo: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=200&h=200&fit=crop' },
    { name: 'ליאם', lastName: 'כהן', gender: 'male',   daysOld: 365,
      photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200&h=200&fit=crop' },
    { name: 'מיה', lastName: 'כהן', gender: 'female',  daysOld: 90,
      photo: 'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=200&h=200&fit=crop' },
];

function daysAgo(d: number, hour = 12, min = 0): Date {
    const now = new Date();
    now.setDate(now.getDate() - d);
    now.setHours(hour, min, 0, 0);
    return now;
}

// ─── Generate 30 days of realistic events for one child ──────────────────────
function generateEvents(childId: string, userId: string, daysOld: number) {
    const events: any[] = [];
    const daysToGenerate = 30;

    for (let day = daysToGenerate; day >= 0; day--) {
        // Feeding: 6-8 times/day (every 3 hours roughly)
        const feedTimes = [1, 4, 7, 10, 13, 16, 19, 22];
        feedTimes.forEach((hour, i) => {
            if (Math.random() > 0.15) { // 85% chance each feeding
                const isBreast = Math.random() > 0.4;
                const side = Math.random() > 0.5 ? 'ימין' : 'שמאל';
                const duration = isBreast ? (12 + Math.floor(Math.random() * 10)) : (10 + Math.floor(Math.random() * 8));
                const ml = isBreast ? 0 : (70 + Math.floor(Math.random() / 0.1) * 10);
                events.push({
                    type: 'food',
                    subType: isBreast ? 'breast' : 'bottle',
                    note: isBreast ? `${side}: ${duration}:00` : `זמן: ${duration}:00 · ${ml}מ"ל`,
                    duration: duration * 60,
                    timestamp: daysAgo(day, hour, Math.floor(Math.random() * 30)),
                    userId, childId, isDemo: true,
                });
            }
        });

        // Sleep: 3-4 times/day
        [[9, 45], [13, 90], [20, 480]].forEach(([hour, minDuration]) => {
            if (Math.random() > 0.1) {
                const duration = (minDuration + Math.floor(Math.random() * 30)) * 60;
                events.push({
                    type: 'sleep',
                    duration,
                    note: '',
                    timestamp: daysAgo(day, hour, 0),
                    userId, childId, isDemo: true,
                });
            }
        });

        // Diaper: 4-6 times/day
        [6, 9, 12, 15, 18, 21].forEach(hour => {
            if (Math.random() > 0.3) {
                const isDirty = Math.random() > 0.55;
                events.push({
                    type: 'diaper',
                    subType: isDirty ? 'dirty' : 'wet',
                    note: isDirty ? 'מלוכלך' : 'רטוב',
                    timestamp: daysAgo(day, hour, Math.floor(Math.random() * 30)),
                    userId, childId, isDemo: true,
                });
            }
        });
    }

    return events;
}

// ─── Main seeder ──────────────────────────────────────────────────────────────
export async function seedDemoData(): Promise<{ childrenCreated: number; eventsCreated: number }> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    logger.log('🌱 Starting demo data seed...');
    let eventsCreated = 0;
    const childIds: string[] = [];

    // Create children
    for (const child of DEMO_CHILDREN) {
        const birthDate = new Date();
        birthDate.setDate(birthDate.getDate() - child.daysOld);

        const childRef = await addDoc(collection(db, 'babies'), {
            name: child.name,
            lastName: child.lastName,
            gender: child.gender,
            birthDate: Timestamp.fromDate(birthDate),
            parentId: user.uid,
            photoURL: child.photo,
            createdAt: serverTimestamp(),
            isDemo: true,
            stats: { weight: '0', height: '0', headCircumference: '0' },
            milestones: [], album: {}, vaccines: {}, customVaccines: [],
        });

        childIds.push(childRef.id);
        logger.log(`👶 Created child: ${child.name} (${childRef.id})`);

        // Seed events for this child
        const events = generateEvents(childRef.id, user.uid, child.daysOld);
        const batch = writeBatch(db);
        events.forEach(event => {
            const eRef = doc(collection(db, 'events'));
            batch.set(eRef, { ...event, timestamp: Timestamp.fromDate(event.timestamp), createdAt: serverTimestamp() });
        });
        await batch.commit();
        eventsCreated += events.length;
        logger.log(`📊 Seeded ${events.length} events for ${child.name}`);
    }

    logger.log(`✅ Demo seed complete: ${childIds.length} children, ${eventsCreated} events`);
    return { childrenCreated: childIds.length, eventsCreated };
}

// ─── Cleaner ──────────────────────────────────────────────────────────────────
export async function clearDemoData(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Delete demo children
    const babiesQ = query(collection(db, 'babies'), where('parentId', '==', user.uid), where('isDemo', '==', true));
    const babiesSnap = await getDocs(babiesQ);
    for (const d of babiesSnap.docs) await deleteDoc(d.ref);

    // Delete demo events
    const eventsQ = query(collection(db, 'events'), where('userId', '==', user.uid), where('isDemo', '==', true));
    const eventsSnap = await getDocs(eventsQ);
    const batch = writeBatch(db);
    eventsSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    logger.log(`🗑️ Cleared ${babiesSnap.docs.length} demo children, ${eventsSnap.docs.length} demo events`);
}
