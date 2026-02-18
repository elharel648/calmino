import React, { memo, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Utensils, Moon, Droplets, Music, Heart, Pill, Check, Plus, HeartPulse, TrendingUp, Award, Sparkles, Pencil, Lightbulb, Bell } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import QuickActionsEditModal from './QuickActionsEditModal';
import ActionButton, { setHasAnimated, getHasAnimated } from './ActionButton';
import { TYPOGRAPHY, SPACING } from '../../utils/designSystem';
import { logger } from '../../utils/logger';

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
    onFoodTimerStop?: (seconds: number, timerType: string) => void;
    onSleepTimerStop?: (seconds: number) => void;
    meds?: MedicationsState;
    dynamicStyles: { text: string };
}

// Custom Tooth Icon matching Lucide style
const TeethIcon = ({ size, color, strokeWidth = 2 }: { size: number; color: string; strokeWidth?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7.5 22C6.5 22 5.5 21 5.5 19C5.5 15.5 5 12 5 10C5 5.5 8 2 12 2C16 2 19 5.5 19 10C19 12 18.5 15.5 18.5 19C18.5 21 17.5 22 16.5 22C15.5 22 14.5 20.5 14.5 20.5L12 18L9.5 20.5C9.5 20.5 8.5 22 7.5 22Z" />
        <Path d="M9 7C9 7 10.5 8.5 12 8.5C13.5 8.5 15 7 15 7" opacity="0.6" strokeWidth={strokeWidth * 0.8} />
    </Svg>
);

// Action button base configuration (icons and labels only)
const ACTION_BASE_CONFIG: Record<string, {
    icon: any;
    labelKey: string;
    activeLabelKey: string;
    hasBorder?: boolean;
}> = {
    food: { icon: Utensils, labelKey: 'actions.food', activeLabelKey: 'actions.active.food' },
    sleep: { icon: Moon, labelKey: 'actions.sleep', activeLabelKey: 'actions.active.sleep' },
    diaper: { icon: Droplets, labelKey: 'actions.diaper', activeLabelKey: 'actions.diaper' },
    supplements: { icon: Pill, labelKey: 'actions.supplements', activeLabelKey: 'actions.supplements' },
    whiteNoise: { icon: Music, labelKey: 'actions.whiteNoise', activeLabelKey: 'actions.whiteNoise' },
    sos: { icon: Heart, labelKey: 'actions.sos', activeLabelKey: 'actions.sos' },
    custom: { icon: Plus, labelKey: 'actions.custom', activeLabelKey: 'actions.custom', hasBorder: true },
    health: { icon: HeartPulse, labelKey: 'actions.health', activeLabelKey: 'actions.health' },
    growth: { icon: TrendingUp, labelKey: 'actions.growth', activeLabelKey: 'actions.growth' },
    milestones: { icon: Award, labelKey: 'actions.milestones', activeLabelKey: 'actions.milestones' },
    magicMoments: { icon: Sparkles, labelKey: 'actions.magicMoments', activeLabelKey: 'actions.magicMoments' },
    teeth: { icon: TeethIcon, labelKey: 'actions.teeth', activeLabelKey: 'actions.teeth' },
    nightLight: { icon: Lightbulb, labelKey: 'actions.nightLight', activeLabelKey: 'actions.nightLight' },
    quickReminder: { icon: Bell, labelKey: 'actions.quickReminder', activeLabelKey: 'actions.quickReminder' },
};

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
    onFoodTimerStop,
    onSleepTimerStop,
    meds,
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
            hasBorder?: boolean;
        }> = {};

        Object.keys(ACTION_BASE_CONFIG).forEach(key => {
            const base = ACTION_BASE_CONFIG[key];
            const colors = theme.actionColors[key as keyof typeof theme.actionColors];
            combined[key] = {
                ...base,
                color: colors.color,
                lightColor: colors.lightColor,
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
    const { pumpingIsRunning, pumpingElapsedSeconds, breastIsRunning, breastElapsedSeconds, breastActiveSide, leftBreastTime, rightBreastTime, formatTime: foodFormatTime, stopPumping, stopBreast } = foodTimer;

    const foodIsRunning = pumpingIsRunning || breastIsRunning;
    const foodElapsed = pumpingIsRunning ? pumpingElapsedSeconds : breastIsRunning ? breastElapsedSeconds : 0;

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
            } else {
                onFoodPress();
            }
        } catch (error) {
            logger.error('Error in handleFoodPress:', error);
        }
    }, [pumpingIsRunning, breastIsRunning, pumpingElapsedSeconds, breastElapsedSeconds, leftBreastTime, rightBreastTime, breastActiveSide, stopPumping, stopBreast, onFoodPress, onFoodTimerStop]);

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

    const takenCount = (meds?.vitaminD ? 1 : 0) + (meds?.iron ? 1 : 0);
    const allTaken = takenCount === 2;

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        // Fix memory leak: cleanup scroll timeout
        const scrollTimer = setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 50);

        let animationTimer: NodeJS.Timeout | undefined;
        if (!getHasAnimated()) {
            animationTimer = setTimeout(() => setHasAnimated(true), 400);
        }

        return () => {
            clearTimeout(scrollTimer);
            if (animationTimer) clearTimeout(animationTimer);
        };
    }, []);

    const actionHandlers: Record<QuickActionKey, { onPress: () => void; isActive?: boolean; activeTime?: string; lastTime?: string; badge?: string }> = useMemo(() => ({
        food: { onPress: handleFoodPress, isActive: foodIsRunning, activeTime: foodIsRunning ? foodFormatTime(foodElapsed) : undefined, lastTime: !foodIsRunning ? lastFeedTime : undefined },
        sleep: { onPress: handleSleepPress, isActive: sleepIsRunning, activeTime: sleepIsRunning ? sleepFormatTime(sleepElapsed) : undefined, lastTime: !sleepIsRunning ? lastSleepTime : undefined },
        diaper: { onPress: onDiaperPress },
        supplements: { onPress: onSupplementsPress, badge: `${takenCount}/2` },
        whiteNoise: { onPress: onWhiteNoisePress },
        sos: { onPress: onSOSPress },
        health: { onPress: onHealthPress || (() => { }) },
        growth: { onPress: onGrowthPress || (() => { }) },
        milestones: { onPress: onMilestonesPress || (() => { }) },
        magicMoments: { onPress: onMagicMomentsPress || (() => { }) },
        teeth: { onPress: onTeethPress || (() => { }) },
        nightLight: { onPress: onNightLightPress || (() => { }) },
        custom: { onPress: onCustomPress || (() => { }) },
        quickReminder: { onPress: onQuickReminderPress || (() => { }) },
    }), [handleFoodPress, handleSleepPress, onDiaperPress, onSupplementsPress, onWhiteNoisePress, onSOSPress, onHealthPress, onGrowthPress, onMilestonesPress, onMagicMomentsPress, onTeethPress, onNightLightPress, onCustomPress, foodIsRunning, sleepIsRunning, foodFormatTime, sleepFormatTime, foodElapsed, sleepElapsed, lastFeedTime, lastSleepTime, takenCount]);

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
                    style={[styles.editBtn, {
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                        borderWidth: 1,
                    }]}
                    onPress={() => {
                        setEditModalVisible(true);
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t('stats.editOrder')}
                    accessibilityHint="לחץ לעריכת סדר וניהול פעולות מהירות"
                >
                    <Pencil size={13} color={theme.textSecondary} strokeWidth={2} />
                    <Text style={[styles.editBtnText, { color: theme.textSecondary }]}>{t('stats.editOrder')}</Text>
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
                {visibleActions.length > 4 && (
                    <View style={styles.scrollIndicator}>
                        <View style={[styles.scrollDot, { backgroundColor: theme.textTertiary }]} />
                    </View>
                )}
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
        ...TYPOGRAPHY.h2,
    },
    editBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: SPACING.sm,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
    },
    editBtnText: {
        ...TYPOGRAPHY.labelSmall,
        fontWeight: '500', // Override to 500 instead of 600
    },
    sliderWrapper: {
        position: 'relative',
    },
    sliderContent: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xs,
        gap: SPACING.lg,
    },
    scrollIndicator: {
        position: 'absolute',
        bottom: -SPACING.sm,
        left: '50%',
        transform: [{ translateX: -6 }],
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    scrollDot: {
        width: SPACING.xs,
        height: SPACING.xs,
        borderRadius: 2,
        opacity: 0.4,
    },
});

export default QuickActions;
