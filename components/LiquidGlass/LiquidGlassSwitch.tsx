import React, { useEffect, useRef } from 'react';
import {
    TouchableOpacity,
    Animated,
    StyleSheet,
    ViewStyle,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface LiquidGlassSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    activeColor?: string;
    inactiveColor?: string;
    style?: ViewStyle;
}

export const LiquidGlassSwitch: React.FC<LiquidGlassSwitchProps> = ({
    value,
    onValueChange,
    activeColor = '#8B5CF6',
    inactiveColor = 'rgba(150, 150, 150, 0.3)',
    style,
}) => {
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: value ? 1 : 0,
            useNativeDriver: false,
            bounciness: 0,
            speed: 12,
        }).start();
    }, [value, animatedValue]);

    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onValueChange(!value);
    };

    const containerStyle = {
        backgroundColor: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [inactiveColor, activeColor]
        })
    };

    const thumbTranslateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 22] // Adjusted for typical 48x28 switch
    });

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            style={[styles.touchable, style]}
        >
            <Animated.View style={[styles.container, containerStyle]}>
                {/* Glass Inner Layer */}
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill}>
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.0)']}
                        style={StyleSheet.absoluteFill}
                    />
                </BlurView>

                {/* Thumb */}
                <Animated.View
                    style={[
                        styles.thumb,
                        { transform: [{ translateX: thumbTranslateX }] }
                    ]}
                >
                    <LinearGradient
                        colors={['#fff', '#f0f0f0']}
                        style={styles.thumbGradient}
                    />
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    touchable: {
        width: 48,
        height: 28,
        borderRadius: 14,
    },
    container: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
    },
    thumb: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 0,
        overflow: 'hidden',
    },
    thumbGradient: {
        flex: 1,
        borderRadius: 12,
    }
});
