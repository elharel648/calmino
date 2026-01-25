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
import { Sparkles, Camera, X, RefreshCw, Plus, Calendar } from 'lucide-react-native';
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
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

// Minimal accent
const ACCENT = '#8B5CF6';

interface MagicMomentsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MagicMomentsModal({ visible, onClose }: MagicMomentsModalProps) {
    const { theme, isDarkMode } = useTheme();
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
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');
    const [editingDateMonth, setEditingDateMonth] = useState<number | null>(null);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Simple animations
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
        } else {
            headerOpacity.value = 0;
            contentOpacity.value = 0;
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
        }
    }, [visible]);

    // Swipe down to dismiss
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
    }), [onClose, slideAnim, backdropAnim]);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    const handleMonthPress = async (month: number) => {
        const existingPhoto = baby?.album?.[month];

        if (existingPhoto) {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewingImage({ url: existingPhoto, month });
        } else {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
                await updatePhoto('album', month);
                // Refresh data after adding photo to get updated albumDates
                setTimeout(() => {
                    refresh();
                }, 1000);
            } catch (error) {
                console.error('Error adding photo:', error);
                Alert.alert('שגיאה', 'לא הצלחנו להוסיף תמונה');
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
            console.log('📅 Album dates loaded:', baby.albumDates);
        } else {
            console.log('⚠️ No albumDates found in baby data');
        }
        if (baby?.album) {
            console.log('📸 Album photos:', Object.keys(baby.album));
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
                        {/* Simple icon */}
                        <View style={styles.iconContainer}>
                            <LinearGradient
                                colors={[ACCENT, '#A78BFA']}
                                style={styles.iconGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Sparkles size={28} color="#fff" strokeWidth={2} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            רגעים קסומים
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            תעדו את הרגעים המיוחדים
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
                                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]}>
                                        <Text style={[styles.statNumber, { color: ACCENT }]}>
                                            {Object.keys(baby.album).length}
                                        </Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                            תמונות
                                        </Text>
                                    </View>
                                    <View style={[styles.statCard, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]}>
                                        <Text style={[styles.statNumber, { color: ACCENT }]}>
                                            {Object.keys(baby.album).filter(m => parseInt(m) <= 12).length}/12
                                        </Text>
                                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                            חודשים ראשונים
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Grid Layout for Months */}
                            <View style={styles.gridSection}>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                    חודשי השנה הראשונה
                                </Text>
                                <View style={styles.monthsGrid}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                        const photoUrl = baby?.album?.[month];
                                        const note = baby?.albumNotes?.[month];
                                        const date = baby?.albumDates?.[month];
                                        return (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.monthGridItem,
                                                    {
                                                        backgroundColor: photoUrl
                                                            ? 'transparent'
                                                            : isDarkMode
                                                            ? 'rgba(255,255,255,0.03)'
                                                            : 'rgba(0,0,0,0.02)',
                                                        borderColor: photoUrl
                                                            ? ACCENT + '40'
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
                                                            <Text style={styles.monthBadgeText}>{month}</Text>
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
                                                                <Text style={styles.addNoteText}>+ הערה</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </>
                                                ) : (
                                                    <View style={styles.emptyGridContent}>
                                                        <Text style={[styles.emptyMonthText, { color: theme.textTertiary }]}>
                                                            {month}
                                                        </Text>
                                                        <View style={[styles.plusIcon, { backgroundColor: ACCENT + '15' }]}>
                                                            <Plus size={14} color={ACCENT} strokeWidth={2} />
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
                                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                        חודשים נוספים
                                    </Text>
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
                                                                borderColor: ACCENT + '40',
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
                                                                <Calendar size={10} color={ACCENT} strokeWidth={2} />
                                                                <Text style={styles.addDateText}>תאריך</Text>
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
                                                                <Text style={styles.addNoteText}>+ הערה</Text>
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
                                                    borderColor: ACCENT + '40',
                                                    borderStyle: 'dashed',
                                                },
                                            ]}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setMonthPickerOpen(true);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Plus size={20} color={ACCENT} strokeWidth={2} />
                                            <Text style={[styles.addMonthText, { color: ACCENT }]}>הוסף</Text>
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
                                            borderColor: ACCENT + '30',
                                        },
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setMonthPickerOpen(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.addCustomIcon, { backgroundColor: ACCENT }]}>
                                        <Plus size={18} color="#fff" strokeWidth={2.5} />
                                    </View>
                                    <View style={styles.addCustomTextContainer}>
                                        <Text style={[styles.addCustomTitle, { color: theme.textPrimary }]}>
                                            הוסף חודש נוסף
                                        </Text>
                                        <Text style={[styles.addCustomSubtitle, { color: theme.textSecondary }]}>
                                            תיעוד חודשים 13-36
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Baby name footer */}
                            {baby?.name && (
                                <View style={[styles.babyNameRow, { borderTopColor: theme.border }]}>
                                    <View style={[styles.cameraIconWrapper, { backgroundColor: ACCENT + '15' }]}>
                                        <Camera size={14} color={ACCENT} strokeWidth={1.5} />
                                    </View>
                                    <Text style={[styles.babyName, { color: theme.textPrimary }]}>
                                        האלבום של {baby.name}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
                    </ScrollView>
                </RNAnimatedView>
            </KeyboardAvoidingView>

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
                                <Text style={styles.replaceButtonText}>החלף תמונה</Text>
                            </TouchableOpacity>
                            {viewingImage && (
                                <Text style={styles.viewerMonthText}>חודש {viewingImage.month}</Text>
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
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>בחר חודש</Text>
                            <View style={{ width: 20 }} />
                        </View>
                        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                            הוסיפו תמונה לחודש 13-36
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.monthPickerScroll}
                        >
                            {Array.from({ length: 24 }, (_, i) => i + 13).map(month => (
                                <TouchableOpacity
                                    key={month}
                                    style={styles.monthPickerItem}
                                    onPress={() => {
                                        setMonthPickerOpen(false);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        handleAddCustomPhoto(month);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.monthPickerCircle,
                                        { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                                    ]}>
                                        <Text style={[styles.monthPickerNumber, { color: ACCENT }]}>{month}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
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
                                הערה לחודש {editingMonth}
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
                                <Text style={[styles.saveButton, { color: ACCENT }]}>שמור</Text>
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
                            placeholder="הוסף הערה או תיאור לתמונה..."
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
                                    <Text style={[styles.cancelButton, { color: theme.textSecondary }]}>ביטול</Text>
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                    בחר תאריך
                                </Text>
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
                                    <Text style={[styles.saveButton, { color: ACCENT }]}>שמור</Text>
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
        alignItems: 'center',
        justifyContent: 'center',
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        paddingHorizontal: 4,
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
        gap: 8,
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
    monthPickerScroll: {
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
