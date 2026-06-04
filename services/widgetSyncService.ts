import { Platform } from 'react-native';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { getLastEvent } from './firebaseService';
import { liveActivityService } from './liveActivityService';
import { logger } from '../utils/logger';

// Standalone widget sync — does NOT depend on the HomeScreen being mounted.
// Called on login + on every app foreground so the Home Screen widget always
// has fresh data, even if the user never opens the Home tab in a session.

type WidgetSyncInput = {
    userId: string;
    childId: string;
    childName: string;
};

const toEpoch = (ts: any): number => {
    if (!ts) return 0;
    if (ts.seconds) return ts.seconds;
    if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
};

const formatTimeFromEpoch = (epoch: number): string => {
    if (!epoch) return '--:--';
    const d = new Date(epoch * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

const formatAgo = (epoch: number): string => {
    if (!epoch) return '';
    const diffSec = Math.floor(Date.now() / 1000 - epoch);
    if (diffSec < 60) return 'עכשיו';
    const m = Math.floor(diffSec / 60);
    if (m < 60) return `לפני ${m}ד'`;
    const h = Math.floor(diffSec / 3600);
    if (h < 24) return `לפני ${h}ש'`;
    return `לפני ${Math.floor(diffSec / 86400)} ימים`;
};

let inFlight = false;

export async function syncWidget({ userId, childId, childName }: WidgetSyncInput): Promise<void> {
    if (Platform.OS !== 'ios') return;
    if (!userId || !childId) return;
    if (inFlight) return;
    inFlight = true;

    try {
        // Pull last event of each type — these are the headline fields the widget shows.
        const [lastFeed, lastSleep, lastDiaper] = await Promise.all([
            getLastEvent(childId, 'food',  userId).catch(() => null),
            getLastEvent(childId, 'sleep', userId).catch(() => null),
            getLastEvent(childId, 'diaper',userId).catch(() => null),
        ]);

        // Medication uses a different code path; do it separately so a missing
        // index/field doesn't break the whole sync.
        const lastMed = await getLastEvent(childId, 'medication' as any, userId).catch(() => null);

        const feedEpoch   = toEpoch((lastFeed   as any)?.timestamp);
        const sleepEpoch  = toEpoch((lastSleep  as any)?.timestamp);
        const diaperEpoch = toEpoch((lastDiaper as any)?.timestamp);
        const medEpoch    = toEpoch((lastMed    as any)?.timestamp);

        // Count today's events from a single recent-events query.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartTs = Timestamp.fromDate(todayStart);
        let feedCount = 0;
        let diaperCount = 0;
        let sleepMinutes = 0;
        try {
            const eventsRef = collection(db, 'events');
            const todayQ = query(
                eventsRef,
                where('childId', '==', childId),
                where('timestamp', '>=', todayStartTs),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            const snap = await getDocs(todayQ);
            snap.docs.forEach(d => {
                const data = d.data() as any;
                if (data.type === 'food')   feedCount++;
                if (data.type === 'diaper') diaperCount++;
                if (data.type === 'sleep' && typeof data.duration === 'number') {
                    sleepMinutes += Math.round(data.duration / 60);
                }
            });
        } catch (e) {
            logger.warn('widgetSync: today counts failed', e);
        }

        const babyStatus = 'awake'; // widget only really uses this as a hint; widget reads from babies/{id}.status elsewhere
        const lastFeedTimeStr  = formatTimeFromEpoch(feedEpoch);
        const lastSleepTimeStr = formatTimeFromEpoch(sleepEpoch);
        const lastFeedAgoStr   = formatAgo(feedEpoch);
        const lastSleepAgoStr  = formatAgo(sleepEpoch);
        const lastDiaperAgoStr = formatAgo(diaperEpoch);

        await liveActivityService.updateWidgetData(
            childName || 'התינוק שלי',
            lastFeedTimeStr,
            lastFeedAgoStr,
            lastSleepTimeStr,
            lastSleepAgoStr,
            babyStatus,
            lastDiaperAgoStr,
            (lastDiaper as any)?.subType || (lastDiaper as any)?.note || '',
            (lastFeed   as any)?.subType || (lastFeed   as any)?.note || '',
            feedCount,
            sleepMinutes,
            diaperCount,
            feedEpoch,
            sleepEpoch,
            diaperEpoch,
            0,  // lastHealthTimestamp - not used in current widget
            0,  // healthCount - not used in current widget
            medEpoch,
            0   // medicationCount - count not critical for widget
        );

        logger.log('🪟 widgetSync OK', {
            childName,
            feedEpoch, sleepEpoch, diaperEpoch, medEpoch,
            feedCount, diaperCount, sleepMinutes,
        });
    } catch (e) {
        logger.warn('widgetSync failed:', e);
    } finally {
        inFlight = false;
    }
}
