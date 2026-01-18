/**
 * BookingModal - מודל הזמנת בייביסיטר - Premium Minimalist Design
 */

import React, { useState, useCallback } from 'react';
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
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../../utils/designSystem';

interface BookingModalProps {
    visible: boolean;
    onClose: () => void;
    sitter: {
        id: string;
        name: string;
        hourlyRate: number;
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

    // Generate next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

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
    const totalPrice = Math.round((duration / 60) * sitter.hourlyRate);

    // Submit booking
    const handleSubmit = async () => {
        if (duration <= 0) {
            Alert.alert('שגיאה', 'שעת סיום חייבת להיות אחרי שעת התחלה');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            await addDoc(collection(db, 'bookings'), {
                parentId: user.uid,
                babysitterId: sitter.id,
                status: 'pending',
                date: selectedDate,
                startTime,
                endTime,
                hourlyRate: sitter.hourlyRate,
                estimatedAmount: totalPrice,
                notes: notes.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

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
                {/* Premium Header */}
                <Animated.View 
                    entering={ANIMATIONS.fadeInDown(0)}
                    style={[styles.header, { borderBottomColor: theme.border }]}
                >
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        activeOpacity={0.7}
                    >
                        <X size={20} color={theme.textPrimary} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)' }]}>
                            <Calendar size={20} color={theme.primary} strokeWidth={2.5} />
                        </View>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                            הזמנת {sitter.name}
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </Animated.View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Date Selection - Premium */}
                    <Animated.View 
                        entering={ANIMATIONS.fadeInDown(100)}
                        style={styles.section}
                    >
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)' }]}>
                                <Calendar size={18} color={theme.primary} strokeWidth={2} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                בחר תאריך
                            </Text>
                        </View>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.datesScrollContent}
                        >
                            {dates.map((date, i) => {
                                const formatted = formatDate(date);
                                const isSelected = selectedDate.toDateString() === date.toDateString();
                                const isToday = i === 0;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[
                                            styles.dateCard,
                                            { 
                                                backgroundColor: isSelected 
                                                    ? theme.primary 
                                                    : (isDarkMode ? theme.cardSecondary : theme.inputBackground),
                                                borderColor: isSelected ? theme.primary : theme.border,
                                            }
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedDate(date);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.dateDay,
                                            { color: isSelected ? '#fff' : theme.textSecondary }
                                        ]}>
                                            {isToday ? 'היום' : formatted.day}
                                        </Text>
                                        <Text style={[
                                            styles.dateNum,
                                            { color: isSelected ? '#fff' : theme.textPrimary }
                                        ]}>
                                            {formatted.date}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* Time Selection - Premium Range Picker */}
                    <Animated.View 
                        entering={ANIMATIONS.fadeInDown(200)}
                        style={styles.section}
                    >
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, { backgroundColor: isDarkMode ? 'rgba(48, 209, 88, 0.2)' : 'rgba(48, 209, 88, 0.1)' }]}>
                                <Clock size={18} color={theme.success} strokeWidth={2} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                שעות
                            </Text>
                        </View>
                        
                        {/* Time Range Display */}
                        <View style={[styles.timeRangeDisplay, { backgroundColor: isDarkMode ? theme.cardSecondary : theme.inputBackground, borderColor: theme.border }]}>
                            <View style={styles.timeRangeItem}>
                                <Text style={[styles.timeRangeLabel, { color: theme.textSecondary }]}>מ-</Text>
                                <View style={[styles.timeRangeValue, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.timeRangeValueText}>{startTime}</Text>
                                </View>
                            </View>
                            <View style={[styles.timeRangeArrow, { backgroundColor: theme.border }]} />
                            <View style={styles.timeRangeItem}>
                                <Text style={[styles.timeRangeLabel, { color: theme.textSecondary }]}>עד-</Text>
                                <View style={[styles.timeRangeValue, { backgroundColor: theme.success }]}>
                                    <Text style={styles.timeRangeValueText}>{endTime}</Text>
                                </View>
                            </View>
                        </View>

                        {/* All Hours Scrollable */}
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hoursScrollContent}
                        >
                            {TIME_SLOTS.map(time => {
                                const [startH] = startTime.split(':').map(Number);
                                const [endH] = endTime.split(':').map(Number);
                                const [currentH] = time.split(':').map(Number);
                                const isInRange = currentH >= startH && currentH <= endH;
                                const isStart = time === startTime;
                                const isEnd = time === endTime;
                                
                                return (
                                    <TouchableOpacity
                                        key={time}
                                        style={[
                                            styles.hourChip,
                                            {
                                                backgroundColor: isStart || isEnd
                                                    ? theme.success
                                                    : isInRange
                                                    ? (isDarkMode ? 'rgba(48, 209, 88, 0.2)' : 'rgba(48, 209, 88, 0.15)')
                                                    : (isDarkMode ? theme.cardSecondary : theme.inputBackground),
                                                borderColor: isStart || isEnd ? theme.success : theme.border,
                                                borderWidth: isStart || isEnd ? 2 : 1.5,
                                            }
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            // If clicking before start time, set as new start
                                            if (currentH < startH || (currentH === startH && time < startTime)) {
                                                setStartTime(time);
                                            } 
                                            // If clicking after end time, set as new end
                                            else if (currentH > endH || (currentH === endH && time > endTime)) {
                                                setEndTime(time);
                                            }
                                            // If clicking between, toggle start/end logic
                                            else {
                                                // If closer to start, update start
                                                if (Math.abs(currentH - startH) < Math.abs(currentH - endH)) {
                                                    setStartTime(time);
                                                } else {
                                                    setEndTime(time);
                                                }
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.hourChipText,
                                            { 
                                                color: isStart || isEnd 
                                                    ? '#fff' 
                                                    : isInRange 
                                                    ? theme.success 
                                                    : theme.textPrimary,
                                                fontWeight: isStart || isEnd ? '700' : '600',
                                            }
                                        ]}>
                                            {time}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </Animated.View>

                    {/* Notes - Premium */}
                    <Animated.View 
                        entering={ANIMATIONS.fadeInDown(300)}
                        style={styles.section}
                    >
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                            הערות (אופציונלי)
                        </Text>
                        <TextInput
                            style={[
                                styles.notesInput, 
                                { 
                                    backgroundColor: isDarkMode ? theme.cardSecondary : theme.inputBackground,
                                    color: theme.textPrimary,
                                    borderColor: theme.border,
                                }
                            ]}
                            placeholder="פרטים נוספים לבייביסיטר..."
                            placeholderTextColor={theme.textTertiary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </Animated.View>

                    {/* Summary - Premium Card */}
                    <Animated.View 
                        entering={ANIMATIONS.fadeInDown(400)}
                        style={styles.section}
                    >
                        <View style={[
                            styles.summaryCard, 
                            { 
                                backgroundColor: isDarkMode ? 'rgba(48, 209, 88, 0.15)' : 'rgba(48, 209, 88, 0.08)',
                                borderColor: isDarkMode ? 'rgba(48, 209, 88, 0.3)' : 'rgba(48, 209, 88, 0.2)',
                            }
                        ]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>משך משמרת</Text>
                                <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>
                                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} שעות
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>מחיר לשעה</Text>
                                <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>₪{sitter.hourlyRate}</Text>
                            </View>
                            <View style={[styles.summaryRow, styles.summaryTotal, { borderTopColor: isDarkMode ? 'rgba(48, 209, 88, 0.3)' : 'rgba(48, 209, 88, 0.2)' }]}>
                                <Text style={[styles.totalLabel, { color: theme.success }]}>סה"כ משוער</Text>
                                <Text style={[styles.totalValue, { color: theme.success }]}>₪{totalPrice}</Text>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>

                {/* Submit Button - Premium */}
                <Animated.View 
                    entering={ANIMATIONS.fadeInDown(500)}
                    style={[styles.footer, { borderTopColor: theme.border }]}
                >
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={[theme.primary, theme.accent]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitBtnGradient}
                        >
                            {!loading && <Send size={20} color="#fff" strokeWidth={2.5} />}
                            <Text style={styles.submitBtnText}>
                                {loading ? 'שולח...' : 'שלח בקשה'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
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
        marginBottom: 32,
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
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    datesScrollContent: {
        flexDirection: 'row-reverse',
        gap: 10,
        paddingHorizontal: 2,
    },
    dateCard: {
        width: 72,
        paddingVertical: 16,
        paddingHorizontal: 10,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 14,
        minWidth: 76,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
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
});

export default BookingModal;
