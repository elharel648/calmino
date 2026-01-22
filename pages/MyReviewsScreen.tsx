// pages/MyReviewsScreen.tsx - Dedicated Reviews Screen for Sitters
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
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ChevronRight, TrendingUp, Award, ThumbsUp } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/firebaseConfig';
import { getBabysitterReviews, getReviewStats } from '../services/babysitterService';
import * as Haptics from 'expo-haptics';

interface Review {
    id: string;
    parentName: string;
    parentPhoto: string | null;
    rating: number;
    comment: string;
    createdAt: Date;
    isVerified: boolean;
}

export default function MyReviewsScreen({ navigation }: any) {
    const { theme, isDarkMode } = useTheme();
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
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    // Empty State
    if (reviews.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Premium Gradient Background */}
                <LinearGradient
                    colors={isDarkMode
                        ? [theme.background, '#1a1a2e', theme.background]
                        : ['#FFF9E6', '#FFE5B4', '#FFF9E6']
                    }
                    style={StyleSheet.absoluteFill}
                />

                <ScrollView contentContainerStyle={styles.emptyContainer}>
                    {/* Premium Empty State */}
                    <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
                        <LinearGradient
                            colors={['#FBBF24', '#F59E0B']}
                            style={styles.emptyIconContainer}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Star size={48} color="#FFF" fill="#FFF" strokeWidth={2} />
                        </LinearGradient>

                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                            עדיין אין ביקורות
                        </Text>

                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                            התחל לאסוף המלצות מהורים מרוצים וצפה בדירוג שלך עולה!
                        </Text>

                        {/* Tips Cards */}
                        <View style={styles.tipsContainer}>
                            <View style={[styles.tipCard, { backgroundColor: theme.cardSecondary }]}>
                                <Award size={20} color="#10B981" />
                                <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                                    השלם הזמנות בהצלחה
                                </Text>
                            </View>
                            <View style={[styles.tipCard, { backgroundColor: theme.cardSecondary }]}>
                                <ThumbsUp size={20} color="#3B82F6" />
                                <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                                    תן שירות מעולה
                                </Text>
                            </View>
                            <View style={[styles.tipCard, { backgroundColor: theme.cardSecondary }]}>
                                <TrendingUp size={20} color="#8B5CF6" />
                                <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                                    בקש המלצה
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Has Reviews
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView>
                {/* Stats Header */}
                <LinearGradient
                    colors={['#FBBF24', '#F59E0B']}
                    style={styles.statsHeader}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats?.average?.toFixed(1) || '0.0'}</Text>
                            <Text style={styles.statLabel}>דירוג ממוצע</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats?.total || 0}</Text>
                            <Text style={styles.statLabel}>סה"כ ביקורות</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats?.verifiedCount || 0}</Text>
                            <Text style={styles.statLabel}>מאומתות</Text>
                        </View>
                    </View>

                    {/* Stars Display */}
                    <View style={styles.starsContainer}>
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                size={20}
                                color="#FFF"
                                fill={i < Math.round(stats?.average || 0) ? "#FFF" : "none"}
                                strokeWidth={2}
                            />
                        ))}
                    </View>
                </LinearGradient>

                {/* Reviews List */}
                <View style={styles.reviewsList}>
                    {reviews.map((review) => (
                        <TouchableOpacity
                            key={review.id}
                            style={[styles.reviewCard, { backgroundColor: theme.card }]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <View style={styles.reviewHeader}>
                                <View>
                                    <Text style={[styles.reviewName, { color: theme.textPrimary }]}>
                                        {review.parentName}
                                    </Text>
                                    <View style={styles.reviewStars}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={14}
                                                color="#FBBF24"
                                                fill={i < review.rating ? "#FBBF24" : "none"}
                                                strokeWidth={1.5}
                                            />
                                        ))}
                                    </View>
                                </View>
                                {review.isVerified && (
                                    <View style={styles.verifiedBadge}>
                                        <Text style={styles.verifiedText}>✓ מאומת</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.reviewComment, { color: theme.textSecondary }]} numberOfLines={3}>
                                {review.comment}
                            </Text>

                            <Text style={[styles.reviewDate, { color: theme.textSecondary }]}>
                                {new Date(review.createdAt).toLocaleDateString('he-IL')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyCard: {
        width: '100%',
        maxWidth: 400,
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
    },
    emptyIconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    tipsContainer: {
        width: '100%',
        gap: 12,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    tipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statsHeader: {
        padding: 24,
        paddingTop: 60,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 12,
        color: '#FFF',
        opacity: 0.9,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#FFF',
        opacity: 0.3,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    reviewsList: {
        padding: 16,
        gap: 12,
    },
    reviewCard: {
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    reviewName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    reviewStars: {
        flexDirection: 'row',
        gap: 2,
    },
    verifiedBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    verifiedText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
    },
    reviewComment: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    reviewDate: {
        fontSize: 12,
    },
});
