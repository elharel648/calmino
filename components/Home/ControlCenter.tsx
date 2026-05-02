/**
 * ControlCenter — Premium FAB Control Center
 *
 * Sections:
 * 1. Timers: שינה, האכלה (הנקה/בקבוק/שאיבה), החתלה
 * 2. רעש לבן: all 4 sounds
 * 3. כלים: פנס, תזכורת מהירה
 *
 * Active indicators: pulse animation + elapsed time
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TouchableWithoutFeedback, Platform, ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
    withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Moon, Baby, Milk, Waves, Music, Lightbulb, Bell, X, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { useFoodTimer } from '../../context/FoodTimerContext';
import { useAudio, SoundId } from '../../context/AudioContext';
import { useQuickActions } from '../../context/QuickActionsContext';
import { navigateToHome } from '../../services/navigationService';
import DiaperIcon from '../Common/DiaperIcon';

// ─── Sound config ─────────────────────────────────────────────────────────────
const SOUNDS: { id: SoundId; label: string; emoji: string }[] = [
    { id: 'lullaby4', label: 'גשם', emoji: '🌧️' },
    { id: 'lullaby2', label: 'מוזיקה עדינה', emoji: '🎵' },
    { id: 'lullaby3', label: 'ציפורים', emoji: '🐦' },
    { id: 'lullaby1', label: 'שיר ערש', emoji: '🎶' },
];

// ─── Elapsed formatter ────────────────────────────────────────────────────────
function fmtElapsed(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Pulse hook ───────────────────────────────────────────────────────────────
function usePulse(active: boolean) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    useEffect(() => {
        if (active) {
            scale.value = withRepeat(withSequence(
                withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.00, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            ), -1, true);
            opacity.value = withRepeat(withSequence(
                withTiming(0.85, { duration: 800 }),
                withTiming(1, { duration: 800 }),
            ), -1, true);
        } else {
            scale.value = withTiming(1, { duration: 200 });
            opacity.value = withTiming(1, { duration: 200 });
        }
    }, [active]);
    return useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));
}

// ─── Section title ─────────────────────────────────────────────────────────────
const SectionTitle = ({ title, color, isDark }: { title: string; color: string; isDark: boolean }) => (
    <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)' }]}>
        {title}
    </Text>
);

// ─── ControlCenter ─────────────────────────────────────────────────────────────
interface Props {
    visible: boolean;
    onClose: () => void;
    onDiaper: () => void;
    onNightLight: () => void;
    onQuickReminder: () => void;
}

const ControlCenter: React.FC<Props> = ({ visible, onClose, onDiaper, onNightLight, onQuickReminder }) => {
    const { theme, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { start: startSleep, stop: stopSleep, isRunning: isSleepRunning, isPaused: isSleepPaused, elapsedSeconds: sleepElapsed } = useSleepTimer();
    const { startBreast, startBottle, startPumping, breastIsRunning, bottleIsRunning, pumpingIsRunning, breastElapsedSeconds, bottleElapsedSeconds, pumpingElapsedSeconds } = useFoodTimer();
    const { activeSound, playSound, stopSound } = useAudio();

    const isSleepActive = isSleepRunning && !isSleepPaused;
    const sleepPulse = usePulse(isSleepActive);
    const breastPulse = usePulse(breastIsRunning);
    const bottlePulse = usePulse(bottleIsRunning);
    const pumpingPulse = usePulse(pumpingIsRunning);

    const translateY = useSharedValue(600);
    const backdropOp = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.9 });
            backdropOp.value = withTiming(1, { duration: 220 });
        } else {
            translateY.value = withTiming(600, { duration: 280, easing: Easing.in(Easing.ease) });
            backdropOp.value = withTiming(0, { duration: 220 });
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

    const bg = isDarkMode ? 'rgba(22,22,26,0.97)' : 'rgba(248,246,244,0.97)';
    const cardBg = isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.85)';
    const cardBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

    const handleSleep = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (isSleepActive) { stopSleep(); } else { startSleep(); }
        onClose();
    };

    const handleBreast = (side: 'right' | 'left') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        startBreast(side);
        onClose();
    };

    const handleBottle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        startBottle();
        onClose();
    };

    const handlePumping = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        startPumping();
        onClose();
    };

    const handleDiaper = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        setTimeout(() => onDiaper(), 200);
    };

    const handleSound = (id: SoundId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (activeSound === id) { stopSound(); } else { playSound(id); }
    };

    const handleNightLight = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        setTimeout(() => onNightLight(), 200);
    };

    const handleQuickReminder = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
        setTimeout(() => onQuickReminder(), 200);
    };

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }, backdropStyle]} />
            </TouchableWithoutFeedback>

            {/* Sheet */}
            <Animated.View style={[styles.sheet, sheetStyle]}>
                <BlurView
                    tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                    intensity={90}
                    style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }]}
                />
                <View style={[styles.sheetInner, { backgroundColor: bg, paddingBottom: insets.bottom + 12 }]}>
                    {/* Handle */}
                    <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>מרכז שליטה</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
                            <X size={16} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                        {/* ── SLEEP ── */}
                        <SectionTitle title="שינה" color={theme.textSecondary} isDark={isDarkMode} />
                        <Animated.View style={[sleepPulse, styles.sleepRow]}>
                            <TouchableOpacity
                                style={[
                                    styles.sleepBtn,
                                    { backgroundColor: isSleepActive ? '#4A6572' : cardBg, borderColor: isSleepActive ? '#4A6572' : cardBorder }
                                ]}
                                onPress={handleSleep}
                                activeOpacity={0.8}
                            >
                                <Moon size={22} color={isSleepActive ? '#fff' : '#4A6572'} strokeWidth={2} />
                                <View style={styles.sleepTextWrap}>
                                    <Text style={[styles.sleepLabel, { color: isSleepActive ? '#fff' : theme.textPrimary }]}>
                                        {isSleepActive ? 'עצור שינה' : 'התחל שינה'}
                                    </Text>
                                    {isSleepActive && sleepElapsed != null && (
                                        <Text style={[styles.sleepTimer, { color: 'rgba(255,255,255,0.75)' }]}>
                                            {fmtElapsed(sleepElapsed)}
                                        </Text>
                                    )}
                                </View>
                                {isSleepActive && <View style={styles.activeDot} />}
                            </TouchableOpacity>
                        </Animated.View>

                        {/* ── FEEDING ── */}
                        <SectionTitle title="האכלה" color={theme.textSecondary} isDark={isDarkMode} />
                        <View style={styles.feedGrid}>
                            {/* הנקה ימין */}
                            <Animated.View style={[breastPulse, { flex: 1 }]}>
                                <TouchableOpacity
                                    style={[styles.feedBtn, { backgroundColor: breastIsRunning ? '#B5838D' : cardBg, borderColor: breastIsRunning ? '#B5838D' : cardBorder }]}
                                    onPress={() => handleBreast('right')}
                                    activeOpacity={0.8}
                                >
                                    <Baby size={18} color={breastIsRunning ? '#fff' : '#B5838D'} strokeWidth={2} />
                                    <Text style={[styles.feedLabel, { color: breastIsRunning ? '#fff' : theme.textPrimary }]}>הנקה ימין</Text>
                                    {breastIsRunning && <Text style={styles.feedTimer}>{fmtElapsed(breastElapsedSeconds ?? 0)}</Text>}
                                </TouchableOpacity>
                            </Animated.View>
                            {/* הנקה שמאל */}
                            <Animated.View style={[breastPulse, { flex: 1 }]}>
                                <TouchableOpacity
                                    style={[styles.feedBtn, { backgroundColor: breastIsRunning ? '#B5838D' : cardBg, borderColor: breastIsRunning ? '#B5838D' : cardBorder }]}
                                    onPress={() => handleBreast('left')}
                                    activeOpacity={0.8}
                                >
                                    <Baby size={18} color={breastIsRunning ? '#fff' : '#B5838D'} strokeWidth={2} />
                                    <Text style={[styles.feedLabel, { color: breastIsRunning ? '#fff' : theme.textPrimary }]}>הנקה שמאל</Text>
                                    {breastIsRunning && <Text style={styles.feedTimer}>{fmtElapsed(breastElapsedSeconds ?? 0)}</Text>}
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                        <View style={[styles.feedGrid, { marginTop: 8 }]}>
                            {/* בקבוק */}
                            <Animated.View style={[bottlePulse, { flex: 1 }]}>
                                <TouchableOpacity
                                    style={[styles.feedBtn, { backgroundColor: bottleIsRunning ? '#D4A373' : cardBg, borderColor: bottleIsRunning ? '#D4A373' : cardBorder }]}
                                    onPress={handleBottle}
                                    activeOpacity={0.8}
                                >
                                    <Milk size={18} color={bottleIsRunning ? '#fff' : '#D4A373'} strokeWidth={2} />
                                    <Text style={[styles.feedLabel, { color: bottleIsRunning ? '#fff' : theme.textPrimary }]}>בקבוק</Text>
                                    {bottleIsRunning && <Text style={styles.feedTimer}>{fmtElapsed(bottleElapsedSeconds ?? 0)}</Text>}
                                </TouchableOpacity>
                            </Animated.View>
                            {/* שאיבה */}
                            <Animated.View style={[pumpingPulse, { flex: 1 }]}>
                                <TouchableOpacity
                                    style={[styles.feedBtn, { backgroundColor: pumpingIsRunning ? '#83C5BE' : cardBg, borderColor: pumpingIsRunning ? '#83C5BE' : cardBorder }]}
                                    onPress={handlePumping}
                                    activeOpacity={0.8}
                                >
                                    <Waves size={18} color={pumpingIsRunning ? '#fff' : '#83C5BE'} strokeWidth={2} />
                                    <Text style={[styles.feedLabel, { color: pumpingIsRunning ? '#fff' : theme.textPrimary }]}>שאיבה</Text>
                                    {pumpingIsRunning && <Text style={styles.feedTimer}>{fmtElapsed(pumpingElapsedSeconds ?? 0)}</Text>}
                                </TouchableOpacity>
                            </Animated.View>
                        </View>

                        {/* ── DIAPER ── */}
                        <TouchableOpacity
                            style={[styles.diaperBtn, { backgroundColor: cardBg, borderColor: cardBorder, marginTop: 8 }]}
                            onPress={handleDiaper}
                            activeOpacity={0.8}
                        >
                            <DiaperIcon size={20} color="#6A9C89" strokeWidth={2} />
                            <Text style={[styles.diaperLabel, { color: theme.textPrimary }]}>החתלה מהירה</Text>
                        </TouchableOpacity>

                        {/* ── WHITE NOISE ── */}
                        <View style={styles.sectionHeader}>
                            <SectionTitle title="רעש לבן" color={theme.textSecondary} isDark={isDarkMode} />
                            {activeSound && (
                                <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); stopSound(); }} style={styles.stopSoundBtn}>
                                    <Text style={styles.stopSoundText}>עצור</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.soundGrid}>
                            {SOUNDS.map(s => {
                                const isActive = activeSound === s.id;
                                return (
                                    <TouchableOpacity
                                        key={s.id}
                                        style={[styles.soundBtn, {
                                            backgroundColor: isActive ? '#557A9D' : cardBg,
                                            borderColor: isActive ? '#557A9D' : cardBorder,
                                        }]}
                                        onPress={() => handleSound(s.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.soundEmoji}>{s.emoji}</Text>
                                        <Text style={[styles.soundLabel, { color: isActive ? '#fff' : theme.textPrimary }]}>{s.label}</Text>
                                        {isActive && <View style={[styles.soundDot, { backgroundColor: '#fff' }]} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* ── TOOLS ── */}
                        <SectionTitle title="כלים" color={theme.textSecondary} isDark={isDarkMode} />
                        <View style={styles.toolsRow}>
                            <TouchableOpacity
                                style={[styles.toolBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                onPress={handleNightLight}
                                activeOpacity={0.8}
                            >
                                <Lightbulb size={20} color="#E9C46A" strokeWidth={2} />
                                <Text style={[styles.toolLabel, { color: theme.textPrimary }]}>פנס לילה</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toolBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                                onPress={handleQuickReminder}
                                activeOpacity={0.8}
                            >
                                <Bell size={20} color="#A29BFE" strokeWidth={2} />
                                <Text style={[styles.toolLabel, { color: theme.textPrimary }]}>תזכורת מהירה</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 8 }} />
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 16,
    },
    sheetInner: { paddingHorizontal: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 2 },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8, marginRight: 2 },
    sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginRight: 2 },
    // Sleep
    sleepRow: { marginBottom: 4 },
    sleepBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 16,
        borderWidth: 1, gap: 10,
        shadowColor: '#4A6572', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    },
    sleepTextWrap: { flex: 1 },
    sleepLabel: { fontSize: 15, fontWeight: '600' },
    sleepTimer: { fontSize: 13, fontWeight: '500', marginTop: 2 },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
    // Feeding
    feedGrid: { flexDirection: 'row-reverse', gap: 8 },
    feedBtn: {
        flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    feedLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    feedTimer: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
    // Diaper
    diaperBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', padding: 13, borderRadius: 14, borderWidth: 1, gap: 10,
    },
    diaperLabel: { fontSize: 14, fontWeight: '600' },
    // Sounds
    soundGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    soundBtn: {
        width: '47%', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 6, position: 'relative',
    },
    soundEmoji: { fontSize: 24 },
    soundLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    soundDot: { position: 'absolute', top: 8, left: 8, width: 7, height: 7, borderRadius: 4 },
    stopSoundBtn: { backgroundColor: 'rgba(255,80,80,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    stopSoundText: { fontSize: 12, fontWeight: '600', color: '#FF5050' },
    // Tools
    toolsRow: { flexDirection: 'row-reverse', gap: 8 },
    toolBtn: {
        flex: 1, flexDirection: 'row-reverse', alignItems: 'center', padding: 13, borderRadius: 14, borderWidth: 1, gap: 8,
    },
    toolLabel: { fontSize: 13, fontWeight: '600' },
});

export default ControlCenter;
