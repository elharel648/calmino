import { logger } from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import quickActionsService from '../services/quickActionsService';
import { useActiveChild } from '../context/ActiveChildContext';

interface SleepTimerState {
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    startTime: Date | null;
    activityId?: string;
}

const INITIAL_STATE: SleepTimerState = {
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    startTime: null,
};

interface SleepTimerContextType extends SleepTimerState {
    start: () => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    formatTime: (seconds: number) => string;
}

const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined);

export const useSleepTimer = () => {
    const context = useContext(SleepTimerContext);
    if (!context) {
        throw new Error('useSleepTimer must be used within SleepTimerProvider');
    }
    return context;
};

interface SleepTimerProviderProps {
    children: ReactNode;
}

export const SleepTimerProvider = ({ children }: SleepTimerProviderProps) => {
    const { activeChild } = useActiveChild();
    const activeChildId = activeChild?.childId;

    // Map of childId -> SleepTimerState
    const [timers, setTimers] = useState<Record<string, SleepTimerState>>({});
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get current child state or initial state
    const currentState = activeChildId && timers[activeChildId] ? timers[activeChildId] : INITIAL_STATE;

    // Global timer effect - iterates all running timers
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimers(prevTimers => {
                const nextTimers = { ...prevTimers };
                let hasChanges = false;

                Object.keys(nextTimers).forEach(childId => {
                    const timer = nextTimers[childId];
                    if (timer.isRunning && !timer.isPaused) {
                        nextTimers[childId] = {
                            ...timer,
                            elapsedSeconds: timer.elapsedSeconds + 1
                        };
                        hasChanges = true;
                    }
                });

                return hasChanges ? nextTimers : prevTimers;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const updateChildState = useCallback((childId: string, updates: Partial<SleepTimerState>) => {
        setTimers(prev => ({
            ...prev,
            [childId]: {
                ...(prev[childId] || INITIAL_STATE),
                ...updates
            }
        }));
    }, []);

    const start = useCallback(async () => {
        if (!activeChildId) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }

        // Update state immediately so UI responds — don't await Live Activity
        updateChildState(activeChildId, {
            isRunning: true,
            isPaused: false,
            startTime: new Date(),
            elapsedSeconds: 0,
        });

        // Start iOS Live Activity in background (fire-and-forget)
        if (Platform.OS === 'ios' && activeChild) {
            quickActionsService.startSleep(activeChild.childName, '👶', 'שינה')
                .then(() => logger.log('✅ Sleep Live Activity started for child:', activeChildId))
                .catch(error => logger.warn('⚠️ Sleep Live Activity not supported:', error));
        }
    }, [activeChildId, activeChild?.childName, updateChildState]);

    const stop = useCallback(async () => {
        if (!activeChildId) return;

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Get activity ID from current state before clearing
        const activityId = timers[activeChildId]?.activityId;

        updateChildState(activeChildId, {
            isRunning: false,
            isPaused: false,
            activityId: undefined // Clear activity ID
        });

        // Stop iOS Live Activity
        if (Platform.OS === 'ios') {
            try {
                await quickActionsService.stopSleep();
                logger.log('✅ Sleep Live Activity stopped');
            } catch (error) {
                logger.warn('⚠️ Error stopping Sleep Live Activity:', error);
            }
        }
    }, [activeChildId, updateChildState, timers]);

    const pause = useCallback(async () => {
        if (!activeChildId) return;
        const timer = timers[activeChildId];
        if (!timer?.isRunning || timer?.isPaused) return;

        updateChildState(activeChildId, { isPaused: true });

        if (Platform.OS === 'ios') {
            try {
                await quickActionsService.pauseSleep();
            } catch (error) {
                logger.warn('⚠️ Error pausing Sleep Live Activity:', error);
            }
        }
    }, [activeChildId, timers, updateChildState]);

    const resume = useCallback(async () => {
        if (!activeChildId) return;
        const timer = timers[activeChildId];
        if (!timer?.isRunning || !timer?.isPaused) return;

        updateChildState(activeChildId, { isPaused: false });

        if (Platform.OS === 'ios') {
            try {
                await quickActionsService.resumeSleep();
            } catch (error) {
                logger.warn('⚠️ Error resuming Sleep Live Activity:', error);
            }
        }
    }, [activeChildId, timers, updateChildState]);

    // Note: Live Activity updates automatically via iOS system
    // No manual update needed

    const reset = useCallback(() => {
        if (!activeChildId) return;
        updateChildState(activeChildId, INITIAL_STATE);
    }, [activeChildId, updateChildState]);

    const formatTime = useCallback((seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
        <SleepTimerContext.Provider
            value={{
                ...currentState,
                start,
                stop,
                pause,
                resume,
                reset,
                formatTime,
            }}
        >
            {children}
        </SleepTimerContext.Provider>
    );
};

export default SleepTimerProvider;
