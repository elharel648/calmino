// components/Reports/DetailedStatsScreen.tsx - Apple Health Style Stats Detail Screen (Light Theme)
import React, { useState, useEffect, useMemo } from 'react';
import { View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Platform,
    SafeAreaView } from 'react-native';
import InlineLoader from '../../components/Common/InlineLoader';
import {
    ChevronLeft, Moon, Utensils, Droplets, Pill,
    TrendingUp, TrendingDown, Clock, Award, Star, Zap
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, differenceInHours } from 'date-fns';
import { he, enUS, es, ar, fr, de } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import GlassBarChartPerfect from './GlassBarChart';
import { logger } from '../../utils/logger';
import { useLanguage } from '../../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MetricType = 'sleep' | 'food' | 'diapers' | 'supplements';
type TimeRange = 'day' | 'week' | 'month' | 'custom';

interface DayData {
    date: Date;
    value: number;
    segments?: { value: number; color: string }[];
}

interface DetailedStatsScreenProps {
    onClose: () => void;
    metricType: MetricType;
    childId: string;
    initialTimeRange?: TimeRange;
}

type FeedingSubType = 'all' | 'bottle' | 'breast_right' | 'breast_left' | 'solids' | 'pumping';

export default function DetailedStatsScreen({
    onClose,
    metricType,
    childId,
    initialTimeRange = 'week',
}: DetailedStatsScreenProps) {
    const { theme } = useTheme();
    const { t, language } = useLanguage();

    const dateFnsLocale = useMemo(() => {
        const locales: Record<string, any> = { he, en: enUS, es, ar, fr, de };
        return locales[language] || he;
    }, [language]);

    const METRIC_CONFIG = useMemo(() => ({
        sleep: {
            title: t('reports.metrics.sleep'),
            icon: Moon,
            color: theme.actionColors.sleep.color,
            lightBg: theme.actionColors.sleep.lightColor,
            barColors: [theme.actionColors.sleep.color, theme.actionColors.sleep.color, theme.actionColors.sleep.accentColor],
            unit: t('reports.units.hours'),
            avgLabel: t('reports.insights.avgSleepDuration'),
            insights: [
                { icon: Clock, title: t('reports.insights.avgSleepTime'), key: 'avgSleepTime' },
                { icon: Star, title: t('reports.insights.bestNight'), key: 'bestNight' },
                { icon: TrendingUp, title: t('reports.insights.weekChange'), key: 'weekChange' },
            ],
        },
        food: {
            title: t('reports.metrics.feeding'),
            icon: Utensils,
            color: theme.actionColors.food.color,
            lightBg: theme.actionColors.food.lightColor,
            barColors: [theme.actionColors.food.color, theme.actionColors.food.color, theme.actionColors.food.accentColor],
            unit: t('detailedStats.ml'),
            avgLabel: t('reports.insights.avgDailyFeeding'),
            insights: [
                { icon: Zap, title: t('reports.insights.biggestFeeding'), key: 'biggestFeeding' },
                { icon: Clock, title: t('reports.insights.avgInterval'), key: 'avgInterval' },
                { icon: Award, title: t('reports.misc.total'), key: 'totalAmount' },
            ],
        },
        diapers: {
            title: t('reports.metrics.diapers'),
            icon: Droplets,
            color: theme.actionColors.diaper.color,
            lightBg: theme.actionColors.diaper.lightColor,
            barColors: [theme.actionColors.diaper.color, theme.actionColors.diaper.color, theme.actionColors.diaper.accentColor],
            unit: t('reports.units.times'),
            avgLabel: t('reports.insights.dailyAverage'),
            insights: [
                { icon: TrendingUp, title: t('reports.insights.dailyAverage'), key: 'dailyAvg' },
                { icon: Star, title: t('reports.insights.busiestDay'), key: 'busiestDay' },
                { icon: Award, title: t('reports.sections.changes'), key: 'totalChanges' },
            ],
        },
        supplements: {
            title: t('reports.metrics.supplements'),
            icon: Pill,
            color: theme.actionColors.supplements.color,
            lightBg: theme.actionColors.supplements.lightColor,
            barColors: [theme.actionColors.supplements.color, theme.actionColors.supplements.color, theme.actionColors.supplements.accentColor],
            unit: t('reports.units.times'),
            avgLabel: t('reports.insights.dailyAverage'),
            insights: [
                { icon: Award, title: t('reports.insights.consistency'), key: 'consistency' },
                { icon: Clock, title: t('reports.insights.commonTime'), key: 'commonTime' },
                { icon: TrendingUp, title: t('reports.units.doses'), key: 'totalDoses' },
            ],
        },
    }), [t]);

    const TIME_RANGE_LABELS = useMemo<Record<Exclude<TimeRange, 'custom'>, string>>(() => ({
        day: t('reports.tabs.daily'),
        week: t('reports.tabs.weekly'),
        month: t('reports.tabs.monthly'),
    }), [t]);

    const FEEDING_SUBTYPES = useMemo<{ id: FeedingSubType; label: string; color: string }[]>(() => [
        { id: 'all', label: t('common.all'), color: theme.actionColors.food.color },
        { id: 'breast_right', label: t('reports.feeding.breastRight'), color: theme.actionColors.magicMoments.color },
        { id: 'breast_left', label: t('reports.feeding.breastLeft'), color: theme.actionColors.health.color },
        { id: 'bottle', label: t('reports.feeding.bottle'), color: theme.actionColors.tools.color },
        { id: 'solids', label: t('reports.feeding.solids'), color: theme.actionColors.growth.color },
        { id: 'pumping', label: t('reports.feeding.pumping'), color: theme.actionColors.custom.color },
    ], [t, theme]);

    const METRIC_GOALS = useMemo(() => ({
        sleep: [
            { title: t('reports.goals.goodSleepWeek'), target: 7, threshold: 8, unit: t('reports.units.hours'), description: t('reports.goals.daysOver8Hours') },
            { title: t('reports.goals.regularSleep'), target: 7, threshold: 6, unit: t('reports.units.hours'), description: t('reports.goals.daysWithRoutine') },
        ],
        food: [
            { title: t('reports.goals.feedingConsistency'), target: 7, threshold: 4, unit: t('reports.metrics.feeding'), description: t('reports.goals.daysWithTracking') },
            { title: t('reports.goals.adequateNutrition'), target: 7, threshold: 500, unit: t('reports.units.hours'), description: t('reports.goals.daysWithTracking') },
        ],
        diapers: [
            { title: t('reports.goals.regularTracking'), target: 7, threshold: 4, unit: t('reports.sections.changes'), description: t('reports.goals.daysWith4Changes') },
        ],
        supplements: [
            { title: t('reports.goals.supplementConsistency'), target: 7, threshold: 1, unit: t('reports.units.doses'), description: t('reports.goals.daysWithSupplement') },
        ],
    }), [t]);

    const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
    const [data, setData] = useState<DayData[]>([]);
    const [prevWeekData, setPrevWeekData] = useState<DayData[]>([]);
    const [allFoodEvents, setAllFoodEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [feedingSubType, setFeedingSubType] = useState<FeedingSubType>('all');

    const config = METRIC_CONFIG[metricType];
    const IconComponent = config.icon;

    // Calculate date range based on timeRange
    const dateRange = useMemo(() => {
        const end = new Date();
        let start: Date;

        switch (timeRange) {
            case 'day':
                start = startOfDay(end);
                break;
            case 'week':
                start = subWeeks(end, 1);
                break;
            case 'month':
                start = subMonths(end, 1);
                break;
            case 'custom':
                start = subMonths(end, 6);
                break;
            default:
                start = subWeeks(end, 1);
        }

        return { start: startOfDay(start), end: endOfDay(end) };
    }, [timeRange]);

    // Fetch data from Firebase
    useEffect(() => {
        if (!childId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const eventsRef = collection(db, 'events');
                const startTimestamp = Timestamp.fromDate(dateRange.start);
                const endTimestamp = Timestamp.fromDate(dateRange.end);

                const q = query(
                    eventsRef,
                    where('childId', '==', childId),
                    where('timestamp', '>=', startTimestamp),
                    where('timestamp', '<=', endTimestamp),
                    orderBy('timestamp', 'asc')
                );

                const snapshot = await getDocs(q);
                const events = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                }));

                // Store all food events for interval calculation
                if (metricType === 'food') {
                    const foodEvents = events.filter((e: any) => {
                        if (e.type !== 'food' && e.type !== 'feeding') return false;
                        if (feedingSubType === 'all') return true;
                        if (feedingSubType === 'bottle') return e.subType === 'bottle';
                        if (feedingSubType === 'breast_right') return e.subType === 'breast' && e.breastSide === 'right';
                        if (feedingSubType === 'breast_left') return e.subType === 'breast' && e.breastSide === 'left';
                        if (feedingSubType === 'solids') return e.subType === 'solids';
                        if (feedingSubType === 'pumping') return e.subType === 'pumping';
                        return false;
                    }).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());
                    setAllFoodEvents(foodEvents);
                } else {
                    setAllFoodEvents([]);
                }

                // Fetch previous period data for comparison (all metrics, all time ranges)
                let prevPeriodEvents: any[] = [];
                try {
                    let prevStart: Date;
                    let prevEnd: Date;
                    switch (timeRange) {
                        case 'day':
                            prevStart = startOfDay(subDays(dateRange.start, 1));
                            prevEnd = endOfDay(subDays(dateRange.end, 1));
                            break;
                        case 'week':
                            prevStart = subWeeks(dateRange.start, 1);
                            prevEnd = subWeeks(dateRange.end, 1);
                            break;
                        case 'month':
                            prevStart = subMonths(dateRange.start, 1);
                            prevEnd = subMonths(dateRange.end, 1);
                            break;
                        default:
                            prevStart = subMonths(dateRange.start, 6);
                            prevEnd = subMonths(dateRange.end, 6);
                    }
                    const prevStartTimestamp = Timestamp.fromDate(prevStart);
                    const prevEndTimestamp = Timestamp.fromDate(prevEnd);

                    const prevQ = query(
                        eventsRef,
                        where('childId', '==', childId),
                        where('timestamp', '>=', prevStartTimestamp),
                        where('timestamp', '<=', prevEndTimestamp),
                        orderBy('timestamp', 'asc')
                    );

                    const prevSnapshot = await getDocs(prevQ);
                    prevPeriodEvents = prevSnapshot.docs.map(doc => ({
                        ...doc.data(),
                        timestamp: doc.data().timestamp?.toDate() || new Date(),
                    }));
                } catch (error) {
                    logger.error('Error fetching previous period data:', error);
                }

                // Create day-by-day data
                const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
                const dayData: DayData[] = days.map(day => {
                    const dayStart = startOfDay(day);
                    const dayEnd = endOfDay(day);

                    const dayEvents = events.filter((e: any) => {
                        const eventDate = new Date(e.timestamp);
                        return eventDate >= dayStart && eventDate <= dayEnd;
                    });

                    let value = 0;
                    const segments: { value: number; color: string }[] = [];

                    if (metricType === 'sleep') {
                        dayEvents.filter((e: any) => e.type === 'sleep').forEach((e: any, i: number) => {
                            const hours = (e.duration || 0) / 3600;
                            value += hours;
                            segments.push({
                                value: hours,
                                color: config.barColors[i % config.barColors.length],
                            });
                        });
                    } else if (metricType === 'food') {
                        dayEvents.filter((e: any) => {
                            if (e.type !== 'food' && e.type !== 'feeding') return false;
                            if (feedingSubType === 'all') return true;
                            if (feedingSubType === 'bottle') return e.subType === 'bottle';
                            if (feedingSubType === 'breast_right') return e.subType === 'breast' && e.breastSide === 'right';
                            if (feedingSubType === 'breast_left') return e.subType === 'breast' && e.breastSide === 'left';
                            if (feedingSubType === 'solids') return e.subType === 'solids';
                            if (feedingSubType === 'pumping') return e.subType === 'pumping';
                            return false;
                        }).forEach((e: any) => {
                            const amount = parseInt(String(e.amount || 0).replace(/[^\d]/g, '')) || 0;
                            // If no ml amount (e.g. direct breastfeeding), count as 1 occurrence
                            value += amount > 0 ? amount : 1;
                        });
                    } else if (metricType === 'diapers') {
                        value = dayEvents.filter((e: any) => e.type === 'diaper').length;
                    } else if (metricType === 'supplements') {
                        value = dayEvents.filter((e: any) => e.type === 'supplement' || e.type === 'supplements').length;
                    }

                    return { date: day, value, segments: segments.length > 0 ? segments : undefined };
                });

                setData(dayData);

                // For monthly/custom views, aggregate days into weeks
                if (timeRange === 'month' || timeRange === 'custom') {
                    const weekStarts = eachWeekOfInterval(
                        { start: dateRange.start, end: dateRange.end },
                        { weekStartsOn: 0 } // Sunday
                    );
                    const weeklyData: DayData[] = weekStarts.map(weekStart => {
                        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
                        const clampedEnd = weekEnd > dateRange.end ? dateRange.end : weekEnd;
                        // Sum all day values in this week
                        const weekDays = dayData.filter(d => d.date >= weekStart && d.date <= clampedEnd);
                        const total = weekDays.reduce((sum, d) => sum + d.value, 0);
                        return { date: weekStart, value: total };
                    });
                    setData(weeklyData);
                }

                // Calculate previous period data for comparison
                if (prevPeriodEvents.length > 0) {
                    let prevStart: Date;
                    let prevEnd: Date;
                    switch (timeRange) {
                        case 'day':
                            prevStart = startOfDay(subDays(dateRange.start, 1));
                            prevEnd = endOfDay(subDays(dateRange.end, 1));
                            break;
                        case 'week':
                            prevStart = subWeeks(dateRange.start, 1);
                            prevEnd = subWeeks(dateRange.end, 1);
                            break;
                        case 'month':
                            prevStart = subMonths(dateRange.start, 1);
                            prevEnd = subMonths(dateRange.end, 1);
                            break;
                        default:
                            prevStart = subMonths(dateRange.start, 6);
                            prevEnd = subMonths(dateRange.end, 6);
                    }
                    const prevDays = eachDayOfInterval({ start: prevStart, end: prevEnd });
                    const prevDayData: DayData[] = prevDays.map(day => {
                        const dayStart = startOfDay(day);
                        const dayEnd = endOfDay(day);

                        const dayEvents = prevPeriodEvents.filter((e: any) => {
                            const eventDate = new Date(e.timestamp);
                            return eventDate >= dayStart && eventDate <= dayEnd;
                        });

                        let value = 0;
                        if (metricType === 'sleep') {
                            dayEvents.filter((e: any) => e.type === 'sleep').forEach((e: any) => {
                                value += (e.duration || 0) / 3600;
                            });
                        } else if (metricType === 'food') {
                            dayEvents.filter((e: any) => e.type === 'food' || e.type === 'feeding').forEach((e: any) => {
                                value += parseInt(String(e.amount || 0).replace(/[^\d]/g, '')) || 0;
                            });
                        } else if (metricType === 'diapers') {
                            value = dayEvents.filter((e: any) => e.type === 'diaper').length;
                        } else if (metricType === 'supplements') {
                            value = dayEvents.filter((e: any) => e.type === 'supplement' || e.type === 'supplements').length;
                        }

                        return { date: day, value };
                    });
                    setPrevWeekData(prevDayData);
                } else {
                    setPrevWeekData([]);
                }
            } catch (error) {
                logger.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [childId, dateRange, metricType, feedingSubType]);

    // Calculate stats
    const stats = useMemo(() => {
        if (data.length === 0) return { total: 0, average: 0, max: 0, maxDay: '' };

        const values = data.map(d => d.value);
        const total = values.reduce((a, b) => a + b, 0);
        const nonZeroValues = values.filter(v => v > 0);
        const average = nonZeroValues.length > 0 ? total / nonZeroValues.length : 0;
        const max = Math.max(...values, 0);
        const maxIndex = values.indexOf(max);
        const maxDay = data[maxIndex] ? format(data[maxIndex].date, 'EEEE', { locale: dateFnsLocale }) : '';

        return { total, average, max, maxDay };
    }, [data]);

    // Calculate period change (all metrics)
    const weekChange = useMemo(() => {
        if (prevWeekData.length === 0 || data.length === 0) {
            return null;
        }

        const currentTotal = data.reduce((sum, day) => sum + day.value, 0);
        const prevTotal = prevWeekData.reduce((sum, day) => sum + day.value, 0);

        if (prevTotal === 0) {
            return currentTotal > 0 ? '+100%' : '0%';
        }

        const change = ((currentTotal - prevTotal) / prevTotal) * 100;
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(0)}%`;
    }, [data, prevWeekData]);

    // Calculate average interval between feedings
    const avgInterval = useMemo(() => {
        if (metricType !== 'food' || allFoodEvents.length < 2) {
            return null;
        }

        const intervals: number[] = [];
        for (let i = 1; i < allFoodEvents.length; i++) {
            const timeDiff = differenceInHours(
                allFoodEvents[i].timestamp,
                allFoodEvents[i - 1].timestamp
            );
            if (timeDiff > 0 && timeDiff < 24) { // Only count reasonable intervals (less than 24 hours)
                intervals.push(timeDiff);
            }
        }

        if (intervals.length === 0) {
            return null;
        }

        const avg = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const hours = Math.floor(avg);
        const minutes = Math.round((avg - hours) * 60);

        if (hours === 0) {
            return `${minutes} ${t('detailedStats.minuteShort')}`;
        } else if (minutes === 0) {
            return `${hours} ${t('detailedStats.hours')}`;
        } else {
            return `${hours}.${Math.floor(minutes / 6)} ${t('detailedStats.hours')}`; // Round to nearest 10 minutes
        }
    }, [allFoodEvents, metricType]);

    // Generate insights based on metric type
    const insightValues = useMemo(() => {
        if (metricType === 'sleep') {
            return {
                avgSleepTime: stats.average > 0 ? `${stats.average.toFixed(1)} ${t('detailedStats.hours')}` : '--',
                bestNight: stats.maxDay ? `${stats.max.toFixed(1)} ${t('detailedStats.hours')} (${stats.maxDay})` : '--',
                weekChange: weekChange || '--',
            };
        } else if (metricType === 'food') {
            return {
                biggestFeeding: `${stats.max} ${t('detailedStats.ml')}`,
                avgInterval: avgInterval || '--',
                totalAmount: `${Math.round(stats.total)} ${t('detailedStats.ml')}`,
            };
        } else if (metricType === 'diapers') {
            return {
                dailyAvg: `${stats.average.toFixed(1)} ${t('detailedStats.times')}`,
                busiestDay: stats.maxDay || '--',
                totalChanges: `${Math.round(stats.total)} ${t('detailedStats.changes')}`,
            };
        } else {
            return {
                consistency: stats.average > 0 ? t('detailedStats.good') : '--',
                commonTime: '--',
                totalDoses: `${Math.round(stats.total)} ${t('detailedStats.doses')}`,
            };
        }
    }, [stats, metricType, weekChange, avgInterval, t]);

    // Format value for display
    const formatValue = (value: number) => {
        if (metricType === 'sleep') {
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            return { main: hours.toString(), sub: `${minutes} ${t('detailedStats.minuteShort')}`, unit: t('detailedStats.hourShort') };
        }
        return { main: Math.round(value).toString(), sub: '', unit: metricType === 'food' ? (value > 50 ? t('detailedStats.ml') : t('reports.units.times')) : config.unit };
    };

    const formattedAvg = formatValue(stats.average);

    // Prepare chart data
    const chartData = useMemo(() => data.map(d => d.value), [data]);
    const chartLabels = useMemo(() => {
        if (timeRange === 'month' || timeRange === 'custom') {
            // Weekly labels: show date range like "10-17/3"
            return data.map(d => {
                const weekEnd = endOfWeek(d.date, { weekStartsOn: 0 });
                const startDay = format(d.date, 'd', { locale: dateFnsLocale });
                const endDay = format(weekEnd, 'd', { locale: dateFnsLocale });
                const month = format(d.date, '/M', { locale: dateFnsLocale });
                return `${startDay}-${endDay}${month}`;
            });
        }
        return data.map(d => format(d.date, 'EEE', { locale: dateFnsLocale }));
    }, [data, timeRange, dateFnsLocale]);

    // Calculate goals progress
    const goalsProgress = useMemo(() => {
        const goals = METRIC_GOALS[metricType];
        return goals.map(goal => {
            const daysMetGoal = data.filter(d => d.value >= goal.threshold).length;
            return {
                ...goal,
                current: daysMetGoal,
                progress: Math.min(100, (daysMetGoal / goal.target) * 100),
            };
        });
    }, [data, metricType]);

    // Calculate comparison to previous period (real data)
    const comparison = useMemo(() => {
        if (data.length === 0 || prevWeekData.length === 0) {
            return { change: 0, isPositive: true, prevAvg: 0, hasData: false };
        }
        const currentTotal = data.reduce((sum, day) => sum + day.value, 0);
        const prevTotal = prevWeekData.reduce((sum, day) => sum + day.value, 0);
        const currentNonZero = data.filter(d => d.value > 0);
        const prevNonZero = prevWeekData.filter(d => d.value > 0);
        const currentAvg = currentNonZero.length > 0 ? currentTotal / currentNonZero.length : 0;
        const prevAvg = prevNonZero.length > 0 ? prevTotal / prevNonZero.length : 0;

        if (prevAvg === 0) {
            return { change: currentAvg > 0 ? 100 : 0, isPositive: true, prevAvg: 0, hasData: true };
        }
        const change = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
        return {
            change: Math.abs(change),
            isPositive: change >= 0,
            prevAvg,
            hasData: true,
        };
    }, [data, prevWeekData]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onClose();
                    }}
                >
                    <ChevronLeft size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <IconComponent size={20} color={config.color} strokeWidth={2} />
                    <Text style={[styles.headerText, { color: theme.textPrimary }]}>{config.title}</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Time Range Tabs */}
                <View style={[styles.timeRangeTabs, { backgroundColor: theme.cardSecondary }]}>
                    {(Object.entries(TIME_RANGE_LABELS) as [Exclude<TimeRange, 'custom'>, string][]).map(([range, label]) => {
                        const isActive = timeRange === range;
                        return (
                            <TouchableOpacity
                                key={range}
                                style={[
                                    styles.timeTab,
                                    isActive && [styles.timeTabActive, { backgroundColor: theme.card }],
                                ]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTimeRange(range);
                                }}
                            >
                                <Text style={[
                                    styles.timeTabText,
                                    { color: isActive ? theme.textPrimary : theme.textSecondary },
                                    isActive && styles.timeTabTextActive,
                                ]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Feeding Subtype Filter (only for food) */}
                {metricType === 'food' && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.feedingFilterContainer}
                        style={styles.feedingFilterScroll}
                    >
                        {FEEDING_SUBTYPES.map((subType) => {
                            const isActive = feedingSubType === subType.id;
                            return (
                                <TouchableOpacity
                                    key={subType.id}
                                    style={[
                                        styles.feedingFilterPill,
                                        {
                                            backgroundColor: isActive ? subType.color : theme.cardSecondary,
                                            borderColor: isActive ? subType.color : theme.border,
                                        },
                                    ]}
                                    onPress={() => {
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setFeedingSubType(subType.id);
                                    }}
                                >
                                    <Text style={[
                                        styles.feedingFilterText,
                                        { color: isActive ? '#fff' : theme.textSecondary },
                                    ]}>
                                        {subType.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Main Stats Card */}
                <View style={[styles.statsCard, { backgroundColor: config.lightBg }]}>
                    <Text style={[styles.avgLabel, { color: theme.textSecondary }]}>{config.avgLabel}</Text>
                    <View style={styles.mainValue}>
                        <Text style={[styles.valueNumber, { color: config.color }]}>{formattedAvg.main}</Text>
                        <Text style={[styles.valueUnit, { color: config.color }]}>{formattedAvg.unit}</Text>
                        {formattedAvg.sub && (
                            <>
                                <Text style={[styles.valueNumber, { color: config.color }]}> {formattedAvg.sub.split(' ')[0]}</Text>
                                <Text style={[styles.valueUnit, { color: config.color }]}>{formattedAvg.sub.split(' ')[1]}</Text>
                            </>
                        )}
                    </View>
                    <Text style={[styles.dateRange, { color: theme.textSecondary }]}>
                        {format(dateRange.start, 'd', { locale: dateFnsLocale })}-{format(dateRange.end, 'd MMMM yyyy', { locale: dateFnsLocale })}
                    </Text>
                </View>

                {/* Premium Animated Chart */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <InlineLoader size="large" color={config.color}  />
                    </View>
                ) : data.length > 0 ? (
                    <GlassBarChartPerfect
                        data={chartData}
                        labels={chartLabels}
                        title={config.title}
                        unit={config.unit}
                        gradientColors={[config.color, `${config.color}20`]}
                        height={280}
                    />
                ) : (
                    <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                        <View style={styles.emptyChart}>
                            <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
                                {t('detailedStats.noDataToDisplay')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Goals Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={18} color={config.color} />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.goals.title')}</Text>
                    </View>
                    {goalsProgress.map((goal, index) => (
                        <View key={index} style={[styles.goalCard, { backgroundColor: theme.card }]}>
                            <View style={styles.goalHeader}>
                                <View style={[styles.goalIconWrap, { backgroundColor: config.lightBg }]}>
                                    <IconComponent size={16} color={config.color} />
                                </View>
                                <Text style={[styles.goalTitle, { color: theme.textPrimary }]}>{goal.title}</Text>
                            </View>
                            <View style={styles.goalProgressContainer}>
                                <View style={[styles.goalProgressBg, { backgroundColor: theme.cardSecondary }]}>
                                    <View
                                        style={[
                                            styles.goalProgressFill,
                                            {
                                                width: `${goal.progress}%`,
                                                backgroundColor: config.color,
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.goalProgressText, { color: theme.textSecondary }]}>
                                    {goal.current}/{goal.target} {goal.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Comparison Section - only show if we have previous period data */}
                {comparison.hasData && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={18} color={theme.textSecondary} />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                            {timeRange === 'day' ? t('reports.comparison.vsYesterday') :
                             timeRange === 'week' ? t('reports.comparison.vsLastWeek') :
                             timeRange === 'month' ? t('reports.comparison.vsLastMonth') :
                             t('reports.comparison.previousPeriod')}
                        </Text>
                    </View>
                    <View style={[styles.comparisonCard, { backgroundColor: theme.card }]}>
                        <View style={[styles.comparisonIconWrap, { backgroundColor: config.lightBg }]}>
                            <IconComponent size={20} color={config.color} />
                        </View>
                        <View style={styles.comparisonContent}>
                            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>{config.title}</Text>
                            <View style={styles.comparisonValueRow}>
                                <Text style={[styles.comparisonValue, { color: comparison.isPositive ? '#10B981' : '#EF4444' }]}>
                                    {comparison.isPositive ? '+' : '-'}{comparison.change}%
                                </Text>
                                {comparison.isPositive ? (
                                    <TrendingUp size={16} color="#10B981" />
                                ) : (
                                    <TrendingDown size={16} color="#EF4444" />
                                )}
                            </View>
                            <Text style={[styles.comparisonNote, { color: theme.textSecondary }]}>
                                {comparison.isPositive ? t('reports.comparison.more') : t('reports.comparison.less')} {config.title.toLowerCase()}
                            </Text>
                        </View>
                    </View>
                </View>
                )}

                {/* Insights Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.insights.title')}</Text>
                    {config.insights.map((insight, index) => {
                        const InsightIcon = insight.icon;
                        const value = insightValues[insight.key as keyof typeof insightValues];
                        return (
                            <View
                                key={index}
                                style={[styles.insightCard, { backgroundColor: theme.card }]}
                            >
                                <View style={[styles.insightIconWrap, { backgroundColor: config.lightBg }]}>
                                    <InsightIcon size={18} color={config.color} strokeWidth={1.5} />
                                </View>
                                <View style={styles.insightContent}>
                                    <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>
                                        {insight.title}
                                    </Text>
                                    <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                                        {value}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
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
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    timeRangeTabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    timeTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    timeTabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 0,
    },
    timeTabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    timeTabTextActive: {
        fontWeight: '600',
    },
    statsCard: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    avgLabel: {
        fontSize: 13,
        marginBottom: 4,
    },
    mainValue: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    valueNumber: {
        fontSize: 40,
        fontWeight: '300',
    },
    valueUnit: {
        fontSize: 20,
        fontWeight: '300',
    },
    dateRange: {
        fontSize: 13,
        marginTop: 4,
    },
    loadingContainer: {
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartScrollContent: {
        paddingRight: 16,
    },
    chartContainer: {
        height: 220,
        position: 'relative',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
    },
    barsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 180,
        paddingTop: 10,
    },
    barColumn: {
        alignItems: 'center',
    },
    bar: {
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    stackedBar: {
        justifyContent: 'flex-end',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barSegment: {},
    singleBar: {
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        marginTop: 8,
    },
    insightsSection: {
        marginTop: 8,
    },
    insightsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
    },
    insightCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        gap: 12,
    },
    insightIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    insightLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    insightValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptyChart: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChartText: {
        fontSize: 14,
    },
    // Section styles
    section: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'right',
    },
    // Goal card styles
    goalCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    goalHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    goalIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalTitle: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    goalProgressContainer: {
        gap: 8,
    },
    goalProgressBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    goalProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalProgressText: {
        fontSize: 12,
        textAlign: 'right',
    },
    // Comparison card styles
    comparisonCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 14,
    },
    comparisonIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    comparisonContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    comparisonLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    comparisonValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    comparisonValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    comparisonNote: {
        fontSize: 11,
        marginTop: 2,
    },
    // Feeding filter styles
    feedingFilterScroll: {
        marginBottom: 16,
        marginHorizontal: -16,
    },
    feedingFilterContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    feedingFilterPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    feedingFilterText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
