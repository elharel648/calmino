// pages/MyReviewsScreen.tsx - Minimalist Reviews Screen for Sitters
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Star, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/firebaseConfig';
import { getBabysitterReviews, getReviewStats } from '../services/babysitterService';
import * as Haptics from 'expo-haptics';
import { logger } from '../utils/logger';
import { useLanguage } from '../context/LanguageContext';

interface Review {
    id: string;
    parentName: string;
    parentPhoto: string | null;
    rating: number;
    comment?: string;
    text?: string;
    createdAt: any;
    isVerified: boolean;
}

export default function MyReviewsScreen({ navigation }: any) {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const [reviewsData, statsData] = await Promise.all([
                getBabysitterReviews(userId),
                getReviewStats(userId),
            ]);

            setReviews(reviewsData as any);
            setStats(statsData);
        } catch (error) {
            logger.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (createdAt: any): string => {
        try {
            const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
            return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return '';
        }
    };

    const renderStars = (rating: number, size = 13) => (
        <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    size={size}
                    color="#FBBF24"
                    fill={i <= rating ? '#FBBF24' : 'transparent'}
                    strokeWidth={1.5}
                />
            ))}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.textSecondary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, {
                paddingTop: insets.top + 8,
                backgroundColor: theme.card,
                borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            }]}>
                <TouchableOpacity
                    style={[styles.backBtn, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    }]}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    activeOpacity={0.7}
                >
                    <ChevronRight size={20} color={theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('sitterDash.myReviews')}</Text>
                <View style={{ width: 36 }} />
            </View>

            {reviews.length === 0 ? (
                /* Empty State */
                <View style={styles.centered}>
                    <View style={[styles.emptyIconWrap, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    }]}>
                        <Star size={32} color={theme.textSecondary} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('sitterDash.noReviewsYet')}</Text>
                    <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                        {t('rating.thankYouMessage')}
                    </Text>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Stats Row */}
                    {stats && (
                        <View style={[styles.statsCard, {
                            backgroundColor: theme.card,
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                        }]}>
                            <View style={styles.statsItem}>
                                <Text style={[styles.statsValue, { color: theme.textPrimary }]}>
                                    {stats.average?.toFixed(1) || '0.0'}
                                </Text>
                                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>{t('babysitter.sortByRating')}</Text>
                            </View>
                            <View style={[styles.statsDivider, { backgroundColor: theme.divider }]} />
                            <View style={styles.statsItem}>
                                {renderStars(Math.round(stats.average || 0), 16)}
                                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>{stats.total} {t('sitterDash.reviews')}</Text>
                            </View>
                            <View style={[styles.statsDivider, { backgroundColor: theme.divider }]} />
                            <View style={styles.statsItem}>
                                <Text style={[styles.statsValue, { color: theme.textPrimary }]}>
                                    {stats.verifiedCount || 0}
                                </Text>
                                <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>{t('rating.verified')}</Text>
                            </View>
                        </View>
                    )}

                    {/* Reviews */}
                    {reviews.map((review, index) => {
                        const comment = review.comment || review.text;
                        return (
                            <View
                                key={review.id}
                                style={[styles.reviewCard, {
                                    backgroundColor: theme.card,
                                    borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                                    marginTop: index === 0 ? 0 : 10,
                                }]}
                            >
                                <View style={styles.reviewTop}>
                                    <View style={styles.reviewMeta}>
                                        {renderStars(review.rating)}
                                        <Text style={[styles.reviewDate, { color: theme.textSecondary }]}>
                                            {formatDate(review.createdAt)}
                                        </Text>
                                    </View>
                                    <View style={styles.reviewNameRow}>
                                        <Text style={[styles.reviewName, { color: theme.textPrimary }]}>
                                            {review.parentName || t('babysitter.parent')}
                                        </Text>
                                        {review.isVerified && (
                                            <View style={[styles.verifiedDot, { backgroundColor: '#10B981' }]} />
                                        )}
                                    </View>
                                </View>

                                {!!comment && (
                                    <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>
                                        {comment}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    // Empty
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    // Scroll
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
        gap: 10,
    },
    // Stats
    statsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    statsItem: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    statsValue: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    statsLabel: {
        fontSize: 12,
        fontWeight: '400',
    },
    statsDivider: {
        width: StyleSheet.hairlineWidth,
        height: 36,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    // Review cards
    reviewCard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
    },
    reviewTop: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    reviewNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    reviewName: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
    },
    verifiedDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    reviewMeta: {
        alignItems: 'flex-end',
        gap: 4,
    },
    reviewDate: {
        fontSize: 12,
        fontWeight: '400',
    },
    reviewComment: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 10,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
