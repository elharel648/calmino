import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View, useColorScheme } from 'react-native';
import { Canvas, Circle, Group, BlurMask, LinearGradient, vec } from '@shopify/react-native-skia';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    interpolate,
    useDerivedValue,
    SharedValue, // Import SharedValue directly
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Warm Terracotta / Sand colors - matching app theme
const BLOB_COLORS_LIGHT = {
    blob1: ['#F5E6E0', '#ECD5CB'], // Soft terracotta
    blob2: ['#F9EFEA', '#F0DFD7'], // Lighter sand
    blob3: ['#FAF2EB', '#F2E6DF'], // Pale sand
    blob4: ['#FDF9F5', '#F5EFEC'], // Very light warm white
};

const BLOB_COLORS_DARK = {
    blob1: ['#2A1D18', '#1F1411'], // Dark terracotta tint
    blob2: ['#221714', '#1A110F'], 
    blob3: ['#1C1311', '#150E0C'], 
    blob4: ['#251A16', '#1C1311'], 
};

interface LiquidGlassBackgroundProps {
    scrollY?: SharedValue<number>;
    touchX?: SharedValue<number>;
    touchY?: SharedValue<number>;
}

/**
 * Premium Liquid Glass Background
 * Animated organic blobs with soft pastel colors
 * Uses Skia for high-performance GPU rendering
 */
const LiquidGlassBackground: React.FC<LiquidGlassBackgroundProps> = ({
    scrollY,
    touchX,
    touchY,
}) => {
    // Animation values for organic blob movement
    const time = useSharedValue(0);
    const blob1X = useSharedValue(width * 0.3);
    const blob1Y = useSharedValue(height * 0.2);
    const blob2X = useSharedValue(width * 0.7);
    const blob2Y = useSharedValue(height * 0.4);
    const blob3X = useSharedValue(width * 0.4);
    const blob3Y = useSharedValue(height * 0.6);
    const blob4X = useSharedValue(width * 0.6);
    const blob4Y = useSharedValue(height * 0.15);

    // Scale animation for breathing effect
    const blob1Scale = useSharedValue(1);
    const blob2Scale = useSharedValue(1);
    const blob3Scale = useSharedValue(1);
    const blob4Scale = useSharedValue(1);

    useEffect(() => {
        // Static positioning - no animations
        // The "balloon" motion has been removed as requested
    }, []);

    // Scroll-reactive offset
    const scrollOffset = useDerivedValue(() => {
        return scrollY ? scrollY.value * 0.1 : 0;
    });

    const isDarkMode = useColorScheme() === 'dark';
    const activeColors = isDarkMode ? BLOB_COLORS_DARK : BLOB_COLORS_LIGHT;

    return (
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#0F0F0F' : '#F8F6F4' }]}>
            {/* Base gradient */}
            <View style={[styles.baseGradient, { backgroundColor: isDarkMode ? '#151515' : '#F3EFEA' }]} />

            {/* Skia Canvas with animated blobs */}
            <Canvas style={styles.canvas}>
                <Group>
                    {/* Blob 1 - Large muted teal */}
                    <Circle
                        cx={blob1X}
                        cy={blob1Y}
                        r={width * 0.35}
                        opacity={0.4}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.7, height * 0.4)}
                            colors={activeColors.blob1}
                        />
                        <BlurMask blur={60} style="normal" />
                    </Circle>

                    {/* Blob 2 - Medium soft blue */}
                    <Circle
                        cx={blob2X}
                        cy={blob2Y}
                        r={width * 0.3}
                        opacity={0.35}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.6, height * 0.5)}
                            colors={activeColors.blob2}
                        />
                        <BlurMask blur={50} style="normal" />
                    </Circle>

                    {/* Blob 3 - Large light teal */}
                    <Circle
                        cx={blob3X}
                        cy={blob3Y}
                        r={width * 0.4}
                        opacity={0.3}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.8, height * 0.7)}
                            colors={activeColors.blob3}
                        />
                        <BlurMask blur={70} style="normal" />
                    </Circle>

                    {/* Blob 4 - Small pale blue accent */}
                    <Circle
                        cx={blob4X}
                        cy={blob4Y}
                        r={width * 0.2}
                        opacity={0.45}
                    >
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width * 0.4, height * 0.3)}
                            colors={activeColors.blob4}
                        />
                        <BlurMask blur={40} style="normal" />
                    </Circle>
                </Group>
            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    baseGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    canvas: {
        flex: 1,
    },
});

export default LiquidGlassBackground;
