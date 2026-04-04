import React, { memo, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Check, SlidersHorizontal } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { useAudio } from '../../context/AudioContext';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import QuickActionsEditModal from './QuickActionsEditModal';
import ActionButton from './ActionButton';
import { SPACING } from '../../utils/designSystem';
import { logger } from '../../utils/logger';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';

interface QuickActionsProps {
    lastFeedTime: string;
    lastSleepTime: string;
    onFoodPress: () => void;
    onSleepPress: () => void;
    onDiaperPress: () => void;
    onWhiteNoisePress: () => void;
    onSOSPress: () => void;
    onSupplementsPress: () => void;
    onHealthPress?: () => void;
    onGrowthPress?: () => void;
    onMilestonesPress?: () => void;
    onMagicMomentsPress?: () => void;
    onTeethPress?: () => void;
    onNightLightPress?: () => void;
    onCustomPress?: () => void;
    onQuickReminderPress?: () => void;
    reminderCount?: number;
    onFoodTimerStop?: (seconds: number, timerType: string) => void;
    onSleepTimerStop?: (seconds: number) => void;
    meds?: MedicationsState;
    supplementsTakenCount?: number;
    supplementsTotalCount?: number;
    dynamicStyles: { text: string };
}

const QuickActions = memo<QuickActionsProps>(({
    lastFeedTime,
    lastSleepTime,
    onFoodPress,
    onSleepPress,
    onDiaperPress,
    onWhiteNoisePress,
    onSOSPress,
    onSupplementsPress,
    onHealthPress,
    onGrowthPress,
    onMilestonesPress,
    onMagicMomentsPress,
    onTeethPress,
    onNightLightPress,
    onCustomPress,
    onQuickReminderPress,
    reminderCount,
    onFoodTimerStop,
    onSleepTimerStop,
    meds,
    supplementsTakenCount,
    supplementsTotalCount,
    dynamicStyles,
}) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const sleepTimer = useSleepTimer();
    const foodTimer = useFoodTimer();
    const { actionOrder, hiddenActions } = useQuickActions();
    const [isEditModalVisible, setEditModalVisible] = useState(false);

    // Combine base config with theme-aware colors
    const ACTIONS = useMemo(() => {
        const combined: Record<string, {
            icon: any;
            labelKey: string;
            activeLabelKey: string;
            color: string;
            lightColor: string;
            accentColor: string;
            hasBorder?: boolean;
        }> = {};

        Object.keys(QUICK_ACTION_BASE_CONFIG).forEach(key => {
            const base = QUICK_ACTION_BASE_CONFIG[key as QuickActionKey];
            const colors = theme.actionColors[key as keyof typeof theme.actionColors];
            combined[key] = {
                ...base,
                color: colors.color,
                lightColor: colors.lightColor,
                accentColor: colors.accentColor,
            };
        });

        return combined;
    }, [theme]);

    const getActionLabel = (key: string, isActive: boolean) => {
        const config = ACTIONS[key];
        if (!config) return '';
        if (isActive && config.activeLabelKey) return t(config.activeLabelKey);
        return t(config.labelKey);
    };

    const { isRunning: sleepIsRunning, elapsedSeconds: sleepElapsed, formatTime: sleepFormatTime } = sleepTimer;
    const { pumpingIsRunning, pumpingElapsedSeconds, breastIsRunning, breastElapsedSeconds, breastActiveSide, leftBreastTime, rightBreastTime, bottleIsRunning, bottleElapsedSeconds, formatTime: foodFormatTime, stopPumping, stopBreast, stopBottle } = foodTimer;
    const { activeSound, stopSound } = useAudio();

    // Track white noise elapsed time locally
    const [whiteNoiseElapsed, setWhiteNoiseElapsed] = useState(0);
    const whiteNoiseStartRef = useRef<number | null>(null);

    useEffect(() => {
        if (activeSound) {
            whiteNoiseStartRef.current = Date.now();
            setWhiteNoiseElapsed(0);
            const interval = setInterval(() => {
                if (whiteNoiseStartRef.current) {
                    setWhiteNoiseElapsed(Math.floor((Date.now() - whiteNoiseStartRef.current) / 1000));
                }
            }, 1000);
            return () => clearInterval(interval);
        } else {
            whiteNoiseStartRef.current = null;
            setWhiteNoiseElapsed(0);
        }
    }, [activeSound]);

    const formatWhiteNoiseTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const foodIsRunning = pumpingIsRunning || breastIsRunning || bottleIsRunning;
    const foodElapsed = pumpingIsRunning ? pumpingElapsedSeconds : breastIsRunning ? breastElapsedSeconds : bottleIsRunning ? bottleElapsedSeconds : 0;

    const handleFoodPress = useCallback(() => {
        try {
            if (pumpingIsRunning) {
                if (onFoodTimerStop && pumpingElapsedSeconds > 0) onFoodTimerStop(pumpingElapsedSeconds, 'pumping');
                stopPumping();
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (breastIsRunning) {
                const totalBreastTime = leftBreastTime + rightBreastTime + breastElapsedSeconds;
                if (onFoodTimerStop && totalBreastTime > 0) onFoodTimerStop(totalBreastTime, breastActiveSide === 'left' ? 'breast_left' : 'breast_right');
                stopBreast();
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (bottleIsRunning) {
                if (onFoodTimerStop && bottleElapsedSeconds > 0) onFoodTimerStop(bottleElapsedSeconds, 'bottle');
                stopBottle();
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                onFoodPress();
            }
        } catch (error) {
            logger.error('Error in handleFoodPress:', error);
        }
    }, [pumpingIsRunning, breastIsRunning, bottleIsRunning, pumpingElapsedSeconds, breastElapsedSeconds, bottleElapsedSeconds, leftBreastTime, rightBreastTime, breastActiveSide, stopPumping, stopBreast, stopBottle, onFoodPress, onFoodTimerStop]);

    const handleSleepPress = useCallback(() => {
        try {
            if (sleepIsRunning) {
                if (onSleepTimerStop && sleepElapsed > 0) onSleepTimerStop(sleepElapsed);
                sleepTimer.stop();
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                onSleepPress();
            }
        } catch (error) {
            logger.error('Error in handleSleepPress:', error);
        }
    }, [sleepIsRunning, sleepTimer, sleepElapsed, onSleepPress, onSleepTimerStop]);

    const takenCount = supplementsTakenCount ?? 0;
    const totalSupplements = supplementsTotalCount ?? 0;
    const allTaken = totalSupplements > 0 && takenCount === totalSupplements;

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        const scrollTimer = setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 50);
        return () => clearTimeout(scrollTimer);
    }, []);

    const actionHandlers: Record<QuickActionKey, { onPress: () => void; isActive?: boolean; activeTime?: string; lastTime?: string; badge?: string }> = useMemo(() => ({
        food: { onPress: handleFoodPress, isActive: foodIsRunning, activeTime: foodIsRunning ? foodFormatTime(foodElapsed) : undefined, lastTime: !foodIsRunning ? lastFeedTime : undefined },
        sleep: { onPress: handleSleepPress, isActive: sleepIsRunning, activeTime: sleepIsRunning ? sleepFormatTime(sleepElapsed) : undefined, lastTime: !sleepIsRunning ? lastSleepTime : undefined },
        diaper: { onPress: onDiaperPress },
        supplements: { onPress: onSupplementsPress, badge: `${takenCount}/${totalSupplements}` },
        whiteNoise: {
            onPress: activeSound ? () => { stopSound(); if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } : onWhiteNoisePress,
            isActive: activeSound !== null,
            activeTime: activeSound ? formatWhiteNoiseTime(whiteNoiseElapsed) : undefined,
        },
        sos: { onPress: onSOSPress },
        health: { onPress: onHealthPress || (() => { }) },
        growth: { onPress: onGrowthPress || (() => { }) },
        milestones: { onPress: onMilestonesPress || (() => { }) },
        magicMoments: { onPress: onMagicMomentsPress || (() => { }) },
        teeth: { onPress: onTeethPress || (() => { }) },
        nightLight: { onPress: onNightLightPress || (() => { }) },
        custom: { onPress: onCustomPress || (() => { }) },
        quickReminder: { onPress: onQuickReminderPress || (() => { }), badge: reminderCount && reminderCount > 0 ? String(reminderCount) : undefined },
    }), [handleFoodPress, handleSleepPress, onDiaperPress, onSupplementsPress, onWhiteNoisePress, onSOSPress, onHealthPress, onGrowthPress, onMilestonesPress, onMagicMomentsPress, onTeethPress, onNightLightPress, onCustomPress, foodIsRunning, sleepIsRunning, foodFormatTime, sleepFormatTime, foodElapsed, sleepElapsed, lastFeedTime, lastSleepTime, takenCount, totalSupplements, activeSound, whiteNoiseElapsed, stopSound]);

    const visibleActions = useMemo(() =>
        actionOrder.filter(key => !hiddenActions.includes(key)),
        [actionOrder, hiddenActions]);

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                    {t('home.quickActions')}
                </Text>
                <TouchableOpacity
                    style={[styles.editBtn, { opacity: 0.5, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)', borderWidth: 0.5, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                    onPress={() => {
                        setEditModalVisible(true);
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={t('stats.editOrder')}
                >
                    <SlidersHorizontal size={14} color={isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'} strokeWidth={2} />
                </TouchableOpacity>
            </View>

            {/* Horizontal Slider */}
            <View style={styles.sliderWrapper}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sliderContent}
                    bounces={true}
                    decelerationRate="fast"
                >
                    {visibleActions.map((actionKey, index) => {
                        const config = actionKey === 'supplements' && allTaken
                            ? { ...ACTIONS[actionKey], icon: Check }
                            : ACTIONS[actionKey];
                        const handler = actionHandlers[actionKey];

                        // ✅ FIX: Check if handler exists before accessing properties
                        if (!handler) return null;

                        return (
                            <ActionButton
                                key={actionKey}
                                config={config}
                                configKey={actionKey}
                                label={getActionLabel(actionKey, handler.isActive || false)}
                                onPress={handler.onPress}
                                isActive={handler.isActive}
                                activeTime={handler.activeTime}
                                lastTime={handler.lastTime}
                                badge={handler.badge}
                                index={index}
                            />
                        );
                    })}
                </ScrollView>
            </View>

            {/* Edit Modal */}
            <QuickActionsEditModal
                visible={isEditModalVisible}
                onClose={() => setEditModalVisible(false)}
            />
        </View>
    );
});

QuickActions.displayName = 'QuickActions';

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.xxl,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.xs,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '500',
        letterSpacing: -0.4,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sliderWrapper: {
        position: 'relative',
        marginHorizontal: -20, // Break out of HomeScreen's 20px padding so icons reach edges
    },
    sliderContent: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 20,
        gap: 14,
    },
});

export default QuickActions;
