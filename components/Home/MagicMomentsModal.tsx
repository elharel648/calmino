import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Platform,
    Animated as RNAnimated,
    ScrollView,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Dimensions,
    PanResponder,
    Image,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Sparkles, Camera, X, RefreshCw, Plus, Calendar, Baby, Moon, Heart, Smile, Hand, Shapes, Utensils, Flower2, Eye, Bug, ArrowUp, Music, Footprints } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { useActiveChild } from '../../context/ActiveChildContext';
import { Timestamp } from 'firebase/firestore';

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withSpring,
    withDelay,
    withRepeat,
    withSequence,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import { logger } from '../../utils/logger';
import { useLanguage } from '../../context/LanguageContext';
import BrandedShareModal from './BrandedShareModal';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

// Warm rose accent — distinct from purple used elsewhere
const ACCENT = '#E8567F';

// Developmental milestone icons for each month's empty state
// Each icon represents a real developmental milestone for that age
// Labels are moved inside the component to access t()
const MONTH_ICONS_BASE: Record<number, { icon: any; labelKey: string }> = {
    0:  { icon: Baby,       labelKey: 'magicMoments.birthDay' },
    1:  { icon: Moon,       labelKey: 'magicMoments.firstYearLabel' },
    2:  { icon: Heart,      labelKey: 'magicMoments.emotionalBond' },
    3:  { icon: Smile,      labelKey: 'magicMoments.firstSmile' },
    4:  { icon: Hand,       labelKey: 'magicMoments.firstGrab' },
    5:  { icon: Shapes,     labelKey: 'magicMoments.exploringObjects' },
    6:  { icon: Utensils,   labelKey: 'magicMoments.firstTastes' },
    7:  { icon: Flower2,    labelKey: 'magicMoments.teethGrowing' },
    8:  { icon: Eye,        labelKey: 'magicMoments.visualAwareness' },
    9:  { icon: Bug,        labelKey: 'magicMoments.firstCrawl' },
    10: { icon: ArrowUp,    labelKey: 'magicMoments.firstStand' },
    11: { icon: Music,      labelKey: 'magicMoments.firstSounds' },
    12: { icon: Footprints, labelKey: 'magicMoments.firstSteps' },
};

interface MagicMomentsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MagicMomentsModal({
    visible, onClose }: MagicMomentsModalProps) {
    const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
    const { activeChild } = useActiveChild();
    const { baby, updatePhoto, updateAlbumNote, updateAlbumDate, refresh } = useBabyProfile(activeChild?.childId);

    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetY = useRef(0);
    const dragStartY = useRef(0);

    // Image Viewer State
    const [viewingImage, setViewingImage] = useState<{ url: string; month: number } | null>(null);
    const [shareImage, setShareImage] = useState<{ url: string; month: number } | null>(null);
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');
    const [editingDateMonth, setEditingDateMonth] = useState<number | null>(null);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Simple animations
    const headerOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(0);

    // Icon animations — matching TrackingModal pulse/bounce/sparkle pattern
    const iconPulse1 = useSharedValue(0);
    const iconPulse2 = useSharedValue(0);
    const iconBounce = useSharedValue(0);
    const iconStar1 = useSharedValue(0);
    const iconStar2 = useSharedValue(0);

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

            // Sparkle stars floating up
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
            contentOpacity.value = 0;
            iconPulse1.value = 0;
            iconPulse2.value = 0;
            iconBounce.value = 0;
            iconStar1.value = 0;
            iconStar2.value = 0;
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    // Swipe down to dismiss - matching perfect QuickReminderModal behavior
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
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
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
                    onClose();
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
    }), [onClose, slideAnim, backdropAnim]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    // Animated styles for icon
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

    const handleMonthPress = async (month: number) => {
        const existingPhoto = baby?.album?.[month];

        if (existingPhoto) {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShareImage({ url: existingPhoto, month });
        } else {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                await updatePhoto('album', month);
                // Refresh data after adding photo to get updated albumDates
                setTimeout(() => {
                    refresh();
                }, 1000);
            } catch (error) {
                logger.error('Error adding photo:', error);
                Alert.alert(t('common.error'), t('magicMoments.imageAddError'));
            }
        }
    };

    const handleReplacePhoto = async () => {
        if (!viewingImage) return;
        setViewingImage(null); // Close viewer first
        // Slight delay to allow modal to close smoothly
        setTimeout(async () => {
            await updatePhoto('album', viewingImage.month);
        }, 300);
    };

    const handleAddCustomPhoto = async (month: number) => {
        await updatePhoto('album', month);
    };

    const handleNoteUpdate = async (month: number, note: string) => {
        await updateAlbumNote(month, note);
    };

    const handleDateUpdate = async (month: number, date: Date) => {
        await updateAlbumDate(month, date);
    };

    const formatDate = (date: Date | Timestamp | undefined): string => {
        if (!date) return '';
        let dateObj: Date;
        if (date instanceof Date) {
            dateObj = date;
        } else if (date.seconds) {
            dateObj = new Date(date.seconds * 1000);
        } else if ((date as any).toDate) {
            dateObj = (date as any).toDate();
        } else {
            return '';
        }
        return dateObj.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Debug: Log albumDates to see if it's loaded
    useEffect(() => {
        if (baby?.albumDates) {
            logger.log('📅 Album dates loaded:', baby.albumDates);
        } else {
            logger.log('⚠️ No albumDates found in baby data');
        }
        if (baby?.album) {
            logger.log('📸 Album photos:', Object.keys(baby.album));
        }
    }, [baby?.albumDates, baby?.album]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
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

                    {/* Clean Header */}
                    <Animated.View style={[styles.header, headerStyle]} {...panResponder.panHandlers}>
                        {/* Animated icon with pulse rings + sparkles */}
                        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 8, zIndex: 2 }}>
                            {/* Pulse ring 1 */}
                            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.magicMoments.color }, pulse1Style]} />
                            {/* Pulse ring 2 */}
                            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 32, backgroundColor: theme.actionColors.magicMoments.color }, pulse2Style]} />
                            {/* Main icon with bounce */}
                            <Animated.View style={bounceStyle}>
                                <View style={[{
                                    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: theme.actionColors.magicMoments.color,
                                    shadowColor: isDarkMode ? 'transparent' : theme.actionColors.magicMoments.color,
                                    shadowOpacity: 0.35,
                                    shadowRadius: 10,
                                    shadowOffset: { width: 0, height: 5 },
                                    borderWidth: 2.5,
                                    borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                }]}>
                                    <Sparkles size={28} color="#FFFFFF" strokeWidth={2.2} />
                                </View>
                            </Animated.View>
                            {/* Sparkle star 1 — top-left */}
                            <Animated.View style={[styles.floatingStar, { top: 2, left: 4 }, star1Style]}>
                                <Sparkles size={12} color={theme.actionColors.magicMoments.color} strokeWidth={2.5} />
                            </Animated.View>
                            {/* Sparkle star 2 — top-right */}
                            <Animated.View style={[styles.floatingStar, { top: 6, right: 2 }, star2Style]}>
                                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.actionColors.magicMoments.color, opacity: 0.8 }} />
                            </Animated.View>
                        </View>

                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            {t('magicMoments.title')}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {t('magicMoments.subtitle')}
                        </Text>
                    </Animated.View>

                    {/* Content */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onScroll={(e) => {
                            scrollOffsetY.current = e.nativeEvent.contentOffset.y;
                        }}
                        scrollEventThrottle={16}
                    >
                        <Animated.View style={contentStyle}>
                            {/* Stats Section */}
                            {baby?.album && (
                                <View style={styles.statsContainer}>
                                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)' }]}>
                                        <Text style={[styles.statNumber, { color: theme.actionColors.magicMoments.color }]}>
                                            {Object.keys(baby.album).length}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                            {t('magicMoments.photos')}
                                        </Text>
                                    </View>
                                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)' }]}>
                                        <Text style={[styles.statNumber, { color: theme.actionColors.magicMoments.color }]}>
                                            {Object.keys(baby.album).filter(m => parseInt(m) <= 12).length}/13
                                        </Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                            {t('magicMoments.firstMoments')}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Grid Layout for Months */}
                            <View style={styles.gridSection}>
                                <View style={styles.sectionTitleRow}>
                                    <Sparkles size={16} color={theme.actionColors.magicMoments.color} strokeWidth={2} />
                                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                        {baby?.name ? t('magicMoments.momentsOf', { name: baby.name }) : t('magicMoments.firstYear')}
                                    </Text>
                                </View>
                                <View style={styles.monthsGrid}>
                                    {/* Month 0 = Hello World birth tile + months 1-12 */}
                                    {Array.from({ length: 13 }, (_, i) => i).map((month) => {
                                        const photoUrl = baby?.album?.[month];
                                        const note = baby?.albumNotes?.[month];
                                        const date = baby?.albumDates?.[month];
                                        const milestoneBase = MONTH_ICONS_BASE[month] || { icon: Camera, labelKey: '' };
                                        const milestoneInfo = { icon: milestoneBase.icon, label: milestoneBase.labelKey ? t(milestoneBase.labelKey) : t('magicMoments.month', { num: month.toString() }) };
                                        const MilestoneIcon = milestoneInfo.icon;
                                        const isBirthTile = month === 0;
                                        return (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.monthGridItem,
                                                    {
                                                        backgroundColor: photoUrl
                                                            ? 'transparent'
                                                            : isBirthTile
                                                                ? isDarkMode ? 'rgba(232, 86, 127, 0.08)' : 'rgba(232, 86, 127, 0.05)'
                                                                : isDarkMode
                                                                    ? 'rgba(255,255,255,0.03)'
                                                                    : 'rgba(0,0,0,0.02)',
                                                        borderColor: photoUrl
                                                            ? theme.actionColors.magicMoments.color + '40'
                                                            : isBirthTile
                                                                ? theme.actionColors.magicMoments.color + '30'
                                                                : isDarkMode
                                                                    ? 'rgba(255,255,255,0.08)'
                                                                    : 'rgba(0,0,0,0.08)',
                                                    },
                                                ]}
                                                onPress={() => handleMonthPress(month)}
                                                activeOpacity={0.7}
                                            >
                                                {photoUrl ? (
                                                    <>
                                                        <Image
                                                            source={{ uri: photoUrl }}
                                                            style={styles.gridImage}
                                                            resizeMode="cover"
                                                        />
                                                        <View style={styles.monthBadge}>
                                                            <Text style={styles.monthBadgeText}>
                                                                {isBirthTile ? '🌍' : month}
                                                            </Text>
                                                        </View>
                                                        {note && (
                                                            <TouchableOpacity
                                                                style={styles.noteBadge}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setNoteText(note);
                                                                    setEditingMonth(month);
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.noteBadgeText} numberOfLines={1}>
                                                                    {note}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {!note && photoUrl && (
                                                            <TouchableOpacity
                                                                style={styles.addNoteButton}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setNoteText('');
                                                                    setEditingMonth(month);
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.addNoteText}>{t('magicMoments.addNote')}</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </>
                                                ) : (
                                                    <View style={styles.emptyGridContent}>
                                                        {/* Milestone icon watermark */}
                                                        <View style={styles.emptyIconWrap}>
                                                            <MilestoneIcon size={26} color={theme.actionColors.magicMoments.color} strokeWidth={1.5} />
                                                        </View>
                                                        {/* Month label */}
                                                        <Text style={[styles.emptyMonthLabel, { color: theme.textTertiary }]}>
                                                            {isBirthTile ? 'Hello World' : t('magicMoments.month', { num: month.toString() })}
                                                        </Text>
                                                        <View style={[styles.plusIcon, { backgroundColor: theme.actionColors.magicMoments.color + '15' }]}>
                                                            <Plus size={14} color={theme.actionColors.magicMoments.color} strokeWidth={2} />
                                                        </View>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Additional Months Section */}
                            {baby?.album && Object.keys(baby.album).some(m => parseInt(m) > 12) && (
                                <View style={styles.gridSection}>
                                    <View style={styles.sectionTitleRow}>
                                        <Sparkles size={16} color={theme.actionColors.magicMoments.color} strokeWidth={2} />
                                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                            {t('magicMoments.moreMonths')}
                                        </Text>
                                    </View>
                                    <View style={styles.monthsGrid}>
                                        {Object.keys(baby.album)
                                            .map(Number)
                                            .filter(m => m > 12)
                                            .sort((a, b) => a - b)
                                            .map((month) => {
                                                const photoUrl = baby.album[month];
                                                const note = baby?.albumNotes?.[month];
                                                const date = baby?.albumDates?.[month];
                                                return (
                                                    <TouchableOpacity
                                                        key={month}
                                                        style={[
                                                            styles.monthGridItem,
                                                            {
                                                                backgroundColor: 'transparent',
                                                                borderColor: theme.actionColors.magicMoments.color + '40',
                                                            },
                                                        ]}
                                                        onPress={() => handleMonthPress(month)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Image
                                                            source={{ uri: photoUrl }}
                                                            style={styles.gridImage}
                                                            resizeMode="cover"
                                                        />
                                                        <View style={styles.monthBadge}>
                                                            <Text style={styles.monthBadgeText}>{month}</Text>
                                                        </View>
                                                        {date && (
                                                            <TouchableOpacity
                                                                style={styles.dateBadge}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    const dateObj = date.seconds ? new Date(date.seconds * 1000) : new Date();
                                                                    setSelectedDate(dateObj);
                                                                    setEditingDateMonth(month);
                                                                    setDatePickerVisible(true);
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Calendar size={10} color="#fff" strokeWidth={2} />
                                                                <Text style={styles.dateBadgeText} numberOfLines={1}>
                                                                    {formatDate(date)}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {!date && photoUrl && (
                                                            <TouchableOpacity
                                                                style={styles.addDateButton}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedDate(new Date());
                                                                    setEditingDateMonth(month);
                                                                    setDatePickerVisible(true);
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Calendar size={10} color={theme.actionColors.magicMoments.color} strokeWidth={2} />
                                                                <Text style={styles.addDateText}>{t('magicMoments.dateLabel')}</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {note && (
                                                            <TouchableOpacity
                                                                style={styles.noteBadge}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setNoteText(note);
                                                                    setEditingMonth(month);
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.noteBadgeText} numberOfLines={1}>
                                                                    {note}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                        {!note && photoUrl && (
                                                            <TouchableOpacity
                                                                style={styles.addNoteButton}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    setNoteText('');
                                                                    setEditingMonth(month);
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                }}
                                                                activeOpacity={0.8}
                                                            >
                                                                <Text style={styles.addNoteText}>{t('magicMoments.addNote')}</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        <TouchableOpacity
                                            style={[
                                                styles.monthGridItem,
                                                styles.addMonthButton,
                                                {
                                                    backgroundColor: isDarkMode
                                                        ? 'rgba(255,255,255,0.03)'
                                                        : 'rgba(0,0,0,0.02)',
                                                    borderColor: theme.actionColors.magicMoments.color + '40',
                                                    borderStyle: 'dashed',
                                                },
                                            ]}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setMonthPickerOpen(true);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Plus size={20} color={theme.actionColors.magicMoments.color} strokeWidth={2} />
                                            <Text style={[styles.addMonthText, { color: theme.actionColors.magicMoments.color }]}>{t('common.add')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Add Custom Month Button */}
                            {(!baby?.album || !Object.keys(baby.album).some(m => parseInt(m) > 12)) && (
                                <TouchableOpacity
                                    style={[
                                        styles.addCustomSection,
                                        {
                                            backgroundColor: isDarkMode
                                                ? 'rgba(139, 92, 246, 0.1)'
                                                : 'rgba(139, 92, 246, 0.05)',
                                            borderColor: theme.actionColors.magicMoments.color + '30',
                                        },
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setMonthPickerOpen(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.addCustomIcon, { backgroundColor: theme.actionColors.magicMoments.color }]}>
                                        <Plus size={18} color="#fff" strokeWidth={2.5} />
                                    </View>
                                    <View style={styles.addCustomTextContainer}>
                                        <Text style={[styles.addCustomTitle, { color: theme.textPrimary }]}>
                                            {t('magicMoments.addMoreMonth')}
                                        </Text>
                                        <Text style={[styles.addCustomSubtitle, { color: theme.textSecondary }]}>
                                            {t('magicMoments.monthsRange')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Baby name footer */}
                            {baby?.name && (
                                <View style={[styles.babyNameRow, { borderTopColor: theme.border }]}>
                                    <View style={[styles.cameraIconWrapper, { backgroundColor: theme.actionColors.magicMoments.color + '15' }]}>
                                        <Camera size={14} color={theme.actionColors.magicMoments.color} strokeWidth={1.5} />
                                    </View>
                                    <Text style={[styles.babyName, { color: theme.textPrimary }]}>
                                        {t('magicMoments.albumOf', { name: baby.name })}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                </RNAnimatedView>
            </KeyboardAvoidingView>

            {/* BRANDED SHARE MODAL */}
            <BrandedShareModal
                visible={!!shareImage}
                onClose={() => setShareImage(null)}
                imageUrl={shareImage?.url || ''}
                month={shareImage?.month || 0}
                babyName={baby?.name || ''}
            />

            {/* FULL SCREEN IMAGE VIEWER MODAL */}
            <Modal
                visible={!!viewingImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewingImage(null)}
            >
                <View style={styles.viewerContainer}>
                    {/* Dark Blur Background */}
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

                    <SafeAreaView style={styles.viewerSafeArea}>
                        {/* Header Actions */}
                        <View style={styles.viewerHeader}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setViewingImage(null)}
                            >
                                <X color="#FFF" size={28} />
                            </TouchableOpacity>
                        </View>

                        {/* Main Image */}
                        <View style={styles.viewerImageContainer}>
                            {viewingImage && (
                                <Image
                                    source={{ uri: viewingImage.url }}
                                    style={styles.viewerImage}
                                    resizeMode="contain"
                                />
                            )}
                        </View>

                        {/* Footer Actions */}
                        <View style={styles.viewerFooter}>
                            <TouchableOpacity
                                style={styles.replaceButton}
                                onPress={handleReplacePhoto}
                            >
                                <RefreshCw color="#FFF" size={20} />
                                <Text style={styles.replaceButtonText}>{t('magicMoments.replacePhoto')}</Text>
                            </TouchableOpacity>
                            {viewingImage && (
                                <Text style={styles.viewerMonthText}>{t('magicMoments.monthNum', { num: viewingImage.month.toString() })}</Text>
                            )}
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Month Picker Modal */}
            <Modal
                visible={monthPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMonthPickerOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    {Platform.OS === 'ios' && (
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    )}
                    <View style={[styles.monthPickerModal, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setMonthPickerOpen(false)}>
                                <X size={20} color={theme.textSecondary} strokeWidth={1.5} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('magicMoments.selectMonth')}</Text>
                            <View style={{ width: 20 }} />
                        </View>
                        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                            {t('magicMoments.addPhotoRange')}
                        </Text>
                        <View style={styles.monthPickerGrid}>
                            {Array.from({ length: 24 }, (_, i) => i + 13).map(month => (
                                <TouchableOpacity
                                    key={month}
                                    style={styles.monthPickerItem}
                                    onPress={() => {
                                        setMonthPickerOpen(false);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        // ✅ FIX: Wait for Modal dismiss animation before ActionSheetIOS
                                        setTimeout(() => {
                                            handleAddCustomPhoto(month);
                                        }, 350);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.monthPickerCircle,
                                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                                    ]}>
                                        <Text style={[styles.monthPickerNumber, { color: theme.actionColors.magicMoments.color }]}>{month}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Note Edit Modal */}
            <Modal
                visible={editingMonth !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setEditingMonth(null)}
            >
                <View style={styles.modalOverlay}>
                    {Platform.OS === 'ios' && (
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    )}
                    <View style={[styles.noteModalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setEditingMonth(null)}>
                                <X size={20} color={theme.textSecondary} strokeWidth={1.5} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                {t('magicMoments.noteForMonth', { num: editingMonth?.toString() || '' })}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    if (editingMonth) {
                                        handleNoteUpdate(editingMonth, noteText);
                                        setEditingMonth(null);
                                        setNoteText('');
                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    }
                                }}
                            >
                                <Text style={[styles.saveButton, { color: ACCENT }]}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[
                                styles.noteInput,
                                {
                                    color: theme.textPrimary,
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                }
                            ]}
                            placeholder={t('magicMoments.addNoteOrDesc')}
                            placeholderTextColor={theme.textTertiary}
                            value={noteText}
                            onChangeText={setNoteText}
                            multiline
                            maxLength={200}
                            autoFocus
                        />
                    </View>
                </View>
            </Modal>

            {/* Date Picker */}
            {datePickerVisible && editingDateMonth && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                        if (Platform.OS === 'android') {
                            setDatePickerVisible(false);
                        }
                        if (date && editingDateMonth) {
                            setSelectedDate(date);
                            if (Platform.OS === 'android') {
                                handleDateUpdate(editingDateMonth, date);
                                setEditingDateMonth(null);
                            }
                        }
                    }}
                    maximumDate={new Date()}
                />
            )}

            {/* iOS Date Picker Modal */}
            {Platform.OS === 'ios' && datePickerVisible && editingDateMonth && (
                <Modal
                    visible={datePickerVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        setDatePickerVisible(false);
                        setEditingDateMonth(null);
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={[styles.datePickerModal, { backgroundColor: theme.card }]}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setDatePickerVisible(false);
                                        setEditingDateMonth(null);
                                    }}
                                >
                                    <Text style={[styles.cancelButton, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('sitter.selectDate')}</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (editingDateMonth) {
                                            handleDateUpdate(editingDateMonth, selectedDate);
                                            setDatePickerVisible(false);
                                            setEditingDateMonth(null);
                                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        }
                                    }}
                                >
                                    <Text style={[styles.saveButton, { color: ACCENT }]}>{t('common.save')}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display="spinner"
                                onChange={(event, date) => {
                                    if (date) {
                                        setSelectedDate(date);
                                    }
                                }}
                                maximumDate={new Date()}
                                locale="he-IL"
                            />
                        </View>
                    </View>
                </Modal>
            )}
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
    content: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 24,
        flexGrow: 1,
        width: '100%',
    },
    instructionText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '400',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
        paddingHorizontal: 4,
    },
    statCard: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 4,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    gridSection: {
        marginBottom: 32,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 4,
        textAlign: 'left',
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 4,
    },
    monthGridItem: {
        width: (SCREEN_WIDTH - 48 - 30) / 3, // 3 columns with gaps
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1.5,
        position: 'relative',
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    monthBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: ACCENT,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    noteBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    noteBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'right',
    },
    emptyGridContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    emptyIconWrap: {
        opacity: 0.3,
        marginBottom: 2,
    },
    emptyMonthLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    emptyMonthText: {
        fontSize: 18,
        fontWeight: '600',
    },
    plusIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    addMonthButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    addMonthText: {
        fontSize: 12,
        fontWeight: '600',
    },
    addCustomSection: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        gap: 12,
        marginBottom: 24,
    },
    addCustomIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addCustomTextContainer: {
        flex: 1,
        alignItems: 'flex-end',
        gap: 2,
    },
    addCustomTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    addCustomSubtitle: {
        fontSize: 12,
        fontWeight: '400',
    },
    babyNameRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
        paddingTop: 24,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    cameraIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    babyName: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },

    // Viewer Styles
    viewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
    },
    viewerSafeArea: {
        flex: 1,
        justifyContent: 'space-between',
    },
    viewerHeader: {
        padding: 20,
        alignItems: 'flex-start', // Close button on left because English/Hebrew mix (or check layout)
        zIndex: 10,
    },
    closeButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    viewerImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.7,
    },
    viewerFooter: {
        padding: 30,
        alignItems: 'center',
        gap: 16,
    },
    replaceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
    },
    replaceButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    viewerMonthText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    monthPickerModal: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    monthPickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    monthPickerItem: {
        alignItems: 'center',
    },
    monthPickerCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthPickerNumber: {
        fontSize: 17,
        fontWeight: '600',
    },
    addNoteButton: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        alignItems: 'center',
    },
    addNoteText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    noteModalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 20,
    },
    saveButton: {
        fontSize: 16,
        fontWeight: '600',
    },
    noteInput: {
        borderRadius: 14,
        padding: 14,
        minHeight: 90,
        fontSize: 15,
        textAlign: 'right',
        textAlignVertical: 'top',
    },
    dateBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        maxWidth: '70%',
    },
    dateBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '600',
    },
    addDateButton: {
        position: 'absolute',
        top: 8,
        left: 8,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        backgroundColor: ACCENT + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    addDateText: {
        color: ACCENT,
        fontSize: 9,
        fontWeight: '600',
    },
    datePickerModal: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    cancelButton: {
        fontSize: 16,
        fontWeight: '500',
    },
});
