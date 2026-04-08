import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    deleteField,
    serverTimestamp,
    onSnapshot,
    runTransaction,
    arrayRemove,
    arrayUnion,
    Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { logger } from '../utils/logger';

// --- Types ---
export type FamilyRole = 'admin' | 'member' | 'viewer' | 'guest';
export type AccessLevel = 'full' | 'actions_only';

export interface FamilyMember {
    id?: string; // Added when mapping from members object
    role: FamilyRole;
    name: string;
    email: string;
    joinedAt: Date;
    accessLevel: AccessLevel; // 'full' for parent/member, 'actions_only' for guest
    historyAccessDays?: number; // -1 or undefined for unlimited, otherwise number of days back
    invitedBy?: string; // userId of who invited this member
    expiresAt?: Date; // Optional expiration for temporary guest access
    photoURL?: string | null; // Added for profile consistency
}

export interface Family {
    id: string;
    createdBy: string;
    babyId: string;
    babyName: string;
    inviteCode: string;
    members: Record<string, FamilyMember>;
    createdAt: Date;
}

// --- Helper Functions ---

// Generate a random 6-digit invite code
const generateInviteCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Get current user ID
const getCurrentUserId = (): string | null => {
    return auth.currentUser?.uid || null;
};

// --- Family Service ---

/**
 * Create a new family for the current user's baby
 */
export const createFamily = async (babyId: string, babyName: string): Promise<Family | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    const user = auth.currentUser;
    if (!user) return null;

    try {
        // Check if user already has a family
        const existingFamily = await getMyFamily();
        if (existingFamily) {
            return existingFamily;
        }

        const familyId = `family_${userId}_${Date.now()}`;
        const inviteCode = generateInviteCode();

        const familyData: Omit<Family, 'id'> = {
            createdBy: userId,
            babyId,
            babyName,
            inviteCode,
            members: {
                [userId]: {
                    role: 'admin',
                    name: user.displayName || 'Admin',
                    email: user.email || '',
                    photoURL: user.photoURL || null,
                    joinedAt: new Date(),
                    accessLevel: 'full',
                }
            },
            createdAt: new Date(),
        };

        await setDoc(doc(db, 'families', familyId), {
            ...familyData,
            createdAt: serverTimestamp(),
            [`members.${userId}.joinedAt`]: serverTimestamp(),
        });

        // Update user's familyId
        await updateDoc(doc(db, 'users', userId), {
            familyId,
        });

        return { id: familyId, ...familyData };
    } catch (error) {
        logger.log('Error creating family:', error);
        return null;
    }
};

/**
 * Get the current user's family
 */
export const getMyFamily = async (): Promise<Family | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        // First check user's familyId
        const userDoc = await getDoc(doc(db, 'users', userId));
        const familyId = userDoc.data()?.familyId;

        if (familyId) {
            const familyDoc = await getDoc(doc(db, 'families', familyId));
            if (familyDoc.exists()) {
                return { id: familyDoc.id, ...familyDoc.data() } as Family;
            }
        }

        // Fallback: search for family where user is a member
        const q = query(
            collection(db, 'families'),
            where(`members.${userId}.role`, 'in', ['admin', 'member', 'viewer'])
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Family;
        }

        return null;
    } catch (error) {
        logger.log('Error getting family:', error);
        return null;
    }
};

/**
 * Join a family using invite code — fully client-side via Firestore.
 * Handles both guest codes (invites collection) and family codes (families collection).
 *
 * @param inviteCode  6-digit invite code
 * @param force       true = confirmed leave of current family (user already acknowledged)
 */
export const joinFamily = async (
    inviteCode: string,
    force: boolean = false,
): Promise<{
    success: boolean;
    message: string;
    requiresLeave?: boolean;
    currentFamilyName?: string;
    isGuest?: boolean;
}> => {
    const userId = auth.currentUser?.uid;
    if (!userId || !auth.currentUser) return { success: false, message: 'יש להתחבר למערכת' };

    const trimmedCode = inviteCode.trim();

    try {
        // ── Step 1: Check guest invite (invites/{code}) ──
        const inviteDoc = await getDoc(doc(db, 'invites', trimmedCode));

        if (inviteDoc.exists()) {
            const invite = inviteDoc.data();
            const expiresAt = invite.expiresAt?.toDate ? invite.expiresAt.toDate() : new Date(invite.expiresAt);

            if (new Date() > expiresAt) {
                return { success: false, message: 'קוד ההזמנה פג תוקף' };
            }
            if (invite.used) {
                return { success: false, message: 'קוד ההזמנה כבר נוצל' };
            }
            if (invite.createdBy === userId) {
                return { success: false, message: 'לא ניתן להצטרף להזמנה שיצרת בעצמך' };
            }

            const { familyId, childId } = invite;
            const familyDoc2 = await getDoc(doc(db, 'families', familyId));
            if (!familyDoc2.exists()) return { success: false, message: 'המשפחה לא נמצאה' };

            const familyData = familyDoc2.data();
            if (familyData.members?.[userId]) {
                return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
            }

            // Check if user is already in another family
            const userDoc = await getDoc(doc(db, 'users', userId));
            const existingFamilyId = userDoc.data()?.familyId;
            if (existingFamilyId && existingFamilyId !== familyId) {
                if (!force) {
                    const existingFamilyDoc = await getDoc(doc(db, 'families', existingFamilyId));
                    const existingFamilyName = existingFamilyDoc.data()?.babyName || 'הקיימת';
                    return { success: false, message: 'אתה כבר חלק ממשפחה אחרת', requiresLeave: true, currentFamilyName: existingFamilyName };
                }
                // force=true: leave current family first
                await leaveFamily();
            }

            const expiresAt24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // Add guest to family
            await updateDoc(doc(db, 'families', familyId), {
                [`members.${userId}`]: {
                    role: 'guest',
                    name: auth.currentUser.displayName || 'אורח',
                    email: auth.currentUser.email || '',
                    photoURL: auth.currentUser.photoURL || null,
                    joinedAt: serverTimestamp(),
                    accessLevel: 'actions_only',
                    historyAccessDays: 1,
                    invitedBy: invite.createdBy,
                    expiresAt: expiresAt24h,
                },
            });

            // Update user doc
            await setDoc(doc(db, 'users', userId), {
                guestFamilyId: familyId,
                guestChildIds: arrayUnion(childId),
                guestAccess: {
                    [familyId]: {
                        role: 'guest',
                        childId,
                        accessLevel: 'actions_only',
                        joinedAt: serverTimestamp(),
                        expiresAt: expiresAt24h,
                    },
                },
            }, { merge: true });

            // Mark invite as used
            await updateDoc(doc(db, 'invites', trimmedCode), {
                used: true,
                usedBy: userId,
                usedAt: serverTimestamp(),
            });

            const childDoc = await getDoc(doc(db, 'babies', childId));
            const childName = childDoc.exists() ? childDoc.data()?.name || 'התינוק' : 'התינוק';

            return {
                success: true,
                message: `הצטרפת כאורח ל${childName}! גישה ל-24 שעות בלבד 🎉`,
                isGuest: true,
            };
        }

        // ── Step 2: Check family invite code (families collection query) ──
        const familyQuery = query(
            collection(db, 'families'),
            where('inviteCode', '==', trimmedCode),
        );
        const familySnapshot = await getDocs(familyQuery);

        if (familySnapshot.empty) {
            return { success: false, message: 'קוד הזמנה לא תקין' };
        }

        const familyDoc3 = familySnapshot.docs[0];
        const familyId = familyDoc3.id;
        const familyData = familyDoc3.data();

        if (familyData.members?.[userId]) {
            return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
        }

        // Check if user is already in another family
        const userDoc = await getDoc(doc(db, 'users', userId));
        const existingFamilyId = userDoc.data()?.familyId;
        if (existingFamilyId && existingFamilyId !== familyId) {
            if (!force) {
                const existingFamilyDoc = await getDoc(doc(db, 'families', existingFamilyId));
                const existingFamilyName = existingFamilyDoc.data()?.babyName || 'הקיימת';
                return { success: false, message: 'אתה כבר חלק ממשפחה אחרת', requiresLeave: true, currentFamilyName: existingFamilyName };
            }
            await leaveFamily();
        }

        // Add member to family
        await updateDoc(doc(db, 'families', familyId), {
            [`members.${userId}`]: {
                role: 'member',
                name: auth.currentUser.displayName || 'משתמש חדש',
                email: auth.currentUser.email || '',
                photoURL: auth.currentUser.photoURL || null,
                joinedAt: serverTimestamp(),
                accessLevel: 'full',
            },
        });

        // Update user's familyId
        await setDoc(doc(db, 'users', userId), { familyId }, { merge: true });

        return {
            success: true,
            message: `הצטרפת למשפחת ${familyData.babyName || 'המשפחה'}! גישה מלאה לכל הילדים 🎉`,
            isGuest: false,
        };
    } catch (error: any) {
        const msg: string = error?.message || 'שגיאה בהצטרפות למשפחה';
        logger.log('joinFamily error:', error?.code, msg);
        return { success: false, message: msg };
    }
};

/**
 * Leave a family (atomic transaction to prevent losing all admins)
 */
export const leaveFamily = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        const familyRef = doc(db, 'families', family.id);
        const userRef = doc(db, 'users', userId);

        await runTransaction(db, async (transaction) => {
            const familySnap = await transaction.get(familyRef);
            if (!familySnap.exists()) throw new Error('Family not found');

            const familyData = familySnap.data();
            const admins = Object.entries(familyData.members).filter(
                ([_, m]: [string, any]) => m.role === 'admin'
            );

            const familyUpdates: Record<string, any> = {
                [`members.${userId}`]: deleteField(),
            };

            // If this user is the last admin, promote another member first
            if (admins.length === 1 && admins[0][0] === userId) {
                const otherMembers = Object.keys(familyData.members).filter(id => id !== userId);
                if (otherMembers.length > 0) {
                    familyUpdates[`members.${otherMembers[0]}.role`] = 'admin';
                }
            }

            transaction.update(familyRef, familyUpdates);
            transaction.update(userRef, { familyId: deleteField() });
        });

        return true;
    } catch (error) {
        logger.log('Error leaving family:', error);
        return false;
    }
};

/**
 * Remove a member from the family (admin only)
 * Handles both regular members (familyId) and guests (guestAccess/guestFamilyId/guestChildIds)
 */
export const removeMember = async (memberUserId: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        // Check if current user is admin
        if (family.members[userId]?.role !== 'admin') {
            return false;
        }

        // Can't remove yourself
        if (memberUserId === userId) return false;

        // Determine the member's role before removing
        const memberRole = family.members[memberUserId]?.role;

        // Remove member from family doc
        await updateDoc(doc(db, 'families', family.id), {
            [`members.${memberUserId}`]: deleteField(),
        });

        // Due to strict Firestore security rules, an admin cannot modify another user's document.
        // The removed user's device will self-eject when it detects its absence from the family members list.

        return true;
    } catch (error) {
        logger.log('Error removing member:', error);
        return false;
    }
};

/**
 * Regenerate invite code (admin only)
 */
export const regenerateInviteCode = async (): Promise<string | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        const family = await getMyFamily();
        if (!family) return null;

        if (family.members[userId]?.role !== 'admin') {
            return null;
        }

        const newCode = generateInviteCode();
        await updateDoc(doc(db, 'families', family.id), {
            inviteCode: newCode,
        });

        return newCode;
    } catch (error) {
        logger.log('Error regenerating invite code:', error);
        return null;
    }
};

/**
 * Rename the family (admin only)
 */
export const renameFamily = async (newName: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        if (family.members[userId]?.role !== 'admin') {
            return false;
        }

        await updateDoc(doc(db, 'families', family.id), {
            babyName: newName.trim(),
        });

        return true;
    } catch (error) {
        logger.log('Error renaming family:', error);
        return false;
    }
};

/**
 * Update member role (admin only)
 */
export const updateMemberRole = async (memberUserId: string, newRole: FamilyRole): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        const family = await getMyFamily();
        if (!family) return false;

        if (family.members[userId]?.role !== 'admin') {
            return false;
        }

        await updateDoc(doc(db, 'families', family.id), {
            [`members.${memberUserId}.role`]: newRole,
        });

        return true;
    } catch (error) {
        logger.log('Error updating member role:', error);
        return false;
    }
};

/**
 * Subscribe to family updates (real-time)
 */
export const subscribeToFamily = (
    familyId: string,
    callback: (family: Family | null) => void
): Unsubscribe => {
    return onSnapshot(doc(db, 'families', familyId), (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as Family);
        } else {
            callback(null);
        }
    });
};

/**
 * Get family members with their roles
 */
export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
    const family = await getMyFamily();
    if (!family) return [];

    return Object.entries(family.members).map(([userId, member]) => ({
        ...member,
        id: userId,
    }));
};

/**
 * Check if current user is admin
 */
export const isAdmin = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const family = await getMyFamily();
    if (!family) return false;

    return family.members[userId]?.role === 'admin';
};

/**
 * Check if current user can edit (admin or member)
 */
export const canEdit = async (): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const family = await getMyFamily();
    if (!family) return true; // No family = single user, can edit

    const role = family.members[userId]?.role;
    return role === 'admin' || role === 'member';
};

// --- Guest Invitation System ---

/**
 * Create a guest invite code for a specific child
 * @param childId - The baby/child ID to grant access to
 * @param familyId - The family ID
 * @param expiresInHours - Hours until code expires (default 24)
 * @returns The invite code and expiration date
 */
export const createGuestInvite = async (
    childId: string,
    familyId: string,
    expiresInHours: number = 24
): Promise<{ code: string; expiresAt: Date } | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        // SECURITY CHECK: Verify user is admin/member of this family
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (!familyDoc.exists()) {
            logger.log('Family not found');
            return null;
        }

        const familyData = familyDoc.data();
        const memberRole = familyData.members?.[userId]?.role;

        // Only admin or member can create invites (not guest or viewer)
        if (memberRole !== 'admin' && memberRole !== 'member') {
            logger.log('User not authorized to create invites');
            return null;
        }

        // Generate a unique code — timestamp suffix makes collisions virtually impossible
        const code = generateInviteCode();
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        // Store the invite in Firestore
        await setDoc(doc(db, 'invites', code), {
            code,
            familyId,
            childId,
            createdBy: userId,
            createdAt: serverTimestamp(),
            expiresAt,
            type: 'guest',
            used: false,
        });

        return { code, expiresAt };
    } catch (error) {
        logger.log('Error creating guest invite:', error);
        return null;
    }
};

/**
 * Join as a guest using an invite code
 * @param inviteCode - The 6-digit invite code
 * @returns Result with success status and child info
 */
export const joinAsGuest = async (
    inviteCode: string
): Promise<{ success: boolean; message: string; childId?: string; familyId?: string }> => {
    const userId = getCurrentUserId();
    if (!userId) return { success: false, message: 'יש להתחבר למערכת' };

    const user = auth.currentUser;
    if (!user) return { success: false, message: 'יש להתחבר למערכת' };

    try {
        // Find the invite
        const trimmedCode = inviteCode.trim();
        logger.log('🔍 joinAsGuest: Looking for invite code:', trimmedCode);

        const inviteDoc = await getDoc(doc(db, 'invites', trimmedCode));

        if (!inviteDoc.exists()) {
            logger.log('❌ joinAsGuest: Invite not found in Firestore');
            return { success: false, message: 'קוד הזמנה לא תקין' };
        }

        logger.log('✅ joinAsGuest: Found invite:', inviteDoc.data());

        const inviteData = inviteDoc.data();

        // Check if invite is expired
        const expiresAt = inviteData.expiresAt?.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
        if (new Date() > expiresAt) {
            return { success: false, message: 'קוד ההזמנה פג תוקף' };
        }

        // Check if invite was already used
        if (inviteData.used) {
            return { success: false, message: 'קוד ההזמנה כבר נוצל' };
        }

        const { familyId, childId } = inviteData;

        // SECURITY: Prevent self-invite
        if (inviteData.createdBy === userId) {
            return { success: false, message: 'לא ניתן להצטרף להזמנה שיצרת בעצמך' };
        }

        // SECURITY: Verify family exists
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (!familyDoc.exists()) {
            return { success: false, message: 'המשפחה לא נמצאה' };
        }

        const familyData = familyDoc.data();

        // SECURITY: Check if already a member
        if (familyData.members?.[userId]) {
            return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
        }

        // Add guest to family with limited access
        await updateDoc(doc(db, 'families', familyId), {
            [`members.${userId}`]: {
                role: 'guest',
                name: user.displayName || 'Guest',
                email: user.email || '',
                joinedAt: serverTimestamp(),
                accessLevel: 'actions_only',
                invitedBy: inviteData.createdBy,
            }
        });

        // Update user's guestAccess, guestFamilyId, and guestChildIds (required by Firestore rules)
        await setDoc(doc(db, 'users', userId), {
            guestFamilyId: familyId,
            guestAccess: {
                [familyId]: {
                    role: 'guest',
                    childId,
                    accessLevel: 'actions_only',
                    joinedAt: serverTimestamp(),
                    expiresAt: inviteData.expiresAt, // needed for expiry check in ActiveChildContext
                }
            },
            guestChildIds: arrayUnion(childId),
        }, { merge: true });

        // Mark invite as used
        await updateDoc(doc(db, 'invites', inviteCode), {
            used: true,
            usedBy: userId,
            usedAt: serverTimestamp(),
        });

        // Get child name for success message
        const childDoc = await getDoc(doc(db, 'babies', childId));
        const childName = childDoc.exists() ? childDoc.data()?.name || 'התינוק' : 'התינוק';

        return {
            success: true,
            message: `הצטרפת כאורח ל${childName}! 🎉`,
            childId,
            familyId,
        };
    } catch (error) {
        logger.log('Error joining as guest:', error);
        return { success: false, message: 'שגיאה בהצטרפות' };
    }
};

/**
 * Revoke guest access for a user
 */
export const revokeGuestAccess = async (guestUserId: string, familyId: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        // Verify caller is admin
        const family = await getMyFamily();
        if (!family || family.members[userId]?.role !== 'admin') {
            return false;
        }

        // Remove from family members
        await updateDoc(doc(db, 'families', familyId), {
            [`members.${guestUserId}`]: deleteField()
        });

        // Note: The guest's own device will prune their `users` document via self-ejection.
        // Admins cannot update `users/{guestUserId}` directly due to security rules.

        return true;
    } catch (error) {
        logger.log('Error revoking guest access:', error);
        return false;
    }
};

/**
 * Guest invite interface
 */
export interface GuestInvite {
    code: string;
    familyId: string;
    childId: string;
    createdBy: string;
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
    usedBy?: string;
    usedAt?: Date;
}

/**
 * Get all active (non-expired, non-used) guest invites created by current user
 */
export const getActiveGuestInvites = async (familyId: string): Promise<GuestInvite[]> => {
    const userId = getCurrentUserId();
    if (!userId) return [];

    try {
        // Query invites created by current user for this family
        const q = query(
            collection(db, 'invites'),
            where('familyId', '==', familyId),
            where('createdBy', '==', userId),
            where('used', '==', false)
        );

        const snapshot = await getDocs(q);
        const now = new Date();

        const invites: GuestInvite[] = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

            // Only include non-expired invites
            if (expiresAt > now) {
                invites.push({
                    code: data.code,
                    familyId: data.familyId,
                    childId: data.childId,
                    createdBy: data.createdBy,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                    expiresAt,
                    used: data.used,
                    usedBy: data.usedBy,
                    usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : undefined,
                });
            }
        });

        return invites;
    } catch (error) {
        logger.log('Error getting active guest invites:', error);
        return [];
    }
};

/**
 * Cancel/delete a guest invite
 */
export const cancelGuestInvite = async (inviteCode: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        // Verify this invite belongs to current user
        const inviteDoc = await getDoc(doc(db, 'invites', inviteCode));
        if (!inviteDoc.exists()) return false;

        const inviteData = inviteDoc.data();
        if (inviteData.createdBy !== userId) {
            logger.log('Not authorized to cancel this invite');
            return false;
        }

        await deleteDoc(doc(db, 'invites', inviteCode));

        return true;
    } catch (error) {
        logger.log('Error canceling guest invite:', error);
        return false;
    }
};


/**
 * Leave a family the current user joined as a guest (self-initiated).
 * Cleans up guestAccess, guestFamilyId, and guestChildIds from the user doc.
 */
export const leaveGuestAccess = async (familyId: string): Promise<boolean> => {
    const userId = getCurrentUserId();
    if (!userId) return false;

    try {
        // Get the childId from guestAccess before deleting
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        const childId = userData?.guestAccess?.[familyId]?.childId;
        const remainingAccess = { ...userData?.guestAccess };
        delete remainingAccess[familyId];
        const hasOtherGuestAccess = Object.keys(remainingAccess).length > 0;

        await updateDoc(doc(db, 'users', userId), {
            [`guestAccess.${familyId}`]: deleteField(),
            ...(hasOtherGuestAccess ? {} : { guestFamilyId: deleteField() }),
            ...(childId ? { guestChildIds: arrayRemove(childId) } : {}),
        });

        // Also remove from family members if present
        try {
            await updateDoc(doc(db, 'families', familyId), {
                [`members.${userId}`]: deleteField(),
            });
        } catch {
            // May not have write permission — that's fine, user doc cleanup is what matters
        }

        return true;
    } catch (error) {
        logger.log('Error leaving guest access:', error);
        return false;
    }
};

export default {
    createFamily,
    getMyFamily,
    joinFamily,
    leaveFamily,
    removeMember,
    regenerateInviteCode,
    renameFamily,
    updateMemberRole,
    subscribeToFamily,
    getFamilyMembers,
    isAdmin,
    canEdit,
    createGuestInvite,
    joinAsGuest,
    revokeGuestAccess,
    getActiveGuestInvites,
    cancelGuestInvite,
};
