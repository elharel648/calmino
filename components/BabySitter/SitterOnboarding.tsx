// components/BabySitter/SitterOnboarding.tsx — First-time onboarding for new sitters
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { PartyPopper, Calendar, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SitterOnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

const SLIDES = [
  {
    key: 'profile',
    icon: PartyPopper,
    iconColor: '#8B5CF6',
    iconBg: '#EDE9FE',
    titleKey: 'sitterOnboarding.profileTitle',
    subtitleKey: 'sitterOnboarding.profileSubtitle',
  },
  {
    key: 'availability',
    icon: Calendar,
    iconColor: '#3B82F6',
    iconBg: '#DBEAFE',
    titleKey: 'sitterOnboarding.availabilityTitle',
    subtitleKey: 'sitterOnboarding.availabilitySubtitle',
  },
  {
    key: 'reputation',
    icon: Star,
    iconColor: '#F59E0B',
    iconBg: '#FEF3C7',
    titleKey: 'sitterOnboarding.reputationTitle',
    subtitleKey: 'sitterOnboarding.reputationSubtitle',
  },
];

// ---- Confetti Burst — spreads across the entire popup, then fades ----
const CONFETTI_COLORS = ['#8B5CF6', '#F59E0B', '#3B82F6', '#EF4444', '#10B981', '#EC4899', '#F97316', '#06B6D4', '#A855F7', '#14B8A6'];
const BURST_COUNT = 30;

function ConfettiPiece({ index, fire }: { index: number; fire: boolean }) {
  const progress = useSharedValue(0);
  // Random spread across the full card
  const startX = Math.random() * 100; // percentage
  const startY = 20 + Math.random() * 60; // percentage, within card
  const drift = (Math.random() - 0.5) * 40;
  const fallDistance = 30 + Math.random() * 50;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 4 + Math.random() * 5;
  const isRect = index % 3 === 0;
  const rotateEnd = (Math.random() - 0.5) * 600;
  const delay = Math.random() * 200;

  useEffect(() => {
    if (fire) {
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withSequence(
          withSpring(1, { damping: 14, stiffness: 90 }),
          withDelay(300, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }))
        )
      );
    }
  }, [fire]);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: `${startX + drift * progress.value}%` as any,
    top: `${startY + fallDistance * progress.value}%` as any,
    width: isRect ? size * 1.8 : size,
    height: size,
    borderRadius: isRect ? 2 : size / 2,
    backgroundColor: color,
    opacity: progress.value > 0.1 ? progress.value : 0,
    transform: [
      { rotate: `${progress.value * rotateEnd}deg` },
    ],
  }));

  return <Animated.View style={animStyle} />;
}

export default function SitterOnboarding({ visible, onComplete }: SitterOnboardingProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [fireConfetti, setFireConfetti] = useState(false);

  const currentSlide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const isFirstSlide = step === 0;

  // Fire confetti once when popup opens on first slide
  useEffect(() => {
    if (visible && step === 0) {
      const timer = setTimeout(() => setFireConfetti(true), 200);
      return () => clearTimeout(timer);
    } else {
      setFireConfetti(false);
    }
  }, [visible, step]);

  const handleNext = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      onComplete();
      setTimeout(() => setStep(0), 300);
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
    setTimeout(() => setStep(0), 300);
  };

  if (!visible) return null;

  const Icon = currentSlide.icon;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          style={[styles.card, {
            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
            overflow: 'hidden',
          }]}
        >
          {/* Confetti burst — covers entire card, first slide only */}
          {isFirstSlide && fireConfetti && (
            <View style={styles.confettiLayer} pointerEvents="none">
              {Array.from({ length: BURST_COUNT }).map((_, i) => (
                <ConfettiPiece key={i} index={i} fire={fireConfetti} />
              ))}
            </View>
          )}

          {/* Skip button */}
          {!isLast && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                {t('onboarding.skip')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Slide content */}
          <Animated.View
            key={currentSlide.key}
            entering={FadeInRight.duration(300)}
            exiting={FadeOutLeft.duration(200)}
            style={styles.slideContent}
          >
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: currentSlide.iconBg }]}>
              <Icon size={32} color={currentSlide.iconColor} strokeWidth={1.5} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {t(currentSlide.titleKey)}
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {t(currentSlide.subtitleKey)}
            </Text>
          </Animated.View>

          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === step
                      ? theme.textPrimary
                      : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                    width: i === step ? 20 : 6,
                  },
                ]}
              />
            ))}
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.textPrimary }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { color: isDarkMode ? '#000' : '#fff' }]}>
              {isLast ? t('sitterOnboarding.letsStart') : t('sitterOnboarding.next')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 0,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    borderRadius: 28,
  },
  skipBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  slideContent: {
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 10,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    writingDirection: 'rtl',
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
