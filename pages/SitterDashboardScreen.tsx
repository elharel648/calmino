// pages/SitterDashboardScreen.tsx - Real Sitter Dashboard with Firebase Data
import React, { useState, useEffect, useCallback } from 'react';
import InlineLoader from '../components/Common/InlineLoader';
import Svg, { Path } from 'react-native-svg';

const WhatsAppIcon = ({ size = 24, color = '#000' }: { size?: number; color?: string; strokeWidth?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
            fill={color}
        />
    </Svg>
);
import { LinearGradient } from 'expo-linear-gradient';
import { View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    RefreshControl,
    
    Platform,
    Modal,
    TextInput,
    Switch,
    Alert,
    KeyboardAvoidingView,
    Linking,
    Share } from 'react-native';
import {
    Calendar, Clock, Users, CheckCircle,
    XCircle, ChevronRight, ChevronLeft, Star, MessageSquare, Settings,
    User, Baby, MapPin, Phone, Mail, Bell, X, Trash2, Edit3, Send, DollarSign,
    Plus, Minus, Eye, Zap, Share2, ExternalLink, Check, Moon,
    Instagram, Facebook, Linkedin, MessageCircle, Twitter, Globe, Link as LinkIcon
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useActiveChild } from '../context/ActiveChildContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { uploadSitterPhoto } from '../services/imageUploadService';
import { Camera, Image as LucideImage } from 'lucide-react-native';
import { useBookings } from '../hooks/useBookings';
import { startShift, getProfileViewStats, getResponseRateStats } from '../services/babysitterService';
import { Play } from 'lucide-react-native';
import DayHoursEditor from '../components/BabySitter/DayHoursEditor';
import { logger } from '../utils/logger';
import SitterOnboarding from '../components/BabySitter/SitterOnboarding';
import * as Location from 'expo-location';
import { validateUsername, openSocialLink, type SocialPlatform } from '../utils/socialMediaUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
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

// Helper function to format relative time
const formatRelativeTime = (date: Date, t: (key: string, params?: any) => string): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('time.now');
    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins.toString() });
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours.toString() });
    if (diffDays === 1) return t('time.yesterday');
    return t('time.daysAgo', { count: diffDays.toString() });
};

const SitterDashboardScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { activeChild } = useActiveChild();
    const { t } = useLanguage();
    const { showSuccess, showError } = useToast();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Settings state
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Animated Settings Icon State
    const [isSettingsPressed, setIsSettingsPressed] = useState(false);
    const settingsScale = useSharedValue(1);
    const settingsRotation = useSharedValue(0);

    const handleSettingsPress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        
        setIsSettingsPressed(true);
        settingsScale.value = withSequence(
            withSpring(0.85, { damping: 15, stiffness: 240 }),
            withSpring(1.1, { damping: 12, stiffness: 240 }),
            withSpring(1, { damping: 15, stiffness: 240 })
        );
        settingsRotation.value = withSpring(settingsRotation.value + 45, { damping: 15, stiffness: 180 });

        setTimeout(() => {
            setSettingsVisible(true);
            setTimeout(() => setIsSettingsPressed(false), 200);
        }, 250);
    };

    const animatedSettingsStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: settingsScale.value },
                { rotate: `${settingsRotation.value}deg` }
            ] as any
        };
    });

    // Settings state
    const [preferredLocation, setPreferredLocation] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showPhonePublic, setShowPhonePublic] = useState(true);
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

    // Monthly Calendar state
    const [availabilityTab, setAvailabilityTab] = useState<'weekly' | 'monthly'>('weekly');
    const [monthlyOverrides, setMonthlyOverrides] = useState<Record<string, { available: boolean; start?: string; end?: string }>>({}); 
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
    const [viewingMonth, setViewingMonth] = useState(new Date());

    const [savingSettings, setSavingSettings] = useState(false);
    const [sitterCity, setSitterCity] = useState(''); // City for location search
    const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null); // GPS location
    const [isLoadingLocation, setIsLoadingLocation] = useState(false); // Loading state for GPS
    const [hourlyRate, setHourlyRate] = useState(50); // Price per hour
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null); // Profile photo URL
    const [coverPhoto, setCoverPhoto] = useState<string | null>(null); // Cover photo URL
    const [uploadingPhoto, setUploadingPhoto] = useState(false); // Photo upload loading state
    const [uploadingCoverPhoto, setUploadingCoverPhoto] = useState(false); // Cover photo upload loading state

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
    const [languages, setLanguages] = useState<string[]>([t('sitterDash.langHebrew')]);
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

    // ✨ Auto-fetch Location on Mount and silently save to Firestore
    useEffect(() => {
        const fetchLocationOnMount = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                setIsLoadingLocation(true);
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                if (
                    location?.coords &&
                    typeof location.coords.latitude === 'number' &&
                    typeof location.coords.longitude === 'number' &&
                    !isNaN(location.coords.latitude) &&
                    !isNaN(location.coords.longitude)
                ) {
                    const coords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    setGpsLocation(coords);

                    // Silently persist to Firestore so distance is always up-to-date
                    const userId = auth.currentUser?.uid;
                    if (userId) {
                        updateDoc(doc(db, 'users', userId), { sitterLocation: coords }).catch(
                            (e) => logger.debug('Silent location save failed:', e)
                        );
                    }
                }
            } catch (e) {
                logger.debug('Failed to auto-fetch location', e);
            } finally {
                setIsLoadingLocation(false);
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
                setShowPhonePublic(data.sitterShowPhone !== false);
                setNotificationsEnabled(data.sitterNotificationsEnabled !== false);
                setAvailableForBookings(data.sitterActive !== false);
                setSitterCity(data.sitterCity || '');
                setHourlyRate(data.sitterPrice || 50);
                setProfilePhoto(data.photoUrl || auth.currentUser?.photoURL || null);
                if (data.sitterAvailableDays) setAvailableDays(data.sitterAvailableDays);
                if (data.sitterAvailableHours && typeof data.sitterAvailableHours === 'object') {
                    logger.log('📅 Dashboard: Loading hours from Firestore:', JSON.stringify(data.sitterAvailableHours));
                    setAvailableHours(prev => ({ ...prev, ...data.sitterAvailableHours }));
                } else {
                    logger.log('📅 Dashboard: No sitterAvailableHours in Firestore data');
                }
                // Load monthly overrides (filter out past dates)
                if (data.sitterMonthlyOverrides && typeof data.sitterMonthlyOverrides === 'object') {
                    const today = new Date().toISOString().split('T')[0];
                    const filtered: Record<string, { available: boolean; start?: string; end?: string }> = {};
                    for (const [dateKey, val] of Object.entries(data.sitterMonthlyOverrides)) {
                        if (dateKey >= today) filtered[dateKey] = val as any;
                    }
                    setMonthlyOverrides(filtered);
                }
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
                setCoverPhoto(data.sitterCoverPhoto || null);

                // Show onboarding for first-time sitters
                if (!data.hasSeenSitterOnboarding) {
                    setShowOnboarding(true);
                }



                return {
                    id: userId,
                    name: data.displayName || auth.currentUser?.displayName || t('babysitter.sitter'),
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
            name: auth.currentUser?.displayName || t('babysitter.sitter'),
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
                orderBy('date', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            logger.debug('📊', 'Found bookings:', snapshot.docs.length);
            const fetchedBookings: Booking[] = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                logger.debug('📋', 'Booking data:', docSnap.id);

                // Get parent info
                let parentName = t('babysitter.parent');
                let parentPhoto = null;
                if (data.parentId) {
                    try {
                        const parentDoc = await getDoc(doc(db, 'users', data.parentId));
                        if (parentDoc.exists()) {
                            parentName = parentDoc.data()?.displayName || t('babysitter.parent');
                            parentPhoto = parentDoc.data()?.photoUrl || null;
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
                    showSuccess(t('sitterDash.photoUpdated'));
                } catch (uploadError) {
                    logger.error('Failed to upload photo:', uploadError);
                    showError(t('sitterDash.photoError'));
                }
            }
        } catch (error) {
            logger.error('Image picker error:', error);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Cover photo upload handler
    const handleChangeCoverPhoto = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setUploadingCoverPhoto(true);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                try {
                    const downloadUrl = await uploadSitterPhoto(uri);
                    const userId = auth.currentUser?.uid;
                    if (userId) {
                        await updateDoc(doc(db, 'users', userId), {
                            sitterCoverPhoto: downloadUrl,
                        });
                    }
                    setCoverPhoto(downloadUrl);
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showSuccess(t('sitterDash.photoUpdated'));
                } catch (uploadError) {
                    logger.error('Failed to upload cover photo:', uploadError);
                    showError(t('sitterDash.photoError'));
                }
            }
        } catch (error) {
            logger.error('Cover image picker error:', error);
        } finally {
            setUploadingCoverPhoto(false);
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
            showError(t('sitterDash.bookingApproveError'));
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
            showError(t('sitterDash.bookingCancelError'));
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
                sitterProfile?.name || t('babysitter.sitter')
            );
            showSuccess(t('sitterDash.shiftStarted'));
            loadData();
        } catch (error) {
            logger.error('Start shift error:', error);
            showError(t('sitterDash.shiftStartError'));
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
                        text: t('sitter.pendingApproval'),
                        icon: <Clock size={13} color={iconColor} strokeWidth={2.5} />
                    };
                case 'accepted':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: t('sitter.approved'),
                        icon: <CheckCircle size={13} color={iconColor} strokeWidth={2.5} />
                    };
                case 'completed':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: t('sitter.completed'),
                        icon: <CheckCircle size={13} color={iconColor} strokeWidth={2.5} />
                    };
                case 'cancelled':
                    return {
                        color: textColor,
                        bgColor,
                        borderColor,
                        text: t('sitter.bookingCancelled'),
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
                        phone = parentDoc.data()?.phone || parentDoc.data()?.phoneNumber;
                    }
                } catch (e) {
                    logger.error('Could not fetch parent phone', e);
                }
            }

            if (!phone) {
                showError(t('sitterDash.phoneNotAvailable'));
                return;
            }

            // Format phone number (remove leading 0 and add +972)
            let formattedPhone = phone.replace(/[^0-9]/g, '');
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '972' + formattedPhone.substring(1);
            }

            const message = `Hi ${booking.parentName}! Thank you for choosing me. I would really appreciate it if you could take a moment to rate me in the app ⭐️`;
            const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

            Linking.canOpenURL(url)
                .then((supported) => {
                    if (!supported) {
                        showError(t('sitterDash.whatsappNotInstalled'));
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
                                {booking.childrenCount} children
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
                                <Text style={[styles.declineBtnTextGlass, { color: theme.textSecondary }]}>{t('sitter.rejected')}</Text>
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
                                <Text style={[styles.acceptBtnTextGlass, { color: isDarkMode ? '#000' : '#fff' }]}>{t('sitter.approved')}</Text>
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
                            <Text style={[styles.startShiftTextGlass, { color: isDarkMode ? '#000' : '#fff' }]}>{t('sitter.startShift')}</Text>
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
                            <Text style={[styles.startShiftTextGlass, { color: '#25D366' }]}>{t('sitterDash.requestWhatsappRating')}</Text>
                        </TouchableOpacity>
                    )}
                </View>


            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <InlineLoader size="large" color={theme.textPrimary}  />
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
                            {t('sitterDash.sitterStatus')}
                        </Text>
                        <TouchableOpacity
                            onPress={handleSettingsPress}
                            style={styles.headerButton}
                            activeOpacity={1}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Animated.View style={[animatedSettingsStyle, { padding: 6, borderRadius: 20, backgroundColor: isSettingsPressed ? '#C8806A' : 'transparent' }]}>
                                <Settings size={22} color={isSettingsPressed ? '#FFFFFF' : theme.textSecondary} strokeWidth={isSettingsPressed ? 2 : 1.5} />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>

                    {/* ✨ Premium Profile Section (Mockup Match) */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8, paddingHorizontal: 20 }}>
                        {/* Avatar (Right side) */}
                        <View style={{ ...styles.profilePhotoContainer, marginBottom: 0 }}>
                            {sitterProfile?.photoUrl ? (
                                <>
                                    <Image source={{ uri: sitterProfile.photoUrl }} style={[styles.profilePhotoGlass, { width: 72, height: 72, borderRadius: 36 }]} />
                                    <View style={[styles.profilePhotoBorder, {
                                        width: 72, height: 72, borderRadius: 36,
                                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                                        borderWidth: 1,
                                    }]} />
                                </>
                            ) : (
                                <View style={[styles.profilePhotoPlaceholderGlass, {
                                    width: 72, height: 72, borderRadius: 36,
                                    backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                }]}>
                                    <User size={32} color={isDarkMode ? '#94A3B8' : '#64748B'} strokeWidth={2} />
                                </View>
                            )}
                            {sitterProfile?.isVerified && (
                                <View style={[styles.verifiedBadgeGlass, {
                                    backgroundColor: '#0D9488',
                                    shadowColor: '#0D9488',
                                    shadowOpacity: 0.3,
                                    bottom: 0, right: 0,
                                    width: 20, height: 20, borderRadius: 10,
                                }]}>
                                    <CheckCircle size={12} color="#fff" strokeWidth={3} />
                                </View>
                            )}
                        </View>

                        {/* Info & Name (Left side) */}
                        <View style={{ marginRight: 20, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 26, fontWeight: '800', color: theme.textPrimary, textAlign: 'right', marginBottom: 6 }}>
                                {sitterProfile?.name || t('babysitter.sitter')}
                            </Text>
                            
                            {/* Hourly Rate Pill */}
                            <View style={{
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                                marginTop: 4,
                            }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textPrimary }}>
                                    ₪{hourlyRate}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: theme.textSecondary, marginRight: 4 }}>
                                    {t('sitter.perHour')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Profile Actions - Preview & Share */}
                    <View style={{ flexDirection: 'row-reverse', paddingHorizontal: 20, gap: 12, marginBottom: 12, marginTop: 16 }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#333' : '#E5E7EB',
                                borderRadius: 12,
                                paddingVertical: 14,
                                gap: 8,
                                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1
                            }}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                navigation.navigate('SitterProfile', {
                                    sitterData: {
                                        id: sitterProfile?.id || '',
                                        name: sitterProfile?.name || t('babysitter.sitter'),
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
                            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary }}>
                                {t('sitterDash.viewProfileAsParent')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDarkMode ? '#333' : '#E5E7EB',
                                borderRadius: 12,
                                paddingVertical: 14,
                                gap: 8,
                                shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1
                            }}
                            onPress={async () => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                try {
                                    const name = sitterProfile?.name || t('babysitter.sitter');
                                    const ratingLine = sitterProfile?.rating
                                        ? `${sitterProfile.rating.toFixed(1)} ⭐ | ${sitterProfile.reviewCount} reviews\n`
                                        : '';
                                    const cityLine = sitterCity ? `📍 ${sitterCity}\n` : '';
                                    const appLink = 'https://apps.apple.com/app/calmino';
                                    await Share.share({
                                        message: `Hi 👋\nI'm ${name}, a babysitter on Calmino.\n\n${ratingLine}${cityLine}\nWant to see my profile? Download Calmino:\n${appLink}`,
                                    });
                                } catch (error) {
                                    logger.error('Share error:', error);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Share2 size={16} color={theme.textPrimary} strokeWidth={2} />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textPrimary }}>
                                {t('sitterDash.shareProfile')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* WhatsApp Rating Button */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row-reverse',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDarkMode ? 'rgba(37, 211, 102, 0.15)' : '#E8F5E9',
                            borderRadius: 12,
                            paddingVertical: 14,
                            marginHorizontal: 20,
                            marginBottom: 24,
                            gap: 10
                        }}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            try {
                                const sitterId = auth.currentUser?.uid;
                                const msg = `Hi! I would really appreciate if you could rate me on Calmino 😊\n\nTap here:\ncalmparentapp://babysitter/${sitterId}`;
                                Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => {
                                    showError(t('sitterDash.whatsappNotInstalled'));
                                });
                            } catch (error) {
                                logger.error('WhatsApp rating error:', error);
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <WhatsAppIcon size={20} color={isDarkMode ? '#25D366' : '#2E7D32'} />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: isDarkMode ? '#25D366' : '#2E7D32' }}>
                            {t('sitterDash.requestWhatsappRating') || 'בקש דירוג בוואטסאפ'}
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
                                        {t('sitterDash.myReviews')}
                                    </Text>
                                    <Text style={[styles.reviewsValueGlass, { color: theme.textPrimary }]}>
                                        {sitterProfile.rating.toFixed(1)} ★ ({sitterProfile.reviewCount})
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.reviewsValueGlass, { color: theme.textSecondary }]}>
                                    {t('sitterDash.noReviewsYet')}
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
                                <Moon size={20} color={theme.textSecondary} strokeWidth={1.8} />
                            </View>
                            <View>
                                <Text style={[styles.quickActionTitleGlass, { color: theme.textPrimary, textAlign: 'right' }]}>{t('sitterDash.availableTonight')}</Text>
                                <Text style={[styles.quickActionDesc, { color: theme.textSecondary, textAlign: 'right' }]}>{t('sitterDash.parentsWillSee')}</Text>
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
                            trackColor={{ false: isDarkMode ? '#333' : '#E5E7EB', true: '#C8806A' }}
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
                                {t('sitterDash.availability')}
                            </Text>
                            <Text style={[styles.quickActionSubtextGlass, { color: theme.textSecondary }]}>
                                {availableDays.length} {t('sitterDash.days')} • {availableHours[availableDays[0]]?.start || '09:00'}-{availableHours[availableDays[0]]?.end || '18:00'}
                            </Text>
                        </View>
                        <ChevronLeft size={18} color={theme.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                </View>

                {/* Analytics Section */}
                <View style={styles.bookingsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('sitterDash.statistics')}</Text>

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
                                    {t('sitterDash.profileViews')}
                                </Text>
                            </View>
                            <View style={styles.analyticsCardStats}>
                                <Text style={[styles.analyticsMainStat, { color: theme.textPrimary }]}>
                                    {profileViewStats?.totalWeek ?? 0}
                                </Text>
                                <Text style={[styles.analyticsSubStat, { color: theme.textSecondary }]}>
                                    {t('reports.units.days')}
                                </Text>
                            </View>
                        </View>

                        {/* Mini Bar Chart */}
                        <View style={styles.chartContainer}>
                            {(profileViewStats?.dailyViews || [
                                { date: t('sitterDash.sunday').charAt(0), count: 0 }, { date: t('sitterDash.monday').charAt(0), count: 0 },
                                { date: t('sitterDash.tuesday').charAt(0), count: 0 }, { date: t('sitterDash.wednesday').charAt(0), count: 0 },
                                { date: t('sitterDash.thursday').charAt(0), count: 0 }, { date: t('sitterDash.friday').charAt(0), count: 0 },
                                { date: t('sitterDash.saturday').charAt(0), count: 0 },
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
                                {t('sitterDash.totalViews', { count: profileViewStats.totalAllTime.toString() })}
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
                                {t('sitterDash.settings')}
                            </Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.settingsContentGlass} contentContainerStyle={{ paddingBottom: 120 }}>
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
                                            <InlineLoader size="small" color={isDarkMode ? '#000' : '#fff'}  />
                                        ) : (
                                            <Camera size={18} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                        )}
                                    </View>
                                </View>
                                <Text style={[styles.changePhotoText, {
                                    color: uploadingPhoto ? theme.textSecondary : theme.textPrimary,
                                }]}>
                                    {uploadingPhoto ? t('sitter.uploading') : t('sitter.changePhoto')}
                                </Text>
                            </TouchableOpacity>

                            {/* ─── Cover Photo ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitter.backgroundPhoto')}</Text>
                            <TouchableOpacity
                                style={[styles.settingsCard, {
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                    padding: 0,
                                    overflow: 'hidden',
                                }]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleChangeCoverPhoto();
                                }}
                                disabled={uploadingCoverPhoto}
                                activeOpacity={0.7}
                            >
                                {coverPhoto ? (
                                    <View style={{ width: '100%', height: 120 }}>
                                        <Image
                                            source={{ uri: coverPhoto }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="cover"
                                        />
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.4)']}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: 44,
                                            }}
                                        />
                                        <View style={{
                                            position: 'absolute',
                                            bottom: 10,
                                            right: 12,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}>
                                            {uploadingCoverPhoto ? (
                                                <InlineLoader size="small" color="#fff"  />
                                            ) : (
                                                <>
                                                    <Camera size={13} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                                                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' }}>{t('sitter.changePhoto')}</Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{
                                        width: '100%',
                                        height: 90,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                    }}>
                                        {uploadingCoverPhoto ? (
                                            <InlineLoader size="small" color={theme.textSecondary}  />
                                        ) : (
                                            <>
                                                <LucideImage size={22} color={theme.textSecondary} strokeWidth={1.5} />
                                                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>{t('sitter.addBackgroundPhoto')}</Text>
                                            </>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* ─── Contact ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitter.contactPhone')}</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                <View style={styles.settingsCardRow}>
                                    <TouchableOpacity
                                        style={[styles.gpsCompactBtn, {
                                            backgroundColor: gpsLocation ? (isDarkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)') : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                            borderColor: gpsLocation ? '#C8806A' : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                                        }]}
                                        onPress={async () => {
                                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            if (gpsLocation) { setGpsLocation(null); return; }
                                            setIsLoadingLocation(true);
                                            try {
                                                const { status } = await Location.requestForegroundPermissionsAsync();
                                                if (status !== 'granted') { showError(t('sitterDash.locationPermMessage')); setIsLoadingLocation(false); return; }
                                                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                                setGpsLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
                                                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            } catch (error) {
                                                logger.error('Location error:', error);
                                                showError(t('sitterDash.locationError'));
                                            } finally { setIsLoadingLocation(false); }
                                        }}
                                        disabled={isLoadingLocation}
                                        activeOpacity={0.7}
                                    >
                                        {isLoadingLocation ? (
                                            <InlineLoader size="small" color={theme.textSecondary}  />
                                        ) : (
                                            <View>
                                                <MapPin size={16} color={gpsLocation ? '#C8806A' : theme.textSecondary} strokeWidth={2.5} />
                                                {gpsLocation && (<View style={styles.gpsCheckBadge}><Check size={10} color="#fff" strokeWidth={4} /></View>)}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <TextInput
                                        style={[styles.settingsCardInput, { color: theme.textPrimary }]}
                                        value={sitterCity}
                                        onChangeText={setSitterCity}
                                        placeholder={t('sitterReg.city')}
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="right"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterReg.city')}</Text>
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
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterReg.phone')}</Text>
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.settingsCardRow}>
                                    <Switch
                                        value={showPhonePublic}
                                        onValueChange={setShowPhonePublic}
                                        trackColor={{ false: isDarkMode ? '#3A3A3C' : '#E5E5EA', true: theme.primary }}
                                        thumbColor="#fff"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterDash.showPhoneToFamilies')}</Text>
                                </View>
                            </View>

                            {/* ─── Price ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitterDash.pricing')}</Text>
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
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterReg.pricePerHour')}</Text>
                                </View>
                            </View>

                            {/* ─── Availability ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitterDash.availability')}</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                <View style={styles.settingsToggleRow}>
                                    <Switch
                                        value={notificationsEnabled}
                                        onValueChange={(v) => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setNotificationsEnabled(v); }}
                                        trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#C8806A' }}
                                        thumbColor={isDarkMode ? (notificationsEnabled ? '#000' : '#999') : '#fff'}
                                        ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterDash.notifications')}</Text>
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.settingsToggleRow}>
                                    <Switch
                                        value={availableForBookings}
                                        onValueChange={(v) => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAvailableForBookings(v); }}
                                        trackColor={{ false: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', true: '#C8806A' }}
                                        thumbColor={isDarkMode ? (availableForBookings ? '#000' : '#999') : '#fff'}
                                        ios_backgroundColor={isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterDash.availableForBookings')}</Text>
                                </View>
                            </View>

                            {/* ─── Social ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitterDash.socialMedia')}</Text>
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
                                        { id: 'whatsapp', icon: MessageCircle, color: '#25D366', value: socialWhatsapp, setValue: setSocialWhatsapp, placeholder: '+972...', prefix: 'wa.me/', name: 'WhatsApp' },
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
                                                    backgroundColor: isConnected
                                                        ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                                                        : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'), // Neutral Background
                                                    borderColor: isConnected
                                                        ? (isDarkMode ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)') // Subtle Green Border
                                                        : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.1,
                                                    shadowRadius: 4,
                                                    elevation: 0,
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
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: 10,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderWidth: 2,
                                                        borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', // Match modal background
                                                        backgroundColor: '#10B981', // Cute Green V
                                                    }}>
                                                        <Check size={12} color="#fff" strokeWidth={3.5} />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* ─── About ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitterDash.aboutMe')}</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                            }]}>
                                {/* Bio */}
                                <View style={[styles.settingsCardRow, { flexDirection: 'column', alignItems: 'flex-end', gap: 6 }]}>
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary, textAlign: 'right', width: '100%' }]}>{t('sitterDash.aboutMe')}</Text>
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
                                        placeholder={t('sitterDash.bioPlaceholder')}
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
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterDash.ageLabel')}</Text>
                                </View>
                                <View style={[styles.cardRowDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
                                {/* Experience */}
                                <View style={styles.settingsCardRow}>
                                    <TextInput
                                        style={[styles.settingsCardInput, { color: theme.textSecondary, flex: 1, textAlign: 'left' }]}
                                        value={experience}
                                        onChangeText={setExperience}
                                        placeholder={t('sitterDash.experiencePlaceholder')}
                                        placeholderTextColor={theme.textSecondary}
                                        textAlign="left"
                                    />
                                    <Text style={[styles.settingsRowLabel, { color: theme.textPrimary }]}>{t('sitterDash.experienceLabel')}</Text>
                                </View>
                            </View>{/* end settingsCard About */}

                            {/* ─── Languages ─── */}
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitterDash.languages')}</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                padding: 14,
                            }]}>
                                <View style={styles.tagsContainer}>
                                    {[t('sitterDash.langHebrew'), t('sitterDash.langEnglish'), t('sitterDash.langArabic'), t('sitterDash.langRussian'), t('sitterDash.langFrench'), t('sitterDash.langSpanish')].map((lang) => (
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
                                    {languages.filter(l => ![t('sitterDash.langHebrew'), t('sitterDash.langEnglish'), t('sitterDash.langArabic'), t('sitterDash.langRussian'), t('sitterDash.langFrench'), t('sitterDash.langSpanish')].includes(l)).map((lang) => (
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
                                        placeholder={t('sitterDash.addLanguage')}
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
                            <Text style={[styles.settingsSectionLabel, { color: theme.textSecondary }]}>{t('sitterDash.certificates')}</Text>
                            <View style={[styles.settingsCard, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                                padding: 14,
                            }]}>
                                <View style={styles.tagsContainer}>
                                    {[t('sitterDash.certFirstAid'), t('sitterDash.certCPR'), t('sitterDash.certBabysitter'), t('sitterDash.certKindergarten'), t('sitterDash.certAssistant')].map((cert) => (
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
                                    {certifications.filter(c => ![t('sitterDash.certFirstAid'), t('sitterDash.certCPR'), t('sitterDash.certBabysitter'), t('sitterDash.certKindergarten'), t('sitterDash.certAssistant')].includes(c)).map((cert) => (
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
                                        placeholder={t('sitterDash.addCertificate')}
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
                                        showError(t('sitterDash.loginRequired'));
                                        return;
                                    }

                                    try {
                                        setSavingSettings(true);
                                        await updateDoc(doc(db, 'users', userId), {
                                            sitterPreferredLocation: preferredLocation.trim() || null,
                                            phone: phoneNumber.trim() || null,
                                            sitterShowPhone: showPhonePublic,
                                            sitterNotificationsEnabled: notificationsEnabled,
                                            sitterActive: availableForBookings,
                                            sitterAvailable: availableForBookings, // Also set sitterAvailable for badge consistency
                                            sitterCity: sitterCity.trim() || null,
                                            sitterLocation: gpsLocation || null, // Update GPS location
                                            sitterPrice: hourlyRate,
                                            sitterAvailableDays: availableDays,
                                            sitterAvailableHours: availableHours,
                                            // Debug: log what we're saving
                                            ...((() => { logger.log('📅 Dashboard: Saving hours:', JSON.stringify(availableHours)); return {}; })()),

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
                                        showSuccess(t('sitterDash.settingsSaved'));
                                    } catch (error) {
                                        logger.error('Failed to save settings:', error);
                                        showError(t('sitterDash.settingsSaveError'));
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={savingSettings}
                                activeOpacity={0.8}
                            >
                                {savingSettings ? (
                                    <InlineLoader size="small" color={isDarkMode ? '#000' : '#fff'}  />
                                ) : (
                                    <>
                                        <CheckCircle size={20} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                        <Text style={[styles.saveSettingsBtnTextGlass, { color: isDarkMode ? '#000' : '#fff' }]}>{t('sitterDash.saveSettings')}</Text>
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
                                        t('sitterDash.deleteSitterAccount'),
                                        t('sitterDash.deleteSitterConfirm'),
                                        [
                                            { text: t('sitterDash.cancelBtn'), style: 'cancel' },
                                            {
                                                text: t('sitterDash.deleteBtn'),
                                                style: 'destructive',
                                                onPress: async () => {
                                                    const userId = auth.currentUser?.uid;
                                                    if (userId) {
                                                        try {
                                                            await updateDoc(doc(db, 'users', userId), {
                                                                isSitter: false,
                                                                sitterActive: false,
                                                                sitterVerified: false,
                                                                photoUrl: null,
                                                                sitterPhoto: null,
                                                            });
                                                            setSettingsVisible(false);
                                                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                            showSuccess(t('sitterDash.accountDeleted'));
                                                            navigation.replace('SitterList');
                                                        } catch (error) {
                                                            logger.error('Failed to delete sitter account:', error);
                                                            showError(t('sitterDash.deleteError'));
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
                            elevation: 0,
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
                                            {activeSocialPlatform.value ? t('sitterDash.editLink') : t('sitterDash.connectNew')}
                                        </Text>
                                    </View>

                                    <View style={{ gap: 16 }}>
                                        <View>
                                            <Text style={[styles.fieldLabel, { color: theme.textPrimary, marginBottom: 8 }]}>{t('sitterDash.linkOrUsername')}</Text>
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
                                                    // Auto-extract username from pasted URLs
                                                    let cleaned = text.trim();
                                                    
                                                    // Instagram: instagram.com/username or https://www.instagram.com/username/
                                                    if (activeSocialPlatform.id === 'instagram') {
                                                        const igMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/);
                                                        if (igMatch) cleaned = igMatch[1];
                                                    }
                                                    // Facebook: facebook.com/username or fb.com/username
                                                    if (activeSocialPlatform.id === 'facebook') {
                                                        const fbMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?(?:facebook|fb)\.com\/(?:profile\.php\?id=)?([a-zA-Z0-9_.]+)\/?/);
                                                        if (fbMatch) cleaned = fbMatch[1];
                                                    }
                                                    // LinkedIn: linkedin.com/in/username
                                                    if (activeSocialPlatform.id === 'linkedin') {
                                                        const liMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/);
                                                        if (liMatch) cleaned = liMatch[1];
                                                    }
                                                    
                                                    activeSocialPlatform.setValue(cleaned);
                                                    setActiveSocialPlatform(prev => prev ? ({ ...prev, value: cleaned }) : null);
                                                }}
                                                placeholder={activeSocialPlatform.id === 'whatsapp' ? activeSocialPlatform.placeholder : `${activeSocialPlatform.placeholder} ${t('sitter.orPasteLink')}`}
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
                                                        {activeSocialPlatform.id === 'whatsapp' ? t('sitterDash.invalidPhone') : t('sitterDash.invalidInput')}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Open App Button - for Instagram, Facebook, LinkedIn */}
                                        {activeSocialPlatform.id !== 'whatsapp' && (
                                            <TouchableOpacity
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    paddingVertical: 11,
                                                    borderRadius: 12,
                                                    backgroundColor: `${activeSocialPlatform.color}12`,
                                                    borderWidth: 1,
                                                    borderColor: `${activeSocialPlatform.color}25`,
                                                }}
                                                onPress={() => {
                                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    const appUrls: Record<string, string> = {
                                                        instagram: 'instagram://user?username=',
                                                        facebook: 'fb://profile',
                                                        linkedin: 'linkedin://profile',
                                                    };
                                                    const webUrls: Record<string, string> = {
                                                        instagram: 'https://www.instagram.com/',
                                                        facebook: 'https://www.facebook.com/me',
                                                        linkedin: 'https://www.linkedin.com/in/me',
                                                    };
                                                    const appUrl = appUrls[activeSocialPlatform.id];
                                                    const webUrl = webUrls[activeSocialPlatform.id];
                                                    if (appUrl) {
                                                        Linking.canOpenURL(appUrl).then(can => {
                                                            if (can) Linking.openURL(appUrl);
                                                            else if (webUrl) Linking.openURL(webUrl);
                                                        }).catch(() => {
                                                            if (webUrl) Linking.openURL(webUrl);
                                                        });
                                                    }
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <ExternalLink size={15} color={activeSocialPlatform.color} strokeWidth={2} />
                                                <Text style={{ fontSize: 13, fontWeight: '600', color: activeSocialPlatform.color }}>
                                                    {t('sitter.openToCopyUsername', { name: activeSocialPlatform.name })}
                                                </Text>
                                            </TouchableOpacity>
                                        )}

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
                                                    {t('sitterDash.checkLink')}
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
                                                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>{t('sitterDash.cancelBtn')}</Text>
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
                                                        showError(activeSocialPlatform.id === 'whatsapp' ? t('sitterDash.invalidPhone') : t('sitterDash.invalidInput'));
                                                        return;
                                                    }
                                                    setSocialModalVisible(false);
                                                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                }}
                                            >
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: activeSocialPlatform.value && validateUsername(activeSocialPlatform.id as SocialPlatform, activeSocialPlatform.value) ? '#FFFFFF' : theme.textSecondary }}>{t('sitterDash.saveSettings')}</Text>
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
                                    {t('sitterDash.monthlyPlanning')}
                                </Text>
                                <Text style={[styles.availabilitySubtitle, { color: theme.textSecondary }]}>
                                    {t('sitterDash.monthlyPlanningSubtitle')}
                                </Text>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.availabilityContent}>
                            {/* Monthly Calendar */}
                            {(() => {
                                const year = viewingMonth.getFullYear();
                                const month = viewingMonth.getMonth();
                                const firstDay = new Date(year, month, 1);
                                const lastDay = new Date(year, month + 1, 0);
                                const startDayOfWeek = firstDay.getDay(); // 0=Sun
                                const daysInMonth = lastDay.getDate();
                                const todayStr = new Date().toISOString().split('T')[0];
                                const now = new Date();
                                const maxMonth = new Date(now.getFullYear(), now.getMonth() + 3, 1); // 3 months ahead

                                const monthNames = [
                                    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                                    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
                                ];
                                const dayLetters = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

                                const canGoBack = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
                                const canGoForward = viewingMonth < maxMonth;

                                // Build calendar cells
                                const cells: (number | null)[] = [];
                                for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
                                for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                                while (cells.length % 7 !== 0) cells.push(null);

                                return (
                                    <View style={{ paddingHorizontal: 16 }}>
                                        {/* Always Available Quick Action */}
                                        <TouchableOpacity
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 8,
                                                paddingVertical: 12,
                                                paddingHorizontal: 20,
                                                borderRadius: 14,
                                                backgroundColor: availableDays.length === 7 && Object.keys(monthlyOverrides).length === 0
                                                    ? theme.primary
                                                    : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                                borderWidth: 1,
                                                borderColor: availableDays.length === 7 && Object.keys(monthlyOverrides).length === 0
                                                    ? 'transparent'
                                                    : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                                marginBottom: 16,
                                            }}
                                            onPress={() => {
                                                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                const isCurrentlyAlwaysAvailable = availableDays.length === 7 && Object.keys(monthlyOverrides).length === 0;
                                                if (isCurrentlyAlwaysAvailable) {
                                                    // Toggle OFF — clear all days
                                                    setAvailableDays([]);
                                                    setAvailableHours({});
                                                    setMonthlyOverrides({});
                                                    setSelectedCalendarDate(null);
                                                } else {
                                                    // Toggle ON — set all days
                                                    setAvailableDays(['0', '1', '2', '3', '4', '5', '6']);
                                                    const fullHours: Record<string, { start: string; end: string }> = {};
                                                    ['0', '1', '2', '3', '4', '5', '6'].forEach(d => {
                                                        fullHours[d] = { start: '07:00', end: '23:00' };
                                                    });
                                                    setAvailableHours(fullHours);
                                                    setMonthlyOverrides({});
                                                    setSelectedCalendarDate(null);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <CheckCircle
                                                size={16}
                                                color={availableDays.length === 7 && Object.keys(monthlyOverrides).length === 0
                                                    ? '#fff'
                                                    : theme.textSecondary}
                                                strokeWidth={2.5}
                                            />
                                            <Text style={{
                                                fontSize: 14,
                                                fontWeight: '700',
                                                color: availableDays.length === 7 && Object.keys(monthlyOverrides).length === 0
                                                    ? '#fff'
                                                    : theme.textPrimary,
                                            }}>
                                                {t('sitterDash.alwaysAvailable')}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Month Navigation */}
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 16,
                                            paddingHorizontal: 4,
                                        }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (canGoForward) {
                                                        setViewingMonth(new Date(year, month + 1, 1));
                                                        setSelectedCalendarDate(null);
                                                    }
                                                }}
                                                style={{ padding: 8, opacity: canGoForward ? 1 : 0.3 }}
                                                disabled={!canGoForward}
                                            >
                                                <ChevronLeft size={22} color={theme.textPrimary} strokeWidth={2} />
                                            </TouchableOpacity>
                                            <Text style={{
                                                fontSize: 18,
                                                fontWeight: '700',
                                                color: theme.textPrimary,
                                            }}>
                                                {monthNames[month]} {year}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (canGoBack) {
                                                        setViewingMonth(new Date(year, month - 1, 1));
                                                        setSelectedCalendarDate(null);
                                                    }
                                                }}
                                                style={{ padding: 8, opacity: canGoBack ? 1 : 0.3 }}
                                                disabled={!canGoBack}
                                            >
                                                <ChevronRight size={22} color={theme.textPrimary} strokeWidth={2} />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Day Headers */}
                                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                                            {dayLetters.map((letter, i) => (
                                                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                                                    <Text style={{
                                                        fontSize: 12,
                                                        fontWeight: '700',
                                                        color: theme.textSecondary,
                                                    }}>
                                                        {letter}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Calendar Grid */}
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                            {cells.map((day, idx) => {
                                                if (day === null) {
                                                    return <View key={`empty-${idx}`} style={{ width: '14.28%', aspectRatio: 1 }} />;
                                                }

                                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isPast = dateStr < todayStr;
                                                const isToday = dateStr === todayStr;
                                                const isSelected = dateStr === selectedCalendarDate;
                                                const dayOfWeek = new Date(year, month, day).getDay().toString();
                                                const isWeeklyAvailable = availableDays.includes(dayOfWeek);
                                                const weeklyHours = availableHours[dayOfWeek];
                                                const override = monthlyOverrides[dateStr];
                                                const hasOverride = !!override;

                                                // Determine final availability
                                                const isAvailable = hasOverride ? override.available : isWeeklyAvailable;
                                                const displayHours = hasOverride && override.available && override.start && override.end
                                                    ? { start: override.start, end: override.end }
                                                    : (isWeeklyAvailable && weeklyHours ? weeklyHours : null);

                                                return (
                                                    <TouchableOpacity
                                                        key={dateStr}
                                                        style={{
                                                            width: '14.28%',
                                                            aspectRatio: 1,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: isPast ? 0.3 : 1,
                                                        }}
                                                        onPress={() => {
                                                            if (!isPast) {
                                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                setSelectedCalendarDate(dateStr === selectedCalendarDate ? null : dateStr);
                                                            }
                                                        }}
                                                        disabled={isPast}
                                                        activeOpacity={0.6}
                                                    >
                                                        <View style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 12,
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            backgroundColor: isSelected
                                                                ? theme.primary
                                                                : isToday && !hasOverride
                                                                    ? theme.primary
                                                                    : hasOverride
                                                                        ? (isAvailable
                                                                            ? (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                                                                            : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'))
                                                                        : 'transparent',
                                                            borderWidth: hasOverride && !isSelected && !isToday ? 1.5 : 0,
                                                            borderColor: hasOverride
                                                                        ? (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)')
                                                                        : 'transparent',
                                                        }}>
                                                            <Text style={{
                                                                fontSize: 15,
                                                                fontWeight: isToday || isSelected ? '800' : '600',
                                                                color: isSelected || (isToday && !hasOverride)
                                                                    ? '#fff'
                                                                    : !isAvailable
                                                                        ? (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)')
                                                                        : theme.textPrimary,
                                                                textDecorationLine: !isAvailable && !isSelected ? 'line-through' : 'none',
                                                            }}>
                                                                {day}
                                                            </Text>
                                                        </View>
                                                        {/* Time indicator */}
                                                        {!isPast && isAvailable && displayHours && !isSelected && (
                                                            <Text style={{
                                                                fontSize: 7,
                                                                fontWeight: '700',
                                                                color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)',
                                                                marginTop: -2,
                                                            }}>
                                                                {displayHours.start?.replace(':00', '')}-{displayHours.end?.replace(':00', '')}
                                                            </Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Selected Day Detail Panel */}
                                        {selectedCalendarDate && (() => {
                                            const selDate = new Date(selectedCalendarDate + 'T00:00:00');
                                            const dayOfWeek = selDate.getDay().toString();
                                            const isWeeklyAvail = availableDays.includes(dayOfWeek);
                                            const weeklyH = availableHours[dayOfWeek];
                                            const override = monthlyOverrides[selectedCalendarDate];
                                            const hasOverride = !!override;
                                            const isAvail = hasOverride ? override.available : isWeeklyAvail;
                                            const currentStart = hasOverride && override.start ? override.start : (weeklyH?.start || '09:00');
                                            const currentEnd = hasOverride && override.end ? override.end : (weeklyH?.end || '18:00');

                                            const dayNames = [
                                                t('sitterDash.sunday'), t('sitterDash.monday'), t('sitterDash.tuesday'),
                                                t('sitterDash.wednesday'), t('sitterDash.thursday'), t('sitterDash.friday'),
                                                t('sitterDash.saturday')
                                            ];

                                            return (
                                                <View style={{
                                                    marginTop: 20,
                                                    padding: 16,
                                                    borderRadius: 16,
                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                    borderWidth: 1,
                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                                }}>
                                                    {/* Day Header */}
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, direction: 'rtl' }}>
                                                        <View>
                                                            <Text style={{
                                                                fontSize: 17,
                                                                fontWeight: '700',
                                                                color: theme.textPrimary,
                                                                textAlign: 'right',
                                                            }}>
                                                                {dayNames[selDate.getDay()]}, {selDate.getDate()}/{selDate.getMonth() + 1}
                                                            </Text>
                                                            {hasOverride && (
                                                                <Text style={{
                                                                    fontSize: 11,
                                                                    fontWeight: '600',
                                                                    color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                                                                    marginTop: 2,
                                                                    textAlign: 'right',
                                                                }}>
                                                                    שינוי מהתבנית השבועית
                                                                </Text>
                                                            )}
                                                        </View>
                                                        {hasOverride && (
                                                            <View style={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: 4,
                                                                backgroundColor: isDarkMode ? '#fff' : '#000',
                                                            }} />
                                                        )}
                                                    </View>

                                                    {/* Available Toggle */}
                                                    <View style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        paddingVertical: 12,
                                                        paddingHorizontal: 14,
                                                        borderRadius: 12,
                                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                        borderWidth: 1,
                                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                                        marginBottom: 12,
                                                    }}>
                                                        <Switch
                                                            value={isAvail}
                                                            onValueChange={(val) => {
                                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                                const newOverrides = { ...monthlyOverrides };
                                                                if (val === isWeeklyAvail && !override?.start) {
                                                                    // Same as weekly pattern, remove override
                                                                    delete newOverrides[selectedCalendarDate];
                                                                } else {
                                                                    newOverrides[selectedCalendarDate] = {
                                                                        available: val,
                                                                        ...(val ? { start: currentStart, end: currentEnd } : {}),
                                                                    };
                                                                }
                                                                setMonthlyOverrides(newOverrides);
                                                            }}
                                                            trackColor={{
                                                                false: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                                                true: isDarkMode ? '#fff' : '#000',
                                                            }}
                                                            thumbColor={isAvail ? (isDarkMode ? '#000' : '#fff') : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)')}
                                                        />
                                                        <Text style={{
                                                            fontSize: 15,
                                                            fontWeight: '600',
                                                            color: theme.textPrimary,
                                                        }}>
                                                            {isAvail ? t('sitterDash.availableToggle') : t('sitterDash.notAvailableToggle')}
                                                        </Text>
                                                    </View>

                                                    {/* Time Pickers (when available) */}
                                                    {isAvail && (
                                                        <View style={{
                                                            flexDirection: 'row',
                                                            gap: 10,
                                                            marginBottom: 12,
                                                        }}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{
                                                                    fontSize: 11,
                                                                    fontWeight: '700',
                                                                    color: theme.textSecondary,
                                                                    marginBottom: 6,
                                                                    textAlign: 'right',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: 0.5,
                                                                }}>
                                                                    {t('sitterDash.startTime')}
                                                                </Text>
                                                                <View style={{
                                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                                                    borderRadius: 10,
                                                                    borderWidth: 1,
                                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                                                    overflow: 'hidden',
                                                                    alignItems: 'center',
                                                                    paddingVertical: 4,
                                                                }}>
                                                                    <DateTimePicker
                                                                        value={(() => {
                                                                            const [h = '9', m = '0'] = currentStart.split(':');
                                                                            const d = new Date();
                                                                            d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                                                            return d;
                                                                        })()}
                                                                        mode="time"
                                                                        display="compact"
                                                                        locale="en-GB"
                                                                        minuteInterval={15}
                                                                        onChange={(event, date) => {
                                                                            if (date && event.type === 'set') {
                                                                                const hh = String(date.getHours()).padStart(2, '0');
                                                                                const mm = String(date.getMinutes()).padStart(2, '0');
                                                                                const newStart = `${hh}:${mm}`;
                                                                                setMonthlyOverrides(prev => ({
                                                                                    ...prev,
                                                                                    [selectedCalendarDate]: {
                                                                                        available: true,
                                                                                        start: newStart,
                                                                                        end: currentEnd,
                                                                                    },
                                                                                }));
                                                                            }
                                                                        }}
                                                                        style={{ height: 34 }}
                                                                    />
                                                                </View>
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{
                                                                    fontSize: 11,
                                                                    fontWeight: '700',
                                                                    color: theme.textSecondary,
                                                                    marginBottom: 6,
                                                                    textAlign: 'right',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: 0.5,
                                                                }}>
                                                                    {t('sitterDash.endTime')}
                                                                </Text>
                                                                <View style={{
                                                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                                                    borderRadius: 10,
                                                                    borderWidth: 1,
                                                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                                                    overflow: 'hidden',
                                                                    alignItems: 'center',
                                                                    paddingVertical: 4,
                                                                }}>
                                                                    <DateTimePicker
                                                                        value={(() => {
                                                                            const [h = '18', m = '0'] = currentEnd.split(':');
                                                                            const d = new Date();
                                                                            d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                                                            return d;
                                                                        })()}
                                                                        mode="time"
                                                                        display="compact"
                                                                        locale="en-GB"
                                                                        minuteInterval={15}
                                                                        onChange={(event, date) => {
                                                                            if (date && event.type === 'set') {
                                                                                const hh = String(date.getHours()).padStart(2, '0');
                                                                                const mm = String(date.getMinutes()).padStart(2, '0');
                                                                                const newEnd = `${hh}:${mm}`;
                                                                                setMonthlyOverrides(prev => ({
                                                                                    ...prev,
                                                                                    [selectedCalendarDate]: {
                                                                                        available: true,
                                                                                        start: currentStart,
                                                                                        end: newEnd,
                                                                                    },
                                                                                }));
                                                                            }
                                                                        }}
                                                                        style={{ height: 34 }}
                                                                    />
                                                                </View>
                                                            </View>
                                                        </View>
                                                    )}

                                                    {/* Reset to Weekly Pattern */}
                                                    {hasOverride && (
                                                        <TouchableOpacity
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 6,
                                                                paddingVertical: 10,
                                                                borderRadius: 10,
                                                                borderWidth: 1,
                                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                                            }}
                                                            onPress={() => {
                                                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                                const newOverrides = { ...monthlyOverrides };
                                                                delete newOverrides[selectedCalendarDate];
                                                                setMonthlyOverrides(newOverrides);
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <XCircle size={14} color={theme.textSecondary} strokeWidth={2} />
                                                            <Text style={{
                                                                fontSize: 13,
                                                                fontWeight: '600',
                                                                color: theme.textSecondary,
                                                            }}>
                                                                {t('sitterDash.resetToWeekly')}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            );
                                        })()}

                                        {/* Override Count */}
                                        {Object.keys(monthlyOverrides).length > 0 && (
                                            <View style={{
                                                marginTop: 16,
                                                paddingVertical: 10,
                                                paddingHorizontal: 14,
                                                borderRadius: 10,
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                            }}>
                                                <Edit3 size={13} color={theme.textSecondary} strokeWidth={2} />
                                                <Text style={{
                                                    fontSize: 12,
                                                    fontWeight: '600',
                                                    color: theme.textSecondary,
                                                }}>
                                                    {Object.keys(monthlyOverrides).length} שינויים מהתבנית השבועית
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })()}
                            {/* Collapsible Default Weekly Pattern */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginHorizontal: 16,
                                    marginTop: 20,
                                    paddingVertical: 14,
                                    paddingHorizontal: 16,
                                    borderRadius: 14,
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                    borderWidth: 1,
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                }}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setAvailabilityTab(availabilityTab === 'weekly' ? 'monthly' : 'weekly');
                                }}
                                activeOpacity={0.7}
                            >
                                <ChevronRight
                                    size={18}
                                    color={theme.textSecondary}
                                    strokeWidth={2}
                                    style={{ transform: [{ rotate: availabilityTab === 'weekly' ? '90deg' : '0deg' }] }}
                                />
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '700',
                                        color: theme.textPrimary,
                                        textAlign: 'right',
                                    }}>
                                        {t('sitterDash.weeklyAvailability')}
                                    </Text>
                                    <Text style={{
                                        fontSize: 11,
                                        fontWeight: '500',
                                        color: theme.textSecondary,
                                        textAlign: 'right',
                                        marginTop: 2,
                                    }}>
                                        {t('sitterDash.chooseAvailDays')}
                                    </Text>
                                </View>
                                <Clock size={18} color={theme.textSecondary} strokeWidth={2} />
                            </TouchableOpacity>

                            {/* Weekly Pattern Content (collapsible) */}
                            {availabilityTab === 'weekly' && (
                                <View style={styles.compactDaysList}>
                                    {/* Compact List - All Days */}
                                    <View style={styles.compactDaysList}>
                                        {[
                                            { key: '0', label: t('sitterDash.sunday') },
                                            { key: '1', label: t('sitterDash.monday') },
                                            { key: '2', label: t('sitterDash.tuesday') },
                                            { key: '3', label: t('sitterDash.wednesday') },
                                            { key: '4', label: t('sitterDash.thursday') },
                                            { key: '5', label: t('sitterDash.friday') },
                                            { key: '6', label: t('sitterDash.saturday') },
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
                                                                    {t('sitterDash.notAvailableDay')}
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
                                                                <View style={[styles.timeInput, {
                                                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                                                                    overflow: 'hidden',
                                                                }]}>
                                                                    <DateTimePicker
                                                                        value={(() => {
                                                                            const [h = '9', m = '0'] = tempStartTime.split(':');
                                                                            const d = new Date();
                                                                            d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                                                            return d;
                                                                        })()}
                                                                        mode="time"
                                                                        display="compact"
                                                                        locale="en-GB"
                                                                        minuteInterval={15}
                                                                        onChange={(event, date) => {
                                                                            if (date && event.type === 'set') {
                                                                                const hh = String(date.getHours()).padStart(2, '0');
                                                                                const mm = String(date.getMinutes()).padStart(2, '0');
                                                                                setTempStartTime(`${hh}:${mm}`);
                                                                            }
                                                                        }}
                                                                        style={{ height: 34 }}
                                                                    />
                                                                </View>
                                                                <Text style={[styles.timeDash, { color: theme.textSecondary }]}>—</Text>
                                                                <View style={[styles.timeInput, {
                                                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                                                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                                                                    overflow: 'hidden',
                                                                }]}>
                                                                    <DateTimePicker
                                                                        value={(() => {
                                                                            const [h = '18', m = '0'] = tempEndTime.split(':');
                                                                            const d = new Date();
                                                                            d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
                                                                            return d;
                                                                        })()}
                                                                        mode="time"
                                                                        display="compact"
                                                                        locale="en-GB"
                                                                        minuteInterval={15}
                                                                        onChange={(event, date) => {
                                                                            if (date && event.type === 'set') {
                                                                                const hh = String(date.getHours()).padStart(2, '0');
                                                                                const mm = String(date.getMinutes()).padStart(2, '0');
                                                                                setTempEndTime(`${hh}:${mm}`);
                                                                            }
                                                                        }}
                                                                        style={{ height: 34 }}
                                                                    />
                                                                </View>
                                                                <TouchableOpacity
                                                                    style={[styles.timePickerSaveBtn, {
                                                                        backgroundColor: isDarkMode ? '#fff' : '#000',
                                                                    }]}
                                                                    onPress={async () => {
                                                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                                        const newHours = {
                                                                            ...availableHours,
                                                                            [day.key]: {
                                                                                start: tempStartTime,
                                                                                end: tempEndTime,
                                                                            }
                                                                        };
                                                                        setAvailableHours(newHours);
                                                                        setEditingDayKey(null);
                                                                        // Auto-save to Firestore immediately
                                                                        const userId = auth.currentUser?.uid;
                                                                        if (userId) {
                                                                            try {
                                                                                await updateDoc(doc(db, 'users', userId), {
                                                                                    sitterAvailableHours: newHours,
                                                                                });
                                                                                logger.log('📅 Hours auto-saved to Firestore:', JSON.stringify(newHours));
                                                                            } catch (e) {
                                                                                logger.error('📅 Failed to auto-save hours:', e);
                                                                            }
                                                                        }
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
                                                showSuccess(t('sitterDash.hoursCopied'));
                                            }
                                        }}
                                        activeOpacity={0.7}
                                        disabled={availableDays.length === 0}
                                    >
                                        <Text style={[styles.copyToAllText, { color: theme.textSecondary }]}>
                                            {t('sitterDash.copyHoursToAll')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>


                            )}

                            {/* MONOCHROMATIC Save Button */}
                            <TouchableOpacity
                                style={[styles.saveAvailabilityBtn, {
                                    backgroundColor: isDarkMode ? '#fff' : '#000',
                                    shadowColor: isDarkMode ? '#fff' : '#000',
                                    opacity: 1,
                                }]}
                                onPress={async () => {

                                    try {
                                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        setSavingSettings(true);

                                        const userId = auth.currentUser?.uid;
                                        if (userId) {
                                            // Clean past overrides before saving
                                            const today = new Date().toISOString().split('T')[0];
                                            const cleanedOverrides: Record<string, any> = {};
                                            for (const [dateKey, val] of Object.entries(monthlyOverrides)) {
                                                if (dateKey >= today) cleanedOverrides[dateKey] = val;
                                            }

                                            await updateDoc(doc(db, 'users', userId), {
                                                sitterAvailableDays: availableDays,
                                                sitterMonthlyOverrides: cleanedOverrides,
                                                sitterAvailabilityLoading: false,
                                                sitterAvailabilityDate: new Date().toISOString(),
                                                sitterActive: true
                                            });

                                            // Update local profile state
                                            setAvailabilityModalVisible(false);
                                            showSuccess(t('sitterDash.availabilityUpdated', { count: availableDays.length.toString() }));

                                            // Refresh data to reflect changes
                                            loadData();
                                        }
                                    } catch (error) {
                                        logger.error('Failed to save availability:', error);
                                        showError(t('sitterDash.saveError'));
                                    } finally {
                                        setSavingSettings(false);
                                    }
                                }}
                                disabled={savingSettings}
                                activeOpacity={0.8}
                            >
                                {savingSettings ? (
                                    <InlineLoader size="small" color={isDarkMode ? '#000' : '#fff'}  />
                                ) : (
                                    <>
                                        <CheckCircle size={20} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                        <Text style={[styles.saveAvailabilityBtnText, { color: isDarkMode ? '#000' : '#fff' }]}>{t('sitterDash.saveAvailability')}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>

            </Modal>

            {/* First-time sitter onboarding */}
            <SitterOnboarding
                visible={showOnboarding}
                onComplete={async () => {
                    setShowOnboarding(false);
                    try {
                        const userId = auth.currentUser?.uid;
                        if (userId) {
                            await updateDoc(doc(db, 'users', userId), {
                                hasSeenSitterOnboarding: true,
                            });
                        }
                    } catch (e) {
                        logger.error('Failed to save onboarding flag:', e);
                    }
                }}
            />
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        width: 90,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        elevation: 0,
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
        backgroundColor: '#C8806A',
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
        elevation: 0,
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

});

export default SitterDashboardScreen;
