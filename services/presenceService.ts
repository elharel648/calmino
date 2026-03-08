import { logger } from '../utils/logger';
// presenceService.ts - Real-time presence tracking for family members
import { doc, setDoc, onSnapshot, serverTimestamp, updateDoc, collection, Unsubscribe } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { AppState, AppStateStatus } from 'react-native';

// --- Types ---
export interface FamilyMemberPresence {
    isOnline: boolean;
    lastSeen: Date | null;
    userId: string;
    name: string;
}

// --- Helper ---
const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

// --- Set user as online ---
export const setUserOnline = async (familyId: string): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId || !familyId) return;

    try {
        const presenceRef = doc(db, 'families', familyId, 'presence', userId);
        await setDoc(presenceRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
            userId,
            name: auth.currentUser?.displayName || 'משתמש',
        }, { merge: true });
    } catch (e) {
        logger.error('setUserOnline error:', e);
    }
};

// --- Set user as offline ---
export const setUserOffline = async (familyId: string): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId || !familyId) return;

    try {
        const presenceRef = doc(db, 'families', familyId, 'presence', userId);
        await updateDoc(presenceRef, {
            isOnline: false,
            lastSeen: serverTimestamp(),
        });
    } catch (e) {
        logger.error('setUserOffline error:', e);
    }
};

// --- Subscribe to family presence (real-time) ---
export const subscribeToFamilyPresence = (
    familyId: string,
    callback: (members: FamilyMemberPresence[]) => void
): Unsubscribe => {
    if (!familyId) {
        callback([]);
        return () => { };
    }

    let membersMap: Record<string, { name?: string }> = {};
    let presenceMap: Record<string, { isOnline: boolean; lastSeen: Date | null }> = {};

    function emitPresence() {
        const memberIds = Object.keys(membersMap);
        const presenceList = memberIds.map((memberId) => ({
            userId: memberId,
            name: membersMap[memberId]?.name || 'משתמש',
            isOnline: presenceMap[memberId]?.isOnline || false,
            lastSeen: presenceMap[memberId]?.lastSeen || null,
        }));
        callback(presenceList);
    }

    // Listen to family members map
    const familyUnsub = onSnapshot(doc(db, 'families', familyId), (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        membersMap = snapshot.data().members || {};
        emitPresence();
    });

    // Listen to entire presence subcollection - single listener instead of N individual getDoc calls
    const presenceUnsub = onSnapshot(collection(db, 'families', familyId, 'presence'), (snapshot) => {
        presenceMap = {};
        snapshot.forEach((presenceDoc) => {
            const data = presenceDoc.data();
            presenceMap[presenceDoc.id] = {
                isOnline: data.isOnline || false,
                lastSeen: data.lastSeen?.toDate() || null,
            };
        });
        emitPresence();
    });

    return () => {
        familyUnsub();
        presenceUnsub();
    };
};

// --- Auto-manage presence based on app state ---
export const setupPresenceListener = (familyId: string): (() => void) => {
    if (!familyId) return () => { };

    // Set online immediately
    setUserOnline(familyId);

    // Listen to app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            setUserOnline(familyId);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            setUserOffline(familyId);
        }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Return cleanup function
    return () => {
        subscription.remove();
        setUserOffline(familyId);
    };
};

// --- Global User Presence (For Chat/Sitters outside of families) ---
export const setGlobalUserOnline = async (): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isOnline: true,
            lastActive: serverTimestamp(),
        });
    } catch (e) {
        logger.error('setGlobalUserOnline error:', e);
    }
};

export const setGlobalUserOffline = async (): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            isOnline: false,
            lastActive: serverTimestamp(),
        });
    } catch (e) {
        logger.error('setGlobalUserOffline error:', e);
    }
};

export const setupGlobalPresenceListener = (): (() => void) => {
    // Set online immediately
    setGlobalUserOnline();

    // Listen to app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            setGlobalUserOnline();
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            setGlobalUserOffline();
        }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Return cleanup function
    return () => {
        subscription.remove();
        setGlobalUserOffline();
    };
};

export default {
    setUserOnline,
    setUserOffline,
    subscribeToFamilyPresence,
    setupPresenceListener,
    setGlobalUserOnline,
    setGlobalUserOffline,
    setupGlobalPresenceListener,
};

