import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Animated as RNAnimated, ScrollView, Alert, PanResponder, Dimensions } from 'react-native';
import { X, Check, Droplets, Play, Pause, Baby, Moon, Utensils, Apple, Milk, Plus, Minus, Calendar, ChevronLeft, ChevronRight, Clock, Hourglass, Timer, MessageSquare, Sparkles, Layers } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useSleepTimer } from '../context/SleepTimerContext';
import { useFoodTimer } from '../context/FoodTimerContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withRepeat, interpolate } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

interface TrackingModalProps {
  visible: boolean;
  type: 'food' | 'sleep' | 'diaper' | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void> | void;
}

export default function TrackingModal({ visible, type, onClose, onSave }: TrackingModalProps) {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const foodTimerContext = useFoodTimer();

  // Premium animations
  const glowAnim = useSharedValue(0);
  const sparkleAnim = useSharedValue(0);

  // Get translated TYPE_CONFIG
  const TYPE_CONFIG = {
    food: {
      title: t('tracking.food.title'),
      icon: Utensils,
      accent: '#E5B85C',
      gradient: ['#F59E0B', '#FBBF24', '#FCD34D'],
    },
    sleep: {
      title: t('tracking.sleep.title'),
      icon: Moon,
      accent: '#6366F1',
      gradient: ['#6366F1', '#818CF8', '#A5B4FC'],
    },
    diaper: {
      title: t('tracking.diaper.title'),
      icon: Baby,
      accent: '#10B981',
      gradient: ['#10B981', '#34D399', '#6EE7B7'],
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

  // --- Sleep States (Manual entry) ---
  const [sleepMode, setSleepMode] = useState<'timer' | 'duration' | 'timerange'>('timer');
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(30);
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

  // Save success state for checkmark animation
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Apple-style Animations
  const slideAnim = useRef(new RNAnimated.Value(400)).current;
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;

  // Track if we're dragging and scroll position
  const isDragging = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const dragStartY = useRef(0);

  // Swipe down to dismiss
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
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
      const isDraggingDown = gestureState.dy > 5;
      const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2;
      const isScrollAtTop = scrollOffsetY.current <= 5;

      if (isTopArea && isDraggingDown && isVerticalSwipe && isScrollAtTop) {
        isDragging.current = true;
        dragStartY.current = currentY;
        scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
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
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
  }), [slideAnim, backdropAnim, onClose]);

  useEffect(() => {
    if (visible) {
      setSubType(null);
      setBottleAmount('');
      setPumpingAmount('');
      setSolidsFoodName('');
      setFoodNote('');
      setSleepHours(0);
      setSleepMinutes(30);
      setSleepNote('');
      setDiaperNote('');
      // Reset logic...
      setSleepMode('timer');
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setSleepStartTime(timeStr);
      setSleepEndTime(timeStr);
      setSleepStartTimeDate(new Date(now));
      setSleepEndTimeDate(new Date(now));
      setShowSleepStartPicker(false);
      setShowSleepEndPicker(false);
      setSelectedDate(new Date());
      setFoodMode('normal');
      const nowForFood = new Date();
      setFoodStartTime(new Date(nowForFood));
      setFoodEndTime(new Date(nowForFood));
      setShowFoodStartTimePicker(false);
      setShowFoodEndTimePicker(false);

      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);

      glowAnim.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
      sparkleAnim.value = withRepeat(withTiming(1, { duration: 3000 }), -1, true);

      RNAnimated.parallel([
        RNAnimated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      ]).start();
    } else {
      glowAnim.value = 0;
      sparkleAnim.value = 0;
    }
  }, [visible, slideAnim, backdropAnim, glowAnim, sparkleAnim]);

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0.3, 0.6]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [0.95, 1.05]) }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(sparkleAnim.value, [0, 1], [0, 360])}deg` }],
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
    if (foodTimerContext.breastIsRunning && foodTimerContext.breastActiveSide === side) {
      foodTimerContext.stopBreast();
    } else {
      foodTimerContext.startBreast(side);
    }
  };

  const togglePumpingTimer = () => {
    if (foodTimerContext.pumpingIsRunning) {
      foodTimerContext.stopPumping();
    } else {
      foodTimerContext.startPumping();
    }
  };

  const isPumpingActive = foodTimerContext.pumpingIsRunning;
  const pumpingTimer = foodTimerContext.pumpingElapsedSeconds;

  const isBottleActive = foodTimerContext.bottleIsRunning;
  const bottleTimer = foodTimerContext.bottleElapsedSeconds;

  const toggleBottleTimer = () => {
    if (foodTimerContext.bottleIsRunning) {
      foodTimerContext.stopBottle();
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
    if (!type) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let data: any = { type };

    if (type === 'food') {
      let durationText = '';

      // Handle timerange mode for food
      if (foodMode === 'timerange') {
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
        if (foodMode === 'timerange' && durationText) {
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
        if (sleepContext.isRunning) sleepContext.stop();
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
    }

    // Debug: Log data before saving
    if (type === 'sleep' && sleepMode === 'timerange') {
      console.log('🔵 Sleep timerange data to save:', JSON.stringify({
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

    // Validate that we have required data for timerange mode
    if (type === 'sleep' && sleepMode === 'timerange') {
      if (!data.timestamp) {
        console.error('❌ Missing timestamp');
        Alert.alert(t('common.error'), 'שגיאה: חסר timestamp. נא לנסות שוב.');
        return;
      }
      if (data.duration === undefined || data.duration === null) {
        console.error('❌ Missing duration');
        Alert.alert(t('common.error'), 'שגיאה: חסר duration. נא לנסות שוב.');
        return;
      }
    }

    try {
      // Always log full data for sleep timerange
      if (type === 'sleep' && sleepMode === 'timerange') {
        console.log('🟢 Calling onSave with FULL sleep timerange data:', {
          type: data.type,
          duration: data.duration,
          startTime: data.startTime,
          endTime: data.endTime,
          timestamp: data.timestamp?.toISOString(),
          note: data.note,
          allData: data
        });
      } else {
        console.log('🟢 Calling onSave with data:', { type: data.type, ...data });
      }
      await onSave(data);
      console.log('✅ onSave completed successfully');
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Save failed', error);
      Alert.alert(t('common.error'), t('common.saveFailed'));
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
              <Baby size={20} color={foodType === 'breast' ? theme.primary : theme.textTertiary} strokeWidth={1.5} />
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
            <Milk size={20} color={foodType === 'bottle' ? theme.primary : theme.textTertiary} strokeWidth={1.5} />
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

      {/* Date Picker Button - Minimal */}
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

      {/* Food Mode Toggle - Normal vs Timerange */}
      {/* Hide for solids - timer not relevant */}
      {foodType !== 'solids' && (
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, foodMode === 'normal' && [styles.modeToggleBtnActive, { backgroundColor: theme.primary }]]}
            onPress={() => { setFoodMode('normal'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
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

          <View style={styles.premiumTimeArrowContainer}>
            <Text style={styles.premiumTimeArrow}>→</Text>
          </View>

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
        </View>
      )}

      {/* Duration Display for Food Timerange */}
      {calculatedFoodDuration && (
        <View style={styles.durationContainer}>
          <View style={[styles.durationPill, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7', borderColor: isDarkMode ? '#F59E0B' : '#FCD34D' }]}>
            <Clock size={16} color={theme.primary} strokeWidth={2} />
            <Text style={[styles.durationText, { color: theme.primary }]}>
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
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20 }]}
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
                                if (!isNaN(num) && num >= 0) setBottleAmount(num.toString());
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
                    <Text style={[styles.amountValue, { fontSize: 32 }]}>{bottleAmount || '0'}</Text>
                    <Text style={[styles.amountUnit, { fontSize: 13 }]}>{t('tracking.ml')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20 }]}
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
                    { width: 130, aspectRatio: 1, flex: 0 },
                    isBottleActive && styles.breastTimeCardActive
                  ]}
                  onPress={() => { toggleBottleTimer(); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.breastTimeLabel, isBottleActive && { color: '#fff', opacity: 0.9 }]}>{t('tracking.timer')}</Text>
                  <Text style={[styles.breastTimeValue, isBottleActive && styles.breastTimeValueActive, { fontSize: 28 }]}>
                    {formatTime(bottleTimer)}
                  </Text>
                  <View style={[styles.breastPlayBtn, isBottleActive && styles.breastPlayBtnActive]}>
                    {isBottleActive ? <Pause size={14} color="#fff" /> : <Play size={14} color={theme.primary} style={{ marginLeft: 2 }} />}
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
                style={[styles.breastTimeCard, activeSide === 'left' && styles.breastTimeCardActive]}
                onPress={() => { toggleBreastTimer('left'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              >
                <Text style={styles.breastTimeLabel}>{t('tracking.left')}</Text>
                <Text style={[styles.breastTimeValue, activeSide === 'left' && styles.breastTimeValueActive]}>{formatTime(leftTimer)}</Text>
                <View style={[styles.breastPlayBtn, activeSide === 'left' && styles.breastPlayBtnActive]}>
                  {activeSide === 'left' ? <Pause size={14} color="#fff" /> : <Play size={14} color={theme.primary} />}
                </View>
              </TouchableOpacity>

              {/* Arrow indicator */}
              <Text style={styles.breastArrow}>←</Text>

              {/* Right Breast Card */}
              <TouchableOpacity
                style={[styles.breastTimeCard, activeSide === 'right' && styles.breastTimeCardActive]}
                onPress={() => { toggleBreastTimer('right'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              >
                <Text style={styles.breastTimeLabel}>{t('tracking.right')}</Text>
                <Text style={[styles.breastTimeValue, activeSide === 'right' && styles.breastTimeValueActive]}>{formatTime(rightTimer)}</Text>
                <View style={[styles.breastPlayBtn, activeSide === 'right' && styles.breastPlayBtnActive]}>
                  {activeSide === 'right' ? <Pause size={14} color="#fff" /> : <Play size={14} color={theme.primary} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* Total time display */}
            <Text style={styles.breastTotalLabel}>{t('tracking.total')}: {formatTime(leftTimer + rightTimer)}</Text>
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
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20 }]}
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
                    <Text style={[styles.amountValue, { fontSize: 32 }]}>{pumpingAmount || '0'}</Text>
                    <Text style={[styles.amountUnit, { fontSize: 13 }]}>{t('tracking.ml')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.amountBtn, { width: 40, height: 40, borderRadius: 20 }]}
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
                    { width: 130, aspectRatio: 1, flex: 0 },
                    isPumpingActive && styles.breastTimeCardActive
                  ]}
                  onPress={() => { togglePumpingTimer(); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.breastTimeLabel, isPumpingActive && { color: '#fff', opacity: 0.9 }]}>{t('tracking.timer')}</Text>
                  <Text style={[styles.breastTimeValue, isPumpingActive && styles.breastTimeValueActive, { fontSize: 28 }]}>
                    {formatTime(pumpingTimer)}
                  </Text>
                  <View style={[styles.breastPlayBtn, isPumpingActive && styles.breastPlayBtnActive]}>
                    {isPumpingActive ? <Pause size={14} color="#fff" /> : <Play size={14} color={theme.primary} style={{ marginLeft: 2 }} />}
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
              style={styles.solidsInput}
              placeholder={`${t('tracking.forExample')}: ...`}
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
        <TextInput
          style={styles.sleepNoteInput}
          placeholder={`${t('tracking.example')}: ...`}
          placeholderTextColor={theme.textTertiary}
          value={foodNote}
          onChangeText={setFoodNote}
          textAlign="right"
          multiline
          maxLength={60}
        />
      </View>

      {/* Food Start Time Picker Modal */}
      {showFoodStartTimePicker && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerContainer}>
            <DateTimePicker
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
      {/* Mode Selector - Icons Above Text */}
      <View style={styles.sleepModeRow}>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'timerange' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('timerange'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Clock size={20} color={sleepMode === 'timerange' ? '#fff' : theme.textTertiary} strokeWidth={2} />
          <Text style={[styles.sleepModeText, sleepMode === 'timerange' && styles.sleepModeTextActive]}>{t('tracking.hours')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'duration' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('duration'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Hourglass size={20} color={sleepMode === 'duration' ? '#fff' : theme.textTertiary} strokeWidth={2} />
          <Text style={[styles.sleepModeText, sleepMode === 'duration' && styles.sleepModeTextActive]}>{t('tracking.duration')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sleepModeBtn, sleepMode === 'timer' && styles.sleepModeBtnActive]}
          onPress={() => { setSleepMode('timer'); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Timer size={20} color={sleepMode === 'timer' ? '#fff' : theme.textTertiary} strokeWidth={2} />
          <Text style={[styles.sleepModeText, sleepMode === 'timer' && styles.sleepModeTextActive]}>{t('tracking.timer')}</Text>
        </TouchableOpacity>
      </View>

      {/* Timer Mode - Minimalist */}
      {sleepMode === 'timer' && (
        <View style={styles.sleepTimerSection}>
          <TouchableOpacity
            style={[styles.sleepTimerCard, sleepContext.isRunning && styles.sleepTimerCardActive]}
            onPress={() => {
              if (sleepContext.isRunning) {
                sleepContext.stop();
                const totalMins = Math.floor(sleepContext.elapsedSeconds / 60);
                setSleepHours(Math.floor(totalMins / 60));
                setSleepMinutes(totalMins % 60);
                setSleepMode('duration');
              } else {
                sleepContext.start();
              }
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Text style={[styles.sleepTimerValue, sleepContext.isRunning && styles.sleepTimerValueActive]}>
              {sleepContext.isRunning ? sleepContext.formatTime(sleepContext.elapsedSeconds) : '0:00'}
            </Text>
            <View style={[styles.sleepTimerPlayBtn, sleepContext.isRunning && styles.sleepTimerPlayBtnActive]}>
              {sleepContext.isRunning ? <Pause size={16} color="#fff" /> : <Play size={16} color={theme.primary} />}
            </View>
          </TouchableOpacity>
          <Text style={styles.sleepTimerHint}>
            {sleepContext.isRunning ? t('tracking.pressToStop') : t('tracking.pressToStart')}
          </Text>
        </View>
      )}

      {/* Duration Mode - Modern Sliders */}
      {sleepMode === 'duration' && (
        <View style={styles.sleepDurationSection}>
          <View style={styles.sleepDurationRow}>
            <View style={styles.sleepDurationItem}>
              <Text style={styles.sleepDurationLabel}>שעות</Text>
              <View style={styles.sleepSlider}>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepHours(Math.max(0, sleepHours - 1)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sleepSliderValue}>{sleepHours}</Text>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepHours(Math.min(12, sleepHours + 1)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sleepDurationSeparator}>:</Text>

            <View style={styles.sleepDurationItem}>
              <Text style={styles.sleepDurationLabel}>{t('tracking.minutes')}</Text>
              <View style={styles.sleepSlider}>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepMinutes(Math.max(0, sleepMinutes - 5)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.sleepSliderValue}>{String(sleepMinutes).padStart(2, '0')}</Text>
                <TouchableOpacity style={styles.sleepSliderBtn} onPress={() => { setSleepMinutes(Math.min(55, sleepMinutes + 5)); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Text style={styles.sleepSliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Time Range Mode - DateTimePicker spinner like Food section */}
      {sleepMode === 'timerange' && (
        <>
          <View style={styles.premiumTimeRow}>
            <View style={styles.premiumTimeCard}>
              <Text style={styles.premiumTimeLabel}>סיום</Text>
              <TouchableOpacity
                style={styles.premiumTimeDisplay}
                onPress={() => { setShowSleepEndPicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={styles.premiumTimeDigit}>{sleepEndTime}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.premiumTimeArrowContainer}>
              <Text style={styles.premiumTimeArrow}>→</Text>
            </View>

            <View style={styles.premiumTimeCard}>
              <Text style={styles.premiumTimeLabel}>{t('tracking.start')}</Text>
              <TouchableOpacity
                style={styles.premiumTimeDisplay}
                onPress={() => { setShowSleepStartPicker(true); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={styles.premiumTimeDigit}>{sleepStartTime}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Duration Display */}
          {calculatedDuration && (
            <View style={styles.durationContainer}>
              <View style={[styles.durationPill, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF', borderColor: isDarkMode ? '#6366F1' : '#C7D2FE' }]}>
                <Clock size={16} color={theme.primary} strokeWidth={2} />
                <Text style={[styles.durationText, { color: theme.primary }]}>
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
          <Text style={styles.sleepNoteLabel}>{t('tracking.note')}</Text>
        </View>
        <TextInput
          style={styles.sleepNoteInput}
          placeholder="לדוגמה: ישן עמוק, התעורר פעם אחת..."
          placeholderTextColor={theme.textTertiary}
          value={sleepNote}
          onChangeText={setSleepNote}
          multiline
          numberOfLines={2}
          maxLength={60}
        />
      </View>
    </View>
  );

  // --- Diaper Content ---
  const renderDiaperContent = () => (
    <View style={{ width: '100%' }}>
      <Text style={[styles.subtitle, { textAlign: 'center' }]}>מה היה?</Text>
      <View style={styles.diaperOptions}>
        {[
          { key: 'pee', label: 'רטוב', color: '#3B82F6', icon: Droplets },
          { key: 'poop', label: 'מלוכלך', color: '#D97706', icon: Sparkles },
          { key: 'both', label: 'שניהם', color: '#10B981', icon: Layers },
        ].map(opt => {
          const IconComponent = opt.icon;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.diaperBtn, subType === opt.key && { backgroundColor: opt.color }]}
              onPress={() => {
                setSubType(opt.key);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <IconComponent size={22} color={subType === opt.key ? '#fff' : opt.color} strokeWidth={2} />
              <Text style={[styles.diaperBtnText, subType === opt.key && { color: '#fff' }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.diaperNoteInput}
        placeholder="הערות (אופציונלי)..."
        placeholderTextColor="#9CA3AF"
        onChangeText={(text) => setDiaperNote(text)}
        textAlign="right"
        maxLength={60}
      />
    </View>
  );

  const renderContent = () => {
    if (type === 'food') return renderFoodContent();
    if (type === 'sleep') return renderSleepContent();
    if (type === 'diaper') return renderDiaperContent();
    return null;
  };

  if (!visible || !type) return null;

  const config = TYPE_CONFIG[type];

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <TouchableWithoutFeedback onPress={onClose}>
            <RNAnimatedView style={[styles.backdrop, { opacity: backdropAnim, backgroundColor: theme.modalOverlay }]}>
              {Platform.OS === 'ios' && (
                <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              )}
            </RNAnimatedView>
          </TouchableWithoutFeedback>

          <RNAnimatedView
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                transform: [{ translateY: slideAnim }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            {/* Drag Handle - iOS Sheet Style - Swipeable */}
            <View style={styles.dragHandle} {...panResponder.panHandlers}>
              <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
            </View>

            {/* Header - Clean Solid Background - Also swipeable */}
            <View style={[styles.header, { backgroundColor: theme.card }]} {...panResponder.panHandlers}>
              <View style={[styles.emojiCircle, { backgroundColor: config.accent + '15' }]}>
                {React.createElement(config.icon, { size: 28, color: config.accent, strokeWidth: 2.5 })}
              </View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>{config.title}</Text>
            </View>

            {/* Content - Wrapped in ScrollView */}
            <ScrollView
              ref={scrollViewRef}
              style={{ width: '100%' }}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              scrollEnabled={true}
              onScroll={(e) => {
                scrollOffsetY.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              onScrollBeginDrag={(e) => {
                // If trying to scroll down from top, disable scroll
                if (scrollOffsetY.current <= 0) {
                  const scrollY = e.nativeEvent.contentOffset.y;
                  if (scrollY < 0) {
                    scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                    setTimeout(() => {
                      scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
                    }, 100);
                  }
                }
              }}
            >
              {renderContent()}
            </ScrollView>

            {/* Save Button - Premium Full Width */}
            <TouchableOpacity
              style={[styles.saveBtn, saveSuccess && styles.saveBtnSuccess]}
              onPress={handleSave}
              disabled={saveSuccess}
            >
              <Check size={18} color="#fff" strokeWidth={2.5} />
              <Text style={[styles.saveBtnText, saveSuccess && styles.saveBtnTextSuccess]}>
                {saveSuccess ? 'נשמר!' : 'שמור תיעוד'}
              </Text>
            </TouchableOpacity>

            {/* Calendar Overlay - Inline */}
            {showCalendar && (
              <View style={styles.calendarInlineOverlay}>
                <TouchableOpacity style={styles.calendarInlineBackdrop} activeOpacity={1} onPress={() => setShowCalendar(false)} />
                <View style={styles.calendarCard}>
                  {/* Month Header */}
                  <View style={styles.calendarHeader}>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setSelectedDate(newDate);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <ChevronLeft size={18} color="#374151" strokeWidth={1.5} />
                    </TouchableOpacity>
                    <Text style={styles.calendarMonthText}>
                      {selectedDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity style={styles.calendarNavBtn} onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setSelectedDate(newDate);
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}>
                      <ChevronRight size={18} color="#374151" strokeWidth={1.5} />
                    </TouchableOpacity>
                  </View>

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
                            onPress={() => { if (!isFuture) { setSelectedDate(date); setShowCalendar(false); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                            disabled={isFuture}
                          >
                            <Text style={[styles.calendarDayText, isSelected && styles.calendarDaySelectedText]}>{d}</Text>
                          </TouchableOpacity>
                        );
                      }
                      return days;
                    })()}
                  </View>

                  {/* Today Button */}
                  <TouchableOpacity style={[styles.datePickerBtn, { marginTop: 16, marginBottom: 0 }]} onPress={() => { setSelectedDate(new Date()); setShowCalendar(false); if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <Text style={styles.datePickerBtnText}>{t('tracking.today')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </RNAnimatedView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
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
              <Text style={[styles.datePickerBtnText, { color: theme.primary }]}>היום</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({


  overlay: { flex: 1, justifyContent: 'flex-end' },
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
    elevation: 12,
  },
  // Drag Handle - iOS Sheet Style - larger hit area for swipe
  dragHandle: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 20,
    paddingHorizontal: 50,
    zIndex: 10,
    minHeight: 60, // Larger touch area for easier swiping
  },
  dragHandleBar: {
    width: 36,
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
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  datePickerBtnText: { fontSize: 13, fontWeight: '600' },

  // Calendar Modal - Minimal
  calendarModal: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calendarOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calendarInlineOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  calendarInlineBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  calendarCard: { borderRadius: 20, padding: 20, width: '90%', maxWidth: 350, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10, zIndex: 1001 },
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
    elevation: 2,
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
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
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
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  premiumFoodTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  premiumFoodTabTimer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  premiumFoodTabTimerActive: {
    color: '#fff',
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
  bigInput: { fontSize: 48, fontWeight: 'bold', color: '#1F2937', borderBottomWidth: 2, borderBottomColor: '#E5E7EB', width: 120, textAlign: 'center' },
  unitText: { fontSize: 18, color: '#6B7280', marginBottom: 12 },

  // Amount Row with +/- buttons
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 12 },
  amountBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  amountDisplay: { alignItems: 'center' },
  amountValue: { fontSize: 36, fontWeight: '700', color: '#1F2937' },
  amountUnit: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },

  presets: { flexDirection: 'row', gap: 10, marginTop: 20 },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 12 },
  presetBtnActive: { backgroundColor: '#6366F1' },
  presetText: { fontWeight: '600', color: '#4B5563' },
  presetTextActive: { color: '#fff' },

  // Breastfeeding - Minimalist Style like Sleep
  breastContainer: { alignItems: 'center', paddingHorizontal: 16 },
  breastTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  breastTimeCard: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  breastTimeCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  breastTimeLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },
  breastTimeValue: { fontSize: 32, fontWeight: '300', color: '#1F2937', letterSpacing: -1 },
  breastTimeValueActive: { color: '#fff' },
  breastPlayBtn: { marginTop: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  breastPlayBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  breastArrow: { fontSize: 20, color: '#9CA3AF', marginHorizontal: 4 },
  breastTotalLabel: { marginTop: 12, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sleepTimeInput: { fontSize: 32, fontWeight: '300', color: '#1F2937', letterSpacing: -1, minWidth: 80, paddingVertical: 4 },

  // Pumping Timer - Premium Card
  pumpingTimerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F3F4F6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, marginBottom: 24 },
  pumpingTimerBtnActive: { backgroundColor: '#6366F1' },
  pumpingTimerText: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  premiumPumpingCard: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  premiumPumpingCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  premiumPumpingLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: '600', letterSpacing: 0.3 },
  premiumPumpingLabelActive: { color: 'rgba(255,255,255,0.8)' },
  premiumPumpingTime: { fontSize: 26, fontWeight: '400', color: '#1F2937', letterSpacing: -0.5, marginBottom: 8 },
  premiumPumpingTimeActive: { color: '#fff' },
  premiumPumpingIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  premiumPumpingIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  // Solids
  solidsContainer: { width: '100%' },
  solidsInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  solidsSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },

  // Sleep (Manual Entry)
  sleepTimerCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F3F4F6', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 20, marginBottom: 12, alignSelf: 'center' },
  sleepTimerCompactActive: { backgroundColor: '#6366F1' },
  sleepTimerCompactText: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  sleepTimerPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', opacity: 0.8 },
  sleepTimerHint: { fontSize: 12, color: '#6366F1', textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  sleepDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 },
  sleepDividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  sleepDividerText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  sleepInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  sleepInputGroup: { alignItems: 'center', gap: 8 },
  sleepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  sleepBtnText: { fontSize: 22, fontWeight: '600', color: '#6366F1' },
  sleepValueBox: { alignItems: 'center', minWidth: 60 },
  sleepValue: { fontSize: 36, fontWeight: '800', color: '#1F2937' },
  sleepUnit: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  sleepSeparator: { fontSize: 32, fontWeight: '700', color: '#D1D5DB' },
  sleepPresets: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  sleepNoteContainer: { marginTop: 16 },
  sleepNoteLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', textAlign: 'right' },
  sleepNoteInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, textAlign: 'right', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 60 },

  // New Modern Sleep UI
  sleepModeRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 8, marginBottom: 20, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 },
  sleepModeBtn: { flex: 1, flexDirection: 'column', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 10 },
  sleepModeBtnActive: { backgroundColor: '#6366F1' },
  sleepModeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  sleepModeTextActive: { color: '#fff' },

  sleepTimerSection: { alignItems: 'center', marginVertical: 20 },
  // Minimalist timer card
  sleepTimerCard: { alignItems: 'center', backgroundColor: '#F9FAFB', paddingVertical: 20, paddingHorizontal: 48, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sleepTimerCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  sleepTimerValue: { fontSize: 40, fontWeight: '300', color: '#1F2937', letterSpacing: -1 },
  sleepTimerValueActive: { color: '#fff' },
  sleepTimerPlayBtn: { marginTop: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  sleepTimerPlayBtnActive: { backgroundColor: 'rgba(255,255,255,0.2)' },

  sleepDurationSection: { marginVertical: 16 },
  sleepDurationRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16 },
  sleepDurationItem: { alignItems: 'center' },
  sleepDurationLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  sleepDurationSeparator: { fontSize: 28, fontWeight: '700', color: '#D1D5DB', marginTop: 24 },

  sleepSlider: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 4 },
  sleepSliderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sleepSliderBtnText: { fontSize: 20, fontWeight: '600', color: '#6366F1' },
  sleepSliderValue: { fontSize: 32, fontWeight: '800', color: '#1F2937', minWidth: 50, textAlign: 'center' },

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
    elevation: 3,
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
    elevation: 2,
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
    elevation: 3,
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
    elevation: 3,
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
    elevation: 2,
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
    elevation: 3,
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
    elevation: 3,
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
  timeRangeInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, fontSize: 24, fontWeight: '700', borderWidth: 1, borderColor: '#E5E7EB', color: '#1F2937' },
  timeRangeArrow: { fontSize: 24, color: '#9CA3AF', marginTop: 24 },
  timeRangeHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },

  sleepTimerNote: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginTop: 20 },
  sleepTimerNoteText: { fontSize: 14, color: '#6366F1', fontWeight: '600', textAlign: 'center' },

  // Legacy Sleep Timer (keep for compatibility)
  timerCircle: { marginVertical: 20 },
  timerCircleActive: {},
  timerGradient: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  timerBigText: { fontSize: 36, fontWeight: 'bold', color: '#1F2937' },
  timerHint: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  persistHint: { fontSize: 12, color: '#10B981', textAlign: 'center', marginTop: 12, fontWeight: '600' },

  // Diaper
  diaperOptions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 16 },
  diaperBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, backgroundColor: '#F3F4F6', borderRadius: 16 },
  diaperBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  diaperNoteInput: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 14, textAlign: 'right', marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB' },

  // Save - Premium Full Width
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 20,
    backgroundColor: '#6366F1',
    // Premium shadow
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  saveBtnSuccess: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  saveBtnTextSuccess: { color: '#fff' },

  // Time Picker Overlay - Premium Design
  timePickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  timePickerContainer: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, width: '90%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 },
  timePickerDoneBtn: { marginTop: 20, paddingHorizontal: 48, paddingVertical: 14, backgroundColor: '#6366F1', borderRadius: 14, width: '100%', alignItems: 'center' },
  timePickerDoneBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  // Pumping Row Layout (Timer + Amount side by side)
  pumpingRowContainer: { flexDirection: 'row', gap: 12, marginTop: 16, paddingHorizontal: 8, alignItems: 'stretch' },
  pumpingTimerCard: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pumpingTimerCardActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  pumpingTimerLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  pumpingTimerLabelActive: { color: '#6366F1' },
  pumpingTimerValue: { fontSize: 26, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  pumpingTimerValueActive: { color: '#6366F1' },
  pumpingTimerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  pumpingTimerIconActive: { backgroundColor: '#6366F1' },
  pumpingAmountSection: { flex: 1, alignItems: 'center' },
  pumpingAmountLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 8 },
  pumpingAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pumpingAmountBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  pumpingAmountDisplay: { alignItems: 'center' },
  pumpingAmountValue: { fontSize: 28, fontWeight: '700', color: '#1F2937' },
  pumpingAmountUnit: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  // Pumping - Small Timer (left side)
  pumpingTimerCardSmall: { flex: 0.35, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pumpingTimerLabelSmall: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  pumpingTimerValueSmall: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  pumpingTimerIconSmall: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },

  // Pumping - Large Amount (right side)
  pumpingAmountSectionLarge: { flex: 0.65, alignItems: 'center', justifyContent: 'center' },
  pumpingAmountLabelLarge: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 10 },
  pumpingAmountRowLarge: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pumpingAmountBtnLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  pumpingAmountDisplayLarge: { alignItems: 'center', minWidth: 60 },
  pumpingAmountValueLarge: { fontSize: 36, fontWeight: '700', color: '#1F2937' },
  pumpingAmountUnitLarge: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },

  // Duration Display
  durationContainer: { alignItems: 'center', marginBottom: 24, marginTop: -12 },
  durationPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
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
    color: '#fff',
  },
});