import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    interpolate,
    Extrapolate,
    Easing,
} from 'react-native-reanimated';
import { Baby, BarChart2, Users, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
    icon: React.ComponentType<any>;
    title: string;
    description: string;
    gradientColors: [string, string];
    backgroundColor: string;
}

const slides: OnboardingSlide[] = [
    {
        icon: Baby,
        title: 'ברוכים הבאים ל-CalmParent',
        description: 'אפליקציה אחת לכל מה שצריך כדי לטפל בתינוק שלך',
        gradientColors: ['#6366F1', '#8B5CF6'],
        backgroundColor: '#EEF2FF',
    },
    {
        icon: BarChart2,
        title: 'עקוב אחרי הכל',
        description: 'תעד האכלות, שינה, חיתולים וכל מה שחשוב',
        gradientColors: ['#8B5CF6', '#A855F7'],
        backgroundColor: '#F5F3FF',
    },
    {
        icon: Users,
        title: 'שתף עם המשפחה',
        description: 'אפשר למשפחה ולסבים לעקוב ולעדכן יחד',
        gradientColors: ['#10B981', '#34D399'],
        backgroundColor: '#ECFDF5',
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { theme, isDarkMode } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // Animation values
    const scrollX = useSharedValue(0);
    const buttonScale = useSharedValue(1);
    const buttonGlow = useSharedValue(0);
    const iconFloats = slides.map(() => useSharedValue(0));

    // Start floating animations
    useEffect(() => {
        iconFloats.forEach((value, index) => {
            value.value = withRepeat(
                withSequence(
                    withTiming(-8, { duration: 2000 + index * 200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 2000 + index * 200, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        });

        // Button glow
        buttonGlow.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const handleScroll = (event: any) => {
        scrollX.value = event.nativeEvent.contentOffset.x;
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        if (index !== currentIndex) {
            setCurrentIndex(index);
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }
    };

    const handleNext = () => {
        // Button press animation
        buttonScale.value = withSequence(
            withSpring(0.95, { damping: 10, stiffness: 400 }),
            withSpring(1, { damping: 15, stiffness: 300 })
        );

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        if (currentIndex < slides.length - 1) {
            scrollViewRef.current?.scrollTo({
                x: (currentIndex + 1) * SCREEN_WIDTH,
                animated: true,
            });
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onComplete();
    };

    // Button animated style
    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const buttonGlowStyle = useAnimatedStyle(() => ({
        shadowOpacity: 0.35 + buttonGlow.value * 0.25,
    }));

    // Get current slide color
    const currentSlide = slides[currentIndex];

    return (
        <View style={[
            styles.container,
            { backgroundColor: isDarkMode ? theme.background : currentSlide.backgroundColor }
        ]}>
            {/* Background decoration */}
            <View style={styles.bgDecoration}>
                <View style={[
                    styles.bgCircle1,
                    { backgroundColor: currentSlide.gradientColors[0], opacity: isDarkMode ? 0.1 : 0.15 }
                ]} />
                <View style={[
                    styles.bgCircle2,
                    { backgroundColor: currentSlide.gradientColors[1], opacity: isDarkMode ? 0.08 : 0.12 }
                ]} />
            </View>

            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {slides.map((slide, index) => {
                    const Icon = slide.icon;
                    const iconFloat = iconFloats[index];

                    const iconAnimatedStyle = useAnimatedStyle(() => ({
                        transform: [{ translateY: iconFloat.value }],
                    }));

                    return (
                        <View key={index} style={styles.slide}>
                            {/* Icon with parallax */}
                            <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
                                {/* Glow ring */}
                                <View style={[
                                    styles.iconGlow,
                                    { backgroundColor: slide.gradientColors[0], opacity: isDarkMode ? 0.2 : 0.25 }
                                ]} />

                                <LinearGradient
                                    colors={slide.gradientColors}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.iconGradient}
                                >
                                    {/* Inner shine */}
                                    <View style={styles.iconShine} />
                                    <Icon size={56} color="#fff" strokeWidth={1.8} />
                                </LinearGradient>
                            </Animated.View>

                            <Text style={[styles.title, { color: theme.textPrimary }]}>
                                {slide.title}
                            </Text>
                            <Text style={[styles.description, { color: theme.textSecondary }]}>
                                {slide.description}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                {/* Premium pagination */}
                <View style={styles.pagination}>
                    {slides.map((slide, index) => {
                        const isActive = index === currentIndex;
                        return (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: isActive
                                            ? slide.gradientColors[0]
                                            : isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                        width: isActive ? 28 : 8,
                                        shadowColor: isActive ? slide.gradientColors[0] : 'transparent',
                                        shadowOpacity: isActive ? 0.5 : 0,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Buttons */}
                <View style={styles.buttons}>
                    {currentIndex < slides.length - 1 && (
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                                דלג
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Animated.View style={[buttonStyle, buttonGlowStyle, styles.nextButtonWrapper]}>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={handleNext}
                        >
                            <LinearGradient
                                colors={currentSlide.gradientColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.nextButton}
                            >
                                <Text style={styles.nextText}>
                                    {currentIndex === slides.length - 1 ? 'בוא נתחיל!' : 'הבא'}
                                </Text>
                                <ChevronLeft size={20} color="#fff" strokeWidth={2.5} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgDecoration: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    bgCircle1: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 100,
        left: -80,
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 48,
        position: 'relative',
    },
    iconGlow: {
        position: 'absolute',
        top: -20,
        left: -20,
        right: -20,
        bottom: -20,
        borderRadius: 100,
    },
    iconGradient: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: 'center',
        justifyContent: 'center',
        // Premium shadow
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 12,
    },
    iconShine: {
        position: 'absolute',
        top: 12,
        left: 24,
        width: 40,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        transform: [{ rotate: '-20deg' }],
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 26,
        maxWidth: 300,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 50,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 36,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipButton: {
        padding: 16,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextButtonWrapper: {
        flex: 1,
        borderRadius: 18,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 8,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 18,
        gap: 8,
    },
    nextText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});
