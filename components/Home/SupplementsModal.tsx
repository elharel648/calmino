import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Animated as RNAnimated } from 'react-native';
import { Sun, Droplet, Check, Pill, Sparkles, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';

interface SupplementsModalProps {
    visible: boolean;
    onClose: () => void;
    meds: MedicationsState;
    onToggle: (type: 'vitaminD' | 'iron') => void;
    onRefresh?: () => void;
}

const SupplementsModal = memo(({ visible, onClose, meds, onToggle, onRefresh }: SupplementsModalProps) => {
    const { theme, isDarkMode } = useTheme();

    // Animation values - MUST be before any early return
    const vitaminDScale = useSharedValue(1);
    const ironScale = useSharedValue(1);
    const checkVitaminD = useSharedValue(meds.vitaminD ? 1 : 0);
    const checkIron = useSharedValue(meds.iron ? 1 : 0);
    const celebrationScale = useSharedValue(0);
    const celebrationOpacity = useSharedValue(0);
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;
    const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;

    // Animated styles - MUST be before any early return
    const vitaminDStyle = useAnimatedStyle(() => ({
        transform: [{ scale: vitaminDScale.value }],
    }));

    const ironStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ironScale.value }],
    }));

    const celebrationStyle = useAnimatedStyle(() => ({
        transform: [{ scale: celebrationScale.value }],
        opacity: celebrationOpacity.value,
    }));

    // Modal animations - popup in center
    useEffect(() => {
        if (visible) {
            RNAnimated.parallel([
                RNAnimated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
            ]).start();
        } else {
            RNAnimated.parallel([
                RNAnimated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                RNAnimated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    // Sync animation state with meds prop
    useEffect(() => {
        checkVitaminD.value = withSpring(meds.vitaminD ? 1 : 0, { damping: 12 });
        checkIron.value = withSpring(meds.iron ? 1 : 0, { damping: 12 });

        // Celebration when both are done
        if (meds.vitaminD && meds.iron) {
            celebrationScale.value = withSequence(
                withSpring(1.2, { damping: 8, stiffness: 200 }),
                withSpring(1, { damping: 10 })
            );
            celebrationOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(1500, withTiming(0, { duration: 300 }))
            );
        }
    }, [meds.vitaminD, meds.iron]);

    const handleClose = () => {
        RNAnimated.parallel([
            RNAnimated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            RNAnimated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            onClose();
        });
    };

    const handleToggle = (type: 'vitaminD' | 'iron') => {
        const isCurrentlyTaken = meds[type];

        // Bounce animation
        if (type === 'vitaminD') {
            vitaminDScale.value = withSequence(
                withSpring(0.9, { damping: 5, stiffness: 400 }),
                withSpring(1.1, { damping: 5, stiffness: 400 }),
                withSpring(1, { damping: 10, stiffness: 300 })
            );
        } else {
            ironScale.value = withSequence(
                withSpring(0.9, { damping: 5, stiffness: 400 }),
                withSpring(1.1, { damping: 5, stiffness: 400 }),
                withSpring(1, { damping: 10, stiffness: 300 })
            );
        }

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(
                isCurrentlyTaken
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
            );
        }

        onToggle(type);

        if (!isCurrentlyTaken && onRefresh) {
            setTimeout(onRefresh, 300);
        }
    };

    // Early return AFTER all hooks
    if (!visible) return null;

    const allDone = meds.vitaminD && meds.iron;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <RNAnimated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <RNAnimated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme.card,
                            transform: [{ scale: scaleAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[
                            styles.iconCircle,
                            { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : theme.primaryLight }
                        ]}>
                            <Pill size={20} color={theme.primary} strokeWidth={2} />
                        </View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            תוספים יומיים
                        </Text>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Celebration badge */}
                    {allDone && (
                        <Animated.View style={[styles.celebrationBadge, { backgroundColor: theme.success }, celebrationStyle]}>
                            <Sparkles size={16} color="#fff" strokeWidth={2} />
                            <Text style={styles.celebrationText}>כל הכבוד! 🎉</Text>
                        </Animated.View>
                    )}

                    {/* Supplements */}
                    <View style={styles.buttonsRow}>
                        {/* Vitamin D */}
                        <Animated.View style={vitaminDStyle}>
                            <TouchableOpacity
                                style={[
                                    styles.medBtn,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB' },
                                    meds.vitaminD && styles.medBtnDone
                                ]}
                                onPress={() => handleToggle('vitaminD')}
                                activeOpacity={0.85}
                            >
                                <View style={styles.medIconWrapper}>
                                    {meds.vitaminD ? (
                                        <LinearGradient
                                            colors={[theme.success, theme.success]}
                                            style={styles.medIconGradient}
                                        >
                                            <Check size={24} color="#fff" strokeWidth={2.5} />
                                        </LinearGradient>
                                    ) : (
                                        <View style={[
                                            styles.medIcon,
                                            { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : '#FEF3C7' }
                                        ]}>
                                            <Sun size={24} color="#F59E0B" strokeWidth={2} />
                                        </View>
                                    )}
                                </View>
                                <Text style={[
                                    styles.medText,
                                    { color: meds.vitaminD ? theme.success : theme.textPrimary }
                                ]}>
                                    ויטמין D
                                </Text>
                                <Text style={[
                                    styles.medStatus,
                                    { color: meds.vitaminD ? theme.success : theme.textSecondary }
                                ]}>
                                    {meds.vitaminD ? 'ניתן ✓' : 'לא ניתן'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        {/* Iron */}
                        <Animated.View style={ironStyle}>
                            <TouchableOpacity
                                style={[
                                    styles.medBtn,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB' },
                                    meds.iron && styles.medBtnDone
                                ]}
                                onPress={() => handleToggle('iron')}
                                activeOpacity={0.85}
                            >
                                <View style={styles.medIconWrapper}>
                                    {meds.iron ? (
                                        <LinearGradient
                                            colors={[theme.success, theme.success]}
                                            style={styles.medIconGradient}
                                        >
                                            <Check size={24} color="#fff" strokeWidth={2.5} />
                                        </LinearGradient>
                                    ) : (
                                        <View style={[
                                            styles.medIcon,
                                            { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }
                                        ]}>
                                            <Droplet size={24} color="#EF4444" strokeWidth={2} />
                                        </View>
                                    )}
                                </View>
                                <Text style={[
                                    styles.medText,
                                    { color: meds.iron ? theme.success : theme.textPrimary }
                                ]}>
                                    ברזל
                                </Text>
                                <Text style={[
                                    styles.medStatus,
                                    { color: meds.iron ? theme.success : theme.textSecondary }
                                ]}>
                                    {meds.iron ? 'ניתן ✓' : 'לא ניתן'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Progress indicator */}
                    <View style={styles.progressContainer}>
                        <View style={[
                            styles.progressTrack,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.border }
                        ]}>
                            <LinearGradient
                                colors={[theme.success, theme.success]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                    styles.progressFill,
                                    { width: `${((meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0)) * 50}%` }
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                            {(meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0)}/2 ניתנו היום
                        </Text>
                    </View>
                </RNAnimated.View>
            </RNAnimated.View>
        </Modal>
    );
});

SupplementsModal.displayName = 'SupplementsModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 28,
        paddingVertical: 28,
        paddingHorizontal: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'right',
        marginRight: 12,
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    celebrationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6,
        alignSelf: 'center',
        marginBottom: 16,
    },
    celebrationText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    buttonsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 16,
    },
    medBtn: {
        width: 130,
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignItems: 'center',
    },
    medBtnDone: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
    },
    medIconWrapper: {
        marginBottom: 12,
    },
    medIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    medIconGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        // Success glow
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    medText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    medStatus: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    progressContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    progressTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        marginTop: 10,
        fontSize: 13,
        fontWeight: '500',
    },
});

export default SupplementsModal;
