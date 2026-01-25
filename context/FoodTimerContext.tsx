import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { liveActivityService } from '../services/liveActivityService';
import { useActiveChild } from '../context/ActiveChildContext';

interface FoodTimerContextType {
    // Pumping Timer
    pumpingIsRunning: boolean;
    pumpingIsPaused: boolean;
    pumpingElapsedSeconds: number;
    startPumping: () => void;
    stopPumping: () => void;
    pausePumping: () => void;
    resumePumping: () => void;
    resetPumping: () => void;

    // Breastfeeding Timer
    breastIsRunning: boolean;
    breastIsPaused: boolean;
    breastActiveSide: 'left' | 'right' | null;
    breastElapsedSeconds: number;
    leftBreastTime: number;
    rightBreastTime: number;
    startBreast: (side: 'left' | 'right') => void;
    stopBreast: () => void;
    pauseBreast: () => void;
    resumeBreast: () => void;
    resetBreast: () => void;

    // Utility
    formatTime: (seconds: number) => string;
}

const FoodTimerContext = createContext<FoodTimerContextType | undefined>(undefined);

export const useFoodTimer = () => {
    const context = useContext(FoodTimerContext);
    if (!context) {
        throw new Error('useFoodTimer must be used within FoodTimerProvider');
    }
    return context;
};

interface FoodTimerProviderProps {
    children: ReactNode;
}

export const FoodTimerProvider = ({ children }: FoodTimerProviderProps) => {
    const { activeChild } = useActiveChild();
    const activeChildId = activeChild?.childId;

    // --- State Management Per Child ---
    interface FoodTimerState {
        pumping: {
            isRunning: boolean;
            isPaused: boolean;
            elapsedSeconds: number;
            activityId?: string;
        };
        breast: {
            isRunning: boolean;
            isPaused: boolean;
            activeSide: 'left' | 'right' | null;
            elapsedSeconds: number;
            leftBreastTime: number;
            rightBreastTime: number;
            activityId?: string;
        };
    }

    const INITIAL_STATE: FoodTimerState = {
        pumping: { isRunning: false, isPaused: false, elapsedSeconds: 0 },
        breast: { isRunning: false, isPaused: false, activeSide: null, elapsedSeconds: 0, leftBreastTime: 0, rightBreastTime: 0 }
    };

    const [timers, setTimers] = useState<Record<string, FoodTimerState>>({});
    const pumpingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const breastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get active child state
    const currentState = activeChildId && timers[activeChildId] ? timers[activeChildId] : INITIAL_STATE;

    const updateChildState = useCallback((childId: string, updates: Partial<FoodTimerState>) => {
        setTimers(prev => ({
            ...prev,
            [childId]: {
                ...(prev[childId] || INITIAL_STATE),
                ...updates
            }
        }));
    }, []);

    const updateNestedState = useCallback((childId: string, type: 'pumping' | 'breast', updates: any) => {
        setTimers(prev => {
            const childState = prev[childId] || INITIAL_STATE;
            return {
                ...prev,
                [childId]: {
                    ...childState,
                    [type]: {
                        ...childState[type],
                        ...updates
                    }
                }
            };
        });
    }, []);

    // --- Global Interval for Pumping ---
    useEffect(() => {
        pumpingTimerRef.current = setInterval(() => {
            setTimers(prev => {
                const next = { ...prev };
                let changes = false;
                Object.keys(next).forEach(id => {
                    if (next[id].pumping.isRunning && !next[id].pumping.isPaused) {
                        next[id] = {
                            ...next[id],
                            pumping: {
                                ...next[id].pumping,
                                elapsedSeconds: next[id].pumping.elapsedSeconds + 1
                            }
                        };
                        changes = true;

                        // Update Live Activity (only if this child has one running)
                        if (Platform.OS === 'ios' && next[id].pumping.activityId) {
                            liveActivityService.updatePumpingTimer(next[id].pumping.elapsedSeconds).catch(() => { });
                        }
                    }
                });
                return changes ? next : prev;
            });
        }, 1000);
        return () => { if (pumpingTimerRef.current) clearInterval(pumpingTimerRef.current); };
    }, []);

    // --- Global Interval for Breastfeeding ---
    useEffect(() => {
        breastTimerRef.current = setInterval(() => {
            setTimers(prev => {
                const next = { ...prev };
                let changes = false;
                Object.keys(next).forEach(id => {
                    if (next[id].breast.isRunning && !next[id].breast.isPaused) {
                        next[id] = {
                            ...next[id],
                            breast: {
                                ...next[id].breast,
                                elapsedSeconds: next[id].breast.elapsedSeconds + 1
                            }
                        };
                        changes = true;
                    }
                });
                return changes ? next : prev;
            });
        }, 1000);
        return () => { if (breastTimerRef.current) clearInterval(breastTimerRef.current); };
    }, []);


    // === PUMPING ACTIONS ===
    const startPumping = useCallback(async () => {
        if (!activeChildId) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newState = { isRunning: true, isPaused: false, elapsedSeconds: 0, activityId: undefined };

        // Start iOS Live Activity
        if (Platform.OS === 'ios') {
            try {
                const activityId = await liveActivityService.startPumpingTimer();
                if (activityId) newState.activityId = activityId;
            } catch (error) { if (__DEV__) console.warn(error); }
        }

        updateNestedState(activeChildId, 'pumping', newState);
    }, [activeChildId, updateNestedState]);

    const stopPumping = useCallback(async () => {
        if (!activeChildId) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const activityId = currentState.pumping.activityId;
        updateNestedState(activeChildId, 'pumping', { isRunning: false, isPaused: false, activityId: undefined });

        if (Platform.OS === 'ios' && activityId) {
            try { await liveActivityService.stopPumpingTimer(); } catch (e) { }
        }
    }, [activeChildId, currentState.pumping.activityId, updateNestedState]);

    const pausePumping = useCallback(async () => {
        if (!activeChildId || !currentState.pumping.isRunning || currentState.pumping.isPaused) return;
        updateNestedState(activeChildId, 'pumping', { isPaused: true });
        if (Platform.OS === 'ios' && currentState.pumping.activityId) await liveActivityService.pauseTimer();
    }, [activeChildId, currentState.pumping, updateNestedState]);

    const resumePumping = useCallback(async () => {
        if (!activeChildId || !currentState.pumping.isRunning || !currentState.pumping.isPaused) return;
        updateNestedState(activeChildId, 'pumping', { isPaused: false });
        if (Platform.OS === 'ios' && currentState.pumping.activityId) await liveActivityService.resumeTimer();
    }, [activeChildId, currentState.pumping, updateNestedState]);

    const resetPumping = useCallback(() => {
        if (!activeChildId) return;
        updateNestedState(activeChildId, 'pumping', { isRunning: false, isPaused: false, elapsedSeconds: 0 });
    }, [activeChildId, updateNestedState]);


    // === BREASTFEEDING ACTIONS ===
    const startBreast = useCallback(async (side: 'left' | 'right') => {
        if (!activeChildId) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const currentBreast = currentState.breast;
        let updates: any = { activeSide: side, isRunning: true, isPaused: false, elapsedSeconds: 0 };

        // Accumulate previous side time if switching
        if (currentBreast.isRunning && currentBreast.activeSide && currentBreast.activeSide !== side) {
            if (currentBreast.activeSide === 'left') {
                updates.leftBreastTime = currentBreast.leftBreastTime + currentBreast.elapsedSeconds;
            } else {
                updates.rightBreastTime = currentBreast.rightBreastTime + currentBreast.elapsedSeconds;
            }
        }

        if (Platform.OS === 'ios') {
            try {
                const activityId = await liveActivityService.startBreastfeedingTimer('הורה', activeChild?.childName || 'תינוק', side);
                if (activityId) updates.activityId = activityId;
            } catch (e) { }
        }

        updateNestedState(activeChildId, 'breast', updates);
    }, [activeChildId, currentState.breast, updateNestedState, activeChild?.childName]);

    const stopBreast = useCallback(async () => {
        if (!activeChildId) return;
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const currentBreast = currentState.breast;
        let updates: any = { isRunning: false, isPaused: false, elapsedSeconds: 0, activityId: undefined };

        if (currentBreast.activeSide === 'left') {
            updates.leftBreastTime = currentBreast.leftBreastTime + currentBreast.elapsedSeconds;
        } else if (currentBreast.activeSide === 'right') {
            updates.rightBreastTime = currentBreast.rightBreastTime + currentBreast.elapsedSeconds;
        }

        updateNestedState(activeChildId, 'breast', updates);

        if (Platform.OS === 'ios' && currentBreast.activityId) {
            try { await liveActivityService.stopBreastfeedingTimer(); } catch (e) { }
        }
    }, [activeChildId, currentState.breast, updateNestedState]);

    const pauseBreast = useCallback(async () => {
        if (!activeChildId || !currentState.breast.isRunning || currentState.breast.isPaused) return;
        updateNestedState(activeChildId, 'breast', { isPaused: true });
        if (Platform.OS === 'ios' && currentState.breast.activityId) await liveActivityService.pauseTimer();
    }, [activeChildId, currentState.breast, updateNestedState]);

    const resumeBreast = useCallback(async () => {
        if (!activeChildId || !currentState.breast.isRunning || !currentState.breast.isPaused) return;
        updateNestedState(activeChildId, 'breast', { isPaused: false });
        if (Platform.OS === 'ios' && currentState.breast.activityId) await liveActivityService.resumeTimer();
    }, [activeChildId, currentState.breast, updateNestedState]);

    const resetBreast = useCallback(() => {
        if (!activeChildId) return;
        updateNestedState(activeChildId, 'breast', {
            isRunning: false, isPaused: false, activeSide: null, elapsedSeconds: 0, leftBreastTime: 0, rightBreastTime: 0
        });
    }, [activeChildId, updateNestedState]);

    // === UTILITY ===
    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return (
        <FoodTimerContext.Provider
            value={{
                // Pumping
                pumpingIsRunning: currentState.pumping.isRunning,
                pumpingIsPaused: currentState.pumping.isPaused,
                pumpingElapsedSeconds: currentState.pumping.elapsedSeconds,
                startPumping,
                stopPumping,
                pausePumping,
                resumePumping,
                resetPumping,
                // Breastfeeding
                breastIsRunning: currentState.breast.isRunning,
                breastIsPaused: currentState.breast.isPaused,
                breastActiveSide: currentState.breast.activeSide,
                breastElapsedSeconds: currentState.breast.elapsedSeconds,
                leftBreastTime: currentState.breast.leftBreastTime,
                rightBreastTime: currentState.breast.rightBreastTime,
                startBreast,
                stopBreast,
                pauseBreast,
                resumeBreast,
                resetBreast,
                // Utility
                formatTime,
            }}
        >
            {children}
        </FoodTimerContext.Provider>
    );
};

export default FoodTimerProvider;
