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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/firebaseConfig';
import { getBabysitterReviews, getReviewStats } from '../services/babysitterService';
import * as Haptics from 'expo-haptics';
import { logger } from '../utils/logger';

interface Review {
    id: string;
    parentName: string;
    parentPhoto: string | null;
    rating: number;
    comment?: string; // Optional - may not exist
    createdAt: Date;
    isVerified: boolean;
}

export default function MyReviewsScreen({ navigation }: any) {
    const { theme, isDarkMode } = useTheme();
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

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.textPrimary} />
            </View>
        );
    }

    const Header = () => (
        <View style={[styles.header, {
            paddingTop: insets.top + 8,
            backgroundColor: isDarkMode ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
                <ChevronRight size={22} color={theme.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הביקורות שלי</Text>
            <View style={{ width: 36 }} />
        </View>
    );

    // Empty State
    if (reviews.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Premium Gradient Background */}
                <LinearGradient
                    colors={isDarkMode
                        ? [theme.background, '#1a1a2e', theme.background]
                        : ['#FFFFFF', '#FFFFFF', '#FFFFFF']
                    }
                    style={StyleSheet.absoluteFill}
                />

                <Header />
                <ScrollView contentContainerStyle={styles.emptyContainer}>
                    {/* Premium Empty State - New Black Aesthetic */}
                    <View style={[styles.emptyCard, {
                        backgroundColor: isDarkMode ? 'rgba(28, 28, 30, 0.6)' : 'rgba(255, 255, 255, 0.9)',
                        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        borderWidth: 1,
                    }]}>
                        {/* Glass Gradient Overlay */}
                        <LinearGradient
                            colors={isDarkMode
                                ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
                                : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={[styles.emptyIconContainer, {
                            backgroundColor: isDarkMode ? '#FFF' : '#000',
                            shadowColor: isDarkMode ? '#FFF' : '#000',
                            shadowOpacity: 0.15,
                            shadowRadius: 20,
                            elevation: 10,
                        }]}>
                            <Star size={44} color={isDarkMode ? '#000' : '#FFF'} fill={isDarkMode ? '#000' : '#FFF'} strokeWidth={0} />
                        </View>

                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                            עדיין אין ביקורות
                        </Text>

                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                            התחל לאסוף המלצות מהורים מרוצים וצפה בדירוג שלך עולה!
                        </Text>

                        {/* Tips Cards - Monochromatic */}
                        <View style={styles.tipsContainer}>
                            <View style={[styles.tipCardGlass, {
                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                borderWidth: 1,
                            }]}>
                                <Award size={18} color={theme.textPrimary} strokeWidth={1.5} />
                                <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                                    השלם הזמנות בהצלחה
                                </Text>
                            </View>
                            <View style={[styles.tipCardGlass, {
                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                borderWidth: 1,
                            }]}>
                                <ThumbsUp size={18} color={theme.textPrimary} strokeWidth={1.5} />
                                <Text style={[styles.tipText, { color: theme.textPrimary }]}>
                                    תן שירות מעולה
                                </Text>
                            </View>
                            <View style={[styles.tipCardGlass, {
                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                borderWidth: 1,
                            }]}>
                                <TrendingUp size={18} color={theme.textPrimary} strokeWidth={1.5} />
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
            <Header />
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

                            {/* Text comment - Only show if: verified, 5 stars, and text exists */}
                            {review.comment &&
                                review.isVerified &&
                                review.rating === 5 && (
                                    <Text style={[styles.reviewComment, { color: theme.textSecondary }]} numberOfLines={3}>
                                        {review.comment}
                                    </Text>
                                )}

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        zIndex: 10,
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
        fontWeight: '700',
        letterSpacing: -0.3,
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
    tipCardGlass: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 8,
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
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    reviewName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'right',
        writingDirection: 'rtl',
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
        marginTop: 8,
        marginBottom: 8,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    reviewDate: {
        fontSize: 12,
    },
});
