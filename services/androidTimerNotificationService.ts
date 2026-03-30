import { Platform, NativeModules } from 'react-native';
import { logger } from '../utils/logger';

// Lazy-load notifee to prevent iOS crash from importing Android-only native modules
let notifee: any = null;
let AndroidImportance: any = null;
let EventType: any = null;

const loadNotifee = async () => {
    if (notifee) return;
    if (Platform.OS !== 'android') return;
    // Guard against OTA update crash on older native builds missing the Notifee module
    if (!NativeModules.NotifeeApiModule) return;
    
    try {
        const mod = await import('@notifee/react-native');
        notifee = mod.default;
        AndroidImportance = mod.AndroidImportance;
        EventType = mod.EventType;
    } catch (e) {
        logger.warn('Notifee not available:', e);
    }
};

const CHANNEL_ID = 'calmino-timer';
const NOTIFICATION_ID = 'calmino-active-timer';

// Timer type labels in Hebrew
const TIMER_LABELS: Record<string, { title: string; emoji: string }> = {
    sleep: { title: 'שינה', emoji: '😴' },
    pumping: { title: 'שאיבה', emoji: '🍼' },
    bottle: { title: 'בקבוק', emoji: '🍶' },
    breastfeeding: { title: 'הנקה', emoji: '🤱' },
    'breastfeeding-left': { title: 'הנקה (שמאל)', emoji: '🤱' },
    'breastfeeding-right': { title: 'הנקה (ימין)', emoji: '🤱' },
    whitenoise: { title: 'רעש לבן', emoji: '🎵' },
};

class AndroidTimerNotificationService {
    private currentTimerType: string | null = null;
    private timerStartTime: number | null = null;
    private isPaused: boolean = false;

    /**
     * Ensure the notification channel exists (must be called before displaying)
     */
    private async ensureChannel(): Promise<void> {
        await loadNotifee();
        if (!notifee) return;

        await notifee.createChannel({
            id: CHANNEL_ID,
            name: 'טיימר פעיל',
            description: 'נוטיפיקציה חיה בזמן שטיימר רץ',
            importance: AndroidImportance?.HIGH || 4,
            // Prevent sound on every update
            sound: '',
        });
    }

    /**
     * Start a persistent timer notification
     */
    async startTimer(timerType: string, childName: string = 'תינוק'): Promise<string> {
        if (Platform.OS !== 'android') return '';

        try {
            await this.ensureChannel();
            if (!notifee) return '';

            this.currentTimerType = timerType;
            this.timerStartTime = Date.now();
            this.isPaused = false;

            const label = TIMER_LABELS[timerType] || { title: timerType, emoji: '⏱' };

            await notifee.displayNotification({
                id: NOTIFICATION_ID,
                title: `${label.emoji} ${label.title}`,
                body: `${childName} • טיימר פעיל`,
                android: {
                    channelId: CHANNEL_ID,
                    asForegroundService: true,
                    ongoing: true,
                    showChronometer: true,
                    chronometerDirection: 'up',
                    timestamp: this.timerStartTime,
                    smallIcon: 'ic_notification', // Falls back to app icon if missing
                    color: '#6366F1',
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    actions: [
                        {
                            title: '⏸ השהה',
                            pressAction: { id: 'pause' },
                        },
                        {
                            title: '⏹ עצור',
                            pressAction: { id: 'stop' },
                        },
                    ],
                },
            });

            logger.log(`✅ Android Timer Notification started: ${timerType}`);
            return NOTIFICATION_ID;
        } catch (error) {
            logger.error('Failed to start Android timer notification:', error);
            return '';
        }
    }

    /**
     * Pause the active timer notification
     */
    async pauseTimer(): Promise<boolean> {
        if (Platform.OS !== 'android' || !this.currentTimerType) return false;

        try {
            await loadNotifee();
            if (!notifee) return false;

            this.isPaused = true;
            const label = TIMER_LABELS[this.currentTimerType] || { title: this.currentTimerType, emoji: '⏱' };

            await notifee.displayNotification({
                id: NOTIFICATION_ID,
                title: `${label.emoji} ${label.title} (מושהה)`,
                body: 'טיימר מושהה',
                android: {
                    channelId: CHANNEL_ID,
                    asForegroundService: true,
                    ongoing: true,
                    showChronometer: false, // Stop the chronometer display
                    smallIcon: 'ic_notification',
                    color: '#F59E0B',
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    actions: [
                        {
                            title: '▶️ המשך',
                            pressAction: { id: 'resume' },
                        },
                        {
                            title: '⏹ עצור',
                            pressAction: { id: 'stop' },
                        },
                    ],
                },
            });

            logger.log('✅ Android Timer Notification paused');
            return true;
        } catch (error) {
            logger.error('Failed to pause Android timer notification:', error);
            return false;
        }
    }

    /**
     * Resume the paused timer notification
     */
    async resumeTimer(): Promise<boolean> {
        if (Platform.OS !== 'android' || !this.currentTimerType) return false;

        try {
            await loadNotifee();
            if (!notifee) return false;

            this.isPaused = false;
            // Reset the chronometer start to account for paused time
            this.timerStartTime = Date.now();
            const label = TIMER_LABELS[this.currentTimerType] || { title: this.currentTimerType, emoji: '⏱' };

            await notifee.displayNotification({
                id: NOTIFICATION_ID,
                title: `${label.emoji} ${label.title}`,
                body: 'טיימר פעיל',
                android: {
                    channelId: CHANNEL_ID,
                    asForegroundService: true,
                    ongoing: true,
                    showChronometer: true,
                    chronometerDirection: 'up',
                    timestamp: this.timerStartTime,
                    smallIcon: 'ic_notification',
                    color: '#6366F1',
                    pressAction: {
                        id: 'default',
                        launchActivity: 'default',
                    },
                    actions: [
                        {
                            title: '⏸ השהה',
                            pressAction: { id: 'pause' },
                        },
                        {
                            title: '⏹ עצור',
                            pressAction: { id: 'stop' },
                        },
                    ],
                },
            });

            logger.log('✅ Android Timer Notification resumed');
            return true;
        } catch (error) {
            logger.error('Failed to resume Android timer notification:', error);
            return false;
        }
    }

    /**
     * Stop and dismiss the timer notification
     */
    async stopTimer(): Promise<boolean> {
        if (Platform.OS !== 'android') return false;

        try {
            await loadNotifee();
            if (!notifee) return false;

            await notifee.stopForegroundService();
            await notifee.cancelNotification(NOTIFICATION_ID);
            
            this.currentTimerType = null;
            this.timerStartTime = null;
            this.isPaused = false;

            logger.log('✅ Android Timer Notification stopped');
            return true;
        } catch (error) {
            logger.error('Failed to stop Android timer notification:', error);
            return false;
        }
    }

    // --- Convenience wrappers matching liveActivityService API ---

    async startSleepTimer(parentName?: string, childName?: string): Promise<string> {
        return this.startTimer('sleep', childName);
    }

    async stopSleepTimer(): Promise<boolean> {
        return this.stopTimer();
    }

    async startPumpingTimer(parentName?: string, childName?: string): Promise<string> {
        return this.startTimer('pumping', childName);
    }

    async stopPumpingTimer(): Promise<boolean> {
        return this.stopTimer();
    }

    async startBottleTimer(parentName?: string, childName?: string): Promise<string> {
        return this.startTimer('bottle', childName);
    }

    async stopBottleTimer(): Promise<boolean> {
        return this.stopTimer();
    }

    async startBreastfeedingTimer(parentName?: string, childName?: string, side?: 'left' | 'right'): Promise<string> {
        const type = side === 'right' ? 'breastfeeding-right' : 'breastfeeding-left';
        return this.startTimer(type, childName);
    }

    async stopBreastfeedingTimer(): Promise<boolean> {
        return this.stopTimer();
    }

    async startWhiteNoise(soundId: string, soundName: string): Promise<string> {
        return this.startTimer('whitenoise', soundName);
    }

    async stopWhiteNoise(): Promise<boolean> {
        return this.stopTimer();
    }

    /** Stop everything — cleanup on cold launch */
    async stopAll(): Promise<void> {
        await this.stopTimer();
    }

    get isTimerActive(): boolean {
        return this.currentTimerType !== null;
    }
}

export const androidTimerNotificationService = new AndroidTimerNotificationService();
