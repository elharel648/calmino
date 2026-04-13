import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform, Image, Share } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, interpolate, Extrapolation, SharedValue } from 'react-native-reanimated';
import { X, Award, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STORY_DURATION_MS = 3800; // Time per slide

export interface StoryPhoto {
  imageUrl: string;
  month: number;
  dateStr?: string;
}

interface MagicMomentsStoryScreenProps {
  photos: StoryPhoto[]; // Only passed photos that actually exist
  childName: string;
  onClose: () => void;
}

export default function MagicMomentsStoryScreen({ photos, childName, onClose }: MagicMomentsStoryScreenProps) {
  const { t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [previousSlide, setPreviousSlide] = useState<number | null>(null);
  
  // Progress goes from 0 to 1 for the *current* slide
  const progress = useSharedValue(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef  = useRef(0);
  const TICK_MS  = 50;
  const totalTicks = STORY_DURATION_MS / TICK_MS;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const nextSlide = useCallback(() => {
    stopTimer();
    if (activeSlide < photos.length) { // length + 1 because of finale
      setPreviousSlide(activeSlide);
      setActiveSlide(p => p + 1);
    } else {
      onClose();
    }
  }, [activeSlide, photos.length, onClose, stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    tickRef.current = 0;
    progress.value = 0;

    timerRef.current = setInterval(() => {
      tickRef.current += 1;
      progress.value = tickRef.current / totalTicks;
      if (tickRef.current >= totalTicks) {
        nextSlide();
      }
    }, TICK_MS);
  }, [nextSlide, progress, stopTimer, totalTicks]);

  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [activeSlide, startTimer, stopTimer]);

  // Touch zones
  const handleTouch = (e: any) => {
    const x = e.nativeEvent.pageX;
    if (x < SCREEN_W * 0.3) {
      // Prev
      if (activeSlide > 0) {
        setPreviousSlide(activeSlide);
        setActiveSlide(p => p - 1);
        startTimer();
      } else {
        startTimer(); // Restart first slide
      }
    } else {
      // Next
      nextSlide();
    }
  };

  const currentPhoto = photos[activeSlide];
  const isFinale = activeSlide === photos.length;

  return (
    <View style={s.container}>
      {/* Background dark obsidian */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, backgroundColor: '#070503' }} />
      </View>

      <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={handleTouch}>
        {/* CROSSFADE ENGINE */}
        {/* Render Previous Slide (Underneath) */}
        {previousSlide !== null && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
            {previousSlide === photos.length 
              ? <StoryFinale photos={photos} childName={childName} onShare={() => {}} t={t} />
              : <ImageSlide photo={photos[previousSlide]} />
            }
          </View>
        )}

        {/* Render Active Slide (On Top fading in) */}
        <View style={[StyleSheet.absoluteFill, { zIndex: 2 }]} pointerEvents="none">
           {activeSlide === photos.length 
              ? <StoryFinale photos={photos} childName={childName} onShare={() => {}} t={t} />
              : <ImageSlide photo={photos[activeSlide]} />
            }
        </View>

        {/* Progress Bars (Top - persistent over transitions) */}
        <View style={s.barsWrapper}>
          {Array.from({ length: photos.length + 1 }).map((_, i) => (
            <View key={i} style={s.barBg}>
              <AnimatedBar
                isActive={i === activeSlide}
                isPast={i < activeSlide}
                progress={progress}
              />
            </View>
          ))}
        </View>

        {/* Animated Typography (Re-mounts on slide change to trigger entrance animation) */}
        <View style={s.header}>
           <View style={s.headerTextCol}>
             {!isFinale && currentPhoto && (
               <SlideTypography key={`text-${activeSlide}`} photo={currentPhoto} t={t} />
             )}
           </View>
           <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
             <X size={26} color="#FFFFFF" strokeWidth={2.5} />
           </TouchableOpacity>
        </View>

        {/* Persistent Premium Brand Watermark (Hidden on Finale to avoid overlap with Share button) */}
        {!isFinale && (
          <View style={s.watermarkContainer} pointerEvents="none">
            <Image 
              source={require('../assets/icon.png')} 
              style={s.watermarkLogo} 
            />
            <Text style={s.watermarkText}>CALMINO</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ------------------------------------------------------------------
// SLIDE TYPOGRAPHY (Animates text beautifully)
// ------------------------------------------------------------------
function SlideTypography({ photo, t }: { photo: StoryPhoto, t: any }) {
  const translateY = useSharedValue(10);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 600 });
    opacity.value = withTiming(1, { duration: 800 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value
  }));

  return (
    <Animated.View style={animStyle}>
      <Text style={s.headerMonth}>{t('magicMoments.monthNum', { num: photo.month })}</Text>
      {photo.dateStr && <Text style={s.headerDate}>{photo.dateStr}</Text>}
    </Animated.View>
  );
}

// ------------------------------------------------------------------
// SLIDE TYPES
// ------------------------------------------------------------------

function ImageSlide({ photo }: { photo: StoryPhoto }) {
  // Ultra-premium Apple Memory Style: Contain foreground, Blurred Background
  const scale = useSharedValue(0.97);
  const translateY = useSharedValue(6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reset
    opacity.value = 0;
    scale.value = 0.97;
    translateY.value = 6;
    
    // Fade in gracefully
    opacity.value = withTiming(1, { duration: 600 });
    // Cinematic Slow breathe up to 1.0 (no extreme scaling!)
    scale.value = withTiming(1.0, { duration: STORY_DURATION_MS });
    translateY.value = withTiming(-2, { duration: STORY_DURATION_MS });
  }, [photo.imageUrl]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ] as any,
    opacity: opacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Deep dark obsidian base */}
      <View style={{ flex: 1, backgroundColor: '#000000' }} />

      {/* AMBIENT BACKGROUND GLOW: Extends the colors of the photo beautifully without distractingly sharp edges */}
      <Image 
        source={{ uri: photo.imageUrl }} 
        style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} 
        blurRadius={80} // Deep blur mimicking ambient light
        resizeMode="cover"
      />

      {/* 
        CRISP UN-CROPPED FOREGROUND 
        Using 'contain' means we NEVER chop off edges, heads, or feet. 
        It scales beautifully inside the frame regardless of portrait or landscape.
      */}
      <Animated.Image
        source={{ uri: photo.imageUrl }}
        style={[StyleSheet.absoluteFill, animStyle as any]}
        resizeMode="contain"
      />
      
      {/* Delicate Top gradient for text contrast */}
      <LinearGradient 
        colors={['rgba(0,0,0,0.7)', 'transparent']} 
        style={s.topGradient} 
        pointerEvents="none"
      />
      {/* Bottom gradient just for elegance */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)']}
        style={s.btmGradient}
        pointerEvents="none"
      />
    </View>
  );
}

function StoryFinale({ photos, childName, onShare, t }: { photos: StoryPhoto[], childName: string, onShare: () => void, t: any }) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 90 : 60,
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  // We show up to 9 photos in the grid
  const gridPhotos = photos.slice(0, 9);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Premium obsidian background */}
      <LinearGradient 
        colors={['#100A05', '#000000']} 
        style={StyleSheet.absoluteFill} 
      />
      
      {/* Elegant subtle top golden glow */}
      <LinearGradient 
        colors={['rgba(201,168,76,0.12)', 'transparent']} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }} 
        pointerEvents="none"
      />

      <Animated.View style={animStyle}>
        {/* Title area (Top) */}
        <View style={s.finaleHeader}>
          <Text style={s.finaleTitle} numberOfLines={2}>
            {childName ? t('magicMomentsStory.title', { name: childName }) : t('magicMomentsStory.titleGeneric')}
          </Text>
          <Text style={s.finaleSub}>{t('magicMomentsStory.finaleSubtitle')}</Text>
        </View>

        {/* Grid area (Center) */}
        <View style={s.gridWrapper}>
          <View style={s.gridContainer}>
            {gridPhotos.map((p, i) => (
              <Image key={i} source={{ uri: p.imageUrl }} style={s.gridItem} />
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Fixed Footer */}
      <View style={s.finaleFooter}>
        <TouchableOpacity style={s.shareBtn} onPress={onShare} activeOpacity={0.8}>
          <Share2 size={18} color="#1A1208" strokeWidth={2.4} />
          <Text style={s.shareTxt}>{t('magicMomentsStory.share')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// PROGRESS BAR COMPONENT
// ------------------------------------------------------------------

function AnimatedBar({ isActive, isPast, progress }: { isActive: boolean; isPast: boolean; progress: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => {
    let w = 0;
    if (isPast) w = 100;
    else if (isActive) w = progress.value * 100;
    return { width: `${w}%` };
  });

  return (
    <Animated.View style={[s.barFill, animStyle]} />
  );
}

// ------------------------------------------------------------------
// STYLES
// ------------------------------------------------------------------
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  barsWrapper: {
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  barBg: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  headerMonth: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerDate: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
  },
  
  // Watermark (Persistent)
  watermarkContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 40,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 10,
    opacity: 0.9,
  },
  watermarkLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginBottom: 8,
  },
  watermarkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  // Slide
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 180,
  },
  btmGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 180,
  },
  sideVignette: {
    borderLeftWidth: SCREEN_W * 0.1,
    borderRightWidth: SCREEN_W * 0.1,
    borderColor: 'rgba(0,0,0,0.3)',
  },

  // Finale
  finaleHeader: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  finaleTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 8,
  },
  finaleSub: {
    fontSize: 14,
    color: 'rgba(201,168,76,0.9)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  gridWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 120, // Create room for the absolute footer
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    maxWidth: 300,
    gap: 10,
  },
  gridItem: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  finaleFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    left: 0, right: 0,
    alignItems: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 26,
    paddingVertical: 18,
    backgroundColor: '#C9A84C',
    width: SCREEN_W * 0.84,
    shadowColor: '#C9A84C',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
  },
  shareTxt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1208',
  }
});
