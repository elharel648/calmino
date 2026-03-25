// SwipeableModal.tsx - Premium Swipe down to dismiss modal wrapper with smooth animations
import React, { useRef, useCallback, useEffect } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    Animated,
    PanResponder,
    Dimensions,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 120; // Increased for better UX
const VELOCITY_THRESHOLD = 0.5; // Velocity to dismiss even if not dragged far

interface SwipeableModalProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    backgroundColor?: string;
    showDragHandle?: boolean;
}

export const SwipeableModal: React.FC<SwipeableModalProps> = ({
    visible,
    onClose,
    children,
    backgroundColor = '#fff',
    showDragHandle = true,
}) => {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Animate in when visible
    useEffect(() => {
        if (visible) {
            translateY.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only respond to vertical swipes down from top area
                return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
            },
            onPanResponderGrant: () => {
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward movement
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                    // Fade backdrop as we drag
                    const opacity = 1 - Math.min(gestureState.dy / 300, 0.7);
                    backdropOpacity.setValue(opacity);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldDismiss = gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > VELOCITY_THRESHOLD;
                
                if (shouldDismiss) {
                    // Dismiss modal with smooth animation
                    if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    Animated.parallel([
                        Animated.spring(translateY, {
                            toValue: SCREEN_HEIGHT,
                            useNativeDriver: true,
                            tension: 65,
                            friction: 11,
                        }),
                        Animated.timing(backdropOpacity, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        onClose();
                        translateY.setValue(SCREEN_HEIGHT);
                        backdropOpacity.setValue(0);
                    });
                } else {
                    // Snap back with spring animation
                    Animated.parallel([
                        Animated.spring(translateY, {
                            toValue: 0,
                            useNativeDriver: true,
                            tension: 65,
                            friction: 11,
                        }),
                        Animated.timing(backdropOpacity, {
                            toValue: 1,
                            duration: 200,
                            useNativeDriver: true,
                        }),
                    ]).start();
                }
            },
        })
    ).current;

    const handleClose = useCallback(() => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: SCREEN_HEIGHT,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
            translateY.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);
        });
    }, [onClose, translateY, backdropOpacity]);

    // Opacity interpolation for content
    const contentOpacity = translateY.interpolate({
        inputRange: [0, SCREEN_HEIGHT / 3],
        outputRange: [1, 0.3],
        extrapolate: 'clamp',
    });

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
                    <GestureHandlerRootView style={{ flex: 1, justifyContent: 'flex-end' }}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.content,
                                {
                                    backgroundColor,
                                    transform: [{ translateY }],
                                    opacity: contentOpacity,
                                },
                            ]}
                        >
                            {/* Drag Handle Area - Swipeable */}
                            {showDragHandle && (
                                <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
                                    <View style={styles.dragHandle} />
                                </View>
                            )}

                            {/* Content - Also swipeable but less sensitive */}
                            <View style={styles.contentWrapper} {...panResponder.panHandlers}>
                                <KeyboardAvoidingView
                                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                                    style={styles.keyboardView}
                                >
                                    {children}
                                </KeyboardAvoidingView>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                    </GestureHandlerRootView>
                </Animated.View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.98,
        minHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 0,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 20,
    },
    dragHandle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 2,
    },
    contentWrapper: {
        flex: 1,
        width: '100%',
    },
    keyboardView: {
        flex: 1,
        width: '100%',
    },
});

export default SwipeableModal;
