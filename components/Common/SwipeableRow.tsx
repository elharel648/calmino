import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface SwipeableRowProps {
    children: React.ReactNode;
    onDelete: () => void;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, onDelete }) => {
    const { isDarkMode } = useTheme();
    const swipeableRef = useRef<Swipeable>(null);

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        // Smooth scale animation
        const scale = dragX.interpolate({
            inputRange: [0, 10, 72],
            outputRange: [0.85, 0.92, 1],
            extrapolate: 'clamp',
        });

        // Smooth opacity fade-in
        const opacity = dragX.interpolate({
            inputRange: [0, 8, 72],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        // Staggered entrance animation
        const transX = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-92, 0],
            extrapolate: 'clamp',
        });

        // Ultra-smooth icon scale animation
        const iconScale = progress.interpolate({
            inputRange: [0, 0.2, 0.6, 1],
            outputRange: [0, 0.5, 0.85, 1],
            extrapolate: 'clamp',
        });

        // Subtle icon rotation for premium feel
        const iconRotate = progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: ['-8deg', '-2deg', '0deg'],
            extrapolate: 'clamp',
        });

        const handleDelete = () => {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            swipeableRef.current?.close();
            setTimeout(() => onDelete(), 200);
        };

        return (
            <View style={styles.leftActions}>
                <Animated.View
                    style={[
                        styles.actionButton,
                        {
                            backgroundColor: 'rgba(239, 68, 68, 0.95)',
                            transform: [
                                { translateX: transX },
                                { scale },
                            ],
                            opacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.actionContent}
                        onPress={handleDelete}
                        activeOpacity={0.6}
                    >
                        <Animated.View
                            style={{
                                transform: [
                                    { scale: iconScale },
                                    { rotate: iconRotate },
                                ],
                            }}
                        >
                            <Trash2 size={20} color="#fff" strokeWidth={2.5} />
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            renderLeftActions={renderLeftActions}
            friction={2}
            leftThreshold={40}
            overshootLeft={false}
            overshootRight={false}
            containerStyle={styles.swipeableContainer}
            enableTrackpadTwoFingerGesture={Platform.OS === 'ios'}
        >
            {children}
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    swipeableContainer: {
        overflow: 'visible',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
        gap: 0,
    },
    actionButton: {
        width: 64,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        marginRight: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 0,
    },
    actionContent: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
});
