import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Modal, Alert, ActivityIndicator, Platform, Share } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { getBabysitterReviews, markReviewHelpful, addSitterResponse, getReviewStats, trackProfileView, deleteReview } from '../services/babysitterService';
import { Review, REVIEW_TAG_LABELS, SitterBadge, BADGE_INFO } from '../types/babysitter';
import { auth, db } from '../services/firebaseConfig';
import { blockUser } from '../services/blockService';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, addDoc, serverTimestamp, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { ThumbsUp, MessageSquare, CheckCircle, Filter, ArrowUpDown, Star, MapPin, Briefcase, Globe, Share2, Heart, MoreVertical, ShieldAlert, Flag, Ban, Trophy, Gem, Sparkles, Trash2, CalendarDays, Clock } from 'lucide-react-native';
import { TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { logger } from '../utils/logger';
import { calculateSitterBadges } from '../services/babysitterService';
import { auth as firebaseAuth } from '../services/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGlobalPresence } from '../hooks/useGlobalPresence';
import { openSocialLink, type SocialPlatform } from '../utils/socialMediaUtils';
import { Instagram, Facebook, Linkedin, MessageCircle, Music, Send, Check } from 'lucide-react-native';
import { useFavoriteSitters } from '../hooks/useFavoriteSitters';

interface SocialLinks {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
    tiktok?: string;
    telegram?: string;
}

interface SitterData {
    id: string;
    name: string;
    age: number;
    image: string;
    coverPhoto?: string;
    rating: number;
    reviews: number;
    reviewsList?: Review[];
    price: number;
    distance: number;
    phone?: string;
    bio?: string;
    videoUri?: string;
    socialLinks?: SocialLinks;
    experience?: string;
    languages?: string[];
    certifications?: string[];
    city?: string;
    sitterAvailableDays?: string[];
    sitterAvailableHours?: Record<string, { start: string; end: string }>;
}

type RootStackParamList = {
    SitterProfile: { sitterData: SitterData };
};

type SitterProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'SitterProfile'>;

const SitterProfileScreen = ({ route, navigation }: SitterProfileScreenProps) => {
    const { sitterData } = route.params || {};
    const { theme, isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [showFullVideo, setShowFullVideo] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [sitterVideoUri, setSitterVideoUri] = useState<string | undefined>(sitterData.videoUri);
    const [sitterIsAvailable, setSitterIsAvailable] = useState(false);
    const [sitterIsVerified, setSitterIsVerified] = useState(false);
    const [sitterCoverPhoto, setSitterCoverPhoto] = useState<string | undefined>(sitterData.coverPhoto);

    // Check if sitter has a video
    const hasVideo = Boolean(sitterVideoUri && sitterVideoUri.trim());

    if (!sitterData) return null;

    const hasPhone = Boolean(sitterData.phone && sitterData.phone.trim());

    const handleCall = () => {
        if (hasPhone) {
            Linking.openURL(`tel:${sitterData.phone} `);
        } else {
            Alert.alert('שים לב', 'מספר טלפון לא זמין. נסה ליצור קשר בצ׳אט.');
        }
    };

    const handleWhatsApp = () => {
        if (!hasPhone) {
            Alert.alert('שים לב', 'מספר טלפון לא זמין.');
            return;
        }
        const cleanPhone = sitterData.phone!.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone;
        const message = `היי ${sitterData.name}, הגעתי דרך Calmino, אשמח לשמוע פרטים:)`;
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => Alert.alert('שגיאה', 'לא ניתן לפתוח וואצאפ'));

        // Track contact — used to verify reviews later
        const currentUserId = auth.currentUser?.uid;
        if (currentUserId && sitterData.id) {
            updateDoc(doc(db, 'users', currentUserId), {
                contactedSitters: arrayUnion(sitterData.id)
            }).catch(() => {});
        }
    };

    // Fetch reviews from Firebase
    const [reviewsList, setReviewsList] = useState<Review[]>(sitterData.reviewsList || []);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [reviewFilter, setReviewFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
    const [reviewSort, setReviewSort] = useState<'newest' | 'helpful' | 'highest'>('newest');
    const [reviewStats, setReviewStats] = useState<{ total: number; average: number; distribution: { [rating: number]: number }; verifiedCount: number; withResponseCount: number } | null>(null);
    const [respondingToReview, setRespondingToReview] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [badges, setBadges] = useState<SitterBadge[]>([]);
    const [phoneVisible, setPhoneVisible] = useState(true);
    const [pendingBookingToRate, setPendingBookingToRate] = useState<string | null>(null);
    const [showOptionsSheet, setShowOptionsSheet] = useState(false);
    const [availabilityDays, setAvailabilityDays] = useState<string[]>(sitterData.sitterAvailableDays || []);
    const [availabilityHours, setAvailabilityHours] = useState<Record<string, { start: string; end: string }>>(sitterData.sitterAvailableHours || {});
    const [monthlyOverrides, setMonthlyOverrides] = useState<Record<string, { available: boolean; start?: string; end?: string }>>({}); 

    // Report / Block state
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    // Live Presence
    const { isOnline, lastActive } = useGlobalPresence(sitterData.id);
    const { favorites, toggleFavorite } = useFavoriteSitters();
    const isFavorite = favorites.includes(sitterData.id);

    // Format last seen time
    const formatLastSeen = () => {
        if (!lastActive) return 'לא נראה/תה לאחרונה';

        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

        const timeStr = lastActive.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        if (diffDays === 0 && now.getDate() === lastActive.getDate()) {
            return `התחברות אחרונה: היום ב-${timeStr}`;
        } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== lastActive.getDate())) {
            return `התחברות אחרונה: אתמול ב-${timeStr}`;
        } else {
            return `התחברות אחרונה: ${lastActive.toLocaleDateString('he-IL')} ב-${timeStr}`;
        }
    };

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                logger.debug('🔍', 'Fetching reviews for sitter:', sitterData.id);
                const reviews = await getBabysitterReviews(sitterData.id);
                logger.debug('📊', 'Found reviews:', reviews.length);
                const stats = await getReviewStats(sitterData.id);
                logger.debug('📈', 'Review stats:', stats);
                setReviewStats(stats);
                setReviewsList(reviews);
            } catch (error) {
                logger.error('Could not fetch reviews:', error);
            } finally {
                setLoadingReviews(false);
            }
        };

        const fetchBadges = async () => {
            try {
                // Fetch sitter data from Firebase to get isAvailable, createdAt, and videoUri
                const sitterDoc = await getDoc(doc(db, 'users', sitterData.id));

                let isAvailable = false;
                let createdAt: Date | undefined = undefined;
                let videoUri: string | undefined = sitterData.videoUri;

                if (sitterDoc.exists()) {
                    const data = sitterDoc.data();
                    isAvailable = data.sitterAvailable || data.sitterActive || false;
                    setSitterIsAvailable(isAvailable);
                    setSitterIsVerified(Boolean(data.sitterVerified));
                    setPhoneVisible(data.sitterShowPhone !== false);

                    if (data.createdAt) {
                        createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    }

                    // Load availability
                    if (data.sitterAvailableDays) setAvailabilityDays(data.sitterAvailableDays);
                    if (data.sitterAvailableHours) {
                        logger.log('📅 Loading sitterAvailableHours:', JSON.stringify(data.sitterAvailableHours));
                        setAvailabilityHours(data.sitterAvailableHours);
                    } else {
                        logger.log('📅 No sitterAvailableHours found in Firestore');
                    }

                    // Load monthly overrides (filter to future only)
                    if (data.sitterMonthlyOverrides && typeof data.sitterMonthlyOverrides === 'object') {
                        const today = new Date().toISOString().split('T')[0];
                        const filtered: Record<string, { available: boolean; start?: string; end?: string }> = {};
                        for (const [dateKey, val] of Object.entries(data.sitterMonthlyOverrides)) {
                            if (dateKey >= today) filtered[dateKey] = val as any;
                        }
                        setMonthlyOverrides(filtered);
                    }

                    // Get videoUri from Firebase if not already in sitterData
                    if (!videoUri) {
                        videoUri = data.sitterVideoUri || data.videoUri || undefined;
                    }
                    if (videoUri) {
                        setSitterVideoUri(videoUri);
                    }

                    // Load cover photo
                    if (data.sitterCoverPhoto) {
                        setSitterCoverPhoto(data.sitterCoverPhoto);
                    }

                    // Read cached badges from Firestore (no extra reads needed)
                    const cachedBadges: SitterBadge[] = Array.isArray(data.sitterBadges) ? data.sitterBadges : [];
                    // Append available_now dynamically
                    const finalBadges = isAvailable ? [...cachedBadges, 'available_now' as SitterBadge] : cachedBadges;
                    if (cachedBadges.length > 0 || isAvailable) {
                        setBadges(finalBadges);
                        return; // Skip expensive on-demand calculation
                    }
                }

                // Fallback: calculate on-demand for sitters without cached badges
                const calculatedBadges = await calculateSitterBadges(sitterData.id, {
                    rating: sitterData.rating,
                    reviewCount: sitterData.reviews,
                    isAvailable,
                    createdAt,
                });
                setBadges(calculatedBadges);
            } catch (error) {
                logger.warn('Could not fetch badges:', error);
            }
        };

        if (sitterData.id) {
            fetchReviews();
            fetchBadges();
            // Track profile view
            const currentUserId = auth.currentUser?.uid;
            if (currentUserId) {
                trackProfileView(sitterData.id, currentUserId);

                // Check if user has an unrated completed booking with this sitter
                const checkPendingRatings = async () => {
                    try {
                        const q = query(
                            collection(db, 'bookings'),
                            where('parentId', '==', currentUserId),
                            where('babysitterId', '==', sitterData.id),
                            where('status', '==', 'completed')
                        );

                        const snapshot = await getDocs(q);
                        const unratedDoc = snapshot.docs.find(doc => !doc.data().isRated);

                        if (unratedDoc) {
                            setPendingBookingToRate(unratedDoc.id);
                        }
                    } catch (error) {
                        logger.error('Error checking pending ratings for profile:', error);
                    }
                };
                checkPendingRatings();
            }
        }
    }, [sitterData.id]);

    // Filter and sort reviews
    const filteredAndSortedReviews = reviewsList
        .filter(review => {
            if (reviewFilter === 'all') return true;
            return review.rating === parseInt(reviewFilter);
        })
        .sort((a, b) => {
            if (reviewSort === 'newest') {
                const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
                const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
                return bTime - aTime;
            }
            if (reviewSort === 'helpful') {
                return (b.helpfulCount || 0) - (a.helpfulCount || 0);
            }
            if (reviewSort === 'highest') {
                return b.rating - a.rating;
            }
            return 0;
        });

    const handleMarkHelpful = async (reviewId: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const success = await markReviewHelpful(reviewId, userId);
        if (success) {
            // Refresh reviews
            const reviews = await getBabysitterReviews(sitterData.id);
            setReviewsList(reviews);
        }
    };

    const handleSubmitResponse = async (reviewId: string) => {
        if (!responseText.trim()) return;

        const success = await addSitterResponse(reviewId, sitterData.id, responseText);
        if (success) {
            setRespondingToReview(null);
            setResponseText('');
            // Refresh reviews
            const reviews = await getBabysitterReviews(sitterData.id);
            setReviewsList(reviews);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        Alert.alert('מחיקת ביקורת', 'האם אתה בטוח שברצונך למחוק את הביקורת?', [
            { text: 'ביטול', style: 'cancel' },
            {
                text: 'מחק',
                style: 'destructive',
                onPress: async () => {
                    const uid = auth.currentUser?.uid;
                    if (!uid) return;
                    const success = await deleteReview(reviewId, uid);
                    if (success) {
                        const reviews = await getBabysitterReviews(sitterData.id);
                        setReviewsList(reviews);
                    }
                },
            },
        ]);
    };

    const isCurrentUserSitter = auth.currentUser?.uid === sitterData.id;
    const currentUserId = auth.currentUser?.uid;

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [submittingReport, setSubmittingReport] = useState(false);

    const handleReportSitter = () => {
        setShowOptionsMenu(false);
        setShowReportModal(true);
    };

    const submitReport = async () => {
        if (!reportReason.trim()) {
            Alert.alert('שגיאה', 'אנא הזן את מהות הדיווח כדי שנוכל לטפל בבעיה.');
            return;
        }

        setSubmittingReport(true);
        try {
            // Save to Firestore
            await addDoc(collection(db, 'sitter_reports'), {
                reporterId: currentUserId || 'guest',
                sitterId: sitterData.id,
                sitterName: sitterData.name,
                reason: reportReason.trim(),
                createdAt: serverTimestamp(),
                status: 'new'
            });

            // Send email notification via Firebase Trigger Email extension
            await addDoc(collection(db, 'mail'), {
                to: 'calminogroup@gmail.com',
                message: {
                    subject: `דיווח חדש על סיטר: ${sitterData.name}`,
                    html: `
                        <div dir="rtl" style="font-family: Arial, sans-serif;">
                            <h2>דיווח חדש התקבל</h2>
                            <p><strong>שם הסיטר:</strong> ${sitterData.name}</p>
                            <p><strong>מזהה סיטר:</strong> ${sitterData.id}</p>
                            <p><strong>מזהה מדווח:</strong> ${currentUserId || 'guest'}</p>
                            <p><strong>סיבת הדיווח:</strong></p>
                            <p>${reportReason.trim()}</p>
                        </div>
                    `,
                },
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowReportModal(false);
            setReportReason('');

            Alert.alert(
                'הדיווח נשלח',
                'תודה על הדיווח. הצוות שלנו קיבל את פנייתך ויטפל בה בהקדם האפשרי.'
            );
        } catch (error: any) {
            logger.error('Error submitting report:', error?.code, error?.message, error);
            Alert.alert('שגיאה', 'אירעה שגיאה בשליחת הדיווח. אנא נסה שוב.');
        } finally {
            setSubmittingReport(false);
        }
    };

    const handleBlockSitter = () => {
        setShowOptionsMenu(false);
        if (!currentUserId) return;

        Alert.alert(
            'חסימת משתמש',
            `האם אתה בטוח שברצונך לחסום את ${sitterData.name}? היא לא תופיע יותר בתוצאות החיפוש שלך.`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'חסום',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await blockUser(currentUserId, sitterData.id, sitterData.name, sitterData.image, 'sitter');
                            // Also remove from favorites if present
                            await updateDoc(doc(db, 'users', currentUserId), {
                                favoriteSitters: arrayRemove(sitterData.id)
                            }).catch(() => {}); // Silent — may not exist
                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('נחסמה', `${sitterData.name} נחסמה בהצלחה ולא תוצג יותר.`);
                            navigation.goBack();
                        } catch (error) {
                            logger.error('Error blocking sitter:', error);
                            Alert.alert('שגיאה', 'אירעה שגיאה בחסימת המשתמש. נסה שוב.');
                        }
                    }
                }
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            {/* Top Navigation */}
            <View style={[styles.topNav, {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }]}>
                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                </TouchableOpacity>

                {/* Right side actions - Share and Favorite */}
                {!isCurrentUserSitter && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                try {
                                    const msg = `מצאתי בייביסיטר ב-Calmino, הנה הפרופיל של ${sitterData.name}:\n\ncalmparentapp://babysitter/${sitterData.id}`;
                                    Share.share({
                                        message: msg,
                                        url: `calmparentapp://babysitter/${sitterData.id}`,
                                        title: 'שיתוף פרופיל בייביסיטר'
                                    });
                                } catch (error) {
                                    logger.error('Share error:', error);
                                }
                            }}
                        >
                            <Share2 size={22} color={theme.textPrimary} strokeWidth={2} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                toggleFavorite(sitterData.id);
                            }}
                        >
                            <Heart
                                size={22}
                                color={isFavorite ? '#F43F5E' : theme.textPrimary}
                                fill={isFavorite ? '#F43F5E' : 'transparent'}
                                strokeWidth={isFavorite ? 0 : 2}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => setShowOptionsMenu(true)}
                        >
                            <MoreVertical size={22} color={theme.textPrimary} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 134 + 80 }]}>
                {/* Hero Section - Static image or video */}
                <View style={styles.heroContainer}>
                    {hasVideo && sitterVideoUri ? (
                        <Video
                            style={styles.heroVideo}
                            source={{ uri: sitterVideoUri }}
                            resizeMode={ResizeMode.COVER}
                            isLooping
                            shouldPlay
                            isMuted
                        />
                    ) : (
                        <>
                            {imageLoading && !imageError && (
                                <View style={[styles.heroVideo, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                                    <ActivityIndicator size="large" color={theme.textPrimary} />
                                </View>
                            )}
                            {!imageError ? (
                                <Image
                                    source={{ uri: sitterCoverPhoto || sitterData.image }}
                                    style={[styles.heroVideo, { opacity: imageLoading ? 0 : 1 }]}
                                    resizeMode="cover"
                                    onLoad={() => setImageLoading(false)}
                                    onError={() => {
                                        setImageError(true);
                                        setImageLoading(false);
                                    }}
                                />
                            ) : (
                                <View style={[styles.heroVideo, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Ionicons name="person" size={64} color="#9CA3AF" />
                                </View>
                            )}
                        </>
                    )}
                    {/* Premium Gradient Overlay */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.heroContent}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarWrapper}>
                                <Image source={{ uri: sitterData.image }} style={styles.profileAvatar} />
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.1)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 0, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </View>
                            {sitterIsVerified && (
                                <View style={[styles.verifiedBadge, {
                                    backgroundColor: isDarkMode ? '#fff' : '#000',
                                    shadowColor: isDarkMode ? '#fff' : '#000'
                                }]}>
                                    <MaterialIcons name="verified" size={18} color={isDarkMode ? '#000' : '#fff'} />
                                </View>
                            )}
                        </View>
                        <Text style={styles.heroName}>{sitterData.name || 'סיטר'}, {sitterData.age ?? ''}</Text>
                        <View style={styles.ratingTag}>
                            {Platform.OS === 'ios' && (
                                <BlurView
                                    intensity={20}
                                    tint="dark"
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <LinearGradient
                                colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.6)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Star size={16} color="#FBBF24" fill="#FBBF24" strokeWidth={1.5} />
                            <Text style={styles.ratingText}>{sitterData.rating ?? 0} ({reviewStats?.total ?? sitterData.reviews ?? 0} ביקורות)</Text>
                        </View>

                        {/* Available Now - Clean Pill */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {sitterIsAvailable && (
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                    backgroundColor: 'rgba(16, 185, 129, 0.9)',
                                    paddingHorizontal: 14,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                }}>
                                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' }} />
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>זמין עכשיו</Text>
                                </View>
                            )}

                            {/* Online / Last Seen Presence Pill */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: isOnline ? 'rgba(37, 99, 235, 0.9)' : 'rgba(0, 0, 0, 0.6)',
                                paddingHorizontal: 14,
                                paddingVertical: 6,
                                borderRadius: 20,
                            }}>
                                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isOnline ? '#fff' : 'rgba(255,255,255,0.7)' }} />
                                <Text style={{ color: isOnline ? '#fff' : 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>
                                    {isOnline ? 'מחובר/ת' : formatLastSeen()}
                                </Text>
                            </View>
                        </View>

                        {/* Sitter Badges */}
                        {badges.filter(b => b !== 'available_now').length > 0 && (
                            <View style={styles.badgesContainer}>
                                {badges.filter(b => b !== 'available_now').map((badgeType) => {
                                    const badge = BADGE_INFO[badgeType];
                                    const BadgeIcon = badgeType === 'highly_recommended' ? Trophy
                                        : badgeType === 'vip_sitter' ? Gem
                                        : badgeType === 'rising_star' ? Sparkles
                                        : Star;
                                    return (
                                        <View key={badgeType} style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                            backgroundColor: 'rgba(0,0,0,0.45)',
                                            paddingHorizontal: 10,
                                            paddingVertical: 5,
                                            borderRadius: 16,
                                        }}>
                                            <BadgeIcon size={12} color={badge.color} />
                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{badge.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {hasVideo && (
                        <TouchableOpacity style={styles.playFullBtn} onPress={() => setShowFullVideo(true)}>
                            <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.95)" />
                            <Text style={styles.playText}>נגן היכרות</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Row */}
                {((sitterData.distance ?? 0) > 0 || (reviewStats?.total ?? sitterData.reviews ?? 0) > 0) && (
                    <View style={[styles.trustRow, {
                        backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                    }]}>
                        {(sitterData.distance ?? 0) > 0 && (
                            <View style={styles.trustItem}>
                                <Text style={[styles.trustValue, { color: theme.textPrimary }]}>{sitterData.distance} ק"מ</Text>
                                <Text style={[styles.trustLabel, { color: theme.textSecondary }]}>מרחק ממך</Text>
                            </View>
                        )}
                        {(sitterData.distance ?? 0) > 0 && (reviewStats?.total ?? sitterData.reviews ?? 0) > 0 && (
                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                        )}
                        {(reviewStats?.total ?? sitterData.reviews ?? 0) > 0 && (
                            <View style={styles.trustItem}>
                                <Text style={[styles.trustValue, { color: theme.textPrimary }]}>{reviewStats?.total ?? sitterData.reviews}</Text>
                                <Text style={[styles.trustLabel, { color: theme.textSecondary }]}>ביקורות</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* About + Quick Info - Combined clean block */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                    {/* Quick Info Chips */}
                    {(sitterData.price > 0 || sitterData.experience || sitterData.city) && (
                        <View style={[styles.infoGrid, { marginBottom: sitterData.bio ? 14 : 0 }]}>
                            {sitterData.price > 0 && (
                                <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary }}>₪</Text>
                                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{sitterData.price}/שעה</Text>
                                </View>
                            )}
                            {sitterData.city && (
                                <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                    <MapPin size={13} color={theme.textSecondary} strokeWidth={2} />
                                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{sitterData.city}</Text>
                                </View>
                            )}
                            {sitterData.experience && (
                                <View style={[styles.infoItem, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                    <Briefcase size={13} color={theme.textSecondary} strokeWidth={2} />
                                    <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{sitterData.experience}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Bio */}
                    {sitterData.bio && (
                        <Text style={[styles.bioText, { color: theme.textSecondary }]}>{sitterData.bio}</Text>
                    )}
                </View>

                {/* Languages + Certifications - inline if both exist */}
                {((sitterData.languages && sitterData.languages.length > 0) || (sitterData.certifications && sitterData.certifications.length > 0)) && (
                    <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                        {sitterData.languages && sitterData.languages.length > 0 && (
                            <View style={{ marginBottom: (sitterData.certifications && sitterData.certifications.length > 0) ? 12 : 0 }}>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>שפות</Text>
                                <View style={styles.tagsRow}>
                                    {sitterData.languages.map((lang) => (
                                        <View key={lang} style={[styles.tagPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                                            <Text style={[styles.tagText, { color: theme.textPrimary }]}>{lang}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {sitterData.certifications && sitterData.certifications.length > 0 && (
                            <View>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>הסמכות</Text>
                                <View style={styles.tagsRow}>
                                    {sitterData.certifications.map((cert) => (
                                        <View key={cert} style={[styles.tagPill, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)', borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)' }]}>
                                            <CheckCircle size={11} color="#10B981" strokeWidth={2.5} />
                                            <Text style={[styles.tagText, { color: theme.textPrimary }]}>{cert}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Upcoming 7 Days — Real Calendar Dates */}
                {availabilityDays.length > 0 && (() => {
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    const upcoming: { dateStr: string; date: Date; dayKey: string }[] = [];
                    for (let i = 0; i < 7; i++) {
                        const d = new Date(today);
                        d.setDate(d.getDate() + i);
                        upcoming.push({
                            dateStr: d.toISOString().split('T')[0],
                            date: d,
                            dayKey: d.getDay().toString(),
                        });
                    }
                    const availCount = upcoming.filter(u => {
                        const override = monthlyOverrides[u.dateStr];
                        return override ? override.available : availabilityDays.includes(u.dayKey);
                    }).length;

                    return (
                        <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
                            {/* Section Header */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, direction: 'rtl' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <CalendarDays size={16} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                                    <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>השבוע הקרוב</Text>
                                </View>
                                <View style={{
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
                                }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}>
                                        {availCount}/7 ימים
                                    </Text>
                                </View>
                            </View>
                            
                            {/* Days Grid */}
                            <View style={{ flexDirection: 'row', gap: 6, direction: 'rtl' }}>
                                {upcoming.map((u) => {
                                    const override = monthlyOverrides[u.dateStr];
                                    const hasOverride = !!override;
                                    const isAvailable = hasOverride ? override.available : availabilityDays.includes(u.dayKey);
                                    const hours = hasOverride && override.available && override.start && override.end
                                        ? { start: override.start, end: override.end }
                                        : (availabilityDays.includes(u.dayKey) ? availabilityHours[u.dayKey] : null);
                                    const isToday = u.dateStr === todayStr;
                                    const dayLetter = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'][u.date.getDay()];

                                    return (
                                        <View key={u.dateStr} style={{
                                            flex: 1,
                                            backgroundColor: isAvailable
                                                ? (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                                                : (isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                                            borderRadius: 14,
                                            borderWidth: isToday ? 2 : 1,
                                            borderColor: isToday
                                                ? (isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.2)')
                                                : isAvailable
                                                    ? (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')
                                                    : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minHeight: 80,
                                        }}>
                                            {/* Date Number */}
                                            <Text style={{
                                                fontSize: 18, fontWeight: '800',
                                                color: isAvailable
                                                    ? (isDarkMode ? '#fff' : '#000')
                                                    : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                                            }}>
                                                {u.date.getDate()}
                                            </Text>
                                            {/* Day Letter */}
                                            <Text style={{
                                                fontSize: 11, fontWeight: '700',
                                                color: isAvailable
                                                    ? (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)')
                                                    : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                                                marginTop: 2,
                                            }}>
                                                {dayLetter}
                                            </Text>
                                            {/* Hours */}
                                            {isAvailable && hours ? (
                                                <View style={{ alignItems: 'center', marginTop: 4 }}>
                                                    <Text style={{
                                                        fontSize: 8.5, fontWeight: '700',
                                                        color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                                                        letterSpacing: -0.3,
                                                    }}>
                                                        {hours.start}
                                                    </Text>
                                                    <View style={{
                                                        width: 8, height: 1,
                                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                                                        marginVertical: 1.5,
                                                        borderRadius: 1,
                                                    }} />
                                                    <Text style={{
                                                        fontSize: 8.5, fontWeight: '700',
                                                        color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                                                        letterSpacing: -0.3,
                                                    }}>
                                                        {hours.end}
                                                    </Text>
                                                </View>
                                            ) : null}
                                            {/* Override indicator */}
                                            {hasOverride && (
                                                <View style={{
                                                    width: 4, height: 4, borderRadius: 2,
                                                    backgroundColor: isDarkMode ? '#fff' : '#000',
                                                    marginTop: 4,
                                                }} />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })()}


                {/* Social Media Links */}
                {sitterData.socialLinks && Object.values(sitterData.socialLinks).some(v => v) && (
                    <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>רשתות חברתיות</Text>
                        <View style={[styles.socialRow, { gap: 14 }]}>
                            {([
                                { key: 'whatsapp', icon: MessageCircle, color: '#25D366', label: 'WhatsApp' },
                                { key: 'linkedin', icon: Linkedin, color: '#0077B5', label: 'LinkedIn' },
                                { key: 'facebook', icon: Facebook, color: '#1877F2', label: 'Facebook' },
                                { key: 'instagram', icon: Instagram, color: '#E1306C', label: 'Instagram' },
                                { key: 'tiktok', icon: Music, color: isDarkMode ? '#fff' : '#000', label: 'TikTok' },
                                { key: 'telegram', icon: Send, color: '#0088CC', label: 'Telegram' },
                            ] as const).filter(s => sitterData.socialLinks?.[s.key as keyof SocialLinks]).map((s) => {
                                const Icon = s.icon;
                                return (
                                    <TouchableOpacity
                                        key={s.key}
                                        style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 18,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 1,
                                            backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                                            borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)',
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.1,
                                            shadowRadius: 4,
                                            elevation: 0,
                                        }}
                                        onPress={() => openSocialLink(s.key as SocialPlatform, sitterData.socialLinks![s.key as keyof SocialLinks]!)}
                                        activeOpacity={0.7}
                                    >
                                        <Icon size={24} color={isDarkMode ? '#ffffff' : '#000000'} strokeWidth={1.5} />
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
                                            borderColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                                            backgroundColor: '#10B981',
                                        }}>
                                            <Check size={12} color="#fff" strokeWidth={3.5} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Thin separator before reviews */}
                <View style={{ height: 1, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', marginHorizontal: 20 }} />

                {/* Reviews */}
                <View style={styles.section}>
                    <View style={styles.reviewsHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>מה ההורים אומרים</Text>
                        {reviewStats && (
                            <View style={[styles.reviewStatsContainer, {
                                backgroundColor: isDarkMode ? theme.card : '#F9FAFB',
                                borderColor: theme.border
                            }]}>
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
                                        : ['#FFFFFF', '#F9FAFB']
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={{ zIndex: 1 }}>
                                    <View style={styles.reviewStatsRow}>
                                        <Star size={20} color="#FBBF24" fill="#FBBF24" strokeWidth={1.5} />
                                        <Text style={[styles.reviewStatsText, { color: theme.textPrimary }]}>
                                            {reviewStats.average.toFixed(1)}
                                        </Text>
                                        <Text style={[styles.reviewStatsSubtext, { color: theme.textSecondary }]}>
                                            ({reviewStats.total} ביקורות)
                                        </Text>
                                    </View>
                                    {reviewStats.verifiedCount > 0 && (
                                        <View style={styles.verifiedBadgeContainer}>
                                            <CheckCircle size={12} color={theme.textPrimary} strokeWidth={2.5} />
                                            <Text style={[styles.verifiedCountText, {
                                                color: theme.textPrimary,
                                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                                            }]}>
                                                {reviewStats.verifiedCount} מאומתות
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Rating Distribution - Premium Design */}
                    {reviewStats && reviewStats.total > 0 && (
                        <View style={[styles.ratingDistribution, {
                            backgroundColor: isDarkMode ? theme.card : '#F9FAFB',
                            borderColor: theme.border
                        }]}>
                            {Platform.OS === 'ios' && (
                                <BlurView
                                    intensity={15}
                                    tint={isDarkMode ? 'dark' : 'light'}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}
                            <LinearGradient
                                colors={isDarkMode
                                    ? [theme.card + 'CC', theme.card + '99']
                                    : ['#FFFFFF', '#F9FAFB']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            {[5, 4, 3, 2, 1].reverse().map(rating => {
                                const count = reviewStats.distribution[rating] || 0;
                                const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                                return (
                                    <View key={rating} style={[styles.ratingBarRow, { zIndex: 1 }]}>
                                        <View style={styles.ratingBarLabelContainer}>
                                            <Star size={14} color="#FBBF24" fill={count > 0 ? "#FBBF24" : "transparent"} strokeWidth={1.5} />
                                            <Text style={[styles.ratingBarLabel, { color: theme.textPrimary }]}>{rating}</Text>
                                        </View>
                                        <View style={[styles.ratingBarContainer, { backgroundColor: isDarkMode ? theme.border : '#E5E7EB' }]}>
                                            {percentage > 0 && (
                                                <LinearGradient
                                                    colors={['#FBBF24', '#F59E0B']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={[styles.ratingBar, { width: `${percentage}%` }]}
                                                />
                                            )}
                                        </View>
                                        <Text style={[styles.ratingBarCount, { color: theme.textSecondary }]}>{count}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Filter and Sort */}
                    {reviewsList.length > 0 && (
                        <View style={styles.reviewControls}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                                <TouchableOpacity
                                    style={[styles.filterChip,
                                    reviewFilter === 'all' && {
                                        backgroundColor: isDarkMode ? '#fff' : '#000',
                                        borderColor: isDarkMode ? '#fff' : '#000'
                                    }
                                    ]}
                                    onPress={() => setReviewFilter('all')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.filterChipText,
                                    reviewFilter === 'all' && {
                                        color: isDarkMode ? '#000' : '#fff',
                                        fontWeight: '700'
                                    }
                                    ]}>הכל</Text>
                                </TouchableOpacity>
                                {[5, 4, 3, 2, 1].map(rating => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[styles.filterChip,
                                        reviewFilter === String(rating) && {
                                            backgroundColor: isDarkMode ? '#fff' : '#000',
                                            borderColor: isDarkMode ? '#fff' : '#000'
                                        }
                                        ]}
                                        onPress={() => setReviewFilter(String(rating) as any)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.filterChipContent}>
                                            <Star size={14} color={reviewFilter === String(rating) ? (isDarkMode ? '#000' : '#fff') : theme.textSecondary} fill={reviewFilter === String(rating) ? (isDarkMode ? '#000' : '#fff') : 'transparent'} strokeWidth={1.5} />
                                            <Text style={[styles.filterChipText,
                                            reviewFilter === String(rating) && {
                                                color: isDarkMode ? '#000' : '#fff',
                                                fontWeight: '700'
                                            }
                                            ]}>
                                                {rating}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={[styles.sortButton, {
                                    backgroundColor: isDarkMode ? theme.card : 'rgba(0, 0, 0, 0.04)',
                                    borderColor: theme.border
                                }]}
                                activeOpacity={0.7}
                                onPress={() => {
                                    const options = ['newest', 'helpful', 'highest'];
                                    const currentIndex = options.indexOf(reviewSort);
                                    setReviewSort(options[(currentIndex + 1) % options.length] as any);
                                }}
                            >
                                <ArrowUpDown size={16} color={theme.textPrimary} />
                                <Text style={[styles.sortButtonText, { color: theme.textPrimary }]}>
                                    {reviewSort === 'newest' ? 'חדשות' : reviewSort === 'helpful' ? 'מועילות' : 'גבוהות'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {loadingReviews ? (
                        <View style={styles.emptyReviews}>
                            <ActivityIndicator size="small" color={theme.textPrimary} />
                        </View>
                    ) : filteredAndSortedReviews.length > 0 ? (
                        filteredAndSortedReviews.map((review) => (
                            <View key={review.id} style={[styles.reviewCard, {
                                backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                                borderColor: theme.border
                            }]}>
                                {Platform.OS === 'ios' && (
                                    <BlurView
                                        intensity={15}
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

                                <View style={[styles.reviewHeader, { zIndex: 1 }]}>
                                    <View style={styles.reviewHeaderLeft}>
                                        <Text style={[styles.reviewerName, { color: theme.textPrimary }]}>{review.parentName || 'הורה'}</Text>
                                        {review.isVerified && (
                                            <View style={[styles.verifiedBadgeSmall, {
                                                backgroundColor: isDarkMode ? '#fff' : '#000',
                                                shadowColor: isDarkMode ? '#fff' : '#000'
                                            }]}>
                                                <CheckCircle size={12} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                                                <Text style={[styles.verifiedText, { color: isDarkMode ? '#000' : '#fff' }]}>מאומת</Text>
                                            </View>
                                        )}
                                        {review.parentId === currentUserId && (
                                            <TouchableOpacity
                                                onPress={() => handleDeleteReview(review.id)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                style={{ marginRight: 4 }}
                                            >
                                                <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.reviewHeaderRight}>
                                        <View style={styles.reviewRating}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star
                                                    key={star}
                                                    size={18}
                                                    color="#FBBF24"
                                                    fill={star <= review.rating ? "#FBBF24" : "transparent"}
                                                    strokeWidth={1.5}
                                                />
                                            ))}
                                        </View>
                                        <Text style={[styles.reviewDate, { color: theme.textSecondary }]}>
                                            {review.createdAt?.toDate?.()?.toLocaleDateString('he-IL') || ''}
                                        </Text>
                                    </View>
                                </View>

                                {/* Tags */}
                                {review.tags && review.tags.length > 0 && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                                        {review.tags.map((tag: string) => (
                                            <View key={tag} style={{ backgroundColor: isDarkMode ? 'rgba(124,58,237,0.15)' : '#F5F3FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                                                <Text style={{ fontSize: 12, color: '#7C3AED', fontWeight: '600' }}>{REVIEW_TAG_LABELS[tag as keyof typeof REVIEW_TAG_LABELS] || tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Text comment */}
                                {review.text ? (
                                    <Text style={[styles.reviewBody, { color: theme.textPrimary }]}>"{review.text}"</Text>
                                ) : null}

                                {/* Sitter Response Removed as per user request */}

                                {/* Add Response Removed as per user request to disable replies */}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyReviews}>
                            <Ionicons name="chatbubble-outline" size={32} color="#D1D5DB" />
                            <Text style={styles.emptyReviewsText}>אין ביקורות עדיין</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View style={[styles.stickyFooter, {
                bottom: 134,
                paddingBottom: 8,
                backgroundColor: isDarkMode ? theme.background : '#fff',
                borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
            }]}>
                {phoneVisible && (
                    <TouchableOpacity style={[styles.iconBtn, {
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                    }]} onPress={handleCall}>
                        <Ionicons name="call" size={20} color={theme.textPrimary} />
                    </TouchableOpacity>
                )}

                {!isCurrentUserSitter && (
                    <TouchableOpacity
                        style={[styles.bookBtn, {
                            backgroundColor: '#FBBF24', // Review yellow
                            flex: 0.8,
                            marginRight: 8,
                        }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            (navigation as any).navigate('RatingScreen', {
                                bookingId: pendingBookingToRate || undefined,
                                babysitterId: sitterData.id,
                                sitterName: sitterData.name
                            });
                        }}
                    >
                        <Star size={18} color="#000" fill="#000" />
                        <Text style={[styles.bookBtnText, { color: '#000', marginLeft: 6 }]}>כתוב ביקורת</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.bookBtn, {
                        backgroundColor: '#25D366' // WhatsApp Green
                    }]}
                    onPress={handleWhatsApp}
                >
                    <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    <Text style={[styles.bookBtnText, { color: '#fff', marginLeft: 6 }]}>שלח הודעה</Text>
                </TouchableOpacity>
            </View>

            {/* Options Modal (Premium iOS Bottom Sheet) */}
            <Modal visible={showOptionsSheet} animationType="slide" transparent={true}>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                    activeOpacity={1}
                    onPress={() => setShowOptionsSheet(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={{
                        backgroundColor: isDarkMode ? theme.card : '#fff',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
                    }}>
                        <View style={{ width: 40, height: 5, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginVertical: 12, borderRadius: 3 }} />

                        <View style={{ padding: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 20, textAlign: 'center' }}>אפשרויות פרופיל</Text>

                            <TouchableOpacity style={{
                                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }} onPress={() => {
                                setShowOptionsSheet(false);
                                Alert.alert('חסימה', 'האם אתה בטוח שברצונך לחסום משתמש זה? לא תוכלו לראות אחד את השני באפליקציה.', [
                                    { text: 'ביטול', style: 'cancel' },
                                    {
                                        text: 'חסום', style: 'destructive', onPress: async () => {
                                            const currentUserId = auth.currentUser?.uid;
                                            if (currentUserId) {
                                                const success = await blockUser(currentUserId, sitterData.id, sitterData.name, sitterData.image, 'sitter');
                                                if (success) {
                                                    Alert.alert('נחסם', 'המשתמש נחסם בהצלחה.');
                                                    navigation.goBack();
                                                } else {
                                                    Alert.alert('שגיאה', 'אירעה שגיאה בחסימת המשתמש.');
                                                }
                                            }
                                        }
                                    }
                                ]);
                            }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShieldAlert size={20} color="#EF4444" strokeWidth={2} />
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>חסום סיטר</Text>
                                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>מניעת יצירת קשר וצפייה בפרופיל</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={{
                                flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16
                            }} onPress={() => {
                                setShowOptionsSheet(false);
                                Alert.alert('דיווח התקבל', 'תודה על הדיווח. הצוות שלנו יבדוק את הנושא בהקדם.', [{ text: 'סגור' }]);
                            }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Flag size={20} color="#F59E0B" strokeWidth={2} />
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textPrimary }}>דיווח מנהלים</Text>
                                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>דיווח על תוכן פוגעני או מזויף</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Video Modal */}
            <Modal visible={showFullVideo} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.videoModal}>
                    <TouchableOpacity style={styles.closeVideoBtn} onPress={() => setShowFullVideo(false)}>
                        <Ionicons name="close-circle" size={44} color="#fff" />
                    </TouchableOpacity>
                    {sitterVideoUri && (
                        <Video
                            style={styles.fullVideo}
                            source={{ uri: sitterVideoUri }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={showFullVideo}
                        />
                    )}
                </View>
            </Modal>

            {/* Options Menu Modal (Report/Block) */}
            <Modal
                visible={showOptionsMenu}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowOptionsMenu(false)}
            >
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
                    activeOpacity={1}
                    onPress={() => setShowOptionsMenu(false)}
                />
                <View style={{
                    backgroundColor: theme.card,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingBottom: 34,
                    paddingHorizontal: 20,
                    paddingTop: 14,
                }}>
                    {/* Handle */}
                    <View style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)', alignSelf: 'center', marginBottom: 24 }} />

                    <TouchableOpacity
                        onPress={handleReportSitter}
                        activeOpacity={0.6}
                        style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, gap: 14 }}
                    >
                        <Flag size={18} color={theme.textSecondary} strokeWidth={1.8} />
                        <Text style={{ flex: 1, fontSize: 16, color: theme.textPrimary, textAlign: 'right' }}>דווח על פרופיל</Text>
                    </TouchableOpacity>

                    <View style={{ height: 0.5, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />

                    <TouchableOpacity
                        onPress={handleBlockSitter}
                        activeOpacity={0.6}
                        style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, gap: 14 }}
                    >
                        <Ban size={18} color="#FF3B30" strokeWidth={1.8} />
                        <Text style={{ flex: 1, fontSize: 16, color: '#FF3B30', textAlign: 'right' }}>חסום את {sitterData.name}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 0.5, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', marginBottom: 8 }} />

                    <TouchableOpacity
                        onPress={() => setShowOptionsMenu(false)}
                        activeOpacity={0.6}
                        style={{ paddingVertical: 14, alignItems: 'center' }}
                    >
                        <Text style={{ fontSize: 16, color: theme.textSecondary }}>ביטול</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Report Sitter Modal */}
            <Modal
                visible={showReportModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowReportModal(false)}
            >
                <View style={styles.optionsModalOverlay}>
                    <View style={[styles.reportModalContent, {
                        backgroundColor: isDarkMode ? theme.cardSecondary : theme.card,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    }]}>
                        <Text style={[styles.optionsModalTitle, {
                            color: theme.textSecondary,
                            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }]}>
                            דיווח על בייביסיטר
                        </Text>

                        <View style={styles.reportFormContainer}>
                            <Text style={[styles.reportFormLabel, { color: theme.textPrimary }]}>
                                מה מהות הדיווח בנוגע ל{sitterData.name}?
                            </Text>
                            <TextInput
                                style={[styles.reportInput, {
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F5F7FA',
                                    color: theme.textPrimary,
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E8ECF0'
                                }]}
                                placeholder="פרט כאן את הסיבה השלמה..."
                                placeholderTextColor={theme.textTertiary}
                                multiline
                                textAlignVertical="top"
                                value={reportReason}
                                onChangeText={setReportReason}
                            />
                        </View>

                        <View style={styles.reportActions}>
                            <TouchableOpacity
                                style={[styles.reportActionBtn, styles.reportCancelBtn]}
                                onPress={() => {
                                    setShowReportModal(false);
                                    setReportReason('');
                                }}
                                disabled={submittingReport}
                            >
                                <Text style={[styles.reportActionText, { color: theme.textSecondary }]}>ביטול</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.reportActionBtn, styles.reportSubmitBtn, { backgroundColor: theme.primary }]}
                                onPress={submitReport}
                                disabled={submittingReport || !reportReason.trim()}
                            >
                                {submittingReport ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.reportActionText, { color: '#fff' }]}>שליחה</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        // paddingBottom handled dynamically
    },
    topNav: {
        position: 'absolute',
        top: 54,
        left: 20,
        right: 20,
        zIndex: 100
    },
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 0,
    },

    // Hero
    heroContainer: {
        height: 360,
        width: '100%',
        position: 'relative',
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
    },
    heroVideo: {
        ...StyleSheet.absoluteFillObject
    },
    heroContent: {
        alignItems: 'center',
        marginBottom: 28,
        zIndex: 10,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    avatarWrapper: {
        borderRadius: 50,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 0,
    },
    profileAvatar: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: '#fff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 2,
        right: -2,
        borderRadius: 14,
        padding: 4,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 0,
    },
    heroName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginTop: 14,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
        letterSpacing: -0.5,
    },
    ratingTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        marginTop: 10,
        gap: 6,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 0,
    },
    ratingText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    playFullBtn: {
        position: 'absolute',
        top: '35%',
        alignItems: 'center'
    },
    playText: {
        color: '#fff',
        fontWeight: '600',
        marginTop: 4,
        fontSize: 13,
    },

    // Stats - Premium Design
    trustRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-evenly',
        paddingVertical: 18,
        overflow: 'hidden',
    },
    trustItem: {
        alignItems: 'center',
        gap: 2,
    },
    trustValue: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    trustLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        width: StyleSheet.hairlineWidth,
        height: 40,
    },

    // Sections
    section: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
        textAlign: 'right',
        opacity: 0.5,
    },
    bioText: {
        fontSize: 15,
        lineHeight: 23,
        textAlign: 'right',
    },
    galleryScroll: {
        marginTop: 16,
        flexDirection: 'row-reverse'
    },
    galleryImg: {
        width: 110,
        height: 110,
        borderRadius: 14,
        marginLeft: 10
    },

    // Reviews
    reviewCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 0,
    },
    reviewHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    reviewerName: {
        fontWeight: '700',
        color: '#1F2937',
        fontSize: 15,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    reviewRatingText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    reviewBody: {
        textAlign: 'right',
        color: '#374151',
        fontSize: 15,
        lineHeight: 22,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    emptyReviews: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyReviewsText: {
        color: '#9CA3AF',
        marginTop: 8,
        fontSize: 14,
    },
    reviewsHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    reviewStatsContainer: {
        alignItems: 'flex-end',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 0,
    },
    reviewStatsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    reviewStatsText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    reviewStatsSubtext: {
        fontSize: 14,
        fontWeight: '500',
    },
    verifiedBadgeContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    verifiedCountText: {
        fontSize: 12,
        fontWeight: '700',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden',
    },
    ratingDistribution: {
        marginTop: 12,
        marginBottom: 20,
        padding: 18,
        borderRadius: 20,
        gap: 12,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 0,
    },
    ratingBarRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    ratingBarLabelContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        width: 50,
    },
    ratingBarLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    ratingBarContainer: {
        flex: 1,
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
    },
    ratingBar: {
        height: '100%',
        borderRadius: 6,
        shadowColor: '#FBBF24',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 0,
    },
    ratingBarCount: {
        fontSize: 14,
        fontWeight: '600',
        width: 36,
        textAlign: 'left',
    },
    reviewControls: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
        gap: 12,
    },
    filterScroll: {
        flex: 1,
    },
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginLeft: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'transparent',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 0,
    },
    filterChipContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        zIndex: 1,
    },
    filterChipText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#fff',
        fontWeight: '700',
    },
    sortButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 0,
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    reviewHeaderLeft: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    reviewHeaderRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    verifiedBadgeSmall: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 0,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 0,
    },
    verifiedText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    reviewDate: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    reviewActions: {
        flexDirection: 'row-reverse',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    helpfulButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    helpfulText: {
        fontSize: 14,
        fontWeight: '600',
    },
    helpfulTextActive: {
        fontWeight: '700',
    },
    helpfulCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    sitterResponse: {
        marginTop: 14,
        padding: 16,
        borderRadius: 16,
        borderRightWidth: 4,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 0,
    },
    sitterResponseHeader: {
        marginBottom: 8,
    },
    sitterResponseTitleContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    sitterResponseTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    sitterResponseText: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'right',
        fontWeight: '400',
    },
    addResponseSection: {
        marginTop: 12,
    },
    addResponseButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
    },
    addResponseText: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '500',
    },
    responseInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#1F2937',
        minHeight: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    responseActions: {
        flexDirection: 'row-reverse',
        gap: 8,
        marginTop: 8,
    },
    cancelResponseButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cancelResponseText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    submitResponseButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#6366F1',
    },
    submitResponseText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },

    // Footer - True Sticky (Fixed at bottom during scroll)
    stickyFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    iconBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    whatsappBtn: {
        flexDirection: 'row',
        backgroundColor: '#25D366',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    whatsappText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14
    },
    bookBtn: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flex: 1,
        minWidth: 0,
    },
    bookBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        flexShrink: 1,
    },

    // Video Modal
    videoModal: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    closeVideoBtn: {
        position: 'absolute',
        top: 54,
        right: 20,
        zIndex: 10
    },
    fullVideo: {
        width: '100%',
        height: 400,
    },

    // Badge styles
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginTop: 14,
    },
    badgeWrapper: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 0,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        zIndex: 1,
    },
    badgeIcon: {
        fontSize: 15,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    // Info Grid
    infoGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    infoItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Tags
    tagsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6,
    },
    tagPill: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Social Media
    socialRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    socialChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    socialChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Options Bottom Sheet
    optionsSheetContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    optionsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    optionsModalTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionsBottomSheet: {
        paddingHorizontal: 16,
        paddingBottom: 34,
        paddingTop: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetContext: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sheetAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    sheetContextName: {
        fontSize: 13,
        fontWeight: '500',
    },
    sheetActionsCard: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 10,
    },
    sheetActionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    sheetActionIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetActionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    sheetDivider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
    },
    sheetCancelBtn: {
        borderRadius: 14,
        alignItems: 'center',
        paddingVertical: 16,
    },
    sheetCancelText: {
        fontSize: 17,
        fontWeight: '600',
    },
    // Report Modal
    reportModalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    reportFormContainer: {
        padding: 24,
    },
    reportFormLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
    },
    reportInput: {
        height: 120,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        fontSize: 15,
    },
    reportActions: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 0,
        gap: 12,
    },
    reportActionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportCancelBtn: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    reportSubmitBtn: {
        // dynamic background color
    },
    reportActionText: {
        fontSize: 16,
        fontWeight: '600',
    }
});

export default SitterProfileScreen;
