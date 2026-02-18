import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { TrendingUp, FileText, ChevronDown, ChevronUp, Calendar, Trash2 } from 'lucide-react-native';
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
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { addGrowthMeasurement, updateGrowthMeasurement, deleteGrowthMeasurement, GrowthMeasurement } from '../../services/growthService';
import ScrollFadeWrapper from '../Common/ScrollFadeWrapper';
import { Timestamp } from 'firebase/firestore';

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

export default function GrowthModal({ visible, onClose, childId, editMeasurement }: GrowthModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { baby, updateAllStats } = useBabyProfile(childId);

    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [headCircumference, setHeadCircumference] = useState('');
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [measurementDate, setMeasurementDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isEditMode = !!editMeasurement;

    // Animations
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetY = useRef(0);
    const dragStartY = useRef(0);

    // Icon animation
    const iconRotation = useSharedValue(0);
    const iconScale = useSharedValue(1);
    const headerOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

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
            contentOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));

            // Icon animation - rotation and pulse
            iconRotation.value = withRepeat(
                withSequence(
                    withTiming(10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
            iconScale.value = withRepeat(
                withSequence(
                    withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            headerOpacity.value = 0;
            contentOpacity.value = 0;
            iconRotation.value = 0;
            iconScale.value = 1;
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    // Pan responder for swipe dismiss
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
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
            const isDraggingDown = gestureState.dy > 8;
            const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3;
            const isScrollAtTop = scrollOffsetY.current <= 5;

            if (isTopArea && isDraggingDown && isVerticalSwipe && isScrollAtTop) {
                isDragging.current = true;
                dragStartY.current = currentY;
                scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                return true;
            }
            return false;
        },
        onPanResponderGrant: () => {
            isDragging.current = true;
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
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
                    RNAnimated.timing(backdropAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => {
                    resetAndClose();
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
    }), [slideAnim, backdropAnim]);

    // Animated styles
    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${iconRotation.value}deg` },
            { scale: iconScale.value },
        ],
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

    const resetAndClose = () => {
        setWeight('');
        setHeight('');
        setHeadCircumference('');
        setNotes('');
        setShowNotes(false);
        setMeasurementDate(new Date());
        setIsSaving(false);
        onClose();
    };

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        resetAndClose();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setMeasurementDate(selectedDate);
        }
    };

    const hasValues = weight || height || headCircumference;
    const isToday = measurementDate.toDateString() === new Date().toDateString();

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
                    <RNAnimatedView style={[styles.backdrop, { opacity: backdropAnim, backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                        )}
                    </RNAnimatedView>
                </TouchableWithoutFeedback>

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
                        <Animated.View style={[styles.iconContainer, iconStyle]}>
                            <LinearGradient
                                colors={[ACCENT, '#34D399']}
                                style={styles.iconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <TrendingUp size={28} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </Animated.View>

                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            {isEditMode ? 'עריכת מדידה' : 'מעקב גדילה'}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {isEditMode ? 'עדכנו את המדידה' : 'תעדו את ההתפתחות של התינוק'}
                        </Text>
                    </Animated.View>

                    <ScrollFadeWrapper fadeHeight={80}>
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
                            {/* Date Picker - Simple */}
                            <TouchableOpacity
                                style={[
                                    styles.dateRow,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                                ]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Calendar size={18} color={theme.textSecondary} strokeWidth={1.5} />
                                <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                                    {isToday ? 'היום' : format(measurementDate, 'd בMMMM yyyy', { locale: he })}
                                </Text>
                                <ChevronDown size={16} color={theme.textTertiary} strokeWidth={1.5} />
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={measurementDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                />
                            )}

                            {/* Simple Input Fields */}
                            <View style={styles.inputsContainer}>
                                {/* Weight */}
                                <View style={[
                                    styles.inputRow,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
                                ]}>
                                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>משקל</Text>
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
                                        <Text style={[styles.unit, { color: theme.textTertiary }]}>ק"ג</Text>
                                    </View>
                                </View>

                                {/* Height */}
                                <View style={[
                                    styles.inputRow,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
                                ]}>
                                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>גובה</Text>
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
                                        <Text style={[styles.unit, { color: theme.textTertiary }]}>ס"מ</Text>
                                    </View>
                                </View>

                                {/* Head Circumference */}
                                <View style={[
                                    styles.inputRow,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
                                ]}>
                                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>היקף ראש</Text>
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
                                        <Text style={[styles.unit, { color: theme.textTertiary }]}>ס"מ</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Notes Toggle - Simple */}
                            <TouchableOpacity
                                style={[
                                    styles.notesToggle,
                                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
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
                                    {showNotes ? 'הסתר הערות' : 'הוסף הערה'}
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
                                <LinearGradient
                                    colors={[ACCENT, '#059669']}
                                    style={styles.saveButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <TrendingUp size={18} color="#fff" strokeWidth={2} />
                                            <Text style={styles.saveButtonText}>
                                                {isEditMode ? 'עדכן מדידה' : 'שמור מדידה'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
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
    },
    iconContainer: {
        marginBottom: 4,
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
        elevation: 8,
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
        elevation: 6,
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
