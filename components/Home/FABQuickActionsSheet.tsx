/**
 * FABQuickActionsSheet — Control Center
 *
 * • Instant execution: Sleep & White Noise start immediately + Live Activity
 * • Smart ordering by time of day
 * • Active pulse animation for running timers
 * • Glassmorphism backdrop + Reanimated sheet
 * • Haptic feedback on every interaction
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Modal, Pressable,
    TouchableOpacity, Dimensions, Platform, TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
    withRepeat, withSequence, Easing, runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SlidersHorizontal, X, Moon, Music, StopCircle } from 'lucide-react-native';
import { useQuickActions, QuickActionKey } from '../../context/QuickActionsContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useAudio, SoundId } from '../../context/AudioContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { QUICK_ACTION_BASE_CONFIG } from './quickActionsConfig';
import { navigateToHome } from '../../services/navigationService';

const { height: SCREEN_H } = Dimensions.get('window');
const DEFAULT_WHITE_NOISE: SoundId = 'lullaby4'; // Rain — most common white noise

// ─── Time-of-day smart ordering ───────────────────────────────────────────────
function smartOrder(actions: QuickActionKey[]): QuickActionKey[] {
    const h = new Date().getHours();
    const priority: QuickActionKey[] =
        h >= 20 || h < 6  ? ['sleep', 'whiteNoise', 'food', 'diaper', 'nightLight'] :
        h >= 6  && h < 10 ? ['food', 'diaper', 'supplements', 'sleep', 'health']    :
        h >= 10 && h < 15 ? ['food', 'diaper', 'health', 'growth', 'milestones']    :
                            ['food', 'diaper', 'whiteNoise', 'sleep', 'supplements'];
    return [...actions].sort((a, b) => {
        const ai = priority.indexOf(a);
        const bi = priority.indexOf(b);
        if (ai < 0 && bi < 0) return 0;
        if (ai < 0) return 1;
        if (bi < 0) return -1;
        return ai - bi;
    });
}

// ─── Time context label ────────────────────────────────────────────────────────
function timeContextLabel(): string {
    const h = new Date().getHours();
    if (h >= 20 || h < 6)  return 'לילה · זמן שינה';
    if (h >= 6  && h < 10) return 'בוקר · שעת ארוחה';
    if (h >= 10 && h < 15) return 'צהריים';
    return 'אחה"צ / ערב';
}

// ─── Category colors ──────────────────────────────────────────────────────────
const C: Partial<Record<QuickActionKey, string>> = {
    food: '#D4A373', sleep: '#4A6572', diaper: '#6A9C89',
    supplements: '#B5838D', whiteNoise: '#557A9D', health: '#8EB168',
    growth: '#83C5BE', milestones: '#D4A373', magicMoments: '#8D4A60',
    teeth: '#8ECAE6', nightLight: '#E9C46A', quickReminder: '#A29BFE',
    sos: '#CD8B87', custom: '#A5A58D',
};

// ─── Seconds → min/sec label ──────────────────────────────────────────────────
function elapsed(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}ש'`;
}

// ─── Pulse hook ───────────────────────────────────────────────────────────────
function usePulse(active: boolean) {
    const scale = useSharedValue(1);
    useEffect(() => {
        if (active) {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1.00, { duration: 700, easing: Easing.inOut(Easing.ease) }),
                ), -1, true,
            );
        } else {
            scale.value = withTiming(1, { duration: 200 });
        }
    }, [active]);
    return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// ─── Single action button ─────────────────────────────────────────────────────
const ActionButton = React.memo(({
    actionKey, isActive, onPress, onLongPress, theme,
}: {
    actionKey: QuickActionKey;
    isActive: boolean;
    onPress: () => void;
    onLongPress?: () => void;
    theme: any;
}) => {
    const config = QUICK_ACTION_BASE_CONFIG[actionKey];
    if (!config) return null;
    const color   = C[actionKey] ?? '#C8806A';
    const IconComp = config.icon;
    const pulseStyle = usePulse(isActive);

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={400}
            style={styles.actionWrap}
        >
            <Animated.View style={[
                styles.iconCircle,
                { backgroundColor: isActive ? color : color + '22' },
                isActive && { shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 },
                pulseStyle,
            ]}>
                <IconComp
                    size={26}
                    color={isActive ? '#fff' : color}
                    strokeWidth={1.6}
                />
                {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: '#fff' }]} />
                )}
            </Animated.View>
            <Text style={[styles.actionLabel, { color: isActive ? color : theme.textSecondary }]} numberOfLines={1}>
                {actionKey === 'sleep' && isActive ? 'עצור שינה' :
                 actionKey === 'whiteNoise' && isActive ? 'עצור' :
                 (config.labelKey.split('.').pop() ?? actionKey)}
            </Text>
        </Pressable>
    );
});

// ─── FABQuickActionsSheet ─────────────────────────────────────────────────────
const FABQuickActionsSheet: React.FC = () => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const {
        fabSheetVisible, setFabSheetVisible,
        actionOrder, hiddenActions,
        triggerFABAction, setEditMode,
    } = useQuickActions();

    const { isRunning: isSleepRunning, isPaused: isSleepPaused, elapsedSeconds: sleepElapsed, start: startSleep, stop: stopSleep } = useSleepTimer();
    const { activeSound, playSound, stopSound } = useAudio();
    const { startBreast, startBottle, startPumping, breastIsRunning, bottleIsRunning, pumpingIsRunning } = useFoodTimer();
    const [showFoodSub, setShowFoodSub] = useState(false);

    // Active states
    const isSleepActive      = isSleepRunning && !isSleepPaused;
    const isWhiteNoiseActive = activeSound !== null;
    const isFoodActive       = breastIsRunning || bottleIsRunning || pumpingIsRunning;

    // Reanimated sheet
    const translateY = useSharedValue(SCREEN_H);
    const backdropOp = useSharedValue(0);

    useEffect(() => {
        if (fabSheetVisible) {
            translateY.value = withSpring(0, { damping: 20, stiffness: 200, mass: 0.8 });
            backdropOp.value = withTiming(1, { duration: 240 });
        } else {
            translateY.value = withTiming(SCREEN_H, { duration: 280, easing: Easing.in(Easing.ease) });
            backdropOp.value = withTiming(0, { duration: 240 });
        }
    }, [fabSheetVisible]);

    const sheetStyle   = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

    // Visible + smart ordered
    const visibleActions = useMemo(() =>
        smartOrder(actionOrder.filter(k => !hiddenActions.includes(k))),
        [actionOrder, hiddenActions, fabSheetVisible],
    );

    const handleClose = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFabSheetVisible(false);
    }, []);

    const handleEdit = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFabSheetVisible(false);
        setTimeout(() => setEditMode(true), 320);
    }, []);

    const handleFoodSubAction = useCallback((type: 'breastRight' | 'breastLeft' | 'bottle' | 'pumping') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (type === 'breastRight') startBreast('right');
        else if (type === 'breastLeft') startBreast('left');
        else if (type === 'bottle') startBottle();
        else if (type === 'pumping') startPumping();
        setShowFoodSub(false);
        setFabSheetVisible(false);
    }, [startBreast, startBottle, startPumping]);

    const handleAction = useCallback((key: QuickActionKey) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // ── Food: show sub-menu ──
        if (key === 'food') {
            setShowFoodSub(prev => !prev);
            return;
        }

        setShowFoodSub(false);

        // ── Instant execution for primary timers ──
        if (key === 'sleep') {
            if (isSleepActive) {
                stopSleep();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                startSleep();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            setFabSheetVisible(false);
            return;
        }

        if (key === 'whiteNoise') {
            if (isWhiteNoiseActive) {
                stopSound();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                playSound(DEFAULT_WHITE_NOISE);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            setFabSheetVisible(false);
            return;
        }

        // ── Navigate for everything else ──
        triggerFABAction(key);
        navigateToHome();
    }, [isSleepActive, isWhiteNoiseActive, startSleep, stopSleep, playSound, stopSound]);

    if (!fabSheetVisible) return null;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }, backdropStyle]} />
            </TouchableWithoutFeedback>

            {/* Sheet */}
            <Animated.View style={[styles.sheet, sheetStyle]}>
                <BlurView
                    tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                    intensity={85}
                    style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' }]}
                />

                <View style={[styles.sheetContent, { backgroundColor: isDarkMode ? 'rgba(20,20,25,0.6)' : 'rgba(255,255,255,0.55)' }]}>
                    {/* Handle */}
                    <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }]} />

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleEdit} style={styles.editBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <SlidersHorizontal size={17} color={theme.textSecondary} strokeWidth={1.8} />
                            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>התאמה</Text>
                        </TouchableOpacity>

                        <View style={{ alignItems: 'center' }}>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>פעולות מהירות</Text>
                            <Text style={[styles.timeCtx, { color: theme.textTertiary }]}>{timeContextLabel()}</Text>
                        </View>

                        <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                            <X size={18} color={theme.textSecondary} strokeWidth={2.2} />
                        </TouchableOpacity>
                    </View>

                    {/* Active status pills */}
                    {(isSleepActive || isWhiteNoiseActive) && (
                        <View style={styles.statusRow}>
                            {isSleepActive && (
                                <View style={[styles.statusPill, { backgroundColor: '#4A6572' + '28', borderColor: '#4A657240' }]}>
                                    <Moon size={12} color="#4A6572" strokeWidth={2} />
                                    <Text style={[styles.statusText, { color: '#4A6572' }]}>
                                        שינה פעילה · {elapsed(sleepElapsed ?? 0)}
                                    </Text>
                                </View>
                            )}
                            {isWhiteNoiseActive && (
                                <View style={[styles.statusPill, { backgroundColor: '#557A9D28', borderColor: '#557A9D40' }]}>
                                    <Music size={12} color="#557A9D" strokeWidth={2} />
                                    <Text style={[styles.statusText, { color: '#557A9D' }]}>רעש לבן פועל</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Food sub-menu */}
                    {showFoodSub && (
                        <View style={styles.foodSubMenu}>
                            <Text style={[styles.foodSubTitle, { color: theme.textSecondary }]}>בחר סוג האכלה</Text>
                            <View style={styles.foodSubRow}>
                                {[
                                    { type: 'breastRight' as const, label: 'הנקה ימין', emoji: '🤱' },
                                    { type: 'breastLeft'  as const, label: 'הנקה שמאל', emoji: '🤱' },
                                    { type: 'bottle'      as const, label: 'בקבוק',      emoji: '🍼' },
                                    { type: 'pumping'     as const, label: 'שאיבה',      emoji: '🔄' },
                                ].map(item => (
                                    <TouchableOpacity
                                        key={item.type}
                                        style={[styles.foodSubBtn, { backgroundColor: '#D4A373' + '22', borderColor: '#D4A373' + '44' }]}
                                        onPress={() => handleFoodSubAction(item.type)}
                                    >
                                        <Text style={styles.foodSubEmoji}>{item.emoji}</Text>
                                        <Text style={[styles.foodSubLabel, { color: '#D4A373' }]}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Grid */}
                    <View style={styles.grid}>
                        {visibleActions.map((key) => (
                            <ActionButton
                                key={key}
                                actionKey={key}
                                isActive={
                                    (key === 'sleep' && isSleepActive) ||
                                    (key === 'whiteNoise' && isWhiteNoiseActive) ||
                                    (key === 'food' && isFoodActive)
                                }
                                onPress={() => handleAction(key)}
                                onLongPress={key === 'sleep' || key === 'whiteNoise' || key === 'food' ? undefined : () => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                    triggerFABAction(key);
                                    navigateToHome();
                                }}
                                theme={theme}
                            />
                        ))}
                    </View>

                    <View style={{ height: Platform.OS === 'ios' ? 36 : 20 }} />
                </View>
            </Animated.View>
        </Modal>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
    },
    sheetContent: {
        paddingHorizontal: 20,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    handle: {
        width: 38, height: 4, borderRadius: 2,
        alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    title:     { fontSize: 16, fontWeight: '700' },
    timeCtx:   { fontSize: 11, marginTop: 1 },
    editBtn:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    editLabel: { fontSize: 12, fontWeight: '500' },
    closeBtn:  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

    statusRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    statusPill: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
    },
    statusText: { fontSize: 11, fontWeight: '600' },

    grid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 6,
    },
    actionWrap:  { width: '22%', alignItems: 'center', gap: 7 },
    iconCircle:  {
        width: 60, height: 60, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
    activeDot:   {
        position: 'absolute', bottom: 5, right: 5,
        width: 7, height: 7, borderRadius: 4,
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    },
    actionLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
    foodSubMenu: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    foodSubTitle: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
        opacity: 0.7,
    },
    foodSubRow: {
        flexDirection: 'row-reverse',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    foodSubBtn: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 4,
        minWidth: 76,
    },
    foodSubEmoji: { fontSize: 22 },
    foodSubLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});

export default FABQuickActionsSheet;
