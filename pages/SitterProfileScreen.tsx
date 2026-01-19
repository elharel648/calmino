import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getBabysitterReviews, markReviewHelpful, addSitterResponse, getReviewStats } from '../services/babysitterService';
import { Review, REVIEW_TAG_LABELS, SitterBadge, BADGE_INFO } from '../types/babysitter';
import { auth } from '../services/firebaseConfig';
import { ThumbsUp, MessageSquare, CheckCircle, Filter, ArrowUpDown, Star } from 'lucide-react-native';
import { TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { logger } from '../utils/logger';
import { calculateSitterBadges } from '../services/babysitterService';
import BookingModal from '../components/BabySitter/BookingModal';
import { auth as firebaseAuth } from '../services/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

interface SitterData {
    id: string;
    name: string;
    age: number;
    image: string;
    rating: number;
    reviews: number;
    reviewsList?: Review[];
    price: number;
    distance: number;
    phone?: string;
    bio?: string;
    videoUri?: string;
}

type RootStackParamList = {
    SitterProfile: { sitterData: SitterData };
    ChatScreen: { sitterName: string; sitterImage: string; sitterId: string };
};

type SitterProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'SitterProfile'>;

const SitterProfileScreen = ({ route, navigation }: SitterProfileScreenProps) => {
    const { sitterData } = route.params || {};
    const { theme, isDarkMode } = useTheme();
    const [showFullVideo, setShowFullVideo] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);

    // Check if sitter has a real video (not from database yet, so hide video feature for now)
    const hasVideo = false; // TODO: Set to true when sitter.videoUri is available from Firebase

    if (!sitterData) return null;

    const hasPhone = Boolean(sitterData.phone && sitterData.phone.trim());

    const handleCall = () => {
        if (hasPhone) {
            Linking.openURL(`tel:${sitterData.phone}`);
        } else {
            Alert.alert('שים לב', 'מספר טלפון לא זמין. נסה ליצור קשר בצ׳אט.');
        }
    };

    const handleWhatsApp = () => {
        if (!hasPhone) {
            Alert.alert('שים לב', 'מספר טלפון לא זמין. נסה ליצור קשר בצ׳אט.');
            return;
        }
        const cleanPhone = sitterData.phone!.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone;
        const message = `היי ${sitterData.name}, הגעתי דרך CalmParent, אשמח לשמוע פרטים :)`;
        const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => Alert.alert('שגיאה', 'ואצאפ לא מותקן'));
    };

    const handleChat = () => {
        navigation.navigate('ChatScreen', {
            sitterName: sitterData.name,
            sitterImage: sitterData.image,
            sitterId: sitterData.id,
        });
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

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                console.log('🔍 Fetching reviews for sitter:', sitterData.id);
                const reviews = await getBabysitterReviews(sitterData.id);
                console.log('📊 Found reviews:', reviews.length, reviews);
                const stats = await getReviewStats(sitterData.id);
                console.log('📈 Review stats:', stats);
                setReviewStats(stats);
                setReviewsList(reviews);
            } catch (error) {
                console.error('❌ Could not fetch reviews:', error);
                logger.error('Could not fetch reviews:', error);
            } finally {
                setLoadingReviews(false);
            }
        };

        const fetchBadges = async () => {
            try {
                const calculatedBadges = await calculateSitterBadges(sitterData.id, {
                    rating: sitterData.rating,
                    reviewCount: sitterData.reviews,
                    isAvailable: false, // TODO: Get from sitter data
                    createdAt: undefined, // TODO: Get from sitter data
                });
                setBadges(calculatedBadges);
            } catch (error) {
                logger.error('Could not fetch badges:', error);
            }
        };

        if (sitterData.id && !sitterData.id.startsWith('mock_')) {
            fetchReviews();
            fetchBadges();
        } else {
            // Mock data - don't fetch
            setLoadingReviews(false);
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

    const isCurrentUserSitter = auth.currentUser?.uid === sitterData.id;
    const currentUserId = auth.currentUser?.uid;

    return (
        <View style={styles.container}>
            {/* Back button */}
            <View style={styles.topNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-forward" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Hero Section - Static image or video */}
                <View style={styles.heroContainer}>
                    {hasVideo && sitterData.videoUri ? (
                        <Video
                            style={styles.heroVideo}
                            source={{ uri: sitterData.videoUri }}
                            resizeMode={ResizeMode.COVER}
                            isLooping
                            shouldPlay
                            isMuted
                        />
                    ) : (
                        <>
                            {imageLoading && !imageError && (
                                <View style={[styles.heroVideo, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                                    <ActivityIndicator size="large" color="#6366F1" />
                                </View>
                            )}
                            {!imageError ? (
                                <Image
                                    source={{ uri: sitterData.image }}
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
                    <View style={styles.heroOverlay} />

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
                            <View style={styles.verifiedBadge}>
                                <LinearGradient
                                    colors={['#6366F1', '#8B5CF6']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <MaterialIcons name="verified" size={18} color="#fff" />
                            </View>
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
                            <Text style={styles.ratingText}>{sitterData.rating ?? 0} ({sitterData.reviews ?? 0} ביקורות)</Text>
                        </View>
                        {/* Badges - Premium Design */}
                        {badges.length > 0 && (
                            <View style={styles.badgesContainer}>
                                {badges.map((badgeType) => {
                                    const badge = BADGE_INFO[badgeType];
                                    return (
                                        <View key={badgeType} style={styles.badgeWrapper}>
                                            {Platform.OS === 'ios' && (
                                                <BlurView
                                                    intensity={30}
                                                    tint="dark"
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            )}
                                            <LinearGradient
                                                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                            <View style={[styles.badge, { backgroundColor: badge.bgColor + 'CC' }]}>
                                                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                                                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                                            </View>
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

                {/* Stats Row - Premium Design */}
                <View style={[styles.trustRow, { 
                    backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                    borderBottomColor: theme.border 
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
                            : ['#FFFFFF', '#FAFAFA']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.trustItem, { zIndex: 1 }]}>
                        <Text style={[styles.trustValue, { color: theme.textPrimary }]}>{sitterData.distance ?? 0} ק"מ</Text>
                        <Text style={[styles.trustLabel, { color: theme.textSecondary }]}>מרחק ממך</Text>
                    </View>
                    {(sitterData.reviews ?? 0) > 0 && (
                        <>
                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                            <View style={[styles.trustItem, { zIndex: 1 }]}>
                                <Text style={[styles.trustValue, { color: theme.textPrimary }]}>{sitterData.reviews ?? 0}</Text>
                                <Text style={[styles.trustLabel, { color: theme.textSecondary }]}>ביקורות</Text>
                            </View>
                        </>
                    )}
                </View>

                {/* About - only if bio exists */}
                {sitterData.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>קצת עליי</Text>
                        <Text style={styles.bioText}>{sitterData.bio}</Text>
                    </View>
                )}

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
                                            <CheckCircle size={12} color="#10B981" strokeWidth={2.5} />
                                            <Text style={styles.verifiedCountText}>
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
                                    style={[styles.filterChip, reviewFilter === 'all' && styles.filterChipActive]}
                                    onPress={() => setReviewFilter('all')}
                                    activeOpacity={0.7}
                                >
                                    {reviewFilter === 'all' && (
                                        <LinearGradient
                                            colors={['#6366F1', '#8B5CF6']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <Text style={[styles.filterChipText, reviewFilter === 'all' && styles.filterChipTextActive]}>הכל</Text>
                                </TouchableOpacity>
                                {[5, 4, 3, 2, 1].map(rating => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[styles.filterChip, reviewFilter === String(rating) && styles.filterChipActive]}
                                        onPress={() => setReviewFilter(String(rating) as any)}
                                        activeOpacity={0.7}
                                    >
                                        {reviewFilter === String(rating) && (
                                            <LinearGradient
                                                colors={['#6366F1', '#8B5CF6']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        )}
                                        <View style={styles.filterChipContent}>
                                            <Star size={14} color={reviewFilter === String(rating) ? '#fff' : '#6B7280'} fill={reviewFilter === String(rating) ? '#fff' : 'transparent'} strokeWidth={1.5} />
                                            <Text style={[styles.filterChipText, reviewFilter === String(rating) && styles.filterChipTextActive]}>
                                                {rating}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={[styles.sortButton, { 
                                    backgroundColor: isDarkMode ? theme.card : '#EEF2FF',
                                    borderColor: isDarkMode ? theme.border : '#C7D2FE'
                                }]}
                                activeOpacity={0.7}
                                onPress={() => {
                                    const options = ['newest', 'helpful', 'highest'];
                                    const currentIndex = options.indexOf(reviewSort);
                                    setReviewSort(options[(currentIndex + 1) % options.length] as any);
                                }}
                            >
                                <ArrowUpDown size={16} color="#6366F1" />
                                <Text style={styles.sortButtonText}>
                                    {reviewSort === 'newest' ? 'חדשות' : reviewSort === 'helpful' ? 'מועילות' : 'גבוהות'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {loadingReviews ? (
                        <View style={styles.emptyReviews}>
                            <ActivityIndicator size="small" color="#6366F1" />
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
                                            <View style={styles.verifiedBadgeSmall}>
                                                <LinearGradient
                                                    colors={['#10B981', '#059669']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                <CheckCircle size={12} color="#fff" strokeWidth={2.5} />
                                                <Text style={styles.verifiedText}>מאומת</Text>
                                            </View>
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

                                {review.text && (
                                    <Text style={[styles.reviewBody, { color: theme.textPrimary }]}>"{review.text}"</Text>
                                )}

                                {/* Category Ratings */}
                                {review.categoryRatings && (
                                    <View style={styles.categoryRatingsContainer}>
                                        {review.categoryRatings.reliability && (
                                            <View style={styles.categoryRatingItem}>
                                                <Text style={styles.categoryRatingLabel}>אמינות:</Text>
                                                <View style={styles.categoryRatingStars}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Ionicons
                                                            key={star}
                                                            name={star <= review.categoryRatings!.reliability! ? "star" : "star-outline"}
                                                            size={12}
                                                            color="#FBBF24"
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                        {review.categoryRatings.professionalism && (
                                            <View style={styles.categoryRatingItem}>
                                                <Text style={styles.categoryRatingLabel}>מקצועיות:</Text>
                                                <View style={styles.categoryRatingStars}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Ionicons
                                                            key={star}
                                                            name={star <= review.categoryRatings!.professionalism! ? "star" : "star-outline"}
                                                            size={12}
                                                            color="#FBBF24"
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                        {review.categoryRatings.kidsInteraction && (
                                            <View style={styles.categoryRatingItem}>
                                                <Text style={styles.categoryRatingLabel}>יחס לילדים:</Text>
                                                <View style={styles.categoryRatingStars}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Ionicons
                                                            key={star}
                                                            name={star <= review.categoryRatings!.kidsInteraction! ? "star" : "star-outline"}
                                                            size={12}
                                                            color="#FBBF24"
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                        {review.categoryRatings.cleanliness && (
                                            <View style={styles.categoryRatingItem}>
                                                <Text style={styles.categoryRatingLabel}>נקיון:</Text>
                                                <View style={styles.categoryRatingStars}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Ionicons
                                                            key={star}
                                                            name={star <= review.categoryRatings!.cleanliness! ? "star" : "star-outline"}
                                                            size={12}
                                                            color="#FBBF24"
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Tags - Premium Design */}
                                {review.tags && review.tags.length > 0 && (
                                    <View style={[styles.reviewTags, { zIndex: 1 }]}>
                                        {review.tags.map((tag, idx) => (
                                            <View key={idx} style={styles.reviewTag}>
                                                <LinearGradient
                                                    colors={['#EEF2FF', '#E0E7FF']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                                <Text style={[styles.reviewTagText, { color: '#6366F1' }]}>{REVIEW_TAG_LABELS[tag] || tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Review Actions - Premium Design */}
                                <View style={[styles.reviewActions, { 
                                    borderTopColor: theme.border,
                                    zIndex: 1 
                                }]}>
                                    <TouchableOpacity
                                        style={styles.helpfulButton}
                                        onPress={() => handleMarkHelpful(review.id)}
                                        activeOpacity={0.7}
                                    >
                                        <ThumbsUp
                                            size={16}
                                            color={currentUserId && review.helpfulBy?.includes(currentUserId) ? "#10B981" : theme.textSecondary}
                                            fill={currentUserId && review.helpfulBy?.includes(currentUserId) ? "#10B981" : "none"}
                                            strokeWidth={2}
                                        />
                                        <Text style={[
                                            styles.helpfulText,
                                            { color: currentUserId && review.helpfulBy?.includes(currentUserId) ? "#10B981" : theme.textSecondary },
                                            currentUserId && review.helpfulBy?.includes(currentUserId) && styles.helpfulTextActive
                                        ]}>
                                            מועיל
                                        </Text>
                                        {review.helpfulCount != null && review.helpfulCount > 0 ? (
                                            <Text style={[styles.helpfulCount, { color: theme.textSecondary }]}>({review.helpfulCount})</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                </View>

                                {/* Sitter Response - Premium Design */}
                                {review.sitterResponse && (
                                    <View style={[styles.sitterResponse, { 
                                        backgroundColor: isDarkMode ? theme.success + '20' : '#F0FDF4',
                                        borderRightColor: theme.success,
                                        zIndex: 1 
                                    }]}>
                                        {Platform.OS === 'ios' && (
                                            <BlurView
                                                intensity={10}
                                                tint={isDarkMode ? 'dark' : 'light'}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        )}
                                        <LinearGradient
                                            colors={isDarkMode 
                                                ? [theme.success + '30', theme.success + '15']
                                                : ['#F0FDF4', '#ECFDF5']
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <View style={styles.sitterResponseHeader}>
                                            <View style={styles.sitterResponseTitleContainer}>
                                                <CheckCircle size={14} color={theme.success} strokeWidth={2.5} />
                                                <Text style={[styles.sitterResponseTitle, { color: theme.success }]}>תגובת הסיטר:</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.sitterResponseText, { color: theme.textPrimary }]}>{review.sitterResponse.text}</Text>
                                    </View>
                                )}

                                {/* Add Response (only for sitter) */}
                                {isCurrentUserSitter && !review.sitterResponse && (
                                    <View style={styles.addResponseSection}>
                                        {respondingToReview === review.id ? (
                                            <View>
                                                <TextInput
                                                    style={styles.responseInput}
                                                    placeholder="הגב על הביקורת..."
                                                    value={responseText}
                                                    onChangeText={setResponseText}
                                                    multiline
                                                    textAlign="right"
                                                />
                                                <View style={styles.responseActions}>
                                                    <TouchableOpacity
                                                        style={styles.cancelResponseButton}
                                                        onPress={() => {
                                                            setRespondingToReview(null);
                                                            setResponseText('');
                                                        }}
                                                    >
                                                        <Text style={styles.cancelResponseText}>ביטול</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.submitResponseButton}
                                                        onPress={() => handleSubmitResponse(review.id)}
                                                    >
                                                        <Text style={styles.submitResponseText}>שלח</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.addResponseButton}
                                                onPress={() => setRespondingToReview(review.id)}
                                            >
                                                <MessageSquare size={14} color="#6366F1" />
                                                <Text style={styles.addResponseText}>הגב על הביקורת</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
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
            <View style={styles.stickyFooter}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>מחיר לשעה</Text>
                    <Text style={styles.priceValue}>₪{sitterData.price}</Text>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                        <Ionicons name="call" size={20} color="#6366F1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={handleChat}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#6366F1" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => setBookingModalVisible(true)}
                    >
                        <Ionicons name="calendar" size={18} color="#fff" />
                        <Text style={styles.bookBtnText}>הזמן עכשיו</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Video Modal */}
            <Modal visible={showFullVideo} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.videoModal}>
                    <TouchableOpacity style={styles.closeVideoBtn} onPress={() => setShowFullVideo(false)}>
                        <Ionicons name="close-circle" size={44} color="#fff" />
                    </TouchableOpacity>
                    {sitterData.videoUri && (
                        <Video
                            style={styles.fullVideo}
                            source={{ uri: sitterData.videoUri }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={showFullVideo}
                        />
                    )}
                </View>
            </Modal>

            {/* Booking Modal */}
            <BookingModal
                visible={bookingModalVisible}
                onClose={() => setBookingModalVisible(false)}
                sitter={{
                    id: sitterData.id,
                    name: sitterData.name,
                    hourlyRate: sitterData.price,
                    image: sitterData.image,
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    scrollContent: {
        paddingBottom: 180,
    },
    topNav: {
        position: 'absolute',
        top: 54,
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
        elevation: 3,
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
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)'
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
        elevation: 8,
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
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
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
        elevation: 4,
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
        paddingVertical: 24,
        borderBottomWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    trustItem: {
        alignItems: 'center',
        gap: 4,
    },
    trustValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    trustLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    divider: {
        width: StyleSheet.hairlineWidth,
        height: 40,
    },

    // Sections
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'right',
        letterSpacing: -0.3,
    },
    bioText: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 24,
        textAlign: 'right'
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
        elevation: 4,
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
        fontStyle: 'italic',
        lineHeight: 24,
        marginTop: 4,
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
        elevation: 3,
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
        color: '#10B981',
        fontWeight: '700',
        backgroundColor: '#D1FAE5',
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
        elevation: 4,
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
        elevation: 3,
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
        elevation: 1,
    },
    filterChipActive: {
        borderColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
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
        elevation: 2,
    },
    sortButtonText: {
        fontSize: 14,
        color: '#6366F1',
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
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    verifiedText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    reviewDate: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    reviewTags: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    reviewTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    reviewTagText: {
        fontSize: 12,
        fontWeight: '600',
        zIndex: 1,
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
        elevation: 2,
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
    categoryRatingsContainer: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        gap: 8,
    },
    categoryRatingItem: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryRatingLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    categoryRatingStars: {
        flexDirection: 'row-reverse',
        gap: 2,
    },

    // Footer
    stickyFooter: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right'
    },
    priceValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'right'
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10
    },
    iconBtn: {
        width: 48,
        height: 48,
        backgroundColor: '#EEF2FF',
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
        backgroundColor: '#6366F1',
        paddingHorizontal: 20,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flex: 1,
    },
    bookBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15
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
        elevation: 5,
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
});

export default SitterProfileScreen;
