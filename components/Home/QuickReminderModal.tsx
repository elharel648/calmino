// components/Home/QuickReminderModal.tsx - Quick Reminder Creation Modal
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
} from 'react-native';
import { X, Bell, Clock, Calendar, Check, Trash2, List, Plus, ShoppingCart, Baby, Pill, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { notificationService } from '../../services/notificationService';
import { logger } from '../../utils/logger';
import Reanimated, { FadeInDown, useSharedValue, withRepeat, withTiming, useAnimatedStyle, interpolate } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

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
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reminders, setReminders] = useState<ReminderItem[]>([]);
    const [loadingReminders, setLoadingReminders] = useState(false);

    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);

    // Premium animations
    const glowAnim = useSharedValue(0);
    const sparkleAnim = useSharedValue(0);

    // Load reminders when modal opens
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

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            fadeAnim.setValue(0);
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
            // Load reminders and reset form
            loadReminders();
            setViewMode('list');
            setMessage('');
            setReminderType('once');
            setSelectedDate(new Date());
            setSelectedTime(new Date());
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    // Swipe down to dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const isDraggingDown = gestureState.dy > 20;
            const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;

            if (isDraggingDown && isVerticalSwipe && !isDragging.current) {
                isDragging.current = true;
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return true;
            }
            return false;
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnim.setValue(gestureState.dy);
                const opacity = Math.max(0, 1 - (gestureState.dy / 300));
                fadeAnim.setValue(opacity);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            isDragging.current = false;
            const shouldDismiss = gestureState.dy > 100 || gestureState.vy > 0.4;

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
                    RNAnimated.timing(fadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    onClose();
                    slideAnim.setValue(SCREEN_HEIGHT);
                    fadeAnim.setValue(0);
                });
            } else {
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    RNAnimated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        },
        onPanResponderTerminate: () => {
            isDragging.current = false;
            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        },
    }), [onClose, slideAnim, fadeAnim]);

    // Combine date and time
    const getReminderDateTime = (): Date => {
        const date = new Date(selectedDate);
        const time = new Date(selectedTime);
        date.setHours(time.getHours());
        date.setMinutes(time.getMinutes());
        date.setSeconds(0);
        return date;
    };

    const handleSave = async () => {
        if (!message.trim()) {
            Alert.alert('שגיאה', 'יש להזין הודעה לתזכורת');
            return;
        }

        const reminderDate = getReminderDateTime();

        if (reminderDate < new Date() && reminderType === 'once') {
            Alert.alert('שגיאה', 'תאריך התזכורת צריך להיות בעתיד');
            return;
        }

        // Check if notifications are enabled
        const settings = notificationService.getSettings();
        if (!settings.enabled) {
            Alert.alert(
                'תראות מושבתות',
                'כדי ליצור תזכורות, יש להפעיל תראות בהגדרות האפליקציה.\n\nאנא פתח את הגדרות התראות והפעל אותן.',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'פתח הגדרות',
                        onPress: async () => {
                            try {
                                // Try to request permissions
                                const granted = await notificationService.requestPermissions();
                                if (!granted) {
                                    Alert.alert(
                                        'הרשאות נדרשות',
                                        'יש להפעיל תראות בהגדרות המכשיר.\n\nעבור להגדרות > CalmParent > תראות והפעל אותן.'
                                    );
                                }
                            } catch (error) {
                                logger.error('Failed to request permissions:', error);
                                Alert.alert(
                                    'הרשאות נדרשות',
                                    'יש להפעיל תראות בהגדרות המכשיר.\n\nעבור להגדרות > CalmParent > תראות והפעל אותן.'
                                );
                            }
                        },
                    },
                ]
            );
            return;
        }

        setSaving(true);
        try {
            if (reminderType === 'once') {
                // Single reminder
                await notificationService.createCustomReminder({
                    title: '🔔 תזכורת',
                    body: message.trim(),
                    date: reminderDate,
                });
            } else if (reminderType === 'daily') {
                // Daily reminder
                await notificationService.createRecurringReminder({
                    title: '🔔 תזכורת יומית',
                    body: message.trim(),
                    hour: reminderDate.getHours(),
                    minute: reminderDate.getMinutes(),
                    repeat: 'daily',
                });
            } else if (reminderType === 'weekly') {
                // Weekly reminder
                await notificationService.createRecurringReminder({
                    title: '🔔 תזכורת שבועית',
                    body: message.trim(),
                    hour: reminderDate.getHours(),
                    minute: reminderDate.getMinutes(),
                    repeat: 'weekly',
                    weekday: reminderDate.getDay(),
                });
            }

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert('נשמר!', 'התזכורת נשמרה בהצלחה');
            await loadReminders();
            setViewMode('list');
            setMessage('');
            setReminderType('once');
            setSelectedDate(new Date());
            setSelectedTime(new Date());
        } catch (error: any) {
            logger.error('Failed to create reminder:', error);
            const errorMessage = error?.message || 'לא ניתן ליצור תזכורת';

            if (errorMessage.includes('Notifications are disabled')) {
                Alert.alert(
                    'תראות מושבתות',
                    'כדי ליצור תזכורות, יש להפעיל תראות בהגדרות האפליקציה.\n\nאנא פתח את הגדרות התראות והפעל אותן.'
                );
            } else {
                Alert.alert('שגיאה', 'לא ניתן ליצור תזכורת. נסה שוב.');
            }
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (date: Date): string => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'היום';
        }
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'מחר';
        }
        return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    };

    const quickPresets = [
        { text: 'להכין בקבוק', icon: Baby, color: '#F59E0B' },
        { text: 'לקנות חיתולים', icon: ShoppingCart, color: '#10B981' },
        { text: 'להתקשר לרופא', icon: Phone, color: '#6366F1' },
        { text: 'לקחת תרופה', icon: Pill, color: '#EF4444' },
    ];

    const handleDeleteReminder = async (id: string) => {
        Alert.alert(
            'מחיקת תזכורת',
            'האם אתה בטוח שברצונך למחוק את התזכורת?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'מחק',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await notificationService.cancelReminder(id);
                        if (success) {
                            if (Platform.OS !== 'web') {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                            await loadReminders();
                        } else {
                            Alert.alert('שגיאה', 'לא ניתן למחוק את התזכורת');
                        }
                    },
                },
            ]
        );
    };

    const formatReminderDate = (reminder: ReminderItem): string => {
        if (reminder.repeat === 'daily') {
            return `יומי - ${formatTime(reminder.date || new Date())}`;
        }
        if (reminder.repeat === 'weekly') {
            const weekdays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
            const weekday = reminder.date ? weekdays[reminder.date.getDay()] : '';
            return `שבועי - ${weekday} ${formatTime(reminder.date || new Date())}`;
        }
        if (reminder.date) {
            const now = new Date();
            const reminderDate = reminder.date;
            if (reminderDate.toDateString() === now.toDateString()) {
                return `היום ${formatTime(reminderDate)}`;
            }
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (reminderDate.toDateString() === tomorrow.toDateString()) {
                return `מחר ${formatTime(reminderDate)}`;
            }
            return `${formatDate(reminderDate)} ${formatTime(reminderDate)}`;
        }
        return '';
    };

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose} statusBarTranslucent>
            <RNAnimated.View style={[styles.overlay, { opacity: fadeAnim, backgroundColor: theme.modalOverlay }]}>
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <RNAnimatedView
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle}>
                        <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: theme.card }]}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        )}

                        <View style={{ alignItems: 'center', gap: 12, zIndex: 1, flex: 1 }}>
                            <LinearGradient
                                colors={['#F59E0B', '#FBBF24', '#FCD34D']}
                                style={styles.iconCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Bell size={32} color="#fff" strokeWidth={2.5} fill="#fff" />
                            </LinearGradient>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>תזכורת מהירה</Text>
                        </View>

                        {viewMode === 'list' ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setViewMode('create');
                                    if (Platform.OS !== 'web') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                }}
                                style={styles.addButtonWrapper}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={['#34D399', '#10B981', '#059669']}
                                    style={styles.addButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Plus size={20} color="#fff" strokeWidth={2.5} />
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => {
                                    setViewMode('list');
                                    if (Platform.OS !== 'web') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }
                                }}
                                style={[styles.addButton, { backgroundColor: theme.inputBackground }]}
                                activeOpacity={0.7}
                            >
                                <List size={20} color={theme.textSecondary} strokeWidth={2.5} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeButton, { backgroundColor: theme.inputBackground }]}
                            activeOpacity={0.7}
                        >
                            <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                        {viewMode === 'list' ? (
                            /* Reminders List */
                            <Reanimated.View
                                entering={FadeInDown.duration(400).springify().damping(15)}
                                style={styles.section}
                            >
                                {loadingReminders ? (
                                    <View style={styles.emptyState}>
                                        <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>טוען...</Text>
                                    </View>
                                ) : reminders.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <LinearGradient
                                            colors={isDarkMode
                                                ? ['rgba(251, 191, 36, 0.12)', 'rgba(251, 191, 36, 0.06)']
                                                : ['rgba(251, 191, 36, 0.2)', 'rgba(251, 191, 36, 0.1)']
                                            }
                                            style={styles.emptyIconGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Bell size={56} color="#F59E0B" strokeWidth={2.5} />
                                        </LinearGradient>
                                        <Text style={[styles.emptyStateTitle, { color: theme.textPrimary }]}>אין תזכורות שמורות</Text>
                                        <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>לחץ על + כדי ליצור תזכורת חדשה</Text>
                                    </View>
                                ) : (
                                    reminders.map((reminder) => (
                                        <Reanimated.View
                                            key={reminder.id}
                                            entering={FadeInDown.duration(300).springify().damping(15)}
                                            style={[styles.reminderCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                                        >
                                            <View style={styles.reminderContent}>
                                                <View style={[styles.reminderIconCircle, {
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                                                }]}>
                                                    <Bell size={18} color={theme.textSecondary} strokeWidth={2} />
                                                </View>
                                                <View style={styles.reminderTextContainer}>
                                                    <Text style={[styles.reminderTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                                                        {reminder.title}
                                                    </Text>
                                                    <Text style={[styles.reminderBody, { color: theme.textSecondary }]} numberOfLines={2}>
                                                        {reminder.body}
                                                    </Text>
                                                    <View style={styles.reminderDateRow}>
                                                        <Clock size={12} color={theme.textTertiary} strokeWidth={2} />
                                                        <Text style={[styles.reminderDate, { color: theme.textTertiary }]}>
                                                            {formatReminderDate(reminder)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteReminder(reminder.id)}
                                                style={[styles.deleteButton, { backgroundColor: theme.danger + '15' }]}
                                                activeOpacity={0.7}
                                            >
                                                <Trash2 size={16} color={theme.danger} strokeWidth={2} />
                                            </TouchableOpacity>
                                        </Reanimated.View>
                                    ))
                                )}
                            </Reanimated.View>
                        ) : (
                            <>
                                {/* Quick Presets */}
                                <Reanimated.View
                                    entering={FadeInDown.duration(400).delay(100).springify().damping(15)}
                                    style={styles.section}
                                >
                                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>בחירה מהירה</Text>
                                    <View style={styles.presetsGrid}>
                                        {quickPresets.map((preset, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[styles.presetBtn, {
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                                                }]}
                                                onPress={() => {
                                                    setMessage(preset.text);
                                                    if (Platform.OS !== 'web') {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[styles.presetIconContainer, {
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                                                }]}>
                                                    {React.createElement(preset.icon, {
                                                        size: 22,
                                                        color: preset.color,
                                                        strokeWidth: 2
                                                    })}
                                                </View>
                                                <Text style={[styles.presetText, { color: theme.textPrimary }]} numberOfLines={1}>
                                                    {preset.text}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </Reanimated.View>

                                {/* Message Input */}
                                <Reanimated.View
                                    entering={FadeInDown.duration(400).delay(200).springify().damping(15)}
                                    style={styles.section}
                                >
                                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>הודעה</Text>
                                    <TextInput
                                        style={[
                                            styles.messageInput,
                                            {
                                                backgroundColor: theme.inputBackground,
                                                color: theme.textPrimary,
                                                borderColor: theme.border
                                            }
                                        ]}
                                        value={message}
                                        onChangeText={setMessage}
                                        placeholder="למשל: להכין בקבוק בעוד שעה"
                                        placeholderTextColor={theme.textTertiary}
                                        multiline
                                        maxLength={100}
                                        textAlign="right"
                                    />
                                    <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                                        {message.length}/100
                                    </Text>
                                </Reanimated.View>

                                {/* Reminder Type */}
                                <Reanimated.View
                                    entering={FadeInDown.duration(400).delay(300).springify().damping(15)}
                                    style={styles.section}
                                >
                                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>סוג תזכורת</Text>
                                    <View style={styles.typeRow}>
                                        {(['once', 'daily', 'weekly'] as ReminderType[]).map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[
                                                    styles.typeBtn,
                                                    {
                                                        backgroundColor: reminderType === type ? theme.primary : theme.cardSecondary,
                                                        borderColor: reminderType === type ? theme.primary : theme.border
                                                    }
                                                ]}
                                                onPress={() => {
                                                    setReminderType(type);
                                                    if (Platform.OS !== 'web') {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[
                                                    styles.typeBtnText,
                                                    { color: reminderType === type ? theme.card : theme.textPrimary }
                                                ]}>
                                                    {type === 'once' ? 'פעם אחת' : type === 'daily' ? 'יומי' : 'שבועי'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </Reanimated.View>

                                {/* Date & Time */}
                                <Reanimated.View
                                    entering={FadeInDown.duration(400).delay(400).springify().damping(15)}
                                    style={styles.section}
                                >
                                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                                        {reminderType === 'once' ? 'תאריך ושעה' : 'שעה'}
                                    </Text>

                                    {reminderType === 'once' && (
                                        <TouchableOpacity
                                            style={[styles.dateTimeBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                                            onPress={() => setShowDatePicker(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Calendar size={18} color={theme.primary} strokeWidth={2} />
                                            <Text style={[styles.dateTimeText, { color: theme.textPrimary }]}>
                                                {formatDate(selectedDate)}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.dateTimeBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                                        onPress={() => setShowTimePicker(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Clock size={18} color={theme.primary} strokeWidth={2} />
                                        <Text style={[styles.dateTimeText, { color: theme.textPrimary }]}>
                                            {formatTime(selectedTime)}
                                        </Text>
                                    </TouchableOpacity>

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={selectedDate}
                                            mode="date"
                                            display="default"
                                            minimumDate={new Date()}
                                            onChange={(event, date) => {
                                                setShowDatePicker(Platform.OS === 'ios');
                                                if (date) setSelectedDate(date);
                                            }}
                                        />
                                    )}

                                    {showTimePicker && (
                                        <DateTimePicker
                                            value={selectedTime}
                                            mode="time"
                                            display="default"
                                            is24Hour={true}
                                            onChange={(event, date) => {
                                                setShowTimePicker(Platform.OS === 'ios');
                                                if (date) setSelectedTime(date);
                                            }}
                                        />
                                    )}
                                </Reanimated.View>

                                {/* Save Button */}
                                <Reanimated.View
                                    entering={FadeInDown.duration(400).delay(500).springify().damping(15)}
                                    style={styles.section}
                                >
                                    <TouchableOpacity
                                        style={[
                                            styles.saveBtn,
                                            { backgroundColor: message.trim() ? theme.primary : theme.textTertiary }
                                        ]}
                                        onPress={handleSave}
                                        disabled={!message.trim() || saving}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={message.trim() ? [theme.primary, theme.primary] : [theme.textTertiary, theme.textTertiary]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.saveBtnGradient}
                                        >
                                            {saving ? (
                                                <Text style={[styles.saveBtnText, { color: theme.card }]}>שומר...</Text>
                                            ) : (
                                                <>
                                                    <Check size={18} color={theme.card} strokeWidth={2.5} />
                                                    <Text style={[styles.saveBtnText, { color: theme.card }]}>שמור תזכורת</Text>
                                                </>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Reanimated.View>
                            </>
                        )}
                    </ScrollView>
                </RNAnimatedView>
            </RNAnimated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 44,
        maxHeight: '95%',
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 16,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 16,
    },
    dragHandleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
    },
    titleContainer: {
        alignItems: 'center',
        gap: 12,
        flex: 1,
        zIndex: 1,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        position: 'relative',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    addButtonWrapper: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 50 : 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'right',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    presetsGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 14,
    },
    presetBtn: {
        flex: 1,
        minWidth: '45%',
        padding: 24,
        borderRadius: 22,
        alignItems: 'center',
        gap: 14,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    presetIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 4,
    },
    presetText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    messageInput: {
        width: '100%',
        minHeight: 120,
        borderRadius: 18,
        padding: 18,
        fontSize: 15,
        borderWidth: StyleSheet.hairlineWidth,
        textAlignVertical: 'top',
        lineHeight: 22,
        letterSpacing: -0.1,
    },
    charCount: {
        fontSize: 11,
        textAlign: 'right',
        marginTop: 8,
        letterSpacing: 0.2,
        opacity: 0.6,
    },
    typeRow: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    typeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    dateTimeBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 14,
        padding: 18,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    dateTimeText: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    saveBtn: {
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    saveBtnGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        gap: 20,
    },
    emptyIconGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.4,
    },

    emptyStateSubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: -0.1,
        opacity: 0.7,
    },
    reminderCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    reminderContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    reminderIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    reminderTextContainer: {
        flex: 1,
        gap: 4,
    },
    reminderTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    reminderBody: {
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: -0.1,
    },
    reminderDateRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    reminderDate: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.1,
        opacity: 0.7,
    },
    deleteButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
