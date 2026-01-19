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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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
                    console.error('Error processing bookings:', error);
                } finally {
                    setLoading(false);
                    setRefreshing(false);
                }
            },
            (error) => {
                console.error('Error subscribing to bookings:', error);
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
            console.error('Error loading bookings:', error);
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
                                console.warn('Failed to send push notification:', pushError);
                            }

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('✅', 'ההזמנה בוטלה בהצלחה');
                        } catch (error) {
                            console.error('Error cancelling booking:', error);
                            Alert.alert('שגיאה', 'לא הצלחנו לבטל את ההזמנה. נסה שוב.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
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
            {/* Header - Premium Design */}
            <View style={[styles.header, { backgroundColor: theme.card }]}>
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <LinearGradient
                    colors={isDarkMode 
                        ? [theme.card + 'CC', theme.card + '99']
                        : ['#FFFFFF', '#FAFAFA']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { zIndex: 1 }]}>
                    <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary, zIndex: 1 }]}>ההזמנות שלי</Text>
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
                        <View style={styles.emptyIconWrapper}>
                            {Platform.OS === 'ios' && (
                                <BlurView
                                    intensity={20}
                                    tint={isDarkMode ? 'dark' : 'light'}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <LinearGradient
                                colors={isDarkMode 
                                    ? ['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.15)']
                                    : ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Calendar size={48} color={theme.primary} strokeWidth={1.5} />
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
                                style={styles.bookingCardWrapper}
                            >
                                {Platform.OS === 'ios' && (
                                    <BlurView
                                        intensity={20}
                                        tint={isDarkMode ? 'dark' : 'light'}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <LinearGradient
                                    colors={isDarkMode 
                                        ? [theme.card + 'CC', theme.card + '99']
                                        : ['#FFFFFF', '#FAFAFA']
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={[styles.bookingCard, { backgroundColor: 'transparent' }]}>
                                {/* Header */}
                                <View style={styles.cardHeader}>
                                    <View style={styles.sitterInfo}>
                                        <View style={styles.statusBadgeWrapper}>
                                            {Platform.OS === 'ios' && (
                                                <BlurView
                                                    intensity={30}
                                                    tint={isDarkMode ? 'dark' : 'light'}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            )}
                                            <LinearGradient
                                                colors={[getStatusColor(booking.status) + '30', getStatusColor(booking.status) + '15']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <View style={[styles.statusBadge, { backgroundColor: 'transparent' }]}>
                                                {getStatusIcon(booking.status)}
                                                <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                                                    {getStatusLabel(booking.status)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.headerActions}>
                                        {needsRating && (
                                            <TouchableOpacity
                                                style={styles.rateButtonWrapper}
                                                onPress={() => handleRateBooking(bookingWithSitter)}
                                                activeOpacity={0.7}
                                            >
                                                {Platform.OS === 'ios' && (
                                                    <BlurView
                                                        intensity={30}
                                                        tint="light"
                                                        style={StyleSheet.absoluteFill}
                                                    />
                                                )}
                                                <LinearGradient
                                                    colors={['#FEF3C7', '#FDE68A']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                <View style={styles.rateButton}>
                                                    <Star size={16} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
                                                    <Text style={styles.rateButtonText}>דרג</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                            <TouchableOpacity
                                                style={styles.cancelButtonWrapper}
                                                onPress={() => handleCancelBooking(bookingWithSitter)}
                                                activeOpacity={0.7}
                                            >
                                                {Platform.OS === 'ios' && (
                                                    <BlurView
                                                        intensity={30}
                                                        tint="light"
                                                        style={StyleSheet.absoluteFill}
                                                    />
                                                )}
                                                <LinearGradient
                                                    colors={['#FEE2E2', '#FECACA']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                <View style={styles.cancelButton}>
                                                    <X size={16} color="#EF4444" strokeWidth={2.5} />
                                                    <Text style={styles.cancelButtonText}>בטל</Text>
                                                </View>
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
                                {booking.hourlyRate && (
                                    <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
                                        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>מחיר לשעה:</Text>
                                        <View style={styles.priceValueWrapper}>
                                            <LinearGradient
                                                colors={['#6366F1', '#8B5CF6']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.priceGradient}
                                            />
                                            <Text style={styles.priceValue}>
                                                ₪{booking.hourlyRate}
                                            </Text>
                                        </View>
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
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
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
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 8,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: 20,
        letterSpacing: -0.5,
    },
    emptySubtext: {
        fontSize: 15,
        marginTop: 10,
        textAlign: 'center',
        fontWeight: '400',
        lineHeight: 22,
    },
    bookingCardWrapper: {
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    bookingCard: {
        borderRadius: 20,
        padding: 20,
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
    statusBadgeWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    statusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        alignSelf: 'flex-start',
        zIndex: 1,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    rateButtonWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    rateButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        zIndex: 1,
    },
    rateButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F59E0B',
        letterSpacing: 0.2,
    },
    cancelButtonWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    cancelButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        zIndex: 1,
    },
    cancelButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#EF4444',
        letterSpacing: 0.2,
    },
    sitterRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sitterName: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
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
        fontWeight: '500',
    },
    priceRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        marginTop: 12,
    },
    priceLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    priceValueWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    priceGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    priceValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 6,
        letterSpacing: -0.5,
    },
    notesContainer: {
        marginTop: 12,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
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

