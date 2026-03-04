import { logger } from '../utils/logger';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { getLastEvent, formatTimeFromTimestamp, getRecentHistory } from '../services/firebaseService';
import { HomeDataState } from '../types/home';
import { liveActivityService } from '../services/liveActivityService';

interface DailyStats {
    feedCount: number;
    sleepMinutes: number;
    diaperCount: number;
}

interface UseHomeDataReturn extends HomeDataState {
    dailyStats: DailyStats;
    growthStats?: {
        currentWeight?: string;
        lastWeightDiff?: string;
        currentHeight?: string;
        lastHeightDiff?: string;
        lastMeasuredDate?: Date;
    };
    toggleBabyStatus: () => void;
    generateInsight: () => Promise<void>;
    refresh: () => Promise<void>;
    isLoading: boolean;
    isError: boolean;
    guestExpiresAt: Date | null;
}

/**
 * Custom hook for home screen data - events, status, and AI insights
 */
export const useHomeData = (
    childId: string | undefined,
    childName: string,
    ageMonths: number,
    creatorId?: string
): UseHomeDataReturn => {
    const [lastFeedTime, setLastFeedTime] = useState('--:--');
    const [lastSleepTime, setLastSleepTime] = useState('--:--');
    const [babyStatus, setBabyStatus] = useState<'sleeping' | 'awake'>('awake');
    const [aiTip, setAiTip] = useState('אוסף נתונים לניתוח...');
    const [loadingAI, setLoadingAI] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [guestExpiresAt, setGuestExpiresAt] = useState<Date | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStats>({
        feedCount: 0,
        sleepMinutes: 0,
        diaperCount: 0,
    });
    const [growthStats, setGrowthStats] = useState<{
        currentWeight?: string;
        lastWeightDiff?: string;
        currentHeight?: string;
        lastHeightDiff?: string;
        lastMeasuredDate?: Date;
    }>({});


    const user = auth.currentUser;

    const updateRemoteStatus = useCallback(async (status: 'sleeping' | 'awake') => {
        if (!childId) return;
        try {
            const childRef = doc(db, 'babies', childId);
            await updateDoc(childRef, { status });
        } catch (e) {
            logger.error('Status update error:', e);
        }
    }, [childId]);

    const toggleBabyStatus = useCallback(() => {
        const newStatus = babyStatus === 'sleeping' ? 'awake' : 'sleeping';
        setBabyStatus(newStatus);
        updateRemoteStatus(newStatus);
    }, [babyStatus, updateRemoteStatus]);

    const generateInsight = useCallback(async () => {
        // Disabled for now
        setAiTip('');
        setLoadingAI(false);
    }, []);

    const calculateDailyStats = useCallback((events: any[]) => {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        let feedCount = 0;
        let sleepMinutes = 0;
        let diaperCount = 0;

        events.forEach(event => {
            let eventDate: Date;
            if (event.timestamp?.seconds) {
                eventDate = new Date(event.timestamp.seconds * 1000);
            } else if (event.timestamp) {
                eventDate = new Date(event.timestamp);
            } else {
                return;
            }

            if (eventDate >= last24h) {
                switch (event.type) {
                    case 'food':
                        feedCount++;
                        break;
                    case 'sleep':
                        // Extract sleep duration from note if available
                        if (event.note) {
                            const match = event.note.match(/(\d+):(\d+)/);
                            if (match) {
                                sleepMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
                            }
                        }
                        break;
                    case 'diaper':
                        diaperCount++;
                        break;
                }
            }
        });

        return { feedCount, sleepMinutes, diaperCount };
    }, []);

    const refresh = useCallback(async () => {
        if (!childId) {
            // Reset data when no child
            setLastFeedTime('--:--');
            setLastSleepTime('--:--');
            setDailyStats({ feedCount: 0, sleepMinutes: 0, diaperCount: 0 });
            setGrowthStats({});
            return;
        }

        const formatAgo = (timestamp: any): string => {
            if (!timestamp) return '';
            const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
            const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
            if (diffMins < 1) return 'עכשיו';
            if (diffMins < 60) return `לפני ${diffMins} דק'`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `לפני ${diffHours} שע'`;
            return `לפני ${Math.floor(diffHours / 24)} ימים`;
        };

        try {
            setIsError(false);
            // Fetch last events (passing creatorId for legacy support)
            const lastFeed = await getLastEvent(childId, 'food', creatorId);
            const lastSleep = await getLastEvent(childId, 'sleep', creatorId);

            const feedTimeStr = formatTimeFromTimestamp(lastFeed?.timestamp);
            const sleepTimeStr = formatTimeFromTimestamp(lastSleep?.timestamp);
            setLastFeedTime(feedTimeStr);
            setLastSleepTime(sleepTimeStr);

            // Fetch current status
            const childRef = doc(db, 'babies', childId);
            const snap = await getDoc(childRef);

            if (snap.exists()) {
                const data = snap.data();
                if (data.status) setBabyStatus(data.status);
            }

            // Calculate daily stats from history - check if user is guest
            // Get user's family and access level
            const currentUserId = auth.currentUser?.uid;
            const userDoc = await getDoc(doc(db, 'users', creatorId || ''));
            const familyId = userDoc.exists() ? userDoc.data()?.familyId : null;
            let historyAccessDays: number | undefined;

            if (familyId) {
                const familyDoc = await getDoc(doc(db, 'families', familyId));
                if (familyDoc.exists()) {
                    const familyData = familyDoc.data();
                    const memberData = familyData.members?.[creatorId || ''];
                    historyAccessDays = memberData?.historyAccessDays;

                    // Check if the current logged-in user is a guest with an expiry
                    if (currentUserId && currentUserId !== creatorId) {
                        const currentMember = familyData.members?.[currentUserId];
                        if (currentMember?.role === 'guest' && currentMember?.expiresAt) {
                            const expiry = currentMember.expiresAt?.toDate
                                ? currentMember.expiresAt.toDate()
                                : new Date(currentMember.expiresAt);
                            setGuestExpiresAt(expiry);
                        } else {
                            setGuestExpiresAt(null);
                        }
                    } else {
                        setGuestExpiresAt(null);
                    }
                }
            }

            const history = await getRecentHistory(childId, creatorId, historyAccessDays);
            const stats = calculateDailyStats(history);
            setDailyStats(stats);

            // Fetch growth stats
            if (snap.exists()) {
                const data = snap.data();
                if (data.stats && Array.isArray(data.stats) && data.stats.length > 0) {
                    // Sort by timestamp desc
                    const sortedStats = [...data.stats].sort((a: any, b: any) => {
                        const dateA = a.date instanceof Object && a.date.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date || 0);
                        const dateB = b.date instanceof Object && b.date.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date || 0);
                        return dateB.getTime() - dateA.getTime();
                    });

                    const latest = sortedStats[0];
                    // Find previous measurements for diff
                    const prevWeightObj = sortedStats.find((s: any) => s.weight && s !== latest);
                    const prevHeightObj = sortedStats.find((s: any) => s.height && s !== latest);

                    let lastWeightDiff;
                    if (latest.weight && prevWeightObj?.weight) {
                        const diff = parseFloat(latest.weight) - parseFloat(prevWeightObj.weight);
                        lastWeightDiff = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
                    }

                    let lastHeightDiff;
                    if (latest.height && prevHeightObj?.height) {
                        const diff = parseFloat(latest.height) - parseFloat(prevHeightObj.height);
                        lastHeightDiff = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
                    }

                    const lastDate = latest.date instanceof Object && latest.date.seconds
                        ? new Date(latest.date.seconds * 1000)
                        : new Date(latest.date);

                    setGrowthStats({
                        currentWeight: latest.weight,
                        lastWeightDiff,
                        currentHeight: latest.height,
                        lastHeightDiff,
                        lastMeasuredDate: lastDate
                    });
                } else {
                    setGrowthStats({});
                }
            }

            // Push latest data to iOS homescreen widget
            if (Platform.OS === 'ios') {
                const currentStatus = snap.exists() ? (snap.data().status || 'awake') : 'awake';
                liveActivityService.updateWidgetData(
                    childName,
                    feedTimeStr,
                    formatAgo(lastFeed?.timestamp),
                    sleepTimeStr,
                    formatAgo(lastSleep?.timestamp),
                    currentStatus
                ).catch(() => {});
            }

        } catch (e) {
            logger.error('Home data refresh error:', e);
            setIsError(true);
        }
    }, [childId, creatorId, calculateDailyStats]);

    // Auto-refresh when childId changes
    useEffect(() => {
        refresh();
    }, [childId, refresh]);

    // Real-time listener: refresh when any family member logs a new event for this child
    const refreshRef = useRef(refresh);
    useEffect(() => { refreshRef.current = refresh; }, [refresh]);

    useEffect(() => {
        if (!childId) return;
        let isFirst = true;
        const q = query(
            collection(db, 'events'),
            where('childId', '==', childId),
            limit(1)
        );
        const unsub = onSnapshot(q, () => {
            if (isFirst) { isFirst = false; return; } // skip initial snapshot
            refreshRef.current();
        }, () => {}); // ignore listener errors silently
        return () => unsub();
    }, [childId]);

    return {
        lastFeedTime,
        lastSleepTime,
        babyStatus,
        aiTip,
        loadingAI,
        dailyStats,
        growthStats,
        isLoading,
        isError,
        guestExpiresAt,
        toggleBabyStatus,
        generateInsight,
        refresh,
    };
};

export default useHomeData;
