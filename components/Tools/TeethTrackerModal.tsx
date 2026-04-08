import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal, Animated as RNAnimated, Dimensions, PanResponder, Alert } from 'react-native';
import { Check, Sparkles, X, Calendar, TrendingUp, Award, Clock } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { TeethIcon } from '../Home/quickActionsConfig';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild } from '../../context/ActiveChildContext';
import { db, auth } from '../../services/firebaseConfig';
import { logger } from '../../utils/logger';
import { doc, getDoc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { saveEventToFirebase } from '../../services/firebaseService';
import DateTimePicker from '@react-native-community/datetimepicker';
import AndroidHebrewCalendar from '../Common/AndroidHebrewCalendar';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate } from 'react-native-reanimated';
import { ANIMATIONS } from '../../utils/designSystem';
import { useLanguage } from '../../context/LanguageContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface TeethTrackerModalProps {
    visible: boolean;
    onClose: () => void;
}

// Teeth Layout Configuration
const TEETH_CONFIG = [
    // Upper Arch (Left to Right)
    { id: 'start_upper_left_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: 30, top: 80, left: 40 },
    { id: 'start_upper_left_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: 20, top: 45, left: 50 },
    { id: 'start_upper_left_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: 10, top: 25, left: 75 },
    { id: 'start_upper_left_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: 5, top: 10, left: 105 },
    { id: 'start_upper_left_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 5, left: 135 },
    { id: 'start_upper_right_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 5, left: 175 },
    { id: 'start_upper_right_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: -5, top: 10, left: 205 },
    { id: 'start_upper_right_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: -10, top: 25, left: 235 },
    { id: 'start_upper_right_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: -20, top: 45, left: 260 },
    { id: 'start_upper_right_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: -30, top: 80, left: 270 },
    // Lower Arch (Left to Right)
    { id: 'start_lower_left_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: -30, top: 240, left: 40 },
    { id: 'start_lower_left_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: -20, top: 275, left: 50 },
    { id: 'start_lower_left_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: -10, top: 295, left: 75 },
    { id: 'start_lower_left_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: -5, top: 310, left: 105 },
    { id: 'start_lower_left_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 315, left: 135 },
    { id: 'start_lower_right_incisor_1', label: 'חותכת מרכזית', type: 'incisor_cen', color: '#F87171', rot: 0, top: 315, left: 175 },
    { id: 'start_lower_right_incisor_2', label: 'חותכת צידית', type: 'incisor_lat', color: '#A3E635', rot: 5, top: 310, left: 205 },
    { id: 'start_lower_right_canine', label: 'ניב', type: 'canine', color: '#34D399', rot: 10, top: 295, left: 235 },
    { id: 'start_lower_right_molar_1', label: 'טוחנת ראשונה', type: 'molar_1', color: '#60A5FA', rot: 20, top: 275, left: 260 },
    { id: 'start_lower_right_molar_2', label: 'טוחנת שנייה', type: 'molar_2', color: '#A78BFA', rot: 30, top: 240, left: 270 },
];

const getToothShapeStyle = (type: string) => {
    switch (type) {
        case 'incisor_cen': return { width: 28, height: 32, borderRadius: 10, borderTopLeftRadius: 14, borderTopRightRadius: 14 };
        case 'incisor_lat': return { width: 26, height: 30, borderRadius: 12, borderBottomLeftRadius: 18 };
        case 'canine': return { width: 28, height: 28, borderRadius: 14, borderTopLeftRadius: 4 };
        case 'molar_1': return { width: 34, height: 34, borderRadius: 12, borderTopRightRadius: 16, borderBottomLeftRadius: 16 };
        case 'molar_2': return { width: 38, height: 36, borderRadius: 14, borderTopLeftRadius: 18, borderBottomRightRadius: 18 };
        default: return { width: 30, height: 30, borderRadius: 15 };
    }
};

export default function TeethTrackerModal({
    visible, onClose }: TeethTrackerModalProps) {
    const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
    const { activeChild } = useActiveChild();

    // Helper to get translated tooth label from type
    const getToothLabel = (type: string): string => {
        switch (type) {
            case 'molar_2': return t('teethTracker.secondMolar');
            case 'molar_1': return t('teethTracker.firstMolar');
            case 'canine': return t('teethTracker.canine');
            case 'incisor_lat': return t('teethTracker.lateralIncisor');
            case 'incisor_cen': return t('teethTracker.centralIncisor');
            default: return type;
        }
    };
    const [teethData, setTeethData] = useState<Record<string, Date | null>>({});
    const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const slideAnim = React.useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = React.useRef(new RNAnimated.Value(0)).current;

    const teethIconPulse = useSharedValue(0);
    const teethIconBounce = useSharedValue(1);

    const teethIconPulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(teethIconPulse.value, [0, 1], [0.4, 0]),
        transform: [{ scale: interpolate(teethIconPulse.value, [0, 1], [1, 1.7]) }],
    }));

    const teethIconBounceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: teethIconBounce.value }],
    }));

    useEffect(() => {
        if (visible) {
            teethIconPulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
            teethIconBounce.value = withRepeat(
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
        } else {
            teethIconPulse.value = 0;
            teethIconBounce.value = 1;
        }
    }, [visible]);

    useEffect(() => {
        if (visible && activeChild?.childId) {
            loadTeethData();
            // Animate in
            RNAnimated.parallel([
                RNAnimated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            ]).start();
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible, activeChild?.childId]);

    const loadTeethData = async () => {
        if (!activeChild?.childId) return;
        try {
            const docRef = doc(db, 'babies', activeChild.childId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const rawTeeth = data.teeth || {};
                const parsed: Record<string, Date | null> = {};
                Object.keys(rawTeeth).forEach(key => {
                    const val = rawTeeth[key];
                    if (val) {
                        try {
                            if (val.seconds) {
                                parsed[key] = new Date(val.seconds * 1000);
                            } else if (val instanceof Date) {
                                parsed[key] = val;
                            } else {
                                parsed[key] = new Date(val);
                            }
                        } catch (e) {
                            logger.log('Error parsing date', e);
                        }
                    }
                });
                setTeethData(parsed);
            }
        } catch (e) {
            logger.error('Failed to load teeth data', e);
        }
    };

    const handleToothPress = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // If tooth is already erupted, allow editing date or removing
        if (teethData[id]) {
            if (Platform.OS === 'android') {
                // Android: native DatePicker has no custom UI, so show Alert first
                Alert.alert(
                    t('teethTracker.editToothDate'),
                    '',
                    [
                        {
                            text: t('teethTracker.removeTooth'),
                            style: 'destructive',
                            onPress: () => handleRemoveTooth(id),
                        },
                        {
                            text: t('teethTracker.updateDate'),
                            onPress: () => {
                                setSelectedTooth(id);
                                setCurrentDate(teethData[id] || new Date());
                                setShowDatePicker(true);
                            },
                        },
                        {
                            text: t('common.cancel'),
                            style: 'cancel',
                        },
                    ]
                );
                return;
            }
            // iOS: Show date picker with custom modal (has remove button built in)
            setSelectedTooth(id);
            setCurrentDate(teethData[id] || new Date());
            setShowDatePicker(true);
            return;
        }

        // New tooth - show date picker
        setSelectedTooth(id);
        setCurrentDate(new Date());
        setShowDatePicker(true);
    };

    const handleRemoveTooth = async (id: string) => {
        if (!activeChild?.childId) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Remove from state
        setTeethData(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });

        // Remove from Firebase
        try {
            const docRef = doc(db, 'babies', activeChild.childId);
            await updateDoc(docRef, {
                [`teeth.${id}`]: deleteField()
            });
        } catch (e) {
            logger.error('Failed to remove tooth', e);
        }
    };

    const handleDateChange = async (event: any, selectedDate?: Date) => {
        if (selectedDate && selectedTooth && activeChild?.childId) {
            const newDate = selectedDate;
            const isNewTooth = !teethData[selectedTooth];
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTeethData(prev => ({ ...prev, [selectedTooth]: newDate }));
            try {
                const docRef = doc(db, 'babies', activeChild.childId);
                await updateDoc(docRef, {
                    [`teeth.${selectedTooth}`]: Timestamp.fromDate(newDate)
                });

                // Save to timeline if it's a new tooth
                if (isNewTooth && auth.currentUser) {
                    const toothConfig = TEETH_CONFIG.find(t => t.id === selectedTooth);
                    await saveEventToFirebase(auth.currentUser.uid, activeChild.childId, {
                        type: 'teeth',
                        toothId: selectedTooth,
                        toothLabel: toothConfig?.label || 'שן',
                        toothType: toothConfig?.type || '',
                        timestamp: newDate,
                        note: `בקעה ${toothConfig?.label || 'שן'}`
                    });
                }
            } catch (e) {
                logger.error('Failed to save tooth', e);
            }
        }
        setShowDatePicker(false);
        setSelectedTooth(null);
    };

    const handleClose = () => {
        RNAnimated.parallel([
            RNAnimated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
            RNAnimated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            onClose();
        });
    };

    // Pan responder for perfect swipe dismiss (matching QuickReminderModal "בול"!)
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
                handleClose();
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
    }), [slideAnim, backdropAnim, handleClose]);

    const formatToothDate = (date: Date | null): string => {
        if (!date) return '';
        return date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            year: '2-digit',
        });
    };

    const formatToothDateFull = (date: Date | null): string => {
        if (!date) return '';
        return date.toLocaleDateString('he-IL', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Get chronological list of teeth
    const getChronologicalTeeth = () => {
        return Object.entries(teethData)
            .filter(([_, date]) => date !== null)
            .map(([id, date]) => {
                const toothConfig = TEETH_CONFIG.find(t => t.id === id);
                return {
                    id,
                    date: date!,
                    label: getToothLabel(toothConfig?.type || ''),
                    type: toothConfig?.type || '',
                    color: toothConfig?.color || '#8B5CF6'
                };
            })
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    // Get statistics
    const getStatistics = () => {
        const chronological = getChronologicalTeeth();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const thisMonth = chronological.filter(t => {
            const d = t.date;
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        return {
            total: chronological.length,
            thisMonth: thisMonth.length,
            first: chronological[0] || null,
            last: chronological[chronological.length - 1] || null,
        };
    };

    const renderTooth = (tooth: typeof TEETH_CONFIG[0]) => {
        const isErupted = !!teethData[tooth.id];
        const shapeStyle = getToothShapeStyle(tooth.type);

        return (
            <TouchableOpacity
                key={tooth.id}
                style={[
                    styles.toothAbsolute,
                    {
                        top: tooth.top,
                        left: tooth.left,
                        transform: [{ rotate: `${tooth.rot}deg` }]
                    }
                ]}
                onPress={() => handleToothPress(tooth.id)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.toothShape,
                    shapeStyle,
                    isErupted
                        ? { backgroundColor: tooth.color, borderColor: tooth.color, borderWidth: 2 }
                        : { backgroundColor: 'transparent', borderColor: isDarkMode ? '#475569' : '#CBD5E1', borderWidth: 1.5 }
                ]}>
                    {isErupted && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
            </TouchableOpacity>
        );
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <RNAnimated.View style={[styles.overlay, { opacity: backdropAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </TouchableOpacity>

                <RNAnimated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme.background,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Close Button */}
                    <View style={styles.swipeHandle} {...panResponder.panHandlers}>
                        <View style={[styles.swipeBar, { backgroundColor: theme.textTertiary }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.border }]} {...panResponder.panHandlers}>
                        <View style={styles.headerContent}>
                            <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8, zIndex: 2 }}>
                                <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.teeth.color }, teethIconPulseStyle]} />
                                <Animated.View style={teethIconBounceStyle}>
                                    <View style={[{
                                        width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: theme.actionColors.teeth.color,
                                        shadowColor: isDarkMode ? 'transparent' : theme.actionColors.teeth.color,
                                        shadowOpacity: 0.35,
                                        shadowRadius: 10,
                                        shadowOffset: { width: 0, height: 5 },
                                        borderWidth: 2.5,
                                        borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                    }]}>
                                        <TeethIcon size={28} color="#FFFFFF" strokeWidth={2.2} />
                                    </View>
                                </Animated.View>
                            </View>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('teethTracker.title')}</Text>
                        </View>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                            {/* Main Chart */}
                            <Animated.View
                                entering={ANIMATIONS.fadeInDown(100)}
                                style={[styles.chartContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
                            >
                                <View style={styles.centerLabels}>
                                    <Text style={[styles.jawLabel, { color: theme.textSecondary, marginBottom: 40 }]}>{t('teethTracker.upperTeeth')}</Text>
                                    <Text style={[styles.jawLabel, { color: theme.textSecondary }]}>{t('teethTracker.lowerTeeth')}</Text>
                                </View>
                                {TEETH_CONFIG.map(renderTooth)}
                                <Text style={[styles.sideLabel, { left: 10, top: '50%', color: theme.textTertiary }]}>{t('teethTracker.left')}</Text>
                                <Text style={[styles.sideLabel, { right: 10, top: '50%', color: theme.textTertiary }]}>{t('teethTracker.right')}</Text>
                            </Animated.View>

                            {/* Legend */}
                            <Animated.View
                                entering={ANIMATIONS.fadeInDown(200)}
                                style={[styles.legendCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                            >
                                <View style={styles.legendRow}>
                                    <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                                    <Text style={[styles.legendText, { color: theme.textPrimary }]}>{t('teethTracker.centralIncisor')}</Text>
                                </View>
                                <View style={styles.legendRow}>
                                    <View style={[styles.legendDot, { backgroundColor: '#A3E635' }]} />
                                    <Text style={[styles.legendText, { color: theme.textPrimary }]}>{t('teethTracker.lateralIncisor')}</Text>
                                </View>
                                <View style={styles.legendRow}>
                                    <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                                    <Text style={[styles.legendText, { color: theme.textPrimary }]}>{t('teethTracker.canine')}</Text>
                                </View>
                                <View style={styles.legendRow}>
                                    <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                                    <Text style={[styles.legendText, { color: theme.textPrimary }]}>{t('teethTracker.firstMolar')}</Text>
                                </View>
                                <View style={styles.legendRow}>
                                    <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
                                    <Text style={[styles.legendText, { color: theme.textPrimary }]}>{t('teethTracker.secondMolar')}</Text>
                                </View>
                            </Animated.View>

                            {/* Advanced Stats */}
                            {(() => {
                                const stats = getStatistics();
                                return (
                                    <Animated.View
                                        entering={ANIMATIONS.fadeInDown(300)}
                                        style={styles.statsRow}
                                    >
                                        <View style={[styles.statsCard, { backgroundColor: theme.cardSecondary }]}>
                                            <Text style={[styles.statsText, { color: theme.textPrimary, marginBottom: 16 }]}>
                                                {t('teethTracker.totalTeethDisplay', { total: stats.total })}
                                            </Text>

                                            {/* Advanced Statistics */}
                                            <View style={styles.advancedStats}>
                                                <View style={[styles.statItem, { backgroundColor: theme.card }]}>
                                                    <Calendar size={18} color={theme.primary} strokeWidth={2} />
                                                    <View style={styles.statItemContent}>
                                                        <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>{t('teethTracker.thisMonth')}</Text>
                                                        <Text style={[styles.statItemValue, { color: theme.textPrimary }]}>{stats.thisMonth}</Text>
                                                    </View>
                                                </View>

                                                {stats.first && (
                                                    <View style={[styles.statItem, { backgroundColor: theme.card }]}>
                                                        <Award size={18} color="#F87171" strokeWidth={2} />
                                                        <View style={styles.statItemContent}>
                                                            <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>{t('teethTracker.firstTooth')}</Text>
                                                            <Text style={[styles.statItemValue, { color: theme.textPrimary }]}>{stats.first.label}</Text>
                                                            <Text style={[styles.statItemDate, { color: theme.textTertiary }]}>
                                                                {formatToothDate(stats.first.date)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}

                                                {stats.last && (
                                                    <View style={[styles.statItem, { backgroundColor: theme.card }]}>
                                                        <Clock size={18} color="#34D399" strokeWidth={2} />
                                                        <View style={styles.statItemContent}>
                                                            <Text style={[styles.statItemLabel, { color: theme.textSecondary }]}>{t('teethTracker.lastTooth')}</Text>
                                                            <Text style={[styles.statItemValue, { color: theme.textPrimary }]}>{stats.last.label}</Text>
                                                            <Text style={[styles.statItemDate, { color: theme.textTertiary }]}>
                                                                {formatToothDate(stats.last.date)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>

                                            {stats.total === 20 && (
                                                <View style={styles.completeBadge}>
                                                    <Sparkles size={16} color={theme.primary} strokeWidth={2} />
                                                    <Text style={[styles.completeText, { color: theme.primary }]}>{t('teethTracker.allTeethErupted')}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </Animated.View>
                                );
                            })()}

                            {/* Chronological History */}
                            {(() => {
                                const chronological = getChronologicalTeeth();
                                if (chronological.length === 0) return null;

                                return (
                                    <Animated.View
                                        entering={ANIMATIONS.fadeInDown(400)}
                                        style={styles.historySection}
                                    >
                                        <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                            <View style={[styles.historyHeader, { borderBottomColor: theme.border }]}>
                                                <TrendingUp size={20} color={theme.primary} strokeWidth={2} />
                                                <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
                                                    {t('teethTracker.chronologicalHistory')}
                                                </Text>
                                            </View>
                                            <ScrollView
                                                style={styles.historyList}
                                                showsVerticalScrollIndicator={false}
                                                nestedScrollEnabled
                                            >
                                                {chronological.map((tooth, index) => (
                                                    <View
                                                        key={tooth.id}
                                                        style={[styles.historyItem, { borderBottomColor: theme.border }]}
                                                    >
                                                        <View style={[styles.historyItemLeft, { backgroundColor: tooth.color + '20' }]}>
                                                            <View style={[styles.historyItemDot, { backgroundColor: tooth.color }]} />
                                                            <Text style={[styles.historyItemNumber, { color: theme.textSecondary }]}>
                                                                #{index + 1}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.historyItemContent}>
                                                            <Text style={[styles.historyItemLabel, { color: theme.textPrimary }]}>
                                                                {getToothLabel(tooth.type)}
                                                            </Text>
                                                            <Text style={[styles.historyItemDate, { color: theme.textSecondary }]}>
                                                                {formatToothDate(tooth.date)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </Animated.View>
                                );
                            })()}
                        </ScrollView>

                    {/* Date Picker - Android: Hebrew Calendar, iOS: custom modal */}
                    {Platform.OS === 'android' && (
                        <AndroidHebrewCalendar
                            visible={showDatePicker}
                            value={currentDate}
                            onSelect={(date) => {
                                setCurrentDate(date);
                                handleDateChange({} as any, date);
                            }}
                            onDismiss={() => {
                                setShowDatePicker(false);
                                setSelectedTooth(null);
                            }}
                            theme={theme}
                            t={t}
                            maximumDate={new Date()}
                        />
                    )}
                    {showDatePicker && Platform.OS === 'ios' && (
                        <Modal transparent visible={showDatePicker} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
                            <View style={styles.datePickerOverlay}>
                                <BlurView
                                    intensity={20}
                                    tint={isDarkMode ? 'dark' : 'light'}
                                    style={StyleSheet.absoluteFill}
                                />
                                <TouchableOpacity
                                    style={StyleSheet.absoluteFill}
                                    activeOpacity={1}
                                    onPress={() => setShowDatePicker(false)}
                                />
                                <Animated.View
                                    entering={ANIMATIONS.fadeInDown(0, 300)}
                                    style={[styles.datePickerModal, { backgroundColor: theme.card }]}
                                >
                                    <View style={[styles.datePickerHeader, { borderBottomColor: theme.border }]}>
                                        <Text style={[styles.datePickerTitle, { color: theme.textPrimary }]}>
                                            {selectedTooth && teethData[selectedTooth]
                                                ? t('teethTracker.editToothDate')
                                                : t('teethTracker.whenDidToothErupt')}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowDatePicker(false);
                                                setSelectedTooth(null);
                                            }}
                                            style={[styles.datePickerCloseBtn, { backgroundColor: theme.inputBackground }]}
                                            activeOpacity={0.7}
                                        >
                                            <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.datePickerContent}>
                                        <DateTimePicker
                                            value={currentDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={(event, date) => {
                                                if (date) {
                                                    setCurrentDate(date);
                                                }
                                            }}
                                            maximumDate={new Date()}
                                            textColor={theme.textPrimary}
                                            locale="he-IL"
                                        />
                                    </View>
                                    <View style={[styles.datePickerActions, { borderTopColor: theme.border }]}>
                                        {selectedTooth && teethData[selectedTooth] && (
                                            <TouchableOpacity
                                                style={[styles.datePickerRemoveBtn, { backgroundColor: theme.danger + '15', borderColor: theme.danger + '40' }]}
                                                onPress={() => {
                                                    if (selectedTooth) {
                                                        handleRemoveTooth(selectedTooth);
                                                        setShowDatePicker(false);
                                                        setSelectedTooth(null);
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.datePickerBtnText, { color: theme.danger }]}>{t('teethTracker.removeTooth')}</Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            style={[styles.datePickerCancelBtn, { backgroundColor: theme.cardSecondary }]}
                                            onPress={() => {
                                                setShowDatePicker(false);
                                                setSelectedTooth(null);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.datePickerBtnText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.datePickerConfirmBtn, { backgroundColor: theme.primary }]}
                                            onPress={() => {
                                                if (selectedTooth && activeChild?.childId) {
                                                    handleDateChange({} as any, currentDate);
                                                }
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.datePickerBtnText, { color: theme.card }]}>{t('common.confirm')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>
                            </View>
                        </Modal>
                    )}
                </RNAnimated.View>
            </RNAnimated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        height: SCREEN_HEIGHT * 0.9,
        maxHeight: SCREEN_HEIGHT * 0.95,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 0,
    },
    swipeHandle: {
        width: '100%',
        paddingTop: 12,
        paddingBottom: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    swipeBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        opacity: 0.3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    toothDateBadge: {
        position: 'absolute',
        top: -28,
        left: '50%',
        marginLeft: -50,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        minWidth: 100,
        maxWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        borderWidth: 1,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 0,
    },
    toothDateText: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    toothDateTooltip: {
        position: 'absolute',
        top: -50,
        left: '50%',
        marginLeft: -80,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        minWidth: 160,
        alignItems: 'center',
        zIndex: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 0,
    },
    toothDateTooltipText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    advancedStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    statItem: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
    },
    statItemContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    statItemLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 2,
    },
    statItemValue: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    statItemDate: {
        fontSize: 10,
        fontWeight: '500',
    },
    historySection: {
        width: '100%',
        marginTop: 20,
    },
    historyCard: {
        width: '100%',
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 0,
    },
    historyHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    historyList: {
        maxHeight: 200,
    },
    historyItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    historyItemLeft: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        marginLeft: 12,
    },
    historyItemDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    historyItemNumber: {
        fontSize: 11,
        fontWeight: '700',
    },
    historyItemContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    historyItemLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    historyItemDate: {
        fontSize: 12,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
        alignItems: 'center',
        minHeight: '100%',
    },
    chartContainer: {
        width: 340,
        height: 380,
        position: 'relative',
        borderRadius: 24,
        marginTop: 20,
        marginBottom: 20,
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 20,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 0,
    },
    centerLabels: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    toothAbsolute: {
        position: 'absolute',
        zIndex: 10,
    },
    toothShape: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 0,
    },
    jawLabel: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    sideLabel: {
        position: 'absolute',
        fontSize: 13,
        fontWeight: '600',
        zIndex: 5,
    },
    legendCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 0,
    },
    legendRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    statsRow: {
        alignItems: 'center',
        marginTop: 20,
        width: '100%',
    },
    statsCard: {
        width: '100%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
    },
    statsText: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    completeBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },
    completeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    datePickerOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    datePickerModal: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 0,
    },
    datePickerHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    datePickerCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePickerContent: {
        paddingVertical: 20,
        minHeight: 200,
    },
    datePickerActions: {
        flexDirection: 'row-reverse',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        flexWrap: 'wrap',
    },
    datePickerRemoveBtn: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 8,
    },
    datePickerCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePickerConfirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 0,
    },
    datePickerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
