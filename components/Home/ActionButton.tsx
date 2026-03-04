import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Timer, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

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

    const handlePress = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
    }, [onPress]);

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={handlePress}
            style={styles.actionItem}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}
        >
            {/* Icon Container — Premium rounded square with per-category color tint */}
            <View style={styles.iconWrapper}>
                <View style={[
                    styles.iconContainer,
                    {
                        backgroundColor: config.lightColor,
                        shadowColor: isDarkMode ? 'transparent' : '#000',
                    },
                    isActive && {
                        backgroundColor: config.accentColor,
                        shadowColor: config.accentColor,
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                    },
                    config.hasBorder && styles.iconContainerDashed,
                ]}>
                    {isActive ? (
                        <Pause size={19} color="#FFFFFF" strokeWidth={1.5} />
                    ) : (
                        <Icon size={19} color={config.color} strokeWidth={1.5} />
                    )}
                </View>
                {/* Badge dot — shown when badge has pending items (e.g. "0/2", "1/2") */}
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
                    }
                    return null;
                })()}
            </View>

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
        width: 72,
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 8,
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
        width: 54,
        height: 54,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        // Diffused premium floating shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    iconContainerDashed: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    label: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 3,
        letterSpacing: -0.1,
    },
    subText: {
        fontSize: 11,
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
