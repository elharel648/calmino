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
    ActivityIndicator,
    Alert,
    Animated as RNAnimated,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Dimensions,
    PanResponder,
} from 'react-native';
import { Award, Calendar, FileText, Plus, Trash2, Clock, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withRepeat, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addMilestone, removeMilestone } from '../../services/babyService';
import { SwipeableRow } from '../Common/SwipeableRow';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RNAnimatedView = RNAnimated.createAnimatedComponent(View);

interface Milestone {
    title: string;
    date: any;
    notes?: string;
}

interface MilestonesModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MilestonesModal({ visible, onClose }: MilestonesModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { baby, refresh } = useBabyProfile();

    const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Get milestones from baby profile
    const milestones: Milestone[] = baby?.milestones || [];

    // Swipe down animations
    const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new RNAnimated.Value(0)).current;
    const isDragging = useRef(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollOffsetY = useRef(0);
    const dragStartY = useRef(0);

    // Premium animations
    const glowAnim = useSharedValue(0);
    const sparkleAnim = useSharedValue(0);

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

            // Start premium animations
            glowAnim.value = withRepeat(
                withTiming(1, { duration: 2000 }),
                -1,
                true
            );
            sparkleAnim.value = withRepeat(
                withTiming(1, { duration: 3000 }),
                -1,
                true
            );
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropAnim.setValue(0);
            glowAnim.value = 0;
            sparkleAnim.value = 0;
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
                    handleClose();
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

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setTitle('');
        setNotes('');
        setDate(new Date());
        setActiveTab('add');
        onClose();
    };

    const handleTabChange = (tab: 'add' | 'history') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setActiveTab(tab);
    };

    // Animated styles for premium effects
    const glowStyle = useAnimatedStyle(() => {
        const opacity = interpolate(glowAnim.value, [0, 1], [0.3, 0.6]);
        return {
            opacity,
        };
    });

    const sparkleStyle = useAnimatedStyle(() => {
        const rotate = interpolate(sparkleAnim.value, [0, 1], [0, 360]);
        return {
            transform: [{ rotate: `${rotate}deg` }],
        };
    });

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('שגיאה', 'נא להזין כותרת');
            return;
        }

        if (!baby?.id) {
            Alert.alert('שגיאה', 'לא נמצא פרופיל תינוק');
            return;
        }

        setLoading(true);
        try {
            await addMilestone(baby.id, title.trim(), date);
            await refresh();

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            setTitle('');
            setNotes('');
            setDate(new Date());
            setActiveTab('history');
        } catch (error) {
            if (__DEV__) console.log('Error saving milestone:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את אבן הדרך');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (milestone: Milestone) => {
        if (!baby?.id) return;

        try {
            await removeMilestone(baby.id, milestone);
            await refresh();

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            if (__DEV__) console.log('Error deleting milestone:', error);
        }
    };

    const formatDate = (d: Date | any) => {
        const dateObj = d?.toDate ? d.toDate() : new Date(d);
        return dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatRelativeDate = (d: Date | any) => {
        const dateObj = d?.toDate ? d.toDate() : new Date(d);
        const now = new Date();
        const diffTime = now.getTime() - dateObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'היום';
        if (diffDays === 1) return 'אתמול';
        if (diffDays < 7) return `לפני ${diffDays} ימים`;
        if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
        return formatDate(d);
    };

    // Sort milestones by date (newest first)
    const sortedMilestones = [...milestones].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
    });

    // Group milestones by month
    const groupedMilestones = sortedMilestones.reduce((acc, milestone) => {
        const dateObj = milestone.date?.toDate ? milestone.date.toDate() : new Date(milestone.date);
        const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
        const monthLabel = dateObj.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

        if (!acc[monthKey]) {
            acc[monthKey] = { label: monthLabel, items: [] };
        }
        acc[monthKey].items.push(milestone);
        return acc;
    }, {} as Record<string, { label: string; items: Milestone[] }>);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleClose}>
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
                        }
                    ]}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} {...panResponder.panHandlers}>
                        <View style={[styles.dragHandleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]} />
                    </View>

                    {/* Premium Header with Gradient */}
                    <View style={[styles.header, { backgroundColor: theme.card }]} {...panResponder.panHandlers}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        )}

                        <View style={styles.headerContent}>
                            <Animated.View style={glowStyle}>
                                <LinearGradient
                                    colors={['#F59E0B', '#FBBF24', '#FCD34D']}
                                    style={styles.iconCircleGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Animated.View style={sparkleStyle}>
                                        <Sparkles size={16} color="#fff" strokeWidth={2} style={{ position: 'absolute', top: -4, right: -4 }} />
                                    </Animated.View>
                                    <Award size={28} color="#fff" strokeWidth={2.5} fill="#fff" />
                                </LinearGradient>
                            </Animated.View>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>אבני דרך</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>תעדו את הרגעים המיוחדים</Text>
                        </View>
                    </View>

                    {/* Premium Tabs with Gradient */}
                    <View style={styles.tabContainerWrapper} {...panResponder.panHandlers}>
                        {Platform.OS === 'ios' && (
                            <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        )}
                        <View style={[styles.tabContainer, { backgroundColor: isDarkMode ? 'rgba(44, 44, 46, 0.6)' : 'rgba(243, 244, 246, 0.8)' }]}>
                            <TouchableOpacity
                                style={styles.tab}
                                onPress={() => handleTabChange('add')}
                                activeOpacity={0.7}
                            >
                                {activeTab === 'add' ? (
                                    <LinearGradient
                                        colors={['#F59E0B', '#FBBF24']}
                                        style={styles.tabActiveGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Plus size={18} color="#fff" strokeWidth={2.5} />
                                        <Text style={styles.tabTextActive}>הוסף חדש</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.tabInactive}>
                                        <Plus size={18} color={theme.textSecondary} strokeWidth={2} />
                                        <Text style={[styles.tabText, { color: theme.textSecondary }]}>הוסף חדש</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.tab}
                                onPress={() => handleTabChange('history')}
                                activeOpacity={0.7}
                            >
                                {activeTab === 'history' ? (
                                    <LinearGradient
                                        colors={['#F59E0B', '#FBBF24']}
                                        style={styles.tabActiveGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Clock size={18} color="#fff" strokeWidth={2.5} />
                                        <Text style={styles.tabTextActive}>היסטוריה ({milestones.length})</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={styles.tabInactive}>
                                        <Clock size={18} color={theme.textSecondary} strokeWidth={2} />
                                        <Text style={[styles.tabText, { color: theme.textSecondary }]}>היסטוריה ({milestones.length})</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        onScroll={(e) => {
                            scrollOffsetY.current = e.nativeEvent.contentOffset.y;
                        }}
                        scrollEventThrottle={16}
                    >
                        {activeTab === 'add' ? (
                            /* Add Tab - Minimalist */
                            <View style={styles.inputSection}>
                                {/* Title Row - Premium */}
                                <View style={styles.rowMinimal}>
                                    <View style={styles.inputWrapper}>
                                        {Platform.OS === 'ios' && (
                                            <BlurView intensity={15} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                                        )}
                                        <LinearGradient
                                            colors={isDarkMode
                                                ? ['rgba(44, 44, 46, 0.8)', 'rgba(44, 44, 46, 0.6)']
                                                : ['rgba(245, 245, 245, 0.9)', 'rgba(245, 245, 245, 0.7)']
                                            }
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <TextInput
                                            style={[styles.inputMinimal, { color: theme.textPrimary }]}
                                            value={title}
                                            onChangeText={setTitle}
                                            placeholder="למשל: צעד ראשון"
                                            placeholderTextColor={theme.textSecondary}
                                            textAlign="center"
                                        />
                                    </View>
                                    <Text style={[styles.labelMinimal, { color: theme.textPrimary }]}>כותרת</Text>
                                </View>

                                {/* Date Row - Premium */}
                                <View style={styles.rowMinimal}>
                                    <TouchableOpacity
                                        style={styles.inputWrapper}
                                        onPress={() => {
                                            setShowDatePicker(true);
                                            if (Platform.OS !== 'web') {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        {Platform.OS === 'ios' && (
                                            <BlurView intensity={15} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                                        )}
                                        <LinearGradient
                                            colors={isDarkMode
                                                ? ['rgba(44, 44, 46, 0.8)', 'rgba(44, 44, 46, 0.6)']
                                                : ['rgba(245, 245, 245, 0.9)', 'rgba(245, 245, 245, 0.7)']
                                            }
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.dateInputContent}>
                                            <Calendar size={18} color={theme.textSecondary} strokeWidth={2} />
                                            <Text style={[styles.dateTextMinimal, { color: theme.textPrimary }]}>
                                                {formatDate(date)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={[styles.labelMinimal, { color: theme.textPrimary }]}>תאריך</Text>
                                </View>

                                {/* Notes Row - Premium */}
                                <View style={styles.rowMinimal}>
                                    <View style={styles.inputWrapper}>
                                        {Platform.OS === 'ios' && (
                                            <BlurView intensity={15} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                                        )}
                                        <LinearGradient
                                            colors={isDarkMode
                                                ? ['rgba(44, 44, 46, 0.8)', 'rgba(44, 44, 46, 0.6)']
                                                : ['rgba(245, 245, 245, 0.9)', 'rgba(245, 245, 245, 0.7)']
                                            }
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <TextInput
                                            style={[styles.notesInputMinimal, { color: theme.textPrimary }]}
                                            value={notes}
                                            onChangeText={setNotes}
                                            placeholder="הערות..."
                                            placeholderTextColor={theme.textSecondary}
                                            textAlign="right"
                                            multiline
                                            numberOfLines={2}
                                        />
                                    </View>
                                    <Text style={[styles.labelMinimal, { color: theme.textPrimary }]}>הערות</Text>
                                </View>

                                {/* Save Button - Premium Gradient */}
                                <TouchableOpacity
                                    style={[styles.saveBtnWrapper, { opacity: !title.trim() || loading ? 0.5 : 1 }]}
                                    onPress={handleSave}
                                    disabled={!title.trim() || loading}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#34D399', '#10B981', '#059669']}
                                        style={styles.saveBtnGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Award size={20} color="#fff" strokeWidth={2.5} fill="#fff" />
                                                <Text style={styles.saveBtnTextGreen}>שמור אבן דרך</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            /* History Tab */
                            <View style={styles.historySection}>
                                {milestones.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        {Platform.OS === 'ios' && (
                                            <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                                        )}
                                        <LinearGradient
                                            colors={isDarkMode
                                                ? ['rgba(254, 243, 199, 0.1)', 'rgba(254, 243, 199, 0.05)']
                                                : ['rgba(254, 243, 199, 0.3)', 'rgba(254, 243, 199, 0.1)']
                                            }
                                            style={styles.emptyIconGradient}
                                        >
                                            <Animated.View style={sparkleStyle}>
                                                <Sparkles size={24} color="#F59E0B" strokeWidth={2} style={{ position: 'absolute', top: -8, right: -8 }} />
                                            </Animated.View>
                                            <Award size={40} color="#F59E0B" strokeWidth={2.5} fill="#F59E0B" />
                                        </LinearGradient>
                                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                                            אין אבני דרך עדיין
                                        </Text>
                                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                            לחץ על "הוסף חדש" כדי לתעד את הרגעים המיוחדים
                                        </Text>
                                    </View>
                                ) : (
                                    Object.values(groupedMilestones).map((group, groupIndex) => (
                                        <View key={groupIndex} style={styles.monthGroup}>
                                            <Text style={[styles.monthLabel, { color: theme.textSecondary }]}>
                                                {group.label}
                                            </Text>
                                            {group.items.map((milestone, index) => (
                                                <SwipeableRow key={index} onDelete={() => handleDelete(milestone)}>
                                                    <View style={styles.milestoneCardWrapper}>
                                                        {Platform.OS === 'ios' && (
                                                            <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                                                        )}
                                                        <LinearGradient
                                                            colors={isDarkMode
                                                                ? ['rgba(44, 44, 46, 0.9)', 'rgba(44, 44, 46, 0.7)']
                                                                : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']
                                                            }
                                                            style={StyleSheet.absoluteFill}
                                                        />
                                                        <View style={styles.milestoneCard}>
                                                            <View style={styles.milestoneHeader}>
                                                                <View style={styles.milestoneInfo}>
                                                                    <LinearGradient
                                                                        colors={['#FEF3C7', '#FDE68A', '#FCD34D']}
                                                                        style={styles.milestoneBadgeGradient}
                                                                        start={{ x: 0, y: 0 }}
                                                                        end={{ x: 1, y: 1 }}
                                                                    >
                                                                        <Award size={18} color="#F59E0B" strokeWidth={2.5} fill="#F59E0B" />
                                                                    </LinearGradient>
                                                                    <View style={styles.milestoneTexts}>
                                                                        <Text style={[styles.milestoneTitle, { color: theme.textPrimary }]}>
                                                                            {milestone.title}
                                                                        </Text>
                                                                        <View style={styles.milestoneDateRow}>
                                                                            <Calendar size={12} color={theme.textSecondary} strokeWidth={2} />
                                                                            <Text style={[styles.milestoneDate, { color: theme.textSecondary }]}>
                                                                                {formatDate(milestone.date)} • {formatRelativeDate(milestone.date)}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                            {milestone.notes ? (
                                                                <View style={[styles.milestoneNotesContainer, { borderTopColor: theme.border }]}>
                                                                    <FileText size={14} color={theme.textSecondary} strokeWidth={2} />
                                                                    <Text style={[styles.milestoneNotes, { color: theme.textSecondary }]}>
                                                                        {milestone.notes}
                                                                    </Text>
                                                                </View>
                                                            ) : null}
                                                        </View>
                                                    </View>
                                                </SwipeableRow>
                                            ))}
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Date Picker */}
                    {showDatePicker && (
                        <View style={styles.datePickerContainer}>
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                        setDate(selectedDate);
                                    }
                                }}
                            />
                        </View>
                    )}
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
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 44,
        maxHeight: '95%',
        flex: 1,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 20,
        paddingHorizontal: 50,
        zIndex: 10,
        minHeight: 50,
    },
    dragHandleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    header: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 24,
        paddingHorizontal: 24,
        borderRadius: 0,
        overflow: 'hidden',
        position: 'relative',
    },
    headerContent: {
        alignItems: 'center',
        gap: 12,
        zIndex: 1,
    },
    iconCircleGradient: {
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
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.7,
        marginTop: -4,
    },
    tabContainerWrapper: {
        marginHorizontal: 24,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    tabContainer: {
        flexDirection: 'row-reverse',
        borderRadius: 16,
        padding: 6,
        overflow: 'hidden',
    },
    tab: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    tabActiveGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    tabInactive: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
    },
    tabTextActive: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    content: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        flexGrow: 1,
        width: '100%',
    },
    inputSection: {
        paddingBottom: 20,
    },
    iconCircleWrapper: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dateInput: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'right',
    },
    textArea: {
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    saveBtn: {
        backgroundColor: '#F59E0B',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    historySection: {
        paddingBottom: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 50,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        marginVertical: 20,
    },
    emptyIconGradient: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        position: 'relative',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    monthGroup: {
        marginBottom: 20,
    },
    monthLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
    },
    milestoneCardWrapper: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    milestoneCard: {
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    milestoneHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    milestoneInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    milestoneBadgeGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    milestoneTexts: {
        flex: 1,
        alignItems: 'flex-end',
    },
    milestoneTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    milestoneDateRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    milestoneDate: {
        fontSize: 13,
        fontWeight: '500',
    },
    milestoneNotesContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    milestoneNotes: {
        flex: 1,
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'right',
    },
    deleteBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    deleteBtnGradient: {
        padding: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Minimalist styles
    rowMinimal: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    labelMinimal: {
        fontSize: 15,
        fontWeight: '600',
        width: 65,
        textAlign: 'right',
    },
    inputWrapper: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    inputMinimal: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 18,
        fontSize: 16,
        justifyContent: 'center',
        zIndex: 1,
    },
    dateInputContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        paddingHorizontal: 18,
        zIndex: 1,
    },
    dateTextMinimal: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    notesInputMinimal: {
        flex: 1,
        minHeight: 70,
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 15,
        textAlignVertical: 'top',
        zIndex: 1,
    },
    saveBtnWrapper: {
        borderRadius: 18,
        marginTop: 12,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    saveBtnGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 18,
        borderRadius: 18,
    },
    saveBtnTextGreen: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    datePickerContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
});
