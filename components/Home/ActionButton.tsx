import React, { memo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Timer, Pause } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { ANIMATIONS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../../utils/designSystem';
import { useTheme } from '../../context/ThemeContext';

// Module-level flag
let hasAnimatedOnce = false;

interface ActionButtonProps {
    config: {
        icon: any;
        color: string;
        lightColor: string;
        hasBorder?: boolean;
    };
    configKey: string;
    label: string;
    onPress: () => void;
    isActive?: boolean;
    activeTime?: string;
    lastTime?: string;
    badge?: string;
    index: number;
}

const ActionButton = memo(({
    config,
    configKey,
    label,
    onPress,
    isActive = false,
    activeTime,
    lastTime,
    badge,
    index,
}: ActionButtonProps) => {
    const { theme, isDarkMode } = useTheme();
    const Icon = config.icon;

    const scale = useSharedValue(1);
    const iconScale = useSharedValue(1);
    const pulseScale = useSharedValue(1);

    // Subtle pulse animation for active state - minimalist
    useEffect(() => {
        if (isActive) {
            pulseScale.value = withRepeat(
                withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                -1,
                true
            );
        } else {
            pulseScale.value = withTiming(1, { duration: 200 });
        }
    }, [isActive]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
        iconScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, []);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        iconScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }, []);

    const handlePress = useCallback(() => {
        iconScale.value = withSpring(1.1, { damping: 10, stiffness: 500 }, () => {
            iconScale.value = withSpring(1, { damping: 15, stiffness: 400 });
        });
        onPress();
    }, [onPress]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const iconContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value * (isActive ? pulseScale.value : 1) },
        ],
    }));

    return (
        <Animated.View
            entering={!hasAnimatedOnce ? ANIMATIONS.fadeInUp(ANIMATIONS.stagger(index, 50)) : undefined}
            style={[styles.actionButtonWrapper, containerStyle]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.actionItem}
            >
                {/* Icon Circle */}
                <Animated.View style={iconContainerStyle}>
                    <View style={[
                        styles.iconCircleContainer,
                        isActive && { backgroundColor: config.color },
                        !isActive && { borderColor: theme.border || '#E5E7EB', borderWidth: 1.5 },
                        config.hasBorder && styles.iconCircleBorder
                    ]}>
                        {!isActive && (
                            <>
                                {Platform.OS === 'ios' && (
                                    <BlurView
                                        intensity={60}
                                        tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <View style={[
                                    styles.iconCircleGlass,
                                    { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)' }
                                ]} />
                            </>
                        )}

                        {isActive ? (
                            <Pause size={20} color={theme.card} strokeWidth={2.5} />
                        ) : (
                            <Icon size={20} color={config.color} strokeWidth={2} />
                        )}
                    </View>
                </Animated.View>

                {/* Label */}
                <Text style={[styles.actionLabel, { color: theme.textPrimary }]} numberOfLines={2}>
                    {label}
                </Text>

                {/* Time, Badge, or Last Time */}
                {activeTime && isActive ? (
                    <View style={[styles.timerBadge, { backgroundColor: config.color }]}>
                        <Timer size={7} color={theme.card} strokeWidth={2} />
                        <Text style={[styles.timerText, { color: theme.card }]}>{activeTime}</Text>
                    </View>
                ) : lastTime ? (
                    <Text style={[styles.subText, { color: theme.textSecondary }]}>
                        {lastTime}
                    </Text>
                ) : badge ? (
                    <View style={[styles.badgeContainer, { backgroundColor: config.lightColor }]}>
                        <Text style={[styles.badgeText, { color: config.color }]}>
                            {badge}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.subTextPlaceholder} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );
});

ActionButton.displayName = 'ActionButton';

export const setHasAnimated = (value: boolean) => {
    hasAnimatedOnce = value;
};

export const getHasAnimated = () => hasAnimatedOnce;

const styles = StyleSheet.create({
    actionButtonWrapper: {
        alignItems: 'center',
    },
    actionItem: {
        alignItems: 'center',
        width: 70,
    },
    iconCircleContainer: {
        width: 56,
        height: 56,
        borderRadius: BORDER_RADIUS.round,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
        position: 'relative',
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    iconCircleBorder: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    iconCircleGlass: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BORDER_RADIUS.round,
    },
    actionLabel: {
        ...TYPOGRAPHY.labelSmall,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    subText: {
        ...TYPOGRAPHY.captionSmall,
        opacity: 0.7,
    },
    subTextPlaceholder: {
        height: 14,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: SPACING.xs + 2,
        paddingVertical: 3,
        borderRadius: BORDER_RADIUS.sm,
        marginTop: 2,
    },
    timerText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    badgeContainer: {
        paddingHorizontal: SPACING.xs + 2,
        paddingVertical: 2,
        borderRadius: BORDER_RADIUS.sm,
        marginTop: 2,
    },
    badgeText: {
        ...TYPOGRAPHY.captionSmall,
        fontWeight: '700',
    },
});

export default ActionButton;
