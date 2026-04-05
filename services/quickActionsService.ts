/**
 * Quick Actions Live Activity Service
 * Manages Meal and Sleep Live Activities
 */

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { logger } from '../utils/logger';

let ActivityKitManager: any = null;
if (Platform.OS === 'ios') {
    try { ActivityKitManager = requireNativeModule('ActivityKitManager'); } catch { /* native module not available */ }
}

class QuickActionsService {
    private mealActivityId: string | null = null;
    private sleepActivityId: string | null = null;
    private breastfeedingActivityId: string | null = null;

    // ===========================
    // Meal Methods
    // ===========================

    /**
     * Start a meal Live Activity
     * @param babyName - Name of the baby
     * @param babyEmoji - Emoji representing the baby
     * @param mealType - Type of meal (e.g., "ארוחת בוקר", "צהריים", "ערב")
     * @param foodItems - Array of food items
     * @returns Activity ID if successful
     */
    private async stopAllLiveActivities() {
        if (!ActivityKitManager) return;
        await Promise.allSettled([
            ActivityKitManager.stopMeal?.(),
            ActivityKitManager.stopSleep?.(),
            ActivityKitManager.stopBreastfeeding?.(),
            ActivityKitManager.stopWhiteNoise?.(),
        ]);
        this.mealActivityId = null;
        this.sleepActivityId = null;
        this.breastfeedingActivityId = null;
    }

    private async safeStartActivity(startFn: () => Promise<string>, activityName: string, idSetter: (id: string) => void): Promise<string | null> {
        if (!ActivityKitManager) return null;
        try {
            const id = await startFn();
            idSetter(id);
            logger.info(`✅ ${activityName} Live Activity started:`, id);
            return id;
        } catch (error: any) {
            logger.warn(`Live Activity limit triggered for ${activityName}. Force stopping existing activities and retrying...`);
            try {
                await this.stopAllLiveActivities();
                // Brief pause to allow OS cleanup
                await new Promise(resolve => setTimeout(resolve, 350));
                
                const retryId = await startFn();
                idSetter(retryId);
                logger.info(`✅ ${activityName} Live Activity started on retry:`, retryId);
                return retryId;
            } catch (retryError) {
                logger.warn(`Could not start ${activityName} Live Activity even after retry. Proceeding without it.`);
                return null;
            }
        }
    }

    /**
     * Start a meal Live Activity
     * @param babyName - Name of the baby
     * @param babyEmoji - Emoji representing the baby
     * @param mealType - Type of meal (e.g., "ארוחת בוקר", "צהריים", "ערב")
     * @param foodItems - Array of food items
     * @param progress - Initial progress (0.0 to 1.0)
     * @returns Activity ID if successful
     */
    async startMeal(
        babyName: string,
        babyEmoji: string,
        mealType: string,
        foodItems: string[],
        progress: number = 0
    ): Promise<string | null> {
        if (Platform.OS !== 'ios') {
            logger.warn('Live Activities are only supported on iOS');
            return null;
        }

        if (!ActivityKitManager) {
            logger.warn('ActivityKitManager native module not available');
            return null;
        }

        // End any existing meal activity before starting a new one
        if (this.mealActivityId) {
            try {
                await ActivityKitManager.stopMeal();
                this.mealActivityId = null;
                logger.info('🍽️ Stopped existing Meal Live Activity before starting new one');
            } catch {
                this.mealActivityId = null;
            }
        }

        return this.safeStartActivity(
            () => ActivityKitManager.startMeal(babyName, babyEmoji, mealType, foodItems, progress),
            'Meal',
            (id) => { this.mealActivityId = id; }
        );
    }

    /**
     * Update meal progress and food items
     * @param progress - Progress value (0.0 to 1.0)
     * @param foodItems - Updated array of food items
     */
    async updateMeal(progress: number, foodItems: string[]): Promise<boolean> {
        if (!this.mealActivityId) {
            logger.warn('No active meal to update');
            return false;
        }

        try {
            await ActivityKitManager.updateMeal(progress, foodItems);
            logger.info('🍽️ Meal updated:', { progress, foodItems });
            return true;
        } catch (error: any) {
            logger.error('Failed to update Meal:', error);
            return false;
        }
    }

    /**
     * Stop the meal Live Activity
     */
    async stopMeal(): Promise<boolean> {
        if (!this.mealActivityId) {
            logger.warn('No active meal to stop');
            return false;
        }

        try {
            await ActivityKitManager.stopMeal();
            this.mealActivityId = null;
            logger.info('🍽️ Meal Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Meal:', error);
            return false;
        }
    }

    // ===========================
    // Sleep Methods
    // ===========================

    /**
     * Start a sleep Live Activity
     * @param babyName - Name of the baby
     * @param babyEmoji - Emoji representing the baby
     * @param sleepType - Type of sleep (e.g., "תנומת צהריים", "שינת לילה")
     * @returns Activity ID if successful
     */
    async startSleep(
        babyName: string,
        babyEmoji: string,
        sleepType: string
    ): Promise<string | null> {
        if (Platform.OS !== 'ios') {
            logger.warn('Live Activities are only supported on iOS');
            return null;
        }

        return this.safeStartActivity(
            () => ActivityKitManager.startSleep(babyName, babyEmoji, sleepType, false),
            'Sleep',
            (id) => { this.sleepActivityId = id; }
        );
    }

    /**
     * Mark baby as awake
     * @param quality - Optional sleep quality ("טוב", "בינוני", "גרוע")
     */
    async wakeUp(quality?: 'טוב' | 'בינוני' | 'גרוע'): Promise<boolean> {
        if (!this.sleepActivityId) {
            logger.warn('No active sleep to wake up from');
            return false;
        }

        try {
            await ActivityKitManager.wakeUp(quality || null);
            logger.info('😴 Baby woke up:', { quality });
            return true;
        } catch (error: any) {
            logger.error('Failed to wake up:', error);
            return false;
        }
    }

    /**
     * Pause the sleep Live Activity
     */
    async pauseSleep(): Promise<boolean> {
        if (!this.sleepActivityId) return false;
        try {
            await ActivityKitManager.pauseSleep();
            logger.info('😴 Sleep Live Activity paused');
            return true;
        } catch (error: any) {
            logger.error('Failed to pause Sleep:', error);
            return false;
        }
    }

    /**
     * Resume the sleep Live Activity
     */
    async resumeSleep(): Promise<boolean> {
        if (!this.sleepActivityId) return false;
        try {
            await ActivityKitManager.resumeSleep();
            logger.info('😴 Sleep Live Activity resumed');
            return true;
        } catch (error: any) {
            logger.error('Failed to resume Sleep:', error);
            return false;
        }
    }

    /**
     * Stop the sleep Live Activity
     */
    async stopSleep(): Promise<boolean> {
        if (!this.sleepActivityId) {
            logger.warn('No active sleep to stop');
            return false;
        }

        try {
            await ActivityKitManager.stopSleep();
            this.sleepActivityId = null;
            logger.info('😴 Sleep Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Sleep:', error);
            return false;
        }
    }

    // ===========================
    // Breastfeeding Methods
    // ===========================

    async startBreastfeeding(babyName: string, side: 'left' | 'right' = 'left'): Promise<string | null> {
        if (Platform.OS !== 'ios') return null;
        return this.safeStartActivity(
            () => ActivityKitManager.startBreastfeeding(babyName, side),
            `Breastfeeding (${side})`,
            (id) => { this.breastfeedingActivityId = id; }
        );
    }

    async pauseBreastfeeding(): Promise<boolean> {
        if (!this.breastfeedingActivityId) return false;
        try {
            await ActivityKitManager.pauseBreastfeeding();
            logger.info('🤱 Breastfeeding paused');
            return true;
        } catch (error: any) {
            logger.error('Failed to pause Breastfeeding:', error);
            return false;
        }
    }

    async resumeBreastfeeding(): Promise<boolean> {
        if (!this.breastfeedingActivityId) return false;
        try {
            await ActivityKitManager.resumeBreastfeeding();
            logger.info('🤱 Breastfeeding resumed');
            return true;
        } catch (error: any) {
            logger.error('Failed to resume Breastfeeding:', error);
            return false;
        }
    }

    async switchBreastSide(newSide: 'left' | 'right'): Promise<boolean> {
        if (!this.breastfeedingActivityId) return false;
        try {
            await ActivityKitManager.switchBreastSide(newSide);
            logger.info('🤱 Switched breast side to:', newSide);
            return true;
        } catch (error: any) {
            logger.error('Failed to switch breast side:', error);
            return false;
        }
    }

    async stopBreastfeeding(): Promise<boolean> {
        if (!this.breastfeedingActivityId) return false;
        try {
            await ActivityKitManager.stopBreastfeeding();
            this.breastfeedingActivityId = null;
            logger.info('🤱 Breastfeeding Live Activity stopped');
            return true;
        } catch (error: any) {
            logger.error('Failed to stop Breastfeeding:', error);
            return false;
        }
    }

    isBreastfeedingActive(): boolean {
        return this.breastfeedingActivityId !== null;
    }

    // ===========================
    // Utility Methods
    // ===========================

    /**
     * Check if Live Activities are supported
     */
    async isSupported(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
            return false;
        }

        try {
            return await ActivityKitManager.isLiveActivitySupported();
        } catch (error) {
            return false;
        }
    }

    /**
     * Get active meal activity ID
     */
    getMealActivityId(): string | null {
        return this.mealActivityId;
    }

    /**
     * Get active sleep activity ID
     */
    getSleepActivityId(): string | null {
        return this.sleepActivityId;
    }

    /**
     * Check if meal is active
     */
    isMealActive(): boolean {
        return this.mealActivityId !== null;
    }

    /**
     * Check if sleep is active
     */
    isSleepActive(): boolean {
        return this.sleepActivityId !== null;
    }
}

export default new QuickActionsService();
