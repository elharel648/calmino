import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { liveActivityService } from '../services/liveActivityService';

interface SleepTimerContextType {
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
    startTime: Date | null;
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
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activityIdRef = useRef<string | undefined>(undefined);

    // Timer effect - keeps local state in sync
    useEffect(() => {
        if (isRunning && !isPaused) {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRunning, isPaused]);

    const start = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        setIsRunning(true);
        setIsPaused(false);
        setStartTime(new Date());
        setElapsedSeconds(0);

        // Start iOS Live Activity for Dynamic Island
        if (Platform.OS === 'ios') {
            try {
                const activityId = await liveActivityService.startSleepTimer('הורה', 'תינוק');
                if (activityId) {
                    activityIdRef.current = activityId;
                    if (__DEV__) console.log('✅ Sleep Live Activity started:', activityId);
                }
            } catch (error) {
                if (__DEV__) console.warn('⚠️ Sleep Live Activity not supported:', error);
            }
        }
    }, []);

    const stop = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setIsRunning(false);
        setIsPaused(false);

        // Stop iOS Live Activity
        if (Platform.OS === 'ios' && activityIdRef.current) {
            try {
                await liveActivityService.stopSleepTimer();
                activityIdRef.current = undefined;
                if (__DEV__) console.log('✅ Sleep Live Activity stopped');
            } catch (error) {
                if (__DEV__) console.warn('⚠️ Error stopping Sleep Live Activity:', error);
            }
        }
    }, []);

    const pause = useCallback(async () => {
        if (!isRunning || isPaused) return;
        
        setIsPaused(true);
        
        // Pause Live Activity
        if (Platform.OS === 'ios' && activityIdRef.current) {
            try {
                await liveActivityService.pauseTimer();
                if (__DEV__) console.log('✅ Sleep Live Activity paused');
            } catch (error) {
                if (__DEV__) console.warn('⚠️ Error pausing Sleep Live Activity:', error);
            }
        }
    }, [isRunning, isPaused]);

    const resume = useCallback(async () => {
        if (!isRunning || !isPaused) return;
        
        setIsPaused(false);
        
        // Resume Live Activity
        if (Platform.OS === 'ios' && activityIdRef.current) {
            try {
                await liveActivityService.resumeTimer();
                if (__DEV__) console.log('✅ Sleep Live Activity resumed');
            } catch (error) {
                if (__DEV__) console.warn('⚠️ Error resuming Sleep Live Activity:', error);
            }
        }
    }, [isRunning, isPaused]);

    const reset = useCallback(() => {
        setIsRunning(false);
        setIsPaused(false);
        setElapsedSeconds(0);
        setStartTime(null);
    }, []);

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
                isRunning,
                isPaused,
                elapsedSeconds,
                startTime,
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
