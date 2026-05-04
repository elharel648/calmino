/**
 * Demo Data Seeder — App Store mockup
 */

import { collection, addDoc, doc, serverTimestamp, Timestamp, query, where, getDocs, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { logger } from '../utils/logger';

const DEMO_CHILDREN = [
    { name: 'נועם',  gender: 'male',   daysOld: 42,
      photo: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&h=300&fit=crop&crop=face' },
    { name: 'תמר',  gender: 'female',  daysOld: 180,
      photo: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=300&h=300&fit=crop&crop=face' },
    { name: 'ליאם', gender: 'male',    daysOld: 365,
      photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&h=300&fit=crop&crop=face' },
    { name: 'מיה',  gender: 'female',  daysOld: 90,
      photo: 'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=300&h=300&fit=crop&crop=face' },
];

function daysAgo(d: number, hour = 12, min = 0): Date {
    const t = new Date();
    t.setDate(t.getDate() - d);
    t.setHours(hour, min, 0, 0);
    return t;
}

function generateEvents(childId: string, userId: string): any[] {
    const events: any[] = [];
    for (let day = 30; day >= 0; day--) {
        // Feedings every ~3 hrs
        [1, 4, 7, 10, 13, 16, 19, 22].forEach(hour => {
            if (Math.random() > 0.15) {
                const isBreast = Math.random() > 0.4;
                const mins = 12 + Math.floor(Math.random() * 10);
                const ml = 70 + Math.floor(Math.random() * 6) * 10;
                const side = Math.random() > 0.5 ? 'ימין' : 'שמאל';
                events.push({
                    type: 'food', subType: isBreast ? 'breast' : 'bottle',
                    note: isBreast ? `${side}: ${mins}:00` : `זמן: ${mins}:00 · ${ml}מ"ל`,
                    duration: mins * 60,
                    timestamp: daysAgo(day, hour, Math.floor(Math.random() * 30)),
                    userId, childId, isDemo: true,
                });
            }
        });
        // Sleep
        [[9, 55], [13, 90], [20, 480]].forEach(([hour, base]) => {
            if (Math.random() > 0.1) {
                events.push({
                    type: 'sleep', duration: (base + Math.floor(Math.random() * 30)) * 60,
                    note: '', timestamp: daysAgo(day, hour, 0),
                    userId, childId, isDemo: true,
                });
            }
        });
        // Diapers
        [6, 9, 12, 15, 18, 21].forEach(hour => {
            if (Math.random() > 0.3) {
                const dirty = Math.random() > 0.55;
                events.push({
                    type: 'diaper', subType: dirty ? 'dirty' : 'wet',
                    note: dirty ? 'מלוכלך' : 'רטוב',
                    timestamp: daysAgo(day, hour, Math.floor(Math.random() * 30)),
                    userId, childId, isDemo: true,
                });
            }
        });
    }
    return events;
}

export async function seedDemoData(): Promise<{ childrenCreated: number; eventsCreated: number }> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    let eventsCreated = 0;

    for (const child of DEMO_CHILDREN) {
        const birthDate = new Date();
        birthDate.setDate(birthDate.getDate() - child.daysOld);

        const childRef = await addDoc(collection(db, 'babies'), {
            name: child.name, lastName: 'כהן',
            gender: child.gender,
            birthDate: Timestamp.fromDate(birthDate),
            parentId: user.uid,
            photoURL: child.photo,
            createdAt: serverTimestamp(),
            isDemo: true,
            stats: { weight: String(3 + Math.random() * 4).slice(0,3), height: String(50 + Math.random() * 20).slice(0,4), headCircumference: '36' },
            milestones: [], album: {}, vaccines: {}, customVaccines: [],
        });

        // Seed events in batches of 450
        const events = generateEvents(childRef.id, user.uid);
        for (let i = 0; i < events.length; i += 450) {
            const batch = writeBatch(db);
            events.slice(i, i + 450).forEach(e => {
                batch.set(doc(collection(db, 'events')), {
                    ...e, timestamp: Timestamp.fromDate(e.timestamp), createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        }
        eventsCreated += events.length;
        logger.log(`✅ ${child.name}: ${events.length} events`);
    }

    return { childrenCreated: DEMO_CHILDREN.length, eventsCreated };
}

export async function clearDemoData(): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    const babiesSnap = await getDocs(query(collection(db, 'babies'), where('parentId', '==', user.uid), where('isDemo', '==', true)));
    for (const d of babiesSnap.docs) await deleteDoc(d.ref);

    const eventsSnap = await getDocs(query(collection(db, 'events'), where('userId', '==', user.uid), where('isDemo', '==', true)));
    for (let i = 0; i < eventsSnap.docs.length; i += 450) {
        const batch = writeBatch(db);
        eventsSnap.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    logger.log(`🗑️ Cleared ${babiesSnap.size} children, ${eventsSnap.size} events`);
}
