import { db } from './firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import { logger } from '../utils/logger';

export interface BlockedUser {
    id: string;
    name: string;
    image?: string;
    blockedAt: Date | any; // allow for firebase timestamp
    type: 'user';
}

export const blockUser = async (currentUserId: string, targetUserId: string, targetName: string, targetImage?: string, targetType: 'user' = 'user'): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', currentUserId);
        const userDoc = await getDoc(userRef);

        const newBlock = {
            id: targetUserId,
            name: targetName,
            image: targetImage || '',
            blockedAt: new Date(),
            type: targetType
        };

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                blockedUsers: arrayUnion(newBlock)
            });
        } else {
            // Unlikely to happen but safe
            await setDoc(userRef, { blockedUsers: [newBlock] }, { merge: true });
        }

        logger.info(`User ${currentUserId} blocked ${targetUserId}`);
        return true;
    } catch (error) {
        logger.error('Error blocking user:', error);
        return false;
    }
};

export const unblockUser = async (currentUserId: string, blockRecord: BlockedUser): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            blockedUsers: arrayRemove(blockRecord)
        });
        logger.info(`User ${currentUserId} unblocked ${blockRecord.id}`);
        return true;
    } catch (error) {
        logger.error('Error unblocking user:', error);
        return false;
    }
};

export const getBlockedUsers = async (userId: string): Promise<BlockedUser[]> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.blockedUsers && Array.isArray(data.blockedUsers)) {
                return data.blockedUsers.map((b: any) => ({
                    ...b,
                    blockedAt: b.blockedAt?.toDate ? b.blockedAt.toDate() : new Date(b.blockedAt)
                }));
            }
        }
        return [];
    } catch (error) {
        logger.error('Error getting blocked users:', error);
        return [];
    }
};
