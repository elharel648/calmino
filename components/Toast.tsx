import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolate,
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
    const translateY = useSharedValue(100);
    const scale = useSharedValue(0.9);
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
                damping: 18,
                stiffness: 250,
                mass: 0.8,
            });
            scale.value = withSpring(1, {
                damping: 15,
                stiffness: 300,
            });
            opacity.value = withTiming(1, { duration: 250 });

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
        translateY.value = withSpring(100, { damping: 20, stiffness: 200 });
        scale.value = withTiming(0.9, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
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
                    backgroundColor: '#10B981',
                    useGlass: false,
                };
            case 'error':
                return {
                    icon: XCircle,
                    backgroundColor: '#EF4444',
                    useGlass: false,
                };
            case 'warning':
                return {
                    icon: AlertCircle,
                    backgroundColor: '#F59E0B',
                    useGlass: false,
                };
            case 'info':
            default:
                return {
                    icon: Info,
                    backgroundColor: isDarkMode ? '#3B82F6' : '#2563EB',
                    useGlass: true,
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={[
                styles.toastWrapper,
                !config.useGlass && { backgroundColor: config.backgroundColor }
            ]}>
                {/* Glass background - only for info type */}
                {config.useGlass && Platform.OS === 'ios' && (
                    <BlurView
                        intensity={80}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}

                {/* Overlay for glass type */}
                {config.useGlass && (
                    <View style={[
                        styles.toastOverlay,
                        {
                            backgroundColor: isDarkMode
                                ? 'rgba(30, 30, 35, 0.85)'
                                : 'rgba(255, 255, 255, 0.9)',
                        }
                    ]} />
                )}

                {/* Content */}
                <View style={styles.toastContent}>
                    {/* Icon */}
                    <Icon size={20} color="#fff" strokeWidth={2.5} />

                    {/* Message */}
                    <Text
                        style={[styles.message, { color: '#fff' }]}
                        numberOfLines={2}
                    >
                        {message}
                    </Text>

                    {/* Action or Close */}
                    {action ? (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => {
                                action.onPress();
                                hide();
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.actionText}>{action.label}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={hide}
                            activeOpacity={0.6}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                            <X size={18} color="#fff" strokeWidth={2.5} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        zIndex: 10000,
        alignItems: 'center',
    },
    toastWrapper: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        // Premium shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
    },
    toastOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    iconContainer: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    message: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        letterSpacing: -0.3,
    },
    actionButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
    },
    actionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginLeft: 4,
    },
    accentLine: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
});

export default Toast;
