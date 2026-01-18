import { useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService, NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '../services/notificationService';
import { notificationStorageService } from '../services/notificationStorageService';
import { auth } from '../services/firebaseConfig';
import { navigateFromNotification } from '../services/navigationService';

interface UseNotificationsReturn {
    settings: NotificationSettings;
    isInitialized: boolean;
    hasPermission: boolean;
    updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
    scheduleFeedingReminder: (lastFeedingTime: Date) => Promise<void>;
    scheduleSupplementReminder: () => Promise<void>;
    scheduleVaccineReminder: (date: Date, name: string) => Promise<void>;
    scheduleSmartReminders: (childId: string) => Promise<void>;
    sendTestNotification: () => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    // Initialize on mount
    useEffect(() => {
        const init = async () => {
            const success = await notificationService.initialize();
            setHasPermission(success);
            setSettings(notificationService.getSettings());
            setIsInitialized(true);

            // Schedule recurring notifications
            if (success) {
                await notificationService.scheduleSupplementReminder();
                await notificationService.scheduleSleepReminder();
                await notificationService.scheduleDailySummary();
            }
        };

        init();

        // Listeners for when app is open
        notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
            if (__DEV__) console.log('🔔 Notification received:', notification);
            // Note: Saving to Firebase is handled in setNotificationHandler (works even when app is closed)
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
            if (__DEV__) console.log('🔔 Notification tapped:', response);

            // Mark as read when tapped
            // Note: We can't mark by notification ID since we don't have it here
            // The user will mark it as read when they see it in the notifications screen

            // Handle navigation based on notification type
            const type = response.notification.request.content.data?.type as string;
            const data = response.notification.request.content.data;

            // Import and navigate
            navigateFromNotification(type, data);
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    // Update settings
    const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
        await notificationService.saveSettings(newSettings);
        setSettings(prev => ({ ...prev, ...newSettings }));

        // Reschedule notifications based on new settings
        if (newSettings.feedingReminder !== undefined || newSettings.feedingIntervalHours !== undefined) {
            if (newSettings.feedingReminder === false) {
                await notificationService.cancelNotification('feeding_reminder');
            }
            // Feeding reminder is scheduled per-event, not here
        }

        if (newSettings.sleepReminder !== undefined || newSettings.sleepTime !== undefined) {
            if (newSettings.sleepReminder === false) {
                await notificationService.cancelNotification('sleep_reminder');
            } else {
                await notificationService.scheduleSleepReminder();
            }
        }

        if (newSettings.supplementReminder !== undefined || newSettings.supplementTime !== undefined) {
            if (newSettings.supplementReminder === false) {
                await notificationService.cancelNotification('supplement_reminder');
            } else {
                await notificationService.scheduleSupplementReminder();
            }
        }

        if (newSettings.dailySummary !== undefined || newSettings.dailySummaryTime !== undefined) {
            if (newSettings.dailySummary === false) {
                await notificationService.cancelNotification('daily_summary');
            } else {
                await notificationService.scheduleDailySummary();
            }
        }

        // If all notifications disabled, cancel all
        if (newSettings.enabled === false) {
            await notificationService.cancelAll();
        }
    }, []);

    // Schedule feeding reminder
    const scheduleFeedingReminder = useCallback(async (lastFeedingTime: Date) => {
        await notificationService.scheduleFeedingReminder(lastFeedingTime);
    }, []);

    // Schedule supplement reminder
    const scheduleSupplementReminder = useCallback(async () => {
        await notificationService.scheduleSupplementReminder();
    }, []);

    // Schedule vaccine reminder
    const scheduleVaccineReminder = useCallback(async (date: Date, name: string) => {
        await notificationService.scheduleVaccineReminder(date, name);
    }, []);

    // Schedule smart pattern-based reminders
    const scheduleSmartReminders = useCallback(async (childId: string) => {
        await notificationService.scheduleSmartReminders(childId);
    }, []);

    // Send test notification
    const sendTestNotification = useCallback(async () => {
        await notificationService.sendImmediate('feeding_reminder', 'זו התראת בדיקה! 🎉');
    }, []);

    return {
        settings,
        isInitialized,
        hasPermission,
        updateSettings,
        scheduleFeedingReminder,
        scheduleSupplementReminder,
        scheduleVaccineReminder,
        scheduleSmartReminders,
        sendTestNotification,
    };
};

export default useNotifications;
