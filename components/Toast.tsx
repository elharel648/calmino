import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
    message: string;
    type?: ToastType;
    duration?: number;
    action?: {
        label: string;
        onPress: () => void;
    };
    onDismiss?: () => void;
}

interface ToastProps extends ToastConfig {
    visible: boolean;
    onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({
    visible,
    message,
    type = 'info',
    duration = 3000,
    action,
    onDismiss,
    onHide,
}) => {
    const { theme, isDarkMode } = useTheme();
    const translateY = useSharedValue(80);
    const scale = useSharedValue(0.85);
    const opacity = useSharedValue(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (visible) {
            // Haptic feedback
            if (Platform.OS !== 'web') {
                if (type === 'success') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else if (type === 'error') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            }

            // Show animation - spring for bounce effect
            translateY.value = withSpring(0, {
                damping: 20,
                stiffness: 280,
                mass: 0.7,
            });
            scale.value = withSpring(1, {
                damping: 16,
                stiffness: 300,
            });
            opacity.value = withTiming(1, { duration: 200 });

            // Auto hide
            if (duration > 0) {
                timeoutRef.current = setTimeout(() => {
                    hide();
                }, duration);
            }
        } else {
            hide();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [visible, duration]);

    const hide = () => {
        translateY.value = withSpring(80, { damping: 20, stiffness: 200 });
        scale.value = withTiming(0.85, { duration: 180 });
        opacity.value = withTiming(0, { duration: 180 }, () => {
            runOnJS(onHide)();
            if (onDismiss) {
                runOnJS(onDismiss)();
            }
        });
    };

    const animatedStyle = useAnimatedStyle(() => {
        'worklet';
        return {
            transform: [
                { translateY: translateY.value },
                { scale: scale.value },
            ] as const,
            opacity: opacity.value,
        };
    });

    const getConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: CheckCircle,
                    backgroundColor: '#C8806A',
                    iconBg: 'rgba(255,255,255,0.2)',
                };
            case 'error':
                return {
                    icon: XCircle,
                    backgroundColor: '#EF4444',
                    iconBg: 'rgba(255,255,255,0.2)',
                };
            case 'warning':
                return {
                    icon: AlertCircle,
                    backgroundColor: '#F59E0B',
                    iconBg: 'rgba(255,255,255,0.2)',
                };
            case 'info':
            default:
                return {
                    icon: Info,
                    backgroundColor: isDarkMode ? 'rgba(30, 30, 40, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                    iconBg: isDarkMode ? 'rgba(59,130,246,0.25)' : 'rgba(37,99,235,0.12)',
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;
    const isInfoType = type === 'info';
    const textColor = isInfoType ? theme.textPrimary : '#fff';
    const iconColor = isInfoType ? (isDarkMode ? '#60A5FA' : '#2563EB') : '#fff';

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={[
                styles.pill,
                { backgroundColor: config.backgroundColor }
            ]}>
                {/* Blur only for info type */}
                {isInfoType && Platform.OS === 'ios' && (
                    <BlurView
                        intensity={60}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}

                {/* Icon in circle */}
                <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
                    <Icon size={16} color={iconColor} strokeWidth={2.5} />
                </View>

                {/* Message */}
                <Text
                    style={[styles.message, { color: textColor }]}
                    numberOfLines={1}
                >
                    {message}
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 110,
        left: 0,
        right: 0,
        zIndex: 10000,
        alignItems: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 50,
        gap: 10,
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 4,
        maxWidth: '80%',
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    message: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
        textAlign: 'right',
    },
});

export default Toast;

