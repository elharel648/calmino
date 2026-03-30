import { logger } from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { AccessLevel, FamilyRole } from '../services/familyService';
import { useLanguage } from './/LanguageContext';

// --- Types ---
export interface ActiveChild {
    childId: string;
    childName: string;
    photoUrl?: string;
    role: 'parent' | 'guest';
    accessLevel: AccessLevel;
    familyId?: string;
    parentUid?: string; // The actual creator/owner UID of the baby
}

interface ActiveChildContextType {
    // State
    activeChild: ActiveChild | null;
    allChildren: ActiveChild[];
    isLoading: boolean;

    // Computed permissions
    isGuest: boolean;
    isParent: boolean;
    canAccessReports: boolean;
    canAccessProfile: boolean;
    canAccessBabysitter: boolean;

    // Actions
    setActiveChild: (child: ActiveChild) => void;
    refreshChildren: () => Promise<void>;
}

const ActiveChildContext = createContext<ActiveChildContextType | null>(null);

// --- Provider ---
interface ActiveChildProviderProps {
    children: ReactNode;
    onReady?: () => void; // Called when initial load is complete
}

export const ActiveChildProvider: React.FC<ActiveChildProviderProps> = ({ children, onReady }) => {
    const { t } = useLanguage();
    const [activeChild, setActiveChildState] = useState<ActiveChild | null>(null);
    const [allChildren, setAllChildren] = useState<ActiveChild[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const hasCalledOnReady = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        // Failsafe: unconditionally unblock the Splash Screen globally after 1500ms 
        // regardless of whether Firebase fetch succeeds, fails, or hangs endlessly on 3G
        const failsafeTimeout = setTimeout(() => {
            if (!hasCalledOnReady.current && onReady) {
                hasCalledOnReady.current = true;
                onReady();
            }
        }, 1500);

        return () => {
            isMountedRef.current = false;
            clearTimeout(failsafeTimeout);
        };
    }, [onReady]);

    // Ref to track activeChild without causing refreshChildren to recreate
    // This fixes the infinite loop when joining with code
    const activeChildRef = useRef<ActiveChild | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        activeChildRef.current = activeChild;
    }, [activeChild]);

    // Computed permissions based on current role AND having a child profile
    // Hide tabs if: (1) user is a guest, OR (2) user has no baby profiles
    const isGuest = activeChild?.role === 'guest';
    const hasAnyChild = allChildren.length > 0;
    const isParent = !isGuest && hasAnyChild;
    const canAccessReports = !isGuest && hasAnyChild; // Need child + not guest
    const canAccessProfile = !isGuest && hasAnyChild; // Need child + not guest
    const canAccessBabysitter = !isGuest && hasAnyChild; // Need child + not guest

    // Load all children (own + guest access)
    const refreshChildren = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            if (isMountedRef.current) {
                setAllChildren([]);
                setActiveChildState(null);
                setIsLoading(false);
            }
            return;
        }

        try {
            const childrenList: ActiveChild[] = [];

            // 1. First check: Find babies directly by parentId (works even without family)
            const babiesQuery = query(
                collection(db, 'babies'),
                where('parentId', '==', userId)
            );
            const babiesSnapshot = await getDocs(babiesQuery);

            if (!babiesSnapshot.empty) {
                babiesSnapshot.forEach((babyDoc) => {
                    const babyData = babyDoc.data();
                    // Check if not already added
                    if (!childrenList.find(c => c.childId === babyDoc.id)) {
                        childrenList.push({
                            childId: babyDoc.id,
                            childName: babyData.name || 'תינוק',
                            photoUrl: babyData.photoUrl,
                            role: 'parent',
                            accessLevel: 'full',
                            familyId: undefined,
                            parentUid: userId, // current user IS the parent
                        });
                    }
                });
            }

            // 2. Also check via family (for shared family access)
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();

            if (userData?.familyId) {
                const familyDoc = await getDoc(doc(db, 'families', userData.familyId));
                if (familyDoc.exists()) {
                    const familyData = familyDoc.data();
                    const memberData = familyData.members?.[userId];

                    // Get ALL babies belonging to the family admin — not just the single babyId field.
                    // This supports families with multiple children.
                    const adminUid: string = familyData.createdBy || '';
                    const isAdmin = memberData?.role === 'admin';
                    const memberRole = memberData?.role;

                    try {
                        // Query all babies created by the family admin
                        const familyBabiesQuery = query(
                            collection(db, 'babies'),
                            where('parentId', '==', adminUid)
                        );
                        const familyBabiesSnap = await getDocs(familyBabiesQuery);

                        familyBabiesSnap.forEach((babyDoc) => {
                            if (!childrenList.find(c => c.childId === babyDoc.id)) {
                                const babyData = babyDoc.data();
                                childrenList.push({
                                    childId: babyDoc.id,
                                    childName: babyData?.name || familyData.babyName || 'תינוק',
                                    photoUrl: babyData?.photoUrl,
                                    role: isAdmin ? 'parent' : (memberRole === 'guest' ? 'guest' : 'parent'),
                                    accessLevel: memberData?.accessLevel || (isAdmin ? 'full' : 'actions_only'),
                                    familyId: userData.familyId,
                                    parentUid: adminUid,
                                });
                            }
                        });

                        // Fallback: if query returned nothing, use the stored babyId
                        if (familyBabiesSnap.empty && familyData.babyId && !childrenList.find(c => c.childId === familyData.babyId)) {
                            const babyDoc = await getDoc(doc(db, 'babies', familyData.babyId));
                            const babyData = babyDoc.exists() ? babyDoc.data() : null;
                            childrenList.push({
                                childId: familyData.babyId,
                                childName: babyData?.name || familyData.babyName || 'תינוק',
                                photoUrl: babyData?.photoUrl,
                                role: isAdmin ? 'parent' : (memberRole === 'guest' ? 'guest' : 'parent'),
                                accessLevel: memberData?.accessLevel || (isAdmin ? 'full' : 'actions_only'),
                                familyId: userData.familyId,
                                parentUid: babyData?.parentId,
                            });
                        }
                    } catch (familyBabiesErr) {
                        // Permission denied — fall back to the single babyId
                        logger.warn('Family babies query failed, falling back to babyId:', familyBabiesErr);
                        if (familyData.babyId && !childrenList.find(c => c.childId === familyData.babyId)) {
                            const babyDoc = await getDoc(doc(db, 'babies', familyData.babyId));
                            const babyData = babyDoc.exists() ? babyDoc.data() : null;
                            childrenList.push({
                                childId: familyData.babyId,
                                childName: babyData?.name || familyData.babyName || 'תינוק',
                                photoUrl: babyData?.photoUrl,
                                role: isAdmin ? 'parent' : (memberRole === 'guest' ? 'guest' : 'parent'),
                                accessLevel: memberData?.accessLevel || (isAdmin ? 'full' : 'actions_only'),
                                familyId: userData.familyId,
                                parentUid: babyData?.parentId,
                            });
                        }
                    }

                }
            }

            // 2. Get guest access children
            if (userData?.guestAccess) {
                for (const [familyId, guestInfo] of Object.entries(userData.guestAccess as Record<string, any>)) {
                    try {
                        // Check if access hasn't expired - safely handle different date formats
                        if (guestInfo?.expiresAt) {
                            const expirationDate = guestInfo.expiresAt.toDate ?
                                guestInfo.expiresAt.toDate() :
                                new Date(guestInfo.expiresAt);
                            if (expirationDate < new Date()) {
                                continue; // Skip expired access
                            }
                        }

                        const familyDoc = await getDoc(doc(db, 'families', familyId));
                        if (!familyDoc.exists()) continue;

                        const familyData = familyDoc.data();

                        // Use childId from guestInfo if available, otherwise fall back to family's babyId
                        const childId = guestInfo?.childId || familyData?.babyId;
                        if (!childId) continue;

                        // Skip if already in list
                        if (childrenList.find(c => c.childId === childId)) continue;

                        // Try to read baby details — if rules block it, use family name as fallback
                        let childName = familyData?.babyName || 'תינוק';
                        let photoUrl: string | undefined;
                        try {
                            const babyDoc = await getDoc(doc(db, 'babies', childId));
                            if (babyDoc.exists()) {
                                const babyData = babyDoc.data();
                                childName = babyData?.name || childName;
                                photoUrl = babyData?.photoUrl;
                            }
                        } catch {
                            // Rules may block baby read until deployed — use fallback name
                        }

                        childrenList.push({
                            childId,
                            childName,
                            photoUrl,
                            role: 'guest',
                            accessLevel: 'actions_only',
                            familyId,
                        });
                    } catch (err) {
                        logger.warn('Error loading guest family:', familyId, err);
                        // Continue to next family, don't crash
                    }
                }
            }

            if (!isMountedRef.current) return;

            setAllChildren(childrenList);

            // Update activeChild using ref to avoid infinite loop (ref doesn't cause callback recreation)
            const currentId = activeChildRef.current?.childId;
            if (!currentId) {
                // No active child yet — set to first available
                if (childrenList.length > 0) {
                    setActiveChildState(childrenList[0]);
                    activeChildRef.current = childrenList[0];
                }
            } else {
                const stillExists = childrenList.find(c => c.childId === currentId);
                if (!stillExists) {
                    // Active child was removed (e.g. left guest access) — switch to first available or null
                    const next = childrenList.length > 0 ? childrenList[0] : null;
                    setActiveChildState(next);
                    activeChildRef.current = next;
                } else {
                    // Refresh with latest data (name/photo may have changed)
                    setActiveChildState(stillExists);
                    activeChildRef.current = stillExists;
                }
            }

        } catch (error) {
            logger.log('Error loading children:', error);
        } finally {
            if (!isMountedRef.current) return;
            setIsLoading(false);
            // Notify App.tsx that initial load is complete
            if (!hasCalledOnReady.current && onReady) {
                hasCalledOnReady.current = true;
                onReady();
            }
        }
    }, [onReady]); // Include onReady in deps

    // Listen to auth state and refresh
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setIsLoading(false);
            // Still call onReady even if no user
            if (!hasCalledOnReady.current && onReady) {
                hasCalledOnReady.current = true;
                onReady();
            }
            return;
        }

        // Initial load
        refreshChildren();

        // Listen to user document changes
        const unsubscribe = onSnapshot(doc(db, 'users', userId), () => {
            refreshChildren();
        }, (error) => {
            logger.warn('ActiveChildContext onSnapshot error:', error);
        });

        return () => unsubscribe();
    }, [refreshChildren]);

    const setActiveChild = useCallback((child: ActiveChild) => {
        setActiveChildState(child);
    }, []);

    const contextValue = useMemo(() => ({
        activeChild,
        allChildren,
        isLoading,
        isGuest,
        isParent,
        canAccessReports,
        canAccessProfile,
        canAccessBabysitter,
        setActiveChild,
        refreshChildren,
    }), [
        activeChild,
        allChildren,
        isLoading,
        isGuest,
        isParent,
        canAccessReports,
        canAccessProfile,
        canAccessBabysitter,
        setActiveChild,
        refreshChildren,
    ]);

    return (
        <ActiveChildContext.Provider value={contextValue}>
            {children}
        </ActiveChildContext.Provider>
    );
};

// --- Hook ---
export const useActiveChild = (): ActiveChildContextType => {
    const context = useContext(ActiveChildContext);
    if (!context) {
        throw new Error('useActiveChild must be used within an ActiveChildProvider');
    }
    return context;
};

export default ActiveChildContext;
