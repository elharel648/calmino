/**
 * BookingModal - מודל הזמנת בייביסיטר - Premium Minimalist Design
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { X, Calendar, Clock, Check, Send, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../../utils/designSystem';
import { getBabysitterBookings } from '../../services/babysitterService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getUserPushToken, sendPushNotification } from '../../services/pushNotificationService';

interface BookingModalProps {
    visible: boolean;
    onClose: () => void;
    sitter: {
        id: string;
        name: string;
        verified: boolean;
        image?: string;
    };
    onSuccess?: () => void;
}

// Generate time slots from 6:00 to 23:00
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return `${hour.toString().padStart(2, '0')}:00`;
});

const BookingModal: React.FC<BookingModalProps> = ({
    visible,
    onClose,
    sitter,
    onSuccess,
}) => {
    const { theme, isDarkMode } = useTheme();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState<string>('18:00');
    const [endTime, setEndTime] = useState<string>('22:00');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [sitterBookings, setSitterBookings] = useState<any[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(true);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    // Convert HH:MM string to Date object
    const getDateFromTime = (timeString: string): Date => {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    // Convert Date to HH:MM string
    const getTimeFromDate = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Fetch sitter bookings to check availability
    useEffect(() => {
        const fetchSitterBookings = async () => {
            if (!sitter.id) return;
            setLoadingAvailability(true);
            try {
                // Query only confirmed bookings (these block availability)
                const confirmedQuery = query(
                    collection(db, 'bookings'),
                    where('babysitterId', '==', sitter.id),
                    where('status', '==', 'confirmed')
                );

                // Query only active bookings
                const activeQuery = query(
                    collection(db, 'bookings'),
                    where('babysitterId', '==', sitter.id),
                    where('status', '==', 'active')
                );

                // Execute both queries in parallel
                const [confirmedSnapshot, activeSnapshot] = await Promise.all([
                    getDocs(confirmedQuery).catch(() => ({ docs: [] })),
                    getDocs(activeQuery).catch(() => ({ docs: [] }))
                ]);

                // Combine results
                const allBookings = [
                    ...confirmedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                    ...activeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                ];

                setSitterBookings(allBookings);
            } catch (error) {
                console.error('Error fetching sitter bookings:', error);
                // If query fails, set empty array (availability check will be disabled)
                setSitterBookings([]);
            } finally {
                setLoadingAvailability(false);
            }
        };

        if (visible) {
            fetchSitterBookings();
        }
    }, [sitter.id, visible]);

    // Generate next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

    // Check if a date has any bookings
    const isDateBooked = (date: Date): boolean => {
        const dateStr = date.toDateString();
        return sitterBookings.some(booking => {
            const bookingDate = booking.date?.toDate?.() || new Date(booking.date);
            return bookingDate.toDateString() === dateStr;
        });
    };

    // Check if a time slot conflicts with existing bookings
    const isTimeSlotAvailable = (time: string, date: Date): boolean => {
        const dateStr = date.toDateString();
        const [hour] = time.split(':').map(Number);

        return !sitterBookings.some(booking => {
            const bookingDate = booking.date?.toDate?.() || new Date(booking.date);
            if (bookingDate.toDateString() !== dateStr) return false;

            const [bookingStart] = booking.startTime.split(':').map(Number);
            const [bookingEnd] = booking.endTime.split(':').map(Number);

            // Check if time overlaps with booking
            return hour >= bookingStart && hour < bookingEnd;
        });
    };

    // Format date for display
    const formatDate = (date: Date) => {
        const days = ['יום א\'', 'יום ב\'', 'יום ג\'', 'יום ד\'', 'יום ה\'', 'יום ו\'', 'שבת'];
        const day = days[date.getDay()];
        const dayNum = date.getDate();
        const month = date.getMonth() + 1;
        return { day, date: `${dayNum}/${month}` };
    };

    // Calculate duration and price
    const calculateDuration = useCallback(() => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const duration = endMinutes - startMinutes;
        return duration > 0 ? duration : 0;
    }, [startTime, endTime]);

    const duration = calculateDuration();

    // Submit booking
    const handleSubmit = async () => {
        // Validation checks
        if (duration <= 0) {
            Alert.alert('שגיאה', 'שעת סיום חייבת להיות אחרי שעת התחלה');
            return;
        }

        // Check if date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateOnly = new Date(selectedDate);
        selectedDateOnly.setHours(0, 0, 0, 0);

        if (selectedDateOnly < today) {
            Alert.alert('שגיאה', 'לא ניתן להזמין לתאריך בעבר');
            return;
        }

        // Check availability before submitting
        const dateStr = selectedDate.toDateString();
        const [startH] = startTime.split(':').map(Number);
        const [endH] = endTime.split(':').map(Number);

        const hasConflict = sitterBookings.some(booking => {
            const bookingDate = booking.date?.toDate?.() || new Date(booking.date);
            if (bookingDate.toDateString() !== dateStr) return false;

            const [bookingStart] = booking.startTime.split(':').map(Number);
            const [bookingEnd] = booking.endTime.split(':').map(Number);

            // Check if time ranges overlap
            return (startH < bookingEnd && endH > bookingStart);
        });

        if (hasConflict) {
            Alert.alert(
                'לא זמין',
                'הבייביסיטר תפוס בשעות האלה. אנא בחר/י תאריך או שעות אחרות.',
                [{ text: 'אוקיי' }]
            );
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            // Convert Date to Timestamp for Firestore
            const bookingRef = await addDoc(collection(db, 'bookings'), {
                parentId: user.uid,
                babysitterId: sitter.id,
                status: 'pending',
                date: Timestamp.fromDate(selectedDate), // Fixed: Convert Date to Timestamp
                startTime,
                endTime,
                notes: notes.trim() || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Send push notification to sitter
            try {
                const sitterToken = await getUserPushToken(sitter.id);
                if (sitterToken) {
                    const parentDoc = await getDoc(doc(db, 'users', user.uid));
                    const parentName = parentDoc.data()?.displayName || 'הורה';

                    const formattedDate = formatDate(selectedDate);
                    await sendPushNotification(
                        sitterToken,
                        '📅 הזמנה חדשה!',
                        `${parentName} רוצה להזמין אותך ל-${formattedDate.date} בשעה ${startTime}-${endTime}`,
                        {
                            type: 'booking_new',
                            bookingId: bookingRef.id,
                            channelId: 'booking'
                        }
                    );
                }
            } catch (pushError) {
                console.warn('Failed to send push notification:', pushError);
                // Don't fail the booking if push fails
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                '✅ בקשה נשלחה!',
                `הבקשה נשלחה ל${sitter.name}. תקבל/י עדכון כש${sitter.name} תאשר.`,
                [{ text: 'מעולה', onPress: () => { onClose(); onSuccess?.(); } }]
            );
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לשלוח את הבקשה. נסה שוב.');
        } finally {
            setLoading(false);
        }
    };

    // Render content function
    const renderContent = () => {
        return (
            <>
                {/* Ultra Minimalist Header */}
                <Animated.View
                    entering={ANIMATIONS.fadeInDown(0)}
                    style={styles.minimalHeader}
                >
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.minimalCloseBtn}
                        activeOpacity={0.6}
                    >
                        <X size={22} color={theme.textPrimary} strokeWidth={2} />
                    </TouchableOpacity>
                    <Text style={[styles.minimalHeaderTitle, { color: theme.textPrimary }]}>
                        הזמנת {sitter.name}
                    </Text>
                    <View style={{ width: 34 }} />
                </Animated.View>

                <ScrollView style={styles.minimalContent} showsVerticalScrollIndicator={false}>
                    {/* Ultra Minimalist Date Selection */}
                    <Animated.View
                        entering={ANIMATIONS.fadeInDown(100)}
                        style={styles.minimalSection}
                    >
                        <Text style={[styles.minimalLabel, { color: theme.textSecondary }]}>
                            תאריך
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.minimalDatesScroll}
                        >
                            {dates.map((date, i) => {
                                const formatted = formatDate(date);
                                const isSelected = selectedDate.toDateString() === date.toDateString();
                                const isToday = i === 0;
                                const isBooked = isDateBooked(date);
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.minimalDateCard,
                                            {
                                                backgroundColor: isSelected
                                                    ? theme.primary
                                                    : isBooked
                                                        ? (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)')
                                                        : 'transparent',
                                                borderColor: isSelected
                                                    ? theme.primary
                                                    : isBooked
                                                        ? 'rgba(239, 68, 68, 0.3)'
                                                        : theme.border,
                                                opacity: isBooked && !isSelected ? 0.5 : 1,
                                            }
                                        ]}
                                        onPress={() => {
                                            if (isBooked) {
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                Alert.alert('תאריך תפוס', 'המטפל לא זמין בתאריך זה');
                                                return;
                                            }
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedDate(date);
                                        }}
                                        activeOpacity={0.7}
                                        disabled={isBooked}
                                    >
                                        <Text style={[
                                            styles.minimalDateDay,
                                            { color: isSelected ? '#fff' : theme.textSecondary }
                                        ]}>
                                            {isToday ? 'היום' : formatted.day}
                                        </Text>
                                        <Text style={[
                                            styles.minimalDateNum,
                                            { color: isSelected ? '#fff' : theme.textPrimary }
                                        ]}>
                                            {formatted.date}
                                        </Text>
                                        {isBooked && !isSelected && (
                                            <Text style={[styles.minimalDateBooked, { color: 'rgba(239, 68, 68, 0.6)' }]}>
                                                תפוס
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* Ultra Minimalist Time Selection */}
                    <Animated.View
                        entering={ANIMATIONS.fadeInDown(200)}
                        style={styles.minimalSection}
                    >
                        <Text style={[styles.minimalLabel, { color: theme.textSecondary }]}>
                            שעות
                        </Text>

                        {/* iOS Style Time Picker Buttons */}
                        <View style={styles.minimalTimeRow}>
                            <TouchableOpacity
                                style={[
                                    styles.minimalTimeButton,
                                    {
                                        backgroundColor: isDarkMode ? theme.cardSecondary : theme.inputBackground,
                                        borderColor: theme.border,
                                    }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowStartTimePicker(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.minimalTimeLabel, { color: theme.textSecondary }]}>מ-</Text>
                                <Text style={[styles.minimalTimeValue, { color: theme.textPrimary }]}>{startTime}</Text>
                            </TouchableOpacity>

                            <View style={[styles.minimalTimeDivider, { backgroundColor: theme.border }]} />

                            <TouchableOpacity
                                style={[
                                    styles.minimalTimeButton,
                                    {
                                        backgroundColor: isDarkMode ? theme.cardSecondary : theme.inputBackground,
                                        borderColor: theme.border,
                                    }
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowEndTimePicker(true);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.minimalTimeLabel, { color: theme.textSecondary }]}>עד-</Text>
                                <Text style={[styles.minimalTimeValue, { color: theme.textPrimary }]}>{endTime}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Ultra Minimalist Notes */}
                    <Animated.View
                        entering={ANIMATIONS.fadeInDown(300)}
                        style={styles.minimalSection}
                    >
                        <Text style={[styles.minimalLabel, { color: theme.textSecondary }]}>
                            הערות (אופציונלי)
                        </Text>
                        <TextInput
                            style={[
                                styles.minimalNotesInput,
                                {
                                    backgroundColor: isDarkMode ? theme.cardSecondary : theme.inputBackground,
                                    color: theme.textPrimary,
                                    borderColor: theme.border,
                                }
                            ]}
                            placeholder="פרטים נוספים..."
                            placeholderTextColor={theme.textTertiary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </Animated.View>

                    {/* Ultra Minimalist Summary */}
                    <Animated.View
                        entering={ANIMATIONS.fadeInDown(400)}
                        style={styles.minimalSection}
                    >
                        <View style={styles.minimalSummary}>
                            <View style={styles.minimalSummaryRow}>
                                <Text style={[styles.minimalSummaryLabel, { color: theme.textSecondary }]}>משך</Text>
                                <Text style={[styles.minimalSummaryValue, { color: theme.textPrimary }]}>
                                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} שעות
                                </Text>
                            </View>
                            <View style={[styles.minimalSummaryDivider, { backgroundColor: theme.border }]} />
                        </View>
                    </Animated.View>
                </ScrollView>

                {/* Ultra Minimalist Submit Button */}
                <Animated.View
                    entering={ANIMATIONS.fadeInDown(500)}
                    style={styles.minimalFooter}
                >
                    <TouchableOpacity
                        style={[
                            styles.minimalSubmitBtn,
                            { backgroundColor: theme.primary },
                            loading && styles.minimalSubmitBtnDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.minimalSubmitBtnText}>
                            {loading ? 'שולח...' : 'שלח בקשה'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* iOS Time Picker Modals */}
                {Platform.OS === 'ios' && (
                    <>
                        {/* Start Time Picker */}
                        <Modal
                            visible={showStartTimePicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowStartTimePicker(false)}
                        >
                            <View style={styles.timePickerOverlay}>
                                <View style={[styles.timePickerContainer, { backgroundColor: isDarkMode ? theme.card : '#fff' }]}>
                                    <View style={styles.timePickerDragHandle}>
                                        <View style={[styles.timePickerDragBar, { backgroundColor: theme.border }]} />
                                    </View>
                                    <View style={[styles.timePickerHeader, { borderBottomColor: theme.border }]}>
                                        <TouchableOpacity onPress={() => setShowStartTimePicker(false)} style={styles.timePickerCancelBtn}>
                                            <Text style={[styles.timePickerCancelText, { color: theme.textSecondary }]}>ביטול</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.timePickerTitle, { color: theme.textPrimary }]}>שעת התחלה</Text>
                                        <TouchableOpacity onPress={() => setShowStartTimePicker(false)} style={styles.timePickerDoneBtn}>
                                            <Text style={[styles.timePickerDoneText, { color: theme.primary }]}>אישור</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={getDateFromTime(startTime)}
                                        mode="time"
                                        is24Hour={true}
                                        display="spinner"
                                        onChange={(event, date) => {
                                            if (date && event.type !== 'dismissed') {
                                                const newTime = getTimeFromDate(date);
                                                setStartTime(newTime);
                                            }
                                        }}
                                        locale="he-IL"
                                        textColor={theme.textPrimary}
                                        style={styles.timePicker}
                                    />
                                </View>
                            </View>
                        </Modal>

                        {/* End Time Picker */}
                        <Modal
                            visible={showEndTimePicker}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={() => setShowEndTimePicker(false)}
                        >
                            <View style={styles.timePickerOverlay}>
                                <View style={[styles.timePickerContainer, { backgroundColor: isDarkMode ? theme.card : '#fff' }]}>
                                    <View style={styles.timePickerDragHandle}>
                                        <View style={[styles.timePickerDragBar, { backgroundColor: theme.border }]} />
                                    </View>
                                    <View style={[styles.timePickerHeader, { borderBottomColor: theme.border }]}>
                                        <TouchableOpacity onPress={() => setShowEndTimePicker(false)} style={styles.timePickerCancelBtn}>
                                            <Text style={[styles.timePickerCancelText, { color: theme.textSecondary }]}>ביטול</Text>
                                        </TouchableOpacity>
                                        <Text style={[styles.timePickerTitle, { color: theme.textPrimary }]}>שעת סיום</Text>
                                        <TouchableOpacity onPress={() => setShowEndTimePicker(false)} style={styles.timePickerDoneBtn}>
                                            <Text style={[styles.timePickerDoneText, { color: theme.primary }]}>אישור</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <DateTimePicker
                                        value={getDateFromTime(endTime)}
                                        mode="time"
                                        is24Hour={true}
                                        display="spinner"
                                        onChange={(event, date) => {
                                            if (date && event.type !== 'dismissed') {
                                                const newTime = getTimeFromDate(date);
                                                setEndTime(newTime);
                                            }
                                        }}
                                        locale="he-IL"
                                        textColor={theme.textPrimary}
                                        style={styles.timePicker}
                                    />
                                </View>
                            </View>
                        </Modal>
                    </>
                )}

                {/* Android Time Pickers */}
                {Platform.OS === 'android' && (
                    <>
                        {showStartTimePicker && (
                            <DateTimePicker
                                value={getDateFromTime(startTime)}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={(event, date) => {
                                    setShowStartTimePicker(false);
                                    if (date && event.type !== 'dismissed') {
                                        const newTime = getTimeFromDate(date);
                                        setStartTime(newTime);
                                    }
                                }}
                            />
                        )}
                        {showEndTimePicker && (
                            <DateTimePicker
                                value={getDateFromTime(endTime)}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={(event, date) => {
                                    setShowEndTimePicker(false);
                                    if (date && event.type !== 'dismissed') {
                                        const newTime = getTimeFromDate(date);
                                        setEndTime(newTime);
                                    }
                                }}
                            />
                        )}
                    </>
                )}
            </>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            {Platform.OS === 'ios' ? (
                <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.blurContainer}>
                    <View style={[styles.container, { backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
                        {renderContent()}
                    </View>
                </BlurView>
            ) : (
                <View style={[styles.container, { backgroundColor: theme.background }]}>
                    {renderContent()}
                </View>
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    timeSelectionHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    selectedTimeRange: {
        fontSize: 14,
        fontWeight: '600',
    },
    datesScrollContent: {
        flexDirection: 'row-reverse',
        gap: 10,
        paddingHorizontal: 2,
    },
    dateCard: {
        width: 76,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    dateDay: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    dateNum: {
        fontSize: 17,
        fontWeight: '700',
        marginTop: 4,
        letterSpacing: -0.3,
    },
    timeRangeDisplay: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 18,
        borderWidth: 1.5,
        marginBottom: 18,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    timeRangeItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    timeRangeLabel: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    timeRangeValue: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        minWidth: 84,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    timeRangeValueText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    timeRangeArrow: {
        width: 24,
        height: 2,
        borderRadius: 1,
    },
    hoursScrollContent: {
        flexDirection: 'row-reverse',
        gap: 10,
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    hourChip: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    hourChipText: {
        fontSize: 15,
        letterSpacing: -0.3,
    },
    notesInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        minHeight: 100,
        textAlign: 'right',
        textAlignVertical: 'top',
        borderWidth: 1.5,
        lineHeight: 22,
    },
    summaryCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    summaryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    summaryTotal: {
        borderTopWidth: 1.5,
        paddingTop: 16,
        marginTop: 4,
        marginBottom: 0,
    },
    totalLabel: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    submitBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    submitBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    // Ultra Minimalist Premium Styles
    minimalHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 24,
    },
    minimalCloseBtn: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    minimalHeaderTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    minimalContent: {
        flex: 1,
        paddingHorizontal: 24,
    },
    minimalSection: {
        marginBottom: 40,
    },
    minimalLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    minimalDatesScroll: {
        flexDirection: 'row-reverse',
        gap: 12,
        paddingHorizontal: 2,
    },
    minimalDateCard: {
        width: 80,
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
    },
    minimalDateDay: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
        marginBottom: 6,
    },
    minimalDateNum: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    minimalDateBooked: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 0.3,
    },
    minimalTimeRow: {
        flexDirection: 'row-reverse',
        gap: 16,
        marginBottom: 20,
    },
    minimalTimeButton: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 16,
        borderWidth: 2,
    },
    minimalTimeLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    minimalTimeValue: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    minimalTimeDivider: {
        width: 1,
        alignSelf: 'stretch',
    },
    minimalHoursScroll: {
        flexDirection: 'row-reverse',
        gap: 8,
        paddingHorizontal: 2,
    },
    minimalHourChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 64,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    minimalHourChipText: {
        fontSize: 14,
        letterSpacing: -0.2,
    },
    minimalNotesInput: {
        borderRadius: 16,
        padding: 20,
        fontSize: 16,
        minHeight: 120,
        textAlign: 'right',
        textAlignVertical: 'top',
        borderWidth: 2,
        lineHeight: 24,
    },
    minimalSummary: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 2,
    },
    minimalSummaryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    minimalSummaryDivider: {
        height: 1,
        width: '100%',
    },
    minimalSummaryLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    minimalSummaryValue: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    minimalSummaryTotalLabel: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    minimalSummaryTotalValue: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    minimalFooter: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    minimalSubmitBtn: {
        borderRadius: 16,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    minimalSubmitBtnDisabled: {
        opacity: 0.5,
    },
    minimalSubmitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    // Time Picker Modal Styles
    timePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    timePickerContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    timePickerDragHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    timePickerDragBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    timePickerHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    timePickerCancelBtn: {
        minWidth: 60,
    },
    timePickerCancelText: {
        fontSize: 16,
        textAlign: 'right',
    },
    timePickerTitle: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
    },
    timePickerDoneBtn: {
        minWidth: 60,
    },
    timePickerDoneText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'left',
    },
    timePicker: {
        height: 200,
        width: '100%',
    },
});

export default BookingModal;
