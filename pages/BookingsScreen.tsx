/**
 * BookingsScreen - מסך רשימת הזמנות בייביסיטר
 * מציג הזמנות עבר ועתיד, מאפשר ניהול והמשך לצ'אט
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, AlertCircle, MessageSquare, Star } from 'lucide-react-native';
import { auth } from '../services/firebaseConfig';
import { getParentBookings, updateBookingStatus } from '../services/babysitterService';
import { Booking } from '../services/bookingService';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

type BookingTab = 'upcoming' | 'past' | 'all';

const BookingsScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');

    // Load bookings
    const loadBookings = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        try {
            setLoading(true);
            const result = await getParentBookings(userId);
            setBookings(result);
        } catch (error) {
            console.error('Error loading bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadBookings();
        }, [loadBookings])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadBookings();
    }, [loadBookings]);

    const handleCancelBooking = async (bookingId: string) => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        try {
            await updateBookingStatus(bookingId, 'cancelled');
            loadBookings();
        } catch (error) {
            console.error('Error cancelling booking:', error);
        }
    };

    const handleChatWithSitter = (booking: Booking) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        navigation.navigate('ChatScreen', {
            sitterId: booking.sitterId,
            sitterName: booking.sitterName,
            sitterImage: null,
        });
    };

    const handleRateBooking = (booking: Booking) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        navigation.navigate('RatingScreen', {
            bookingId: booking.id,
            sitterId: booking.sitterId,
            sitterName: booking.sitterName,
        });
    };

    // Filter bookings based on tab
    const filteredBookings = bookings.filter(booking => {
        const bookingDate = booking.date.toDate();
        const now = new Date();

        if (activeTab === 'upcoming') {
            return bookingDate >= now && booking.status !== 'cancelled' && booking.status !== 'completed';
        } else if (activeTab === 'past') {
            return bookingDate < now || booking.status === 'cancelled' || booking.status === 'completed';
        }
        return true; // all
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return theme.warning;
            case 'confirmed': return theme.success;
            case 'active': return theme.primary;
            case 'completed': return '#6B7280';
            case 'cancelled': return '#EF4444';
            case 'declined': return '#EF4444';
            default: return theme.textSecondary;
        }
    };

    const getStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            pending: 'ממתין לאישור',
            confirmed: 'אושר',
            active: 'פעיל',
            completed: 'הושלם',
            cancelled: 'בוטל',
            declined: 'נדחה',
        };
        return statusMap[status] || status;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return AlertCircle;
            case 'confirmed': return CheckCircle;
            case 'active': return Clock;
            case 'completed': return CheckCircle;
            case 'cancelled': return XCircle;
            case 'declined': return XCircle;
            default: return AlertCircle;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>ההזמנות שלי</Text>

                {/* Tabs */}
                <View style={[styles.tabs, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'upcoming' && [styles.activeTab, { backgroundColor: theme.primary }]]}
                        onPress={() => {
                            setActiveTab('upcoming');
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="הזמנות עתידיות"
                    >
                        <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
                            עתידיות
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'past' && [styles.activeTab, { backgroundColor: theme.primary }]]}
                        onPress={() => {
                            setActiveTab('past');
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="הזמנות עבר"
                    >
                        <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
                            עבר
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'all' && [styles.activeTab, { backgroundColor: theme.primary }]]}
                        onPress={() => {
                            setActiveTab('all');
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="כל ההזמנות"
                    >
                        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                            הכל
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textSecondary }]}>טוען הזמנות...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.primary}
                        />
                    }
                >
                    {filteredBookings.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Calendar size={48} color={theme.textTertiary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                {activeTab === 'upcoming' ? 'אין הזמנות עתידיות' :
                                 activeTab === 'past' ? 'אין הזמנות עבר' :
                                 'אין הזמנות'}
                            </Text>
                            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                                ההזמנות שלך יופיעו כאן
                            </Text>
                        </View>
                    ) : (
                        filteredBookings.map((booking) => {
                            const StatusIcon = getStatusIcon(booking.status);
                            const statusColor = getStatusColor(booking.status);

                            return (
                                <View
                                    key={booking.id}
                                    style={[styles.bookingCard, {
                                        backgroundColor: theme.card,
                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    }]}
                                >
                                    {/* Status Badge */}
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                                        <StatusIcon size={14} color={statusColor} strokeWidth={2} />
                                        <Text style={[styles.statusText, { color: statusColor }]}>
                                            {getStatusText(booking.status)}
                                        </Text>
                                    </View>

                                    {/* Sitter Info */}
                                    <View style={styles.sitterInfo}>
                                        <Text style={[styles.sitterName, { color: theme.textPrimary }]}>
                                            {booking.sitterName}
                                        </Text>
                                    </View>

                                    {/* Booking Details */}
                                    <View style={styles.detailsContainer}>
                                        <View style={styles.detailRow}>
                                            <Calendar size={16} color={theme.textSecondary} />
                                            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                                                {booking.date.toDate().toLocaleDateString('he-IL', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Clock size={16} color={theme.textSecondary} />
                                            <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                                                {booking.startTime} - {booking.endTime}
                                            </Text>
                                        </View>

                                        {booking.totalPrice && (
                                            <View style={styles.detailRow}>
                                                <DollarSign size={16} color={theme.success} />
                                                <Text style={[styles.detailText, { color: theme.success, fontWeight: '600' }]}>
                                                    ₪{booking.totalPrice.toFixed(2)}
                                                </Text>
                                            </View>
                                        )}

                                        {booking.notes && (
                                            <View style={styles.notesContainer}>
                                                <Text style={[styles.notesLabel, { color: theme.textTertiary }]}>הערות:</Text>
                                                <Text style={[styles.notesText, { color: theme.textSecondary }]}>
                                                    {booking.notes}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Actions */}
                                    <View style={styles.actionsContainer}>
                                        {/* Chat Button */}
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' }]}
                                            onPress={() => handleChatWithSitter(booking)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`צ'אט עם ${booking.sitterName}`}
                                        >
                                            <MessageSquare size={18} color={theme.primary} />
                                            <Text style={[styles.actionBtnText, { color: theme.primary }]}>צ'אט</Text>
                                        </TouchableOpacity>

                                        {/* Cancel Button (only for pending/confirmed) */}
                                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}
                                                onPress={() => handleCancelBooking(booking.id)}
                                                accessibilityRole="button"
                                                accessibilityLabel="בטל הזמנה"
                                            >
                                                <XCircle size={18} color="#EF4444" />
                                                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>בטל</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Rate Button (only for completed) */}
                                        {booking.status === 'completed' && (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}
                                                onPress={() => handleRateBooking(booking)}
                                                accessibilityRole="button"
                                                accessibilityLabel="דרג בייביסיטר"
                                            >
                                                <Star size={18} color="#F59E0B" />
                                                <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>דרג</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 16,
    },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    activeTab: {
        // backgroundColor set dynamically
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#fff',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
    },
    bookingCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    sitterInfo: {
        marginBottom: 12,
    },
    sitterName: {
        fontSize: 18,
        fontWeight: '700',
    },
    detailsContainer: {
        gap: 8,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
    },
    notesContainer: {
        marginTop: 8,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 8,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    notesText: {
        fontSize: 13,
        lineHeight: 18,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
});

export default BookingsScreen;
