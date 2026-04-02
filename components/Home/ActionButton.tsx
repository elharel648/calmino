import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Timer, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }, [scale]);

    const handlePress = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    }, [onPress]);

    // Dynamic card background
    const cardBg = isActive
        ? config.accentColor
        : isDarkMode
            ? `${config.color}18`
            : config.lightColor;

    // Icon circle background
    const iconCircleBg = isActive
        ? 'rgba(255,255,255,0.22)'
        : isDarkMode
            ? `${config.color}25`
            : `${config.color}18`;

    // Text color
    const textColor = isActive
        ? '#FFFFFF'
        : theme.textPrimary;

    const subTextColor = isActive
        ? 'rgba(255,255,255,0.8)'
        : `${config.color}CC`;

    // Glow shadow (only in dark mode for premium feel)
    const glowStyle = isDarkMode ? {
        shadowColor: isActive ? config.accentColor : config.color,
        shadowOpacity: isActive ? 0.35 : 0.12,
        shadowRadius: isActive ? 16 : 10,
        shadowOffset: { width: 0, height: 4 },
    } : {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
    };

    // Badge rendering
    const renderBadge = () => {
        if (!badge) return null;
        const parts = badge.split('/');
        let displayNum: number | null = null;

        if (parts.length === 2) {
            const done = parseInt(parts[0]);
            const total = parseInt(parts[1]);
            if (done < total) displayNum = total - done;
        } else {
            const num = parseInt(badge);
            if (!isNaN(num) && num > 0) displayNum = num;
        }

        if (displayNum === null) return null;

        return (
            <View style={styles.badgeDot}>
                <Text style={styles.badgeDotText}>{displayNum}</Text>
            </View>
        );
    };

    return (
        <AnimatedTouchable
            activeOpacity={1}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
                styles.card,
                animatedStyle,
                {
                    backgroundColor: cardBg,
                    borderColor: isActive
                        ? 'transparent'
                        : isDarkMode
                            ? `${config.color}20`
                            : `${config.color}15`,
                },
                glowStyle,
                config.hasBorder && !isActive && styles.cardDashed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
        >
            {/* Icon Circle */}
            <View style={styles.iconRow}>
                <View style={[
                    styles.iconCircle,
                    { backgroundColor: iconCircleBg },
                ]}>
                    {isActive ? (
                        <Pause size={16} color="#FFFFFF" strokeWidth={2} />
                    ) : (
                        <Icon size={16} color={config.color} strokeWidth={2} />
                    )}
                </View>
                {renderBadge()}
            </View>

            {/* Label */}
            <Text
                style={[styles.label, { color: textColor }]}
                numberOfLines={1}
            >
                {label}
            </Text>

            {/* Sub info: timer or last time */}
            {activeTime && isActive ? (
                <View style={[styles.timerBadge, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                    <Timer size={8} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.timerText}>{activeTime}</Text>
                </View>
            ) : lastTime ? (
                <Text style={[styles.subText, { color: subTextColor }]}>
                    {lastTime}
                </Text>
            ) : (
                <View style={styles.subPlaceholder} />
            )}
        </AnimatedTouchable>
    );
});

ActionButton.displayName = 'ActionButton';

// Keep exports for backwards compatibility
export const setHasAnimated = (_value: boolean) => { };
export const getHasAnimated = () => true;

const styles = StyleSheet.create({
    card: {
        width: 78,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 22,
        alignItems: 'center',
        borderWidth: 0.5,
        elevation: 0,
    },
    cardDashed: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    iconRow: {
        position: 'relative',
        marginBottom: 8,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeDot: {
        position: 'absolute',
        top: -5,
        right: -8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.3)',
    },
    badgeDotText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: -0.2,
        marginBottom: 3,
    },
    subText: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    subPlaceholder: {
        height: 15,
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
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
});

export default ActionButton;
