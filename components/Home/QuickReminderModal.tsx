import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    PanResponder,
    Animated as RNAnimated,
    Dimensions,
    Alert,
    KeyboardAvoidingView,
    Switch,
} from 'react-native';
import {
    X, Bell, Clock, Calendar, Check, Trash2, List, Plus,
    Pill, Stethoscope, Sparkles, Zap, Moon, Sun
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { notificationService } from '../../services/notificationService';
import { logger } from '../../utils/logger';
import ScrollFadeWrapper from '../Common/ScrollFadeWrapper';
import DiaperIcon from '../Common/DiaperIcon';
import BottleIcon from '../Common/BottleIcon';
import Reanimated, {
    FadeInDown,
    FadeInUp,
    useSharedValue,
    withRepeat,
    withTiming,
    withSequence,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

// Android wheel picker for time selection (matches TrackingModal style)
const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_PICKER_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

const ReminderWheelPicker = ({
  values,
  selectedValue,
  onValueChange,
  label,
  theme,
}: {
  values: number[];
  selectedValue: number;
  onValueChange: (v: number) => void;
  label: string;
  theme: any;
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(values.indexOf(selectedValue));

  useEffect(() => {
    const idx = values.indexOf(selectedValue);
    if (idx >= 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * WHEEL_ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, []);

  const handleMomentumEnd = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / WHEEL_ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(idx, values.length - 1));
    setCurrentIndex(clampedIdx);
    onValueChange(values[clampedIdx]);
    scrollRef.current?.scrollTo({ y: clampedIdx * WHEEL_ITEM_HEIGHT, animated: true });
  };

  return (
    <View style={{ alignItems: 'center', width: 80 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 4 }}>{label}</Text>
      <View style={{ height: WHEEL_PICKER_HEIGHT, overflow: 'hidden', width: 70 }}>
        <View pointerEvents="none" style={{
          position: 'absolute',
          top: WHEEL_ITEM_HEIGHT * 2,
          left: 0,
          right: 0,
          height: WHEEL_ITEM_HEIGHT,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.primary || '#C4956A',
          zIndex: 10,
        }} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleMomentumEnd}
          contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * 2 }}
        >
          {values.map((v, i) => (
            <View key={v} style={{ height: WHEEL_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{
                fontSize: currentIndex === i ? 22 : 17,
                fontWeight: currentIndex === i ? '700' : '400',
                color: currentIndex === i ? theme.textPrimary : (theme.textSecondary + '80'),
              }}>
                {v}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const ReminderAndroidTimePicker = ({
  value,
  onConfirm,
  theme,
  t,
}: {
  value: Date;
  onConfirm: (date: Date) => void;
  theme: any;
  t: any;
}) => {
  const [hours, setHours] = useState(value.getHours());
  const [minutes, setMinutes] = useState(value.getMinutes());
  const hoursArr = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutesArr = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.cardBackground || '#F5F5F5',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 8,
      }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary }}>
          {`${t('tracking.minutes')}' ${minutes}   ${t('tracking.hours')} ${hours}`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 20 }}>
        <ReminderWheelPicker
          values={hoursArr}
          selectedValue={hours}
          onValueChange={setHours}
          label={t('tracking.hours')}
          theme={theme}
        />
        <ReminderWheelPicker
          values={minutesArr}
          selectedValue={minutes}
          onValueChange={setMinutes}
          label={t('tracking.minutes')}
          theme={theme}
        />
      </View>
      <TouchableOpacity
        style={{ marginTop: 12, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 24, minWidth: 140, alignItems: 'center', backgroundColor: theme.primary }}
        onPress={() => {
          const d = new Date(value);
          d.setHours(hours, minutes, 0, 0);
          onConfirm(d);
        }}
      >
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{t('common.done')}</Text>
      </TouchableOpacity>
    </View>
  );
};

interface QuickReminderModalProps {
    visible: boolean;
    onClose: () => void;
}

type ReminderType = 'once' | 'daily' | 'weekly';
type ViewMode = 'create' | 'list';

interface ReminderItem {
    id: string;
    title: string;
    body: string;
    trigger: any;
    date?: Date;
    repeat?: 'daily' | 'weekly';
}

export default function QuickReminderModal({ visible, onClose }: QuickReminderModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [message, setMessage] = useState('');
    const [reminderType, setReminderType] = useState<ReminderType>('once');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [addToCalendar, setAddToCalendar] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reminders, setReminders] = useState<ReminderItem[]>([]);
    const [loadingReminders, setLoadingReminders] = useState(false);

    // Slide Animation (RN Animated for PanResponder)
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

    // Bell icon animations
    const bellIconPulse = useSharedValue(0);
    const bellIconBounce = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            RNAnimated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();

            bellIconPulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
            bellIconBounce.value = withRepeat(
                withSequence(
                    withTiming(1.12, { duration: 300 }),
                    withTiming(0.94, { duration: 200 }),
                    withTiming(1.05, { duration: 150 }),
                    withTiming(1, { duration: 150 }),
                    withTiming(1, { duration: 2200 }),
                ),
                -1,
                false
            );

            loadReminders();
            resetForm();
        } else {
            bellIconPulse.value = 0;
            bellIconBounce.value = 1;
        }
    }, [visible]);

    const resetForm = () => {
        setViewMode('list');
        setMessage('');
        setReminderType('once');
        setSelectedDate(new Date());
        setAddToCalendar(false);
    };

    const loadReminders = async () => {
        setLoadingReminders(true);
        try {
            const data = await notificationService.getCustomReminders();
            setReminders(data);
        } catch (error) {
            logger.error('Failed to load reminders:', error);
        } finally {
            setLoadingReminders(false);
        }
    };

    // Pan Responder for Dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const { dy, dx } = gestureState;
            return dy > 10 && Math.abs(dy) > Math.abs(dx);
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnim.setValue(gestureState.dy);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 120 || gestureState.vy > 0.5) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                RNAnimated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }).start(onClose);
            } else {
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }).start();
            }
        },
    }), [onClose]);

    // Helpers
    const getReminderDateTime = (): Date => {
        return selectedDate;
    };

    const handleSave = async () => {
        if (!message.trim()) return;

        setSaving(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            // Ensure notifications are enabled before saving
            if (!notificationService.getSettings().enabled) {
                await notificationService.saveSettings({ enabled: true });
            }

            // Request notification permissions
            const hasPermission = await notificationService.requestPermissions();
            if (!hasPermission) {
                Alert.alert(
                    'התראות כבויות',
                    'יש לאפשר התראות בהגדרות המכשיר כדי לקבל תזכורות',
                    [{ text: 'הבנתי' }]
                );
                setSaving(false);
                return;
            }

            let date = getReminderDateTime();
            const now = new Date();

            // If date is in the past or very close to now, add a buffer
            if (date.getTime() <= now.getTime()) {
                if (now.getTime() - date.getTime() < 120000) {
                    // Within 2 minutes — bump to 10 seconds from now
                    date = new Date(now.getTime() + 10000);
                } else if (reminderType === 'once') {
                    Alert.alert(t('common.error'), 'לא ניתן לקבוע תזכורת לעבר');
                    setSaving(false);
                    return;
                }
            }

            if (reminderType === 'once') {
                const result = await notificationService.createCustomReminder({
                    title: 'תזכורת',
                    body: message.trim(),
                    date: date,
                });

                if (addToCalendar && result) {
                    try {
                        const calendarSuccess = await notificationService.addToCalendar(
                            'תזכורת: ' + message.trim(),
                            date,
                            'נוצר באפליקציית Calmino'
                        );

                        if (calendarSuccess) {
                            Alert.alert('נשמר!', 'התזכורת נשמרה באפליקציה וביומן');
                        } else {
                            Alert.alert('נשמר', 'התזכורת נשמרה באפליקציה, אך השמירה ביומן נכשלה');
                        }

                        setViewMode('list');
                        loadReminders();
                        setMessage('');
                        setAddToCalendar(false);
                        setSaving(false);
                        return;
                    } catch (calError) {
                        logger.error('Calendar add error', calError);
                    }
                }
            } else {
                if (reminderType === 'daily') {
                    await notificationService.createRecurringReminder({
                        title: 'תזכורת יומית',
                        body: message.trim(),
                        hour: date.getHours(),
                        minute: date.getMinutes(),
                        repeat: 'daily',
                    });
                } else {
                    await notificationService.createRecurringReminder({
                        title: 'תזכורת שבועית',
                        body: message.trim(),
                        hour: date.getHours(),
                        minute: date.getMinutes(),
                        repeat: 'weekly',
                        weekday: date.getDay(),
                    });
                }
            }

            setViewMode('list');
            loadReminders();
            setMessage('');
            setAddToCalendar(false);
            Alert.alert('נשמר!', 'התזכורת הוגדרה בהצלחה');
        } catch (e: any) {
            logger.error('Failed to save reminder', e);
            if (e?.message?.includes('disabled')) {
                Alert.alert('התראות כבויות', 'יש לאפשר התראות בהגדרות כדי ליצור תזכורות');
            } else {
                Alert.alert(t('common.error'), 'לא ניתן לשמור את התזכורת. נסה שוב.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        Alert.alert(t('common.delete'), 'למחוק תזכורת זו?', [
            { text: t('common.cancel'), style: 'cancel' },
            {
                text: t('timeline.delete'),
                style: 'destructive',
                onPress: async () => {
                    await notificationService.cancelReminder(id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    loadReminders();
                }
            }
        ]);
    };

    // Quick Time presets
    const addTime = (minutes: number) => {
        const newDate = new Date();
        newDate.setMinutes(newDate.getMinutes() + minutes);
        setSelectedDate(newDate);
        Haptics.selectionAsync();
    };

    const setTimeForTomorrow = (hour: number) => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + 1);
        newDate.setHours(hour, 0, 0, 0);
        setSelectedDate(newDate);
        Haptics.selectionAsync();
    };

    const bellIconPulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(bellIconPulse.value, [0, 1], [0.4, 0]),
        transform: [{ scale: interpolate(bellIconPulse.value, [0, 1], [1, 1.7]) }],
    }));

    const bellIconBounceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bellIconBounce.value }],
    }));

    // Minimalist Theme Colors
    const primaryColor = theme.primary;
    const borderColor = isDarkMode ? '#333' : '#E5E7EB';

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            {/* Backdrop */}
            <View style={styles.backdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </TouchableOpacity>

                {/* Main Sheet */}
                <RNAnimatedView
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: isDarkMode ? '#121212' : '#FFFFFF'
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        {/* Centered icon + title */}
                        <View style={styles.headerCenter}>
                            <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                <Reanimated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: isDarkMode ? '#E5E7EB' : '#1C1C1E' }, bellIconPulseStyle]} />
                                <View style={[styles.headerIconBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                    <Reanimated.View style={bellIconBounceStyle}>
                                        <Bell size={24} color={isDarkMode ? '#E5E7EB' : '#1C1C1E'} />
                                    </Reanimated.View>
                                </View>
                            </View>
                            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                                {viewMode === 'list' ? 'התזכורות שלי' : 'תזכורת חדשה'}
                            </Text>
                        </View>

                        {/* Action button - absolute left */}
                        <View style={styles.headerActionBtn}>
                            {viewMode === 'list' ? (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: isDarkMode ? '#222' : '#F3F4F6' }]}
                                    onPress={() => {
                                        setViewMode('create');
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Plus size={24} color={theme.textPrimary} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: isDarkMode ? '#222' : '#F3F4F6' }]}
                                    onPress={() => {
                                        setViewMode('list');
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <List size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>


                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {viewMode === 'list' ? (
                            reminders.length === 0 ? (
                                <Reanimated.View entering={FadeInDown.delay(200)} style={styles.emptyState}>
                                    <View style={[styles.emptyIconWrapper, { backgroundColor: isDarkMode ? '#222' : '#F9FAFB' }]}>
                                        <Bell size={48} color={theme.textTertiary} />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>אין תזכורות עדיין</Text>
                                    <Text style={[styles.emptySub, { color: theme.textTertiary }]}>מתי תרצה שנזכיר לך משהו?</Text>

                                    <TouchableOpacity
                                        style={[styles.createFirstBtn, { backgroundColor: theme.primary }]}
                                        onPress={() => setViewMode('create')}
                                    >
                                        <Text style={styles.createFirstText}>צור תזכורת ראשונה</Text>
                                    </TouchableOpacity>
                                </Reanimated.View>
                            ) : (
                                reminders.map((item, index) => {
                                    const renderLeftActions = (_progress: any, dragX: any) => {
                                        const scale = dragX.interpolate({
                                            inputRange: [0, 100],
                                            outputRange: [0, 1],
                                            extrapolate: 'clamp',
                                        });

                                        return (
                                            <TouchableOpacity
                                                style={styles.swipeDeleteButton}
                                                onPress={() => handleDelete(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <RNAnimated.View style={{ transform: [{ scale }] }}>
                                                    <View style={styles.deleteIconCircle}>
                                                        <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
                                                    </View>
                                                </RNAnimated.View>
                                            </TouchableOpacity>
                                        );
                                    };

                                    return (
                                        <Reanimated.View
                                            key={item.id}
                                            entering={FadeInDown.delay(index * 100).springify()}
                                        >
                                            <Swipeable
                                                renderLeftActions={renderLeftActions}
                                                overshootLeft={false}
                                                leftThreshold={40}
                                            >
                                                <View style={[styles.reminderCard, {
                                                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                                                    borderColor: borderColor,
                                                    shadowColor: theme.shadow,
                                                    shadowOpacity: isDarkMode ? 0.3 : 0.08,
                                                }]}>
                                                    <View style={[styles.reminderIconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#F3F4F6' }]}>
                                                        <Bell size={18} color={theme.primary} strokeWidth={2.5} />
                                                    </View>
                                                    <View style={styles.reminderInfo}>
                                                        <Text style={[styles.reminderCardBody, { color: theme.textPrimary }]}>{item.body}</Text>
                                                        <View style={styles.reminderMeta}>
                                                            <Clock size={12} color={theme.textTertiary} strokeWidth={2} />
                                                            <Text style={[styles.reminderTime, { color: theme.textTertiary }]}>
                                                                {item.date ? new Date(item.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            </Swipeable>
                                        </Reanimated.View>
                                    );
                                })
                            )
                        ) : (
                            // Create Mode
                            <View>
                                {/* Presets - Premium Slider Design */}
                                <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>מה להזכיר?</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.presetsScroll}
                                    contentContainerStyle={styles.presetsContainer}
                                    decelerationRate="fast"
                                    snapToInterval={122}
                                    snapToAlignment="end"
                                >
                                    {[
                                        { label: t('tracking.bottle'), icon: BottleIcon, color: '#60A5FA' },
                                        { label: t('tracking.diapers'), icon: DiaperIcon, color: '#34D399' },
                                        { label: t('health.medicine'), icon: Pill, color: '#F472B6' },
                                        { label: 'רופא', icon: Stethoscope, color: '#A78BFA' },
                                        { label: 'לישון', icon: Moon, color: '#818CF8' },
                                    ].map((p, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.premiumSlider,
                                                message === p.label && [styles.premiumSliderActive, {
                                                    backgroundColor: p.color + '15',
                                                    borderColor: p.color
                                                }],
                                                message !== p.label && {
                                                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                                                    borderColor: isDarkMode ? '#333' : '#E5E7EB'
                                                }
                                            ]}
                                            onPress={() => {
                                                setMessage(p.label);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.sliderIconWrapper,
                                                message === p.label && { backgroundColor: p.color + '20' }
                                            ]}>
                                                <p.icon
                                                    size={20}
                                                    color={message === p.label ? p.color : theme.textSecondary}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.sliderLabel,
                                                { color: message === p.label ? (isDarkMode ? '#FFF' : p.color) : theme.textPrimary }
                                            ]}>
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Custom Input - Integrated Design */}
                                <View style={[styles.customInputWrapper, {
                                    backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                                    borderColor: message && ![' בקבוק', t('tracking.diapers'), t('health.medicine'), 'רופא', 'לישון'].includes(message)
                                        ? theme.primary
                                        : (isDarkMode ? '#333' : '#E5E7EB')
                                }]}>
                                    <Sparkles
                                        size={18}
                                        color={message && ![' בקבוק', t('tracking.diapers'), t('health.medicine'), 'רופא', 'לישון'].includes(message) ? theme.primary : theme.textTertiary}
                                    />
                                    <TextInput
                                        style={[styles.customInput, { color: theme.textPrimary }]}
                                        placeholder="או רשום משהו אחר..."
                                        placeholderTextColor={theme.textTertiary}
                                        value={message}
                                        onChangeText={setMessage}
                                        textAlign="right"
                                        onFocus={() => Haptics.selectionAsync()}
                                    />
                                </View>

                                {/* Time Selection - Ultra Minimalist */}
                                <Text style={[styles.minimalLabel, { color: theme.textTertiary }]}>מתי?</Text>




                                {/* Date & Time Selection - Split Row */}
                                <View style={styles.dateTimeRow}>
                                    {/* Date Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.dateTimeButton,
                                            showDatePicker && styles.dateTimeButtonActive,
                                            { backgroundColor: isDarkMode ? '#1A1A1A' : '#FAFAFA' }
                                        ]}
                                        onPress={() => {
                                            setShowDatePicker(!showDatePicker);
                                            setShowTimePicker(false);
                                            Haptics.selectionAsync();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Calendar size={20} color={showDatePicker ? theme.primary : theme.textSecondary} />
                                        <Text style={[
                                            styles.dateTimeButtonText,
                                            { color: showDatePicker ? theme.primary : theme.textPrimary }
                                        ]}>
                                            {selectedDate.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Time Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.dateTimeButton,
                                            showTimePicker && styles.dateTimeButtonActive,
                                            { backgroundColor: isDarkMode ? '#1A1A1A' : '#FAFAFA' }
                                        ]}
                                        onPress={() => {
                                            setShowTimePicker(!showTimePicker);
                                            setShowDatePicker(false);
                                            Haptics.selectionAsync();
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Clock size={20} color={showTimePicker ? theme.primary : theme.textSecondary} />
                                        <Text style={[
                                            styles.dateTimeButtonText,
                                            { color: showTimePicker ? theme.primary : theme.textPrimary }
                                        ]}>
                                            {selectedDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Inline Pickers Expansion */}
                                {showDatePicker && (
                                    <View style={styles.inlinePickerContainer}>
                                        <DateTimePicker
                                            value={selectedDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                            locale="he-IL"
                                            onChange={(e, d) => {
                                                if (Platform.OS === 'android') setShowDatePicker(false);
                                                if (d) {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                                    setSelectedDate(newDate);
                                                }
                                            }}
                                            style={styles.datePickerStyle}
                                            textColor={theme.textPrimary}
                                            accentColor={theme.primary}
                                        />
                                    </View>
                                )}

                                {showTimePicker && (
                                    <View style={styles.inlinePickerContainer}>
                                        {Platform.OS === 'android' ? (
                                            <ReminderAndroidTimePicker
                                                value={selectedDate}
                                                onConfirm={(d) => {
                                                    const newDate = new Date(selectedDate);
                                                    newDate.setHours(d.getHours(), d.getMinutes());
                                                    setSelectedDate(newDate);
                                                    setShowTimePicker(false);
                                                }}
                                                theme={theme}
                                                t={t}
                                            />
                                        ) : (
                                            <DateTimePicker
                                                value={selectedDate}
                                                mode="time"
                                                display="spinner"
                                                is24Hour={true}
                                                locale="he-IL"
                                                onChange={(e, d) => {
                                                    if (d) {
                                                        const newDate = new Date(selectedDate);
                                                        newDate.setHours(d.getHours(), d.getMinutes());
                                                        setSelectedDate(newDate);
                                                    }
                                                }}
                                                style={styles.datePickerStyle}
                                                textColor={theme.textPrimary}
                                            />
                                        )}
                                    </View>
                                )}

                                {/* Add to Calendar - Minimalist Toggle */}
                                <TouchableOpacity
                                    style={[styles.minimalCalendarRow, {
                                        backgroundColor: addToCalendar
                                            ? (isDarkMode ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)')
                                            : (isDarkMode ? '#1A1A1A' : '#FAFAFA')
                                    }]}
                                    onPress={() => {
                                        setAddToCalendar(!addToCalendar);
                                        Haptics.selectionAsync();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.calendarCheckbox, {
                                        backgroundColor: addToCalendar ? theme.primary : 'transparent',
                                        borderColor: addToCalendar ? theme.primary : (isDarkMode ? '#333' : '#D1D5DB')
                                    }]}>
                                        {addToCalendar && <Check size={14} color="#FFF" strokeWidth={3} />}
                                    </View>
                                    <Text style={[styles.calendarRowText, {
                                        color: addToCalendar ? theme.primary : theme.textSecondary
                                    }]}>
                                        הוסף ליומן
                                    </Text>
                                </TouchableOpacity>

                                {/* Save Button - Ultra Clean */}
                                <TouchableOpacity
                                    style={[
                                        styles.minimalSaveButton,
                                        {
                                            opacity: message ? 1 : 0.4,
                                            backgroundColor: theme.primary
                                        }
                                    ]}
                                    disabled={!message || saving}
                                    onPress={handleSave}
                                    activeOpacity={0.8}
                                >
                                    {saving ? (
                                        <Text style={styles.minimalSaveText}>שומר...</Text>
                                    ) : (
                                        <Text style={styles.minimalSaveText}>{t('common.save')}</Text>
                                    )}
                                </TouchableOpacity>

                            </View>
                        )}
                    </ScrollView>
                </RNAnimatedView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 0,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 20,
        zIndex: 1,
    },
    handle: {
        width: 48,
        height: 5,
        borderRadius: 3,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
        zIndex: 1,
        position: 'relative',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerActionBtn: {
        position: 'absolute',
        left: 24,
        top: 10,
    },
    headerIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Content Content
    content: {
        flex: 1,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'right',
        opacity: 0.6,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyIconWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 15,
        marginBottom: 32,
    },
    createFirstBtn: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 0,
    },
    createFirstText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },

    // List Items - Minimalist with Swipe
    reminderCard: {
        flexDirection: 'row-reverse',
        padding: 16,
        borderRadius: 18,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,
        gap: 14,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 0,
    },
    reminderIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reminderInfo: {
        flex: 1,
    },
    reminderCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'right',
    },
    reminderCardBody: {
        fontSize: 14,
        marginBottom: 6,
        textAlign: 'right',
        fontWeight: '500',
    },
    reminderMeta: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
    },
    reminderTime: {
        fontSize: 11,
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
    },
    swipeDeleteButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        borderRadius: 14,
        marginBottom: 10,
        marginRight: 8,
    },
    deleteIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Create Mode - Premium Sliders
    presetsScroll: {
        marginBottom: 20,
    },
    presetsContainer: {
        paddingHorizontal: 20,
        gap: 12,
        flexDirection: 'row-reverse',
    },
    premiumSlider: {
        width: 110,
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 0,
    },
    premiumSliderActive: {
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 0,
        transform: [{ scale: 1.02 }],
    },
    sliderIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    sliderLabel: {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    customInputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 24,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 0,
    },
    customInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        minHeight: 22,
    },
    // Legacy styles (kept for compatibility)
    presetChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginLeft: 10,
        gap: 8,
    },
    presetText: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputContainer: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 24,
    },
    input: {
        fontSize: 16,
        minHeight: 24,
    },

    // Minimalist Time Selection
    minimalLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    timePresetsScroll: {
        marginBottom: 16,
    },
    timePresetsContainer: {
        gap: 8,
        flexDirection: 'row-reverse',
    },
    minimalTimeChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    minimalTimeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    minimalDatePicker: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        gap: 14,
    },
    dateIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateTextContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    dateMainText: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    dateTimeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    dateTimeRow: {
        flexDirection: 'row-reverse', // RTL
        gap: 12,
        marginBottom: 16,
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    dateTimeButtonActive: {
        borderColor: '#8B5CF6', // Primary color
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
    },
    dateTimeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Heebo-Medium',
    },
    inlinePickerContainer: {
        marginTop: 4,
        marginBottom: 16,
        padding: 8,
        borderRadius: 16,
        backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#fff', // iOS handles inline bg
        alignItems: 'center',
    },
    datePickerStyle: {
        // Adjust width for full container
        width: Platform.OS === 'ios' ? '100%' : undefined,
    },
    // Old styles kept if needed (or can be removed), new ones added above
    minimalCalendarRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    calendarCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calendarRowText: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
        fontFamily: 'Heebo-Medium',
    },
    minimalSaveButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 10,
        marginVertical: 8,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 0,
    },
    minimalSaveText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Heebo-Bold',
    },

    // Legacy Time Selection (kept for compatibility)
    quickTimeGrid: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 20,
    },
    quickTimeBtn: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        gap: 6,
    },
    quickTimeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    datePickerTrigger: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 32,
    },
    dateText: {
        fontSize: 15,
        fontWeight: '600',
    },
    calendarToggle: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    calendarToggleText: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
        textAlign: 'right'
    },
    saveButton: {
        borderRadius: 20,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 0,
        overflow: 'hidden',
    },
    saveContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 12,
    },
    saveText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
});
