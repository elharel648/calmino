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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  X,
  Moon,
  Droplets,
  Utensils,
  Camera,
  Award,
  Share2,
  ChevronLeft,
  Wind,
} from 'lucide-react-native';
import { WrappedData } from '../services/wrappedService';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION_MS = 5500;

// ----- Types -----
interface CinematicReviewScreenProps {
  data: WrappedData;
  childName: string;
  babyAgeMonths: number;
  onClose: () => void;
}

// ----- Palette per slide -----
const PALETTES = {
  intro:    { bg: ['#080808', '#101010', '#080808'] as const, accent: '#C9A84C' },
  diapers:  { bg: ['#07070F', '#0C0C1C', '#07070F'] as const, accent: '#818CF8' },
  sleep:    { bg: ['#060810', '#08091E', '#060810'] as const, accent: '#60A5FA' },
  feedings: { bg: ['#060F08', '#0A1A0C', '#060F08'] as const, accent: '#34D399' },
  moments:  { bg: ['#0E080E', '#180C18', '#0E080E'] as const, accent: '#F472B6' },
  finale:   { bg: ['#0A0806', '#16120A', '#0A0806'] as const, accent: '#C9A84C' },
};
const SLIDES = ['intro', 'diapers', 'sleep', 'feedings', 'moments', 'finale'] as const;

// ----- Animated Progress Segment -----
const ProgressSegment = ({
  index,
  activeIndex,
  progress,
}: {
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
}) => {
  const fillStyle = useAnimatedStyle(() => {
    const w = index < activeIndex ? 1 : index === activeIndex ? progress.value : 0;
    return { flex: w };
  });
  const emptyStyle = useAnimatedStyle(() => {
    const w = index < activeIndex ? 0 : index === activeIndex ? 1 - progress.value : 1;
    return { flex: w };
  });
  return (
    <View style={ps.seg}>
      <Animated.View style={[ps.fill, fillStyle]} />
      <Animated.View style={[ps.empty, emptyStyle]} />
    </View>
  );
};
const ps = StyleSheet.create({
  seg:   { flex: 1, flexDirection: 'row', borderRadius: 2, overflow: 'hidden', height: 2.5, backgroundColor: 'rgba(255,255,255,0.18)' },
  fill:  { height: 2.5, backgroundColor: '#FFFFFF' },
  empty: { height: 2.5 },
});

// ----- Count-up hook -----
const useCountUp = (target: number, active: boolean, duration = 1800) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) { setValue(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, active]);
  return value;
};

// ----- Shared slide fade-in -----
const useFadeIn = (active: boolean, delay = 200) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  useEffect(() => {
    if (active) {
      opacity.value   = withDelay(delay, withTiming(1, { duration: 560 }));
      translateY.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 90 }));
    } else {
      opacity.value   = 0;
      translateY.value = 24;
    }
  }, [active]);
  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));
};

// ===== SLIDES =====

// Slide 0: Intro
const IntroSlide = ({ childName, firstDate, photoUrl, active, t }: {
  childName: string; firstDate: Date | null; photoUrl?: string; active: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const animStyle = useFadeIn(active);
  const year = firstDate?.getFullYear() ?? new Date().getFullYear();
  const pal = PALETTES.intro;
  return (
    <View style={s.slide}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={Platform.OS === 'android' ? 10 : 0} />
      ) : (
        <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />
      )}
      {photoUrl && Platform.OS === 'ios' && (
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.8)']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[s.center, animStyle]}>
        <Text style={s.yearWatermark}>{year}</Text>
        <View style={[s.chip, { borderColor: `${pal.accent}35` }]}>
          <Text style={[s.chipText, { color: pal.accent }]}>CALMINO</Text>
        </View>
        <Text style={s.introTitle}>{t('cinematic.intro.title', { name: childName })}</Text>
        <Text style={s.introSub}>{t('cinematic.intro.subtitle')}</Text>
      </Animated.View>
    </View>
  );
};

// Slide 1: Diapers
const DiapersSlide = ({ count, active, t }: {
  count: number; active: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const display = useCountUp(count, active);
  const animStyle = useFadeIn(active);
  const pal = PALETTES.diapers;
  const isEmpty = count === 0;

  const funFact = isEmpty
    ? t('cinematic.diapers.emptyFact')
    : count > 1000
    ? t('cinematic.diapers.funFact1', { count: (count / 365).toFixed(1) })
    : count > 400
    ? t('cinematic.diapers.funFact2')
    : t('cinematic.diapers.funFact3');

  return (
    <View style={s.slide}>
      <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />
      <View style={[s.glow, { backgroundColor: pal.accent }]} />
      <Animated.View style={[s.center, animStyle]}>
        <View style={[s.iconRing, { borderColor: `${pal.accent}28` }]}>
          <Wind size={34} color={pal.accent} strokeWidth={1.4} />
        </View>
        {isEmpty ? (
          <>
            <Text style={[s.bigNum, { color: pal.accent, fontSize: 52 }]}>🌱</Text>
            <Text style={s.unit}>{t('cinematic.diapers.emptyTitle')}</Text>
          </>
        ) : (
          <>
            <Text style={[s.bigNum, { color: pal.accent }]}>{display.toLocaleString()}</Text>
            <Text style={s.unit}>{t('cinematic.diapers.unit')}</Text>
          </>
        )}
        <View style={[s.card, { borderColor: `${pal.accent}18` }]}>
          <Text style={s.cardText}>{funFact}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Slide 2: Sleep
const SleepSlide = ({ hours, longestHours, active, t }: {
  hours: number; longestHours: number; active: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const display = useCountUp(hours, active, 2000);
  const barWidth = useSharedValue(0);
  const animStyle = useFadeIn(active);
  const isEmpty = hours === 0;
  useEffect(() => {
    if (active && !isEmpty) barWidth.value = withDelay(700, withTiming(1, { duration: 1300, easing: Easing.out(Easing.ease) }));
    else barWidth.value = 0;
  }, [active]);
  const barStyle = useAnimatedStyle(() => ({ flex: barWidth.value }));
  const pal = PALETTES.sleep;
  const nights = Math.round(hours / 8);

  return (
    <View style={s.slide}>
      <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />
      {STAR_POSITIONS.map((star, i) => (
        <View key={i} style={[s.star, { top: star.top, left: star.left, opacity: star.opacity, width: star.size, height: star.size }]} />
      ))}
      <View style={[s.glow, { backgroundColor: pal.accent, top: -80 }]} />
      <Animated.View style={[s.center, animStyle]}>
        <View style={[s.iconRing, { borderColor: `${pal.accent}28` }]}>
          <Moon size={34} color={pal.accent} strokeWidth={1.4} />
        </View>
        {isEmpty ? (
          <>
            <Text style={[s.bigNum, { color: pal.accent, fontSize: 52 }]}>🌙</Text>
            <Text style={s.unit}>{t('cinematic.sleep.emptyTitle')}</Text>
            <View style={[s.card, { borderColor: `${pal.accent}18` }]}>
              <Text style={s.cardText}>{t('cinematic.sleep.emptyFact')}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={s.slideLabel}>{t('cinematic.sleep.label')}</Text>
            <Text style={[s.bigNum, { color: '#FFFFFF' }]}>{display.toLocaleString()}</Text>
            <Text style={s.unit}>{t('cinematic.sleep.unit')}</Text>
            <View style={s.barBg}>
              <Animated.View style={[s.barFill, barStyle, { backgroundColor: pal.accent }]} />
            </View>
            <View style={[s.card, { borderColor: `${pal.accent}18` }]}>
              <Text style={s.cardText}>
                {t('cinematic.sleep.nights', { count: nights })}
                {longestHours > 0 ? `\n${t('cinematic.sleep.longest', { hours: longestHours })}` : ''}
              </Text>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
};


// Slide 3: Feedings
const FeedingsSlide = ({ feedings, bottleMl, active, t }: {
  feedings: number; bottleMl: number; active: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const displayF = useCountUp(feedings, active, 1600);
  const displayMl = useCountUp(bottleMl, active, 2000);
  const rot = useSharedValue(0);
  const animStyle = useFadeIn(active);
  const isEmpty = feedings === 0;
  useEffect(() => {
    if (active && !isEmpty) {
      rot.value = withDelay(300, withSpring(-8, { damping: 6, stiffness: 60 }));
      setTimeout(() => { rot.value = withSpring(0, { damping: 10, stiffness: 80 }); }, 600);
    } else { rot.value = 0; }
  }, [active]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const pal = PALETTES.feedings;

  return (
    <View style={s.slide}>
      <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />
      <View style={[s.glow, { backgroundColor: pal.accent }]} />
      <Animated.View style={[s.center, animStyle]}>
        <Animated.View style={[s.iconRing, { borderColor: `${pal.accent}28` }, iconStyle]}>
          <Utensils size={32} color={pal.accent} strokeWidth={1.4} />
        </Animated.View>
        {isEmpty ? (
          <>
            <Text style={[s.bigNum, { color: pal.accent, fontSize: 52 }]}>🍼</Text>
            <Text style={s.unit}>{t('cinematic.feedings.emptyTitle')}</Text>
            <View style={[s.card, { borderColor: `${pal.accent}18` }]}>
              <Text style={s.cardText}>{t('cinematic.feedings.emptyFact')}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={s.slideLabel}>{t('cinematic.feedings.label')}</Text>
            <Text style={[s.bigNum, { color: '#FFFFFF' }]}>{displayF.toLocaleString()}</Text>
            <Text style={s.unit}>{t('cinematic.feedings.unit')}</Text>
            {bottleMl > 0 && (
              <View style={[s.card, { borderColor: `${pal.accent}18` }]}>
                <Text style={s.cardText}>
                  {t('cinematic.feedings.bottleMl', { ml: displayMl.toLocaleString() })}
                  {bottleMl > 50000
                    ? `\n${t('cinematic.feedings.bigBottle')}`
                    : `\n${t('cinematic.feedings.commitment')}`}
                </Text>
              </View>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
};

// Slide 4: Moments
const MomentsSlide = ({ photos, active, t }: {
  photos: string[]; active: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const animStyle = useFadeIn(active);
  const pal = PALETTES.moments;
  const display = photos.slice(0, 6);

  return (
    <View style={s.slide}>
      <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />
      <View style={[s.glow, { backgroundColor: pal.accent }]} />
      <Animated.View style={[s.center, animStyle]}>
        {display.length === 0 && (
          <View style={[s.iconRing, { borderColor: `${pal.accent}28`, marginBottom: 20 }]}>
            <Camera size={32} color={pal.accent} strokeWidth={1.4} />
          </View>
        )}
        <Text style={s.slideLabel}>{t('cinematic.moments.label')}</Text>
        <Text style={[s.unit, { fontSize: 15, marginBottom: 20, opacity: 0.55 }]}>
          {t('cinematic.moments.tagline')}
        </Text>
        {display.length > 0 ? (
          <View style={s.grid}>
            {display.map((uri, i) => (
              <View
                key={i}
                style={[s.cell, { transform: [{ rotate: `${(i % 2 === 0 ? 1 : -1) * (0.8 + i * 0.25)}deg` }] }]}
              >
                <Image source={{ uri }} style={s.cellImg} resizeMode="cover" />
              </View>
            ))}
          </View>
        ) : (
          <View style={[s.card, { borderColor: `${pal.accent}18` }]}>
            <Text style={s.cardText}>{t('cinematic.moments.empty')}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};


// Slide 5: Finale

// Star trail — arc sitting just above the share button
// Positions are relative to a BOTTOM-anchored 56px wrapper
const TRAIL_STARS = Array.from({ length: 16 }, (_, i) => {
  const p = i / 15;
  const arc = Math.sin(p * Math.PI);          // 0 at edges → 1 at center
  return {
    x:      `${8 + p * 84}%`,                 // 8 % … 92 % across screen
    bottom: 6 + arc * 30,                      // px from wrapper bottom (6 … 36)
    size:   1.2 + arc * 2.6,                   // 1.2 … 3.8 px
    opacity: 0.18 + arc * 0.68,               // 0.18 … 0.86
  };
});

const FinaleSlide = ({ childName, totalDiapers, totalSleepHours, totalFeedings, onShare, t }: {
  childName: string; totalDiapers: number; totalSleepHours: number; totalFeedings: number;
  onShare: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const scale        = useSharedValue(0.92);
  const opacity      = useSharedValue(0);
  const trailOpacity = useSharedValue(0);
  useEffect(() => {
    scale.value        = withDelay(180, withSpring(1, { damping: 20, stiffness: 100 }));
    opacity.value      = withDelay(180, withTiming(1, { duration: 680 }));
    trailOpacity.value = withDelay(900,  withTiming(1, { duration: 1100 }));
  }, []);
  const animStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const trailStyle = useAnimatedStyle(() => ({ opacity: trailOpacity.value }));
  const pal = PALETTES.finale;

  const BTN_BOTTOM = Platform.OS === 'ios' ? 48 : 32;
  const BTN_H      = 56;
  const TRAIL_H    = 56;

  return (
    <View style={s.slide}>
      {/* Background */}
      <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />

      {/* Gold ambient glow — dedicated style, no shared override */}
      <View style={s.finaleGlow} />

      {/* Content area — fills screen above button zone */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { bottom: BTN_BOTTOM + BTN_H + TRAIL_H, alignItems: 'center', justifyContent: 'center' },
          animStyle,
        ]}
      >
        <View style={[s.iconRing, { borderColor: `${pal.accent}40`, width: 82, height: 82, borderRadius: 22, backgroundColor: 'rgba(201,168,76,0.09)' }]}>
          <Award size={38} color={pal.accent} strokeWidth={1.3} />
        </View>

        <Text style={[s.introTitle, { marginTop: 18, fontSize: 40, letterSpacing: -1.2 }]}>{childName}</Text>

        <Text style={[s.cardText, { color: `${pal.accent}85`, marginBottom: 28, letterSpacing: 2.8, fontSize: 10, textTransform: 'uppercase' }]}>
          {t('cinematic.finale.subtitle')}
        </Text>

        <View style={s.statsRow}>
          {[
            { num: totalDiapers,    label: t('cinematic.finale.diapers') },
            { num: totalSleepHours, label: t('cinematic.finale.sleepHours') },
            { num: totalFeedings,   label: t('cinematic.finale.feedings') },
          ].map((item, i) => (
            <View key={i} style={[s.chip2, { borderColor: `${pal.accent}28`, backgroundColor: 'rgba(201,168,76,0.07)' }]}>
              <Text style={[s.chip2Num, { color: '#F5EDD4' }]}>{item.num.toLocaleString()}</Text>
              <Text style={s.chip2Label}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Star trail — anchored just above share button */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0, right: 0,
            bottom: BTN_BOTTOM + BTN_H,
            height: TRAIL_H,
          },
          trailStyle,
        ]}
      >
        {TRAIL_STARS.map((star, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: star.x as any,
              bottom: star.bottom,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
              backgroundColor: '#C9A84C',
            }}
          />
        ))}
      </Animated.View>

      {/* Wide share button */}
      <View style={[s.finaleFooter, { bottom: BTN_BOTTOM }]}>
        <TouchableOpacity style={[s.shareBtnWide, { backgroundColor: pal.accent }]} onPress={onShare} activeOpacity={0.82}>
          <Share2 size={16} color="#1A1208" strokeWidth={2.2} />
          <Text style={[s.shareTxt, { color: '#1A1208', fontSize: 16, fontWeight: '700' }]}>{t('cinematic.finale.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};



// Static star positions (no Math.random at render time)
const STAR_POSITIONS = Array.from({ length: 22 }, (_, i) => ({
  top:     `${(i * 37 + 11) % 72}%` as any,
  left:    `${(i * 53 + 7)  % 100}%` as any,
  opacity: 0.35 + (i % 5) * 0.12,
  size:    1.5 + (i % 3) * 0.8,
}));

// ===== MAIN =====
export default function CinematicReviewScreen({ data, childName, babyAgeMonths, onClose }: CinematicReviewScreenProps) {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const progress     = useSharedValue(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef      = useRef(0);
  const TICK_MS      = 50;
  const totalTicks   = STORY_DURATION_MS / TICK_MS;

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const goTo = useCallback((idx: number) => {
    if (idx >= SLIDES.length) {
      stopTimer();
      setActiveSlide(SLIDES.length);
      return;
    }
    if (idx < 0) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopTimer();
    tickRef.current = 0;
    progress.value  = 0;
    setActiveSlide(idx);
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    tickRef.current = 0;
    progress.value  = 0;
    timerRef.current = setInterval(() => {
      tickRef.current++;
      progress.value = tickRef.current / totalTicks;
      if (tickRef.current >= totalTicks) {
        stopTimer();
        setActiveSlide(prev => {
          const next = prev + 1;
          if (next >= SLIDES.length) { return SLIDES.length; }
          tickRef.current = 0;
          progress.value  = 0;
          return next;
        });
      }
    }, TICK_MS);
  }, [stopTimer, totalTicks]);

  useEffect(() => {
    if (activeSlide >= SLIDES.length) {
      stopTimer();
      onClose();
    }
  }, [activeSlide, onClose, stopTimer]);

  useEffect(() => { startTimer(); return stopTimer; }, [activeSlide]);

  const handleTap = useCallback((side: 'left' | 'right') => {
    if (side === 'right') goTo(activeSlide + 1);
    else                  goTo(activeSlide - 1);
  }, [activeSlide, goTo]);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Share.share({
        message: `${t('cinematic.intro.title', { name: childName })} - Calmino\n\n${data.totalDiapers.toLocaleString()} ${t('cinematic.finale.diapers')}\n${data.totalSleepHours.toLocaleString()} ${t('cinematic.finale.sleepHours')}\n${data.totalFeedings.toLocaleString()} ${t('cinematic.finale.feedings')}`,
      });
    } catch {}
  }, [childName, data, t]);

  const renderSlide = () => {
    switch (SLIDES[activeSlide]) {
      case 'intro':    return <IntroSlide    childName={childName} firstDate={data.firstEventDate} photoUrl={data.albumPhotos[0]} active t={t} />;
      case 'diapers':  return <DiapersSlide  count={data.totalDiapers} active t={t} />;
      case 'sleep':    return <SleepSlide    hours={data.totalSleepHours} longestHours={data.longestSleepHours} active t={t} />;
      case 'feedings': return <FeedingsSlide feedings={data.totalFeedings} bottleMl={data.totalBottleMl} active t={t} />;
      case 'moments':  return <MomentsSlide  photos={data.albumPhotos} active t={t} />;
      case 'finale':   return <FinaleSlide   childName={childName} totalDiapers={data.totalDiapers} totalSleepHours={data.totalSleepHours} totalFeedings={data.totalFeedings} onShare={handleShare} t={t} />;
      default:         return null;
    }
  };


  return (
    <View style={s.root}>
      <StatusBar hidden />

      {renderSlide()}

      {/* Progress bars */}
      <View style={s.bars}>
        {SLIDES.map((_, i) => (
          <ProgressSegment key={i} index={i} activeIndex={activeSlide} progress={progress} />
        ))}
      </View>

      {/* Close */}
      <TouchableOpacity style={s.close} onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <BlurView intensity={35} tint="dark" style={s.closeBlur}>
          <X size={18} color="#FFFFFF" strokeWidth={2} />
        </BlurView>
      </TouchableOpacity>

      {/* Tap zones */}
      <TouchableOpacity style={s.tapL} onPress={() => handleTap('left')}  activeOpacity={1} />
      <TouchableOpacity style={s.tapR} onPress={() => handleTap('right')} activeOpacity={1} />
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#000' },
  slide: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: 36 },

  // Progress bars
  bars: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 38,
    left: 14, right: 14,
    flexDirection: 'row', gap: 4, zIndex: 10,
  },

  // Close
  close:     { position: 'absolute', top: Platform.OS === 'ios' ? 64 : 44, right: 16, zIndex: 20 },
  closeBlur: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Tap zones
  tapL: { position: 'absolute', top: 0, left: 0, width: SCREEN_W * 0.35, bottom: 0, zIndex: 5 },
  tapR: { position: 'absolute', top: 0, right: 0, width: SCREEN_W * 0.65, bottom: 0, zIndex: 5 },

  // Ambient glow
  glow: {
    position: 'absolute',
    bottom: -80, left: '50%', marginLeft: -160,
    width: 320, height: 280, borderRadius: 160,
    opacity: 0.11,
  },

  // Stars
  star: { position: 'absolute', borderRadius: 4, backgroundColor: '#FFFFFF' },

  // Icon ring
  iconRing: {
    width: 76, height: 76, borderRadius: 22,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
    marginBottom: 24,
  },

  // Numbers
  bigNum: {
    fontSize: 76, fontWeight: '900',
    letterSpacing: -3.5, lineHeight: 82,
    color: '#FFFFFF', marginBottom: 4,
  },
  unit: {
    fontSize: 17, color: 'rgba(255,255,255,0.38)',
    fontWeight: '500', letterSpacing: 0.3, marginBottom: 24, textAlign: 'center',
  },
  slideLabel: {
    fontSize: 17, color: 'rgba(255,255,255,0.55)',
    fontWeight: '600', marginBottom: 4, textAlign: 'center', letterSpacing: -0.2,
  },

  // Fact card
  card: {
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    maxWidth: 290, alignItems: 'center',
  },
  cardText: {
    color: 'rgba(255,255,255,0.48)', fontSize: 13.5,
    textAlign: 'center', lineHeight: 20, letterSpacing: -0.1,
  },

  // Sleep bar
  barBg:   { width: SCREEN_W - 110, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', overflow: 'hidden', marginBottom: 20 },
  barFill: { height: 5, borderRadius: 3 },

  // Photo grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: SCREEN_W - 60, marginTop: 10 },
  cell: { width: (SCREEN_W - 94) / 3, height: (SCREEN_W - 94) / 3, borderRadius: 12, overflow: 'hidden' },
  cellImg: { width: '100%', height: '100%' },

  // Intro
  yearWatermark: {
    fontSize: 110, fontWeight: '900',
    color: 'rgba(255,255,255,0.04)', lineHeight: 110,
    letterSpacing: -6, marginBottom: -20,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    marginBottom: 20,
  },
  chipText: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  introTitle: {
    fontSize: 48, fontWeight: '900',
    color: '#FFFFFF', textAlign: 'center',
    lineHeight: 54, letterSpacing: -2,
    marginBottom: 14,
  },
  introSub: {
    fontSize: 15, color: 'rgba(255,255,255,0.32)',
    textAlign: 'center', lineHeight: 22, letterSpacing: -0.1,
  },

  // Finale
  statsRow:   { flexDirection: 'row', gap: 9, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' },
  chip2:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 86 },
  chip2Num:   { fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  chip2Label: { fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 3, textAlign: 'center' },
  shareBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, paddingHorizontal: 26, paddingVertical: 14 },
  shareTxt:   { fontSize: 15, fontWeight: '800', color: '#000000', letterSpacing: -0.2 },

  // Finale — dedicated glow (no shared-style override)
  finaleGlow: {
    position: 'absolute',
    top: '30%', left: '50%', marginLeft: -190,
    width: 380, height: 340, borderRadius: 190,
    backgroundColor: '#C9A84C', opacity: 0.09,
  },

  // Finale footer
  finaleFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  shareBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 26,
    paddingVertical: 16,
    width: SCREEN_W * 0.84,
    shadowColor: '#C9A84C',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
  },
  trailStar: { position: 'absolute' },
});
