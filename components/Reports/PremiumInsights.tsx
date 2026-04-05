import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import {
    Moon,
    Utensils,
    Layers,
    TrendingUp,
    TrendingDown,
    Lightbulb,
    Clock,
    Calendar,
    Award,
    Target,
    Zap,
    Heart,
    Share2,
    Sparkles,
    type LucideIcon,
} from 'lucide-react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

// =====================================================
// TYPES
// =====================================================

interface DailyStats {
    food: number;
    foodCount: number;
    sleep: number;
    sleepCount: number;
    diapers: number;
    supplements: number;
    feedingTypes: { bottle: number; breast: number; pumping: number; solids: number };
}

interface TimeInsights {
    longestSleep: number;
    biggestFeeding: number;
    bestSleepDay: string;
    avgFeedingInterval: number;
    avgSleepTime: string;
}

interface WeeklyData {
    labels: string[];
    sleep: number[];
    food: number[];
    diapers: number[];
}

interface InsightData {
    dailyStats: DailyStats;
    timeInsights: TimeInsights | null;
    weeklyData: WeeklyData;
    prevWeekStats: DailyStats | null;
    childName?: string;
}

// =====================================================
// PREMIUM INSIGHT CARD
// =====================================================

interface PremiumInsightCardProps {
    icon: LucideIcon;
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    delay?: number;
}

export const PremiumInsightCard: React.FC<PremiumInsightCardProps> = ({
    icon: Icon,
    title,
    value,
    subtitle,
    color = '#C8806A',
    trend,
    delay = 0,
}) => {
    const { t } = useLanguage();
    return (
        <Animated.View
            entering={FadeInRight.duration(400).delay(delay)}
            style={styles.premiumCard}
            collapsable={false}
        >
            <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.premiumCardOverlay} />
            <View style={styles.premiumCardBorder} />

            <View style={[styles.premiumIconWrap, { backgroundColor: `${color}15` }]}>
                <Icon size={20} color={color} strokeWidth={2} />
            </View>

            <View style={styles.premiumCardContent}>
                <Text style={styles.premiumCardTitle}>{title}</Text>
                <View style={styles.premiumValueRow}>
                    <Text style={styles.premiumCardValue}>{value}</Text>
                    {trend && trend !== 'neutral' && (
                        <View style={[
                            styles.trendBadge,
                            { backgroundColor: trend === 'up' ? '#D1FAE5' : '#FEE2E2' }
                        ]}>
                            {trend === 'up' ? (
                                <TrendingUp size={12} color="#6BAF8A" strokeWidth={2.5} />
                            ) : (
                                <TrendingDown size={12} color="#D4837A" strokeWidth={2.5} />
                            )}
                        </View>
                    )}
                </View>
                {subtitle && <Text style={styles.premiumCardSubtitle}>{subtitle}</Text>}
            </View>
        </Animated.View>
    );
};

// =====================================================
// AI TIP CARD - Smart recommendations
// =====================================================

interface AITipCardProps {
    tip: string;
    category: 'sleep' | 'feeding' | 'general';
    delay?: number;
}

export const AITipCard: React.FC<AITipCardProps> = ({ tip, category, delay = 0 }) => {
    const { t } = useLanguage();
    const categoryConfig = {
        sleep: { color: '#4A6572', icon: Moon, label: t('reports.tips.sleep') },
        feeding: { color: '#D4A373', icon: Utensils, label: t('reports.tips.feeding') },
        general: { color: '#C8806A', icon: Lightbulb, label: t('reports.tips.general') },
    };

    const config = categoryConfig[category];
    const Icon = config.icon;

    return (
        <Animated.View
            entering={FadeInUp.duration(500).delay(delay)}
            style={styles.aiTipCard}
            collapsable={false}
        >
            <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.aiTipOverlay} />
            <View style={styles.aiTipBorder} />

            <View style={styles.aiTipHeader}>
                <View style={[styles.aiTipIconWrap, { backgroundColor: `${config.color}20` }]}>
                    <Sparkles size={14} color={config.color} strokeWidth={2} />
                </View>
                <Text style={[styles.aiTipLabel, { color: config.color }]}>{config.label}</Text>
            </View>

            <View style={styles.aiTipContent}>
                <Icon size={24} color={config.color} strokeWidth={1.5} style={styles.aiTipIcon} />
                <Text style={styles.aiTipText}>{tip}</Text>
            </View>
        </Animated.View>
    );
};

// =====================================================
// MILESTONE PROGRESS CARD
// =====================================================

interface MilestoneCardProps {
    title: string;
    current: number;
    target: number;
    unit: string;
    color?: string;
    delay?: number;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
    title,
    current,
    target,
    unit,
    color = '#10B981',
    delay = 0,
}) => {
    const progress = Math.min((current / target) * 100, 100);
    const isComplete = current >= target;

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(delay)}
            style={styles.milestoneCard}
            collapsable={false}
        >
            <BlurView intensity={50} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.milestoneOverlay} />

            <View style={styles.milestoneHeader}>
                <View style={[styles.milestoneIconWrap, { backgroundColor: isComplete ? '#D1FAE5' : `${color}15` }]}>
                    {isComplete ? (
                        <Award size={18} color="#059669" strokeWidth={2} />
                    ) : (
                        <Target size={18} color={color} strokeWidth={2} />
                    )}
                </View>
                <Text style={styles.milestoneTitle}>{title}</Text>
            </View>

            <View style={styles.milestoneProgress}>
                <View style={styles.progressBarBg}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${progress}%`,
                                backgroundColor: isComplete ? '#10B981' : color,
                            },
                        ]}
                    />
                </View>
                <Text style={styles.milestoneStatus}>
                    {current}/{target} {unit}
                </Text>
            </View>

            {isComplete && (
                <View style={styles.completeTag}>
                    <Text style={styles.completeTagText}>✨ הושלם!</Text>
                </View>
            )}
        </Animated.View>
    );
};

// =====================================================
// SHARE BUTTON
// =====================================================

interface ShareButtonProps {
    dailyStats: DailyStats;
    childName?: string;
}

export const ShareSummaryButton: React.FC<ShareButtonProps> = ({ dailyStats, childName }) => {
    const { t } = useLanguage();
    const handleShare = async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        const message = `📊 סיכום יומי${childName ? ` - ${childName}` : ''}

🍼 האכלה: ${dailyStats.foodCount} פעמים (${dailyStats.food} מ"ל)
😴 שינה: ${dailyStats.sleep.toFixed(1)} שעות (${dailyStats.sleepCount} תנומות)
🧷 חיתולים: ${dailyStats.diapers}
💊 תוספים: ${dailyStats.supplements}

נשלח מאפליקציית Calmino 💜`;

        try {
            await Share.share({
                message,
                title: t('reports.share.dailySummary'),
            });
        } catch (error) {
            // Silent fail
        }
    };

    return (
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
            <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.shareButtonOverlay} />
            <Share2 size={18} color="#C8806A" strokeWidth={2} />
            <Text style={styles.shareButtonText}>{t('reports.share.summary')}</Text>
        </TouchableOpacity>
    );
};

// =====================================================
// AI INSIGHTS GENERATOR
// =====================================================

export function generateAIInsights(data: InsightData, t: (key: string) => string): {
    tips: { tip: string; category: 'sleep' | 'feeding' | 'general' }[];
    patterns: { label: string; value: string; icon: LucideIcon; color: string }[];
    milestones: { title: string; current: number; target: number; unit: string }[];
} {
    const { dailyStats, timeInsights, weeklyData, prevWeekStats } = data;
    const tips: { tip: string; category: 'sleep' | 'feeding' | 'general' }[] = [];
    const patterns: { label: string; value: string; icon: LucideIcon; color: string }[] = [];
    const milestones: { title: string; current: number; target: number; unit: string }[] = [];

    // ===== GENERATE TIPS =====

    // Sleep tips
    if (dailyStats.sleep > 0) {
        const avgSleep = dailyStats.sleep / Math.max(dailyStats.sleepCount, 1);

        if (avgSleep < 2) {
            tips.push({
                tip: t('reports.tips.shortNaps'),
                category: 'sleep',
            });
        } else if (avgSleep > 3) {
            tips.push({
                tip: `התנומות ארוכות ויציבות - מעולה! ממוצע של ${avgSleep.toFixed(1)} שעות.`,
                category: 'sleep',
            });
        }

        if (timeInsights?.avgSleepTime) {
            tips.push({
                tip: `שעת שינה ממוצעת: ${timeInsights.avgSleepTime}. שמרו על עקביות!`,
                category: 'sleep',
            });
        }
    }

    // Feeding tips
    if (dailyStats.foodCount > 0) {
        const avgFeeding = dailyStats.food / dailyStats.foodCount;

        if (avgFeeding > 150) {
            tips.push({
                tip: `האכלה גדולות (ממוצע ${Math.round(avgFeeding)} מ"ל). התינוק אוכל היטב!`,
                category: 'feeding',
            });
        }

        if (timeInsights?.avgFeedingInterval && timeInsights.avgFeedingInterval > 4) {
            tips.push({
                tip: `מרווח ארוך בין האכלה (${timeInsights.avgFeedingInterval.toFixed(1)} שעות). הבטן מתרחבת!`,
                category: 'feeding',
            });
        }
    }

    // Comparison tips
    if (prevWeekStats) {
        const sleepChange = dailyStats.sleep - prevWeekStats.sleep;
        if (Math.abs(sleepChange) > 2) {
            tips.push({
                tip: sleepChange > 0
                    ? `השינה השתפרה ב-${sleepChange.toFixed(1)} שעות לעומת השבוע שעבר! 🎉`
                    : `ירידה בשינה לעומת השבוע שעבר. אולי יש שינוי בשגרה?`,
                category: 'general',
            });
        }
    }

    // Default tip if none generated
    if (tips.length === 0) {
        tips.push({
            tip: t('reports.tips.keepTracking'),
            category: 'general',
        });
    }

    // ===== GENERATE PATTERNS =====

    // Find best sleep day
    const maxSleepDay = weeklyData.sleep.reduce((maxIdx, val, idx, arr) =>
        val > arr[maxIdx] ? idx : maxIdx, 0);
    if (weeklyData.sleep[maxSleepDay] > 0) {
        patterns.push({
            label: t('reports.sleep.bestSleepDay'),
            value: weeklyData.labels[maxSleepDay] || t('reports.empty.unknown'),
            icon: Moon,
            color: '#4A6572',
        });
    }

    // Find most active day (most events)
    const totalPerDay = weeklyData.labels.map((_, i) =>
        (weeklyData.food[i] > 0 ? 1 : 0) +
        (weeklyData.sleep[i] > 0 ? 1 : 0) +
        (weeklyData.diapers[i] > 0 ? 1 : 0)
    );
    const mostActiveDay = totalPerDay.reduce((maxIdx, val, idx, arr) =>
        val > arr[maxIdx] ? idx : maxIdx, 0);
    if (totalPerDay[mostActiveDay] > 0) {
        patterns.push({
            label: t('reports.insights.mostActiveDay'),
            value: weeklyData.labels[mostActiveDay] || t('reports.empty.unknown'),
            icon: Zap,
            color: '#D4A373',
        });
    }

    // Feeding type preference
    const { bottle, breast, pumping, solids } = dailyStats.feedingTypes;
    const feedingTotal = bottle + breast + pumping + solids;
    if (feedingTotal > 0) {
        let preferred = t('reports.feeding.mixed');
        let percent = 0;
        if (bottle > breast && bottle > pumping && bottle > solids) {
            preferred = t('reports.feeding.bottle');
            percent = Math.round((bottle / feedingTotal) * 100);
        } else if (breast > bottle && breast > pumping && breast > solids) {
            preferred = t('reports.feeding.breastfeeding');
            percent = Math.round((breast / feedingTotal) * 100);
        } else if (pumping > bottle && pumping > breast && pumping > solids) {
            preferred = t('reports.feeding.pumping');
            percent = Math.round((pumping / feedingTotal) * 100);
        } else if (solids > bottle && solids > breast && solids > pumping) {
            preferred = t('reports.feeding.solids');
            percent = Math.round((solids / feedingTotal) * 100);
        }

        if (percent > 50) {
            patterns.push({
                label: t('reports.feeding.preferredType'),
                value: `${preferred} (${percent}%)`,
                icon: Heart,
                color: '#8D4A60',
            });
        }
    }

    // ===== GENERATE MILESTONES =====

    // Sleep milestone
    const totalSleepDays = weeklyData.sleep.filter(s => s >= 10).length;
    milestones.push({
        title: t('reports.goals.goodSleepWeek'),
        current: totalSleepDays,
        target: 5,
        unit: t('reports.goals.daysOver10Hours'),
    });

    // Consistent feeding
    const consistentFeedingDays = weeklyData.food.filter(f => f > 0).length;
    milestones.push({
        title: t('reports.goals.feedingConsistency'),
        current: consistentFeedingDays,
        target: 7,
        unit: t('reports.goals.daysWithTracking'),
    });

    return { tips, patterns, milestones };
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
    // Premium Insight Card
    premiumCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderRadius: 16,
        padding: 14,
        overflow: 'hidden',
    },
    premiumCardOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    premiumCardBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 16,
    },
    premiumIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    premiumCardContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    premiumCardTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 2,
    },
    premiumValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    premiumCardValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    premiumCardSubtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },

    // AI Tip Card
    aiTipCard: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    aiTipOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
    },
    aiTipBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 20,
    },
    aiTipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'flex-end',
    },
    aiTipIconWrap: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    aiTipLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    aiTipContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
    },
    aiTipIcon: {
        marginLeft: 10,
        marginTop: 2,
    },
    aiTipText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: '#1C1C1E',
        lineHeight: 22,
        textAlign: 'right',
    },

    // Milestone Card
    milestoneCard: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        overflow: 'hidden',
    },
    milestoneOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    milestoneHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'flex-end',
    },
    milestoneIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    milestoneTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C1C1E',
    },
    milestoneProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    progressBarBg: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    milestoneStatus: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6B7280',
        minWidth: 80,
        textAlign: 'left',
    },
    completeTag: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    completeTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#059669',
    },

    // Share Button
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginVertical: 16,
        overflow: 'hidden',
        gap: 8,
    },
    shareButtonOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    shareButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#C8806A',
        zIndex: 10,
    },
});

export default {
    PremiumInsightCard,
    AITipCard,
    MilestoneCard,
    ShareSummaryButton,
    generateAIInsights,
};
