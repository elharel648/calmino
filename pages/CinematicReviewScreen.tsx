import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Share,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
  useAnimatedProps,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { X, Heart, Moon, Baby, ChevronLeft, Share2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { WrappedData } from '../services/wrappedService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION_MS = 5000;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ----- Types -----
interface CinematicReviewScreenProps {
  data: WrappedData;
  childName: string;
  babyAgeMonths: number;
  onClose: () => void;
}

// ----- Animated Progress Bar (single segment) -----
const ProgressSegment = ({
  index,
  activeIndex,
  progress,
  total,
}: {
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
  total: number;
}) => {
  const animStyle = useAnimatedStyle(() => {
    const w =
      index < activeIndex
        ? 1
        : index === activeIndex
        ? progress.value
        : 0;
    return { flex: w };
  });
  const bgStyle = useAnimatedStyle(() => {
    const w =
      index < activeIndex
        ? 0
        : index === activeIndex
        ? 1 - progress.value
        : 1;
    return { flex: w };
  });
  return (
    <View style={progressStyles.segment}>
      <Animated.View style={[progressStyles.fill, animStyle]} />
      <Animated.View style={[progressStyles.unfill, bgStyle]} />
    </View>
  );
};

const progressStyles = StyleSheet.create({
  segment: { flex: 1, flexDirection: 'row', borderRadius: 2, overflow: 'hidden', height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  fill: { backgroundColor: '#FFFFFF', height: 3 },
  unfill: { height: 3 },
});

// ----- Individual Slides -----

// Funky count-up animation hook
const useCountUp = (target: number, active: boolean, duration = 1800) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const p = Math.min((timestamp - start) / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, active, duration]);
  return value;
};

// Slide 0: Intro
const IntroSlide = ({ childName, firstDate, photoUrl, active }: { childName: string; firstDate: Date | null; photoUrl?: string; active: boolean }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  useEffect(() => {
    if (active) {
      opacity.value = withDelay(200, withTiming(1, { duration: 600 }));
      translateY.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 80 }));
    } else {
      opacity.value = 0; translateY.value = 30;
    }
  }, [active]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  const year = firstDate ? firstDate.getFullYear() : new Date().getFullYear();

  return (
    <View style={s.slide}>
      {/* Blurred background image */}
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={Platform.OS === 'android' ? 8 : 0} />
      ) : (
        <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={StyleSheet.absoluteFill} />
      )}
      {photoUrl && Platform.OS === 'ios' && (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.75)']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[s.introContent, animStyle]}>
        <Text style={s.introPill}>✨ כאלמינו</Text>
        <Text style={s.introYear}>{year}</Text>
        <Text style={s.introTitle}>
          המסע{'\n'}של {childName} 🍼
        </Text>
        <Text style={s.introSubtitle}>כל הרגעים, הלילות, האהבה{'\n'}– מסוכמת עבורכם</Text>
      </Animated.View>
    </View>
  );
};

// Slide 1: Diapers
const DiapersSlide = ({ count, active }: { count: number; active: boolean }) => {
  const displayCount = useCountUp(count, active);
  const scale = useSharedValue(0.6);
  useEffect(() => {
    if (active) scale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 60 }));
    else scale.value = 0.6;
  }, [active]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const funFact = count > 800
    ? `זה כמו לטפס על מגדל אייפל\n${Math.round(count / 12)} פעמים 😅`
    : count > 400
    ? `ממנטות גדולות נולדות מגדלות גדולות 😄`
    : `כל חיתול = אהבה בלתי מותנית 💛`;

  return (
    <View style={s.slide}>
      <LinearGradient colors={['#1a0533', '#3d1068', '#6b21a8']} style={StyleSheet.absoluteFill} />
      <View style={s.centerContent}>
        <Animated.Text style={[s.bigEmoji, iconStyle]}>🧷</Animated.Text>
        <Text style={s.slideLabel}>החלפתם</Text>
        <Text style={s.bigNumber}>{displayCount.toLocaleString()}</Text>
        <Text style={s.slideUnit}>חיתולים</Text>
        <View style={s.funFactBox}>
          <Text style={s.funFactText}>{funFact}</Text>
        </View>
      </View>
    </View>
  );
};

// Slide 2: Sleep
const SleepSlide = ({ hours, longestHours, active }: { hours: number; longestHours: number; active: boolean }) => {
  const displayHours = useCountUp(hours, active, 2000);
  const barWidth = useSharedValue(0);
  useEffect(() => {
    if (active) barWidth.value = withDelay(600, withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }));
    else barWidth.value = 0;
  }, [active]);
  const barStyle = useAnimatedStyle(() => ({ flex: barWidth.value }));

  const nightsEquiv = Math.round(hours / 8);

  return (
    <View style={s.slide}>
      <LinearGradient colors={['#0a0a1a', '#0f1b35', '#162040']} style={StyleSheet.absoluteFill} />
      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <View key={i} style={[s.star, { top: `${Math.random() * 70}%` as any, left: `${Math.random() * 100}%` as any, opacity: 0.4 + Math.random() * 0.5, width: 2 + Math.random() * 2, height: 2 + Math.random() * 2 }]} />
      ))}
      <View style={s.centerContent}>
        <Text style={s.bigEmoji}>🌙</Text>
        <Text style={s.slideLabel}>ישנתם יחד</Text>
        <Text style={s.bigNumber}>{displayHours.toLocaleString()}</Text>
        <Text style={s.slideUnit}>שעות שינה</Text>

        {/* Progress bar showing sleep */}
        <View style={s.sleepBarBg}>
          <Animated.View style={[s.sleepBarFill, barStyle]} />
        </View>

        <View style={s.funFactBox}>
          <Text style={s.funFactText}>
            שווה ל-{nightsEquiv} לילות שלמים 🌠{'\n'}
            {longestHours > 0 && `השינה הארוכה ביותר: ${longestHours} שעות 😴`}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Slide 3: Feedings
const FeedingsSlide = ({ feedings, bottleMl, active }: { feedings: number; bottleMl: number; active: boolean }) => {
  const displayFeedings = useCountUp(feedings, active, 1600);
  const displayMl = useCountUp(bottleMl, active, 2000);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (active) rot.value = withDelay(200, withSequence(withSpring(-10), withSpring(10), withSpring(0)));
    else rot.value = 0;
  }, [active]);
  const bottleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  return (
    <View style={s.slide}>
      <LinearGradient colors={['#0d2b14', '#1a4a25', '#166534']} style={StyleSheet.absoluteFill} />
      <View style={s.centerContent}>
        <Animated.Text style={[s.bigEmoji, bottleStyle]}>🍼</Animated.Text>
        <Text style={s.slideLabel}>האכלתם</Text>
        <Text style={s.bigNumber}>{displayFeedings.toLocaleString()}</Text>
        <Text style={s.slideUnit}>פעמי האכלה</Text>
        {bottleMl > 0 && (
          <View style={s.funFactBox}>
            <Text style={s.funFactText}>
              כולל {displayMl.toLocaleString()} מ"ל מבקבוק 🥛{'\n'}
              {bottleMl > 50000 ? 'מאגר מים של בריכה קטנה! 😂' : 'אדיר! המחויבות שלכם – ללא גבול 💚'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Slide 4: Moments Gallery
const MomentsSlide = ({ photos, active }: { photos: string[]; active: boolean }) => {
  const opacity = useSharedValue(0);
  useEffect(() => {
    if (active) opacity.value = withDelay(100, withTiming(1, { duration: 800 }));
    else opacity.value = 0;
  }, [active]);
  const containerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const displayPhotos = photos.slice(0, 6);

  return (
    <View style={s.slide}>
      <LinearGradient colors={['#1a0a0a', '#3b0f1a', '#6b1a2e']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[s.centerContent, containerStyle]}>
        <Text style={[s.slideLabel, { marginBottom: 6 }]}>הרגעים הכי יפים</Text>
        <Text style={[s.slideUnit, { fontSize: 16, marginBottom: 20, opacity: 0.7 }]}>כי כל תמונה שווה אלף מילים ❤️</Text>
        {displayPhotos.length > 0 ? (
          <View style={s.photoGrid}>
            {displayPhotos.map((uri, i) => (
              <View key={i} style={[s.photoCell, { transform: [{ rotate: `${(i % 2 === 0 ? 1 : -1) * (1 + i * 0.3)}deg` }] }]}>
                <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
              </View>
            ))}
          </View>
        ) : (
          <View style={s.funFactBox}>
            <Text style={s.funFactText}>הוסיפו תמונות לרגעים קסומים{'\n'}כדי לראות אותן כאן ✨</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

// Slide 5: Share / Finale
const FinaleSlide = ({ childName, totalDiapers, totalSleepHours, totalFeedings, onShare }: {
  childName: string;
  totalDiapers: number;
  totalSleepHours: number;
  totalFeedings: number;
  onShare: () => void;
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 80 }));
    opacity.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <View style={s.slide}>
      <LinearGradient colors={['#1a0010', '#3b0028', '#6b0050']} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(232,86,127,0.2)', 'transparent']}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[s.centerContent, animStyle]}>
        <Text style={{ fontSize: 60, marginBottom: 8 }}>🎉</Text>
        <Text style={s.finaleTitle}>איזה שנה, {childName}!</Text>
        <Text style={s.finaleSubtitle}>הסיכום שלכם ב-Calmino</Text>
        
        <View style={s.statsRow}>
          <View style={s.statChip}><Text style={s.statChipNum}>{totalDiapers.toLocaleString()}</Text><Text style={s.statChipLabel}>חיתולים 🧷</Text></View>
          <View style={s.statChip}><Text style={s.statChipNum}>{totalSleepHours.toLocaleString()}</Text><Text style={s.statChipLabel}>שעות שינה 🌙</Text></View>
          <View style={s.statChip}><Text style={s.statChipNum}>{totalFeedings.toLocaleString()}</Text><Text style={s.statChipLabel}>האכלות 🍼</Text></View>
        </View>

        <TouchableOpacity style={s.shareBtn} onPress={onShare} activeOpacity={0.85}>
          <Share2 size={18} color="#FFFFFF" />
          <Text style={s.shareBtnText}>שתפו את המסע</Text>
        </TouchableOpacity>

        <Text style={s.brandTag}>powered by Calmino ✨</Text>
      </Animated.View>
    </View>
  );
};

// ===== MAIN SCREEN =====
const SLIDES = ['intro', 'diapers', 'sleep', 'feedings', 'moments', 'finale'];

export default function CinematicReviewScreen({ data, childName, babyAgeMonths, onClose }: CinematicReviewScreenProps) {
  const { isDarkMode } = useTheme();
  const { t } = useLanguage();

  const [activeSlide, setActiveSlide] = useState(0);
  const progress = useSharedValue(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const TICK_MS = 50;
  const totalTicks = STORY_DURATION_MS / TICK_MS;
  const tickRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const goToSlide = useCallback((idx: number) => {
    if (idx >= SLIDES.length) { onClose(); return; }
    if (idx < 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopTimer();
    tickRef.current = 0;
    progress.value = 0;
    setActiveSlide(idx);
  }, [onClose, stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    tickRef.current = 0;
    progress.value = 0;
    progressTimer.current = setInterval(() => {
      tickRef.current++;
      progress.value = tickRef.current / totalTicks;
      if (tickRef.current >= totalTicks) {
        stopTimer();
        setActiveSlide(prev => {
          const next = prev + 1;
          if (next >= SLIDES.length) { onClose(); return prev; }
          tickRef.current = 0;
          progress.value = 0;
          return next;
        });
      }
    }, TICK_MS);
  }, [stopTimer, onClose, totalTicks]);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [activeSlide]);

  const handleTap = useCallback((side: 'left' | 'right') => {
    if (side === 'right') goToSlide(activeSlide + 1);
    else goToSlide(activeSlide - 1);
  }, [activeSlide, goToSlide]);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Share.share({
        message: `המסע של ${childName} ב-Calmino 🍼✨\n\n🧷 ${data.totalDiapers.toLocaleString()} חיתולים\n🌙 ${data.totalSleepHours.toLocaleString()} שעות שינה\n🍼 ${data.totalFeedings.toLocaleString()} האכלות\n\nהורידו את Calmino וגלו את המסע שלכם`,
      });
    } catch (e) {}
  }, [childName, data]);

  // Cover photos from album
  const coverPhoto = data.albumPhotos[0];
  const allPhotos = data.albumPhotos;

  const renderSlide = () => {
    switch (SLIDES[activeSlide]) {
      case 'intro':    return <IntroSlide childName={childName} firstDate={data.firstEventDate} photoUrl={coverPhoto} active />;
      case 'diapers':  return <DiapersSlide count={data.totalDiapers} active />;
      case 'sleep':    return <SleepSlide hours={data.totalSleepHours} longestHours={data.longestSleepHours} active />;
      case 'feedings': return <FeedingsSlide feedings={data.totalFeedings} bottleMl={data.totalBottleMl} active />;
      case 'moments':  return <MomentsSlide photos={allPhotos} active />;
      case 'finale':   return <FinaleSlide childName={childName} totalDiapers={data.totalDiapers} totalSleepHours={data.totalSleepHours} totalFeedings={data.totalFeedings} onShare={handleShare} />;
      default:         return null;
    }
  };

  return (
    <View style={s.root}>
      <StatusBar hidden />

      {/* Slide Content */}
      {renderSlide()}

      {/* Progress Bars */}
      <View style={s.progressBar}>
        {SLIDES.map((_, i) => (
          <ProgressSegment key={i} index={i} activeIndex={activeSlide} progress={progress} total={SLIDES.length} />
        ))}
      </View>

      {/* Close Button */}
      <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <BlurView intensity={40} tint="dark" style={s.closeBtnBlur}>
          <X size={20} color="#FFFFFF" />
        </BlurView>
      </TouchableOpacity>

      {/* Left / Right tap zones */}
      <TouchableOpacity style={s.tapLeft} onPress={() => handleTap('left')} activeOpacity={1} />
      <TouchableOpacity style={s.tapRight} onPress={() => handleTap('right')} activeOpacity={1} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  slide: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  // Progress
  progressBar: { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, left: 16, right: 16, flexDirection: 'row', gap: 4, zIndex: 10 },

  // Close
  closeBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 62 : 42, right: 16, zIndex: 20 },
  closeBtnBlur: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Tap Zones
  tapLeft: { position: 'absolute', top: 0, left: 0, width: SCREEN_W * 0.35, bottom: 0, zIndex: 5 },
  tapRight: { position: 'absolute', top: 0, right: 0, width: SCREEN_W * 0.65, bottom: 0, zIndex: 5 },

  // Slide content
  centerContent: { alignItems: 'center', paddingHorizontal: 32 },
  introContent: { alignItems: 'center', paddingHorizontal: 32 },

  // Intro
  introPill: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  introYear: { fontSize: 88, fontWeight: '900', color: 'rgba(255,255,255,0.12)', lineHeight: 90, letterSpacing: -4 },
  introTitle: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: 52, marginTop: -20, letterSpacing: -1 },
  introSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 16, lineHeight: 24 },

  // Generic
  bigEmoji: { fontSize: 72, marginBottom: 8 },
  bigNumber: { fontSize: 80, fontWeight: '900', color: '#FFFFFF', letterSpacing: -3, lineHeight: 86 },
  slideLabel: { fontSize: 18, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  slideUnit: { fontSize: 22, color: 'rgba(255,255,255,0.85)', fontWeight: '700', marginTop: 4, textAlign: 'center' },
  funFactBox: { marginTop: 24, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: 18, alignItems: 'center', maxWidth: 300 },
  funFactText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Sleep
  sleepBarBg: { width: SCREEN_W - 96, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)', flexDirection: 'row', overflow: 'hidden', marginTop: 20 },
  sleepBarFill: { backgroundColor: '#818CF8', height: 10, borderRadius: 5 },

  // Stars
  star: { position: 'absolute', borderRadius: 4, backgroundColor: '#FFFFFF' },

  // Photos Grid
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: SCREEN_W - 60 },
  photoCell: { width: (SCREEN_W - 100) / 3, height: (SCREEN_W - 100) / 3, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  photoImg: { width: '100%', height: '100%' },

  // Finale
  finaleTitle: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: 44, letterSpacing: -1 },
  finaleSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.55)', marginTop: 6, marginBottom: 28 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' },
  statChip: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 90 },
  statChipNum: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statChipLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, textAlign: 'center' },

  // Share
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8567F', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 16, shadowColor: '#E8567F', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  shareBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  brandTag: { marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },
});
