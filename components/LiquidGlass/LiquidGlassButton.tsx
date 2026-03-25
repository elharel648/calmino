/**
 * LiquidGlassButton - Apple iOS 18 Style Liquid Glass Button
 * Premium button with glass effect and haptic feedback
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface LiquidGlassButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'accent';
    size?: 'small' | 'medium' | 'large';
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
}

const VARIANT_COLORS = {
    primary: {
        gradient: ['rgba(0, 122, 255, 0.6)', 'rgba(88, 86, 214, 0.6)'],
        glow: 'rgba(0, 122, 255, 0.5)',
        border: 'rgba(255, 255, 255, 0.5)',
    },
    secondary: {
        gradient: ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.15)'],
        glow: 'rgba(255, 255, 255, 0.3)',
        border: 'rgba(255, 255, 255, 0.4)',
    },
    accent: {
        gradient: ['rgba(255, 45, 85, 0.6)', 'rgba(255, 149, 0, 0.6)'],
        glow: 'rgba(255, 45, 85, 0.5)',
        border: 'rgba(255, 255, 255, 0.5)',
    },
};

const SIZE_STYLES = {
    small: { paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
    medium: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 16 },
    large: { paddingHorizontal: 32, paddingVertical: 18, fontSize: 18 },
};

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    style,
    textStyle,
    disabled = false,
}) => {
    const colors = VARIANT_COLORS[variant];
    const sizeStyle = SIZE_STYLES[size];

    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[styles.container, style]}
        >
            {/* Glow Effect */}
            <LinearGradient
                colors={[colors.glow, 'transparent']}
                style={[
                    styles.glow,
                    {
                        shadowColor: colors.glow,
                    },
                ]}
            />

            {/* Glass Button */}
            <BlurView intensity={60} tint="light" style={styles.blurContainer}>
                <LinearGradient
                    colors={colors.gradient as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientContainer}
                >
                    {/* Border Highlight */}
                    <LinearGradient
                        colors={[colors.border, 'rgba(255, 255, 255, 0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.borderGradient}
                    />

                    {/* Button Content */}
                    <Text
                        style={[
                            styles.text,
                            {
                                fontSize: sizeStyle.fontSize,
                                paddingHorizontal: sizeStyle.paddingHorizontal,
                                paddingVertical: sizeStyle.paddingVertical,
                            },
                            textStyle,
                            disabled && styles.disabledText,
                        ]}
                    >
                        {title}
                    </Text>
                </LinearGradient>
            </BlurView>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        borderRadius: 16,
    },
    glow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 0,
    },
    blurContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradientContainer: {
        borderRadius: 16,
        position: 'relative',
    },
    borderGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    text: {
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    disabledText: {
        opacity: 0.5,
    },
});
