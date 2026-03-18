import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
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

// Lavender/Purple colors - matching app theme
const BLOB_COLORS = {
    blob1: ['#DDD6FE', '#C4B5FD'], // Soft lavender
    blob2: ['#E9D5FF', '#D8B4FE'], // Light purple
    blob3: ['#EDE9FE', '#DDD6FE'], // Pale lavender
    blob4: ['#F3E8FF', '#E9D5FF'], // Very light purple
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

    return (
        <View style={styles.container}>
            {/* Base gradient */}
            <View style={styles.baseGradient} />

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
                            colors={BLOB_COLORS.blob1}
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
                            colors={BLOB_COLORS.blob2}
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
                            colors={BLOB_COLORS.blob3}
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
                            colors={BLOB_COLORS.blob4}
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
        backgroundColor: '#FAF5FF',
    },
    baseGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F5F3FF',
    },
    canvas: {
        flex: 1,
    },
});

export default LiquidGlassBackground;
