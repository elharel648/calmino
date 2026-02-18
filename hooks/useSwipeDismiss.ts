import { useMemo, useRef, useState } from 'react';
import { PanResponder, Animated as RNAnimated, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface UseSwipeDismissProps {
    onDismiss: () => void;
    slideAnim: RNAnimated.Value;
    triggerDistance?: number;
    backdropAnim?: RNAnimated.Value;
}

export const useSwipeDismiss = ({ onDismiss, slideAnim, backdropAnim, triggerDistance = 150 }: UseSwipeDismissProps) => {
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const scrollOffsetY = useRef(0);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);

    // Function to update scroll offset from ScrollView
    const handleScroll = (event: any) => {
        scrollOffsetY.current = event.nativeEvent.contentOffset.y;
        if (scrollOffsetY.current <= 0) {
            setIsScrollEnabled(true);
        }
    };

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: (evt, _) => {
            const startY = evt.nativeEvent.pageY;
            dragStartY.current = startY;
            // Capture touch if starting near top
            if (startY < 300) {
                setIsScrollEnabled(false);
                return true;
            }
            return false;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            if (isDragging.current) return true;

            const currentY = evt.nativeEvent.pageY;
            const isTopArea = currentY < 300; // Only allow swipe from top area
            const isDraggingDown = gestureState.dy > 5;
            const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2;
            const isScrollAtTop = scrollOffsetY.current <= 5;

            if (isTopArea && isDraggingDown && isVerticalSwipe && isScrollAtTop) {
                isDragging.current = true;
                dragStartY.current = currentY;
                setIsScrollEnabled(false);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                return true;
            }
            return false;
        },
        onPanResponderGrant: () => {
            isDragging.current = true;
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        onPanResponderMove: (_, gestureState) => {
            if (!isDragging.current) return;

            const dy = gestureState.dy;
            if (dy > 0) {
                // Direct tracking
                slideAnim.setValue(dy);

                // Handle backdrop opacity if provided
                if (backdropAnim) {
                    const opacity = 1 - Math.min(dy / 600, 0.5); // Fade out as we drag down
                    backdropAnim.setValue(opacity);
                }
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (!isDragging.current) return;

            const dy = gestureState.dy;
            const velocityY = gestureState.vy;

            // Logic from TrackingModal: dy > 120 OR velocity > 0.5
            const shouldDismiss = dy > triggerDistance || velocityY > 0.5;

            if (shouldDismiss) {
                // Dismiss
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                // Animate out
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: SCREEN_HEIGHT,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11
                    }),
                    ...(backdropAnim ? [RNAnimated.timing(backdropAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true
                    })] : [])
                ]).start(() => {
                    onDismiss();
                    // Reset values after dismiss (optional, but good practice if modal stays mounted)
                    slideAnim.setValue(SCREEN_HEIGHT);
                    if (backdropAnim) backdropAnim.setValue(0);
                });

            } else {
                // Reset
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11
                    }),
                    ...(backdropAnim ? [RNAnimated.timing(backdropAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true
                    })] : [])
                ]).start();
                setIsScrollEnabled(true);
            }
            isDragging.current = false;
        },
        onPanResponderTerminate: () => {
            isDragging.current = false;
            RNAnimated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11
            }).start();
            setIsScrollEnabled(true);
        }
    }), [onDismiss, slideAnim, backdropAnim, triggerDistance]);

    return {
        panResponder,
        isScrollEnabled,
        handleScroll,
        setIsScrollEnabled
    };
};
