// pages/ParentBookingsScreen.tsx - History Screen (Parent side)

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/firebaseConfig';
import { BabysitterBooking } from '../types/babysitter';
import RatingModal from '../components/BabySitter/RatingModal';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, User, Star, X } from 'lucide-react-native';
import { getUserPushToken, sendPushNotification } from '../services/pushNotificationService';
import { logger } from '../utils/logger';
import { getParentBookings } from '../services/babysitterService';

const ParentBookingsScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const [bookings, setBookings] = useState<BabysitterBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<{ bookingId: string; babysitterId: string; sitterName: string } | null>(null);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);

    // Real-time subscription to bookings
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);

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
                            return { ...booking, sitterName: 'בייביסיטר' };
                        })
                    );

                    enrichedBookings.sort((a, b) => {
                        const dateA = a.date?.toDate?.() || new Date(a.date as any);
                        const dateB = b.date?.toDate?.() || new Date(b.date as any);
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

    const loadBookings = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setRefreshing(false);
            return;
        }

        try {
            const fetchedBookings = await getParentBookings(userId);
            const enrichedBookings = await Promise.all(
                fetchedBookings.map(async (booking) => {
                    try {
                        const sitterDoc = await getDoc(doc(db, 'users', booking.babysitterId));
                        if (sitterDoc.exists()) {
                            return { ...booking, sitterName: sitterDoc.data().displayName || 'בייביסיטר' };
                        }
                    } catch (error) { /* Silent fail */ }
                    return { ...booking, sitterName: 'בייביסיטר' };
                })
            );
            setBookings(enrichedBookings);
        } catch (error) {
            logger.error('Error loading bookings:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Auto-trigger rating for completed unrated bookings (Max 2 times per booking)
    useEffect(() => {
        const checkAndPromptRating = async () => {
            const completedUnrated = bookings.find(
                b => b.status === 'completed' && !(b as any).rated
            );

            if (completedUnrated) {
                const bookingWithSitter = completedUnrated as BabysitterBooking & { sitterName?: string };
                if (bookingWithSitter.sitterName) {
                    try {
                        const storageKey = `rating_prompt_count_${completedUnrated.id}`;
                        const promptCountStr = await AsyncStorage.getItem(storageKey);
                        const promptCount = promptCountStr ? parseInt(promptCountStr) : 0;

                        if (promptCount < 2) {
                            setTimeout(() => {
                                setSelectedBooking({
                                    bookingId: completedUnrated.id,
                                    babysitterId: completedUnrated.babysitterId,
                                    sitterName: bookingWithSitter.sitterName || 'בייביסיטר',
                                });
                                setRatingModalVisible(true);
                                AsyncStorage.setItem(storageKey, (promptCount + 1).toString());
                            }, 1000);
                        }
                    } catch (e) {
                        // Silent fail on storage error
                    }
                }
            }
        };

        checkAndPromptRating();
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
            babysitterId: booking.babysitterId,
            sitterName: booking.sitterName,
        });
        setRatingModalVisible(true);
    };

    const handleCancelBooking = async (booking: BabysitterBooking & { sitterName?: string }) => {
        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
            Alert.alert('לא ניתן לבטל', 'ניתן לבטל רק פגישות ממתינות או מאושרות');
            return;
        }

        Alert.alert(
            'ביטול',
            `לבטל את הפגישה עם ${booking.sitterName || 'בייביסיטר'}?`,
            [
                { text: 'לא', style: 'cancel' },
                {
                    text: 'כן, בטל',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            await updateDoc(doc(db, 'bookings', booking.id), {
                                status: 'cancelled',
                                updatedAt: serverTimestamp(),
                                cancelledAt: serverTimestamp(),
                            });

                            try {
                                const sitterToken = await getUserPushToken(booking.babysitterId);
                                if (sitterToken) {
                                    const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
                                    const parentName = userDoc.data()?.displayName || 'הורה';
                                    await sendPushNotification(
                                        sitterToken,
                                        'ביטול',
                                        `${parentName} ביטל/ה את הפגישה`,
                                        { type: 'booking_cancelled', bookingId: booking.id, channelId: 'booking' }
                                    );
                                }
                            } catch (pushError) {
                                logger.warn('Failed to send push notification:', pushError);
                            }

                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            logger.error('Error cancelling booking:', error);
                            Alert.alert('שגיאה', 'לא הצלחנו לבטל. נסה שוב.');
                        }
                    },
                },
            ]
        );
    };

    const getStatusConfig = (status: string) => {
        // Updated to verified badge color #0D9488 (Teal 600)
        const greenColor = isDarkMode ? '#2DD4BF' : '#0D9488';
        switch (status) {
            case 'pending': return { label: 'ממתין', icon: AlertCircle, color: undefined };
            case 'confirmed': return { label: 'מאושר', icon: CheckCircle, color: undefined };
            case 'active': return { label: 'פעיל', icon: Clock, color: undefined };
            case 'completed': return { label: 'הושלם', icon: CheckCircle, color: greenColor }; // Green accent
            case 'declined': return { label: 'נדחה', icon: XCircle, color: undefined };
            case 'cancelled': return { label: 'בוטל', icon: XCircle, color: undefined };
            default: return { label: status, icon: AlertCircle, color: undefined };
        }
    };

    const formatDate = (date: any): string => {
        if (!date) return '';
        try {
            const d = date.toDate ? date.toDate() : new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
        } catch { return ''; }
    };

    const formatTime = (start?: string, end?: string): string => {
        if (!start && !end) return '';
        return `${start || '--:--'} - ${end || '--:--'}`;
    };

    // Group bookings by status
    const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'active');
    const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || b.status === 'declined');

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronRight size={24} color={theme.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>היסטוריה</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.textSecondary} />
                </View>
            </View>
        );
    }

    const renderBookingItem = (booking: BabysitterBooking & { sitterName?: string }) => {
        const status = getStatusConfig(booking.status);
        const StatusIcon = status.icon;
        const needsRating = booking.status === 'completed' && !(booking as any).rated;
        const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

        return (
            <View
                key={booking.id}
                style={[styles.historyItem, {
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                }]}
            >
                {/* Top Row: Name + Status */}
                <View style={styles.itemTopRow}>
                    <View style={styles.itemNameRow}>
                        <User size={15} color={theme.textSecondary} strokeWidth={2} />
                        <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                            {booking.sitterName || 'בייביסיטר'}
                        </Text>
                    </View>
                    <View style={[styles.statusPill, {
                        backgroundColor: (status.label === 'הושלם')
                            ? (status.color || theme.primary) // Solid background for Completed
                            : (status.color ? (isDarkMode ? 'rgba(45, 212, 191, 0.1)' : 'rgba(13, 148, 136, 0.1)') : (isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)')),
                    }]}>
                        <StatusIcon
                            size={11}
                            color={(status.label === 'הושלם') ? '#fff' : (status.color || theme.textSecondary)}
                            strokeWidth={2}
                        />
                        <Text style={[styles.statusPillText, {
                            color: (status.label === 'הושלם') ? '#fff' : (status.color || theme.textSecondary)
                        }]}>
                            {status.label}
                        </Text>
                    </View>
                </View>

                {/* Date & Time Row */}
                <View style={styles.itemDetailsRow}>
                    <Text style={[styles.itemDate, { color: theme.textSecondary }]}>
                        {formatDate(booking.date)}
                    </Text>
                    {(booking.startTime || booking.endTime) && (
                        <>
                            <Text style={[styles.itemDot, { color: theme.textSecondary }]}>·</Text>
                            <Text style={[styles.itemTime, { color: theme.textSecondary }]}>
                                {formatTime(booking.startTime, booking.endTime)}
                            </Text>
                        </>
                    )}
                </View>

                {/* Actions */}
                {(needsRating || canCancel) && (
                    <View style={styles.itemActions}>
                        {needsRating && (
                            <TouchableOpacity
                                style={[styles.itemActionBtn, {
                                    backgroundColor: isDarkMode ? 'rgba(100, 160, 255, 0.1)' : 'rgba(59, 130, 246, 0.1)', // Blue tint
                                }]}
                                onPress={() => handleRateBooking(booking)}
                                activeOpacity={0.7}
                            >
                                <Star size={13} color={isDarkMode ? 'rgba(100, 160, 255, 0.8)' : '#3B82F6'} fill="none" strokeWidth={2} />
                                <Text style={[styles.itemActionText, { color: isDarkMode ? 'rgba(100, 160, 255, 0.8)' : '#3B82F6' }]}>דרג</Text>
                            </TouchableOpacity>
                        )}
                        {canCancel && (
                            <TouchableOpacity
                                style={[styles.itemActionBtn, {
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                }]}
                                onPress={() => handleCancelBooking(booking)}
                                activeOpacity={0.7}
                            >
                                <X size={13} color={theme.textSecondary} strokeWidth={2} />
                                <Text style={[styles.itemActionText, { color: theme.textSecondary }]}>בטל</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronRight size={24} color={theme.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>היסטוריה</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textSecondary} />
                }
            >
                {bookings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Clock size={36} color={theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            אין היסטוריה עדיין
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Active / Pending Section */}
                        {pendingBookings.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                    פעיל
                                </Text>
                                {pendingBookings.map(b => renderBookingItem(b as BabysitterBooking & { sitterName?: string }))}
                            </View>
                        )}

                        {/* Completed Section */}
                        {completedBookings.length > 0 && (
                            <View style={styles.section}>
                                {pendingBookings.length > 0 && (
                                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                        קודמים
                                    </Text>
                                )}
                                {completedBookings.map(b => renderBookingItem(b as BabysitterBooking & { sitterName?: string }))}
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: 100 }} />
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
                    babysitterId={selectedBooking.babysitterId}
                    babysitterName={selectedBooking.sitterName}
                    onSuccess={() => {
                        loadBookings();
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
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 120,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },

    // Sections
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 10,
        paddingHorizontal: 4,
    },

    // History Item
    historyItem: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
    },
    itemTopRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemNameRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
    },
    statusPill: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    itemDetailsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    itemDate: {
        fontSize: 13,
        fontWeight: '500',
    },
    itemDot: {
        fontSize: 13,
        fontWeight: '700',
    },
    itemTime: {
        fontSize: 13,
        fontWeight: '500',
    },
    itemActions: {
        flexDirection: 'row-reverse',
        gap: 8,
        marginTop: 12,
    },
    itemActionBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
    },
    itemActionText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default ParentBookingsScreen;
