import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withDelay,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import { Utensils, Moon, Pill } from 'lucide-react-native';
import DiaperIcon from './DiaperIcon';

interface PremiumLoaderProps {
    size?: number;
}

export default function PremiumLoader({ size = 32 }: PremiumLoaderProps) {
    const activeIndex = useSharedValue(0);

    useEffect(() => {
        // Cycle exactly between 0, 1, 2, 3 every 800ms
        activeIndex.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    // Create animated styles strictly for each icon based on index proximity
    // Each index gets fully visible when activeIndex is exactly its integer value
    const createIconStyle = (index: number) => {
        return useAnimatedStyle(() => {
            let diff = Math.abs(activeIndex.value - index);
            
            // Handle cross-fade wraparound from 3 -> 0
            if (index === 0 && activeIndex.value > 2) {
                diff = Math.abs(activeIndex.value - 4); 
            } else if (index === 3 && activeIndex.value < 1) {
                diff = Math.abs(activeIndex.value + 1 - 3); // Not strictly needed since we don't wrap back visually but just in case
            }

            const opacity = Math.max(0, 1 - diff);
            const scale = 0.6 + (0.4 * opacity);

            return {
                opacity,
                transform: [{ scale }],
                position: 'absolute',
            };
        });
    };

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Animated.View style={createIconStyle(0)}>
                <Utensils size={size} color="#EA580C" strokeWidth={2.5} />
            </Animated.View>
            <Animated.View style={createIconStyle(1)}>
                <Moon size={size} color="#7C3AED" strokeWidth={2.5} />
            </Animated.View>
            <Animated.View style={createIconStyle(2)}>
                <DiaperIcon size={size} color="#0891B2" strokeWidth={2.5} />
            </Animated.View>
            <Animated.View style={createIconStyle(3)}>
                <Pill size={size} color="#059669" strokeWidth={2.5} />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
