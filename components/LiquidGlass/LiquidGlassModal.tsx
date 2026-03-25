/**
 * LiquidGlassModal - Apple iOS 18 Style Liquid Glass Modal
 * Full-screen modal with premium glass effect and smooth animations
 */

import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiquidGlassModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    height?: number | string;
    showHandle?: boolean;
}

export const LiquidGlassModal: React.FC<LiquidGlassModalProps> = ({
    visible,
    onClose,
    children,
    height = SCREEN_HEIGHT * 0.75,
    showHandle = true,
}) => {
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            // Fade in backdrop and slide up modal
            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 20,
                    stiffness: 90,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Fade out and slide down
            Animated.parallel([
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            {/* Backdrop */}
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
            >
                <TouchableOpacity
                    style={styles.backdropTouchable}
                    activeOpacity={1}
                    onPress={handleClose}
                >
                    <BlurView intensity={20} tint="dark" style={styles.backdropBlur} />
                </TouchableOpacity>
            </Animated.View>

            {/* Modal Content */}
            <Animated.View
                style={[
                    styles.modalContainer,
                    { height: height as any, transform: [{ translateY: slideAnim }] },
                ]}
            >
                {/* Glow Effect */}
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'transparent']}
                    style={styles.topGlow}
                />

                {/* Glass Container */}
                <BlurView intensity={90} tint="light" style={styles.glassContainer}>
                    <LinearGradient
                        colors={[
                            'rgba(255, 255, 255, 0.4)',
                            'rgba(255, 255, 255, 0.2)',
                            'rgba(255, 255, 255, 0.1)',
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.gradientOverlay}
                    >
                        {/* Border Highlight */}
                        <View style={styles.borderHighlight} />

                        {/* Handle */}
                        {showHandle && (
                            <View style={styles.handleContainer}>
                                <View style={styles.handle} />
                            </View>
                        )}

                        {/* Content */}
                        <View style={styles.content}>{children}</View>
                    </LinearGradient>
                </BlurView>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdropTouchable: {
        flex: 1,
    },
    backdropBlur: {
        flex: 1,
    },
    modalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
        elevation: 0,
    },
    topGlow: {
        position: 'absolute',
        top: -20,
        left: 0,
        right: 0,
        height: 40,
        zIndex: 1,
    },
    glassContainer: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    gradientOverlay: {
        flex: 1,
    },
    borderHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
});
