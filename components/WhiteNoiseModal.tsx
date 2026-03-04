import React, { useRef, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Platform, Animated as RNAnimated, PanResponder, Dimensions, useWindowDimensions, StyleSheet as RNStyleSheet
} from 'react-native';
import { CloudRain, Wind, Heart, Fan, Volume2, Volume1, VolumeX, Clock, Music, Music2, Star, Sparkles, Baby } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolate
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useAudio, SoundId } from '../context/AudioContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WhiteNoiseModalProps {
    visible: boolean;
    onClose: () => void;
}

const SOUNDS = [
    { id: 'lullaby1',  label: 'שיר ערש',      Icon: Music2,    color: '#818CF8', bgLight: '#EEF2FF', bgDark: 'rgba(129,140,248,0.14)' },
    { id: 'lullaby2',  label: 'מוזיקה עדינה',  Icon: Star,      color: '#F472B6', bgLight: '#FDF2F8', bgDark: 'rgba(244,114,182,0.14)' },
    { id: 'lullaby3',  label: 'ניגון שלווה',   Icon: Sparkles,  color: '#FB923C', bgLight: '#FFF7ED', bgDark: 'rgba(251,146,60,0.14)'  },
    { id: 'lullaby4',  label: 'שיר לילה',      Icon: Baby,      color: '#34D399', bgLight: '#ECFDF5', bgDark: 'rgba(52,211,153,0.14)'  },
    { id: 'rain',      label: 'גשם עדין',      Icon: CloudRain, color: '#38BDF8', bgLight: '#F0F9FF', bgDark: 'rgba(56,189,248,0.12)'  },
    { id: 'shh',       label: 'רעש לבן',       Icon: Wind,      color: '#A78BFA', bgLight: '#F5F3FF', bgDark: 'rgba(167,139,250,0.12)' },
    { id: 'heartbeat', label: 'לב אמא',        Icon: Heart,     color: '#F9A8D4', bgLight: '#FDF2F8', bgDark: 'rgba(249,168,212,0.12)' },
    { id: 'dryer',     label: 'מייבש',         Icon: Fan,       color: '#6EE7B7', bgLight: '#ECFDF5', bgDark: 'rgba(110,231,183,0.12)' },
] as const;

export default function WhiteNoiseModal({ visible, onClose }: WhiteNoiseModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { activeSound, volume, isLoading, toggleSound, setVolume, sleepTimer, timeRemaining, startTimer, stopTimer } = useAudio();
    const { width: screenW } = useWindowDimensions();
    const isSmall = screenW < 390;
    // 2 columns on small screens, 3 on large
    const cardWidth = isSmall ? '47%' : '30%';
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

    // Entry / exit slide
    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
                RNAnimated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
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

                {/* Header */}
                <View style={styles.header} {...panResponder.panHandlers}>
                    <Text style={[styles.title, { color: theme.textPrimary, fontSize: titleSize }]}>מוזיקה לשינה</Text>
                    {/* Waveform + active sound name */}
                    {activeSound ? (
                        <View style={styles.waveformArea}>
                            <Text style={[styles.nowPlaying, { color: activeConfig?.color ?? '#A78BFA' }]}>
                                {activeConfig?.label}
                            </Text>
                            <View style={styles.waveform}>
                                {([ws1, ws2, ws3, ws4, ws5] as any[]).map((ws, i) => (
                                    <Animated.View
                                        key={i}
                                        style={[styles.waveBar, { backgroundColor: activeConfig?.color ?? '#A78BFA' }, ws]}
                                    />
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.wavePlaceholder} />
                    )}
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
                                            : isDarkMode ? 'rgba(255,255,255,0.06)' : sound.bgLight,
                                        borderColor: isActive
                                            ? 'transparent'
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
                                            ? 'rgba(255,255,255,0.25)'
                                            : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)'
                                    }
                                ]}>
                                    <Icon size={18} color={isActive ? '#fff' : sound.color} strokeWidth={1.8} />
                                </View>
                                <Text style={[styles.cardLabel, { color: isActive ? '#fff' : theme.textPrimary }]}>
                                    {sound.label}
                                </Text>
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
                                עוצמה: {Math.round(volume * 100)}%
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
                            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>טיימר שינה</Text>
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
                                        {mins} דק'
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            {sleepTimer && (
                                <TouchableOpacity style={[styles.timerBtn, { backgroundColor: '#EF4444' }]} onPress={stopTimer}>
                                    <Text style={[styles.timerBtnText, { color: '#fff' }]}>בטל</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {/* Tip */}
                <View style={styles.tipRow}>
                    <Music size={12} color={theme.textTertiary} strokeWidth={1.5} />
                    <Text style={[styles.tip, { color: theme.textTertiary }]}>
                        הסאונד ימשיך לנגן גם כשהמסך כבוי
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
        elevation: 12,
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
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    waveformArea: {
        alignItems: 'flex-end',
        gap: 4,
    },
    nowPlaying: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 28,
    },
    waveBar: {
        width: 4,
        borderRadius: 2,
    },
    wavePlaceholder: {
        height: 38,
        width: 44,
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
