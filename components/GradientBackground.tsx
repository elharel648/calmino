import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface GradientBackgroundProps {
    children: React.ReactNode;
}

/**
 * Premium Lavender Gradient Background
 * Used consistently across all screens
 */
export default function GradientBackground({ children }: GradientBackgroundProps) {
    const { isDarkMode } = useTheme();

    return (
        <LinearGradient
            colors={isDarkMode
                ? ['#0F0F0F', '#1C1C1E', '#0A0A0A']
                : ['#F5F3FF', '#EDE9FE', '#FAF5FF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
