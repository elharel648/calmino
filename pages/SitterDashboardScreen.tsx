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
    Linking,
    Share,
} from 'react-native';
import {
    Calendar, Clock, Users, CheckCircle,
    XCircle, ChevronRight, ChevronLeft, Star, MessageSquare, Settings,
    User, Baby, MapPin, Phone, Mail, Bell, X, Trash2, Edit3, Send, DollarSign,
    Plus, Minus, Eye, Zap, Share2, ExternalLink, Check,
    Instagram, Facebook, Linkedin, MessageCircle, Twitter, Globe, Link as LinkIcon
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
import { useBookings } from '../hooks/useBookings';
import { startShift, getProfileViewStats, getResponseRateStats } from '../services/babysitterService';
import { Play } from 'lucide-react-native';
import DayHoursEditor from '../components/BabySitter/DayHoursEditor';
import { logger } from '../utils/logger';
import * as Location from 'expo-location';
import { validateUsername, openSocialLink, type SocialPlatform } from '../utils/socialMediaUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome5 } from '@expo/vector-icons';

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
    parentPhone?: string;
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
    // Removed tabs - only showing completed history now
    const [settingsVisible, setSettingsVisible] = useState(false);

    // Settings state
    const [preferredLocation, setPreferredLocation] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [availableForBookings, setAvailableForBookings] = useState(true);
    const [isAvailableTonight, setIsAvailableTonight] = useState(false);
    const [availabilityModalVisible, setAvailabilityModalVisible] = useState(false);
    const [availableDays, setAvailableDays] = useState<string[]>(['0', '1', '2', '3', '4']); // Sun-Thu
    const [availableHours, setAvailableHours] = useState<Record<string, { start: string; end: string }>>({
        '0': { start: '09:00', end: '18:00' }, '1': { start: '09:00', end: '18:00' },
        '2': { start: '09:00', end: '18:00' }, '3': { start: '09:00', end: '18:00' },
        '4': { start: '09:00', end: '18:00' }, '5': { start: '09:00', end: '18:00' },
        '6': { start: '09:00', end: '18:00' },
    });
    const [editingDayKey, setEditingDayKey] = useState<string | null>(null);
    const [tempStartTime, setTempStartTime] = useState('09:00');
    const [tempEndTime, setTempEndTime] = useState('18:00');

    // Availability exceptions & vacations
    const [availabilityTab, setAvailabilityTab] = useState<'weekly' | 'exceptions'>('weekly');
    const [exceptions, setExceptions] = useState<Array<{
        id: string;
        date: string;
        type: 'unavailable' | 'custom';
        start?: string;
        end?: string;
        reason?: string;
    }>>([]);
    const [vacations, setVacations] = useState<Array<{
        id: string;
        startDate: string;
        endDate: string;
        reason?: string;
    }>>([]);
    const [addExceptionModalVisible, setAddExceptionModalVisible] = useState(false);
    const [addVacationModalVisible, setAddVacationModalVisible] = useState(false);
    const [exceptionDate, setExceptionDate] = useState(new Date());
    const [exceptionType, setExceptionType] = useState<'unavailable' | 'custom'>('unavailable');
    const [exceptionStartTime, setExceptionStartTime] = useState('09:00');
    const [exceptionEndTime, setExceptionEndTime] = useState('18:00');
    const [exceptionReason, setExceptionReason] = useState('');
    const [vacationStartDate, setVacationStartDate] = useState(new Date());
    const [vacationEndDate, setVacationEndDate] = useState(new Date());
    const [vacationReason, setVacationReason] = useState('');
    const [showExceptionDatePicker, setShowExceptionDatePicker] = useState(false);
    const [showVacationStartPicker, setShowVacationStartPicker] = useState(false);
    const [showVacationEndPicker, setShowVacationEndPicker] = useState(false);

    const [savingSettings, setSavingSettings] = useState(false);
    const [sitterCity, setSitterCity] = useState(''); // City for location search
    const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null); // GPS location
    const [isLoadingLocation, setIsLoadingLocation] = useState(false); // Loading state for GPS
    const [hourlyRate, setHourlyRate] = useState(50); // Price per hour
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null); // Profile photo URL
    const [uploadingPhoto, setUploadingPhoto] = useState(false); // Photo upload loading state

    // Social media links
    const [socialInstagram, setSocialInstagram] = useState('');
    const [socialFacebook, setSocialFacebook] = useState('');
    const [socialLinkedin, setSocialLinkedin] = useState('');
    const [socialWhatsapp, setSocialWhatsapp] = useState('');
    const [socialTiktok, setSocialTiktok] = useState('');
    const [socialTelegram, setSocialTelegram] = useState('');

    // Profile details
    const [bio, setBio] = useState('');
    const [age, setAge] = useState('');
    const [experience, setExperience] = useState('');
    const [languages, setLanguages] = useState<string[]>(['עברית']);
    const [certifications, setCertifications] = useState<string[]>([]);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [newLanguage, setNewLanguage] = useState('');
    const [newCertification, setNewCertification] = useState('');

    const [sitterProfile, setSitterProfile] = useState<SitterProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [stats, setStats] = useState<Stats>({
        completedBookings: 0,
        pendingBookings: 0,
    });

    // Analytics data
    const [profileViewStats, setProfileViewStats] = useState<{
        dailyViews: { date: string; count: number }[];
        totalWeek: number;
        totalAllTime: number;
    } | null>(null);

    const [responseRateStats, setResponseRateStats] = useState<{
        avgResponseMinutes: number;
        responseRate: number;
        totalRequests: number;
        totalResponded: number;
    } | null>(null);

    // Social Modal State
    const [socialModalVisible, setSocialModalVisible] = useState(false);
    const [activeSocialPlatform, setActiveSocialPlatform] = useState<{
        id: 'instagram' | 'facebook' | 'linkedin' | 'whatsapp' | 'tiktok' | 'telegram';
        name: string;
        icon: any;
        color: string;
        value: string;
        setValue: (val: string) => void;
        placeholder: string;
        prefix: string;
    } | null>(null);

    // ✨ Auto-fetch Location on Mount (Default On)
    useEffect(() => {
        const fetchLocationOnMount = async () => {
            // Only auto-fetch if we don't have a saved location yet
            if (!gpsLocation) {
                try {
                    const { status } = await Location.getForegroundPermissionsAsync();
                    if (status === 'granted') {
                        setIsLoadingLocation(true);
                        const location = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        setGpsLocation({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        });
                    }
                } catch (e) {
                    logger.debug('Failed to auto-fetch location', e);
                } finally {
                    setIsLoadingLocation(false);
                }
            }
        };
        fetchLocationOnMount();
    }, []);

    // Load sitter profile


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
                // Load GPS location if exists
                if (data.sitterLocation &&
                    typeof data.sitterLocation.latitude === 'number' &&
                    typeof data.sitterLocation.longitude === 'number') {
                    setGpsLocation({
                        latitude: data.sitterLocation.latitude,
                        longitude: data.sitterLocation.longitude,
                    });
                }

                // Load social media links
                if (data.socialLinks && typeof data.socialLinks === 'object') {
                    setSocialInstagram(data.socialLinks.instagram || '');
                    setSocialFacebook(data.socialLinks.facebook || '');
                    setSocialLinkedin(data.socialLinks.linkedin || '');
                    setSocialWhatsapp(data.socialLinks.whatsapp || '');
                    setSocialTiktok(data.socialLinks.tiktok || '');
                    setSocialTelegram(data.socialLinks.telegram || '');
                }

                // Load profile details
                setBio(data.sitterBio || '');
                setAge(data.age ? String(data.age) : '');
                setExperience(data.sitterExperience || '');
                if (Array.isArray(data.sitterLanguages) && data.sitterLanguages.length > 0) {
                    setLanguages(data.sitterLanguages);
                }
                if (Array.isArray(data.sitterCertifications)) {
                    setCertifications(data.sitterCertifications);
                }
                setVideoUri(data.sitterVideo || null);

                // Load availability exceptions & vacations
                if (Array.isArray(data.sitterAvailabilityExceptions)) {
                    setExceptions(data.sitterAvailabilityExceptions);
                }
                if (Array.isArray(data.sitterAvailabilityVacations)) {
                    setVacations(data.sitterAvailabilityVacations);
                }

                return {
                    id: userId,
                    name: data.displayName || auth.currentUser?.displayName || 'סיטר',
                    photoUrl: data.photoUrl || auth.currentUser?.photoURL || null,
                    rating: data.sitterRating || 0,
                    reviewCount: data.sitterReviewCount || 0,
                    isVerified: data.sitterVerified || false,
                };
            }
        } catch (error) {
            logger.error('Failed to load sitter profile:', error);
            // Fallback to auth user
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

        logger.debug('🔍', 'Fetching bookings for sitter:', userId);

        try {
            const q = query(
                collection(db, 'bookings'),
                where('babysitterId', '==', userId),
                orderBy('date', 'desc')
            );

            const snapshot = await getDocs(q);
            logger.debug('📊', 'Found bookings:', snapshot.docs.length);
            const fetchedBookings: Booking[] = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                logger.debug('📋', 'Booking data:', docSnap.id);

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
                    } catch (error) {
                        logger.error('Failed to load parent info:', error);
                        // Continue with defaults
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
            logger.error('Error fetching bookings:', error);
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
                    logger.error('Failed to upload photo:', uploadError);
                    Alert.alert('שגיאה', 'לא ניתן להעלות תמונה, נסה שוב');
                }
            }
        } catch (error) {
            logger.error('Image picker error:', error);
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

        // Fetch isAvailableTonight directly if fetchSitterProfile doesn't have it
        try {
            const userId = auth.currentUser?.uid;
            if (userId) {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    setIsAvailableTonight(Boolean(userDoc.data().isAvailableTonight));
                }
            }
        } catch (e) {
            logger.error('Failed to load isAvailableTonight', e);
        }

        const fetchedBookings = await fetchBookings();
        setBookings(fetchedBookings);
        setStats(calculateStats(fetchedBookings));

        // Fetch analytics data
        const userId = auth.currentUser?.uid;
        if (userId) {
            const [viewStats, respStats] = await Promise.all([
                getProfileViewStats(userId),
                getResponseRateStats(userId),
            ]);
            setProfileViewStats(viewStats);
            setResponseRateStats(respStats);
        }

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
        } catch (error) {
            logger.error('Failed to accept booking:', error);
            Alert.alert('שגיאה', 'לא ניתן לאשר את ההזמנה. נסה שוב.');
        }
    };

    const handleDeclineBooking = async (bookingId: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: 'cancelled'
            });
            loadData();
        } catch (error) {
            logger.error('Failed to decline booking:', error);
            Alert.alert('שגיאה', 'לא ניתן לבטל את ההזמנה. נסה שוב.');
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
            logger.error('Start shift error:', error);
            Alert.alert('שגיאה', 'לא הצלחנו להתחיל את המשמרת');
        }
    };

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
    const BookingCard = ({ booking }: { booking: Booking }) => {
        // Status badge configuration - MONOCHROMATIC Minimalist
        const getStatusConfig = () => {
            const iconColor = theme.textSecondary;
            const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
            const bgColor = 'transparent';
            const textColor = theme.textPrimary;

            switch (booking.status) {
                case 'pending':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: 'ממתין לאישור',
                        icon: <Clock size={13} color={iconColor} strokeWidth={2.5} />
                    };
                case 'accepted':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: 'מאושר',
                        icon: <CheckCircle size={13} color={iconColor} strokeWidth={2.5} />
                    };
                case 'completed':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: 'הושלם',
                        icon: <CheckCircle size={13} color={iconColor} strokeWidth={2.5} />
                    };
                case 'cancelled':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: 'בוטל',
                        icon: <XCircle size={13} color={iconColor} strokeWidth={2.5} />
                    };
                default:
                    return {
                        color: theme.textSecondary,
                        bgColor: theme.cardSecondary,
                        borderColor: theme.border,
                        text: '',
                        icon: null
                    };
            }
        };

        const statusConfig = getStatusConfig();

        const handleRequestRatingWhatsApp = async () => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            let phone = booking.parentPhone;
            if (!phone || phone.trim() === '') {
                try {
                    const parentDoc = await getDoc(doc(db, 'users', booking.parentId));
                    if (parentDoc.exists()) {
                        phone = parentDoc.data().phone || parentDoc.data().phoneNumber;
                    }
                } catch (e) {
                    logger.error('Could not fetch parent phone', e);
                }
            }

            if (!phone) {
                Alert.alert('שגיאה', 'מספר טלפון לא זמין עבור הורה זה');
                return;
            }

            // Format phone number (remove leading 0 and add +972)
            let formattedPhone = phone.replace(/[^0-9]/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '972' + formattedPhone.substring(1);
            }

            const message = `היי ${booking.parentName}! תודה רבה שבחרת בי לבייביסיטר. אשמח מאוד אם תוכל/י להקדיש דקה לדרג אותי באפליקציה, זה ממש עוזר לי! ⭐️`;
            const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

            Linking.canOpenURL(url)
                .then((supported) => {
                    if (!supported) {
                        Alert.alert('שגיאה', 'וואטסאפ לא מותקן על המכשיר');
                    } else {
                        return Linking.openURL(url);
                    }
                })
                .catch((err) => logger.error('WhatsApp Error:', err));
        };

        return (
            <View style={[styles.bookingCardGlass, {
                backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            }]}>
                {/* Glass Gradient Overlay */}
                <LinearGradient
                    colors={isDarkMode
                        ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
                        : ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.6)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.bookingCardContent}>
                    {/* Header Row */}
                    <View style={styles.bookingHeaderGlass}>
                        {booking.parentPhoto ? (
                            <View style={styles.parentPhotoContainer}>
                                <Image source={{ uri: booking.parentPhoto }} style={styles.parentPhotoGlass} />
                                <View style={[styles.parentPhotoBorder, {
                                    borderColor: statusConfig.color,
                                    shadowColor: statusConfig.color,
                                }]} />
                            </View>
                        ) : (
                            <View style={styles.parentPhotoContainer}>
                                <View style={[styles.parentPhotoPlaceholderGlass, {
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                                }]}>
                                    <User size={22} color={theme.textSecondary} strokeWidth={2} />
                                </View>
                            </View>
                        )}

                        <View style={styles.bookingInfoGlass}>
                            <Text style={[styles.parentNameGlass, { color: theme.textPrimary }]}>
                                {booking.parentName}
                            </Text>
                            <View style={styles.bookingMetaRow}>
                                <View style={styles.bookingMetaItem}>
                                    <Calendar size={12} color={theme.textSecondary} strokeWidth={2} />
                                    <Text style={[styles.bookingMetaText, { color: theme.textSecondary }]}>
                                        {format(booking.date, 'd/M/yy', { locale: he })}
                                    </Text>
                                </View>
                                <View style={styles.bookingMetaItem}>
                                    <Clock size={12} color={theme.textSecondary} strokeWidth={2} />
                                    <Text style={[styles.bookingMetaText, { color: theme.textSecondary }]}>
                                        {booking.startTime}-{booking.endTime}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Status Badge - Minimalist */}
                        <View style={[styles.statusBadgeGlass, {
                            backgroundColor: statusConfig.bgColor,
                            borderColor: statusConfig.borderColor,
                        }]}>
                            {statusConfig.icon}
                        </View>
                    </View>

                    {/* Details Row */}
                    <View style={styles.bookingDetailsGlass}>
                        <View style={[styles.detailItemGlass, {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        }]}>
                            <Baby size={15} color={theme.textSecondary} strokeWidth={2} />
                            <Text style={[styles.detailTextGlass, { color: theme.textPrimary }]}>
                                {booking.childrenCount} ילדים
                            </Text>
                        </View>

                        {/* Status Text Badge */}
                        <View style={[styles.statusTextBadge, {
                            backgroundColor: 'transparent',
                            borderColor: statusConfig.borderColor,
                            borderWidth: 1,
                        }]}>
                            <Text style={[styles.statusTextGlass, { color: statusConfig.color }]}>
                                {statusConfig.text}
                            </Text>
                        </View>
                    </View>

                    {/* Actions - MONOCHROMATIC */}
                    {booking.status === 'pending' && (
                        <View style={styles.bookingActionsGlass}>
                            <TouchableOpacity
                                style={[styles.declineBtnGlass, {
                                    backgroundColor: 'transparent',
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                                }]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    handleDeclineBooking(booking.id);
                                }}
                                activeOpacity={0.7}
                            >
                                <XCircle size={16} color={theme.textSecondary} strokeWidth={2.5} />
                                <Text style={[styles.declineBtnTextGlass, { color: theme.textSecondary }]}>דחה</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.acceptBtnGlass, {
                                    backgroundColor: isDarkMode ? '#fff' : '#000',
                                    shadowColor: isDarkMode ? '#fff' : '#000',
                                }]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleAcceptBooking(booking.id);
                                }}
                                activeOpacity={0.8}
                            >
                                <CheckCircle size={16} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                <Text style={[styles.acceptBtnTextGlass, { color: isDarkMode ? '#000' : '#fff' }]}>אשר</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {booking.status === 'accepted' && (
                        <TouchableOpacity
                            style={[styles.startShiftBtnGlass, {
                                backgroundColor: isDarkMode ? '#fff' : '#000',
                                shadowColor: isDarkMode ? '#fff' : '#000',
                            }]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                handleStartShift(booking);
                            }}
                            activeOpacity={0.8}
                        >
                            <Play size={18} color={isDarkMode ? '#000' : '#fff'} fill={isDarkMode ? '#000' : '#fff'} strokeWidth={2} />
                            <Text style={[styles.startShiftTextGlass, { color: isDarkMode ? '#000' : '#fff' }]}>התחל משמרת</Text>
                        </TouchableOpacity>
                    )}

                    {/* Ask for Rating WhatsApp Button */}
                    {booking.status === 'completed' && (
                        <TouchableOpacity
                            style={[styles.startShiftBtnGlass, {
                                backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.15)' : '#dcf8c6',
                                shadowColor: '#25D366',
                                marginTop: 12, // Space from bottom details
                            }]}
                            onPress={handleRequestRatingWhatsApp}
                            activeOpacity={0.8}
                        >
                            <MessageSquare size={18} color="#25D366" strokeWidth={2.5} />
                            <Text style={[styles.startShiftTextGlass, { color: '#25D366' }]}>בקש דירוג בוואטסאפ</Text>
                        </TouchableOpacity>
                    )}
                </View>


            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.textPrimary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Background Gradient - Apple Style */}
            <LinearGradient
                colors={isDarkMode
                    ? [theme.background, theme.cardSecondary, theme.background]
                    : ['#FFFFFF', '#FFFFFF', '#FFFFFF']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textPrimary} />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {/* ✨ Premium Header - Glassmorphic */}
                <View style={[styles.headerGlass, {
                    backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                }]}>
                    <View style={styles.headerTopGlass}>
                        <TouchableOpacity
                            style={[styles.headerButton, {
                                width: 36, height: 36, borderRadius: 18,
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                alignItems: 'center', justifyContent: 'center',
                            }]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                navigation.goBack();
                            }}
                        >
                            <ChevronRight size={22} color={theme.textPrimary} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitleGlass, { color: theme.textPrimary }]}>
                            מצב סיטר
                        </Text>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSettingsVisible(true);
                            }}
                        >
                            <Settings size={22} color={theme.textSecondary} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    {/* ✨ Premium Profile Section */}
                    <View style={styles.profileSectionGlass}>
                        <View style={styles.profilePhotoContainer}>
                            {sitterProfile?.photoUrl ? (
                                <>
                                    <Image source={{ uri: sitterProfile.photoUrl }} style={styles.profilePhotoGlass} />
                                    <View style={[styles.profilePhotoBorder, {
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                                        shadowColor: isDarkMode ? '#fff' : '#000',
                                    }]} />
                                </>
                            ) : (
                                <View style={[styles.profilePhotoPlaceholderGlass, {
                                    backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', // Slate-700 / Slate-200
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                }]}>
                                    <User size={40} color={isDarkMode ? '#94A3B8' : '#64748B'} strokeWidth={2} />
                                </View>
                            )}
                            {sitterProfile?.isVerified && (
                                <View style={[styles.verifiedBadgeGlass, {
                                    backgroundColor: '#0D9488', // Teal 600
                                    shadowColor: '#0D9488',
                                    shadowOpacity: 0.3,
                                }]}>
                                    <CheckCircle size={14} color="#fff" strokeWidth={3} />
                                </View>
                            )}
                        </View>

                        <View style={styles.profileInfoGlass}>
                            <Text style={[styles.profileNameGlass, { color: theme.textPrimary }]}>
                                {sitterProfile?.name || 'סיטר'}
                            </Text>
                            {sitterProfile?.rating ? (
                                <View style={styles.ratingRowGlass}>
                                    <Star size={16} color="#F59E0B" fill="#F59E0B" strokeWidth={2} />
                                    <Text style={[styles.ratingTextGlass, { color: theme.textPrimary }]}>
                                        <Text style={{ fontWeight: '800' }}>{sitterProfile.rating.toFixed(1)}</Text>
                                        <Text style={[{ color: theme.textSecondary, fontWeight: '600' }]}>
                                            {' '}({sitterProfile.reviewCount} ביקורות)
                                        </Text>
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Hourly Rate Pill */}
                    <View style={[styles.hourlyRateBadge, {
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                    }]}>
                        <Text style={[styles.hourlyRateValue, { color: theme.textPrimary }]}>
                            ₪{hourlyRate}
                        </Text>
                        <Text style={[styles.hourlyRateLabel, { color: theme.textSecondary }]}>
                            /שעה
                        </Text>
                    </View>
                </View>

                {/* Quick Profile Actions - Preview & Share */}
                <View style={styles.profileActionsRow}>
                    <TouchableOpacity
                        style={[styles.profileActionBtn, {
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                        }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('SitterProfile', {
                                sitterData: {
                                    id: sitterProfile?.id || '',
                                    name: sitterProfile?.name || 'סיטר',
                                    age: parseInt(age) || 0,
                                    image: sitterProfile?.photoUrl || '',
                                    rating: sitterProfile?.rating || 0,
                                    reviews: sitterProfile?.reviewCount || 0,
                                    price: hourlyRate,
                                    distance: 0,
                                    phone: phoneNumber,
                                    bio: bio,
                                    socialLinks: {
                                        instagram: socialInstagram.trim() || undefined,
                                        facebook: socialFacebook.trim() || undefined,
                                        linkedin: socialLinkedin.trim() || undefined,
                                        whatsapp: socialWhatsapp.trim() || undefined,
                                        tiktok: socialTiktok.trim() || undefined,
                                        telegram: socialTelegram.trim() || undefined,
                                    },
                                    experience: experience.trim() || undefined,
                                    languages: languages.length > 0 ? languages : undefined,
                                    certifications: certifications.length > 0 ? certifications : undefined,
                                    city: sitterCity.trim() || undefined,
                                    isVerified: sitterProfile?.isVerified || false,
                                },
                            });
                        }}
                        activeOpacity={0.7}
                    >
                        <ExternalLink size={16} color={theme.textPrimary} strokeWidth={2} />
                        <Text style={[styles.profileActionText, { color: theme.textPrimary }]}>
                            ראה פרופיל כהורה
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.profileActionBtn, {
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                        }]}
                        onPress={async () => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            try {
                                const name = sitterProfile?.name || 'סיטר';
                                const ratingLine = sitterProfile?.rating
                                    ? `${sitterProfile.rating.toFixed(1)} ⭐ | ${sitterProfile.reviewCount} ביקורות\n`
                                    : '';
                                const cityLine = sitterCity ? `📍 ${sitterCity}\n` : '';
                                // TODO: Replace with actual App Store / Play Store link
                                const appLink = 'https://apps.apple.com/app/calmino';
                                await Share.share({
                                    message: `היי 👋\nאני ${name}, בייביסיטר באפליקציית Calmino.\n\n${ratingLine}${cityLine}\nרוצה לראות את הפרופיל שלי? הורידו את Calmino:\n${appLink}`,
                                });
                            } catch (error) {
                                logger.error('Share error:', error);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Share2 size={16} color={theme.textPrimary} strokeWidth={2} />
                        <Text style={[styles.profileActionText, { color: theme.textPrimary }]}>
                            שתף פרופיל
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Rating Button */}
                <TouchableOpacity
                    style={[styles.profileActionBtn, {
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                        marginTop: 12,
                        marginBottom: 20,
                        marginHorizontal: 20,
                        justifyContent: 'center'
                    }]}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        try {
                            const sitterId = auth.currentUser?.uid;
                            const msg = `היי! אשמח ממש אם תוכלי להקדיש דקה לדרג אותי באפליקציית Calmino, זה עוזר לי מאוד 😊\n\nלחצי כאן:\ncalmparentapp://babysitter/${sitterId}`;
                            Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
                                Alert.alert('שגיאה', 'וואטסאפ לא מותקן על המכשיר.');
                            });
                        } catch (error) {
                            logger.error('WhatsApp rating error:', error);
                        }
                    }}
                    activeOpacity={0.7}
                >
                    <MessageSquare size={16} color={theme.textPrimary} strokeWidth={2} />
                    <Text style={[styles.profileActionText, { color: theme.textPrimary }]}>
                        בקש דירוג בוואטסאפ
                    </Text>
                </TouchableOpacity>

                {/* ✨ MINIMALIST Reviews Card - Monochrome */}
                <View style={styles.reviewsSection}>
                    <TouchableOpacity
                        style={[styles.reviewsCardGlass, {
                            backgroundColor: 'transparent',
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('MyReviews');
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.reviewsIconCircle, {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        }]}>
                            <Star
                                size={24}
                                color="#F59E0B"
                                fill="none"
                                strokeWidth={1.5}
                            />
                        </View>
                        <View style={styles.reviewsContent}>
                            {sitterProfile?.reviewCount > 0 ? (
                                <>
                                    <Text style={[styles.reviewsLabelGlass, { color: theme.textSecondary }]}>
                                        הביקורות שלי
                                    </Text>
                                    <Text style={[styles.reviewsValueGlass, { color: theme.textPrimary }]}>
                                        {sitterProfile.rating.toFixed(1)} ★ ({sitterProfile.reviewCount})
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.reviewsValueGlass, { color: theme.textSecondary }]}>
                                    אין ביקורות עדיין
                                </Text>
                            )}
                        </View>
                        <ChevronLeft size={20} color={theme.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* ✨ MINIMALIST Quick Actions - Monochrome */}
                <View style={styles.quickActionsGlass}>
                    {/* Available Tonight Toggle Container */}
                    <View style={{
                        flexDirection: 'row-reverse',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    }}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.quickActionIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }]}>
                                <Zap size={20} color="#10B981" strokeWidth={2} />
                            </View>
                            <View>
                                <Text style={[styles.quickActionTitleGlass, { color: theme.textPrimary, textAlign: 'right' }]}>פנוי/ה להערב</Text>
                                <Text style={[styles.quickActionDesc, { color: theme.textSecondary, textAlign: 'right' }]}>הורים יראו שאת/ה זמין/ה עכשיו</Text>
                            </View>
                        </View>
                        <Switch
                            value={isAvailableTonight}
                            onValueChange={async (val) => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsAvailableTonight(val);
                                try {
                                    const userId = auth.currentUser?.uid;
                                    if (userId) {
                                        await updateDoc(doc(db, 'users', userId), {
                                            isAvailableTonight: val
                                        });
                                    }
                                } catch (error) {
                                    setIsAvailableTonight(!val);
                                    logger.error('Toggle available tonight failed:', error);
                                }
                            }}
                            trackColor={{ false: isDarkMode ? '#333' : '#E5E7EB', true: '#10B981' }}
                            thumbColor={isDarkMode ? '#fff' : '#fff'}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.quickActionCardGlass, {
                            backgroundColor: 'transparent',
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setAvailabilityModalVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.quickActionIconCircle, {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        }]}>
                            <Calendar size={22} color={theme.textSecondary} strokeWidth={1.5} />
                        </View>
                        <View style={styles.quickActionContent}>
                            <Text style={[styles.quickActionTitleGlass, { color: theme.textPrimary }]}>
                                זמינות
                            </Text>
                            <Text style={[styles.quickActionSubtextGlass, { color: theme.textSecondary }]}>
                                {availableDays.length} ימים • {availableHours[availableDays[0]]?.start || '09:00'}-{availableHours[availableDays[0]]?.end || '18:00'}
                            </Text>
                        </View>
                        <ChevronLeft size={18} color={theme.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Analytics Section */}
                <View style={styles.bookingsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>סטטיסטיקות</Text>

                    {/* Profile Views Chart */}
                    <View style={[styles.analyticsCard, {
                        backgroundColor: 'transparent',
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                    }]}>
                        <View style={styles.analyticsCardHeader}>
                            <View style={styles.analyticsCardTitleRow}>
                                <View style={[styles.analyticsIconCircle, {
                                    backgroundColor: 'transparent',
                                    borderWidth: 1.5,
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                                }]}>
                                    <Eye size={18} color={theme.textSecondary} strokeWidth={2} />
                                </View>
                                <Text style={[styles.analyticsCardTitle, { color: theme.textPrimary }]}>
                                    צפיות בפרופיל
                                </Text>
                            </View>
                            <View style={styles.analyticsCardStats}>
                                <Text style={[styles.analyticsMainStat, { color: theme.textPrimary }]}>
                                    {profileViewStats?.totalWeek ?? 0}
                                </Text>
                                <Text style={[styles.analyticsSubStat, { color: theme.textSecondary }]}>
                                    ב-7 ימים אחרונים
                                </Text>
                            </View>
                        </View>

                        {/* Mini Bar Chart */}
                        <View style={styles.chartContainer}>
                            {(profileViewStats?.dailyViews || [
                                { date: 'א׳', count: 0 }, { date: 'ב׳', count: 0 },
                                { date: 'ג׳', count: 0 }, { date: 'ד׳', count: 0 },
                                { date: 'ה׳', count: 0 }, { date: 'ו׳', count: 0 },
                                { date: 'ש׳', count: 0 },
                            ]).map((day, index) => {
                                const maxCount = Math.max(1, ...(profileViewStats?.dailyViews || []).map(d => d.count));
                                const barHeight = day.count > 0 ? Math.max(8, (day.count / maxCount) * 60) : 4;
                                return (
                                    <View key={index} style={styles.chartBarColumn}>
                                        <Text style={[styles.chartBarValue, { color: theme.textSecondary }]}>
                                            {day.count > 0 ? day.count : ''}
                                        </Text>
                                        <View style={[styles.chartBar, {
                                            height: barHeight,
                                            backgroundColor: day.count > 0
                                                ? (isDarkMode ? 'rgba(100, 160, 255, 0.6)' : 'rgba(60, 130, 246, 0.55)')
                                                : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                                            borderRadius: 8,
                                        }]} />
                                        <Text style={[styles.chartBarLabel, { color: theme.textSecondary }]}>
                                            {day.date}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {profileViewStats && profileViewStats.totalAllTime > 0 && (
                            <Text style={[styles.analyticsFooter, { color: theme.textSecondary }]}>
                                סה״כ {profileViewStats.totalAllTime} צפיות
                            </Text>
                        )}
                    </View>


                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ✨ Premium Settings Modal */}
            <Modal
                visible={settingsVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSettingsVisible(false)}
            >
                <View style={[styles.settingsOverlayGlass, { backgroundColor: theme.background }]}>
                    <View style={[styles.settingsModalGlass, { backgroundColor: theme.background }]}>
                        {/* ✨ Premium Header */}
                        <View style={styles.settingsHeaderGlass}>
                            <TouchableOpacity
                                style={styles.closeButtonSettings}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSettingsVisible(false);
                                }}
                            >
                                <X size={22} color={theme.textSecondary} strokeWidth={2} />
                            </TouchableOpacity>
                            <Text style={[styles.settingsTitleGlass, { color: theme.textPrimary }]}>
                                הגדרות סיטר
                            </Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContentGlass}>
                            {/* ✨ Premium Profile Photo Section */}
                            <TouchableOpacity
                                style={styles.profilePhotoSection}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleChangePhoto();
                                }}
                                disabled={uploadingPhoto}
                                activeOpacity={0.7}
                            >
                                <View style={styles.profilePhotoWrapperGlass}>
                                    {profilePhoto ? (
                                        <>
                                            <Image
                                                source={{ uri: profilePhoto }}
                                                style={styles.profilePhotoLarge}
                                            />
                                            <View style={[styles.profilePhotoGlowBorder, {
                                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                                                shadowColor: isDarkMode ? '#fff' : '#000',
                                            }]} />
                                        </>
                                    ) : (
                                        <View style={[styles.profilePhotoPlaceholderLarge, {
                                            backgroundColor: isDarkMode ? '#334155' : '#E2E8F0', // Slate-700 / Slate-200
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                        }]}>
                                            <User size={48} color={isDarkMode ? '#94A3B8' : '#64748B'} strokeWidth={2} />
                                        </View>
                                    )}
                                    <View style={[styles.cameraBadgeLarge, {
                                        backgroundColor: isDarkMode ? '#fff' : '#000',
                                        shadowColor: isDarkMode ? '#fff' : '#000',
                                    }]}>
                                        {uploadingPhoto ? (
                                            <ActivityIndicator size="small" color={isDarkMode ? '#000' : '#fff'} />
                                        ) : (
                                            <Camera size={18} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                        )}
                                    </View>
                                </View>
                                <Text style={[styles.changePhotoText, {
                                    color: uploadingPhoto ? theme.textSecondary : theme.textPrimary,
                                }]}>
                                    {uploadingPhoto ? 'מעלה תמונה...' : 'שנה תמונה'}
                                </Text>
                            </TouchableOpacity>

                            {/* ─── Contact ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>פרטי קשר</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                <View style={styles.settingsCardRow}>
                                    <TouchableOpacity
                                        style={[styles.gpsCompactBtn, {
                                            backgroundColor: gpsLocation ? (isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)') : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                            borderColor: gpsLocation ? '#3B82F6' : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                                        }]}
                                        onPress={async () => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            if (gpsLocation) { setGpsLocation(null); return; }
                                            setIsLoadingLocation(true);
                                            try {
                                                const { status } = await Location.requestForegroundPermissionsAsync();
                                                if (status !== 'granted') { Alert.alert('הרשאות נדרשות', 'אנא אפשר גישה למיקום בהגדרות הטלפון'); setIsLoadingLocation(false); return; }
                                                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                                setGpsLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
                                                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            } catch (error) {
                                                logger.error('Location error:', error);
                                                Alert.alert('שגיאה', 'לא ניתן לקבל מיקום. אנא נסה שוב.');
                                            } finally { setIsLoadingLocation(false); }
                                        }}
                                        disabled={isLoadingLocation}
                                        activeOpacity={0.7}
                                    >
                                        {isLoadingLocation ? (
                                            <ActivityIndicator size="small" color={theme.textSecondary} />
                                        ) : (
                                            <View>
                                                <MapPin size={16} color={gpsLocation ? '#3B82F6' : theme.textSecondary} strokeWidth={2.5} />
                                                {gpsLocation && (<View style={styles.gpsCheckBadge}><Check size={10} color="#fff" strokeWidth={4} /></View>)}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.settingsCardInput, { color: theme.textPrimary }]}
                                        value={sitterCity}
                                        onChangeText={setSitterCity}
                                        placeholder="תל אביב"
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="right"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>עיר</Text>
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.settingsCardRow}>
                                    <TextInput
                                        style={[styles.settingsCardInput, { color: theme.textSecondary, textAlign: 'right' }]}
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        placeholder="0527736534"
                                        placeholderTextColor={theme.textSecondary}
                                        keyboardType="phone-pad"
                                        textAlign="right"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>טלפון</Text>
                                </View>
                            </View>

                            {/* ─── Price ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>תמחור</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                <View style={styles.settingsCardRow}>
                                    <View style={styles.priceStepperCompact}>
                                        <TouchableOpacity
                                            style={[styles.stepBtnSmall, { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                                            onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHourlyRate(Math.max(30, hourlyRate - 5)); }}
                                            activeOpacity={0.7}
                                        >
                                            <Minus size={14} color={theme.textPrimary} strokeWidth={2.5} />
                                        </TouchableOpacity>
                                        <Text style={[styles.priceValueCompact, { color: theme.textPrimary }]}>₪{hourlyRate}</Text>
                                        <TouchableOpacity
                                            style={[styles.stepBtnSmall, { borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                                            onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHourlyRate(Math.min(200, hourlyRate + 5)); }}
                                            activeOpacity={0.7}
                                        >
                                            <Plus size={14} color={theme.textPrimary} strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>מחיר לשעה</Text>
                                </View>
                            </View>

                            {/* ─── Availability ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>זמינות</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                <View style={styles.settingsToggleRow}>
                                    <Switch
                                        value={notificationsEnabled}
                                        onValueChange={(v) => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotificationsEnabled(v); }}
                                        trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#3B82F6' }}
                                        thumbColor={isDarkMode ? (notificationsEnabled ? '#000' : '#999') : '#fff'}
                                        ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>התראות</Text>
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.settingsToggleRow}>
                                    <Switch
                                        value={availableForBookings}
                                        onValueChange={(v) => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAvailableForBookings(v); }}
                                        trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#3B82F6' }}
                                        thumbColor={isDarkMode ? (availableForBookings ? '#000' : '#999') : '#fff'}
                                        ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>זמין להזמנות</Text>
                                </View>
                            </View>

                            {/* ─── Social ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>רשתות חברתיות</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                padding: 16,
                            }]}>
                                <View style={{
                                    flexDirection: 'row-reverse',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    gap: 14,
                                }}>
                                    {[
                                        { id: 'instagram', icon: Instagram, color: '#E1306C', value: socialInstagram, setValue: setSocialInstagram, placeholder: 'username', prefix: 'instagram.com/', name: 'Instagram' },
                                        { id: 'facebook', icon: Facebook, color: '#1877F2', value: socialFacebook, setValue: setSocialFacebook, placeholder: 'username', prefix: 'facebook.com/', name: 'Facebook' },
                                        { id: 'linkedin', icon: Linkedin, color: '#0077B5', value: socialLinkedin, setValue: setSocialLinkedin, placeholder: 'username', prefix: 'linkedin.com/in/', name: 'LinkedIn' },
                                        { id: 'whatsapp', icon: (props: any) => <FontAwesome5 name="whatsapp" {...props} />, color: '#25D366', value: socialWhatsapp, setValue: setSocialWhatsapp, placeholder: '+972...', prefix: 'wa.me/', name: 'WhatsApp' },

                                        { id: 'telegram', icon: Send, color: '#0088CC', value: socialTelegram, setValue: setSocialTelegram, placeholder: 'username', prefix: 't.me/', name: 'Telegram' }
                                    ].map((social) => {
                                        // Type assertion for map callback to allow specific string literal types from state
                                        const isConnected = !!social.value;
                                        const IconComp = social.icon;

                                        return (
                                            <TouchableOpacity
                                                key={social.id}
                                                style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 18,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderWidth: 1,
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', // Neutral Background
                                                    borderColor: isConnected
                                                        ? 'rgba(16, 185, 129, 0.4)' // Subtle Green Border
                                                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.1,
                                                    shadowRadius: 4,
                                                    elevation: 3,
                                                }}
                                                onPress={() => {
                                                    setActiveSocialPlatform(social as any);
                                                    setSocialModalVisible(true);
                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                            >
                                                <IconComp
                                                    size={24}
                                                    color={isDarkMode ? '#ffffff' : '#000000'} // Classic Monochrome
                                                    strokeWidth={isConnected ? 2 : 1.5}
                                                />
                                                {isConnected && (
                                                    <View style={{
                                                        position: 'absolute',
                                                        bottom: -4,
                                                        right: -4,
                                                        width: 18,
                                                        height: 18,
                                                        borderRadius: 9,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderWidth: 2,
                                                        borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', // Match modal background
                                                        backgroundColor: '#10B981', // Cute Green V
                                                    }}>
                                                        <Check size={10} color="#fff" strokeWidth={4} />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* ─── About ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>אודותיי</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                {/* Bio */}
                                <View style={[styles.settingsCardRow, { flexDirection: 'column', alignItems: 'flex-end', gap: 6 }]}>
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary, textAlign: 'right', width: '100%' }]}>תיאור עצמי</Text>
                                    <TextInput
                                        style={[styles.bioInput, {
                                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                            color: theme.textPrimary,
                                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                            borderWidth: StyleSheet.hairlineWidth,
                                            borderRadius: 10,
                                            padding: 10,
                                            width: '100%',
                                            fontSize: 14,
                                            textAlignVertical: 'top',
                                        }]}
                                        value={bio}
                                        onChangeText={setBio}
                                        placeholder="היי! אני אוהב/ת ילדים, יש לי ניסיון של..."
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="right"
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                {/* Age */}
                                <View style={styles.settingsCardRow}>
                                    <TextInput
                                        style={[styles.settingsCardInput, { color: theme.textSecondary, textAlign: 'left', width: 60 }]}
                                        value={age}
                                        onChangeText={setAge}
                                        placeholder="25"
                                        placeholderTextColor={theme.textSecondary}
                                        keyboardType="numeric"
                                        textAlign="left"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>גיל</Text>
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                {/* Experience */}
                                <View style={styles.settingsCardRow}>
                                    <TextInput
                                        style={[styles.settingsCardInput, { color: theme.textSecondary, flex: 1, textAlign: 'left' }]}
                                        value={experience}
                                        onChangeText={setExperience}
                                        placeholder="5 שנים ניסיון..."
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="left"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>ניסיון</Text>
                                </View>
                            </View>{/* end settingsCard About */}

                            {/* ─── Languages ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>שפות</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                padding: 14,
                            }]}>
                                <View style={styles.tagsContainer}>
                                    {['עברית', 'אנגלית', 'ערבית', 'רוסית', 'צרפתית', 'ספרדית'].map((lang) => (
                                        <TouchableOpacity
                                            key={lang}
                                            style={[styles.tag, {
                                                backgroundColor: languages.includes(lang)
                                                    ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)')
                                                    : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                                                borderColor: languages.includes(lang)
                                                    ? theme.textPrimary
                                                    : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                                            }]}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (languages.includes(lang)) {
                                                    setLanguages(languages.filter(l => l !== lang));
                                                } else {
                                                    setLanguages([...languages, lang]);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.tagText, {
                                                color: languages.includes(lang)
                                                    ? theme.textPrimary
                                                    : theme.textSecondary,
                                            }]}>
                                                {lang}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {/* Custom languages tags */}
                                    {languages.filter(l => !['עברית', 'אנגלית', 'ערבית', 'רוסית', 'צרפתית', 'ספרדית'].includes(l)).map((lang) => (
                                        <TouchableOpacity
                                            key={lang}
                                            style={[styles.tag, {
                                                backgroundColor: isDarkMode ? '#fff' : '#000',
                                                borderColor: isDarkMode ? '#fff' : '#000',
                                            }]}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setLanguages(languages.filter(l => l !== lang));
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.tagText, {
                                                color: isDarkMode ? '#000' : '#fff',
                                            }]}>
                                                {lang} ✕
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {/* Add custom language */}
                                <View style={styles.addTagRow}>
                                    <TouchableOpacity
                                        style={[styles.addTagBtn, {
                                            backgroundColor: isDarkMode ? '#fff' : '#000',
                                        }]}
                                        onPress={() => {
                                            if (newLanguage.trim()) {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setLanguages([...languages, newLanguage.trim()]);
                                                setNewLanguage('');
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Plus size={18} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.addTagInput, {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                                            color: theme.textPrimary,
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        value={newLanguage}
                                        onChangeText={setNewLanguage}
                                        placeholder="הוסף שפה חדשה..."
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="right"
                                        onSubmitEditing={() => {
                                            if (newLanguage.trim()) {
                                                setLanguages([...languages, newLanguage.trim()]);
                                                setNewLanguage('');
                                            }
                                        }}
                                    />
                                </View>
                            </View>

                            {/* ─── Certifications ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>תעודות</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                padding: 14,
                            }]}>
                                <View style={styles.tagsContainer}>
                                    {['עזרה ראשונה', 'החייאה (CPR)', 'קורס בייביסיטר', 'גננת מוסמכת', 'סייעת מוסמכת'].map((cert) => (
                                        <TouchableOpacity
                                            key={cert}
                                            style={[styles.tag, {
                                                backgroundColor: certifications.includes(cert)
                                                    ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)')
                                                    : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                                                borderColor: certifications.includes(cert)
                                                    ? theme.textPrimary
                                                    : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'),
                                            }]}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (certifications.includes(cert)) {
                                                    setCertifications(certifications.filter(c => c !== cert));
                                                } else {
                                                    setCertifications([...certifications, cert]);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.tagText, {
                                                color: certifications.includes(cert)
                                                    ? (isDarkMode ? '#000' : '#fff')
                                                    : theme.textSecondary,
                                            }]}>
                                                {cert}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {/* Custom certifications tags */}
                                    {certifications.filter(c => !['עזרה ראשונה', 'החייאה (CPR)', 'קורס בייביסיטר', 'גננת מוסמכת', 'סייעת מוסמכת'].includes(c)).map((cert) => (
                                        <TouchableOpacity
                                            key={cert}
                                            style={[styles.tag, {
                                                backgroundColor: isDarkMode ? '#fff' : '#000',
                                                borderColor: isDarkMode ? '#fff' : '#000',
                                            }]}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setCertifications(certifications.filter(c => c !== cert));
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.tagText, {
                                                color: isDarkMode ? '#000' : '#fff',
                                            }]}>
                                                {cert} ✕
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {/* Add custom certification */}
                                <View style={styles.addTagRow}>
                                    <TouchableOpacity
                                        style={[styles.addTagBtn, {
                                            backgroundColor: isDarkMode ? '#fff' : '#000',
                                        }]}
                                        onPress={() => {
                                            if (newCertification.trim()) {
                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setCertifications([...certifications, newCertification.trim()]);
                                                setNewCertification('');
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Plus size={18} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.addTagInput, {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                                            color: theme.textPrimary,
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        value={newCertification}
                                        onChangeText={setNewCertification}
                                        placeholder="הוסף תעודה חדשה..."
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="right"
                                        onSubmitEditing={() => {
                                            if (newCertification.trim()) {
                                                setCertifications([...certifications, newCertification.trim()]);
                                                setNewCertification('');
                                            }
                                        }}
                                    />
                                </View>
                            </View>

                            {/* ✨ MONOCHROMATIC Save Button */}
                            <TouchableOpacity
                                style={[styles.saveSettingsBtnGlass, {
                                    backgroundColor: isDarkMode ? '#fff' : '#000',
                                    shadowColor: isDarkMode ? '#fff' : '#000',
                                    opacity: savingSettings ? 0.6 : 1,
                                }]}
                                onPress={async () => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
                                            sitterAvailable: availableForBookings, // Also set sitterAvailable for badge consistency
                                            sitterCity: sitterCity.trim() || null,
                                            sitterLocation: gpsLocation || null, // Update GPS location
                                            sitterPrice: hourlyRate,
                                            sitterAvailableDays: availableDays,
                                            sitterAvailableHours: availableHours,
                                            // Availability exceptions & vacations
                                            sitterAvailabilityExceptions: exceptions,
                                            sitterAvailabilityVacations: vacations,
                                            socialLinks: {
                                                instagram: socialInstagram.trim() || null,
                                                facebook: socialFacebook.trim() || null,
                                                linkedin: socialLinkedin.trim() || null,
                                                whatsapp: socialWhatsapp.trim() || null,
                                                tiktok: socialTiktok.trim() || null,
                                                telegram: socialTelegram.trim() || null,
                                            },
                                            // Profile details
                                            sitterBio: bio.trim() || null,
                                            age: age ? parseInt(age) : null,
                                            sitterExperience: experience.trim() || null,
                                            sitterLanguages: languages,
                                            sitterCertifications: certifications,
                                            sitterVideo: videoUri || null,
                                        });

                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        setSettingsVisible(false);
                                        Alert.alert('נשמר!', 'ההגדרות נשמרו בהצלחה');
                                    } catch (error) {
                                        logger.error('Failed to save settings:', error);
                                        Alert.alert('שגיאה', 'לא ניתן לשמור, נסה שוב');
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={savingSettings}
                                activeOpacity={0.8}
                            >
                                {savingSettings ? (
                                    <ActivityIndicator size="small" color={isDarkMode ? '#000' : '#fff'} />
                                ) : (
                                    <>
                                        <CheckCircle size={20} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                        <Text style={[styles.saveSettingsBtnTextGlass, { color: isDarkMode ? '#000' : '#fff' }]}>שמור הגדרות</Text>
                                    </>
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
                                                        } catch (error) {
                                                            logger.error('Failed to delete sitter account:', error);
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

                {/* Social Media Edit Modal - inside settings modal for iOS compatibility */}
                <Modal
                    visible={socialModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSocialModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
                    >
                        <View style={{
                            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            paddingBottom: 40,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                            elevation: 10,
                            borderWidth: 1,
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        }}>
                            {activeSocialPlatform && (
                                <View style={styles.settingsContentGlass}>
                                    <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 16 }}>
                                        <View style={{
                                            width: 40, height: 5, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                                            borderRadius: 3, marginBottom: 24
                                        }} />

                                        <View style={{
                                            width: 80, height: 80, borderRadius: 24,
                                            backgroundColor: `${activeSocialPlatform.color}15`,
                                            alignItems: 'center', justifyContent: 'center',
                                            marginBottom: 16, borderWidth: 1, borderColor: `${activeSocialPlatform.color}30`
                                        }}>
                                            <activeSocialPlatform.icon
                                                size={40}
                                                color={activeSocialPlatform.color}
                                                strokeWidth={1.5}
                                            />
                                        </View>

                                        <Text style={[styles.settingsTitleGlass, { color: theme.textPrimary, fontSize: 22, textAlign: 'center' }]}>
                                            {activeSocialPlatform.name}
                                        </Text>
                                        <Text style={{ color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
                                            {activeSocialPlatform.value ? 'ערוך קישור לפרופיל' : 'חבר חשבון חדש'}
                                        </Text>
                                    </View>

                                    <View style={{ gap: 16 }}>
                                        <View>
                                            <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginBottom: 8 }]}>קישור או שם משתמש</Text>
                                            <TextInput
                                                style={[styles.settingsInputGlass, {
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F5F5F7',
                                                    borderColor: activeSocialPlatform.value && !validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value)
                                                        ? '#EF4444'
                                                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E5EA'),
                                                    color: theme.textPrimary,
                                                    textAlign: 'left',
                                                    paddingVertical: 14,
                                                    fontSize: 16
                                                }]}
                                                value={activeSocialPlatform.value}
                                                onChangeText={(text) => {
                                                    activeSocialPlatform.setValue(text);
                                                    setActiveSocialPlatform(prev => prev ? ({ ...prev, value: text }) : null);
                                                }}
                                                placeholder={activeSocialPlatform.placeholder}
                                                placeholderTextColor={theme.textSecondary}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                                autoFocus={true}
                                            />
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingHorizontal: 4 }}>
                                                {activeSocialPlatform.prefix && (
                                                    <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'left' }}>
                                                        {activeSocialPlatform.prefix}{activeSocialPlatform.value || '...'}
                                                    </Text>
                                                )}
                                                {activeSocialPlatform.value && !validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value) && (
                                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>
                                                        {activeSocialPlatform.id === 'whatsapp' ? 'הזן מספר טלפון תקין' : 'שם משתמש לא תקין'}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Test Link Button */}
                                        {activeSocialPlatform.value && validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value) && (
                                            <TouchableOpacity
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    paddingVertical: 12,
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                }}
                                                onPress={() => {
                                                    openSocialLink(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <ExternalLink size={16} color={activeSocialPlatform.color} strokeWidth={2} />
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: activeSocialPlatform.color }}>
                                                    בדוק קישור
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                            <TouchableOpacity
                                                style={{
                                                    flex: 1, paddingVertical: 16, borderRadius: 16,
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F2F2F7',
                                                    alignItems: 'center'
                                                }}
                                                onPress={() => setSocialModalVisible(false)}
                                            >
                                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>ביטול</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={{
                                                    flex: 1, paddingVertical: 16, borderRadius: 16,
                                                    backgroundColor: activeSocialPlatform.value && validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value)
                                                        ? activeSocialPlatform.color
                                                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                                    alignItems: 'center',
                                                    shadowColor: activeSocialPlatform.color,
                                                    shadowOffset: { width: 0, height: 4 },
                                                    shadowOpacity: activeSocialPlatform.value && validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value) ? 0.3 : 0,
                                                    shadowRadius: 8,
                                                    elevation: activeSocialPlatform.value && validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value) ? 4 : 0
                                                }}
                                                onPress={() => {
                                                    if (!activeSocialPlatform.value) {
                                                        // Empty = remove the link
                                                        setSocialModalVisible(false);
                                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                        return;
                                                    }
                                                    if (!validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value)) {
                                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                                        Alert.alert('שגיאה', activeSocialPlatform.id === 'whatsapp' ? 'הזן מספר טלפון תקין (כולל קידומת מדינה)' : 'שם המשתמש לא תקין. בדוק ונסה שוב.');
                                                        return;
                                                    }
                                                    setSocialModalVisible(false);
                                                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                }}
                                            >
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: activeSocialPlatform.value && validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value) ? '#FFFFFF' : theme.textSecondary }}>שמור</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </Modal>
            </Modal>

            {/* ✨ Premium Availability Modal - Weekly Schedule */}
            <Modal
                visible={availabilityModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAvailabilityModalVisible(false)}
            >
                <View style={styles.availabilityOverlay}>
                    <View style={[styles.availabilityModal, { backgroundColor: theme.card }]}>
                        {/* Premium Header */}
                        <View style={styles.availabilityHeader}>
                            <TouchableOpacity
                                onPress={() => setAvailabilityModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <X size={22} color={theme.textSecondary} strokeWidth={2} />
                            </TouchableOpacity>
                            <View style={styles.availabilityHeaderContent}>
                                <View style={[styles.availabilityIconCircle, {
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                                }]}>
                                    <Calendar size={24} color={theme.textSecondary} strokeWidth={2.5} />
                                </View>
                                <Text style={[styles.availabilityTitle, { color: theme.textPrimary }]}>
                                    זמינות שבועית
                                </Text>
                                <Text style={[styles.availabilitySubtitle, { color: theme.textSecondary }]}>
                                    בחר את הימים והשעות שבהם אתה זמין
                                </Text>
                            </View>
                        </View>

                        {/* Tab Switcher */}
                        <View style={[styles.availabilityTabContainer, {
                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                            borderBottomColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        }]}>
                            <TouchableOpacity
                                style={[styles.availabilityTabBtn, availabilityTab === 'weekly' && styles.availabilityTabActive, {
                                    backgroundColor: availabilityTab === 'weekly'
                                        ? (isDarkMode ? '#fff' : '#000')
                                        : 'transparent',
                                }]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setAvailabilityTab('weekly');
                                }}
                                activeOpacity={0.7}
                            >
                                <Calendar
                                    size={16}
                                    color={availabilityTab === 'weekly'
                                        ? (isDarkMode ? '#000' : '#fff')
                                        : theme.textSecondary}
                                    strokeWidth={2}
                                />
                                <Text style={[styles.availabilityTabText, {
                                    color: availabilityTab === 'weekly'
                                        ? (isDarkMode ? '#000' : '#fff')
                                        : theme.textSecondary,
                                    fontWeight: availabilityTab === 'weekly' ? '700' : '600',
                                }]}>
                                    זמינות שבועית
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.availabilityTabBtn, availabilityTab === 'exceptions' && styles.availabilityTabActive, {
                                    backgroundColor: availabilityTab === 'exceptions'
                                        ? (isDarkMode ? '#fff' : '#000')
                                        : 'transparent',
                                }]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setAvailabilityTab('exceptions');
                                }}
                                activeOpacity={0.7}
                            >
                                <Clock
                                    size={16}
                                    color={availabilityTab === 'exceptions'
                                        ? (isDarkMode ? '#000' : '#fff')
                                        : theme.textSecondary}
                                    strokeWidth={2}
                                />
                                <Text style={[styles.availabilityTabText, {
                                    color: availabilityTab === 'exceptions'
                                        ? (isDarkMode ? '#000' : '#fff')
                                        : theme.textSecondary,
                                    fontWeight: availabilityTab === 'exceptions' ? '700' : '600',
                                }]}>
                                    חריגות ותאריכים
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.availabilityContent}>
                            {/* Weekly Tab Content */}
                            {availabilityTab === 'weekly' && (
                                <View style={styles.compactDaysList}>
                                    {/* Compact List - All Days */}
                                    <View style={styles.compactDaysList}>
                                        {[
                                            { key: '0', label: 'ראשון' },
                                            { key: '1', label: 'שני' },
                                            { key: '2', label: 'שלישי' },
                                            { key: '3', label: 'רביעי' },
                                            { key: '4', label: 'חמישי' },
                                            { key: '5', label: 'שישי' },
                                            { key: '6', label: 'שבת' },
                                        ].map((day, index) => {
                                            const isSelected = availableDays.includes(day.key);
                                            const hours = availableHours[day.key] || { start: '09:00', end: '18:00' };
                                            const showDivider = index < 6;

                                            return (
                                                <View key={day.key}>
                                                    <View style={[styles.compactDayRow, {
                                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                                                    }]}>
                                                        {/* Toggle */}
                                                        <TouchableOpacity
                                                            style={styles.compactToggle}
                                                            onPress={() => {
                                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                setAvailableDays(prev =>
                                                                    prev.includes(day.key)
                                                                        ? prev.filter(d => d !== day.key)
                                                                        : [...prev, day.key]
                                                                );
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View style={[styles.compactToggleCircle, {
                                                                backgroundColor: isSelected ? (isDarkMode ? '#fff' : '#000') : 'transparent',
                                                                borderColor: isSelected
                                                                    ? (isDarkMode ? '#fff' : '#000')
                                                                    : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'),
                                                            }]}>
                                                                {isSelected && (
                                                                    <CheckCircle size={14} color={isDarkMode ? '#000' : '#fff'} strokeWidth={3} />
                                                                )}
                                                            </View>
                                                        </TouchableOpacity>

                                                        {/* Day Name */}
                                                        <Text style={[styles.compactDayName, {
                                                            color: isSelected ? theme.textPrimary : theme.textSecondary,
                                                            fontWeight: isSelected ? '700' : '600',
                                                        }]}>
                                                            {day.label}
                                                        </Text>

                                                        {/* Hours or "לא זמין" */}
                                                        <View style={styles.compactHoursContainer}>
                                                            {isSelected ? (
                                                                <Text style={[styles.compactHoursText, { color: theme.textPrimary }]}>
                                                                    {hours.start} - {hours.end}
                                                                </Text>
                                                            ) : (
                                                                <Text style={[styles.compactUnavailableText, { color: theme.textSecondary }]}>
                                                                    לא זמין
                                                                </Text>
                                                            )}
                                                        </View>

                                                        {/* Edit Arrow */}
                                                        {isSelected && (
                                                            <TouchableOpacity
                                                                style={styles.compactEditBtn}
                                                                onPress={() => {
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    if (editingDayKey === day.key) {
                                                                        // Close if already editing
                                                                        setEditingDayKey(null);
                                                                    } else {
                                                                        // Open editing mode
                                                                        setEditingDayKey(day.key);
                                                                        setTempStartTime(hours.start);
                                                                        setTempEndTime(hours.end);
                                                                    }
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <ChevronLeft
                                                                    size={18}
                                                                    color={theme.textSecondary}
                                                                    strokeWidth={2}
                                                                    style={{
                                                                        transform: [{ rotate: editingDayKey === day.key ? '90deg' : '0deg' }]
                                                                    }}
                                                                />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>

                                                    {/* Inline Time Picker */}
                                                    {isSelected && editingDayKey === day.key && (
                                                        <View style={[styles.inlineTimePicker, {
                                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                                        }]}>
                                                            <View style={styles.timePickerRow}>
                                                                <TextInput
                                                                    style={[styles.timeInput, {
                                                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                                                        color: theme.textPrimary,
                                                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                                                                    }]}
                                                                    value={tempStartTime}
                                                                    onChangeText={setTempStartTime}
                                                                    placeholder="09:00"
                                                                    placeholderTextColor={theme.textSecondary}
                                                                    textAlign="center"
                                                                />
                                                                <Text style={[styles.timeDash, { color: theme.textSecondary }]}>—</Text>
                                                                <TextInput
                                                                    style={[styles.timeInput, {
                                                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                                                        color: theme.textPrimary,
                                                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                                                                    }]}
                                                                    value={tempEndTime}
                                                                    onChangeText={setTempEndTime}
                                                                    placeholder="18:00"
                                                                    placeholderTextColor={theme.textSecondary}
                                                                    textAlign="center"
                                                                />
                                                                <TouchableOpacity
                                                                    style={[styles.timePickerSaveBtn, {
                                                                        backgroundColor: isDarkMode ? '#fff' : '#000',
                                                                    }]}
                                                                    onPress={() => {
                                                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                                        setAvailableHours(prev => ({
                                                                            ...prev,
                                                                            [day.key]: {
                                                                                start: tempStartTime,
                                                                                end: tempEndTime,
                                                                            }
                                                                        }));
                                                                        setEditingDayKey(null);
                                                                    }}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <CheckCircle size={18} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                                                </TouchableOpacity>
                                                                <TouchableOpacity
                                                                    style={[styles.timePickerCancelBtn, {
                                                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                                                                    }]}
                                                                    onPress={() => {
                                                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                        setEditingDayKey(null);
                                                                    }}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <X size={18} color={theme.textSecondary} strokeWidth={2.5} />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    )}

                                                    {showDivider && editingDayKey !== day.key && (
                                                        <View style={[styles.compactDayDivider, {
                                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                                                        }]} />
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Copy to All Days Button */}
                                    <TouchableOpacity
                                        style={[styles.copyToAllBtn, {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            const firstActiveDay = availableDays[0];
                                            if (firstActiveDay && availableHours[firstActiveDay]) {
                                                const hours = availableHours[firstActiveDay];
                                                const newHours: Record<string, { start: string; end: string }> = {};
                                                ['0', '1', '2', '3', '4', '5', '6'].forEach(key => {
                                                    newHours[key] = hours;
                                                });
                                                setAvailableHours(newHours);
                                                Alert.alert('✅ הועתק!', 'השעות הועתקו לכל הימים');
                                            }
                                        }}
                                        activeOpacity={0.7}
                                        disabled={availableDays.length === 0}
                                    >
                                        <Text style={[styles.copyToAllText, { color: theme.textSecondary }]}>
                                            העתק שעות לכל הימים
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Exceptions Tab Content */}
                            {availabilityTab === 'exceptions' && (
                                <View style={styles.exceptionsContainer}>
                                    {/* Instructions */}
                                    <View style={[styles.exceptionsInfo, {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                    }]}>
                                        <Clock size={18} color={theme.textSecondary} strokeWidth={2} />
                                        <Text style={[styles.exceptionsInfoText, { color: theme.textSecondary }]}>
                                            הוסף חריגות מהתבנית השבועית - תאריכים ספציפיים שבהם אתה לא זמין או זמין בשעות שונות
                                        </Text>
                                    </View>

                                    {/* Add Exception Button */}
                                    <TouchableOpacity
                                        style={[styles.addExceptionBtn, {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setAddExceptionModalVisible(true);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Plus size={18} color={theme.textPrimary} strokeWidth={2} />
                                        <Text style={[styles.addExceptionText, { color: theme.textPrimary }]}>
                                            הוסף חריגה
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Exceptions List */}
                                    {exceptions.length > 0 && (
                                        <View style={styles.exceptionsList}>
                                            <Text style={[styles.exceptionsListTitle, { color: theme.textSecondary }]}>
                                                חריגות ({exceptions.length})
                                            </Text>
                                            {exceptions.map((exception) => {
                                                const date = new Date(exception.date);
                                                const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                                                const dayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][date.getDay()];

                                                return (
                                                    <View
                                                        key={exception.id}
                                                        style={[styles.exceptionCard, {
                                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                                        }]}
                                                    >
                                                        <View style={styles.exceptionCardHeader}>
                                                            <Text style={[styles.exceptionDate, { color: theme.textPrimary }]}>
                                                                {formattedDate} ({dayName})
                                                            </Text>
                                                            <TouchableOpacity
                                                                onPress={async () => {
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    const updated = exceptions.filter(e => e.id !== exception.id);
                                                                    setExceptions(updated);
                                                                    try {
                                                                        const userId = auth.currentUser?.uid;
                                                                        if (userId) await updateDoc(doc(db, 'users', userId), { sitterAvailabilityExceptions: updated });
                                                                    } catch (e) { logger.error('Failed to delete exception:', e); }
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <X size={16} color={theme.textSecondary} strokeWidth={2} />
                                                            </TouchableOpacity>
                                                        </View>
                                                        <View style={styles.exceptionCardBody}>
                                                            {exception.type === 'unavailable' ? (
                                                                <Text style={[styles.exceptionStatus, { color: '#EF4444' }]}>
                                                                    ❌ לא זמין
                                                                </Text>
                                                            ) : (
                                                                <Text style={[styles.exceptionStatus, { color: theme.textPrimary }]}>
                                                                    ⏰ {exception.start} - {exception.end}
                                                                </Text>
                                                            )}
                                                            {exception.reason && (
                                                                <Text style={[styles.exceptionReason, { color: theme.textSecondary }]}>
                                                                    {exception.reason}
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Add Vacation Button */}
                                    <TouchableOpacity
                                        style={[styles.addVacationBtn, {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        onPress={() => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setAddVacationModalVisible(true);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Calendar size={18} color={theme.textPrimary} strokeWidth={2} />
                                        <Text style={[styles.addVacationText, { color: theme.textPrimary }]}>
                                            הוסף חופשה (טווח תאריכים)
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Vacations List */}
                                    {vacations.length > 0 && (
                                        <View style={styles.vacationsList}>
                                            <Text style={[styles.vacationsListTitle, { color: theme.textSecondary }]}>
                                                חופשות ({vacations.length})
                                            </Text>
                                            {vacations.map((vacation) => {
                                                const startDate = new Date(vacation.startDate);
                                                const endDate = new Date(vacation.endDate);
                                                const formattedStart = `${startDate.getDate()}/${startDate.getMonth() + 1}`;
                                                const formattedEnd = `${endDate.getDate()}/${endDate.getMonth() + 1}`;

                                                return (
                                                    <View
                                                        key={vacation.id}
                                                        style={[styles.vacationCard, {
                                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                                        }]}
                                                    >
                                                        <View style={styles.vacationCardHeader}>
                                                            <Text style={[styles.vacationDate, { color: theme.textPrimary }]}>
                                                                ✈️ {formattedStart} - {formattedEnd}
                                                            </Text>
                                                            <TouchableOpacity
                                                                onPress={async () => {
                                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    const updated = vacations.filter(v => v.id !== vacation.id);
                                                                    setVacations(updated);
                                                                    try {
                                                                        const userId = auth.currentUser?.uid;
                                                                        if (userId) await updateDoc(doc(db, 'users', userId), { sitterAvailabilityVacations: updated });
                                                                    } catch (e) { logger.error('Failed to delete vacation:', e); }
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <X size={16} color={theme.textSecondary} strokeWidth={2} />
                                                            </TouchableOpacity>
                                                        </View>
                                                        {vacation.reason && (
                                                            <Text style={[styles.vacationReason, { color: theme.textSecondary }]}>
                                                                {vacation.reason}
                                                            </Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {exceptions.length === 0 && vacations.length === 0 && (
                                        <View style={styles.exceptionsEmptyState}>
                                            <Calendar size={48} color={theme.textSecondary} strokeWidth={1.5} opacity={0.3} />
                                            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                                                עדיין לא הוספת חריגות או חופשות
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* MONOCHROMATIC Save Button */}
                            <TouchableOpacity
                                style={[styles.saveAvailabilityBtn, {
                                    backgroundColor: isDarkMode ? '#fff' : '#000',
                                    shadowColor: isDarkMode ? '#fff' : '#000',
                                    opacity: availableDays.length === 0 ? 0.5 : 1,
                                }]}
                                onPress={async () => {
                                    if (availableDays.length === 0) {
                                        Alert.alert('שים לב', 'יש לבחור לפחות יום אחד');
                                        return;
                                    }

                                    try {
                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        setSavingSettings(true);

                                        const userId = auth.currentUser?.uid;
                                        if (userId) {
                                            await updateDoc(doc(db, 'users', userId), {
                                                sitterAvailableDays: availableDays,
                                                sitterAvailabilityLoading: false, // Ensure we don't block
                                                sitterAvailabilityDate: new Date().toISOString(),
                                                // Save exceptions and vacations if any
                                                sitterAvailabilityExceptions: exceptions,
                                                sitterAvailabilityVacations: vacations,
                                                // Ensure sitter is marked as active if they have availability
                                                sitterActive: true
                                            });

                                            // Update local profile state
                                            setAvailabilityModalVisible(false);
                                            Alert.alert('✅ נשמר!', `הזמינות עודכנה ל-${availableDays.length} ימים בשבוע`);

                                            // Refresh data to reflect changes
                                            loadData();
                                        }
                                    } catch (error) {
                                        logger.error('Failed to save availability:', error);
                                        Alert.alert('שגיאה', 'לא ניתן לשמור את הזמינות. נסה שוב.');
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={availableDays.length === 0 || savingSettings}
                                activeOpacity={0.8}
                            >
                                {savingSettings ? (
                                    <ActivityIndicator size="small" color={isDarkMode ? '#000' : '#fff'} />
                                ) : (
                                    <>
                                        <CheckCircle size={20} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                        <Text style={[styles.saveAvailabilityBtnText, { color: isDarkMode ? '#000' : '#fff' }]}>שמור זמינות</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>

                {/* Add Exception Modal - INSIDE availability modal for iOS */}
                <Modal
                    visible={addExceptionModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setAddExceptionModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.exceptionModal, { backgroundColor: theme.card }]}>
                            <View style={styles.exceptionModalHeader}>
                                <Text style={[styles.exceptionModalTitle, { color: theme.textPrimary }]}>
                                    הוסף חריגה
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setAddExceptionModalVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <X size={22} color={theme.textSecondary} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Date Picker */}
                                <Text style={[styles.exceptionLabel, { color: theme.textSecondary }]}>תאריך</Text>
                                <TouchableOpacity
                                    style={[styles.exceptionDateBtn, {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                    }]}
                                    onPress={() => setShowExceptionDatePicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Calendar size={18} color={theme.textPrimary} strokeWidth={2} />
                                    <Text style={[styles.exceptionDateText, { color: theme.textPrimary }]}>
                                        {exceptionDate.toLocaleDateString('he-IL')}
                                    </Text>
                                </TouchableOpacity>

                                {showExceptionDatePicker && (
                                    <DateTimePicker
                                        value={exceptionDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        minimumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            if (Platform.OS !== 'ios') setShowExceptionDatePicker(false);
                                            if (selectedDate) setExceptionDate(selectedDate);
                                        }}
                                        locale="he"
                                    />
                                )}
                                {showExceptionDatePicker && Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={[styles.datePickerDoneBtn, { backgroundColor: isDarkMode ? '#fff' : '#000' }]}
                                        onPress={() => setShowExceptionDatePicker(false)}
                                    >
                                        <Text style={{ color: isDarkMode ? '#000' : '#fff', fontWeight: '700', fontSize: 14 }}>אישור</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Exception Type */}
                                <Text style={[styles.exceptionLabel, { color: theme.textSecondary, marginTop: 16 }]}>סוג</Text>
                                <View style={styles.exceptionTypeRow}>
                                    <TouchableOpacity
                                        style={[styles.exceptionTypeBtn, {
                                            backgroundColor: exceptionType === 'unavailable'
                                                ? (isDarkMode ? '#fff' : '#000')
                                                : (isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        onPress={() => setExceptionType('unavailable')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.exceptionTypeText, {
                                            color: exceptionType === 'unavailable'
                                                ? (isDarkMode ? '#000' : '#fff')
                                                : theme.textPrimary,
                                        }]}>
                                            לא זמין
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.exceptionTypeBtn, {
                                            backgroundColor: exceptionType === 'custom'
                                                ? (isDarkMode ? '#fff' : '#000')
                                                : (isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        }]}
                                        onPress={() => setExceptionType('custom')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.exceptionTypeText, {
                                            color: exceptionType === 'custom'
                                                ? (isDarkMode ? '#000' : '#fff')
                                                : theme.textPrimary,
                                        }]}>
                                            שעות מותאמות
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Custom Hours */}
                                {exceptionType === 'custom' && (
                                    <View style={styles.customHoursRow}>
                                        <View style={styles.customHoursCol}>
                                            <Text style={[styles.exceptionLabel, { color: theme.textSecondary }]}>מ-</Text>
                                            <TextInput
                                                style={[styles.customHoursInput, {
                                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                                    color: theme.textPrimary,
                                                }]}
                                                value={exceptionStartTime}
                                                onChangeText={setExceptionStartTime}
                                                placeholder="09:00"
                                                placeholderTextColor={theme.textSecondary}
                                                textAlign="center"
                                            />
                                        </View>
                                        <View style={styles.customHoursCol}>
                                            <Text style={[styles.exceptionLabel, { color: theme.textSecondary }]}>עד-</Text>
                                            <TextInput
                                                style={[styles.customHoursInput, {
                                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                                    color: theme.textPrimary,
                                                }]}
                                                value={exceptionEndTime}
                                                onChangeText={setExceptionEndTime}
                                                placeholder="18:00"
                                                placeholderTextColor={theme.textSecondary}
                                                textAlign="center"
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Reason (Optional) */}
                                <Text style={[styles.exceptionLabel, { color: theme.textSecondary, marginTop: 16 }]}>סיבה (אופציונלי)</Text>
                                <TextInput
                                    style={[styles.exceptionReasonInput, {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        color: theme.textPrimary,
                                    }]}
                                    value={exceptionReason}
                                    onChangeText={setExceptionReason}
                                    placeholder='למשל: "רופא", "אירוע משפחתי"'
                                    placeholderTextColor={theme.textSecondary}
                                    multiline
                                />

                                {/* Save Button */}
                                <TouchableOpacity
                                    style={[styles.saveExceptionBtn, {
                                        backgroundColor: isDarkMode ? '#fff' : '#000',
                                    }]}
                                    onPress={async () => {
                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        const newException = {
                                            id: Date.now().toString(),
                                            date: exceptionDate.toISOString().split('T')[0],
                                            type: exceptionType,
                                            ...(exceptionType === 'custom' && {
                                                start: exceptionStartTime,
                                                end: exceptionEndTime,
                                            }),
                                            ...(exceptionReason.trim() && { reason: exceptionReason.trim() }),
                                        };
                                        const updatedExceptions = [...exceptions, newException];
                                        setExceptions(updatedExceptions);
                                        setAddExceptionModalVisible(false);
                                        // Auto-save to Firestore
                                        try {
                                            const userId = auth.currentUser?.uid;
                                            if (userId) {
                                                await updateDoc(doc(db, 'users', userId), {
                                                    sitterAvailabilityExceptions: updatedExceptions,
                                                });
                                            }
                                        } catch (e) { logger.error('Failed to save exception:', e); }
                                        // Reset form
                                        setExceptionDate(new Date());
                                        setExceptionType('unavailable');
                                        setExceptionStartTime('09:00');
                                        setExceptionEndTime('18:00');
                                        setExceptionReason('');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <CheckCircle size={20} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                    <Text style={[styles.saveExceptionBtnText, { color: isDarkMode ? '#000' : '#fff' }]}>
                                        הוסף חריגה
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Add Vacation Modal - INSIDE availability modal for iOS */}
                <Modal
                    visible={addVacationModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setAddVacationModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.vacationModal, { backgroundColor: theme.card }]}>
                            <View style={styles.vacationModalHeader}>
                                <Text style={[styles.vacationModalTitle, { color: theme.textPrimary }]}>
                                    הוסף חופשה
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setAddVacationModalVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <X size={22} color={theme.textSecondary} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Start Date */}
                                <Text style={[styles.vacationLabel, { color: theme.textSecondary }]}>תאריך התחלה</Text>
                                <TouchableOpacity
                                    style={[styles.vacationDateBtn, {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                    }]}
                                    onPress={() => setShowVacationStartPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Calendar size={18} color={theme.textPrimary} strokeWidth={2} />
                                    <Text style={[styles.vacationDateText, { color: theme.textPrimary }]}>
                                        {vacationStartDate.toLocaleDateString('he-IL')}
                                    </Text>
                                </TouchableOpacity>

                                {showVacationStartPicker && (
                                    <DateTimePicker
                                        value={vacationStartDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        minimumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            if (Platform.OS !== 'ios') setShowVacationStartPicker(false);
                                            if (selectedDate) setVacationStartDate(selectedDate);
                                        }}
                                        locale="he"
                                    />
                                )}
                                {showVacationStartPicker && Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={[styles.datePickerDoneBtn, { backgroundColor: isDarkMode ? '#fff' : '#000' }]}
                                        onPress={() => setShowVacationStartPicker(false)}
                                    >
                                        <Text style={{ color: isDarkMode ? '#000' : '#fff', fontWeight: '700', fontSize: 14 }}>אישור</Text>
                                    </TouchableOpacity>
                                )}

                                {/* End Date */}
                                <Text style={[styles.vacationLabel, { color: theme.textSecondary, marginTop: 16 }]}>תאריך סיום</Text>
                                <TouchableOpacity
                                    style={[styles.vacationDateBtn, {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                    }]}
                                    onPress={() => setShowVacationEndPicker(true)}
                                    activeOpacity={0.7}
                                >
                                    <Calendar size={18} color={theme.textPrimary} strokeWidth={2} />
                                    <Text style={[styles.vacationDateText, { color: theme.textPrimary }]}>
                                        {vacationEndDate.toLocaleDateString('he-IL')}
                                    </Text>
                                </TouchableOpacity>

                                {showVacationEndPicker && (
                                    <DateTimePicker
                                        value={vacationEndDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        minimumDate={vacationStartDate}
                                        onChange={(event, selectedDate) => {
                                            if (Platform.OS !== 'ios') setShowVacationEndPicker(false);
                                            if (selectedDate) setVacationEndDate(selectedDate);
                                        }}
                                        locale="he"
                                    />
                                )}
                                {showVacationEndPicker && Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={[styles.datePickerDoneBtn, { backgroundColor: isDarkMode ? '#fff' : '#000' }]}
                                        onPress={() => setShowVacationEndPicker(false)}
                                    >
                                        <Text style={{ color: isDarkMode ? '#000' : '#fff', fontWeight: '700', fontSize: 14 }}>אישור</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Reason (Optional) */}
                                <Text style={[styles.vacationLabel, { color: theme.textSecondary, marginTop: 16 }]}>סיבה (אופציונלי)</Text>
                                <TextInput
                                    style={[styles.vacationReasonInput, {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                        color: theme.textPrimary,
                                    }]}
                                    value={vacationReason}
                                    onChangeText={setVacationReason}
                                    placeholder='למשל: "חופשה בחו״ל", "אירוע משפחתי"'
                                    placeholderTextColor={theme.textSecondary}
                                    multiline
                                />

                                {/* Save Button */}
                                <TouchableOpacity
                                    style={[styles.saveVacationBtn, {
                                        backgroundColor: isDarkMode ? '#fff' : '#000',
                                    }]}
                                    onPress={async () => {
                                        if (vacationStartDate > vacationEndDate) {
                                            Alert.alert('שגיאה', 'תאריך התחלה חייב להיות לפני תאריך הסיום');
                                            return;
                                        }
                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        const newVacation = {
                                            id: Date.now().toString(),
                                            startDate: vacationStartDate.toISOString().split('T')[0],
                                            endDate: vacationEndDate.toISOString().split('T')[0],
                                            ...(vacationReason.trim() && { reason: vacationReason.trim() }),
                                        };
                                        const updatedVacations = [...vacations, newVacation];
                                        setVacations(updatedVacations);
                                        setAddVacationModalVisible(false);
                                        // Auto-save to Firestore
                                        try {
                                            const userId = auth.currentUser?.uid;
                                            if (userId) {
                                                await updateDoc(doc(db, 'users', userId), {
                                                    sitterAvailabilityVacations: updatedVacations,
                                                });
                                            }
                                        } catch (e) { logger.error('Failed to save vacation:', e); }
                                        // Reset form
                                        setVacationStartDate(new Date());
                                        setVacationEndDate(new Date());
                                        setVacationReason('');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <CheckCircle size={20} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                    <Text style={[styles.saveVacationBtnText, { color: isDarkMode ? '#000' : '#fff' }]}>
                                        הוסף חופשה
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
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
        flexDirection: 'row-reverse',
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
    // ✨ Premium Quick Actions - Glassmorphic
    quickActionsGlass: {
        flexDirection: 'column',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 20,
    },
    quickActionCardGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 18,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    quickActionIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 14,
    },
    quickActionContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    quickActionTitleGlass: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    quickActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionDesc: {
        fontSize: 13,
        marginTop: 2,
    },
    quickActionSubtextGlass: {
        fontSize: 13,
        fontWeight: '500',
    },
    unreadBadgeGlass: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    unreadBadgeTextGlass: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
    },

    // ✨ Premium Tabs - Minimalist
    tabsGlass: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 5,
        marginBottom: 16,
    },
    tabGlass: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 8,
    },
    tabActiveGlass: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    tabTextGlass: {
        fontSize: 15,
    },
    tabCountBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 7,
    },
    tabCountText: {
        fontSize: 12,
        fontWeight: '800',
    },

    // Legacy Quick Actions & Tabs (backwards compatibility)
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

    // Analytics Cards
    analyticsCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 14,
    },
    analyticsCardHeader: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 16,
    },
    analyticsCardTitleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    analyticsIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    analyticsCardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    analyticsCardStats: {
        alignItems: 'flex-end',
    },
    analyticsMainStat: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
    },
    analyticsSubStat: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    analyticsFooter: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
        marginTop: 12,
    },

    // Bar Chart
    chartContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 90,
        paddingTop: 10,
    },
    chartBarColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    chartBar: {
        width: 20,
        borderRadius: 6,
        minHeight: 4,
    },
    chartBarValue: {
        fontSize: 10,
        fontWeight: '600',
    },
    chartBarLabel: {
        fontSize: 10,
        fontWeight: '500',
    },

    // Response Rate
    responseRateContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 20,
    },
    responseRateCircleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    responseRateCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 6,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    responseRateCircleProgress: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 6,
    },
    responseRateInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    responseRateValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    responseRateDetails: {
        flex: 1,
        gap: 8,
    },
    responseRateRow: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
    },
    responseRateLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    responseRateDetailValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    responseRateDivider: {
        height: 1,
        width: '100%',
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
    // ✨ Premium Booking Card - Liquid Glass
    bookingCardGlass: {
        borderRadius: 20,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    bookingCardContent: {
        padding: 18,
    },
    bookingHeaderGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 14,
    },
    parentPhotoContainer: {
        position: 'relative',
        marginLeft: 12,
    },
    parentPhotoGlass: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    parentPhotoBorder: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 28,
        borderWidth: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    parentPhotoPlaceholderGlass: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    bookingInfoGlass: {
        flex: 1,
    },
    parentNameGlass: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'right',
    },
    bookingMetaRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 14,
    },
    bookingMetaItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
    },
    bookingMetaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusBadgeGlass: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    bookingDetailsGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    detailItemGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    detailTextGlass: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusTextBadge: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    statusTextGlass: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    bookingActionsGlass: {
        flexDirection: 'row',
        gap: 10,
    },
    declineBtnGlass: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 13,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    declineBtnTextGlass: {
        fontSize: 15,
        fontWeight: '700',
    },
    acceptBtnGlass: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 13,
        borderRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    acceptBtnTextGlass: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    startShiftBtnGlass: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 15,
        borderRadius: 16,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    startShiftTextGlass: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },

    // Legacy styles (keeping for backwards compatibility)
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

    // ✨ Premium Availability Modal Styles
    availabilityOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    availabilityModal: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '88%',
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    availabilityHeader: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
        borderBottomWidth: 0,
    },
    closeButton: {
        alignSelf: 'flex-start',
        padding: 8,
        marginBottom: 12,
    },
    availabilityHeaderContent: {
        alignItems: 'center',
    },
    availabilityIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
    },
    availabilityTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
        textAlign: 'center',
    },
    availabilitySubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
    },
    availabilityContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    compactDaysList: {
        marginBottom: 16,
    },
    compactDayRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 4,
    },
    compactToggle: {
        marginLeft: 16,
    },
    compactToggleCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    compactDayName: {
        fontSize: 16,
        width: 60,
        textAlign: 'right',
    },
    compactHoursContainer: {
        flex: 1,
        alignItems: 'flex-end',
        marginRight: 16,
    },
    compactHoursText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    compactUnavailableText: {
        fontSize: 14,
        fontWeight: '500',
    },
    compactEditBtn: {
        padding: 8,
        marginLeft: 4,
    },
    compactDayDivider: {
        height: 1,
        marginLeft: 60,
    },
    copyToAllBtn: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    copyToAllText: {
        fontSize: 15,
        fontWeight: '600',
    },
    inlineTimePicker: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 4,
        marginBottom: 8,
        borderRadius: 12,
    },
    timePickerRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center',
    },
    timeInput: {
        width: 70,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1.5,
    },
    timeDash: {
        fontSize: 18,
        fontWeight: '600',
    },
    timePickerSaveBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    timePickerCancelBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    daysSection: {
        marginBottom: 28,
    },
    dayButtonGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 2,
    },
    dayLabelGlass: {
        fontSize: 17,
        letterSpacing: 0.2,
    },
    dayCheckboxGlass: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    hoursSection: {
        marginBottom: 24,
    },
    hoursSectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    hoursSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'right',
    },
    saveAvailabilityBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 18,
        marginBottom: 24,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 8,
    },
    saveAvailabilityBtnText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },

    // Legacy Availability Modal Styles (keeping for backwards compatibility)
    availabilityInfo: {
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 16,
    },
    dayRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
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
    locationBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent',
    },
    locationBtnText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
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

    // ✨✨✨ PREMIUM HEADER, PROFILE & REVIEWS STYLES ✨✨✨
    headerGlass: {
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerTopGlass: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleGlass: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    profileSectionGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 14,
    },
    profilePhotoContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profilePhotoGlass: {
        width: 72,
        height: 72,
        borderRadius: 36,
    },
    profilePhotoBorder: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: 39,
        borderWidth: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    profilePhotoPlaceholderGlass: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    verifiedBadgeGlass: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
    },
    profileInfoGlass: {
        flex: 1,
        alignItems: 'flex-end',
    },
    profileNameGlass: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    ratingRowGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    ratingTextGlass: {
        fontSize: 15,
    },
    noReviewsText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Hourly Rate Pill
    hourlyRateBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        alignSelf: 'center',
        gap: 2,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginTop: 8,
    },
    hourlyRateValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    hourlyRateLabel: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Profile Action Buttons (Preview & Share)
    profileActionsRow: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 16,
        gap: 10,
        marginBottom: 20,
    },
    profileActionBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    profileActionText: {
        fontSize: 14,
        fontWeight: '600',
    },

    reviewsSection: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    reviewsCardGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 18,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    reviewsIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 14,
    },
    reviewsContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    reviewsLabelGlass: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    reviewsValueGlass: {
        fontSize: 17,
        fontWeight: '800',
    },

    // ✨✨✨ PREMIUM SETTINGS MODAL STYLES ✨✨✨
    settingsOverlayGlass: {
        flex: 1,
    },
    settingsModalGlass: {
        flex: 1,
        paddingTop: 8,
    },
    settingsHeaderGlass: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 20,
        alignItems: 'center',
    },
    closeButtonSettings: {
        alignSelf: 'flex-start',
        padding: 8,
        marginBottom: 12,
    },
    settingsTitleGlass: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    settingsContentGlass: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    profilePhotoSection: {
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 8,
    },
    profilePhotoWrapperGlass: {
        position: 'relative',
        marginBottom: 12,
    },
    profilePhotoLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    profilePhotoGlowBorder: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 54,
        borderWidth: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    profilePhotoPlaceholderLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
    },
    cameraBadgeLarge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 5,
    },
    changePhotoText: {
        fontSize: 15,
        fontWeight: '700',
    },
    settingsSectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase' as const,
        textAlign: 'right' as const,
        marginTop: 20,
        marginBottom: 6,
        paddingHorizontal: 2,
    },
    settingsCard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden' as const,
    },
    settingsCardRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 10,
    },
    settingsRowLabel: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right' as const,
        minWidth: 70,
    },
    settingsCardInput: {
        fontSize: 15,
        flex: 1,
        paddingVertical: 0,
    },
    settingsToggleRow: {
        flexDirection: 'row' as const, // Standard row puts Switch (left) ... Label (right) with space-between
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    cardRowDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
    },
    priceStepperCompact: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 12,
    },
    priceValueCompact: {
        fontSize: 17,
        fontWeight: '700',
        minWidth: 52,
        textAlign: 'center' as const,
    },
    stepBtnSmall: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    gpsCompactBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    settingsFieldSection: {
        marginBottom: 24,
    },
    fieldHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
    },
    fieldIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldHeaderContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    fieldHint: {
        fontSize: 12,
        fontWeight: '500',
    },
    settingsInputGlass: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1,
        minHeight: 46,
    },
    bioInput: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    cityLocationRow: {
        flexDirection: 'row', // Input (Right) -> GPS (Left)
        gap: 10,
        alignItems: 'center',
    },
    gpsButtonGlass: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    gpsIconOnly: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gpsCheckBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#3B82F6',
        borderRadius: 6,
        width: 12,
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#1C1C1E', // Dark border to separate from icon
    },
    priceControlRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
    },
    priceBtnGlass: {
        width: 36, // Compact controls
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    priceDisplay: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        minHeight: 46,
        justifyContent: 'center',
    },
    priceValue: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    settingsToggleSection: {
        marginBottom: 24,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toggleContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    toggleIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveSettingsBtnGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 24,
        marginBottom: 32,
        borderWidth: 1, // Add border definition if missing or implicit, but keeping standard
        shadowOffset: { width: 0, height: 4 }, // Reduced shadow
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        minHeight: 48, // Slightly larger than inputs for emphasis
    },
    saveSettingsBtnTextGlass: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    socialInputContainer: {
        marginBottom: 16,
    },
    socialLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        marginRight: 4,
        textAlign: 'right',
    },
    socialPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginTop: 6,
        borderRadius: 8,
        borderWidth: 1,
        minHeight: 40, // Compact preview
    },
    previewText: {
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    tagsContainer: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        justifyContent: 'flex-start', // Start from Right in row-reverse
    },
    tag: {
        paddingHorizontal: 12, // Tighter tags
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 13, // Smaller tag text
        fontWeight: '600',
    },
    addTagRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    addTagBtn: {
        width: 36, // Smaller add button
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addTagInput: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 16,
        fontSize: 13, // Smaller text
        fontWeight: '600',
        borderWidth: 1,
        minHeight: 36, // Compact height
    },

    // Availability Tabs
    availabilityTabContainer: {
        flexDirection: 'row-reverse',
        gap: 8,
        padding: 16,
        borderBottomWidth: 1,
    },
    availabilityTabBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    availabilityTabActive: {
        // Active tab styling handled via backgroundColor prop
    },
    availabilityTabText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Exceptions Tab
    exceptionsContainer: {
        padding: 16,
        gap: 16,
    },
    exceptionsInfo: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    exceptionsInfoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    addExceptionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
    },
    addExceptionText: {
        fontSize: 15,
        fontWeight: '600',
    },
    exceptionsList: {
        gap: 12,
    },
    exceptionsListTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    exceptionCard: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    exceptionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    exceptionDate: {
        fontSize: 14,
        fontWeight: '700',
    },
    exceptionCardBody: {
        gap: 4,
    },
    exceptionStatus: {
        fontSize: 13,
        fontWeight: '600',
    },
    exceptionReason: {
        fontSize: 12,
        fontWeight: '500',
    },
    addVacationBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
    },
    addVacationText: {
        fontSize: 15,
        fontWeight: '600',
    },
    vacationsList: {
        gap: 12,
    },
    vacationsListTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    vacationCard: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    vacationCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    vacationDate: {
        fontSize: 14,
        fontWeight: '700',
    },
    vacationReason: {
        fontSize: 12,
        fontWeight: '500',
    },
    exceptionsEmptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyStateText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Exception Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    exceptionModal: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    exceptionModalHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    exceptionModalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    exceptionLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 12,
        textAlign: 'right',
    },
    exceptionDateBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    exceptionDateText: {
        fontSize: 15,
        fontWeight: '600',
    },
    exceptionTypeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    exceptionTypeBtn: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    exceptionTypeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    customHoursRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    customHoursCol: {
        flex: 1,
    },
    customHoursInput: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    exceptionReasonInput: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        fontWeight: '500',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    datePickerDoneBtn: {
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 8,
        marginBottom: 8,
    },
    saveExceptionBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        marginTop: 20,
    },
    saveExceptionBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },

    // Vacation Modal
    vacationModal: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    vacationModalHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    vacationModalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    vacationLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 12,
        textAlign: 'right',
    },
    vacationDateBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    vacationDateText: {
        fontSize: 15,
        fontWeight: '600',
    },
    vacationReasonInput: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        fontWeight: '500',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    saveVacationBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 14,
        marginTop: 20,
    },
    saveVacationBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});

export default SitterDashboardScreen;
