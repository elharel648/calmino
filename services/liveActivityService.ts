import { NativeModules, Platform } from 'react-native';

const { ActivityKitManager } = NativeModules;

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

    isLiveActivitySupported: () => Promise<boolean>;
}

class LiveActivityServiceClass implements LiveActivityService {
    private isSupported: boolean = false;
    private activityId: string | null = null;

    constructor() {
        if (Platform.OS === 'ios') {
            this.checkSupport();
        }
    }

    private async checkSupport() {
        try {
            if (ActivityKitManager) {
                this.isSupported = await ActivityKitManager.isLiveActivitySupported();
            }
        } catch (error) {
            if (__DEV__) {
                console.warn('Live Activity not supported:', error);
            }
            this.isSupported = false;
        }
    }

    // MARK: - Pumping Timer
    async startPumpingTimer(parentName: string = 'הורה', childName: string = 'תינוק'): Promise<string> {
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startPumpingTimer(parentName, childName);
            this.activityId = id;
            if (__DEV__) console.log('✅ Pumping Live Activity started:', id);
            return id;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to start Pumping Live Activity:', error);
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
            await ActivityKitManager.stopPumpingTimer();
            this.activityId = null;
            if (__DEV__) console.log('✅ Pumping Live Activity stopped');
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to stop Pumping Live Activity:', error);
            return false;
        }
    }

    // MARK: - Bottle Timer
    async startBottleTimer(parentName: string = 'הורה', childName: string = 'תינוק'): Promise<string> {
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            // Reusing pumping timer native method for bottle if specific method not available
            // Note: If you have a specific startBottleTimer in native module, use that instead.
            // For now assuming we might need to add native support or reuse existing.
            // Safe bet: Use startPumpingTimer as a fallback if bottle specific doesn't exist yet, 
            // OR if you plan to update native code, use new method name.
            // Given I cannot edit native code right now, I will warn if native method missing.

            if (ActivityKitManager.startBottleTimer) {
                const id = await ActivityKitManager.startBottleTimer(parentName, childName);
                this.activityId = id;
                if (__DEV__) console.log('✅ Bottle Live Activity started:', id);
                return id;
            } else {
                console.warn('startBottleTimer not implemented in native module');
                return '';
            }
        } catch (error: any) {
            if (__DEV__) console.error('Failed to start Bottle Live Activity:', error);
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
            if (ActivityKitManager.stopBottleTimer) {
                await ActivityKitManager.stopBottleTimer();
                this.activityId = null;
                if (__DEV__) console.log('✅ Bottle Live Activity stopped');
                return true;
            } else {
                console.warn('stopBottleTimer not implemented in native module');
                return false;
            }
        } catch (error: any) {
            if (__DEV__) console.error('Failed to stop Bottle Live Activity:', error);
            return false;
        }
    }

    // MARK: - Sleep Timer
    async startSleepTimer(parentName: string = 'הורה', childName: string = 'תינוק'): Promise<string> {
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startSleepTimer(parentName, childName);
            this.activityId = id;
            if (__DEV__) console.log('✅ Sleep Live Activity started:', id);
            return id;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to start Sleep Live Activity:', error);
            throw error;
        }
    }

    async updateSleepTimer(elapsedSeconds: number): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            await ActivityKitManager.updateSleepTimer(elapsedSeconds);
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to update Sleep Live Activity:', error);
            return false;
        }
    }

    async stopSleepTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopSleepTimer();
            this.activityId = null;
            if (__DEV__) console.log('✅ Sleep Live Activity stopped');
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to stop Sleep Live Activity:', error);
            return false;
        }
    }

    // MARK: - Breastfeeding Timer
    async startBreastfeedingTimer(parentName: string = 'הורה', childName: string = 'תינוק', side: 'left' | 'right' = 'left'): Promise<string> {
        if (!this.isSupported || !ActivityKitManager) {
            throw new Error('Live Activities not supported');
        }

        try {
            const id = await ActivityKitManager.startBreastfeedingTimer(parentName, childName, side);
            this.activityId = id;
            if (__DEV__) console.log('✅ Breastfeeding Live Activity started:', id);
            return id;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to start Breastfeeding Live Activity:', error);
            throw error;
        }
    }

    async updateBreastfeedingTimer(elapsedSeconds: number, side?: 'left' | 'right'): Promise<boolean> {
        // For breastfeeding, we can use the same update mechanism
        // The Swift code will handle the side display
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            // Use updatePumpingTimer as a generic update method
            await ActivityKitManager.updatePumpingTimer(elapsedSeconds);
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to update Breastfeeding Live Activity:', error);
            return false;
        }
    }

    async stopBreastfeedingTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager) {
            return false;
        }

        try {
            await ActivityKitManager.stopBreastfeedingTimer();
            this.activityId = null;
            if (__DEV__) console.log('✅ Breastfeeding Live Activity stopped');
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to stop Breastfeeding Live Activity:', error);
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
            if (__DEV__) console.log('✅ Live Activity paused');
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to pause Live Activity:', error);
            return false;
        }
    }

    async resumeTimer(): Promise<boolean> {
        if (!this.isSupported || !ActivityKitManager || !this.activityId) {
            return false;
        }

        try {
            await ActivityKitManager.resumeTimer();
            if (__DEV__) console.log('✅ Live Activity resumed');
            return true;
        } catch (error: any) {
            if (__DEV__) console.error('Failed to resume Live Activity:', error);
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
}

export const liveActivityService = new LiveActivityServiceClass();
