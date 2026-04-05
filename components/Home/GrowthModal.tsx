import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Animated as RNAnimated,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Dimensions,
    PanResponder,
    ActivityIndicator,
} from 'react-native';
import { TrendingUp, FileText, ChevronDown, ChevronUp, Calendar, Trash2, Info } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    Easing,
    withDelay,
    interpolate,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { addGrowthMeasurement, updateGrowthMeasurement, deleteGrowthMeasurement, GrowthMeasurement } from '../../services/growthService';
import { logger } from '../../utils/logger';
import ScrollFadeWrapper from '../Common/ScrollFadeWrapper';
import { Timestamp } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

// Single accent color
const ACCENT = '#10B981';

interface GrowthModalProps {
    visible: boolean;
    onClose: () => void;
    childId?: string;
    editMeasurement?: GrowthMeasurement;
}

export default function GrowthModal({
    visible, onClose, childId, editMeasurement }: GrowthModalProps) {
    const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
    const { baby, updateAllStats } = useBabyProfile(childId);

    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [headCircumference, setHeadCircumference] = useState('');
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showInfoTip, setShowInfoTip] = useState(false);

    const [measurementDate, setMeasurementDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pendingDate, setPendingDate] = useState<Date | null>(null);

    const isEditMode = !!editMeasurement;

    // Animations
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetY = useRef(0);
    const dragStartY = useRef(0);

    // Icon animations — matching TrackingModal pulse/bounce/sparkle pattern
    const iconPulse1 = useSharedValue(0);
    const iconPulse2 = useSharedValue(0);
    const iconBounce = useSharedValue(0);
    const iconStar1 = useSharedValue(0);
    const iconStar2 = useSharedValue(0);
    const headerOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);

            RNAnimated.parallel([
                RNAnimated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                RNAnimated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            headerOpacity.value = withTiming(1, { duration: 300 });
            contentOpacity.value = 1;

            // Pulse rings — expanding circles that fade out
            iconPulse1.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
            iconPulse2.value = withDelay(700, withRepeat(withTiming(1, { duration: 1400 }), -1, false));

            // Gentle bounce
            iconBounce.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 800 }),
                    withTiming(0, { duration: 800 }),
                ),
                -1,
                true
            );

            // Sparkle stars
            iconStar1.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1200 }),
                    withTiming(0, { duration: 600 }),
                    withTiming(0, { duration: 700 }),
                ),
                -1,
                false
            );
            iconStar2.value = withDelay(600, withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000 }),
                    withTiming(0, { duration: 500 }),
                    withTiming(0, { duration: 700 }),
                ),
                -1,
                false
            ));
        } else {
            headerOpacity.value = 0;
            contentOpacity.value = 1;
            iconPulse1.value = 0;
            iconPulse2.value = 0;
            iconBounce.value = 0;
            iconStar1.value = 0;
            iconStar2.value = 0;
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    const resetAndClose = useCallback(() => {
        setWeight('');
        setHeight('');
        setHeadCircumference('');
        setNotes('');
        setShowNotes(false);
        setMeasurementDate(new Date());
        setIsSaving(false);
        onClose();
    }, [onClose]);

    // Pan responder for swipe dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
            const { dy, dx } = gestureState;
            return dy > 10 && Math.abs(dy) > Math.abs(dx);
        },
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy > 0) {
                slideAnim.setValue(gestureState.dy);
                const opacity = Math.max(0, 1 - gestureState.dy / 300);
                backdropAnim.setValue(opacity);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dy > 120 || gestureState.vy > 0.5) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                RNAnimated.parallel([
                    RNAnimated.timing(slideAnim, {
                        toValue: SCREEN_HEIGHT,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    RNAnimated.timing(backdropAnim, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    resetAndClose();
                });
            } else {
                RNAnimated.parallel([
                    RNAnimated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 65,
                        friction: 11,
                    }),
                    RNAnimated.spring(backdropAnim, {
                        toValue: 1,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        },
    }), [slideAnim, backdropAnim, resetAndClose]);

    // Animated styles
    const pulse1Style = useAnimatedStyle(() => ({
        opacity: interpolate(iconPulse1.value, [0, 1], [0.45, 0]),
        transform: [{ scale: interpolate(iconPulse1.value, [0, 1], [1, 1.75]) }],
    }));
    const pulse2Style = useAnimatedStyle(() => ({
        opacity: interpolate(iconPulse2.value, [0, 1], [0.3, 0]),
        transform: [{ scale: interpolate(iconPulse2.value, [0, 1], [1, 1.75]) }],
    }));
    const bounceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: iconBounce.value }],
    }));
    const star1Style = useAnimatedStyle(() => ({
        opacity: iconStar1.value,
        transform: [
            { translateY: interpolate(iconStar1.value, [0, 1], [0, -14]) },
            { scale: interpolate(iconStar1.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
        ] as any,
    }));
    const star2Style = useAnimatedStyle(() => ({
        opacity: iconStar2.value,
        transform: [
            { translateY: interpolate(iconStar2.value, [0, 1], [0, -14]) },
            { scale: interpolate(iconStar2.value, [0, 0.5, 1], [0.4, 1.2, 0.6]) },
        ] as any,
    }));

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    // Populate fields in edit mode
    useEffect(() => {
        if (editMeasurement) {
            setWeight(editMeasurement.weight?.toString() || '');
            setHeight(editMeasurement.height?.toString() || '');
            setHeadCircumference(editMeasurement.headCircumference?.toString() || '');
            setNotes(editMeasurement.notes || '');
            setMeasurementDate(editMeasurement.date.toDate());
            if (editMeasurement.notes) setShowNotes(true);
        } else {
            setMeasurementDate(new Date());
        }
    }, [editMeasurement, visible]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const historyData: {
            weight?: number;
            height?: number;
            headCircumference?: number;
            notes?: string;
            date?: Timestamp;
        } = {
            date: Timestamp.fromDate(measurementDate),
        };

        if (weight.trim().length > 0) {
            historyData.weight = parseFloat(weight.trim());
        }
        if (height.trim().length > 0) {
            historyData.height = parseFloat(height.trim());
        }
        if (headCircumference.trim().length > 0) {
            historyData.headCircumference = parseFloat(headCircumference.trim());
        }
        if (notes.trim().length > 0) {
            historyData.notes = notes.trim();
        }

        try {
            if (isEditMode && editMeasurement) {
                await updateGrowthMeasurement(editMeasurement.id, historyData);
                // Also update baby profile stats so current measurements reflect the edit
                const statsToSave: { weight?: string; height?: string; headCircumference?: string } = {};
                if (weight.trim()) statsToSave.weight = weight.trim();
                if (height.trim()) statsToSave.height = height.trim();
                if (headCircumference.trim()) statsToSave.headCircumference = headCircumference.trim();
                if (Object.keys(statsToSave).length > 0) {
                    await updateAllStats(statsToSave);
                }
            } else if (childId) {
                await addGrowthMeasurement(childId, historyData);

                const today = new Date();
                if (measurementDate.toDateString() === today.toDateString()) {
                    const statsToSave: { weight?: string; height?: string; headCircumference?: string } = {};
                    if (weight.trim()) statsToSave.weight = weight.trim();
                    if (height.trim()) statsToSave.height = height.trim();
                    if (headCircumference.trim()) statsToSave.headCircumference = headCircumference.trim();
                    if (Object.keys(statsToSave).length > 0) {
                        await updateAllStats(statsToSave);
                    }
                }
            }
        } catch (error) {
            logger.error('Error saving measurement:', error);
        }

        resetAndClose();
    };

    const handleDelete = async () => {
        if (!editMeasurement) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            await deleteGrowthMeasurement(editMeasurement.id);
        } catch (error) {
            logger.error('Error deleting measurement:', error);
        }

        resetAndClose();
    };

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        resetAndClose();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (selectedDate) setMeasurementDate(selectedDate);
        } else {
            // iOS: buffer in pendingDate, confirm on Done
            if (selectedDate) setPendingDate(selectedDate);
        }
    };

    const hasValues = weight || height || headCircumference;
    const isToday = measurementDate.toDateString() === new Date().toDateString();

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
                <RNAnimatedView style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
                    <BlurView
                        intensity={isDarkMode ? 40 : 20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </RNAnimatedView>

                <RNAnimatedView
                    style={[
                        styles.modalCard,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} {...panResponder.panHandlers}>
                        <View style={[
                            styles.dragHandleBar,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)' }
                        ]} />
                    </View>

                    {/* Clean Header with Animated Icon */}
                    <Animated.View style={[styles.header, headerStyle]} {...panResponder.panHandlers}>
                        {/* Info button — top left (RTL = visual right) */}
                        <TouchableOpacity
                            style={styles.infoBtn}
                            onPress={() => {
                                setShowInfoTip(v => !v);
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Info size={18} color={theme.actionColors.growth.color} strokeWidth={2} />
                        </TouchableOpacity>

                        {/* Tooltip bubble */}
                        {showInfoTip && (
                            <View style={[styles.tooltip, { backgroundColor: isDarkMode ? '#1C2E26' : '#ECFDF5', borderColor: isDarkMode ? '#2D4A3A' : '#A7F3D0' }]}>
                                <Text style={[styles.tooltipText, { color: isDarkMode ? '#6EE7B7' : '#065F46' }]}>
                                    מדידה שתשמור להיום תעדכן אוטומטית את הסטטיסטיקות בפרופיל התינוק
                                </Text>
                            </View>
                        )}

                        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8, zIndex: 2 }}>
                            {/* Pulse rings */}
                            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.growth.color }, pulse1Style]} />
                            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.growth.color }, pulse2Style]} />
                            {/* Main icon with bounce */}
                            <Animated.View style={bounceStyle}>
                                <View style={[{
                                    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: theme.actionColors.growth.color,
                                    shadowColor: isDarkMode ? 'transparent' : theme.actionColors.growth.color,
                                    shadowOpacity: 0.35,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 5 },
                                    borderWidth: 2.5,
                                    borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                }]}>
                                    <TrendingUp size={28} color="#FFFFFF" strokeWidth={2.2} />
                                </View>
                            </Animated.View>
                            {/* Sparkle star 1 */}
                            <Animated.View style={[styles.floatingStar, { top: 2, left: 4 }, star1Style]}>
                                <TrendingUp size={12} color={theme.actionColors.growth.color} strokeWidth={2.5} />
                            </Animated.View>
                            {/* Sparkle star 2 */}
                            <Animated.View style={[styles.floatingStar, { top: 6, right: 2 }, star2Style]}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.actionColors.growth.color, opacity: 0.8 }} />
                            </Animated.View>
                        </View>

                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            {isEditMode ? t('growth.editMeasurement') : t('growth.tracking')}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {isEditMode ? t('growth.editSubtitle') : t('growth.subtitle')}
                        </Text>
                    </Animated.View>

                    <ScrollFadeWrapper fadeHeight={80} topFade={false}>
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            onScroll={(e) => {
                                scrollOffsetY.current = e.nativeEvent.contentOffset.y;
                            }}
                            scrollEventThrottle={16}
                        >
                            <Animated.View style={contentStyle}>
                                {/* Date Picker */}
                                <TouchableOpacity
                                    style={styles.dateRow}
                                    onPress={() => setShowDatePicker(!showDatePicker)}
                                >
                                    <Calendar size={18} color={theme.textPrimary} strokeWidth={2} />
                                    <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>
                                        {isToday ? t('common.today') : format(measurementDate, 'd בMMMM yyyy', { locale: he })}
                                    </Text>
                                    {showDatePicker ? (
                                        <ChevronUp size={16} color={theme.textSecondary} strokeWidth={2} />
                                    ) : (
                                        <ChevronDown size={16} color={theme.textSecondary} strokeWidth={2} />
                                    )}
                                </TouchableOpacity>

                                {showDatePicker && (
                                    <View style={[styles.datePickerWrapper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E5EA' }]}>
                                        {Platform.OS === 'ios' && (
                                            <View style={styles.datePickerHeader}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setPendingDate(null);
                                                        setShowDatePicker(false);
                                                    }}
                                                    style={styles.datePickerBtn}
                                                >
                                                    <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 15 }}>{t('common.cancel')}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (pendingDate) setMeasurementDate(pendingDate);
                                                        setPendingDate(null);
                                                        setShowDatePicker(false);
                                                    }}
                                                    style={styles.datePickerBtn}
                                                >
                                                    <Text style={{ color: '#C8806A', fontWeight: '700', fontSize: 15 }}>{t('common.done')}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <DateTimePicker
                                            value={pendingDate ?? measurementDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                            onChange={handleDateChange}
                                            maximumDate={new Date()}
                                            locale="he-IL"
                                            accentColor={theme.actionColors.growth.color}
                                            themeVariant={isDarkMode ? 'dark' : 'light'}
                                        />
                                    </View>
                                )}

                                {/* Simple Input Fields */}
                                <View style={styles.inputsContainer}>
                                    {/* Weight */}
                                    <View style={[
                                        styles.inputRow,
                                        {
                                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                                            borderWidth: 1.5,
                                            borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#E5E5EA',
                                        }
                                    ]}>
                                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('growth.weight')}</Text>
                                        <View style={styles.inputValueRow}>
                                            <TextInput
                                                style={[styles.input, { color: theme.textPrimary }]}
                                                value={weight}
                                                onChangeText={setWeight}
                                                placeholder={baby?.stats?.weight || "0.0"}
                                                placeholderTextColor={theme.textTertiary}
                                                keyboardType="decimal-pad"
                                                textAlign="left"
                                            />
                                            <Text style={[styles.unit, { color: theme.textTertiary }]}>{t('growth.kg')}</Text>
                                        </View>
                                    </View>

                                    {/* Height */}
                                    <View style={[
                                        styles.inputRow,
                                        {
                                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                                            borderWidth: 1.5,
                                            borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#E5E5EA',
                                        }
                                    ]}>
                                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('growth.height')}</Text>
                                        <View style={styles.inputValueRow}>
                                            <TextInput
                                                style={[styles.input, { color: theme.textPrimary }]}
                                                value={height}
                                                onChangeText={setHeight}
                                                placeholder={baby?.stats?.height || "0"}
                                                placeholderTextColor={theme.textTertiary}
                                                keyboardType="decimal-pad"
                                                textAlign="left"
                                            />
                                            <Text style={[styles.unit, { color: theme.textTertiary }]}>{t('growth.cm')}</Text>
                                        </View>
                                    </View>

                                    {/* Head Circumference */}
                                    <View style={[
                                        styles.inputRow,
                                        {
                                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                                            borderWidth: 1.5,
                                            borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#E5E5EA',
                                        }
                                    ]}>
                                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('growth.headCircumference')}</Text>
                                        <View style={styles.inputValueRow}>
                                            <TextInput
                                                style={[styles.input, { color: theme.textPrimary }]}
                                                value={headCircumference}
                                                onChangeText={setHeadCircumference}
                                                placeholder={baby?.stats?.headCircumference || "0"}
                                                placeholderTextColor={theme.textTertiary}
                                                keyboardType="decimal-pad"
                                                textAlign="left"
                                            />
                                            <Text style={[styles.unit, { color: theme.textTertiary }]}>{t('growth.cm')}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Notes Toggle - Simple */}
                                <TouchableOpacity
                                    style={[
                                        styles.notesToggle,
                                        {
                                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                                            borderWidth: 1.5,
                                            borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : '#E5E5EA',
                                        }
                                    ]}
                                    onPress={() => {
                                        setShowNotes(!showNotes);
                                        if (Platform.OS !== 'web') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {showNotes ? (
                                        <ChevronUp size={16} color={theme.textSecondary} strokeWidth={1.5} />
                                    ) : (
                                        <ChevronDown size={16} color={theme.textSecondary} strokeWidth={1.5} />
                                    )}
                                    <FileText size={16} color={theme.textSecondary} strokeWidth={1.5} />
                                    <Text style={[styles.notesToggleText, { color: theme.textSecondary }]}>
                                        {showNotes ? t('growth.hideNotes') : t('tracking.addNote')}
                                    </Text>
                                </TouchableOpacity>

                                {/* Notes Field */}
                                {showNotes && (
                                    <TextInput
                                        style={[
                                            styles.notesInput,
                                            {
                                                color: theme.textPrimary,
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                            }
                                        ]}
                                        value={notes}
                                        onChangeText={setNotes}
                                        placeholder="הערות נוספות..."
                                        placeholderTextColor={theme.textTertiary}
                                        textAlign="right"
                                        multiline
                                        numberOfLines={3}
                                    />
                                )}

                                {/* Save Button */}
                                <TouchableOpacity
                                    style={[styles.saveButton, { opacity: !hasValues ? 0.5 : 1 }]}
                                    onPress={handleSave}
                                    disabled={!hasValues || isSaving}
                                    activeOpacity={0.8}
                                >
                                    <View
                                        style={[styles.saveButtonGradient, { backgroundColor: theme.actionColors.growth.color }]}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <>
                                                <TrendingUp size={18} color="#fff" strokeWidth={2} />
                                                <Text style={styles.saveButtonText}>
                                                    {isEditMode ? t('growth.updateMeasurement') : t('growth.saveMeasurement')}
                                                </Text>
                                            </>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Delete Button (Edit Mode) */}
                                {isEditMode && (
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={handleDelete}
                                        activeOpacity={0.7}
                                    >
                                        <Trash2 size={16} color="#EF4444" strokeWidth={1.5} />
                                        <Text style={styles.deleteButtonText}>מחק מדידה</Text>
                                    </TouchableOpacity>
                                )}
                            </Animated.View>
                        </ScrollView>
                    </ScrollFadeWrapper>
                </RNAnimatedView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 44,
        maxHeight: '90%',
        flex: 1,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 50,
        zIndex: 10,
    },
    dragHandleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    header: {
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 24,
        gap: 10,
        position: 'relative',
    },
    infoBtn: {
        position: 'absolute',
        top: 16,
        right: 24,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tooltip: {
        position: 'absolute',
        top: 52,
        left: 16,
        right: 16,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        zIndex: 10,
    },
    tooltipText: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
        lineHeight: 20,
    },
    iconContainer: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        position: 'relative',
    },
    iconPulse: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    floatingStar: {
        position: 'absolute',
    },
    iconGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 0,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        opacity: 0.7,
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 24,
        flexGrow: 1,
        width: '100%',
    },
    dateRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        marginBottom: 20,
    },
    datePickerWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    datePickerBtn: {
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
    },
    inputsContainer: {
        gap: 12,
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 14,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    inputValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    input: {
        fontSize: 20,
        fontWeight: '600',
        minWidth: 60,
        textAlign: 'right',
    },
    unit: {
        fontSize: 14,
        fontWeight: '500',
    },
    notesToggle: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    notesToggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    notesInput: {
        borderRadius: 14,
        padding: 14,
        minHeight: 80,
        fontSize: 15,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    saveButton: {
        borderRadius: 16,
        marginTop: 8,
        overflow: 'hidden',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 0,
    },
    saveButtonGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        marginTop: 12,
    },
    deleteButtonText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
    },
});
