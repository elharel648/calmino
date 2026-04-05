import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';

import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions } from 'react-native';
import { X, Check, Droplets, Play, Pause, Moon, Utensils, Apple, Milk, Plus, Minus, Calendar, ChevronLeft, ChevronRight, ChevronUp, Clock, Hourglass, Timer, MessageSquare, Sparkles, Layers } from 'lucide-react-native';
import DiaperIcon from './Common/DiaperIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useFoodTimer } from '../context/FoodTimerContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useActiveChild } from '../context/ActiveChildContext';
import { useToast } from '../context/ToastContext';
import quickActionsService from '../services/quickActionsService';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, withDelay, FadeIn, FadeOut, Easing, runOnJS, withRepeat, interpolate, useAnimatedScrollHandler } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView, NativeViewGestureHandler } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TIME_PICKER_STYLE = { width: 300, height: 216, alignSelf: 'center' as const };


const IsolatedDurationPicker = ({
  initialHours,
  initialMinutes,
  onChange,
  onDone,
  theme,
  t,
  locale,
}: {
  initialHours: number;
  initialMinutes: number;
  onChange: (h: number, m: number) => void;
  onDone: () => void;
  theme: any;
  t: any;
  locale?: string;
}) => {
  const [date, setDate] = useState(() => {
    // Countdown picker on iOS uses local time — use setHours (NOT UTC)
    // to avoid timezone offset corrupting the displayed duration
    const d = new Date(0);
    d.setHours(initialHours, initialMinutes, 0, 0);
    return d;
  });

  useEffect(() => {
    // Read local time values — countdown picker stores duration in local time
    const h = date.getHours();
    const m = date.getMinutes();
    const timer = setTimeout(() => onChange(h, m), 300);
    return () => clearTimeout(timer);
  }, [date, onChange]);

  return (
    <>
      <DateTimePicker
        value={date}
        mode="countdown"
        minuteInterval={1}
        display="spinner"
        style={{ width: '100%', height: 180 }}
        onChange={(event, selectedDate) => {
          if (selectedDate) setDate(selectedDate);
        }}
        locale={locale || "he-IL"}
      />
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[{ marginTop: 20, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 24, width: 'auto', minWidth: 140, alignItems: 'center' }, { backgroundColor: theme.primary, marginTop: 12 }]}
          onPress={onDone}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t('common.done')}</Text>
        </TouchableOpacity>
      )}
    </>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
  editingEvent?: any;
}

export default function TrackingModal({ visible, type, onClose, onSave, editingEvent }: TrackingModalProps) {
  const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
  const { t } = useLanguage();
  const { showError } = useToast();
  const foodTimerContext = useFoodTimer();
  const { activeChild } = useActiveChild();

  // Lazy content rendering — prevents iPhone CPU from freezing on mount
  const [contentReady, setContentReady] = useState(false);

  // Premium animations
  const glowAnim = useSharedValue(0);
  const sparkleAnim = useSharedValue(0);

  // Diaper icon animations
  const diaperPulse = useSharedValue(0);
  const diaperPulse2 = useSharedValue(0);
  const diaperWiggle = useSharedValue(0);
  const diaperBounce = useSharedValue(0);
  const diaperStar1 = useSharedValue(0);
  const diaperStar2 = useSharedValue(0);

  // Sleep icon animations
  const sleepIconPulse = useSharedValue(0);
  const sleepIconPulse2 = useSharedValue(0);
  const sleepIconBounce = useSharedValue(0);
  const sleepIconStar1 = useSharedValue(0);
  const sleepIconStar2 = useSharedValue(0);

  // Food icon animations
  const foodIconPulse = useSharedValue(0);
  const foodIconPulse2 = useSharedValue(0);
  const foodIconBounce = useSharedValue(0);
  const foodIconStar1 = useSharedValue(0);
  const foodIconStar2 = useSharedValue(0);

  // Save button animations
  const saveBtnScale = useSharedValue(1);
  const saveBtnCheckOpacity = useSharedValue(0);
  const saveBtnCheckScale = useSharedValue(0.5);
  const saveBtnTextOpacity = useSharedValue(1);

  // Get translated TYPE_CONFIG
  const TYPE_CONFIG = {
    food: {
      title: t('tracking.food.title'),
      icon: Utensils,
      accent: '#9B4A65',
      gradient: ['#B8627E', '#9B4A65', '#803A50'],
    },
    sleep: {
      title: t('tracking.sleep.title'),
      icon: Moon,
      accent: '#9B4A65',
      gradient: ['#B8627E', '#9B4A65', '#803A50'],
    },
    diaper: {
      title: t('tracking.diaper.title'),
      icon: DiaperIcon,
      accent: '#E5A87C',
      gradient: ['#E8A878', '#F0BB94', '#F8D4B0'],
    },
  };

  // --- Food States ---
  const [foodType, setFoodType] = useState<'bottle' | 'breast' | 'pumping' | 'solids'>('bottle');
  const [foodMode, setFoodMode] = useState<'normal' | 'timerange'>('normal'); // normal = current behavior, timerange = start/end time
  const [bottleAmount, setBottleAmount] = useState('');
  const [pumpingAmount, setPumpingAmount] = useState('');
  const [solidsFoodName, setSolidsFoodName] = useState('');
  const [foodNote, setFoodNote] = useState('');

  // Food Time States - using Date objects for picker (for timerange mode)
  const [foodStartTime, setFoodStartTime] = useState(() => new Date());
  const [foodEndTime, setFoodEndTime] = useState(() => new Date());
  const [showFoodStartTimePicker, setShowFoodStartTimePicker] = useState(false);
  const [showFoodEndTimePicker, setShowFoodEndTimePicker] = useState(false);

  // Selected Date for logging past/future entries
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarView, setCalendarView] = useState<'days' | 'months'>('days');

  // --- Sleep States (Manual entry) ---
  const [sleepMode, setSleepMode] = useState<'timer' | 'duration' | 'timerange'>('timer');
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(30);
  const sleepHoursRef = React.useRef(sleepHours);
  const sleepMinutesRef = React.useRef(sleepMinutes);
  React.useEffect(() => { sleepHoursRef.current = sleepHours; }, [sleepHours]);
  React.useEffect(() => { sleepMinutesRef.current = sleepMinutes; }, [sleepMinutes]);
  const [sleepNote, setSleepNote] = useState('');
  const sleepContext = useSleepTimer();

  // Sleep Manual Time Range
  const getInitialTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  const [sleepStartTime, setSleepStartTime] = useState(getInitialTime());
  const [sleepEndTime, setSleepEndTime] = useState(getInitialTime());
  const [sleepStartTimeDate, setSleepStartTimeDate] = useState(new Date());
  const [sleepEndTimeDate, setSleepEndTimeDate] = useState(new Date());
  const [showSleepStartPicker, setShowSleepStartPicker] = useState(false);
  const [showSleepEndPicker, setShowSleepEndPicker] = useState(false);

  // --- Diaper States ---
  const [subType, setSubType] = useState<string | null>(null);
  const [diaperNote, setDiaperNote] = useState('');
  const [diaperTime, setDiaperTime] = useState(() => new Date());
  const [showDiaperTimePicker, setShowDiaperTimePicker] = useState(false);
  const [showDiaperDatePicker, setShowDiaperDatePicker] = useState(false);

  // Save success state for checkmark animation
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (saveSuccess) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveBtnScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 12, stiffness: 150, mass: 0.5 })
      );
      saveBtnTextOpacity.value = withTiming(0, { duration: 150 });
      saveBtnCheckOpacity.value = withDelay(100, withTiming(1, { duration: 250 }));
      saveBtnCheckScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 150 }));
    } else {
      saveBtnScale.value = 1;
      saveBtnTextOpacity.value = 1;
      saveBtnCheckOpacity.value = 0;
      saveBtnCheckScale.value = 0.5;
    }
  }, [saveSuccess]);

  const saveBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveBtnScale.value }]
  }));
  const saveBtnTextAnimStyle = useAnimatedStyle(() => ({
    opacity: saveBtnTextOpacity.value
  }));
  const saveBtnCheckAnimStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    opacity: saveBtnCheckOpacity.value,
    transform: [{ scale: saveBtnCheckScale.value }]
  }));
  const [isSaving, setIsSaving] = useState(false);
  // Duration picker confirmation — "אישור" just hides the picker, save is via main button
  const [durationConfirmed, setDurationConfirmed] = useState(false);

  // Reanimated shared values for modal slide + backdrop
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const scrollY = useSharedValue(0);

  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const nativeScrollRef = useRef(null);

  const modalAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const triggerMediumHaptic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Animated dismiss — slides out then unmounts
  const dismissModal = useCallback(() => {
    logger.log('⏱️ [PERF] dismissModal START');
    const t0 = Date.now();
    backdropOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 280, easing: Easing.in(Easing.cubic) }, () => {
      runOnJS(onClose)();
    });
    logger.log(`⏱️ [PERF] dismissModal animation queued in ${Date.now() - t0}ms`);
  }, [onClose]);

  // Drum swipe step handlers (use refs to always get latest values, even mid-gesture)
  const handleHourSteps = React.useCallback((steps: number) => {
    setSleepHours(Math.max(0, Math.min(23, sleepHoursRef.current + steps)));
  }, []);

  const handleMinuteSteps = React.useCallback((steps: number) => {
    const cur = sleepMinutesRef.current;
    const curH = sleepHoursRef.current;
    const total = cur + steps;
    if (total >= 60) {
      const carry = Math.floor(total / 60);
      setSleepHours(Math.min(23, curH + carry));
      setSleepMinutes(total % 60);
    } else if (total < 0) {
      const borrow = Math.ceil(-total / 60);
      if (curH >= borrow) {
        setSleepHours(curH - borrow);
        setSleepMinutes(((total % 60) + 60) % 60);
      }
    } else {
      setSleepMinutes(total);
    }
  }, []);

  // RNGH Pan gesture — works natively with ScrollView, no JS bridge conflict
  // Always enabled so the drag handle can dismiss the modal at any time
  const panGesture = Gesture.Pan()
    .activeOffsetY([-2, 2])
    .simultaneousWithExternalGesture(nativeScrollRef)
    .onStart(() => {
      runOnJS(triggerHaptic)();
    })
    .onUpdate((e) => {
      // Only drag down when scroll is at top
      if (e.translationY > 0 && scrollY.value <= 5) {
        translateY.value = e.translationY;
        backdropOpacity.value = 1 - Math.min(e.translationY / 300, 0.7);
      }
    })
    .onEnd((e) => {
      const shouldDismiss = e.translationY > 120 || e.velocityY > 500;
      if (shouldDismiss) {
        runOnJS(triggerMediumHaptic)();
        backdropOpacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250, easing: Easing.in(Easing.cubic) }, () => {
          runOnJS(onClose)();
          translateY.value = SCREEN_HEIGHT;
          backdropOpacity.value = 0;
        });
      } else {
        translateY.value = withSpring(0, { stiffness: 300, damping: 30 });
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  useEffect(() => {
    if (visible) {
      // Phase 1: Start slide-in animation immediately (runs on native thread)
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      glowAnim.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
      sparkleAnim.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });

      // Phase 2: Reset state after a minimal delay (NOT waiting for all animations)
      // Using setTimeout instead of InteractionManager to avoid being blocked by spring/glow animations
      const timer = setTimeout(() => {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const cleanNote = (rawNote: string = '') => {
          const parts = rawNote.split('|').map(p => p.trim());
          if (parts.length > 1 && (parts[0].match(/\d+:\d+/) || parts[0].includes(':'))) {
             return parts.slice(1).join(' | ');
          }
          return rawNote;
        };

        if (editingEvent) {
          setSaveSuccess(false);
          const eventDate = editingEvent.timestamp ? (editingEvent.timestamp instanceof Date ? editingEvent.timestamp : new Date(editingEvent.timestamp)) : new Date(now);
          setSelectedDate(eventDate);
          
          if (type === 'food') {
            setFoodType(editingEvent.subType || 'bottle');
            setFoodNote(cleanNote(editingEvent.note));
            
            if (editingEvent.startTime && editingEvent.endTime) {
              setFoodMode('timerange');
              const [sH, sM] = editingEvent.startTime.split(':').map(Number);
              const [eH, eM] = editingEvent.endTime.split(':').map(Number);
              const sDate = new Date(eventDate); sDate.setHours(sH, sM, 0, 0);
              const eDate = new Date(eventDate); eDate.setHours(eH, eM, 0, 0);
              setFoodStartTime(sDate);
              setFoodEndTime(eDate);
            } else {
              setFoodMode('normal');
              if (editingEvent.amount) {
                 const amtMatch = String(editingEvent.amount).match(/\d+/);
                 if (amtMatch) {
                   if (editingEvent.subType === 'bottle') setBottleAmount(amtMatch[0]);
                   if (editingEvent.subType === 'pumping') setPumpingAmount(amtMatch[0]);
                 }
              }
              if (editingEvent.subType === 'solids') {
                 // Try to recover the solid food name from the note (often 'NAME | NOTE' or just 'NAME')
                 const parts = (editingEvent.note || '').split('|').map((p: string) => p.trim());
                 if (parts.length > 1 && !parts[0].match(/\d+:\d+/)) {
                   setSolidsFoodName(parts[0]);
                   setFoodNote(parts.slice(1).join(' | '));
                 } else {
                   setSolidsFoodName(editingEvent.note || '');
                   setFoodNote('');
                 }
              }
            }
          } else if (type === 'sleep') {
            setSleepNote(cleanNote(editingEvent.note));
            if (editingEvent.startTime && editingEvent.endTime) {
              setSleepMode('timerange');
              const [sH, sM] = editingEvent.startTime.split(':').map(Number);
              const [eH, eM] = editingEvent.endTime.split(':').map(Number);
              const sDate = new Date(eventDate); sDate.setHours(sH, sM, 0, 0);
              const eDate = new Date(eventDate); eDate.setHours(eH, eM, 0, 0);
              setSleepStartTimeDate(sDate);
              setSleepEndTimeDate(eDate);
              setSleepStartTime(editingEvent.startTime);
              setSleepEndTime(editingEvent.endTime);
            } else if (editingEvent.duration) {
               setSleepMode('duration');
               const totalMins = Math.floor(editingEvent.duration / 60);
               setSleepHours(Math.floor(totalMins / 60));
               setSleepMinutes(totalMins % 60);
            } else {
               setSleepMode('timer');
               setSleepHours(0);
               setSleepMinutes(30);
            }
          } else if (type === 'diaper') {
            setSubType(editingEvent.subType || null);
            setDiaperNote(cleanNote(editingEvent.note));
            setDiaperTime(eventDate);
          }
        } else {
          setSaveSuccess(false);
          setSubType(null);
          setBottleAmount('');
          setPumpingAmount('');
          setSolidsFoodName('');
          setFoodNote('');
          setSleepHours(0);
          setSleepMinutes(30);
          setSleepNote('');
          setDiaperNote('');
          setDiaperTime(new Date(now));
          setShowDiaperTimePicker(false);
          setShowDiaperDatePicker(false);
          setSleepMode('timer');
          setSleepStartTime(timeStr);
          setSleepEndTime(timeStr);
          setSleepStartTimeDate(new Date(now));
          setSleepEndTimeDate(new Date(now));
          setShowSleepStartPicker(false);
          setShowSleepEndPicker(false);
          setSelectedDate(new Date(now));
          setFoodMode('normal');
          setFoodStartTime(new Date(now));
          setFoodEndTime(new Date(now));
          setShowFoodStartTimePicker(false);
          setShowFoodEndTimePicker(false);
          setDurationConfirmed(false);
        }
        // Enable content rendering AFTER state is ready
        setContentReady(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      glowAnim.value = 0;
      sparkleAnim.value = 0;
      setContentReady(false);
    }
  }, [visible]);

  // Diaper icon animation
  useEffect(() => {
    if (visible && type === 'diaper') {
      // Double pulse rings
      diaperPulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
      diaperPulse2.value = withDelay(700, withRepeat(withTiming(1, { duration: 1400 }), -1, false));
      // Cute wiggle
      diaperWiggle.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 180 }),
          withTiming(10, { duration: 320 }),
          withTiming(-6, { duration: 250 }),
          withTiming(6, { duration: 250 }),
          withTiming(0, { duration: 180 }),
          withTiming(0, { duration: 1600 }),
        ),
        -1,
        false
      );
      // Gentle bounce up/down
      diaperBounce.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 450, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        false
      );
      // Sparkle star 1 — appears top-left
      diaperStar1.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 600 }),
          withTiming(0, { duration: 700 }),
        ),
        -1,
        false
      );
      // Sparkle star 2 — delayed, appears top-right
      diaperStar2.value = withDelay(900, withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 600 }),
          withTiming(0, { duration: 700 }),
        ),
        -1,
        false
      ));
    } else {
      diaperPulse.value = withTiming(0, { duration: 200 });
      diaperPulse2.value = withTiming(0, { duration: 200 });
      diaperWiggle.value = withTiming(0, { duration: 200 });
      diaperBounce.value = withTiming(0, { duration: 200 });
      diaperStar1.value = withTiming(0, { duration: 200 });
      diaperStar2.value = withTiming(0, { duration: 200 });
    }
  }, [visible, type]);

  // Food icon animation — same style as diaper
  useEffect(() => {
    if (visible && type === 'food') {
      foodIconPulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
      foodIconPulse2.value = withDelay(700, withRepeat(withTiming(1, { duration: 1400 }), -1, false));
      foodIconBounce.value = withRepeat(withSequence(withTiming(-3, { duration: 800 }), withTiming(0, { duration: 800 })), -1, true);
      foodIconStar1.value = withRepeat(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 600 }), withTiming(0, { duration: 700 })), -1, false);
      foodIconStar2.value = withDelay(600, withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 500 }), withTiming(0, { duration: 700 })), -1, false));
    } else {
      foodIconPulse.value = withTiming(0, { duration: 200 });
      foodIconPulse2.value = withTiming(0, { duration: 200 });
      foodIconBounce.value = withTiming(0, { duration: 200 });
      foodIconStar1.value = withTiming(0, { duration: 200 });
      foodIconStar2.value = withTiming(0, { duration: 200 });
    }
  }, [visible, type]);

  // Sleep icon animation — same style as diaper
  useEffect(() => {
    if (visible && type === 'sleep') {
      sleepIconPulse.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
      sleepIconPulse2.value = withDelay(700, withRepeat(withTiming(1, { duration: 1400 }), -1, false));
      sleepIconBounce.value = withRepeat(withSequence(withTiming(-3, { duration: 800 }), withTiming(0, { duration: 800 })), -1, true);
      sleepIconStar1.value = withRepeat(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 600 }), withTiming(0, { duration: 700 })), -1, false);
      sleepIconStar2.value = withDelay(600, withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 500 }), withTiming(0, { duration: 700 })), -1, false));
    } else {
      sleepIconPulse.value = withTiming(0, { duration: 200 });
      sleepIconPulse2.value = withTiming(0, { duration: 200 });
      sleepIconBounce.value = withTiming(0, { duration: 200 });
      sleepIconStar1.value = withTiming(0, { duration: 200 });
      sleepIconStar2.value = withTiming(0, { duration: 200 });
    }
  }, [visible, type]);

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0.3, 0.6]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [0.95, 1.05]) }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sparkleAnim.value, [0, 1], [0, 360])}deg` }],
  }));

  const diaperPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(diaperPulse.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(diaperPulse.value, [0, 1], [1, 1.75]) }],
  }));

  const diaperPulse2Style = useAnimatedStyle(() => ({
    opacity: interpolate(diaperPulse2.value, [0, 1], [0.3, 0]),
    transform: [{ scale: interpolate(diaperPulse2.value, [0, 1], [1, 1.75]) }],
  }));

  const diaperWiggleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${diaperWiggle.value}deg` }],
  }));

  const diaperBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: diaperBounce.value }],
  }));

  const diaperStar1Style = useAnimatedStyle(() => ({
    opacity: diaperStar1.value,
    transform: [
      { translateY: interpolate(diaperStar1.value, [0, 1], [0, -14]) },
      { scale: interpolate(diaperStar1.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
    ] as any,
  }));

  const diaperStar2Style = useAnimatedStyle(() => ({
    opacity: diaperStar2.value,
    transform: [
      { translateY: interpolate(diaperStar2.value, [0, 1], [0, -14]) },
      { scale: interpolate(diaperStar2.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
    ] as any,
  }));

  const foodIconPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(foodIconPulse.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(foodIconPulse.value, [0, 1], [1, 1.75]) }],
  }));
  const foodIconPulse2Style = useAnimatedStyle(() => ({
    opacity: interpolate(foodIconPulse2.value, [0, 1], [0.3, 0]),
    transform: [{ scale: interpolate(foodIconPulse2.value, [0, 1], [1, 1.75]) }],
  }));
  const foodIconBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: foodIconBounce.value }],
  }));
  const foodIconStar1Style = useAnimatedStyle(() => ({
    opacity: foodIconStar1.value,
    transform: [
      { translateY: interpolate(foodIconStar1.value, [0, 1], [0, -14]) },
      { scale: interpolate(foodIconStar1.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
    ] as any,
  }));
  const foodIconStar2Style = useAnimatedStyle(() => ({
    opacity: foodIconStar2.value,
    transform: [
      { translateY: interpolate(foodIconStar2.value, [0, 1], [0, -14]) },
      { scale: interpolate(foodIconStar2.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
    ] as any,
  }));

  const sleepIconPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sleepIconPulse.value, [0, 1], [0.45, 0]),
    transform: [{ scale: interpolate(sleepIconPulse.value, [0, 1], [1, 1.75]) }],
  }));
  const sleepIconPulse2Style = useAnimatedStyle(() => ({
    opacity: interpolate(sleepIconPulse2.value, [0, 1], [0.3, 0]),
    transform: [{ scale: interpolate(sleepIconPulse2.value, [0, 1], [1, 1.75]) }],
  }));
  const sleepIconBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sleepIconBounce.value }],
  }));
  const sleepIconStar1Style = useAnimatedStyle(() => ({
    opacity: sleepIconStar1.value,
    transform: [
      { translateY: interpolate(sleepIconStar1.value, [0, 1], [0, -14]) },
      { scale: interpolate(sleepIconStar1.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
    ] as any,
  }));
  const sleepIconStar2Style = useAnimatedStyle(() => ({
    opacity: sleepIconStar2.value,
    transform: [
      { translateY: interpolate(sleepIconStar2.value, [0, 1], [0, -14]) },
      { scale: interpolate(sleepIconStar2.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
    ] as any,
  }));

  // Calculate duration for Time Range mode (Sleep)
  const calculatedDuration = useMemo(() => {
    if (sleepMode !== 'timerange') return null;

    const startH = sleepStartTimeDate.getHours();
    const startM = sleepStartTimeDate.getMinutes();
    const endH = sleepEndTimeDate.getHours();
    const endM = sleepEndTimeDate.getMinutes();

    let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMins < 0) diffMins += 24 * 60;

    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    return { hours, minutes };
  }, [sleepStartTimeDate, sleepEndTimeDate, sleepMode]);

  // Calculate duration for Food Time Range mode
  const calculatedFoodDuration = useMemo(() => {
    if (type !== 'food' || foodMode !== 'timerange') return null;

    const startH = foodStartTime.getHours();
    const startM = foodStartTime.getMinutes();
    const endH = foodEndTime.getHours();
    const endM = foodEndTime.getMinutes();

    let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMins < 0) diffMins += 24 * 60;

    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;

    return { hours, minutes };
  }, [foodStartTime, foodEndTime, foodMode, type]);

  // Breastfeeding uses separate timer in FoodTimerContext
  const leftTimer = foodTimerContext.leftBreastTime + (foodTimerContext.breastActiveSide === 'left' && foodTimerContext.breastIsRunning ? foodTimerContext.breastElapsedSeconds : 0);
  const rightTimer = foodTimerContext.rightBreastTime + (foodTimerContext.breastActiveSide === 'right' && foodTimerContext.breastIsRunning ? foodTimerContext.breastElapsedSeconds : 0);
  const activeSide = foodTimerContext.breastActiveSide;

  const toggleBreastTimer = (side: 'left' | 'right') => {
    // If clicking on the same side that's currently running - pause it
    if (foodTimerContext.breastIsRunning && foodTimerContext.breastActiveSide === side && !foodTimerContext.breastIsPaused) {
      foodTimerContext.pauseBreast();
      // If clicking on a paused timer for the same side - resume it
    } else if (foodTimerContext.breastIsRunning && foodTimerContext.breastActiveSide === side && foodTimerContext.breastIsPaused) {
      foodTimerContext.resumeBreast();
      // Otherwise start the timer for this side
    } else {
      foodTimerContext.startBreast(side);
    }
  };

  const togglePumpingTimer = () => {
    // If running and not paused - pause it
    if (foodTimerContext.pumpingIsRunning && !foodTimerContext.pumpingIsPaused) {
      foodTimerContext.pausePumping();
      // If paused - resume it  
    } else if (foodTimerContext.pumpingIsRunning && foodTimerContext.pumpingIsPaused) {
      foodTimerContext.resumePumping();
      // Not running - start fresh
    } else {
      foodTimerContext.startPumping();
    }
  };

  const isPumpingActive = foodTimerContext.pumpingIsRunning;
  const pumpingTimer = foodTimerContext.pumpingElapsedSeconds;

  const isBottleActive = foodTimerContext.bottleIsRunning;
  const bottleTimer = foodTimerContext.bottleElapsedSeconds;

  const toggleBottleTimer = () => {
    // If running and not paused - pause it
    if (foodTimerContext.bottleIsRunning && !foodTimerContext.bottleIsPaused) {
      foodTimerContext.pauseBottle();
      // If paused - resume it
    } else if (foodTimerContext.bottleIsRunning && foodTimerContext.bottleIsPaused) {
      foodTimerContext.resumeBottle();
      // Not running - start fresh
    } else {
      foodTimerContext.startBottle();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSave = async () => {
    if (!type || isSaving) return;
    const t0 = Date.now();
    logger.log('⏱️ [PERF] handleSave START', { type });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logger.log(`⏱️ [PERF] haptics done in ${Date.now() - t0}ms`);

    let data: any = { type };
    if (editingEvent?.id) {
      data.id = editingEvent.id;
    }

    if (type === 'food') {
      let durationText = '';

      // Handle timerange mode for food (and force for solids)
      if (foodMode === 'timerange' || foodType === 'solids') {
        const startHours = foodStartTime.getHours();
        const startMinutes = foodStartTime.getMinutes();
        const endHours = foodEndTime.getHours();
        const endMinutes = foodEndTime.getMinutes();

        const startTimeStr = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
        const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // Calculate duration in minutes
        const startMins = startHours * 60 + startMinutes;
        const endMins = endHours * 60 + endMinutes;
        let durationMins = endMins - startMins;

        // Handle overnight (end time is next day)
        if (durationMins < 0) {
          durationMins += 24 * 60;
        }

        // Save start and end times
        data.startTime = startTimeStr;
        data.endTime = endTimeStr;
        data.duration = durationMins * 60; // Convert to seconds

        // Set timestamp to start time
        const startDate = new Date(selectedDate);
        startDate.setHours(startHours, startMinutes, 0, 0);
        data.timestamp = startDate;

        const h = Math.floor(durationMins / 60);
        const m = durationMins % 60;
        durationText = `${h}:${String(m).padStart(2, '0')}`;
      }

      if (foodType === 'bottle') {
        data.amount = bottleAmount ? `${bottleAmount} ${t('tracking.ml')}` : t('tracking.notSpecified');
        data.subType = 'bottle';
        if (foodMode === 'timerange' && durationText) {
          data.note = foodNote ? `${durationText} | ${foodNote}` : durationText;
        } else {
          // Normal mode with timer or manual note
          let noteParts = [];
          if (bottleTimer > 0) noteParts.push(`${t('tracking.duration')}: ${formatTime(bottleTimer)}`);
          if (foodNote) noteParts.push(foodNote);

          if (noteParts.length > 0) data.note = noteParts.join(' | ');
        }
      } else if (foodType === 'breast') {
        if (foodMode === 'timerange') {
          // In timerange mode, use start/end times instead of timer
          data.note = durationText ? (foodNote ? `${durationText} | ${foodNote}` : durationText) : foodNote;
        } else {
          // Normal mode - use timer
          data.note = `${t('tracking.leftColon')}: ${formatTime(leftTimer)} | ${t('tracking.rightColon')}: ${formatTime(rightTimer)}`;
          if (foodNote) data.note += ` | ${foodNote}`;
          // Save structured breast side data for stats filtering
          data.leftBreastDuration = leftTimer;
          data.rightBreastDuration = rightTimer;
          if (leftTimer > 0 || rightTimer > 0) {
            data.breastSide = leftTimer >= rightTimer ? 'left' : 'right';
          }
        }
        data.subType = 'breast';
      } else if (foodType === 'pumping') {
        data.amount = pumpingAmount ? `${pumpingAmount} ${t('tracking.ml')}` : t('tracking.notSpecified');
        if (foodMode === 'timerange') {
          // In timerange mode, use start/end times instead of timer
          if (durationText) {
            data.note = foodNote ? `${durationText} | ${foodNote}` : durationText;
          } else if (foodNote) {
            data.note = foodNote;
          }
        } else {
          // Normal mode - use timer
          data.note = pumpingTimer > 0 ? `${t('tracking.pumpingTime')}: ${formatTime(pumpingTimer)}` : undefined;
          if (foodNote && data.note) data.note += ` | ${foodNote}`;
          else if (foodNote) data.note = foodNote;
        }
        data.subType = 'pumping';
      } else if (foodType === 'solids') {
        data.note = solidsFoodName ? (foodNote ? `${solidsFoodName} | ${foodNote}` : solidsFoodName) : (foodNote || t('tracking.solidsFood'));
        if (durationText) {
          data.note = data.note ? `${durationText} | ${data.note}` : durationText;
        }
        data.subType = 'solids';
      }

      // Set timestamp if not already set (for normal mode)
      if (!data.timestamp) {
        data.timestamp = selectedDate;
      }
    } else if (type === 'sleep') {
      let durationText = '';
      if (sleepMode === 'timer' && sleepContext.elapsedSeconds > 0) {
        durationText = `${t('tracking.sleepDuration')}: ${sleepContext.formatTime(sleepContext.elapsedSeconds)}`;
        data.duration = sleepContext.elapsedSeconds;
        if (sleepContext.isRunning || (sleepContext as any).isPaused) sleepContext.stop();
      } else if (sleepMode === 'duration') {
        const totalMinutes = (sleepHours * 60) + sleepMinutes;
        if (totalMinutes > 0) {
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          durationText = `${t('tracking.sleepDuration')}: ${h}:${String(m).padStart(2, '0')}`;
          data.duration = totalMinutes * 60;
        }
      } else if (sleepMode === 'timerange') {
        // Always use the Date objects as they are the source of truth
        const startHours = sleepStartTimeDate.getHours();
        const startMinutes = sleepStartTimeDate.getMinutes();
        const endHours = sleepEndTimeDate.getHours();
        const endMinutes = sleepEndTimeDate.getMinutes();

        const startTimeStr = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
        const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // Calculate duration in minutes
        const startMins = startHours * 60 + startMinutes;
        const endMins = endHours * 60 + endMinutes;
        let durationMins = endMins - startMins;

        // Handle overnight sleep (end time is next day)
        if (durationMins < 0) {
          durationMins += 24 * 60;
        }

        // Always save, even if duration is 0 (user might have same start/end time)
        data.duration = durationMins * 60; // Convert to seconds

        // Save start and end times
        data.startTime = startTimeStr;
        data.endTime = endTimeStr;

        // Set timestamp to start time (use selectedDate as base, then set the time)
        const startDate = new Date(selectedDate);
        startDate.setHours(startHours, startMinutes, 0, 0);
        data.timestamp = startDate;

        const h = Math.floor(durationMins / 60);
        const m = durationMins % 60;
        durationText = `${t('tracking.sleepDuration')}: ${h}:${String(m).padStart(2, '0')}`;
      }

      // Add duration to note if available
      if (durationText && sleepNote) {
        data.note = `${durationText} | ${sleepNote}`;
      } else if (durationText) {
        data.note = durationText;
      } else {
        data.note = sleepNote;
      }

      // Set timestamp if not already set (for timer and duration modes)
      if (!data.timestamp) {
        data.timestamp = selectedDate;
      }
    } else if (type === 'diaper') {
      data.subType = subType;
      data.note = diaperNote;
      // Set the timestamp to the selected diaper time
      data.timestamp = diaperTime;
    }

    // Debug: Log data before saving
    if (type === 'sleep' && sleepMode === 'timerange') {
      logger.log('🔵 Sleep timerange data to save:', JSON.stringify({
        type: data.type,
        duration: data.duration,
        startTime: data.startTime,
        endTime: data.endTime,
        timestamp: data.timestamp?.toISOString(),
        note: data.note,
        hasTimestamp: !!data.timestamp,
        durationMins: data.duration ? Math.floor(data.duration / 60) : 0
      }, null, 2));
    }

    // Validate sleep duration > 0
    if (type === 'sleep') {
      if (sleepMode === 'timer' && (!data.duration || data.duration === 0)) {
        showError('יש להפעיל את הטיימר לפני השמירה.');
        return;
      }
      if (sleepMode === 'duration' && (!data.duration || data.duration === 0)) {
        showError('יש להזין משך שינה גדול מ-0.');
        return;
      }
      if (sleepMode === 'timerange' && data.duration === 0) {
        showError('שעת הסיום חייבת להיות שונה משעת ההתחלה.');
        return;
      }
    }

    // Validate diaper type selected
    if (type === 'diaper' && !subType) {
      showError('יש לבחור סוג חיתול לפני השמירה.');
      return;
    }

    // Validate that we have required data for timerange mode
    if (type === 'sleep' && sleepMode === 'timerange') {
      if (!data.timestamp) {
        logger.error('❌ Missing timestamp');
        showError('שגיאה: חסר timestamp. נא לנסות שוב.');
        return;
      }
      if (data.duration === undefined || data.duration === null) {
        logger.error('❌ Missing duration');
        showError('שגיאה: חסר duration. נא לנסות שוב.');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Always log full data for sleep timerange
      if (type === 'sleep' && sleepMode === 'timerange') {
        logger.log('🟢 Calling onSave with FULL sleep timerange data:', {
          type: data.type,
          duration: data.duration,
          startTime: data.startTime,
          endTime: data.endTime,
          timestamp: data.timestamp?.toISOString(),
          note: data.note,
          allData: data
        });
      } else {
        logger.log('🟢 Calling onSave with data:', { type: data.type, ...data });
      }
      logger.log(`⏱️ [PERF] onSave data prep + save took ${Date.now() - t0}ms`);
      await onSave(data);
      logger.log(`⏱️ [PERF] onSave completed in ${Date.now() - t0}ms`);

      // Start Live Activity for food
      if (type === 'food' && activeChild) {
        quickActionsService.startMeal(
          activeChild.childName,
          '👶', // Default emoji since ActiveChild doesn't have emoji property
          foodType,
          solidsFoodName ? [solidsFoodName] : [],
          0 // Initial progress
        ).catch(err => logger.log('Meal activity error:', err));
      }

      // Reset all food timers after successful save (only here, not on pause!)
      if (type === 'food') {
        foodTimerContext.resetBottle();
        foodTimerContext.resetPumping();
        foodTimerContext.resetBreast();
        // Reset notes
        setFoodNote('');
        setBottleAmount('');
        setPumpingAmount('');
        setSolidsFoodName('');
      }

      setSaveSuccess(true);
      logger.log(`⏱️ [PERF] post-save cleanup done in ${Date.now() - t0}ms`);
      setTimeout(() => {
        setSaveSuccess(false);
        logger.log(`⏱️ [PERF] dismissing modal after success animation, total ${Date.now() - t0}ms`);
        dismissModal();
      }, 1500);
    } catch (error) {
      logger.error('Save failed', error);
      showError(t('common.saveFailed') || 'שגיאה בשמירת הנתונים');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFoodContent = () => (
    <View style={{ width: '100%' }}>
      <View style={[styles.foodTabs, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'breast' && [styles.activeFoodTab, { backgroundColor: theme.card }]]}
          onPress={() => {
            setFoodType('breast');
            setFoodMode('normal'); // Reset to normal when switching tabs
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={styles.foodTabIconContainer}>
            {activeSide !== null ? (
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{formatTime(activeSide === 'left' ? leftTimer : rightTimer)}</Text>
            ) : (leftTimer > 0 || rightTimer > 0) ? (
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{formatTime(leftTimer + rightTimer)}</Text>
            ) : (
              <Milk size={20} color={foodType === 'breast' ? theme.primary : theme.textTertiary} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, { color: theme.textSecondary }, foodType === 'breast' && [styles.activeFoodTabText, { color: theme.primary }]]}>{t('tracking.breast')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'bottle' && [styles.activeFoodTab, { backgroundColor: theme.card }]]}
          onPress={() => {
            setFoodType('bottle');
            setFoodMode('normal'); // Reset to normal when switching tabs
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={styles.foodTabIconContainer}>
            {isBottleActive ? (
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{formatTime(bottleTimer)}</Text>
            ) : bottleTimer > 0 ? (
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{formatTime(bottleTimer)}</Text>
            ) : (
              <Milk size={20} color={foodType === 'bottle' ? theme.primary : theme.textTertiary} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, { color: theme.textSecondary }, foodType === 'bottle' && [styles.activeFoodTabText, { color: theme.primary }]]}>{t('tracking.bottle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'solids' && [styles.activeFoodTab, { backgroundColor: theme.card }]]}
          onPress={() => {
            setFoodType('solids');
            setFoodMode('normal'); // Reset to normal when switching tabs
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={styles.foodTabIconContainer}>
            <Apple size={20} color={foodType === 'solids' ? theme.primary : theme.textTertiary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.foodTabText, { color: theme.textSecondary }, foodType === 'solids' && [styles.activeFoodTabText, { color: theme.primary }]]}>{t('tracking.solids')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTab, foodType === 'pumping' && [styles.activeFoodTab, { backgroundColor: theme.card }]]}
          onPress={() => {
            setFoodType('pumping');
            setFoodMode('normal'); // Reset to normal when switching tabs
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={styles.foodTabIconContainer}>
            {isPumpingActive ? (
              <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700' }}>{formatTime(pumpingTimer)}</Text>
            ) : pumpingTimer > 0 ? (
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{formatTime(pumpingTimer)}</Text>
            ) : (
              <Droplets size={20} color={foodType === 'pumping' ? theme.primary : theme.textTertiary} strokeWidth={1.5} />
            )}
          </View>
          <Text style={[styles.foodTabText, { color: theme.textSecondary }, foodType === 'pumping' && [styles.activeFoodTabText, { color: theme.primary }]]}>{t('tracking.pumping')}</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Button - only in timerange/solids mode */}
      {(foodMode === 'timerange' || foodType === 'solids') && (
        <TouchableOpacity
          style={styles.datePickerBtn}
          onPress={() => { setShowCalendar(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Calendar size={16} color={theme.primary} strokeWidth={1.5} />
          <Text style={styles.datePickerBtnText}>
            {selectedDate.toDateString() === new Date().toDateString()
              ? t('tracking.today')
              : selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', weekday: 'short' })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Food Mode Toggle - Normal vs Timerange */}
      {/* Hide for solids - timer not relevant */}
      {foodType !== 'solids' && (
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, foodMode === 'normal' && [styles.modeToggleBtnActive, { backgroundColor: theme.primary }]]}
            onPress={() => { setFoodMode('normal'); setSelectedDate(new Date()); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.modeToggleText, foodMode === 'normal' && styles.modeToggleTextActive]}>
              {foodType === 'breast' ? t('tracking.timer') : foodType === 'pumping' ? t('tracking.timer') : foodType === 'bottle' ? t('tracking.now') : t('tracking.now')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleBtn, foodMode === 'timerange' && [styles.modeToggleBtnActive, { backgroundColor: theme.primary }]]}
            onPress={() => { setFoodMode('timerange'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Clock size={16} color={foodMode === 'timerange' ? '#fff' : theme.textSecondary} strokeWidth={2} />
            <Text style={[styles.modeToggleText, foodMode === 'timerange' && styles.modeToggleTextActive]}>
              {t('tracking.hours')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Food Time Range Picker - Always show for solids, otherwise only when timerange mode */}
      {(foodType === 'solids' || foodMode === 'timerange') && (
        <View style={styles.premiumTimeRow}>
          <View style={styles.premiumTimeCard}>
            <Text style={styles.premiumTimeLabel}>{t('tracking.start')}</Text>
            <TouchableOpacity
              style={styles.premiumTimeDisplay}
              onPress={() => { setShowFoodStartTimePicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={styles.premiumTimeDigit}>
                {foodStartTime.getHours().toString().padStart(2, '0')}:{foodStartTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.premiumTimeArrowContainer}>
            <Text style={styles.premiumTimeArrow}>→</Text>
          </View>

          <View style={styles.premiumTimeCard}>
            <Text style={styles.premiumTimeLabel}>{t('tracking.end')}</Text>
            <TouchableOpacity
              style={styles.premiumTimeDisplay}
              onPress={() => { setShowFoodEndTimePicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Text style={styles.premiumTimeDigit}>
                {foodEndTime.getHours().toString().padStart(2, '0')}:{foodEndTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Duration Display for Food Timerange */}
      {calculatedFoodDuration && (
        <View style={styles.durationContainer}>
          <View style={[styles.durationPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Clock size={15} color={theme.textSecondary} strokeWidth={2} />
            <Text style={[styles.durationText, { color: theme.textSecondary }]}>
              {t('tracking.total')}: {calculatedFoodDuration.hours > 0 ? `${calculatedFoodDuration.hours} ${t('tracking.hours')}` : ''} {calculatedFoodDuration.minutes > 0 ? `${calculatedFoodDuration.minutes} ${t('tracking.minutes')}` : ''}
              {calculatedFoodDuration.hours === 0 && calculatedFoodDuration.minutes === 0 ? `0 ${t('tracking.minutes')}` : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Bottle Content */}
      {
        foodType === 'bottle' && foodMode === 'normal' && (
          <View style={styles.bottleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, width: '100%', marginBottom: 12 }}>

              {/* Amount Section - Right Side (First in Code for RTL) */}
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.label, { textAlign: 'center', marginBottom: 12 }]}>{t('tracking.howMuch')}</Text>
                <View style={[styles.amountRow, { marginTop: 0, gap: 12 }]}>
                  <TouchableOpacity
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}
                    onPress={() => {
                      const current = parseInt(bottleAmount) || 0;
                      if (current >= 5) setBottleAmount((current - 5).toString());
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Minus size={18} color={theme.textPrimary} strokeWidth={1.5} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.amountDisplay}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (Platform.OS === 'ios') {
                        const Alert = require('react-native').Alert;
                        Alert.prompt(
                          t('tracking.enterAmount'),
                          t('tracking.howMuch'),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('tracking.done'), onPress: (value: string) => {
                                const num = parseInt(value);
                                if (!isNaN(num) && num > 0) setBottleAmount(num.toString());
                              }
                            },
                          ],
                          'plain-text',
                          bottleAmount || '0',
                          'number-pad'
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.amountValue, { fontSize: 32, color: theme.textPrimary }]}>{bottleAmount || '0'}</Text>
                    <Text style={[styles.amountUnit, { fontSize: 13 }]}>{t('tracking.ml')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}
                    onPress={() => {
                      const current = parseInt(bottleAmount) || 0;
                      setBottleAmount((current + 5).toString());
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Plus size={18} color={theme.textPrimary} strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timer Section for Bottle - Square Card - Left Side */}
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  style={[
                    styles.breastTimeCard,
                    { width: 130, aspectRatio: 1, flex: 0, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' },
                    isBottleActive && { backgroundColor: isDarkMode ? `${theme.primary}25` : `${theme.primary}15`, borderColor: theme.primary, borderWidth: 1.5 },
                    isBottleActive && foodTimerContext.bottleIsPaused && { opacity: 0.8 }
                  ]}
                  onPress={() => { toggleBottleTimer(); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.breastTimeLabel, isBottleActive && { color: theme.primary, fontWeight: '700' }]}>{t('tracking.timer')}</Text>
                  <Text style={[styles.breastTimeValue, { fontSize: 28, color: theme.textPrimary }, isBottleActive && { color: theme.primary }]}>
                    {formatTime(bottleTimer)}
                  </Text>
                  {isBottleActive && foodTimerContext.bottleIsPaused && (
                    <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600', marginTop: 4, letterSpacing: -0.2 }}>{'מושהה'}</Text>
                  )}
                  <View style={[styles.breastPlayBtn, isBottleActive && { backgroundColor: theme.primary }]}>
                    {isBottleActive && !foodTimerContext.bottleIsPaused ? <Pause size={14} color="#fff" /> : <Play size={14} color={isBottleActive ? '#fff' : theme.textTertiary} />}
                  </View>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        )
      }

      {/* Breast Content - Minimalist Style like Sleep */}
      {
        foodType === 'breast' && foodMode === 'normal' && (
          <View style={styles.breastContainer}>
            {/* Two time cards side by side */}
            <View style={styles.breastTimeRow}>
              {/* Left Breast Card */}
              <TouchableOpacity
                style={[
                  styles.breastTimeCard,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' },
                  activeSide === 'left' && { backgroundColor: isDarkMode ? `${theme.primary}25` : `${theme.primary}15`, borderColor: theme.primary, borderWidth: 1.5 },
                  activeSide === 'left' && foodTimerContext.breastIsPaused && { opacity: 0.8 }
                ]}
                onPress={() => { toggleBreastTimer('left'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.breastTimeLabel, activeSide === 'left' && { color: theme.primary, fontWeight: '700' }]}>{t('tracking.left')}</Text>
                <Text style={[styles.breastTimeValue, { color: theme.textPrimary }, activeSide === 'left' && { color: theme.primary }]}>{formatTime(leftTimer)}</Text>
                {activeSide === 'left' && foodTimerContext.breastIsPaused && (
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600', marginTop: 4, letterSpacing: -0.2 }}>{'מושהה'}</Text>
                )}
                <View style={[styles.breastPlayBtn, activeSide === 'left' && { backgroundColor: theme.primary }]}>
                  {activeSide === 'left' && !foodTimerContext.breastIsPaused ? <Pause size={14} color="#fff" /> : <Play size={14} color={activeSide === 'left' ? '#fff' : theme.textTertiary} />}
                </View>
              </TouchableOpacity>

              {/* Arrow indicator */}
              <Text style={styles.breastArrow}>←</Text>

              {/* Right Breast Card */}
              <TouchableOpacity
                style={[
                  styles.breastTimeCard,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' },
                  activeSide === 'right' && { backgroundColor: isDarkMode ? `${theme.primary}25` : `${theme.primary}15`, borderColor: theme.primary, borderWidth: 1.5 },
                  activeSide === 'right' && foodTimerContext.breastIsPaused && { opacity: 0.8 }
                ]}
                onPress={() => { toggleBreastTimer('right'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.breastTimeLabel, activeSide === 'right' && { color: theme.primary, fontWeight: '700' }]}>{t('tracking.right')}</Text>
                <Text style={[styles.breastTimeValue, { color: theme.textPrimary }, activeSide === 'right' && { color: theme.primary }]}>{formatTime(rightTimer)}</Text>
                {activeSide === 'right' && foodTimerContext.breastIsPaused && (
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600', marginTop: 4, letterSpacing: -0.2 }}>{'מושהה'}</Text>
                )}
                <View style={[styles.breastPlayBtn, activeSide === 'right' && { backgroundColor: theme.primary }]}>
                  {activeSide === 'right' && !foodTimerContext.breastIsPaused ? <Pause size={14} color="#fff" /> : <Play size={14} color={activeSide === 'right' ? '#fff' : theme.textTertiary} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Total time display */}
            <Text style={[styles.breastTotalLabel, { color: theme.textSecondary }]}>{t('tracking.total')}: {formatTime(leftTimer + rightTimer)}</Text>
          </View>
        )
      }

      {/* Pumping Content - Timer + Amount Side by Side */}
      {
        foodType === 'pumping' && foodMode === 'normal' && (
          <View style={styles.bottleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, width: '100%', marginBottom: 12 }}>

              {/* Amount Section - Right Side (First in Code for RTL) */}
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.label, { textAlign: 'center', marginBottom: 12 }]}>{t('tracking.pumpingAmount')}</Text>
                <View style={[styles.amountRow, { marginTop: 0, gap: 12 }]}>
                  <TouchableOpacity
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}
                    onPress={() => {
                      const current = parseInt(pumpingAmount) || 0;
                      if (current >= 5) setPumpingAmount((current - 5).toString());
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Minus size={18} color={theme.textPrimary} strokeWidth={1.5} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.amountDisplay}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (Platform.OS === 'ios') {
                        const Alert = require('react-native').Alert;
                        Alert.prompt(
                          t('tracking.enterAmount'),
                          t('tracking.pumpingAmount'),
                          [
                            { text: t('common.cancel'), style: 'cancel' },
                            {
                              text: t('tracking.done'), onPress: (value: string) => {
                                const num = parseInt(value);
                                if (!isNaN(num) && num >= 0) setPumpingAmount(num.toString());
                              }
                            },
                          ],
                          'plain-text',
                          pumpingAmount || '0',
                          'number-pad'
                        );
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.amountValue, { fontSize: 32, color: theme.textPrimary }]}>{pumpingAmount || '0'}</Text>
                    <Text style={[styles.amountUnit, { fontSize: 13 }]}>{t('tracking.ml')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' }]}
                    onPress={() => {
                      const current = parseInt(pumpingAmount) || 0;
                      setPumpingAmount((current + 5).toString());
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Plus size={18} color={theme.textPrimary} strokeWidth={1.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Timer Section for Pumping - Square Card - Left Side */}
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  style={[
                    styles.breastTimeCard,
                    { width: 130, aspectRatio: 1, flex: 0, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB' },
                    isPumpingActive && { backgroundColor: isDarkMode ? `${theme.primary}25` : `${theme.primary}15`, borderColor: theme.primary, borderWidth: 1.5 },
                    isPumpingActive && foodTimerContext.pumpingIsPaused && { opacity: 0.8 }
                  ]}
                  onPress={() => { togglePumpingTimer(); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.breastTimeLabel, isPumpingActive && { color: theme.primary, fontWeight: '700' }]}>{t('tracking.pumping')}</Text>
                  <Text style={[styles.breastTimeValue, { fontSize: 28, color: theme.textPrimary }, isPumpingActive && { color: theme.primary }]}>
                    {formatTime(pumpingTimer)}
                  </Text>
                  {isPumpingActive && foodTimerContext.pumpingIsPaused && (
                    <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600', marginTop: 4, letterSpacing: -0.2 }}>{'מושהה'}</Text>
                  )}
                  <View style={[styles.breastPlayBtn, isPumpingActive && { backgroundColor: theme.primary }]}>
                    {isPumpingActive && !foodTimerContext.pumpingIsPaused ? <Pause size={14} color="#fff" /> : <Play size={14} color={isPumpingActive ? '#fff' : theme.textTertiary} />}
                  </View>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        )

      }

      {/* Solids Content */}
      {
        foodType === 'solids' && foodMode === 'normal' && (
          <View style={styles.solidsContainer}>
            <Text style={styles.label}>{t('tracking.whatAte')}</Text>
            <TextInput
              style={[styles.solidsInput, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : '#E5E7EB', color: theme.textPrimary }]}
              placeholder={`${t('tracking.forExample')}: ...`}
              placeholderTextColor={theme.textTertiary}
              value={solidsFoodName}
              onChangeText={setSolidsFoodName}
              textAlign="right"
            />
          </View>
        )
      }
      {/* Free Text Note - Available for all food types */}
      <View style={styles.sleepNoteContainer}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MessageSquare size={14} color={theme.textTertiary} strokeWidth={2} />
          <Text style={styles.sleepNoteLabel}>{t('tracking.note')}</Text>
        </View>
        <View pointerEvents="auto">
          <TextInput
            style={[styles.sleepNoteInput, { minHeight: 80, color: theme.textPrimary, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]}
            placeholder={`${t('tracking.example')}: ...`}
            placeholderTextColor={theme.textTertiary}
            value={foodNote}
            onChangeText={setFoodNote}
            textAlign="right"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Food Start Time Picker Modal */}
      {showFoodStartTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              style={TIME_PICKER_STYLE}
              value={foodStartTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                if (Platform.OS === 'android') {
                  setShowFoodStartTimePicker(false);
                }
                if (selectedTime) {
                  setFoodStartTime(selectedTime);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.timePickerDoneBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowFoodStartTimePicker(false)}
              >
                <Text style={styles.timePickerDoneBtnText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Food End Time Picker Modal */}
      {showFoodEndTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              style={TIME_PICKER_STYLE}
              value={foodEndTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                if (Platform.OS === 'android') {
                  setShowFoodEndTimePicker(false);
                }
                if (selectedTime) {
                  setFoodEndTime(selectedTime);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.timePickerDoneBtn, { backgroundColor: theme.primary }]}
                onPress={() => setShowFoodEndTimePicker(false)}
              >
                <Text style={styles.timePickerDoneBtnText}>{t('common.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View >
  );


  const renderSleepContent = () => (
    <View style={{ width: '100%' }}>
      {/* Mode Selector */}
      <View style={[styles.sleepModeRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
        {([
          { mode: 'timerange', icon: Clock, label: t('tracking.hours') },
          { mode: 'duration', icon: Hourglass, label: t('tracking.duration') },
          { mode: 'timer', icon: Timer, label: t('tracking.timer') },
        ] as const).map(({ mode, icon: Icon, label }) => {
          const isActive = sleepMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.sleepModeBtn,
                isActive && styles.sleepModeBtnActive,
              ]}
              onPress={() => { setSleepMode(mode); setDurationConfirmed(false); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <Icon size={18} color={isActive ? theme.primary : theme.textTertiary} strokeWidth={2} />
              <Text style={[
                styles.sleepModeText,
                isActive && [styles.sleepModeTextActive, { color: theme.primary }],
                !isActive && { color: theme.textTertiary },
              ]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date Picker Button — visible in duration and timerange modes */}
      {sleepMode !== 'timer' && (
        <TouchableOpacity
          style={styles.datePickerBtn}
          onPress={() => { setShowCalendar(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Calendar size={16} color={theme.primary} strokeWidth={1.5} />
          <Text style={styles.datePickerBtnText}>
            {selectedDate.toDateString() === new Date().toDateString()
              ? t('tracking.today')
              : selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', weekday: 'short' })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Timer Mode */}
      {sleepMode === 'timer' && (
        <View style={styles.sleepTimerSection}>
          <TouchableOpacity
            style={[
              styles.sleepTimerCard,
              { 
                backgroundColor: sleepContext.isRunning 
                  ? (isDarkMode ? `${theme.primary}25` : `${theme.primary}15`)
                  : (isDarkMode ? 'rgba(255,255,255,0.07)' : '#F9FAFB'),
                borderColor: sleepContext.isRunning
                  ? theme.primary
                  : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'),
                borderWidth: sleepContext.isRunning ? 1.5 : 1,
              }
            ]}
            onPress={() => {
              if (sleepContext.isRunning && !sleepContext.isPaused) {
                if (sleepContext.pause) {
                  sleepContext.pause();
                } else {
                  sleepContext.stop();
                }
              } else if (sleepContext.isRunning && sleepContext.isPaused) {
                if (sleepContext.resume) {
                  sleepContext.resume();
                }
              } else {
                sleepContext.start();
              }
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            activeOpacity={0.8}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={[
                styles.sleepTimerValue,
                { color: sleepContext.isRunning ? theme.primary : (isDarkMode ? theme.textPrimary : '#1C1C1E') },
              ]}>
                {sleepContext.isRunning ? sleepContext.formatTime(sleepContext.elapsedSeconds) : '0:00'}
              </Text>
              {sleepContext.isRunning && sleepContext.isPaused && (
                <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '600', marginTop: 4, letterSpacing: -0.2 }}>{'מושהה'}</Text>
              )}
            </View>
            <View style={[
              styles.sleepTimerPlayBtn,
              { backgroundColor: sleepContext.isRunning && !sleepContext.isPaused ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') },
            ]}>
              {sleepContext.isRunning && !sleepContext.isPaused
                ? <Pause size={16} color="#fff" strokeWidth={2} />
                : <Play size={16} color={sleepContext.isRunning ? theme.primary : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#1C1C1E')} strokeWidth={2} />
              }
            </View>
          </TouchableOpacity>
          <Text style={[styles.sleepTimerHint, { color: theme.textTertiary }]}>
            {sleepContext.isRunning && !sleepContext.isPaused ? t('tracking.pressToStop') : t('tracking.pressToStart')}
          </Text>
        </View>
      )}

      {/* Duration Mode — Native Apple Countdown Picker */}
      {sleepMode === 'duration' && (
        <View style={{
          backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
          borderRadius: 24,
          paddingVertical: 20,
          paddingHorizontal: 16,
          marginVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 0,
          alignItems: 'center',
        }}>
          {!durationConfirmed ? (
            <IsolatedDurationPicker
              initialHours={sleepHours}
              initialMinutes={sleepMinutes}
              onChange={(h, m) => {
                setSleepHours(h);
                setSleepMinutes(m);
              }}
              onDone={() => {
                setDurationConfirmed(true);
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              theme={theme}
              t={t}
              locale="he-IL"
            />
          ) : (
            /* Summary after confirming duration — user can still change or add notes */
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: theme.textPrimary, fontVariant: ['tabular-nums'] }}>
                {sleepHours > 0 ? `${sleepHours} ${t('tracking.hours')}` : ''}{sleepHours > 0 && sleepMinutes > 0 ? ' ' : ''}{sleepMinutes > 0 ? `${sleepMinutes} ${t('tracking.minutes')}` : ''}
                {sleepHours === 0 && sleepMinutes === 0 ? `0 ${t('tracking.minutes')}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => setDurationConfirmed(false)}
                style={{ paddingVertical: 6, paddingHorizontal: 14 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.primary }}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Time Range Mode - DateTimePicker spinner like Food section */}
      {sleepMode === 'timerange' && (
        <>
          <View style={styles.premiumTimeRow}>
            <View style={styles.premiumTimeCard}>
              <Text style={styles.premiumTimeLabel}>{t('tracking.start')}</Text>
              <TouchableOpacity
                style={styles.premiumTimeDisplay}
                onPress={() => { setShowSleepStartPicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={styles.premiumTimeDigit}>{sleepStartTime}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.premiumTimeArrowContainer}>
              <Text style={styles.premiumTimeArrow}>→</Text>
            </View>

            <View style={styles.premiumTimeCard}>
              <Text style={styles.premiumTimeLabel}>{t('tracking.endTime')}</Text>
              <TouchableOpacity
                style={styles.premiumTimeDisplay}
                onPress={() => { setShowSleepEndPicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={styles.premiumTimeDigit}>{sleepEndTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration Display */}
          {calculatedDuration && (
            <View style={styles.durationContainer}>
              <View style={[styles.durationPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Clock size={15} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.durationText, { color: theme.textSecondary }]}>
                  {t('tracking.total')}: {calculatedDuration.hours > 0 ? `${calculatedDuration.hours} ${t('tracking.hours')}` : ''} {calculatedDuration.minutes > 0 ? `${calculatedDuration.minutes} ${t('tracking.minutes')}` : ''}
                  {calculatedDuration.hours === 0 && calculatedDuration.minutes === 0 ? `0 ${t('tracking.minutes')}` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Sleep Start Time Picker Modal */}
          {showSleepStartPicker && (
            <View style={styles.timePickerOverlay}>
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={sleepStartTimeDate}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowSleepStartPicker(false);
                    if (date) {
                      setSleepStartTimeDate(date);
                      const hours = date.getHours().toString().padStart(2, '0');
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      setSleepStartTime(`${hours}:${minutes}`);
                    }
                  }}
                  locale="he-IL"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.timePickerDoneBtn}
                    onPress={() => {
                      const hours = sleepStartTimeDate.getHours().toString().padStart(2, '0');
                      const minutes = sleepStartTimeDate.getMinutes().toString().padStart(2, '0');
                      setSleepStartTime(`${hours}:${minutes}`);
                      setShowSleepStartPicker(false);
                    }}
                  >
                    <Text style={styles.timePickerDoneBtnText}>{t('tracking.done')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Sleep End Time Picker Modal */}
          {showSleepEndPicker && (
            <View style={styles.timePickerOverlay}>
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={sleepEndTimeDate}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') setShowSleepEndPicker(false);
                    if (date) {
                      setSleepEndTimeDate(date);
                      const hours = date.getHours().toString().padStart(2, '0');
                      const minutes = date.getMinutes().toString().padStart(2, '0');
                      setSleepEndTime(`${hours}:${minutes}`);
                    }
                  }}
                  locale="he-IL"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.timePickerDoneBtn}
                    onPress={() => {
                      const hours = sleepEndTimeDate.getHours().toString().padStart(2, '0');
                      const minutes = sleepEndTimeDate.getMinutes().toString().padStart(2, '0');
                      setSleepEndTime(`${hours}:${minutes}`);
                      setShowSleepEndPicker(false);
                    }}
                  >
                    <Text style={styles.timePickerDoneBtnText}>{t('tracking.done')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </>
      )}

      {/* Free Text Note */}
      <View style={styles.sleepNoteContainer}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MessageSquare size={14} color={theme.textTertiary} strokeWidth={2} />
          <Text style={[styles.sleepNoteLabel, { color: theme.textTertiary }]}>{t('tracking.note')}</Text>
        </View>
        <TextInput
          style={[
            styles.sleepNoteInput,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
              color: theme.textPrimary,
            }
          ]}
          placeholder="לדוגמה: ישן עמוק, התעורר פעם אחת..."
          placeholderTextColor={theme.textTertiary}
          value={sleepNote}
          onChangeText={setSleepNote}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  // --- Diaper Content ---
  const renderDiaperContent = () => (
    <View style={{ width: '100%' }}>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>{t('tracking.whatHappened')}</Text>
      <View style={styles.diaperOptions}>
        {[
          { key: 'pee', label: t('tracking.wet'), icon: Droplets, activeColor: '#8ECAE6' },
          { key: 'poop', label: t('tracking.dirty'), icon: Sparkles, activeColor: '#ECA264' },
          { key: 'both', label: t('tracking.both'), icon: Layers, activeColor: '#8BA888' },
        ].map(opt => {
          const IconComponent = opt.icon;
          const isSelected = subType === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.diaperBtn,
                {
                  backgroundColor: isSelected
                    ? opt.activeColor
                    : (isDarkMode ? 'rgba(255,255,255,0.08)' : '#F9FAFB'),
                  borderColor: isSelected
                    ? opt.activeColor
                    : (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB'),
                  borderWidth: isSelected ? 1.5 : 1,
                }
              ]}
              onPress={() => {
                setSubType(opt.key);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.7}
            >
              <IconComponent
                size={22}
                color={isSelected ? '#FFFFFF' : (isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)')}
                strokeWidth={2}
              />
              <Text style={[
                styles.diaperBtnText,
                {
                  color: isSelected
                    ? '#FFFFFF'
                    : (isDarkMode ? theme.textSecondary : 'rgba(0,0,0,0.55)'),
                  fontWeight: isSelected ? '700' : '500'
                }
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Premium Date & Time Picker */}
      <View style={{ marginTop: 24 }}>
        <Text style={[styles.premiumTimeLabel, { color: theme.textSecondary, marginBottom: 10, textAlign: 'right' }]}>{t('tracking.whenHappened')}</Text>
        <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
          {/* Date Card */}
          <TouchableOpacity
            style={[styles.premiumTimeCard, { backgroundColor: theme.card, flex: 1, marginTop: 0 }]}
            onPress={() => {
              setShowDiaperDatePicker(true);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.premiumTimeDisplay, { gap: 8 }]}>
              <Calendar size={18} color={theme.primary} strokeWidth={2} />
              <Text style={[styles.premiumTimeDigit, { color: theme.textPrimary, fontSize: 15 }]}>
                {(() => {
                  const today = new Date();
                  const isToday = diaperTime.getDate() === today.getDate() && diaperTime.getMonth() === today.getMonth() && diaperTime.getFullYear() === today.getFullYear();
                  const yesterday = new Date(today);
                  yesterday.setDate(today.getDate() - 1);
                  const isYesterday = diaperTime.getDate() === yesterday.getDate() && diaperTime.getMonth() === yesterday.getMonth() && diaperTime.getFullYear() === yesterday.getFullYear();
                  if (isToday) return t('common.today');
                  if (isYesterday) return t('common.yesterday');
                  return `${diaperTime.getDate().toString().padStart(2, '0')}/${(diaperTime.getMonth() + 1).toString().padStart(2, '0')}`;
                })()}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Time Card */}
          <TouchableOpacity
            style={[styles.premiumTimeCard, { backgroundColor: theme.card, flex: 1, marginTop: 0 }]}
            onPress={() => {
              setShowDiaperTimePicker(true);
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.premiumTimeDisplay, { gap: 8 }]}>
              <Clock size={18} color={theme.primary} strokeWidth={2} />
              <Text style={[styles.premiumTimeDigit, { color: theme.textPrimary, fontSize: 15 }]}>
                {diaperTime.getHours().toString().padStart(2, '0')}:{diaperTime.getMinutes().toString().padStart(2, '0')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Diaper Date Picker Modal */}
      {showDiaperDatePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            {/* Done button — small, top-right */}
            {Platform.OS === 'ios' && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDiaperDatePicker(false);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                >
                  <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            )}
            <DateTimePicker
              value={diaperTime}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              locale="he-IL"
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowDiaperDatePicker(false);
                }
                if (selectedDate) {
                  const updated = new Date(diaperTime);
                  updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                  setDiaperTime(updated);
                }
              }}
            />
          </View>
        </View>
      )}

      {/* Diaper Time Picker Modal */}
      {showDiaperTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            {/* Done button — small, top-right */}
            {Platform.OS === 'ios' && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDiaperTimePicker(false);
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
                >
                  <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
            )}
            <DateTimePicker
              value={diaperTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                if (Platform.OS === 'android') {
                  setShowDiaperTimePicker(false);
                }
                if (selectedTime) {
                  const updated = new Date(diaperTime);
                  updated.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                  setDiaperTime(updated);
                }
              }}
            />
          </View>
        </View>
      )}

      <TextInput
        style={[
          styles.diaperNoteInput,
          {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
            color: theme.textPrimary,
          }
        ]}
        placeholder={t('tracking.note')}
        placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF'}
        value={diaperNote}
        onChangeText={(text) => setDiaperNote(text)}
        textAlign="right"
      />
    </View>
  );

  const renderContent = () => {
    if (type === 'food') return renderFoodContent();
    if (type === 'sleep') return renderSleepContent();
    if (type === 'diaper') return renderDiaperContent();
    return null;
  };

  const config = type ? TYPE_CONFIG[type] : TYPE_CONFIG['food'];

  return (
    <>
      <Modal visible={visible && !!type} transparent animationType="none">
        <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'height' : 'height'} style={styles.overlay}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropAnimStyle]}>
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)' },
              ]}
            />
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={dismissModal}
            />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.modalCard,
                { backgroundColor: theme.card },
                modalAnimStyle,
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.dragHandle}>
                <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }]} />
              </View>

              {/* Header */}
              {type && (
                <View style={styles.header}>
                  {(() => {
                    const typeColor = Object.keys(theme.actionColors).includes(type) 
                      ? theme.actionColors[type as keyof typeof theme.actionColors]?.color 
                      : config.accent;
                      
                    const TypePulseStyle = type === 'diaper' ? diaperPulseStyle : type === 'food' ? foodIconPulseStyle : sleepIconPulseStyle;
                    const TypePulse2Style = type === 'diaper' ? diaperPulse2Style : type === 'food' ? foodIconPulse2Style : sleepIconPulse2Style;
                    const TypeStar1Style = type === 'diaper' ? diaperStar1Style : type === 'food' ? foodIconStar1Style : sleepIconStar1Style;
                    const TypeStar2Style = type === 'diaper' ? diaperStar2Style : type === 'food' ? foodIconStar2Style : sleepIconStar2Style;
                    const TypeBounceStyle = type === 'diaper' ? diaperBounceStyle : type === 'food' ? foodIconBounceStyle : sleepIconBounceStyle;
                    const TypeWiggleStyle = type === 'diaper' ? diaperWiggleStyle : {}; 

                    return (
                      <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
                        {/* Double pulse rings */}
                        <Animated.View style={[{ position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: typeColor }, TypePulseStyle]} />
                        <Animated.View style={[{ position: 'absolute', width: 56, height: 56, borderRadius: 28, backgroundColor: typeColor }, TypePulse2Style]} />
                        
                        {/* Floating sparkle stars */}
                        <Animated.View style={[{ position: 'absolute', left: 6, top: 8 }, TypeStar1Style]}>
                          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: typeColor }} />
                        </Animated.View>
                        <Animated.View style={[{ position: 'absolute', right: 6, top: 8 }, TypeStar2Style]}>
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: typeColor, opacity: 0.8 }} />
                        </Animated.View>
                        
                        {/* Icon with bounce */}
                        <Animated.View style={TypeBounceStyle}>
                          <View style={[styles.emojiCircle, { 
                            backgroundColor: typeColor, 
                            width: 56, height: 56, borderRadius: 28,
                            shadowColor: isDarkMode ? 'transparent' : typeColor,
                            shadowOpacity: 0.35,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 5 },
                            borderWidth: 2.5,
                            borderColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                          }]}>
                            <Animated.View style={TypeWiggleStyle}>
                              {React.createElement(config.icon, { size: 28, color: '#FFFFFF', strokeWidth: 2.2 })}
                            </Animated.View>
                          </View>
                        </Animated.View>
                      </View>
                    );
                  })()}
                  <Text style={[styles.title, { color: theme.textPrimary }]}>{config.title}</Text>
                </View>
              )}

              {/* Scrollable Content */}
              <NativeViewGestureHandler ref={nativeScrollRef}>
                <Animated.ScrollView
                  ref={scrollViewRef}
                  style={{ width: '100%' }}
                  contentContainerStyle={styles.content}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  scrollEventThrottle={16}
                  onScroll={scrollHandler}
                >
                  {contentReady ? renderContent() : (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: config.accent, borderTopColor: 'transparent', transform: [{ rotate: '45deg' }] }} />
                    </View>
                  )}
                </Animated.ScrollView>
              </NativeViewGestureHandler>

              {/* Save Button - Premium Full Width */}
              <Animated.View style={[saveBtnAnimStyle, { width: '100%', marginTop: 20 }]}>
                <TouchableOpacity
                  style={[styles.saveBtn, !contentReady && { opacity: 0.4 }, { marginTop: 0 }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={saveSuccess || isSaving || !contentReady}
                  accessibilityRole="button"
                  accessibilityLabel={saveSuccess ? t('misc.savedSuccessfully') : t('tracking.saveRecord')}
                  accessibilityState={{ disabled: saveSuccess }}
                >
                  <Animated.View style={saveBtnCheckAnimStyle}>
                    <Check size={22} color="#fff" strokeWidth={2.5} />
                  </Animated.View>
                  <Animated.View style={saveBtnTextAnimStyle}>
                    <Text style={styles.saveBtnText}>
                      {t('tracking.saveRecord')}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>

              {/* Calendar Overlay - Inline */}
              {showCalendar && (
                <View style={styles.calendarInlineOverlay}>
                  <TouchableOpacity style={styles.calendarInlineBackdrop} activeOpacity={1} onPress={() => { setShowCalendar(false); setCalendarView('days'); }} />
                  <View style={styles.calendarCard}>
                    {/* Month Header - Clickable for drill-up */}
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                        const newDate = new Date(selectedDate);
                        if (calendarView === 'days') {
                          newDate.setMonth(newDate.getMonth() + 1);
                        } else {
                          newDate.setFullYear(newDate.getFullYear() + 1);
                        }
                        setSelectedDate(newDate);
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}>
                        <ChevronLeft size={18} color="#374151" strokeWidth={1.5} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setCalendarView(calendarView === 'days' ? 'months' : 'days');
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={styles.calendarMonthText}>
                            {calendarView === 'days'
                              ? selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
                              : selectedDate.getFullYear().toString()
                            }
                          </Text>
                          <ChevronUp size={14} color="#374151" strokeWidth={1.5} style={{ transform: [{ rotate: calendarView === 'months' ? '180deg' : '0deg' }] }} />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                        const newDate = new Date(selectedDate);
                        if (calendarView === 'days') {
                          newDate.setMonth(newDate.getMonth() - 1);
                        } else {
                          newDate.setFullYear(newDate.getFullYear() - 1);
                        }
                        setSelectedDate(newDate);
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}>
                        <ChevronRight size={18} color="#374151" strokeWidth={1.5} />
                      </TouchableOpacity>
                    </View>

                    {/* Days View */}
                    {calendarView === 'days' && (
                      <>
                        {/* Week Days */}
                        <View style={styles.calendarWeekRow}>
                          {[t('weekday.sun'), t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat')].map((day, i) => (
                            <Text key={i} style={styles.calendarWeekDay}>{day}</Text>
                          ))}
                        </View>

                        {/* Days Grid */}
                        <View style={styles.calendarDaysGrid}>
                          {(() => {
                            const year = selectedDate.getFullYear();
                            const month = selectedDate.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const today = new Date();
                            const days = [];

                            for (let i = 0; i < firstDay; i++) {
                              days.push(<View key={`e-${i}`} style={styles.calendarDay} />);
                            }

                            for (let d = 1; d <= daysInMonth; d++) {
                              const date = new Date(year, month, d);
                              const isToday = date.toDateString() === today.toDateString();
                              const isSelected = date.toDateString() === selectedDate.toDateString();
                              const isFuture = date > today;

                              days.push(
                                <TouchableOpacity
                                  key={d}
                                  style={[styles.calendarDay, isToday && styles.calendarDayToday, isSelected && styles.calendarDaySelected, isFuture && styles.calendarDayDisabled]}
                                  onPress={() => { if (!isFuture) { setSelectedDate(date); setShowCalendar(false); setCalendarView('days'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                                  disabled={isFuture}
                                >
                                  <Text style={[styles.calendarDayText, isSelected && styles.calendarDaySelectedText]}>{d}</Text>
                                </TouchableOpacity>
                              );
                            }
                            return days;
                          })()}
                        </View>
                      </>
                    )}

                    {/* Months View */}
                    {calendarView === 'months' && (
                      <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', marginTop: 8 }}>
                        {[t('months.january'), t('months.february'), t('months.march'), t('months.april'), t('months.may'), t('months.june'), t('months.july'), t('months.august'), t('months.september'), t('months.october'), t('months.november'), t('months.december')].map((month, i) => {
                          const isCurrentMonth = selectedDate.getMonth() === i;
                          const today = new Date();
                          const isFutureMonth = selectedDate.getFullYear() > today.getFullYear() ||
                            (selectedDate.getFullYear() === today.getFullYear() && i > today.getMonth());

                          return (
                            <TouchableOpacity
                              key={i}
                              style={{
                                width: '33.33%',
                                padding: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isCurrentMonth ? '#7C3AED' : 'transparent',
                                borderRadius: 12,
                                opacity: isFutureMonth ? 0.4 : 1,
                              }}
                              onPress={() => {
                                if (!isFutureMonth) {
                                  const newDate = new Date(selectedDate);
                                  newDate.setMonth(i);
                                  // If selected day doesn't exist in new month, set to last day
                                  const daysInNewMonth = new Date(newDate.getFullYear(), i + 1, 0).getDate();
                                  if (newDate.getDate() > daysInNewMonth) {
                                    newDate.setDate(daysInNewMonth);
                                  }
                                  setSelectedDate(newDate);
                                  setCalendarView('days');
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }
                              }}
                              disabled={isFutureMonth}
                            >
                              <Text style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: isCurrentMonth ? '#fff' : '#374151',
                              }}>{month}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Today Button */}
                    <TouchableOpacity style={[styles.datePickerBtn, { marginTop: 16, marginBottom: 0 }]} onPress={() => { setSelectedDate(new Date()); setShowCalendar(false); setCalendarView('days'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <Text style={styles.datePickerBtnText}>{t('tracking.today')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>


      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)
        }
        statusBarTranslucent={true}
      >
        <TouchableOpacity style={[styles.calendarModal, { backgroundColor: theme.modalOverlay }]} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <TouchableOpacity style={[styles.calendarCard, { backgroundColor: theme.card }]} activeOpacity={1} onPress={() => { }}>
            {/* Month Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={[styles.calendarNavBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}>
                <ChevronLeft size={18} color={theme.textPrimary} strokeWidth={1.5} />
              </TouchableOpacity>
              <Text style={[styles.calendarMonthText, { color: theme.textPrimary }]}>
                {selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity style={[styles.calendarNavBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}>
                <ChevronRight size={18} color={theme.textPrimary} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Week Days Header */}
            <View style={styles.calendarWeekRow}>
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, i) => (
                <Text key={i} style={[styles.calendarWeekDay, { color: theme.textTertiary }]}>{day}</Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarDaysGrid}>
              {(() => {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const today = new Date();
                const days = [];

                // Empty slots for days before month starts
                for (let i = 0; i < firstDay; i++) {
                  days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                }

                // Days of month
                for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(year, month, d);
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = date.toDateString() === selectedDate.toDateString();
                  const isFuture = date > today;

                  days.push(
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.calendarDay,
                        isToday && [styles.calendarDayToday, { backgroundColor: theme.cardSecondary }],
                        isSelected && [styles.calendarDaySelected, { backgroundColor: theme.primary }],
                        isFuture && styles.calendarDayDisabled
                      ]}
                      onPress={() => {
                        if (!isFuture) {
                          setSelectedDate(date);
                          setShowCalendar(false);
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.calendarDayText,
                        { color: theme.textPrimary },
                        isSelected && [styles.calendarDaySelectedText, { color: theme.card }]
                      ]}>{d}</Text>
                    </TouchableOpacity>
                  );
                }
                return days;
              })()}
            </View>

            {/* Today Button */}
            <TouchableOpacity
              style={[styles.datePickerBtn, { marginTop: 16, marginBottom: 0, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
              onPress={() => {
                setSelectedDate(new Date());
                setShowCalendar(false);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.datePickerBtnText, { color: theme.primary }]}>{t('common.today')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal >
    </>
  );
}

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({


  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 0,
  },
  // Mid swipe zone - between header and scroll content
  midSwipeZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 50,
    marginBottom: 4,
    zIndex: 10,
  },
  midSwipeBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  // Drag Handle - iOS Sheet Style - larger hit area for swipe
  dragHandle: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 50,
    zIndex: 10,
    minHeight: 40, // Larger touch area for easier swiping
  },
  dragHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  emojiCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle inner shadow effect
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  emoji: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 14, letterSpacing: -0.5 },
  content: { paddingVertical: 28, alignItems: 'center' },
  subtitle: { fontSize: 15, marginBottom: 20, textAlign: 'right', fontWeight: '500' },
  label: { fontSize: 15, fontWeight: '600', textAlign: 'right', marginBottom: 16 },

  // Date Picker Button - Minimal
  foodTabsScroll: { marginBottom: 16 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
  datePickerBtnText: { fontSize: 13, fontWeight: '600', color: '#8E8E93' },

  // Calendar Modal - Minimal
  calendarModal: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calendarOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calendarInlineOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  calendarInlineBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  calendarCard: { borderRadius: 20, padding: 20, width: '90%', maxWidth: 350, backgroundColor: theme.card, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 0, zIndex: 1001 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarMonthText: { fontSize: 16, fontWeight: '600' },
  calendarNavBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  calendarWeekRow: { flexDirection: 'row-reverse', marginBottom: 8 },
  calendarWeekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  calendarDaysGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 14, fontWeight: '500' },
  calendarDayToday: { borderRadius: 20 },
  calendarDaySelected: { borderRadius: 20 },
  calendarDaySelectedText: {},
  calendarDayDisabled: { opacity: 0.3 },

  // Food Tabs - Segmented Control Style
  foodTabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 0,
    gap: 0,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 14,
    padding: 4,
  },
  foodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  activeFoodTab: {
    // backgroundColor will be set inline using theme.card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 0,
  },
  foodTabIconContainer: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
  foodTabText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeFoodTabText: {
    fontWeight: '700',
  },
  // Premium Food Tabs (kept for backward compatibility)
  premiumFoodTabs: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  premiumFoodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginHorizontal: 5,
  },
  premiumFoodTabActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
    borderWidth: 1.5,
  },
  premiumFoodTabIconContainer: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  premiumFoodTabText: {
    fontSize: 11,
    color: theme.textTertiary,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  premiumFoodTabTextActive: {
    color: theme.card,
    fontWeight: '700',
  },
  premiumFoodTabTimer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9B4A65',
  },
  premiumFoodTabTimerActive: {
    color: theme.card,
  },

  // Premium Date Picker
  premiumDatePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 20,
  },
  premiumDatePickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Bottle/Pumping
  bottleContainer: { width: '100%' },
  inputWrapper: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bigInput: { fontSize: 48, fontWeight: 'bold', color: theme.textPrimary, borderBottomWidth: 2, borderBottomColor: theme.border, width: 120, textAlign: 'center' },
  unitText: { fontSize: 18, color: theme.textSecondary, marginBottom: 12 },

  // Amount Row with +/- buttons
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 12 },
  amountBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.cardSecondary, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  amountDisplay: { alignItems: 'center' },
  amountValue: { fontSize: 36, fontWeight: '700', color: theme.textPrimary },
  amountUnit: { fontSize: 14, color: theme.textTertiary, marginTop: 2 },

  presets: { flexDirection: 'row', gap: 10, marginTop: 20 },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.cardSecondary, borderRadius: 12 },
  presetBtnActive: { backgroundColor: '#1C1C1E' },
  presetText: { fontWeight: '600', color: '#4B5563' },
  presetTextActive: { color: theme.card },

  // Breastfeeding - Minimalist Style like Sleep
  breastContainer: { alignItems: 'center', paddingHorizontal: 16 },
  breastTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  breastTimeCard: { flex: 1, alignItems: 'center', backgroundColor: theme.cardSecondary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border },
  breastTimeCardActive: { backgroundColor: '#9B4A65', borderColor: '#9B4A65' },
  breastTimeLabel: { fontSize: 12, color: theme.textTertiary, fontWeight: '600', marginBottom: 8 },
  breastTimeValue: { fontSize: 32, fontWeight: '300', color: theme.textPrimary, letterSpacing: -1 },
  breastTimeValueActive: { color: theme.card },
  breastPlayBtn: { marginTop: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center' },
  breastPlayBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  breastArrow: { fontSize: 20, color: theme.textTertiary, marginHorizontal: 4 },
  breastTotalLabel: { marginTop: 12, fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  sleepTimeInput: { fontSize: 32, fontWeight: '300', color: theme.textPrimary, letterSpacing: -1, minWidth: 80, paddingVertical: 4 },

  // Pumping Timer - Premium Card
  pumpingTimerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.cardSecondary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, marginBottom: 24 },
  pumpingTimerBtnActive: { backgroundColor: '#9B4A65' },
  pumpingTimerText: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  premiumPumpingCard: { alignItems: 'center', alignSelf: 'center', backgroundColor: theme.cardSecondary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  premiumPumpingCardActive: { backgroundColor: '#9B4A65', borderColor: '#9B4A65' },
  premiumPumpingLabel: { fontSize: 11, color: theme.textTertiary, marginBottom: 4, fontWeight: '600', letterSpacing: 0.3 },
  premiumPumpingLabelActive: { color: 'rgba(255,255,255,0.8)' },
  premiumPumpingTime: { fontSize: 26, fontWeight: '400', color: theme.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  premiumPumpingTimeActive: { color: theme.card },
  premiumPumpingIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center' },
  premiumPumpingIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  // Solids
  solidsContainer: { width: '100%' },
  solidsInput: { width: '100%', backgroundColor: theme.cardSecondary, borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  solidsSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },

  // Sleep (Manual Entry)
  sleepTimerCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.cardSecondary, paddingVertical: 16, paddingHorizontal: 28, borderRadius: 20, marginBottom: 12, alignSelf: 'center' },
  sleepTimerCompactActive: { backgroundColor: '#9B4A65' },
  sleepTimerCompactText: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  sleepTimerPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.card, opacity: 0.8 },
  sleepTimerHint: { fontSize: 12, color: '#9B4A65', textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  sleepDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  sleepDividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  sleepDividerText: { fontSize: 12, color: theme.textTertiary, fontWeight: '500' },
  sleepInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  sleepInputGroup: { alignItems: 'center', gap: 8 },
  sleepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  sleepBtnText: { fontSize: 22, fontWeight: '600', color: '#9B4A65' },
  sleepValueBox: { alignItems: 'center', minWidth: 60 },
  sleepValue: { fontSize: 36, fontWeight: '800', color: theme.textPrimary },
  sleepUnit: { fontSize: 12, color: theme.textTertiary, fontWeight: '600' },
  sleepSeparator: { fontSize: 32, fontWeight: '700', color: theme.border },
  sleepPresets: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  sleepNoteContainer: { marginTop: 16 },
  sleepNoteLabel: { fontSize: 13, fontWeight: '500', textAlign: 'right' },
  sleepNoteInput: { width: '100%', borderRadius: 14, padding: 14, fontSize: 14, textAlign: 'right', borderWidth: 1, minHeight: 60 },

  // New Modern Sleep UI
  sleepModeRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 4, marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 14, padding: 4 },
  sleepModeBtn: { flex: 1, flexDirection: 'column', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10 },
  sleepModeBtnActive: { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : theme.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 0 },
  sleepModeText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  sleepModeTextActive: { fontWeight: '600' },

  sleepTimerSection: { alignItems: 'center', marginVertical: 20 },
  sleepTimerCard: { alignItems: 'center', backgroundColor: theme.cardSecondary, paddingVertical: 24, paddingHorizontal: 52, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  sleepTimerCardActive: { backgroundColor: '#9B4A65', borderColor: '#9B4A65' },
  sleepTimerValue: { fontSize: 48, fontWeight: '200', color: '#1C1C1E', letterSpacing: -2 },
  sleepTimerValueActive: { color: theme.card },
  sleepTimerPlayBtn: { marginTop: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  sleepTimerPlayBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)' },

  sleepDurationSection: { marginVertical: 16 },
  sleepDurationRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sleepDurationItem: { alignItems: 'center' },
  sleepDurationLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginBottom: 8, letterSpacing: 0.2 },
  sleepDurationSeparator: { fontSize: 28, fontWeight: '300', color: '#C7C7CC' },

  sleepSlider: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4 },
  sleepSliderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 0 },
  sleepSliderBtnText: { fontSize: 20, fontWeight: '400', color: '#1C1C1E' },
  sleepSliderValue: { fontSize: 34, fontWeight: '700', color: '#1C1C1E', minWidth: 54, textAlign: 'center', letterSpacing: -1 },

  // Apple-style Time Picker
  appleTimeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginVertical: 16 },
  appleTimeItem: { alignItems: 'center' },
  appleTimeLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 6, fontWeight: '500' },
  appleTimeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  appleTimeDigit: { fontSize: 22, fontWeight: '600', color: '#1C1C1E', minWidth: 28, textAlign: 'center' },
  appleTimeColon: { fontSize: 22, fontWeight: '600', color: '#1C1C1E', marginHorizontal: 2 },
  appleTimeArrow: { fontSize: 16, color: '#C7C7CC' },

  // Premium Time Picker - Glass Cards
  premiumTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  premiumTimeCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  premiumTimeLabel: {
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  premiumTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  premiumTimeDigit: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -1,
  },
  premiumTimeArrowContainer: {
    paddingHorizontal: 8
  },
  premiumTimeArrow: {
    fontSize: 16,
    fontWeight: '300'
  },

  // Premium Bottle
  premiumBottleContainer: {
    width: '100%',
    marginBottom: 24,
  },
  premiumLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  premiumAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  premiumAmountBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 0,
  },
  premiumAmountDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  premiumAmountValue: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  premiumAmountUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },

  // Premium Breast
  premiumBreastContainer: {
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  premiumBreastTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  premiumBreastTimeCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  premiumBreastTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  premiumBreastTimeValue: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: -1.5,
    marginBottom: 12,
  },
  premiumBreastPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBreastArrow: {
    fontSize: 18,
    marginHorizontal: 4,
  },
  premiumBreastTotalLabel: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    opacity: 0.7,
  },

  // Premium Pumping
  premiumPumpingRowContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
    alignItems: 'stretch',
  },
  premiumPumpingTimerCard: {
    flex: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  premiumPumpingTimerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  premiumPumpingTimerValue: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -1,
    marginBottom: 10,
  },
  premiumPumpingTimerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPumpingAmountSection: {
    flex: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumPumpingAmountLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  premiumPumpingAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  premiumPumpingAmountBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 0,
  },
  premiumPumpingAmountDisplay: {
    alignItems: 'center',
    minWidth: 70,
  },
  premiumPumpingAmountValue: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -1.5,
  },
  premiumPumpingAmountUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },

  // Premium Solids
  premiumSolidsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  premiumSolidsInputContainer: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  premiumSolidsInput: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 24,
  },

  // Premium Notes
  premiumNoteContainer: {
    width: '100%',
    marginTop: 8,
  },
  premiumNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  premiumNoteInputContainer: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    minHeight: 80,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 0,
  },
  premiumNoteInput: {
    fontSize: 14,
    fontWeight: '400',
    minHeight: 48,
    textAlignVertical: 'top',
  },

  sleepTimeRangeSection: { marginVertical: 16 },
  timeRangeRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12 },
  timeRangeItem: { flex: 1, alignItems: 'center' },
  timeRangeLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  timeRangeInput: { width: '100%', backgroundColor: theme.cardSecondary, borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', borderWidth: 1, borderColor: theme.border, color: theme.textPrimary },
  timeRangeArrow: { fontSize: 24, color: theme.textTertiary, marginTop: 24 },
  timeRangeHint: { fontSize: 11, color: theme.textTertiary, textAlign: 'center', marginTop: 12 },

  sleepTimerNote: { backgroundColor: 'rgba(52,199,89,0.08)', padding: 12, borderRadius: 12, marginTop: 20 },
  sleepTimerNoteText: { fontSize: 14, color: '#C8806A', fontWeight: '600', textAlign: 'center' },

  // Legacy Sleep Timer (keep for compatibility)
  timerCircle: { marginVertical: 20 },
  timerCircleActive: {},
  timerGradient: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  timerBigText: { fontSize: 36, fontWeight: 'bold', color: theme.textPrimary },
  timerHint: { fontSize: 14, color: theme.textTertiary, textAlign: 'center' },
  persistHint: { fontSize: 12, color: '#C8806A', textAlign: 'center', marginTop: 12, fontWeight: '600' },

  // Diaper
  diaperOptions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 16 },
  diaperBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderRadius: 18, borderWidth: 1.5 },
  diaperBtnText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  diaperNoteInput: { width: '100%', borderRadius: 14, padding: 14, fontSize: 14, textAlign: 'right', marginTop: 20, borderWidth: 1 },

  // Save - Premium Full Width
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 32,
    borderRadius: 18,
    marginTop: 20,
    backgroundColor: '#C8806A',
    shadowColor: '#C8806A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 0,
  },
  saveBtnText: { color: theme.card, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },

  // Time Picker Overlay - Premium Design
  timePickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  timePickerContainer: { backgroundColor: theme.card, borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, width: '90%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 0 },
  timePickerDoneBtn: { marginTop: 20, paddingHorizontal: 40, paddingVertical: 12, backgroundColor: theme.primary, borderRadius: 24, width: 'auto', minWidth: 140, alignItems: 'center' },
  timePickerDoneBtnText: { color: theme.card, fontSize: 17, fontWeight: '600' },

  // Pumping Row Layout (Timer + Amount side by side)
  pumpingRowContainer: { flexDirection: 'row', gap: 12, marginTop: 16, paddingHorizontal: 8, alignItems: 'stretch' },
  pumpingTimerCard: { flex: 1, backgroundColor: theme.cardSecondary, borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  pumpingTimerCardActive: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: '#F59E0B' },
  pumpingTimerLabel: { fontSize: 11, color: theme.textTertiary, fontWeight: '600', marginBottom: 4 },
  pumpingTimerLabelActive: { color: '#F59E0B' },
  pumpingTimerValue: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, marginBottom: 6 },
  pumpingTimerValueActive: { color: '#F59E0B' },
  pumpingTimerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  pumpingTimerIconActive: { backgroundColor: '#F59E0B' },
  pumpingAmountSection: { flex: 1, alignItems: 'center' },
  pumpingAmountLabel: { fontSize: 11, color: theme.textTertiary, fontWeight: '600', marginBottom: 8 },
  pumpingAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pumpingAmountBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  pumpingAmountDisplay: { alignItems: 'center' },
  pumpingAmountValue: { fontSize: 28, fontWeight: '700', color: theme.textPrimary },
  pumpingAmountUnit: { fontSize: 11, color: theme.textTertiary, fontWeight: '600' },

  // Pumping - Small Timer (left side)
  pumpingTimerCardSmall: { flex: 0.35, backgroundColor: theme.cardSecondary, borderRadius: 14, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  pumpingTimerLabelSmall: { fontSize: 10, color: theme.textTertiary, fontWeight: '600', marginBottom: 2 },
  pumpingTimerValueSmall: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
  pumpingTimerIconSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' },

  // Pumping - Large Amount (right side)
  pumpingAmountSectionLarge: { flex: 0.65, alignItems: 'center', justifyContent: 'center' },
  pumpingAmountLabelLarge: { fontSize: 12, color: theme.textTertiary, fontWeight: '600', marginBottom: 10 },
  pumpingAmountRowLarge: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pumpingAmountBtnLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  pumpingAmountDisplayLarge: { alignItems: 'center', minWidth: 60 },
  pumpingAmountValueLarge: { fontSize: 36, fontWeight: '700', color: theme.textPrimary },
  pumpingAmountUnitLarge: { fontSize: 12, color: theme.textTertiary, fontWeight: '600' },

  // Duration Display
  durationContainer: { alignItems: 'center', marginBottom: 24, marginTop: -12 },
  durationPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  durationText: { fontSize: 15, fontWeight: '600' },

  // Mode Toggle (for food timerange)
  modeToggleContainer: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  modeToggleBtnActive: {
    borderColor: 'transparent',
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeToggleTextActive: {
    color: theme.card,
  },
});