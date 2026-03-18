import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { logger } from '../utils/logger';

export interface GlobalPresence {
    isOnline: boolean;
    lastActive: Date | null;
}

export const useGlobalPresence = (userId: string | null | undefined): GlobalPresence => {
    const [presence, setPresence] = useState<GlobalPresence>({
        isOnline: false,
        lastActive: null,
    });

    useEffect(() => {
        if (!userId) {
            setPresence({ isOnline: false, lastActive: null });
            return;
        }

        const userRef = doc(db, 'users', userId);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPresence({
                    isOnline: data.isOnline || false,
                    lastActive: data.lastActive?.toDate() || null,
                });
            } else {
                setPresence({ isOnline: false, lastActive: null });
            }
        }, (error) => {
            logger.error('Error listening to global presence:', error);
            setPresence({ isOnline: false, lastActive: null });
        });

        return () => unsubscribe();
    }, [userId]);

    return presence;
};
