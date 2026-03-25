/**
 * LiquidGlassCard - Apple iOS 18 Style Liquid Glass Card
 * Pixel-perfect recreation of Apple's Liquid Glass effect
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface LiquidGlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    intensity?: number;
    tint?: 'light' | 'dark' | 'default';
    borderRadius?: number;
    glowColor?: string;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({
    children,
    style,
    intensity = 80,
    tint = 'light',
    borderRadius = 24,
    glowColor = 'rgba(255, 255, 255, 0.5)',
}) => {
    return (
        <View style={[styles.container, { borderRadius }, style]}>
            {/* Outer Glow */}
            <View
                style={[
                    styles.outerGlow,
                    {
                        borderRadius,
                        shadowColor: glowColor,
                    },
                ]}
            />

            {/* Glass Layer */}
            <BlurView
                intensity={intensity}
                tint={tint}
                style={[styles.blurContainer, { borderRadius }]}
            >
                {/* Gradient Overlay for depth */}
                <LinearGradient
                    colors={[
                        'rgba(255, 255, 255, 0.25)',
                        'rgba(255, 255, 255, 0.1)',
                        'rgba(255, 255, 255, 0.05)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradientOverlay, { borderRadius }]}
                >
                    {/* Border Highlight */}
                    <View
                        style={[
                            styles.borderHighlight,
                            {
                                borderRadius,
                                borderColor: 'rgba(255, 255, 255, 0.4)',
                            },
                        ]}
                    />

                    {/* Content */}
                    <View style={styles.content}>{children}</View>
                </LinearGradient>
            </BlurView>

            {/* Bottom Shadow for depth */}
            <View
                style={[
                    styles.bottomShadow,
                    {
                        borderRadius,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    outerGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 0,
    },
    blurContainer: {
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    gradientOverlay: {
        flex: 1,
    },
    borderHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 1.5,
    },
    content: {
        padding: 20,
    },
    bottomShadow: {
        position: 'absolute',
        bottom: -4,
        left: 8,
        right: 8,
        height: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 0,
    },
});
