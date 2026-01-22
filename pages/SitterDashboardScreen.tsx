// pages/SitterDashboardScreen.tsx - Real Sitter Dashboard with Firebase Data
import React, { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Modal,
    TextInput,
    Switch,
    Alert,
    KeyboardAvoidingView,
} from 'react-native';
import {
    Calendar, Clock, Users, CheckCircle,
    XCircle, ChevronRight, ChevronLeft, Star, MessageSquare, Settings,
    User, Baby, MapPin, Phone, Mail, Bell, X, Trash2, Edit3, Send, DollarSign
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useActiveChild } from '../context/ActiveChildContext';
import { useLanguage } from '../context/LanguageContext';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { uploadSitterPhoto } from '../services/imageUploadService';
import { Camera } from 'lucide-react-native';
import { useChats } from '../hooks/useChats';
import { useBookings } from '../hooks/useBookings';
import { startShift } from '../services/babysitterService';
import { Play } from 'lucide-react-native';
import DayHoursEditor from '../components/BabySitter/DayHoursEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SitterProfile {
    id: string;
    name: string;
    photoUrl: string | null;
    rating: number;
    reviewCount: number;
    isVerified: boolean;
}

interface Booking {
    id: string;
    parentId: string;
    parentName: string;
    parentPhoto: string | null;
    date: Date;
    startTime: string;
    endTime: string;
    childrenCount: number;
    status: 'pending' | 'accepted' | 'completed' | 'cancelled';
    childId?: string;
}

interface Stats {
    completedBookings: number;
    pendingBookings: number;
}

// Helper function to format relative time in Hebrew
const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דקות`;
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    if (diffDays === 1) return 'אתמול';
    return `לפני ${diffDays} ימים`;
};

const SitterDashboardScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
    const [settingsVisible, setSettingsVisible] = useState(false);

    // Settings state
    const [preferredLocation, setPreferredLocation] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [availableForBookings, setAvailableForBookings] = useState(true);
    const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
    const [messagesModalVisible, setMessagesModalVisible] = useState(false);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [availableDays, setAvailableDays] = useState<string[]>(['0', '1', '2', '3', '4']); // Sun-Thu
    const [availableHours, setAvailableHours] = useState<Record<string, { start: string; end: string }>>({
        '0': { start: '09:00', end: '18:00' }, '1': { start: '09:00', end: '18:00' },
        '2': { start: '09:00', end: '18:00' }, '3': { start: '09:00', end: '18:00' },
        '4': { start: '09:00', end: '18:00' }, '5': { start: '09:00', end: '18:00' },
        '6': { start: '09:00', end: '18:00' },
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [sitterCity, setSitterCity] = useState(''); // City for location search
    const [hourlyRate, setHourlyRate] = useState(50); // Price per hour
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null); // Profile photo URL
    const [uploadingPhoto, setUploadingPhoto] = useState(false); // Photo upload loading state

    // Real-time chats from Firebase
    const { chats } = useChats();

    const activeChat = chats.find(c => c.id === activeChatId);

    const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<Stats>({
        completedBookings: 0,
        pendingBookings: 0,
    });

    // Fetch sitter profile
    const fetchSitterProfile = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return null;

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();

                // Load settings from Firebase
                setPreferredLocation(data.sitterPreferredLocation || '');
                setPhoneNumber(data.phone || '');
                setNotificationsEnabled(data.sitterNotificationsEnabled !== false);
                setAvailableForBookings(data.sitterActive !== false);
                setSitterCity(data.sitterCity || '');
                setHourlyRate(data.sitterPrice || 50);
                setProfilePhoto(data.photoUrl || auth.currentUser?.photoURL || null);
                if (data.sitterAvailableDays) setAvailableDays(data.sitterAvailableDays);

                return {
                    id: userId,
                    name: data.displayName || auth.currentUser?.displayName || 'סיטר',
                    photoUrl: data.photoUrl || auth.currentUser?.photoURL || null,
                    rating: data.sitterRating || 0,
                    reviewCount: data.sitterReviewCount || 0,
                    isVerified: data.sitterVerified || false,
                };
            }
        } catch {
            // Silent fail
        }

        // Fallback to auth user
        return {
            id: userId,
            name: auth.currentUser?.displayName || 'סיטר',
            photoUrl: auth.currentUser?.photoURL || null,
            rating: 0,
            reviewCount: 0,
            isVerified: false,
        };
    };

    // Fetch bookings
    const fetchBookings = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return [];

        console.log('🔍 Fetching bookings for sitter:', userId);

        try {
            const q = query(
                collection(db, 'bookings'),
                where('babysitterId', '==', userId),
                orderBy('date', 'desc')
            );

            const snapshot = await getDocs(q);
            console.log('📊 Found bookings:', snapshot.docs.length);
            const fetchedBookings: Booking[] = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                console.log('📋 Booking data:', docSnap.id, data);

                // Get parent info
                let parentName = 'הורה';
                let parentPhoto = null;
                if (data.parentId) {
                    try {
                        const parentDoc = await getDoc(doc(db, 'users', data.parentId));
                        if (parentDoc.exists()) {
                            parentName = parentDoc.data().displayName || 'הורה';
                            parentPhoto = parentDoc.data().photoUrl || null;
                        }
                    } catch {
                        // Silent
                    }
                }

                fetchedBookings.push({
                    id: docSnap.id,
                    parentId: data.parentId,
                    parentName,
                    parentPhoto,
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
                    startTime: data.startTime || '--:--',
                    endTime: data.endTime || '--:--',
                    childrenCount: data.childrenCount || 1,
                    status: data.status || 'pending',
                    childId: data.childId,
                });
            }

            return fetchedBookings;
        } catch (error) {
            console.error('❌ Error fetching bookings:', error);
            return [];
        }
    };

    // Handle photo change
    const handleChangePhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setUploadingPhoto(true);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                try {
                    // Upload to Firebase Storage
                    const downloadUrl = await uploadSitterPhoto(uri);

                    // Update Firestore
                    const userId = auth.currentUser?.uid;
                    if (userId) {
                        await updateDoc(doc(db, 'users', userId), {
                            photoUrl: downloadUrl,
                        });
                    }

                    // Update local state
                    setProfilePhoto(downloadUrl);
                    setSitterProfile(prev => prev ? { ...prev, photoUrl: downloadUrl } : prev);

                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('✅', 'התמונה עודכנה בהצלחה!');
                } catch (uploadError) {
                    console.error('Failed to upload photo:', uploadError);
                    Alert.alert('שגיאה', 'לא ניתן להעלות תמונה, נסה שוב');
                }
            }
        } catch (error) {
            console.error('Image picker error:', error);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Calculate stats
    const calculateStats = (bookingsList: Booking[]): Stats => {
        let completedBookings = 0;
        let pendingBookings = 0;

        bookingsList.forEach(booking => {
            if (booking.status === 'completed') {
                completedBookings++;
            } else if (booking.status === 'pending') {
                pendingBookings++;
            }
        });

        return {
            completedBookings,
            pendingBookings,
        };
    };

    // Load all data
    const loadData = async () => {
        setLoading(true);

        const profile = await fetchSitterProfile();
        setSitterProfile(profile);

        const fetchedBookings = await fetchBookings();
        setBookings(fetchedBookings);
        setStats(calculateStats(fetchedBookings));

        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    // Handle booking actions
    const handleAcceptBooking = async (bookingId: string) => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'accepted'
            });
            loadData();
        } catch {
            // Silent
        }
    };

    const handleDeclineBooking = async (bookingId: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled'
            });
            loadData();
        } catch {
            // Silent
        }
    };

    // Start shift for accepted booking
    const handleStartShift = async (booking: Booking) => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await startShift(
                {
                    id: booking.id,
                    parentId: booking.parentId,
                    babysitterId: auth.currentUser?.uid || '',
                    date: FirestoreTimestamp.fromDate(booking.date),
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    status: 'confirmed',
                    createdAt: FirestoreTimestamp.now(),
                    updatedAt: FirestoreTimestamp.now(),
                },
                sitterProfile?.name || 'סיטר'
            );
            Alert.alert('✅ משמרת התחילה!', 'הטיימר רץ כעת. ההורה יכול לראות את הזמן.');
            loadData();
        } catch (error) {
            console.error('Start shift error:', error);
            Alert.alert('שגיאה', 'לא הצלחנו להתחיל את המשמרת');
        }
    };

    // Filter bookings by tab
    const filteredBookings = bookings.filter(b =>
        activeTab === 'pending'
            ? (b.status === 'pending' || b.status === 'accepted')
            : b.status === 'completed'
    );

    // ========== COMPONENTS ==========

    // Minimalist Stat Card
    const StatCard = ({ icon, value, label }: any) => (
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.cardSecondary }]}>
                {typeof icon === 'string' ? (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textSecondary }}>₪</Text>
                ) : (
                    React.createElement(icon, { size: 18, color: theme.textSecondary, strokeWidth: 1.5 })
                )}
            </View>
            <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        </View>
    );

    // Booking Card
    const BookingCard = ({ booking }: { booking: Booking }) => (
        <View style={[styles.bookingCard, { backgroundColor: theme.card }]}>
            <View style={styles.bookingHeader}>
                {booking.parentPhoto ? (
                    <Image source={{ uri: booking.parentPhoto }} style={styles.parentPhoto} />
                ) : (
                    <View style={[styles.parentPhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                        <User size={20} color={theme.textSecondary} />
                    </View>
                )}
                <View style={styles.bookingInfo}>
                    <Text style={[styles.parentName, { color: theme.textPrimary }]}>
                        {booking.parentName}
                    </Text>
                    <Text style={[styles.bookingDate, { color: theme.textSecondary }]}>
                        {format(booking.date, 'd/M/yy', { locale: he })} • {booking.startTime}-{booking.endTime}
                    </Text>
                </View>
            </View>

            <View style={styles.bookingDetails}>
                <View style={styles.detailItem}>
                    <Baby size={14} color={theme.textSecondary} strokeWidth={1.5} />
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>{booking.childrenCount} ילדים</Text>
                </View>
            </View>

            {booking.status === 'pending' && (
                <View style={styles.bookingActions}>
                    <TouchableOpacity
                        style={[styles.declineBtn, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => handleDeclineBooking(booking.id)}
                    >
                        <XCircle size={16} color={theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.declineBtnText, { color: theme.textSecondary }]}>דחה</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                        onPress={() => handleAcceptBooking(booking.id)}
                    >
                        <CheckCircle size={16} color={theme.card} strokeWidth={1.5} />
                        <Text style={[styles.acceptBtnText, { color: theme.card }]}>אשר</Text>
                    </TouchableOpacity>
                </View>
            )}

            {booking.status === 'accepted' && (
                <TouchableOpacity
                    style={styles.startShiftBtn}
                    onPress={() => handleStartShift(booking)}
                >
                    <Play size={18} color="#fff" fill="#fff" />
                    <Text style={styles.startShiftText}>התחל משמרת</Text>
                </TouchableOpacity>
            )}

            {booking.status === 'completed' && (
                <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? 'rgba(48, 209, 88, 0.2)' : '#D1FAE5' }]}>
                    <CheckCircle size={14} color={theme.success} strokeWidth={1.5} />
                    <Text style={[styles.statusText, { color: theme.success }]}>הושלם</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Background Gradient - Apple Style */}
            <LinearGradient
                colors={isDarkMode
                    ? [theme.background, theme.cardSecondary, theme.background]
                    : ['#FAFAFA', '#F5F5F5', '#FAFAFA']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {/* Minimalist Header */}
                <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <ChevronRight size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>מצב סיטר</Text>
                        <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                            <Settings size={22} color={theme.textSecondary} strokeWidth={1.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Section */}
                    <View style={styles.profileSection}>
                        {sitterProfile?.photoUrl ? (
                            <Image source={{ uri: sitterProfile.photoUrl }} style={styles.profilePhoto} />
                        ) : (
                            <View style={[styles.profilePhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                                <User size={32} color={theme.textSecondary} />
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                                {sitterProfile?.name || 'סיטר'}
                            </Text>
                            {sitterProfile?.rating ? (
                                <View style={styles.ratingRow}>
                                    <Star size={14} color={theme.warning} fill={theme.warning} />
                                    <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
                                        {sitterProfile.rating.toFixed(1)} ({sitterProfile.reviewCount})
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        {sitterProfile?.isVerified && (
                            <View style={styles.verifiedBadge}>
                                <CheckCircle size={16} color={theme.success} fill={isDarkMode ? 'rgba(48, 209, 88, 0.2)' : '#D1FAE5'} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity
                        style={[styles.reviewsCard, { backgroundColor: theme.card }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('MyReviews');
                        }}
                    >
                        <Star
                            size={28}
                            color="#FBBF24"
                            fill={sitterProfile?.reviewCount > 0 ? "#FBBF24" : "none"}
                            strokeWidth={2}
                        />
                        <View style={{ flex: 1, marginHorizontal: 8 }}>
                            <Text style={[styles.reviewsLabel, { color: theme.textSecondary }]}>הביקורות שלי</Text>
                            {sitterProfile?.reviewCount > 0 ? (
                                <Text style={[styles.reviewsValue, { color: theme.textPrimary }]}>
                                    {sitterProfile.rating.toFixed(1)} ★ ({sitterProfile.reviewCount})
                                </Text>
                            ) : (
                                <Text style={[styles.reviewsValue, { color: theme.textSecondary }]}>
                                    אין ביקורות עדיין
                                </Text>
                            )}
                        </View>
                        <ChevronLeft size={22} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.card }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setAvailabilityModalVisible(true);
                        }}
                    >
                        <Calendar size={20} color={theme.textSecondary} strokeWidth={1.5} />
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>זמינות</Text>
                            <Text style={[styles.quickActionSubtext, { color: theme.textSecondary }]}>
                                {availableDays.length} ימים • {availableHours[availableDays[0]]?.start || '09:00'}-{availableHours[availableDays[0]]?.end || '18:00'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { backgroundColor: theme.card }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMessagesModalVisible(true);
                        }}
                    >
                        <View>
                            <MessageSquare size={20} color={theme.textSecondary} strokeWidth={1.5} />
                            {chats.filter(c => (c.unreadCount[auth.currentUser?.uid || ''] || 0) > 0).length > 0 && (
                                <View style={[styles.unreadBadge, { backgroundColor: theme.danger }]}>
                                    <Text style={[styles.unreadBadgeText, { color: theme.card }]}>{chats.filter(c => (c.unreadCount[auth.currentUser?.uid || ''] || 0) > 0).length}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={[styles.quickActionText, { color: theme.textPrimary }]}>הודעות</Text>
                    </TouchableOpacity>
                </View>

                {/* Bookings Section */}
                <View style={styles.bookingsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>הזמנות</Text>

                    {/* Tabs */}
                    <View style={[styles.tabs, { backgroundColor: theme.cardSecondary }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'pending' && [styles.tabActive, { backgroundColor: theme.card }]]}
                            onPress={() => setActiveTab('pending')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'pending' ? theme.textPrimary : theme.textSecondary }]}>
                                ממתינות ({bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'completed' && [styles.tabActive, { backgroundColor: theme.card }]]}
                            onPress={() => setActiveTab('completed')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'completed' ? theme.textPrimary : theme.textSecondary }]}>
                                הושלמו
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Booking Cards */}
                    {filteredBookings.length > 0 ? (
                        filteredBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} />
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                            <Calendar size={36} color={theme.textSecondary} strokeWidth={1} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                {activeTab === 'pending' ? 'אין הזמנות ממתינות' : 'אין הזמנות שהושלמו'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Settings Modal */}
            <Modal
                visible={settingsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.settingsHeader}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.settingsTitle, { color: theme.textPrimary }]}>{t('sitter.settings')}</Text>
                            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContent}>
                            {/* Profile Photo */}
                            <TouchableOpacity
                                style={[styles.settingsSection, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 20 }]}
                                onPress={handleChangePhoto}
                                disabled={uploadingPhoto}
                            >
                                <View style={{ position: 'relative' }}>
                                    {profilePhoto ? (
                                        <Image
                                            source={{ uri: profilePhoto }}
                                            style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.cardSecondary }}
                                        />
                                    ) : (
                                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={36} color={theme.textSecondary} />
                                        </View>
                                    )}
                                    <View style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: theme.primary,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 2,
                                        borderColor: theme.card,
                                    }}>
                                        {uploadingPhoto ? (
                                            <ActivityIndicator size="small" color={theme.card} />
                                        ) : (
                                            <Camera size={14} color={theme.card} />
                                        )}
                                    </View>
                                </View>
                                <Text style={{ fontSize: 14, color: theme.primary, marginTop: 10, fontWeight: '500' }}>
                                    {uploadingPhoto ? t('sitter.uploading') : t('sitter.changePhoto')}
                                </Text>
                            </TouchableOpacity>

                            {/* City - used for search */}
                            <View style={[styles.settingsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.settingRow}>
                                    <MapPin size={18} color={theme.primary} />
                                    <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>{t('sitter.city')}</Text>
                                </View>
                                <Text style={{ fontSize: 12, color: theme.textSecondary, textAlign: 'right', marginBottom: 8 }}>
                                    {t('sitter.cityHint')}
                                </Text>
                                <TextInput
                                    style={[
                                        styles.settingsInput,
                                        { backgroundColor: theme.inputBackground, color: theme.textPrimary, borderColor: theme.border }
                                    ]}
                                    value={sitterCity}
                                    onChangeText={setSitterCity}
                                    placeholder={t('sitter.cityPlaceholder')}
                                    placeholderTextColor={theme.textSecondary}
                                    textAlign="right"
                                />
                            </View>

                            {/* Phone */}
                            <View style={[styles.settingsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.settingRow}>
                                    <Phone size={18} color={theme.success} />
                                    <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>{t('sitter.contactPhone')}</Text>
                                </View>
                                <TextInput
                                    style={[
                                        styles.settingsInput,
                                        { backgroundColor: theme.inputBackground, color: theme.textPrimary, borderColor: theme.border }
                                    ]}
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="050-0000000"
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType="phone-pad"
                                    textAlign="right"
                                />
                            </View>

                            {/* Hourly Rate */}
                            <View style={[styles.settingsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.settingRow}>
                                    <DollarSign size={18} color={theme.warning} />
                                    <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>{t('sitter.pricePerHour')}</Text>
                                </View>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                                    <TouchableOpacity
                                        style={[styles.priceBtn, { backgroundColor: isDarkMode ? 'rgba(255, 69, 58, 0.2)' : '#FEE2E2' }]}
                                        onPress={() => setHourlyRate(Math.max(30, hourlyRate - 5))}
                                    >
                                        <Text style={{ fontSize: 18, color: theme.danger, fontWeight: '600' }}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 28, fontWeight: '700', color: theme.textPrimary }}>
                                        ₪{hourlyRate}
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.priceBtn, { backgroundColor: isDarkMode ? 'rgba(48, 209, 88, 0.2)' : '#D1FAE5' }]}
                                        onPress={() => setHourlyRate(Math.min(200, hourlyRate + 5))}
                                    >
                                        <Text style={{ fontSize: 18, color: theme.success, fontWeight: '600' }}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Toggle Settings */}
                            <View style={[styles.settingsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.settingToggleRow}>
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>{t('sitter.notifications')}</Text>
                                        <Bell size={18} color={theme.primary} />
                                    </View>
                                    <Switch
                                        value={notificationsEnabled}
                                        onValueChange={setNotificationsEnabled}
                                        trackColor={{ false: theme.divider, true: theme.primaryLight }}
                                        thumbColor={notificationsEnabled ? theme.primary : theme.textTertiary}
                                    />
                                </View>
                            </View>

                            <View style={[styles.settingsSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.settingToggleRow}>
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>{t('sitter.availableForBookings')}</Text>
                                        <Calendar size={18} color={theme.success} />
                                    </View>
                                    <Switch
                                        value={availableForBookings}
                                        onValueChange={setAvailableForBookings}
                                        trackColor={{ false: theme.divider, true: isDarkMode ? 'rgba(48, 209, 88, 0.3)' : '#86EFAC' }}
                                        thumbColor={availableForBookings ? theme.success : theme.textTertiary}
                                    />
                                </View>
                            </View>

                            {/* Save Button */}
                            <TouchableOpacity
                                style={[styles.saveSettingsBtn, { backgroundColor: theme.primary }]}
                                onPress={async () => {
                                    const userId = auth.currentUser?.uid;
                                    if (!userId) {
                                        Alert.alert('שגיאה', 'יש להתחבר קודם');
                                        return;
                                    }

                                    try {
                                        setSavingSettings(true);
                                        await updateDoc(doc(db, 'users', userId), {
                                            sitterPreferredLocation: preferredLocation.trim() || null,
                                            phone: phoneNumber.trim() || null,
                                            sitterNotificationsEnabled: notificationsEnabled,
                                            sitterActive: availableForBookings,
                                            sitterCity: sitterCity.trim() || null,
                                            sitterPrice: hourlyRate,
                                            sitterAvailableDays: availableDays,
                                            sitterAvailableHours: availableHours,
                                        });

                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        setSettingsVisible(false);
                                        Alert.alert('נשמר!', 'ההגדרות נשמרו בהצלחה');
                                    } catch (error) {
                                        console.error('Failed to save settings:', error);
                                        Alert.alert('שגיאה', 'לא ניתן לשמור, נסה שוב');
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={savingSettings}
                            >
                                {savingSettings ? (
                                    <ActivityIndicator size="small" color={theme.card} />
                                ) : (
                                    <Text style={[styles.saveSettingsBtnText, { color: theme.card }]}>{t('sitter.saveSettings')}</Text>
                                )}
                            </TouchableOpacity>

                            {/* Edit Profile */}
                            <TouchableOpacity
                                style={styles.editProfileBtn}
                                onPress={() => {
                                    setSettingsVisible(false);
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    navigation.navigate('SitterRegistration');
                                }}
                            >
                                <Edit3 size={14} color={theme.textSecondary} strokeWidth={1.5} />
                                <Text style={[styles.editProfileBtnText, { color: theme.textSecondary }]}>{t('sitter.editProfile')}</Text>
                            </TouchableOpacity>

                            {/* Delete Account */}
                            <TouchableOpacity
                                style={styles.deleteAccountBtn}
                                onPress={() => {
                                    Alert.alert(
                                        'מחיקת חשבון סיטר',
                                        'האם אתה בטוח שברצונך למחוק את חשבון הסיטר שלך? לא ניתן לשחזר פעולה זו.',
                                        [
                                            { text: 'ביטול', style: 'cancel' },
                                            {
                                                text: 'מחק',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    const userId = auth.currentUser?.uid;
                                                    if (userId) {
                                                        try {
                                                            await updateDoc(doc(db, 'users', userId), {
                                                                isSitter: false,
                                                                sitterActive: false,
                                                                sitterVerified: false,
                                                            });
                                                            setSettingsVisible(false);
                                                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                            Alert.alert('נמחק', 'חשבון הסיטר נמחק. תוכל להירשם מחדש בכל עת.');
                                                            navigation.replace('SitterList');
                                                        } catch {
                                                            Alert.alert('שגיאה', 'לא ניתן למחוק, נסה שוב');
                                                        }
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Trash2 size={13} color="#9CA3AF" strokeWidth={1.5} />
                                <Text style={styles.deleteAccountBtnText}>{t('sitter.deleteAccount')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Availability Modal */}
            <Modal
                visible={availabilityModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAvailabilityModalVisible(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.settingsHeader}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.settingsTitle, { color: theme.textPrimary }]}>זמינות שבועית</Text>
                            <TouchableOpacity onPress={() => setAvailabilityModalVisible(false)}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContent}>
                            <Text style={[styles.availabilityInfo, { color: theme.textSecondary }]}>
                                בחר את הימים בהם אתה זמין לקבל הזמנות:
                            </Text>

                            {/* Day Toggles */}
                            {[
                                { key: '0', label: 'ראשון' },
                                { key: '1', label: 'שני' },
                                { key: '2', label: 'שלישי' },
                                { key: '3', label: 'רביעי' },
                                { key: '4', label: 'חמישי' },
                                { key: '5', label: 'שישי' },
                                { key: '6', label: 'שבת' },
                            ].map((day) => (
                                <TouchableOpacity
                                    key={day.key}
                                    style={[
                                        styles.dayRow,
                                        { backgroundColor: availableDays.includes(day.key) ? '#E8F5E9' : theme.cardSecondary }
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setAvailableDays(prev =>
                                            prev.includes(day.key)
                                                ? prev.filter(d => d !== day.key)
                                                : [...prev, day.key]
                                        );
                                    }}
                                >
                                    <Text style={[styles.dayLabel, { color: theme.textPrimary }]}>{day.label}</Text>
                                    <View style={[
                                        styles.dayCheckbox,
                                        { backgroundColor: availableDays.includes(day.key) ? theme.success : theme.border }
                                    ]}>
                                        {availableDays.includes(day.key) && (
                                            <CheckCircle size={16} color={theme.card} strokeWidth={2} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Hours per Day */}
                            <Text style={[styles.availabilityInfo, { color: theme.textSecondary, marginTop: 24 }]}>
                                הגדר שעות עבודה לכל יום:
                            </Text>
                            {[
                                { key: '0', label: 'ראשון' },
                                { key: '1', label: 'שני' },
                                { key: '2', label: 'שלישי' },
                                { key: '3', label: 'רביעי' },
                                { key: '4', label: 'חמישי' },
                                { key: '5', label: 'שישי' },
                                { key: '6', label: 'שבת' },
                            ].filter(day => availableDays.includes(day.key)).map((day) => (
                                <DayHoursEditor
                                    key={day.key}
                                    dayKey={day.key}
                                    dayLabel={day.label}
                                    hours={availableHours[day.key] || { start: '09:00', end: '18:00' }}
                                    onHoursChange={(key, hours) => setAvailableHours(prev => ({ ...prev, [key]: hours }))}
                                />
                            ))}

                            {/* Save Button */}
                            <TouchableOpacity
                                style={[styles.saveSettingsBtn, { backgroundColor: theme.primary }]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    setAvailabilityModalVisible(false);
                                    Alert.alert('נשמר!', `הזמינות עודכנה ל-${availableDays.length} ימים בשבוע`);
                                }}
                            >
                                <Text style={[styles.saveSettingsBtnText, { color: theme.card }]}>שמור זמינות</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Messages Modal */}
            <Modal
                visible={messagesModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setMessagesModalVisible(false)}
            >
                <View style={styles.settingsOverlay}>
                    <View style={[styles.settingsModal, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.settingsHeader}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.settingsTitle, { color: theme.textPrimary }]}>הודעות</Text>
                            <TouchableOpacity onPress={() => setMessagesModalVisible(false)}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContent}>
                            {chats.length === 0 ? (
                                <View style={styles.emptyMessages}>
                                    <MessageSquare size={48} color={theme.textSecondary} strokeWidth={1} />
                                    <Text style={[styles.emptyMessagesText, { color: theme.textSecondary }]}>
                                        אין הודעות עדיין
                                    </Text>
                                </View>
                            ) : (
                                chats.map((chat) => (
                                    <TouchableOpacity
                                        key={chat.id}
                                        style={[
                                            styles.messageRow,
                                            { backgroundColor: ((chat.unreadCount[auth.currentUser?.uid || ''] || 0) > 0) ? '#F0FDF4' : theme.cardSecondary }
                                        ]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setMessagesModalVisible(false);
                                            navigation.navigate('ChatScreen', {
                                                sitterName: chat.parentName,
                                                sitterImage: chat.sitterImage,
                                                sitterId: chat.parentId,
                                            });
                                        }}
                                    >
                                        {chat.sitterImage ? (
                                            <Image source={{ uri: chat.sitterImage }} style={styles.messageAvatar} />
                                        ) : (
                                            <View style={[styles.messageAvatar, { backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                                                <User size={20} color={theme.textSecondary} />
                                            </View>
                                        )}
                                        <View style={styles.messageContent}>
                                            <View style={styles.messageHeader}>
                                                <Text style={[styles.messageName, { color: theme.textPrimary }]}>
                                                    {chat.parentName}
                                                </Text>
                                                <Text style={[styles.messageTime, { color: theme.textSecondary }]}>
                                                    {chat.lastMessageTime?.toDate?.() ? formatRelativeTime(chat.lastMessageTime.toDate()) : ''}
                                                </Text>
                                            </View>
                                            <Text
                                                style={[
                                                    styles.messagePreview,
                                                    { color: ((chat.unreadCount[auth.currentUser?.uid || ''] || 0) > 0) ? theme.textPrimary : theme.textSecondary }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {chat.lastMessage || 'התחל שיחה...'}
                                            </Text>
                                        </View>
                                        {((chat.unreadCount[auth.currentUser?.uid || ''] || 0) > 0) && <View style={[styles.unreadDot, { backgroundColor: theme.success }]} />}
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingBottom: 20 },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    profileSection: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    profilePhoto: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    profilePhotoPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInfo: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    ratingText: {
        fontSize: 13,
    },
    verifiedBadge: {
        marginLeft: 8,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginTop: 20,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
    },
    statIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },

    // Reviews Card
    reviewsCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        minHeight: 80,
    },
    reviewsLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    reviewsValue: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 2,
        writingDirection: 'rtl',
        textAlign: 'right',
    },

    // Quick Actions
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 24,
    },
    quickActionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 6,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '500',
    },
    quickActionSubtext: {
        fontSize: 10,
        fontWeight: '400',
        marginTop: 2,
    },

    // Bookings Section
    bookingsSection: {
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 14,
    },
    tabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 14,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {},
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Booking Card
    bookingCard: {
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    bookingHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 10,
    },
    parentPhoto: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    parentPhotoPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookingInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    parentName: {
        fontSize: 15,
        fontWeight: '600',
    },
    bookingDate: {
        fontSize: 12,
        marginTop: 2,
    },
    bookingPrice: {
        alignItems: 'center',
    },
    priceAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    bookingDetails: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 12,
    },
    bookingActions: {
        flexDirection: 'row',
        gap: 8,
    },
    declineBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    declineBtnText: {
        fontSize: 13,
        fontWeight: '500',
    },
    acceptBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    acceptBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    startShiftBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#10B981',
        paddingVertical: 12,
        borderRadius: 12,
    },
    startShiftText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 14,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Settings Modal
    settingsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    settingsModal: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 24,
    },
    settingsHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E7EB',
    },
    settingsTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    settingsContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    settingsSection: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    settingRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    settingsInput: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        minHeight: 42,
    },
    settingToggleRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    saveSettingsBtn: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    saveSettingsBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    editProfileBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        marginBottom: 4,
    },
    editProfileBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    deleteAccountBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
        marginBottom: 8,
    },
    deleteAccountBtnText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '400',
    },

    // Availability Modal Styles
    availabilityInfo: {
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 16,
    },
    dayRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    dayLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    dayCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
    },
    hourInput: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    hourLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    hourText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    hourDivider: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Messages Modal Styles
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unreadBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    emptyMessages: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 16,
    },
    emptyMessagesText: {
        fontSize: 16,
    },
    messageRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    messageAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    messageName: {
        fontSize: 15,
        fontWeight: '600',
    },
    messageTime: {
        fontSize: 12,
    },
    messagePreview: {
        fontSize: 14,
        textAlign: 'right',
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    // Chat Modal Styles
    chatOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    chatModal: {
        height: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    chatHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    chatBackBtn: {
        padding: 4,
    },
    chatHeaderInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    chatAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    chatName: {
        fontSize: 17,
        fontWeight: '600',
    },
    chatMessages: {
        flex: 1,
    },
    chatMessagesContent: {
        padding: 16,
        gap: 10,
    },
    chatBubble: {
        maxWidth: '78%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    chatBubbleMine: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    chatBubbleTheirs: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    chatBubbleText: {
        fontSize: 15,
        textAlign: 'right',
        lineHeight: 21,
    },
    chatBubbleTime: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'left',
    },
    chatInputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 10,
        borderTopWidth: 1,
    },
    chatInput: {
        flex: 1,
        minHeight: 42,
        maxHeight: 100,
        borderRadius: 21,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
    },
    chatSendBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SitterDashboardScreen;
