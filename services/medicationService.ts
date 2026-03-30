import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Medication } from '../types/home';
import { logger } from '../utils/logger';
import * as Notifications from 'expo-notifications';
import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

// ══════════════════════════════════════════════════════════════════════════════
// Medication Service — CRUD + Notification Scheduling + Calendar Integration
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

        // Fire and forget to avoid hanging offline
        setDoc(doc(db, 'babies', babyId, 'medications', medId), medication).catch(e => logger.warn('Deferred setDoc failed:', e));

        // Schedule notifications if enabled
        if (medication.remindersEnabled) {
            await scheduleMedicationNotifications(medication);
            // Also add to native calendar
            await addMedicationToCalendar(medication);
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

        // Fire and forget to avoid hanging offline
        deleteDoc(doc(db, 'babies', babyId, 'medications', medId)).catch(e => logger.warn('Deferred deleteDoc failed:', e));
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
        // Fire and forget to avoid hanging offline
        updateDoc(doc(db, 'babies', babyId), {
            healthLog: arrayUnion(entry),
        }).catch(e => logger.warn('Deferred updateDoc failed:', e));
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

// ══════════════════════════════════════════════════════════════════════════════
// Native Calendar Integration
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a writable calendar ID (same pattern as notificationService.addToCalendar)
 */
const getWritableCalendarId = async (): Promise<string | null> => {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
            logger.log('📅 Calendar permission denied');
            return null;
        }

        if (Platform.OS === 'ios') {
            try {
                const defaultCal = await Calendar.getDefaultCalendarAsync();
                return defaultCal.id;
            } catch {
                const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
                const writable = calendars.find(c => c.allowsModifications);
                return writable?.id || null;
            }
        } else {
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            const cal = calendars.find(c => c.isPrimary && c.allowsModifications)
                || calendars.find(c => c.allowsModifications)
                || calendars[0];
            return cal?.id || null;
        }
    } catch (error) {
        logger.log('Error getting calendar:', error);
        return null;
    }
};

/**
 * Add medication reminders to the native calendar
 * Creates a daily recurring event for each scheduled time
 */
export const addMedicationToCalendar = async (med: Medication): Promise<boolean> => {
    try {
        const calendarId = await getWritableCalendarId();
        if (!calendarId) {
            // Silently skip if no calendar access — notifications still work
            logger.log('📅 Skipping calendar events — no writable calendar');
            return false;
        }

        for (const time of med.times) {
            const [hours, minutes] = time.split(':').map(Number);

            // Create start date for today at the specified time
            const startDate = new Date();
            startDate.setHours(hours, minutes, 0, 0);

            // If time already passed today, start tomorrow
            if (startDate < new Date()) {
                startDate.setDate(startDate.getDate() + 1);
            }

            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + 15);

            await Calendar.createEventAsync(calendarId, {
                title: `💊 ${med.name}`,
                notes: `מינון: ${med.dosage}${med.notes ? `\n${med.notes}` : ''}\n\n⚠️ מידע כללי בלבד. יש להתייעץ עם רופא.`,
                startDate,
                endDate,
                timeZone: 'Asia/Jerusalem',
                alarms: [{ relativeOffset: -15 }], // Alert 15 min before
                recurrenceRule: {
                    frequency: Calendar.Frequency.DAILY,
                    occurrence: 365, // Repeat for a year
                },
            });
        }

        logger.log(`📅 Added ${med.times.length} calendar events for ${med.name}`);
        return true;
    } catch (error) {
        logger.log('Error adding medication to calendar:', error);
        return false;
    }
};

export default {
    addMedication,
    getMedications,
    deleteMedication,
    logMedicationTaken,
    scheduleMedicationNotifications,
    cancelMedicationNotifications,
    addMedicationToCalendar,
};
