import { logger } from '../utils/logger';
import { useState, useCallback } from 'react';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { MedicationsState, CustomSupplement } from '../types/home';

interface UseMedicationsReturn {
    meds: MedicationsState;
    toggleMed: (type: string) => void;
    syncStatus: 'synced' | 'syncing' | 'error';
    refresh: () => Promise<void>;
    customSupplements: CustomSupplement[];
    addCustomSupplement: (name: string, icon: string) => Promise<void>;
    removeCustomSupplement: (id: string) => Promise<void>;
    totalCount: number;
    takenCount: number;
}

/**
 * Custom hook for daily medications tracking with Firebase sync
 * Supports default supplements (vitaminD, iron) + user-defined custom supplements
 */
export const useMedications = (childId: string | undefined): UseMedicationsReturn => {
    const [meds, setMeds] = useState<MedicationsState>({ vitaminD: false, iron: false, custom: {} });
    const [customSupplements, setCustomSupplements] = useState<CustomSupplement[]>([]);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    // Calculate counts
    const takenCount = (meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0) +
        Object.values(meds.custom || {}).filter(Boolean).length;
    const totalCount = 2 + customSupplements.length;

    const syncToFirebase = useCallback(async (newMeds: MedicationsState) => {
        if (!childId) return;

        setSyncStatus('syncing');
        try {
            const childRef = doc(db, 'babies', childId);
            await updateDoc(childRef, {
                meds: newMeds,
                medsDate: new Date().toDateString(),
            });
            setSyncStatus('synced');
        } catch (e) {
            logger.log('Med sync error:', e);
            setSyncStatus('error');
        }
    }, [childId]);

    // Save supplement event to timeline
    const saveSupplementEvent = useCallback(async (type: string, name?: string) => {
        const user = auth.currentUser;
        if (!user || !childId) return;

        const supplementName = type === 'vitaminD' ? 'ויטמין D' : type === 'iron' ? 'ברזל' : (name || type);

        try {
            await addDoc(collection(db, 'events'), {
                userId: user.uid,
                childId,
                type: 'supplements',
                subType: type,
                note: supplementName,
                timestamp: serverTimestamp(),
                reporterName: user.displayName || 'אני',
            });
            logger.log('💊 Supplement event saved:', supplementName);
        } catch (e) {
            logger.log('Supplement event save error:', e);
        }
    }, [childId]);

    const toggleMed = useCallback((type: string) => {
        if (type === 'vitaminD' || type === 'iron') {
            // Default supplement toggle
            const newValue = !meds[type];
            const newMeds = { ...meds, [type]: newValue };
            setMeds(newMeds);
            syncToFirebase(newMeds);

            if (newValue) {
                saveSupplementEvent(type);
            }
        } else {
            // Custom supplement toggle
            const currentCustom = meds.custom || {};
            const newValue = !currentCustom[type];
            const newCustom = { ...currentCustom, [type]: newValue };
            const newMeds = { ...meds, custom: newCustom };
            setMeds(newMeds);
            syncToFirebase(newMeds);

            if (newValue) {
                const supplement = customSupplements.find(s => s.id === type);
                saveSupplementEvent(type, supplement?.name);
            }
        }
    }, [meds, syncToFirebase, saveSupplementEvent, customSupplements]);

    const addCustomSupplement = useCallback(async (name: string, icon: string) => {
        if (!childId) return;

        const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newSupplement: CustomSupplement = { id, name, icon };

        const updatedSupplements = [...customSupplements, newSupplement];
        setCustomSupplements(updatedSupplements);

        // Also init its taken status to false
        const newCustom = { ...(meds.custom || {}), [id]: false };
        const newMeds = { ...meds, custom: newCustom };
        setMeds(newMeds);

        try {
            const childRef = doc(db, 'babies', childId);
            await updateDoc(childRef, {
                customSupplements: updatedSupplements,
                meds: newMeds,
                medsDate: new Date().toDateString(),
            });
        } catch (e) {
            logger.log('Add custom supplement error:', e);
        }
    }, [childId, customSupplements, meds]);

    const removeCustomSupplement = useCallback(async (id: string) => {
        if (!childId) return;

        const updatedSupplements = customSupplements.filter(s => s.id !== id);
        setCustomSupplements(updatedSupplements);

        // Remove from meds custom
        const newCustom = { ...(meds.custom || {}) };
        delete newCustom[id];
        const newMeds = { ...meds, custom: newCustom };
        setMeds(newMeds);

        try {
            const childRef = doc(db, 'babies', childId);
            await updateDoc(childRef, {
                customSupplements: updatedSupplements,
                meds: newMeds,
                medsDate: new Date().toDateString(),
            });
        } catch (e) {
            logger.log('Remove custom supplement error:', e);
        }
    }, [childId, customSupplements, meds]);

    const refresh = useCallback(async () => {
        if (!childId) return;

        try {
            const childRef = doc(db, 'babies', childId);
            const snap = await getDoc(childRef);

            if (snap.exists()) {
                const data = snap.data();
                const todayStr = new Date().toDateString();

                // Load custom supplements list (these persist across days)
                if (data.customSupplements && Array.isArray(data.customSupplements)) {
                    setCustomSupplements(data.customSupplements);
                }

                if (data.medsDate === todayStr) {
                    setMeds(data.meds || { vitaminD: false, iron: false, custom: {} });
                } else {
                    // Reset for new day — keep custom supplement keys but set all to false
                    const customKeys = data.customSupplements
                        ? (data.customSupplements as CustomSupplement[]).reduce((acc: Record<string, boolean>, s) => {
                            acc[s.id] = false;
                            return acc;
                        }, {})
                        : {};
                    const resetMeds: MedicationsState = { vitaminD: false, iron: false, custom: customKeys };
                    setMeds(resetMeds);
                    await updateDoc(childRef, { meds: resetMeds, medsDate: todayStr });
                }
            }
        } catch (e) {
            logger.log('Med refresh error:', e);
        }
    }, [childId]);

    return {
        meds,
        toggleMed,
        syncStatus,
        refresh,
        customSupplements,
        addCustomSupplement,
        removeCustomSupplement,
        totalCount,
        takenCount,
    };
};

export default useMedications;
