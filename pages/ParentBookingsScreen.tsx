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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth } from '../services/firebaseConfig';
import { getParentBookings } from '../services/babysitterService';
import { BabysitterBooking } from '../types/babysitter';
import RatingModal from '../components/BabySitter/RatingModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import * as Haptics from 'expo-haptics';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react-native';

const ParentBookingsScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [bookings, setBookings] = useState<BabysitterBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<{ bookingId: string; sitterId: string; sitterName: string } | null>(null);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);

    const loadBookings = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setLoading(false);
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
            console.error('Error loading bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadBookings();
    }, []);

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#F59E0B';
            case 'confirmed': return '#3B82F6';
            case 'active': return '#10B981';
            case 'completed': return '#6366F1';
            case 'declined': return '#EF4444';
            case 'cancelled': return '#9CA3AF';
            default: return '#6B7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <AlertCircle size={16} color={getStatusColor(status)} />;
            case 'confirmed': return <CheckCircle size={16} color={getStatusColor(status)} />;
            case 'active': return <Clock size={16} color={getStatusColor(status)} />;
            case 'completed': return <CheckCircle size={16} color={getStatusColor(status)} />;
            case 'declined': return <XCircle size={16} color={getStatusColor(status)} />;
            case 'cancelled': return <XCircle size={16} color={getStatusColor(status)} />;
            default: return <AlertCircle size={16} color={getStatusColor(status)} />;
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

    const formatDate = (date: any) => {
        if (!date) return '';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const formatTime = (time: string) => {
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
            <View style={[styles.header, { backgroundColor: theme.card }]}>
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
                        <Calendar size={64} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
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
                                style={[styles.bookingCard, { backgroundColor: theme.card }]}
                            >
                                {/* Header */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.sitterInfo}>
                                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                                            {getStatusIcon(booking.status)}
                                            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                                                {getStatusLabel(booking.status)}
                                            </Text>
                                        </View>
                                    </View>
                                    {needsRating && (
                                        <TouchableOpacity
                                            style={[styles.rateButton, { backgroundColor: isDarkMode ? 'rgba(255, 214, 10, 0.2)' : '#FEF3C7' }]}
                                            onPress={() => handleRateBooking(bookingWithSitter)}
                                        >
                                            <Ionicons name="star" size={16} color={theme.warning} />
                                            <Text style={[styles.rateButtonText, { color: theme.warning }]}>דרג</Text>
                                        </TouchableOpacity>
                                    )}
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
                                {booking.hourlyRate && (
                                    <View style={styles.priceRow}>
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
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
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
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    bookingCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sitterInfo: {
        flex: 1,
    },
    statusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    rateButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    rateButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sitterRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sitterName: {
        fontSize: 16,
        fontWeight: '600',
    },
    detailsRow: {
        flexDirection: 'row-reverse',
        gap: 16,
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 14,
    },
    priceRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginTop: 8,
    },
    priceLabel: {
        fontSize: 14,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    notesContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    notesLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        lineHeight: 20,
    },
});

export default ParentBookingsScreen;

