import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Timer, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, Easing } from 'react-native-reanimated';

interface ActionButtonProps {
    config: {
        icon: any;
        color: string;
        lightColor: string;
        accentColor: string;
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
    const rippleOpacity = useSharedValue(0);
    const rippleScale = useSharedValue(0.1);
    const iconScale = useSharedValue(1);

    const handlePress = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    }, [onPress]);

    const handlePressIn = useCallback(() => {
        // High tension spring down to simulate premium physical button depth
        scale.value = withSpring(0.97, { stiffness: 400, damping: 25 });

        // Ripple effect start
        rippleScale.value = 0.1;
        rippleOpacity.value = 0.12; // Subtle translucent white
        rippleScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
        rippleOpacity.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) });
    }, [scale, rippleScale, rippleOpacity]);

    const handlePressOut = useCallback(() => {
        // Return to scale 1 immediately
        scale.value = withSpring(1, { stiffness: 250, damping: 25 });
        // Micro-bounce for the checkmark / central icon
        iconScale.value = withSequence(
            withSpring(1.2, { stiffness: 400, damping: 12 }),
            withSpring(1, { stiffness: 400, damping: 15 })
        );
    }, [scale, iconScale]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    const animatedRippleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: rippleScale.value }],
        opacity: rippleOpacity.value,
    }));

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.actionItem}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
        >
            {/* Icon Container — Premium rounded square with per-category color tint */}
            <Animated.View style={[styles.iconWrapper, animatedContainerStyle]}>
                <View style={[
                    styles.iconContainer,
                    {
                        backgroundColor: config.color, // Solid earthy color exactly like Structured
                        // Colored shadow matches the icon
                        shadowColor: isDarkMode ? 'transparent' : config.color,
                        shadowOpacity: isActive ? 0.35 : 0.12,
                        shadowRadius: isActive ? 12 : 8,
                        shadowOffset: isActive ? { width: 0, height: 6 } : { width: 0, height: 3 },
                    },
                    isActive && {
                        // Apple selection indicator rings can be achieved cleanly with thick border
                        borderWidth: 2,
                        borderColor: isDarkMode ? '#FFFFFF' : '#FFFFFF',
                    },
                    config.hasBorder && styles.iconContainerDashed,
                ]}>
                    <Animated.View style={[styles.ripple, animatedRippleStyle]} />
                    <Animated.View style={animatedIconStyle}>
                        {isActive ? (
                            <Pause size={24} color={isDarkMode ? '#000000' : '#FFFFFF'} strokeWidth={2.0} />
                        ) : (
                            <Icon size={24} color={isDarkMode ? '#000000' : '#FFFFFF'} strokeWidth={2.0} />
                        )}
                    </Animated.View>
                </View>
                {/* Badge dot — shown for X/Y format or plain number */}
                {badge && (() => {
                    const parts = badge.split('/');
                    if (parts.length === 2) {
                        const done = parseInt(parts[0]);
                        const total = parseInt(parts[1]);
                        if (done < total) {
                            const remaining = total - done;
                            return (
                                <View style={styles.badgeDot}>
                                    <Text style={styles.badgeDotText}>{remaining}</Text>
                                </View>
                            );
                        }
                    } else {
                        const num = parseInt(badge);
                        if (!isNaN(num) && num > 0) {
                            return (
                                <View style={styles.badgeDot}>
                                    <Text style={styles.badgeDotText}>{num}</Text>
                                </View>
                            );
                        }
                    }
                    return null;
                })()}
            </Animated.View>

            {/* Label */}
            <Text style={[styles.label, { color: theme.textPrimary }]} numberOfLines={2}>
                {label}
            </Text>

            {/* Sub info */}
            {activeTime && isActive ? (
                <View style={[styles.timerBadge, { backgroundColor: config.accentColor }]}>
                    <Timer size={7} color="#FFFFFF" strokeWidth={1.5} />
                    <Text style={styles.timerText}>{activeTime}</Text>
                </View>
            ) : lastTime ? (
                <Text style={[styles.subText, { color: config.accentColor, opacity: 0.75 }]}>
                    {lastTime}
                </Text>
            ) : badge ? (
                // Badge info shown as dot on icon — show empty placeholder here
                <View style={styles.subPlaceholder} />
            ) : (
                <View style={styles.subPlaceholder} />
            )}
        </TouchableOpacity>
    );
});

ActionButton.displayName = 'ActionButton';

// Keep exports for backwards compatibility
export const setHasAnimated = (_value: boolean) => { };
export const getHasAnimated = () => true;

const styles = StyleSheet.create({
    actionItem: {
        alignItems: 'center',
        width: 80,
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 9,
    },
    ripple: {
        position: 'absolute',
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#FFFFFF',
    },
    badgeDot: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
    badgeDotText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    iconContainer: {
        width: 62,
        height: 62,
        borderRadius: 31,
        alignItems: 'center',
        justifyContent: 'center',
        // Premium floating shadow — colored glow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        elevation: 0,
        // Glass highlight edge
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.80)',
    },
    iconContainerDashed: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    subText: {
        fontSize: 10,
        fontWeight: '400',
    },
    subPlaceholder: {
        height: 14,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
    },
    timerText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.2,
    },
});

export default ActionButton;
