import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    children?: React.ReactNode;
    /** Optional accent color - defaults to theme.primary */
    accentColor?: string;
}

export default function EmptyState({
    icon: Icon,
    title,
    message,
    actionLabel,
    onAction,
    children,
    accentColor,
}: EmptyStateProps) {
    const { theme, isDarkMode } = useTheme();
    const color = accentColor || theme.primary;

    // Animation values
    const iconScale = useSharedValue(0);
    const iconFloat = useSharedValue(0);
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(20);
    const messageOpacity = useSharedValue(0);
    const buttonScale = useSharedValue(0);
    const buttonGlow = useSharedValue(0);

    // Entry animations
    useEffect(() => {
        // Icon bounces in
        iconScale.value = withSpring(1, { damping: 12, stiffness: 200 });

        // Icon floating animation (subtle)
        iconFloat.value = withDelay(
            500,
            withRepeat(
                withSequence(
                    withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            )
        );

        // Title fades in with slide
        titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
        titleTranslateY.value = withDelay(200, withSpring(0, { damping: 15 }));

        // Message fades in
        messageOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));

        // Button springs in
        buttonScale.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 180 }));

        // Button glow pulses
        buttonGlow.value = withDelay(
            800,
            withRepeat(
                withSequence(
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            )
        );
    }, []);

    // Animated styles
    const iconContainerStyle = useAnimatedStyle(() => {
        'worklet';
        return {
            transform: [
                { scale: iconScale.value },
                { translateY: iconFloat.value },
            ] as const,
        };
    });

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const messageStyle = useAnimatedStyle(() => ({
        opacity: messageOpacity.value,
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
        shadowOpacity: 0.3 + buttonGlow.value * 0.2,
    }));

    const handleAction = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onAction?.();
    };

    // Get gradient colors based on accent
    const getGradientColors = (): [string, string] => {
        if (color === '#6366F1') return ['#6366F1', '#8B5CF6']; // Purple
        if (color === '#10B981') return ['#10B981', '#34D399']; // Green
        if (color === '#F59E0B') return ['#F59E0B', '#FBBF24']; // Yellow
        if (color === '#EF4444') return ['#EF4444', '#F87171']; // Red
        return [color, color + 'CC']; // Default: same color with opacity
    };

    return (
        <View style={styles.container}>
            {Icon && (
                <Animated.View style={iconContainerStyle}>
                    <View style={styles.iconWrapper}>
                        {/* Glow ring */}
                        <View style={[
                            styles.iconGlow,
                            {
                                backgroundColor: color,
                                opacity: isDarkMode ? 0.15 : 0.1,
                            }
                        ]} />

                        {/* Gradient circle */}
                        <LinearGradient
                            colors={getGradientColors()}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconContainer}
                        >
                            {/* Inner shine */}
                            <View style={styles.iconShine} />
                            <Icon size={44} color="#fff" strokeWidth={1.8} />
                        </LinearGradient>
                    </View>
                </Animated.View>
            )}

            <Animated.Text style={[
                styles.title,
                { color: theme.textPrimary },
                titleStyle
            ]}>
                {title}
            </Animated.Text>

            {message && (
                <Animated.Text style={[
                    styles.message,
                    { color: theme.textSecondary },
                    messageStyle
                ]}>
                    {message}
                </Animated.Text>
            )}

            {children}

            {actionLabel && onAction && (
                <Animated.View style={buttonStyle}>
                    <TouchableOpacity
                        style={[styles.actionButton]}
                        onPress={handleAction}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={getGradientColors()}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.actionButtonGradient}
                        >
                            <Text style={styles.actionText}>{actionLabel}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 28,
    },
    iconGlow: {
        position: 'absolute',
        top: -16,
        left: -16,
        right: -16,
        bottom: -16,
        borderRadius: 80,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        // Premium shadow
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    iconShine: {
        position: 'absolute',
        top: 8,
        left: 16,
        width: 32,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        transform: [{ rotate: '-20deg' }],
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        lineHeight: 23,
        textAlign: 'center',
        marginBottom: 28,
        maxWidth: 280,
    },
    actionButton: {
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
        // Premium shadow
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 6,
    },
    actionButtonGradient: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
});
