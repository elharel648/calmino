import React, { useRef, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Platform, Animated as RNAnimated, PanResponder, Dimensions, useWindowDimensions
} from 'react-native';
import { Volume2, Volume1, VolumeX, Clock, Music, Music2, Star, Bird, CloudRain, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, interpolate
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAudio, SoundId } from '../context/AudioContext';

let VolumeManager: any = null;
try { VolumeManager = require('react-native-volume-manager').VolumeManager; } catch (e) {}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WhiteNoiseModalProps {
    visible: boolean;
    onClose: () => void;
}

// Moved inside component to access t()

export default function WhiteNoiseModal({ visible, onClose }: WhiteNoiseModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { activeSound, volume, isLoading, toggleSound, setVolume, sleepTimer, timeRemaining, startTimer, stopTimer } = useAudio();

    const SOUNDS = useMemo(() => [
        { id: 'lullaby1', label: t('whiteNoise.lullaby'),   Icon: Music2,    color: '#8ECAE6', bgLight: '#F0F9FF', bgDark: 'rgba(56,189,248,0.14)' }, // Soft Sky Blue
        { id: 'lullaby2', label: t('whiteNoise.softMusic'), Icon: Star,      color: '#B5838D', bgLight: '#FDF2F8', bgDark: 'rgba(244,114,182,0.14)' }, // Lilac Mauve
        { id: 'lullaby3', label: t('whiteNoise.birds'),     Icon: Bird,  color: '#E9C46A', bgLight: '#FFF7ED', bgDark: 'rgba(251,146,60,0.14)'  }, // Soft Sand
        { id: 'lullaby4', label: t('whiteNoise.rain'),      Icon: CloudRain, color: '#557A9D', bgLight: '#F0F9FF', bgDark: 'rgba(56,189,248,0.14)'  }, // Slate Blue
    ], [t]);
    const { width: screenW } = useWindowDimensions();
    const isSmall = screenW < 390;

    // Suppress the native iOS volume HUD while modal is open
    useEffect(() => {
        if (Platform.OS === 'ios') {
            VolumeManager.showNativeVolumeUI({ enabled: false });
            return () => { VolumeManager.showNativeVolumeUI({ enabled: true }); };
        }
    }, []);
    // 2 columns always (4 sounds → 2×2 grid)
    const cardWidth = '47%';
    const gridPad  = isSmall ? 16 : 20;
    const titleSize = isSmall ? 23 : 28;

    const slideAnim  = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;

    // Waveform bars
    const w1 = useSharedValue(0.3);
    const w2 = useSharedValue(0.7);
    const w3 = useSharedValue(1.0);
    const w4 = useSharedValue(0.5);
    const w5 = useSharedValue(0.4);

    const waveStyle = (sv: typeof w1, min: number, max: number) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useAnimatedStyle(() => ({
            height: interpolate(sv.value, [0, 1], [min, max]),
        }));

    const ws1 = waveStyle(w1, 4, 22);
    const ws2 = waveStyle(w2, 4, 32);
    const ws3 = waveStyle(w3, 4, 38);
    const ws4 = waveStyle(w4, 4, 26);
    const ws5 = waveStyle(w5, 4, 18);

    // Header icon animations
    const musicPulse  = useSharedValue(0);
    const musicPulse2 = useSharedValue(0);
    const musicBounce = useSharedValue(0);
    const musicNote1  = useSharedValue(0);
    const musicNote2  = useSharedValue(0);

    const musicPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 0.7 + musicPulse.value * 1.3 }],
        opacity: 0.65 * (1 - musicPulse.value),
    }));
    const musicPulse2Style = useAnimatedStyle(() => ({
        transform: [{ scale: 0.7 + musicPulse2.value * 1.3 }],
        opacity: 0.45 * (1 - musicPulse2.value),
    }));
    const musicBounceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: musicBounce.value * 5 }],
    }));
    const musicNote1Style = useAnimatedStyle(() => ({
        transform: [
            { translateY: -musicNote1.value * 22 },
            { translateX: musicNote1.value * 14 },
        ] as any,
        opacity: musicNote1.value < 0.6 ? musicNote1.value * 1.6 : (1 - musicNote1.value) * 2.5,
    }));
    const musicNote2Style = useAnimatedStyle(() => ({
        transform: [
            { translateY: -musicNote2.value * 18 },
            { translateX: -musicNote2.value * 12 },
        ] as any,
        opacity: musicNote2.value < 0.6 ? musicNote2.value * 1.6 : (1 - musicNote2.value) * 2.5,
    }));

    // Entry / exit slide + icon animations
    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
                RNAnimated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();

            // Start icon animations
            musicPulse.value  = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 0 })), -1, false);
            musicPulse2.value = withDelay(900, withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 0 })), -1, false));
            musicBounce.value = withRepeat(withSequence(withTiming(-1, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, true);
            musicNote1.value  = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 400 })), -1, false);
            musicNote2.value  = withDelay(650, withRepeat(withSequence(withTiming(1, { duration: 950 }), withTiming(0, { duration: 350 })), -1, false));
        } else {
            musicPulse.value = 0; musicPulse2.value = 0;
            musicBounce.value = 0; musicNote1.value = 0; musicNote2.value = 0;
        }
    }, [visible]);

    // Waveform animation while sound plays
    useEffect(() => {
        if (activeSound) {
            w1.value = withRepeat(withSequence(withTiming(1,   { duration: 380 }), withTiming(0.15, { duration: 420 })), -1, false);
            w2.value = withRepeat(withSequence(withTiming(0.2, { duration: 310 }), withTiming(1,    { duration: 490 })), -1, false);
            w3.value = withRepeat(withSequence(withTiming(0.3, { duration: 360 }), withTiming(1,    { duration: 340 })), -1, false);
            w4.value = withRepeat(withSequence(withTiming(1,   { duration: 510 }), withTiming(0.2,  { duration: 290 })), -1, false);
            w5.value = withRepeat(withSequence(withTiming(0.8, { duration: 400 }), withTiming(0.15, { duration: 400 })), -1, false);
        } else {
            w1.value = 0.3; w2.value = 0.5; w3.value = 0.8; w4.value = 0.4; w5.value = 0.3;
        }
    }, [activeSound]);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
            if (g.dy > 0) {
                slideAnim.setValue(g.dy);
                backdropAnim.setValue(Math.max(0, 1 - g.dy / 300));
            }
        },
        onPanResponderRelease: (_, g) => {
            if (g.dy > 100 || g.vy > 0.5) {
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                RNAnimated.parallel([
                    RNAnimated.timing(slideAnim,   { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
                    RNAnimated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                ]).start(() => onClose());
            } else {
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
                    RNAnimated.spring(backdropAnim, { toValue: 1, useNativeDriver: true }),
                ]).start();
            }
        },
    }), [slideAnim, backdropAnim, onClose]);

    const handleClose = () => {
        RNAnimated.parallel([
            RNAnimated.timing(slideAnim,   { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
            RNAnimated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const activeConfig = SOUNDS.find(s => s.id === activeSound);
    const accentColor = activeConfig?.color ?? '#A78BFA';

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            {/* Backdrop */}
            <RNAnimated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </TouchableOpacity>
            </RNAnimated.View>

            {/* Sheet */}
            <RNAnimated.View
                style={[
                    styles.sheet,
                    { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', transform: [{ translateY: slideAnim }] }
                ]}
            >
                {/* Drag handle */}
                <View style={styles.handleArea} {...panResponder.panHandlers}>
                    <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
                </View>

                {/* Close button */}
                <TouchableOpacity style={styles.closeIconBtn} onPress={handleClose} activeOpacity={0.7}>
                    <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                </TouchableOpacity>

                {/* Animated header — centered icon on top, text below */}
                <View style={styles.iconHeader} {...panResponder.panHandlers}>
                    {/* Animated music icon */}
                    <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8, zIndex: 2 }}>
                        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.whiteNoise.color }, musicPulseStyle]} />
                        
                        {/* Main icon with bounce */}
                        <Animated.View style={musicBounceStyle}>
                            <View style={[{ 
                                width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: theme.actionColors.whiteNoise.color,
                                shadowColor: isDarkMode ? 'transparent' : theme.actionColors.whiteNoise.color,
                                shadowOpacity: 0.35,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 5 },
                                borderWidth: 2.5,
                                borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                            }]}>
                                <Music size={28} color="#FFFFFF" strokeWidth={2.2} />
                            </View>
                        </Animated.View>

                        {/* Floating music notes */}
                        <Animated.View style={[styles.floatingNote, { top: 0, right: -4, zIndex: 10 }, musicNote1Style]}>
                            <Music2 size={14} color={isDarkMode ? '#FFFFFF' : theme.actionColors.whiteNoise.color} strokeWidth={2.5} />
                        </Animated.View>
                        <Animated.View style={[styles.floatingNote, { top: -2, left: -6, zIndex: 10 }, musicNote2Style]}>
                            <Music2 size={11} color={isDarkMode ? '#FFFFFF' : theme.actionColors.whiteNoise.color} strokeWidth={2.5} />
                        </Animated.View>
                    </View>

                    {/* Title + subtitle / now playing */}
                    <View style={styles.iconHeaderText}>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('whiteNoise.title')}</Text>
                        {activeSound ? (
                            <View style={styles.nowPlayingRow}>
                                <View style={styles.waveform}>
                                    {([ws1, ws2, ws3, ws4, ws5] as any[]).map((ws, i) => (
                                        <Animated.View key={i} style={[styles.waveBar, { backgroundColor: accentColor }, ws]} />
                                    ))}
                                </View>
                                <Text style={[styles.nowPlaying, { color: accentColor }]}>{activeConfig?.label}</Text>
                            </View>
                        ) : (
                            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{t('whiteNoise.subtitle')}</Text>
                        )}
                    </View>
                </View>

                {/* Sound grid */}
                <View style={[styles.grid, { paddingHorizontal: gridPad }]}>
                    {SOUNDS.map(sound => {
                        const isActive = activeSound === sound.id;
                        const { Icon } = sound;
                        return (
                            <TouchableOpacity
                                key={sound.id}
                                style={[
                                    styles.card,
                                    {
                                        width: cardWidth,
                                        backgroundColor: isActive
                                            ? sound.color
                                            : isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                                        borderColor: isActive
                                            ? sound.color
                                            : isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                    }
                                ]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    toggleSound(sound.id as SoundId);
                                }}
                                activeOpacity={0.8}
                                disabled={isLoading}
                            >
                                <View style={[
                                    styles.cardIcon,
                                    {
                                        backgroundColor: isActive
                                            ? 'transparent'
                                            : 'transparent'
                                    }
                                ]}>
                                    <Icon size={24} color={isActive ? '#ffffff' : (isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)')} strokeWidth={1.8} />
                                </View>
                                <View style={{ alignItems: 'center', gap: 2 }}>
                                    <Text style={[styles.cardLabel, { color: isActive ? '#fff' : theme.textPrimary }]}>
                                        {sound.label}
                                    </Text>
                                    {isActive && (
                                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                                            לחיצה לעצירה
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Volume */}
                {activeSound && (
                    <View style={[styles.section, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }]}>
                        <View style={styles.row}>
                            {volume === 0 ? <VolumeX size={16} color={theme.textSecondary} /> :
                             volume < 0.5 ? <Volume1 size={16} color={theme.textSecondary} /> :
                                            <Volume2 size={16} color={theme.textSecondary} />}
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                                {t('whiteNoise.volume', { percent: Math.round(volume * 100).toString() })}
                            </Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            value={volume}
                            onValueChange={setVolume}
                            minimumValue={0}
                            maximumValue={1}
                            minimumTrackTintColor={activeConfig?.color ?? '#A78BFA'}
                            maximumTrackTintColor={isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}
                            thumbTintColor={activeConfig?.color ?? '#A78BFA'}
                        />
                    </View>
                )}

                {/* Timer */}
                {activeSound && (
                    <View style={styles.timerSection}>
                        <View style={styles.row}>
                            <Clock size={16} color={theme.textSecondary} />
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{t('whiteNoise.sleepTimer')}</Text>
                            {timeRemaining !== null && (
                                <View style={[styles.timerBadge, { backgroundColor: (activeConfig?.color ?? '#A78BFA') + '22' }]}>
                                    <Clock size={12} color={activeConfig?.color ?? '#A78BFA'} strokeWidth={2.5} />
                                    <Text style={[styles.timerBadgeText, { color: activeConfig?.color ?? '#A78BFA' }]}>
                                        {formatTime(timeRemaining)}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.timerBtns}>
                            {([15, 30, 60] as const).map(mins => (
                                <TouchableOpacity
                                    key={mins}
                                    style={[
                                        styles.timerBtn,
                                        {
                                            backgroundColor: sleepTimer === mins
                                                ? activeConfig?.color ?? '#A78BFA'
                                                : isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6'
                                        }
                                    ]}
                                    onPress={() => startTimer(mins)}
                                >
                                    <Text style={[styles.timerBtnText, { color: sleepTimer === mins ? '#fff' : theme.textPrimary }]}>
                                        {t('whiteNoise.minutes', { mins: mins.toString() })}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            {sleepTimer && (
                                <TouchableOpacity style={[styles.timerBtn, { backgroundColor: '#EF4444' }]} onPress={stopTimer}>
                                    <Text style={[styles.timerBtnText, { color: '#fff' }]}>{t('whiteNoise.cancelTimer')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Tip */}
                <View style={styles.tipRow}>
                    <Music size={12} color={theme.textTertiary} strokeWidth={1.5} />
                    <Text style={[styles.tip, { color: theme.textTertiary }]}>
                        {t('whiteNoise.backgroundNote')}
                    </Text>
                </View>
            </RNAnimated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 44,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 0,
    },
    handleArea: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    // Animated icon header — centered column
    iconHeader: {
        flexDirection: 'column',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 18,
        gap: 8,
    },
    iconContainer: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    iconPulse: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 1.5,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingNote: {
        position: 'absolute',
    },
    iconHeaderText: {
        alignItems: 'center',
        gap: 4,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    nowPlayingRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    nowPlaying: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        height: 20,
    },
    waveBar: {
        width: 3,
        borderRadius: 2,
    },
    closeIconBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.04)',
        zIndex: 10,
    },
    grid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    card: {
        width: '30%',
        paddingVertical: 18,
        paddingHorizontal: 10,
        borderRadius: 22,
        alignItems: 'center',
        borderWidth: 1,
        gap: 10,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 18,
    },
    timerSection: {
        marginHorizontal: 20,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    slider: {
        width: '100%',
        height: 36,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    timerBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    timerBtns: {
        flexDirection: 'row-reverse',
        gap: 8,
    },
    timerBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 14,
        alignItems: 'center',
    },
    timerBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
        paddingHorizontal: 24,
    },
    tip: {
        fontSize: 12,
    },
});
