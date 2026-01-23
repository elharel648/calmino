import React, { useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Platform,
    Animated as RNAnimated,
    ScrollView,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Dimensions,
    PanResponder,
} from 'react-native';
import { Sparkles, Camera } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { useActiveChild } from '../../context/ActiveChildContext';
import AlbumCarousel from '../Profile/AlbumCarousel';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withSpring,
    withDelay,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

// Minimal accent
const ACCENT = '#8B5CF6';

interface MagicMomentsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MagicMomentsModal({ visible, onClose }: MagicMomentsModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();
    const { baby, updatePhoto, updateAlbumNote } = useBabyProfile(activeChild?.childId);

    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetY = useRef(0);
    const dragStartY = useRef(0);

    // Simple animations
    const headerOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

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

            headerOpacity.value = withTiming(1, { duration: 300 });
            contentOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
        } else {
            headerOpacity.value = 0;
            contentOpacity.value = 0;
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    // Swipe down to dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
            const startY = evt.nativeEvent.pageY;
            dragStartY.current = startY;
            if (startY < 300) {
                scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                return true;
            }
            return false;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            if (isDragging.current) return true;
            const currentY = evt.nativeEvent.pageY;
            const isTopArea = currentY < 300;
            const isDraggingDown = gestureState.dy > 8;
            const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3;
            const isScrollAtTop = scrollOffsetY.current <= 5;

            if (isTopArea && isDraggingDown && isVerticalSwipe && isScrollAtTop) {
                isDragging.current = true;
                dragStartY.current = currentY;
                scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return true;
            }
            return false;
        },
        onPanResponderGrant: () => {
            isDragging.current = true;
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnim.setValue(gestureState.dy);
                const opacity = 1 - Math.min(gestureState.dy / 300, 0.7);
                backdropAnim.setValue(opacity);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            isDragging.current = false;
            scrollViewRef.current?.setNativeProps({ scrollEnabled: true });

            const shouldDismiss = gestureState.dy > 120 || gestureState.vy > 0.5;
            if (shouldDismiss) {
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
            scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
        },
    }), [onClose, slideAnim, backdropAnim]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    const handleMonthPress = async (month: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        await updatePhoto('album', month);
    };

    const handleAddCustomPhoto = async (month: number) => {
        await updatePhoto('album', month);
    };

    const handleNoteUpdate = async (month: number, note: string) => {
        await updateAlbumNote(month, note);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <RNAnimatedView style={[styles.backdrop, { opacity: backdropAnim, backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        )}
                    </RNAnimatedView>
                </TouchableWithoutFeedback>

                <RNAnimatedView
                    style={[
                        styles.modalCard,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} {...panResponder.panHandlers}>
                        <View style={[
                            styles.dragHandleBar,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }
                        ]} />
                    </View>

                    {/* Clean Header */}
                    <Animated.View style={[styles.header, headerStyle]} {...panResponder.panHandlers}>
                        {/* Simple icon */}
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={[ACCENT, '#A78BFA']}
                                style={styles.iconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Sparkles size={28} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            רגעים קסומים
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            תעדו את הרגעים המיוחדים
                        </Text>
                    </Animated.View>

                    {/* Content */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onScroll={(e) => {
                            scrollOffsetY.current = e.nativeEvent.contentOffset.y;
                        }}
                        scrollEventThrottle={16}
                    >
                        <Animated.View style={contentStyle}>
                            {/* Simple instruction */}
                            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                                לחצו על חודש כדי להוסיף תמונה
                            </Text>

                            {/* Album Carousel */}
                            <AlbumCarousel
                                album={baby?.album}
                                albumNotes={baby?.albumNotes}
                                onMonthPress={handleMonthPress}
                                onAddCustomPhoto={handleAddCustomPhoto}
                                onNoteUpdate={handleNoteUpdate}
                            />

                            {/* Baby name footer */}
                            {baby?.name && (
                                <View style={[styles.babyNameRow, { borderTopColor: theme.border }]}>
                                    <View style={[styles.cameraIconWrapper, { backgroundColor: ACCENT + '15' }]}>
                                        <Camera size={14} color={ACCENT} strokeWidth={1.5} />
                                    </View>
                                    <Text style={[styles.babyName, { color: theme.textPrimary }]}>
                                        האלבום של {baby.name}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                </RNAnimatedView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 44,
        maxHeight: '90%',
        flex: 1,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 50,
        zIndex: 10,
    },
    dragHandleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 24,
        gap: 10,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    iconGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        opacity: 0.7,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 24,
        flexGrow: 1,
        width: '100%',
    },
    instructionText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '400',
    },
    babyNameRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 28,
        paddingTop: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    cameraIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    babyName: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});
