import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Medication } from '../types/home';
import { logger } from '../utils/logger';
import * as Notifications from 'expo-notifications';

// ══════════════════════════════════════════════════════════════════════════════
// Medication Service — CRUD + Notification Scheduling
// Stores medications in babies/{babyId}/medications subcollection
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Add a new medication for a child
 */
export const addMedication = async (babyId: string, med: Omit<Medication, 'id' | 'createdAt'>): Promise<Medication | null> => {
    try {
        const medId = `med_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const medication: Medication = {
            ...med,
            id: medId,
            createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'babies', babyId, 'medications', medId), medication);

        // Schedule notifications if enabled
        if (medication.remindersEnabled) {
            await scheduleMedicationNotifications(medication);
        }

        logger.log('💊 Medication added:', medication.name);
        return medication;
    } catch (error) {
        logger.log('Error adding medication:', error);
        return null;
    }
};

/**
 * Get all medications for a child
 */
export const getMedications = async (babyId: string): Promise<Medication[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'babies', babyId, 'medications'));
        const meds: Medication[] = [];
        snapshot.forEach(docSnap => {
            meds.push(docSnap.data() as Medication);
        });
        // Sort by creation date (newest first)
        meds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return meds;
    } catch (error) {
        logger.log('Error getting medications:', error);
        return [];
    }
};

/**
 * Delete a medication
 */
export const deleteMedication = async (babyId: string, medId: string): Promise<boolean> => {
    try {
        // Cancel notifications for this medication
        await cancelMedicationNotifications(medId);

        await deleteDoc(doc(db, 'babies', babyId, 'medications', medId));
        logger.log('💊 Medication deleted:', medId);
        return true;
    } catch (error) {
        logger.log('Error deleting medication:', error);
        return false;
    }
};

/**
 * Log that a medication was taken — adds to the healthLog array
 */
export const logMedicationTaken = async (babyId: string, med: Medication): Promise<boolean> => {
    try {
        const entry = {
            type: 'medication',
            name: med.name,
            note: `מינון: ${med.dosage}${med.notes ? ` | ${med.notes}` : ''}`,
            timestamp: new Date().toISOString(),
        };
        await updateDoc(doc(db, 'babies', babyId), {
            healthLog: arrayUnion(entry),
        });
        logger.log('💊 Medication taken logged:', med.name);
        return true;
    } catch (error) {
        logger.log('Error logging medication taken:', error);
        return false;
    }
};

// ══════════════════════════════════════════════════════════════════════════════
// Notification Scheduling
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Schedule daily repeating notifications for a medication
 */
export const scheduleMedicationNotifications = async (med: Medication): Promise<void> => {
    try {
        for (let i = 0; i < med.times.length; i++) {
            const time = med.times[i];
            const [hours, minutes] = time.split(':').map(Number);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💊 תזכורת תרופה',
                    body: `הגיע הזמן לקחת ${med.name} (${med.dosage})`,
                    data: { type: 'medication_reminder', medicationId: med.id },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DAILY,
                    hour: hours,
                    minute: minutes,
                },
            });
        }
        logger.log(`💊 Scheduled ${med.times.length} notifications for ${med.name}`);
    } catch (error) {
        logger.log('Error scheduling medication notifications:', error);
    }
};

/**
 * Cancel all notifications for a medication
 */
export const cancelMedicationNotifications = async (medId: string): Promise<void> => {
    try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notif of allNotifications) {
            if (notif.content.data?.medicationId === medId) {
                await Notifications.cancelScheduledNotificationAsync(notif.identifier);
            }
        }
        logger.log(`💊 Cancelled notifications for medication ${medId}`);
    } catch (error) {
        logger.log('Error cancelling medication notifications:', error);
    }
};

export default {
    addMedication,
    getMedications,
    deleteMedication,
    logMedicationTaken,
    scheduleMedicationNotifications,
    cancelMedicationNotifications,
};
