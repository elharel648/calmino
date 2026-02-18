import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, PanResponder, Animated as RNAnimated, Platform, TouchableWithoutFeedback, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { Sun, Moon, Sparkles, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, withRepeat, interpolate } from 'react-native-reanimated';
import ScrollFadeWrapper from './Common/ScrollFadeWrapper';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

interface NightLightModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function NightLightModal({ visible, onClose }: NightLightModalProps) {
    const [colorTemp, setColorTemp] = useState<'warm' | 'white' | 'red'>('warm');
    const [brightness, setBrightness] = useState(0.3);
    const [controlsVisible, setControlsVisible] = useState(true);

    const controlsOpacity = useSharedValue(1);
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    // Pulse animation for active color
    const pulseAnim = useSharedValue(0);
    const glowAnim = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Start pulse animation
            pulseAnim.value = withRepeat(
                withTiming(1, { duration: 2000 }),
                -1,
                true
            );
            glowAnim.value = withRepeat(
                withTiming(1, { duration: 3000 }),
                -1,
                true
            );
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    useEffect(() => {
        controlsOpacity.value = withTiming(controlsVisible ? 1 : 0, { duration: 300 });
    }, [controlsVisible]);

    // Swipe down to dismiss - Works from anywhere on screen
    const isDragging = useRef(false);
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false, // Don't capture immediately
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            // Only respond to downward vertical swipes from anywhere
            const isDraggingDown = gestureState.dy > 20;
            const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
            const startY = evt.nativeEvent.pageY;
            
            // Allow swipe down from top area OR fast downward swipe from anywhere
            const isTopArea = startY < 200;
            const isFastSwipe = gestureState.vy > 0.3;
            
            if (isDraggingDown && isVerticalSwipe && (isTopArea || isFastSwipe) && !isDragging.current) {
                isDragging.current = true;
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return true;
            }
            return false;
        },
        onPanResponderGrant: () => {
            isDragging.current = true;
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                // Follow finger movement
                slideAnim.setValue(gestureState.dy);
                // Fade backdrop as we drag down
                const opacity = Math.max(0, 1 - (gestureState.dy / 300));
                backdropAnim.setValue(opacity);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            isDragging.current = false;
            const shouldDismiss = gestureState.dy > 100 || gestureState.vy > 0.4;
            
            if (shouldDismiss) {
                // Dismiss modal
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: SCREEN_HEIGHT,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    RNAnimated.timing(backdropAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    onClose();
                    slideAnim.setValue(SCREEN_HEIGHT);
                    backdropAnim.setValue(0);
                });
            } else {
                // Snap back to original position
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    RNAnimated.timing(backdropAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        },
        onPanResponderTerminate: () => {
            isDragging.current = false;
            // Snap back if interrupted
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        },
    }), [onClose, slideAnim, backdropAnim]);

    const animatedControlsStyle = useAnimatedStyle(() => ({
        opacity: controlsOpacity.value,
    }));

    const getBackgroundColor = () => {
        const opacity = Math.max(0.15, brightness);
        switch (colorTemp) {
            case 'warm': return `rgba(255, 149, 0, ${opacity})`;
            case 'white': return `rgba(255, 255, 255, ${opacity})`;
            case 'red': return `rgba(255, 59, 48, ${opacity})`;
        }
    };

    const getTextColor = () => {
        return brightness > 0.5 ? '#000' : '#fff';
    };

    const handleColorChange = (color: 'warm' | 'white' | 'red') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setColorTemp(color);
    };

    const handleBrightnessChange = (value: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setBrightness(value);
    };

    // Animated styles for color buttons
    const warmPulseStyle = useAnimatedStyle(() => {
        if (colorTemp !== 'warm') return {};
        const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.08]);
        const opacity = interpolate(pulseAnim.value, [0, 1], [0.3, 0.6]);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    const whitePulseStyle = useAnimatedStyle(() => {
        if (colorTemp !== 'white') return {};
        const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.08]);
        const opacity = interpolate(pulseAnim.value, [0, 1], [0.3, 0.6]);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    const redPulseStyle = useAnimatedStyle(() => {
        if (colorTemp !== 'red') return {};
        const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.08]);
        const opacity = interpolate(pulseAnim.value, [0, 1], [0.3, 0.6]);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="none" transparent={true}>
            <RNAnimatedView
                style={[
                    styles.container,
                    {
                        backgroundColor: getBackgroundColor(),
                        transform: [{ translateY: slideAnim }],
                    }
                ]}
                {...panResponder.panHandlers}
            >
                {/* Drag Handle - Visual indicator */}
                <View style={styles.dragHandle}>
                    <View style={[styles.dragHandleBar, { backgroundColor: getTextColor() + '40' }]} />
                </View>

                <TouchableWithoutFeedback onPress={() => setControlsVisible(!controlsVisible)}>
                    <View style={StyleSheet.absoluteFill}>
                        <Animated.View style={[styles.controlsOverlay, animatedControlsStyle]} pointerEvents={controlsVisible ? 'auto' : 'none'}>
                            <ScrollFadeWrapper fadeHeight={80}>
                                <ScrollView
                                ref={scrollViewRef}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                                bounces={true}
                            >
                                <View style={styles.centerControls}>
                                    {/* Premium Title with Icon */}
                                    <View style={styles.titleContainer}>
                                        <View style={[styles.iconCircle, { backgroundColor: getTextColor() + '15' }]}>
                                            <Zap size={28} color={getTextColor()} strokeWidth={2} />
                                        </View>
                                        <Text style={[styles.title, { color: getTextColor() }]}>פנס לילה</Text>
                                    </View>

                                    <Text style={[styles.subtitle, { color: getTextColor() }]}>לחץ על המסך להסתרת הפקדים</Text>

                                    {/* Premium Color Selection with Glow */}
                                    <View style={styles.colorSection}>
                                        <Text style={[styles.sectionLabel, { color: getTextColor() }]}>צבע</Text>
                                        <View style={styles.colorRow}>
                                            <TouchableOpacity
                                                style={styles.colorBtnWrapper}
                                                onPress={() => handleColorChange('warm')}
                                                activeOpacity={0.7}
                                            >
                                                <Animated.View style={warmPulseStyle}>
                                                    <LinearGradient
                                                        colors={['#FFDCA8', '#FFB84D']}
                                                        style={[styles.colorBtn, colorTemp === 'warm' && styles.colorBtnActive]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                    >
                                                        {colorTemp === 'warm' && (
                                                            <View style={styles.activeIndicator}>
                                                                <View style={[styles.activeDot, { backgroundColor: '#fff' }]} />
                                                            </View>
                                                        )}
                                                    </LinearGradient>
                                                </Animated.View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.colorBtnWrapper}
                                                onPress={() => handleColorChange('white')}
                                                activeOpacity={0.7}
                                            >
                                                <Animated.View style={whitePulseStyle}>
                                                    <LinearGradient
                                                        colors={['#FFFFFF', '#F5F5F5']}
                                                        style={[styles.colorBtn, colorTemp === 'white' && styles.colorBtnActive]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                    >
                                                        {colorTemp === 'white' && (
                                                            <View style={styles.activeIndicator}>
                                                                <View style={[styles.activeDot, { backgroundColor: '#000' }]} />
                                                            </View>
                                                        )}
                                                    </LinearGradient>
                                                </Animated.View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.colorBtnWrapper}
                                                onPress={() => handleColorChange('red')}
                                                activeOpacity={0.7}
                                            >
                                                <Animated.View style={redPulseStyle}>
                                                    <LinearGradient
                                                        colors={['#FF6B6B', '#FF3B30']}
                                                        style={[styles.colorBtn, colorTemp === 'red' && styles.colorBtnActive]}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 1 }}
                                                    >
                                                        {colorTemp === 'red' && (
                                                            <View style={styles.activeIndicator}>
                                                                <View style={[styles.activeDot, { backgroundColor: '#fff' }]} />
                                                            </View>
                                                        )}
                                                    </LinearGradient>
                                                </Animated.View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Premium Brightness Slider */}
                                    <View style={styles.brightnessSection}>
                                        <Text style={[styles.sectionLabel, { color: getTextColor() }]}>בהירות</Text>
                                        <View style={styles.brightnessRow}>
                                            <TouchableOpacity
                                                onPress={() => handleBrightnessChange(Math.max(0.1, brightness - 0.1))}
                                                style={[styles.iconButton, { backgroundColor: getTextColor() + '15' }]}
                                                activeOpacity={0.7}
                                            >
                                                <Moon size={22} color={getTextColor()} strokeWidth={2} />
                                            </TouchableOpacity>

                                            <View style={styles.sliderContainer}>
                                                {Platform.OS === 'ios' && (
                                                    <BlurView intensity={20} tint="light" style={styles.sliderBlur}>
                                                        <LinearGradient
                                                            colors={[getTextColor() + '20', getTextColor() + '10']}
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                    </BlurView>
                                                )}
                                                <Slider
                                                    style={styles.slider}
                                                    minimumValue={0.1}
                                                    maximumValue={1}
                                                    value={brightness}
                                                    onValueChange={handleBrightnessChange}
                                                    minimumTrackTintColor={getTextColor()}
                                                    maximumTrackTintColor={getTextColor() + '30'}
                                                    thumbTintColor={getTextColor()}
                                                />
                                            </View>

                                            <TouchableOpacity
                                                onPress={() => handleBrightnessChange(Math.min(1, brightness + 0.1))}
                                                style={[styles.iconButton, { backgroundColor: getTextColor() + '15' }]}
                                                activeOpacity={0.7}
                                            >
                                                <Sun size={22} color={getTextColor()} strokeWidth={2} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                </ScrollView>
                            </ScrollFadeWrapper>
                        </Animated.View>
                    </View>
                </TouchableWithoutFeedback>
            </RNAnimatedView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dragHandle: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        zIndex: 10,
        minHeight: 50,
    },
    dragHandleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    centerControls: {
        alignItems: 'center',
        width: '100%',
        gap: 32,
    },
    titleContainer: {
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 15,
        opacity: 0.7,
        fontWeight: '400',
    },
    colorSection: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.9,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 24,
        justifyContent: 'center',
    },
    colorBtnWrapper: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    colorBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    colorBtnActive: {
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 12,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 8,
        width: '100%',
        alignItems: 'center',
    },
    activeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    brightnessSection: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 20,
    },
    brightnessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 16,
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    sliderContainer: {
        flex: 1,
        height: 40,
        justifyContent: 'center',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    sliderBlur: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
    },
    slider: {
        width: '100%',
        height: 40,
    },
});
