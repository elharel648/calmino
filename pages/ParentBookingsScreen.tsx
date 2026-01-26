// pages/ParentBookingsScreen.tsx - Parent Bookings Management

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../services/firebaseConfig';
import { getParentBookings } from '../services/babysitterService';
import { BabysitterBooking } from '../types/babysitter';
import RatingModal from '../components/BabySitter/RatingModal';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import * as Haptics from 'expo-haptics';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Star, X } from 'lucide-react-native';
import { getUserPushToken, sendPushNotification } from '../services/pushNotificationService';
import { logger } from '../utils/logger';

const ParentBookingsScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [bookings, setBookings] = useState<BabysitterBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<{ bookingId: string; sitterId: string; sitterName: string } | null>(null);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);

    // Real-time subscription to bookings
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Real-time subscription to parent bookings
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('parentId', '==', userId)
        );

        const unsubscribe = onSnapshot(
            bookingsQuery,
            async (snapshot) => {
                try {
                    const fetchedBookings: BabysitterBooking[] = [];
                    
                    snapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        fetchedBookings.push({
                            id: docSnap.id,
                            parentId: data.parentId,
                            babysitterId: data.babysitterId,
                            status: data.status || 'pending',
                            date: data.date,
                            startTime: data.startTime || '',
                            endTime: data.endTime || '',
                            hourlyRate: data.hourlyRate || 0,
                            notes: data.notes || undefined,
                            createdAt: data.createdAt,
                            updatedAt: data.updatedAt,
                        });
                    });

                    // Enrich with sitter names
                    const enrichedBookings = await Promise.all(
                        fetchedBookings.map(async (booking) => {
                            try {
                                const sitterDoc = await getDoc(doc(db, 'users', booking.babysitterId));
                                if (sitterDoc.exists()) {
                                    return {
                                        ...booking,
                                        sitterName: sitterDoc.data().displayName || 'בייביסיטר',
                                    };
                                }
                            } catch (error) {
                                // Silent fail
                            }
                            return {
                                ...booking,
                                sitterName: 'בייביסיטר',
                            };
                        })
                    );

                    // Sort by date (newest first)
                    enrichedBookings.sort((a, b) => {
                        const dateA = a.date?.toDate?.() || new Date(a.date);
                        const dateB = b.date?.toDate?.() || new Date(b.date);
                        return dateB.getTime() - dateA.getTime();
                    });

                    setBookings(enrichedBookings);
                } catch (error) {
                    logger.error('Error processing bookings:', error);
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            (error) => {
                logger.error('Error subscribing to bookings:', error);
                setLoading(false);
                setRefreshing(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Fallback: load bookings once on mount (for initial load)
    const loadBookings = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setRefreshing(false);
            return;
        }

        try {
            const fetchedBookings = await getParentBookings(userId);

            // Enrich with sitter names
            const enrichedBookings = await Promise.all(
                fetchedBookings.map(async (booking) => {
                    try {
                        const sitterDoc = await getDoc(doc(db, 'users', booking.babysitterId));
                        if (sitterDoc.exists()) {
                            return {
                                ...booking,
                                sitterName: sitterDoc.data().displayName || 'בייביסיטר',
                            };
                        }
                    } catch (error) {
                        // Silent fail
                    }
                    return {
                        ...booking,
                        sitterName: 'בייביסיטר',
                    };
                })
            );

            setBookings(enrichedBookings);
        } catch (error) {
            logger.error('Error loading bookings:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Auto-trigger rating modal for completed bookings that need rating
    useEffect(() => {
        const completedUnrated = bookings.find(
            b => b.status === 'completed' && !(b as any).rated
        );

        if (completedUnrated) {
            const bookingWithSitter = completedUnrated as BabysitterBooking & { sitterName?: string };
            if (bookingWithSitter.sitterName) {
                // Small delay to let screen render first
                setTimeout(() => {
                    setSelectedBooking({
                        bookingId: completedUnrated.id,
                        sitterId: completedUnrated.babysitterId,
                        sitterName: bookingWithSitter.sitterName || 'בייביסיטר',
                    });
                    setRatingModalVisible(true);
                }, 1000);
            }
        }
    }, [bookings]);

    const onRefresh = () => {
        setRefreshing(true);
        loadBookings();
    };

    const handleRateBooking = (booking: BabysitterBooking & { sitterName?: string }) => {
        if (!booking.sitterName) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedBooking({
            bookingId: booking.id,
            sitterId: booking.babysitterId,
            sitterName: booking.sitterName,
        });
        setRatingModalVisible(true);
    };

    const handleCancelBooking = async (booking: BabysitterBooking & { sitterName?: string }) => {
        // Only allow cancellation for pending or confirmed bookings
        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
            Alert.alert('לא ניתן לבטל', 'ניתן לבטל רק הזמנות ממתינות או מאושרות');
            return;
        }

        Alert.alert(
            'ביטול הזמנה',
            `האם אתה בטוח שברצונך לבטל את ההזמנה ל${booking.sitterName || 'בייביסיטר'}?`,
            [
                { text: 'לא', style: 'cancel' },
                {
                    text: 'כן, בטל',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setLoading(true);

                            await updateDoc(doc(db, 'bookings', booking.id), {
                                status: 'cancelled',
                                updatedAt: serverTimestamp(),
                                cancelledAt: serverTimestamp(),
                            });

                            // Send push notification to sitter
                            try {
                                const sitterToken = await getUserPushToken(booking.babysitterId);
                                if (sitterToken) {
                                    const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
                                    const parentName = userDoc.data()?.displayName || 'הורה';
                                    
                                    await sendPushNotification(
                                        sitterToken,
                                        '❌ הזמנה בוטלה',
                                        `${parentName} ביטל/ה את ההזמנה`,
                                        { 
                                            type: 'booking_cancelled', 
                                            bookingId: booking.id,
                                            channelId: 'booking'
                                        }
                                    );
                                }
                            } catch (pushError) {
                                logger.warn('Failed to send push notification:', pushError);
                            }

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('✅', 'ההזמנה בוטלה בהצלחה');
                        } catch (error) {
                            logger.error('Error cancelling booking:', error);
                            Alert.alert('שגיאה', 'לא הצלחנו לבטל את ההזמנה. נסה שוב.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const getStatusIcon = (status: string, theme: any) => {
        const iconColor = theme.textSecondary;
        switch (status) {
            case 'pending': return <AlertCircle size={12} color={iconColor} strokeWidth={1.5} />;
            case 'confirmed': return <CheckCircle size={12} color={iconColor} strokeWidth={1.5} />;
            case 'active': return <Clock size={12} color={iconColor} strokeWidth={1.5} />;
            case 'completed': return <CheckCircle size={12} color={iconColor} strokeWidth={1.5} />;
            case 'declined': return <XCircle size={12} color={iconColor} strokeWidth={1.5} />;
            case 'cancelled': return <XCircle size={12} color={iconColor} strokeWidth={1.5} />;
            default: return <AlertCircle size={12} color={iconColor} strokeWidth={1.5} />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'ממתין לאישור';
            case 'confirmed': return 'מאושר';
            case 'active': return 'פעיל';
            case 'completed': return 'הושלם';
            case 'declined': return 'נדחה';
            case 'cancelled': return 'בוטל';
            default: return status;
        }
    };

    const formatDate = (date: any): string => {
        if (!date) return '';
        try {
            const d = date.toDate ? date.toDate() : new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return '';
        }
    };

    const formatTime = (time: string | undefined): string => {
        return time || '--:--';
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>ההזמנות שלי</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>ההזמנות שלי</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
            >
                {bookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconWrapper, { backgroundColor: theme.cardSecondary }]}>
                            <Calendar size={40} color={theme.textSecondary} strokeWidth={1.5} />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.textPrimary }]}>
                            אין הזמנות עדיין
                        </Text>
                        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                            הזמין בייביסיטר דרך טאב "בייביסיטר"
                        </Text>
                    </View>
                ) : (
                    bookings.map((booking) => {
                        const bookingWithSitter = booking as BabysitterBooking & { sitterName?: string };
                        const needsRating = booking.status === 'completed' && !(booking as any).rated;

                        return (
                            <View
                                key={booking.id}
                                style={[styles.bookingCardWrapper, { backgroundColor: theme.card }]}
                            >
                                <View style={styles.bookingCard}>
                                {/* Header */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.sitterInfo}>
                                        <View style={[styles.statusBadge, { 
                                            backgroundColor: theme.cardSecondary,
                                            borderWidth: StyleSheet.hairlineWidth,
                                            borderColor: theme.border,
                                        }]}>
                                            {getStatusIcon(booking.status, theme)}
                                            <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                                                {getStatusLabel(booking.status)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.headerActions}>
                                        {needsRating && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, { borderColor: theme.border }]}
                                                onPress={() => handleRateBooking(bookingWithSitter)}
                                                activeOpacity={0.6}
                                            >
                                                <Star size={14} color={theme.textPrimary} fill="none" strokeWidth={1.5} />
                                                <Text style={[styles.actionButtonText, { color: theme.textPrimary }]}>דרג</Text>
                                            </TouchableOpacity>
                                        )}
                                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                            <TouchableOpacity
                                                style={[styles.actionButton, { borderColor: theme.border }]}
                                                onPress={() => handleCancelBooking(bookingWithSitter)}
                                                activeOpacity={0.6}
                                            >
                                                <X size={14} color={theme.textSecondary} strokeWidth={1.5} />
                                                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>בטל</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {/* Sitter Name */}
                                <View style={styles.sitterRow}>
                                    <User size={16} color={theme.textSecondary} />
                                    <Text style={[styles.sitterName, { color: theme.textPrimary }]}>
                                        {bookingWithSitter.sitterName || 'בייביסיטר'}
                                    </Text>
                                </View>

                                {/* Date & Time */}
                                <View style={styles.detailsRow}>
                                    <View style={styles.detailItem}>
                                        <Calendar size={14} color={theme.textSecondary} />
                                        <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                                            {formatDate(booking.date)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Clock size={14} color={theme.textSecondary} />
                                        <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Price */}
                                {booking.hourlyRate != null && booking.hourlyRate > 0 && (
                                    <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
                                        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>מחיר לשעה:</Text>
                                        <Text style={[styles.priceValue, { color: theme.textPrimary }]}>
                                            ₪{booking.hourlyRate}
                                        </Text>
                                    </View>
                                )}

                                {/* Notes */}
                                {booking.notes && (
                                    <View style={styles.notesContainer}>
                                        <Text style={[styles.notesLabel, { color: theme.textSecondary }]}>הערות:</Text>
                                        <Text style={[styles.notesText, { color: theme.textPrimary }]}>
                                            {booking.notes}
                                        </Text>
                                    </View>
                                )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Rating Modal */}
            {selectedBooking && (
                <RatingModal
                    visible={ratingModalVisible}
                    onClose={() => {
                        setRatingModalVisible(false);
                        setSelectedBooking(null);
                    }}
                    bookingId={selectedBooking.bookingId}
                    babysitterId={selectedBooking.sitterId}
                    babysitterName={selectedBooking.sitterName}
                    onSuccess={() => {
                        loadBookings(); // Refresh after rating
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 18,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '400',
        lineHeight: 20,
        letterSpacing: -0.2,
    },
    bookingCardWrapper: {
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    bookingCard: {
        borderRadius: 16,
        padding: 18,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    sitterInfo: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row-reverse',
        gap: 8,
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    actionButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent',
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    sitterRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sitterName: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    detailsRow: {
        flexDirection: 'row-reverse',
        gap: 20,
        marginBottom: 14,
    },
    detailItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    priceRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        marginTop: 14,
    },
    priceLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    notesContainer: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: -0.1,
    },
    notesText: {
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: -0.2,
    },
});

export default ParentBookingsScreen;

