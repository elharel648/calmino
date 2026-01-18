import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getBabysitterReviews, markReviewHelpful, addSitterResponse, getReviewStats } from '../services/babysitterService';
import { Review, REVIEW_TAG_LABELS, SitterBadge, BADGE_INFO } from '../types/babysitter';
import { auth } from '../services/firebaseConfig';
import { ThumbsUp, MessageSquare, CheckCircle, Filter, ArrowUpDown } from 'lucide-react-native';
import { TextInput } from 'react-native';
import { logger } from '../utils/logger';
import { calculateSitterBadges } from '../services/babysitterService';
import BookingModal from '../components/BabySitter/BookingModal';
import { auth as firebaseAuth } from '../services/firebaseConfig';

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
                    <View style={styles.heroOverlay} />

                    <View style={styles.heroContent}>
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: sitterData.image }} style={styles.profileAvatar} />
                            <View style={styles.verifiedBadge}>
                                <MaterialIcons name="verified" size={20} color="#6366F1" />
                            </View>
                        </View>
                        <Text style={styles.heroName}>{sitterData.name || 'סיטר'}, {sitterData.age ?? ''}</Text>
                        <View style={styles.ratingTag}>
                            <Ionicons name="star" size={14} color="#FBBF24" />
                            <Text style={styles.ratingText}>{sitterData.rating ?? 0} ({sitterData.reviews ?? 0} ביקורות)</Text>
                        </View>
                        {/* Badges */}
                        {badges.length > 0 && (
                            <View style={styles.badgesContainer}>
                                {badges.map((badgeType) => {
                                    const badge = BADGE_INFO[badgeType];
                                    return (
                                        <View key={badgeType} style={[styles.badge, { backgroundColor: badge.bgColor }]}>
                                            <Text style={styles.badgeIcon}>{badge.icon}</Text>
                                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
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

                {/* Stats Row - Distance only (real data) */}
                <View style={styles.trustRow}>
                    <View style={styles.trustItem}>
                        <Text style={styles.trustValue}>{sitterData.distance ?? 0} ק"מ</Text>
                        <Text style={styles.trustLabel}>מרחק ממך</Text>
                    </View>
                    {(sitterData.reviews ?? 0) > 0 && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.trustItem}>
                                <Text style={styles.trustValue}>{sitterData.reviews ?? 0}</Text>
                                <Text style={styles.trustLabel}>ביקורות</Text>
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
                        <Text style={styles.sectionTitle}>מה ההורים אומרים</Text>
                        {reviewStats && (
                            <View style={styles.reviewStatsContainer}>
                                <Text style={styles.reviewStatsText}>
                                    {reviewStats.average.toFixed(1)} ⭐ ({reviewStats.total} ביקורות)
                                </Text>
                                {reviewStats.verifiedCount > 0 && (
                                    <Text style={styles.verifiedCountText}>
                                        {reviewStats.verifiedCount} מאומתות
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Rating Distribution */}
                    {reviewStats && reviewStats.total > 0 && (
                        <View style={styles.ratingDistribution}>
                            {[5, 4, 3, 2, 1].reverse().map(rating => {
                                const count = reviewStats.distribution[rating] || 0;
                                const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
                                return (
                                    <View key={rating} style={styles.ratingBarRow}>
                                        <Text style={styles.ratingBarLabel}>{rating} ⭐</Text>
                                        <View style={styles.ratingBarContainer}>
                                            <View style={[styles.ratingBar, { width: `${percentage}%` }]} />
                                        </View>
                                        <Text style={styles.ratingBarCount}>{count}</Text>
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
                                >
                                    <Text style={[styles.filterChipText, reviewFilter === 'all' && styles.filterChipTextActive]}>הכל</Text>
                                </TouchableOpacity>
                                {[5, 4, 3, 2, 1].map(rating => (
                                    <TouchableOpacity
                                        key={rating}
                                        style={[styles.filterChip, reviewFilter === String(rating) && styles.filterChipActive]}
                                        onPress={() => setReviewFilter(String(rating) as any)}
                                    >
                                        <Text style={[styles.filterChipText, reviewFilter === String(rating) && styles.filterChipTextActive]}>
                                            {rating} ⭐
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity
                                style={styles.sortButton}
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
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewHeaderLeft}>
                                        <Text style={styles.reviewerName}>{review.parentName || 'הורה'}</Text>
                                        {review.isVerified && (
                                            <View style={styles.verifiedBadgeSmall}>
                                                <CheckCircle size={12} color="#10B981" />
                                                <Text style={styles.verifiedText}>מאומת</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.reviewHeaderRight}>
                                        <View style={styles.reviewRating}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Ionicons
                                                    key={star}
                                                    name={star <= review.rating ? "star" : "star-outline"}
                                                    size={14}
                                                    color="#FBBF24"
                                                />
                                            ))}
                                        </View>
                                        <Text style={styles.reviewDate}>
                                            {review.createdAt?.toDate?.()?.toLocaleDateString('he-IL') || ''}
                                        </Text>
                                    </View>
                                </View>

                                {review.text && <Text style={styles.reviewBody}>"{review.text}"</Text>}

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

                                {/* Tags */}
                                {review.tags && review.tags.length > 0 && (
                                    <View style={styles.reviewTags}>
                                        {review.tags.map((tag, idx) => (
                                            <View key={idx} style={styles.reviewTag}>
                                                <Text style={styles.reviewTagText}>{REVIEW_TAG_LABELS[tag] || tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Review Actions */}
                                <View style={styles.reviewActions}>
                                    <TouchableOpacity
                                        style={styles.helpfulButton}
                                        onPress={() => handleMarkHelpful(review.id)}
                                    >
                                        <ThumbsUp
                                            size={14}
                                            color={currentUserId && review.helpfulBy?.includes(currentUserId) ? "#10B981" : "#9CA3AF"}
                                            fill={currentUserId && review.helpfulBy?.includes(currentUserId) ? "#10B981" : "none"}
                                        />
                                        <Text style={[
                                            styles.helpfulText,
                                            currentUserId && review.helpfulBy?.includes(currentUserId) && styles.helpfulTextActive
                                        ]}>
                                            מועיל
                                        </Text>
                                        {review.helpfulCount != null && review.helpfulCount > 0 ? (
                                            <Text style={styles.helpfulCount}>({review.helpfulCount})</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                </View>

                                {/* Sitter Response */}
                                {review.sitterResponse && (
                                    <View style={styles.sitterResponse}>
                                        <View style={styles.sitterResponseHeader}>
                                            <Text style={styles.sitterResponseTitle}>תגובת הסיטר:</Text>
                                        </View>
                                        <Text style={styles.sitterResponseText}>{review.sitterResponse.text}</Text>
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
        height: 340,
        width: '100%',
        position: 'relative',
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    heroVideo: {
        ...StyleSheet.absoluteFillObject
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)'
    },
    heroContent: {
        alignItems: 'center',
        marginBottom: 24
    },
    avatarContainer: {
        position: 'relative',
    },
    profileAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff'
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: -4,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
    },
    heroName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginTop: 12
    },
    ratingTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
        gap: 4
    },
    ratingText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13
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

    // Stats
    trustRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-evenly',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    trustItem: {
        alignItems: 'center'
    },
    trustValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937'
    },
    trustLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 32,
        backgroundColor: '#E5E7EB'
    },

    // Sections
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'right'
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
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10
    },
    reviewHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewerName: {
        fontWeight: '600',
        color: '#1F2937',
        fontSize: 14,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    reviewRatingText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    reviewBody: {
        textAlign: 'right',
        color: '#4B5563',
        fontSize: 14,
        fontStyle: 'italic',
        lineHeight: 22,
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
        alignItems: 'center',
        marginBottom: 12,
    },
    reviewStatsContainer: {
        alignItems: 'flex-end',
        gap: 4,
    },
    reviewStatsText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    verifiedCountText: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '500',
    },
    ratingDistribution: {
        marginTop: 12,
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        gap: 8,
    },
    ratingBarRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    ratingBarLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
        width: 40,
    },
    ratingBarContainer: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    ratingBar: {
        height: '100%',
        backgroundColor: '#FBBF24',
        borderRadius: 4,
    },
    ratingBarCount: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
        width: 30,
        textAlign: 'left',
    },
    reviewControls: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    filterScroll: {
        flex: 1,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        marginLeft: 8,
    },
    filterChipActive: {
        backgroundColor: '#6366F1',
    },
    filterChipText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    sortButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#EEF2FF',
    },
    sortButtonText: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '600',
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
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    verifiedText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '600',
    },
    reviewDate: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    reviewTags: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    reviewTag: {
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    reviewTagText: {
        fontSize: 11,
        color: '#6366F1',
        fontWeight: '500',
    },
    reviewActions: {
        flexDirection: 'row-reverse',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    helpfulButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    helpfulText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    helpfulTextActive: {
        color: '#10B981',
    },
    helpfulCount: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    sitterResponse: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        borderRightWidth: 3,
        borderRightColor: '#10B981',
    },
    sitterResponseHeader: {
        marginBottom: 6,
    },
    sitterResponseTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    sitterResponseText: {
        fontSize: 14,
        color: '#1F2937',
        lineHeight: 20,
        textAlign: 'right',
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
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    badge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    badgeIcon: {
        fontSize: 14,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default SitterProfileScreen;
