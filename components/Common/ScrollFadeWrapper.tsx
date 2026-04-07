import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface ScrollFadeWrapperProps {
    children: ReactNode;
    fadeHeight?: number;
    topFade?: boolean;
    bottomFade?: boolean;
    fadeColor?: string;
}

/**
 * ScrollFadeWrapper - Premium scroll fade effect
 * Adds gradient fade at top/bottom of scrollable content
 *
 * Usage:
 * <ScrollFadeWrapper>
 *   <ScrollView>
 *     {content}
 *   </ScrollView>
 * </ScrollFadeWrapper>
 */
export default function ScrollFadeWrapper({
    children,
    fadeHeight = 60,
    topFade = true,
    bottomFade = true,
    fadeColor
}: ScrollFadeWrapperProps) {
    const { theme, isDarkMode } = useTheme();

    // Get the base color from theme if not provided
    const baseColor = fadeColor || theme.background;

    return (
        <View style={styles.container}>
            {children}

            {/* Top Fade */}
            {topFade && (
                <LinearGradient
                    colors={[
                        baseColor,
                        baseColor + 'F0',
                        baseColor + 'D0',
                        baseColor + '00',
                    ]}
                    locations={[0, 0.3, 0.7, 1]}
                    style={[styles.topFade, { height: fadeHeight }]}
                    pointerEvents="none"
                />
            )}

            {/* Bottom Fade */}
            {bottomFade && (
                <LinearGradient
                    colors={[
                        baseColor + '00',
                        baseColor + 'D0',
                        baseColor + 'F0',
                        baseColor,
                    ]}
                    locations={[0, 0.3, 0.7, 1]}
                    style={[styles.bottomFade, { height: fadeHeight }]}
                    pointerEvents="none"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    topFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
});
