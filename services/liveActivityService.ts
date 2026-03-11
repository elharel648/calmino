import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { logger } from '../utils/logger';

let ActivityKitManager: any = null;
if (Platform.OS === 'ios') {
    try { ActivityKitManager = requireNativeModule('ActivityKitManager'); } catch { /* native module not available */ }
}

interface LiveActivityService {
    // Pumping
    startPumpingTimer: (parentName?: string, childName?: string) => Promise<string>;
    updatePumpingTimer: (elapsedSeconds: number) => Promise<boolean>;
    stopPumpingTimer: () => Promise<boolean>;

    // Bottle
    startBottleTimer: (parentName?: string, childName?: string) => Promise<string>;
    updateBottleTimer: (elapsedSeconds: number) => Promise<boolean>;
    stopBottleTimer: () => Promise<boolean>;

    // Sleep
    startSleepTimer: (parentName?: string, childName?: string) => Promise<string>;
    updateSleepTimer: (elapsedSeconds: number) => Promise<boolean>;
    stopSleepTimer: () => Promise<boolean>;

    // Breastfeeding
    startBreastfeedingTimer: (parentName?: string, childName?: string, side?: 'left' | 'right') => Promise<string>;
    stopBreastfeedingTimer: () => Promise<boolean>;

    // Generic controls
    pauseTimer: () => Promise<boolean>;
    resumeTimer: () => Promise<boolean>;

    // Babysitter Shift
    startBabysitterShift: (babysitterName: string, hourlyRate: number) => Promise<string>;
    updateBabysitterShift: (isPaused: boolean, totalPausedSeconds: number) => Promise<boolean>;
    stopBabysitterShift: () => Promise<boolean>;

    // White Noise
    startWhiteNoise: (soundId: string, soundName: string) => Promise<string>;
    stopWhiteNoise: () => Promise<boolean>;

    isLiveActivitySupported: () => Promise<boolean>;
    updateWidgetData: (babyName: string, lastFeedTime: string, lastFeedAgo: string, lastSleepTime: string, lastSleepAgo: string, babyStatus: string) => Promise<boolean>;
}

class LiveActivityServiceClass implements LiveActivityService {
    private isSupported: boolean = false;
    private activityId: string | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        if (Platform.OS === 'ios') {
            // Store the promise so callers can await initialization
            this.initPromise = this.checkSupport();
        }
    }

    /** Ensures checkSupport() has completed before checking isSupported */
    async ensureInitialized(): Promise<void> {
        if (this.initPromise) {
            await this.initPromise;
        }
    }

    private async checkSupport() {
        try {
            if (ActivityKitManager) {
                this.isSupported = await ActivityKitManager.isLiveActivitySupported();
            }
        } catch (error) {
            logger.warn('Live Activity not supported:', error);
            this.isSupported = false;
        }
    }

    // MARK: - Pumping Timer
    async startPumpingTimer(parentName: string = 'הורה', childName: string = 'תינוק'): Promise<string> {
        await this.ensureInitialized();
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startMeal(childName, '', 'שאיבה', [], 0);
            this.activityId = id;
            logger.log('✅ Pumping Live Activity started:', id);
            return id;
        } catch (error: any) {
            logger.error('Failed to start Pumping Live Activity:', error);
            throw error;
        }
    }

    async updatePumpingTimer(elapsedSeconds: number): Promise<boolean> {
        // Timer auto-updates via SwiftUI - no action needed
        return true;
    }

    async stopPumpingTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopMeal();
            this.activityId = null;
            logger.log('✅ Pumping Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Pumping Live Activity:', error);
            return false;
        }
    }

    // MARK: - Bottle Timer
    async startBottleTimer(parentName: string = 'הורה', childName: string = 'תינוק'): Promise<string> {
        await this.ensureInitialized();
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startMeal(childName, '', 'בקבוק', [], 0);
            this.activityId = id;
            logger.log('✅ Bottle Live Activity started:', id);
            return id;
        } catch (error: any) {
            logger.error('Failed to start Bottle Live Activity:', error);
            throw error;
        }
    }

    async updateBottleTimer(elapsedSeconds: number): Promise<boolean> {
        // Timer auto-updates via SwiftUI - no action needed usually, but logic exists for others
        return true;
    }

    async stopBottleTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopMeal();
            this.activityId = null;
            logger.log('✅ Bottle Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Bottle Live Activity:', error);
            return false;
        }
    }

    // MARK: - Sleep Timer
    async startSleepTimer(parentName: string = 'הורה', childName: string = 'תינוק'): Promise<string> {
        await this.ensureInitialized();
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            // Updated to match ActivityKitModule.swift signature: (babyName, babyEmoji, sleepType, isAwake)
            const id = await ActivityKitManager.startSleep(childName, '', 'שינה', false);
            this.activityId = id;
            logger.log('✅ Sleep Live Activity started:', id);
            return id;
        } catch (error: any) {
            logger.error('Failed to start Sleep Live Activity:', error);
            throw error;
        }
    }

    async updateSleepTimer(elapsedSeconds: number): Promise<boolean> {
        return true;
    }

    async stopSleepTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopSleep();
            this.activityId = null;
            logger.log('✅ Sleep Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Sleep Live Activity:', error);
            return false;
        }
    }

    // MARK: - Breastfeeding Timer
    async startBreastfeedingTimer(parentName: string = 'הורה', childName: string = 'תינוק', side: 'left' | 'right' = 'left'): Promise<string> {
        await this.ensureInitialized();
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const mealType = side === 'left' ? 'breastfeeding-left' : 'breastfeeding-right';
            const id = await ActivityKitManager.startMeal(childName, '', mealType, [], 0);
            this.activityId = id;
            logger.log('✅ Breastfeeding Live Activity started:', id, side);
            return id;
        } catch (error: any) {
            logger.error('Failed to start Breastfeeding Live Activity:', error);
            throw error;
        }
    }

    async updateBreastfeedingTimer(elapsedSeconds: number, side?: 'left' | 'right'): Promise<boolean> {
        await this.ensureInitialized();
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            // Use the meal update method (breastfeeding uses the same meal Live Activity)
            await ActivityKitManager.updateMeal(elapsedSeconds);
            return true;
        } catch (error: any) {
            logger.error('Failed to update Breastfeeding Live Activity:', error);
            return false;
        }
    }

    async stopBreastfeedingTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopMeal();
            this.activityId = null;
            logger.log('✅ Breastfeeding Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Breastfeeding Live Activity:', error);
            return false;
        }
    }

    // MARK: - Generic Timer Controls
    async pauseTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            await ActivityKitManager.pauseTimer();
            logger.log('✅ Live Activity paused');
            return true;
        } catch (error: any) {
            logger.error('Failed to pause Live Activity:', error);
            return false;
        }
    }

    async resumeTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            await ActivityKitManager.resumeTimer();
            logger.log('✅ Live Activity resumed');
            return true;
        } catch (error: any) {
            logger.error('Failed to resume Live Activity:', error);
            return false;
        }
    }

    // MARK: - Babysitter Shift
    async startBabysitterShift(babysitterName: string, hourlyRate: number): Promise<string> {
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startBabysitterShift(babysitterName, hourlyRate);
            this.activityId = id;
            logger.log('✅ Babysitter Shift Live Activity started:', id);
            return id;
        } catch (error: any) {
            logger.error('Failed to start Babysitter Shift Live Activity:', error);
            throw error;
        }
    }

    async updateBabysitterShift(isPaused: boolean, totalPausedSeconds: number): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            await ActivityKitManager.updateBabysitterShift(isPaused, totalPausedSeconds);
            logger.log('✅ Babysitter Shift updated:', { isPaused, totalPausedSeconds });
            return true;
        } catch (error: any) {
            logger.error('Failed to update Babysitter Shift Live Activity:', error);
            return false;
        }
    }

    async stopBabysitterShift(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopBabysitterShift();
            this.activityId = null;
            logger.log('✅ Babysitter Shift Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Babysitter Shift Live Activity:', error);
            return false;
        }
    }

    // MARK: - White Noise
    async startWhiteNoise(soundId: string, soundName: string): Promise<string> {
        await this.ensureInitialized();
        if (!this.isSupported || !ActivityKitManager) return '';
        try {
            const id = await ActivityKitManager.startWhiteNoise(soundId, soundName);
            logger.log('✅ WhiteNoise Live Activity started:', id);
            return id;
        } catch (error: any) {
            logger.warn('Failed to start WhiteNoise Live Activity:', error);
            return '';
        }
    }

    async stopWhiteNoise(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) return false;
        try {
            const result = await ActivityKitManager.stopWhiteNoise();
            logger.log('✅ WhiteNoise Live Activity stopped');
            return result;
        } catch (error: any) {
            logger.warn('Failed to stop WhiteNoise Live Activity:', error);
            return false;
        }
    }

    // MARK: - Utility
    async isLiveActivitySupported(): Promise<boolean> {
        return this.isSupported;
    }

    get currentActivityId(): string | null {
        return this.activityId;
    }

    // MARK: - Widget Data
    async updateWidgetData(babyName: string, lastFeedTime: string, lastFeedAgo: string, lastSleepTime: string, lastSleepAgo: string, babyStatus: string): Promise<boolean> {
        if (!ActivityKitManager || Platform.OS !== 'ios') return false;
        try {
            return await ActivityKitManager.updateWidgetData(babyName, lastFeedTime, lastFeedAgo, lastSleepTime, lastSleepAgo, babyStatus);
        } catch {
            return false;
        }
    }
}

export const liveActivityService = new LiveActivityServiceClass();
