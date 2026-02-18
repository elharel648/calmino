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

                    {/* Removed celebration badge for minimalist design */}

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
                                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                                        ]}>
                                            <Sun size={22} color={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'} strokeWidth={1.5} />
                                        </View>
                                    )}
                                </View>
                                <Text style={[
                                    styles.medText,
                                    { color: meds.vitaminD ? theme.primary : theme.textPrimary }
                                ]}>
                                    ויטמין D
                                </Text>
                                <Text style={[
                                    styles.medStatus,
                                    { color: meds.vitaminD ? theme.primary : theme.textSecondary }
                                ]}>
                                    {meds.vitaminD ? 'ניתן' : 'לא ניתן'}
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
                                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                                        ]}>
                                            <Droplet size={22} color={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'} strokeWidth={1.5} />
                                        </View>
                                    )}
                                </View>
                                <Text style={[
                                    styles.medText,
                                    { color: meds.iron ? theme.primary : theme.textPrimary }
                                ]}>
                                    ברזל
                                </Text>
                                <Text style={[
                                    styles.medStatus,
                                    { color: meds.iron ? theme.primary : theme.textSecondary }
                                ]}>
                                    {meds.iron ? 'ניתן' : 'לא ניתן'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* Progress indicator */}
                    <View style={styles.progressContainer}>
                        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                            {(meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0)}/2 ניתנו היום
                        </Text>
                        <View style={[
                            styles.progressTrack,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                        ]}>
                            <LinearGradient
                                colors={['#8B5CF6', '#A78BFA']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[
                                    styles.progressFill,
                                    { width: `${((meds.vitaminD ? 1 : 0) + (meds.iron ? 1 : 0)) * 50}%` }
                                ]}
                            />
                        </View>
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
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly darker overlay for focus
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 28,
        paddingVertical: 32,
        paddingHorizontal: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
        elevation: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'right',
        marginRight: 12,
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    celebrationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(34, 197, 94, 0.1)', // Very subtle green
        gap: 6,
        alignSelf: 'center',
        marginBottom: 20,
    },
    celebrationText: {
        color: '#16A34A', // Darker green text
        fontSize: 13,
        fontWeight: '600',
    },
    buttonsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 12,
    },
    medBtn: {
        width: 140,
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    medBtnDone: {
        backgroundColor: 'rgba(139, 92, 246, 0.06)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    medIconWrapper: {
        marginBottom: 10,
    },
    medIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    medIconGradient: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8B5CF6',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    medText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
        textAlign: 'center',
        marginTop: 4,
    },
    medStatus: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
        opacity: 0.5,
    },
    progressContainer: {
        marginTop: 28,
        alignItems: 'center',
        gap: 10,
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
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.6,
        letterSpacing: -0.2,
    },
});

export default SupplementsModal;
