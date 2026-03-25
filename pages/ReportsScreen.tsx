import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Alert,
  Modal,
  Animated as RNAnimated,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../utils/designSystem';
import { X, TrendingUp, TrendingDown, ChevronRight, ChevronLeft, Share2, Download, Calendar, Activity, Moon, Utensils, Droplets, Pill, RefreshCw, Trophy, Award, Clock, BarChart2, Check, GripVertical, Edit2, Baby, Lock, Flame } from 'lucide-react-native';
import StatsEditModal, { DEFAULT_STATS_ORDER, STATS_ORDER_KEY, StatKey } from '../components/Reports/StatsEditModal';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, subWeeks, subMonths, differenceInDays, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useActiveChild } from '../context/ActiveChildContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useBabyProfile } from '../hooks/useBabyProfile';
import * as Haptics from 'expo-haptics';
import ChildPicker from '../components/Home/ChildPicker';
import { LiquidGlassBackground } from '../components/LiquidGlass';
import { PremiumStatCard, SkiaBezierChart, MilestoneBadge } from '../components/Reports/PremiumReportComponents';
import { LiquidGlassLineChart, LiquidGlassBarChart } from '../components/Reports/LiquidGlassCharts';
import GlassBarChartPerfect from '../components/Reports/GlassBarChart';
import { logger } from '../utils/logger';
import DetailedStatsScreen from '../components/Reports/DetailedStatsScreen';
import DetailedGrowthScreen from '../components/Reports/DetailedGrowthScreen';
import GrowthStatCube from '../components/Reports/GrowthStatCube';
import GrowthModal from '../components/Home/GrowthModal';
import DailyTimeline from '../components/DailyTimeline';
import { usePremium } from '../context/PremiumContext';
import PremiumPaywall from '../components/Premium/PremiumPaywall';
import DynamicPromoModal from '../components/Premium/DynamicPromoModal';
import {
  PremiumInsightCard,
  AITipCard,
  MilestoneCard,
  ShareSummaryButton,
  generateAIInsights,
} from '../components/Reports/PremiumInsights';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TypeScript interfaces
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
  avgSleepTime: string;
  avgWakeTime: string;
  avgFeedingInterval: number;
  nightWakeups: number;
  longestSleep: number;
  biggestFeeding: number;
  bestSleepDay: string;
}

interface WeekComparison {
  sleepChange: number;
  feedingChange: number;
  diaperChange: number;
}

interface WeeklyData {
  labels: string[];
  food: number[];
  sleep: number[];
  diapers: number[];
}

type TimeRange = 'day' | 'week' | 'month' | 'custom';
type TabName = 'summary';
type MetricType = 'sleep' | 'food' | 'diapers' | 'supplements' | null;

export default function ReportsScreen() {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { activeChild } = useActiveChild();
  const { baby } = useBabyProfile(activeChild?.childId);

  // Calculate baby age in months
  const babyAgeMonths = useMemo(() => {
    if (!baby?.birthDate) return 6; // Default to 6 months if not set
    // Handle both Firestore Timestamp and Date objects
    const birthDate = baby.birthDate.seconds
      ? new Date(baby.birthDate.seconds * 1000)
      : new Date(baby.birthDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return isNaN(months) ? 6 : months;
  }, [baby?.birthDate]);

  // State
  const [activeTab, setActiveTab] = useState<TabName>('summary');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(subWeeks(new Date(), 1));
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);

  const [dailyStats, setDailyStats] = useState<DailyStats>({
    food: 0, foodCount: 0,
    sleep: 0, sleepCount: 0,
    diapers: 0, supplements: 0,
    feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
  });

  const [prevWeekStats, setPrevWeekStats] = useState<DailyStats | null>(null);
  const [timeInsights, setTimeInsights] = useState<TimeInsights | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({ labels: [], food: [], sleep: [], diapers: [] });
  const [dayBreakdown, setDayBreakdown] = useState<{ [day: string]: DailyStats }>({});

  // Stats Order
  const [statsOrder, setStatsOrder] = useState<StatKey[]>(DEFAULT_STATS_ORDER);
  const [showStatsEdit, setShowStatsEdit] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [showGrowthScreen, setShowGrowthScreen] = useState(false);

  // Premium State
  const { isPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);

  // Load stats order
  useEffect(() => {
    AsyncStorage.getItem(STATS_ORDER_KEY).then(json => {
      if (json) {
        setStatsOrder(JSON.parse(json));
      }
    }).catch((e) => logger.warn('Failed to load stats order:', e));
  }, []);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<{
    sleepDaysGoal: number;
    sleepDaysMet: number;
    docDaysGoal: number;
    docDaysMet: number;
    streak: number;
  }>({ sleepDaysGoal: 7, sleepDaysMet: 0, docDaysGoal: 7, docDaysMet: 0, streak: 0 });

  // Get date range
  const getDateRange = useCallback(() => {
    const end = endOfDay(new Date());
    let start: Date;

    switch (timeRange) {
      case 'day':
        start = startOfDay(selectedDate);
        return { start, end: endOfDay(selectedDate) };
      case 'week':
        start = startOfDay(subWeeks(new Date(), 1));
        break;
      case 'month':
        start = startOfDay(subMonths(new Date(), 1));
        break;
      case 'custom':
        return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
      default:
        start = startOfDay(subWeeks(new Date(), 1));
    }
    return { start, end };
  }, [timeRange, selectedDate, customStartDate, customEndDate]);

  // Track if currently fetching to prevent double refresh
  const isFetching = React.useRef(false);

  // Fetch data
  const fetchData = async () => {
    if (!activeChild?.childId) return;

    // Prevent concurrent fetches
    if (isFetching.current) return;
    isFetching.current = true;

    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const daysInRange = differenceInDays(end, start) + 1;

      // Main query - optimized with order and limit
      const q = query(
        collection(db, 'events'),
        where('childId', '==', activeChild.childId),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc'),
        limit(500) // Safety limit for very active users
      );

      const querySnapshot = await getDocs(q);
      const events: any[] = [];

      const stats: DailyStats = {
        food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
        diapers: 0, supplements: 0,
        feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
      };

      // Day breakdown for charts
      const dayMap: { [key: string]: DailyStats } = {};
      for (let i = daysInRange - 1; i >= 0; i--) {
        const d = subDays(end, i);
        const key = format(d, 'dd/MM');
        dayMap[key] = {
          food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
          diapers: 0, supplements: 0,
          feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
        };
      }

      // Time insights tracking
      const sleepTimes: number[] = [];
      const wakeTimes: number[] = [];
      const feedingTimes: number[] = [];
      let maxSleepDuration = 0;
      let maxFeedingAmount = 0;
      const sleepByDay: { [day: string]: number } = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.timestamp instanceof Timestamp
          ? data.timestamp.toDate()
          : new Date(data.timestamp);

        events.push({ id: doc.id, ...data, dateObj });
        const dayKey = format(dateObj, 'dd/MM');

        if (data.type === 'feeding' || data.type === 'food') {
          // Parse amount - handle string formats like "120 מ"ל" or just numbers
          let amount = 0;
          if (data.amount) {
            const parsed = parseInt(String(data.amount).replace(/[^\d]/g, ''));
            amount = isNaN(parsed) ? 0 : parsed;
          }

          stats.food += amount;
          stats.foodCount += 1;

          // Count by subType
          if (data.subType === 'bottle') stats.feedingTypes.bottle += 1;
          else if (data.subType === 'breast') stats.feedingTypes.breast += 1;
          else if (data.subType === 'pumping') stats.feedingTypes.pumping += 1;
          else if (data.subType === 'solids') stats.feedingTypes.solids += 1;

          if (dayMap[dayKey]) {
            dayMap[dayKey].food += amount;
            dayMap[dayKey].foodCount += 1;
          }

          feedingTimes.push(dateObj.getTime());
          if (amount > maxFeedingAmount) maxFeedingAmount = amount;
        }

        if (data.type === 'diaper') {
          stats.diapers += 1;
          if (dayMap[dayKey]) dayMap[dayKey].diapers += 1;
        }

        if (data.type === 'sleep' && data.duration) {
          const hours = data.duration / 3600;
          stats.sleep += hours;
          stats.sleepCount += 1;
          if (dayMap[dayKey]) {
            dayMap[dayKey].sleep += hours;
            dayMap[dayKey].sleepCount += 1;
          }

          // Track sleep patterns
          const hour = dateObj.getHours();
          if (hour >= 18 || hour < 6) sleepTimes.push(hour);
          if (data.duration > maxSleepDuration) maxSleepDuration = data.duration;

          const dayName = format(dateObj, 'EEEE', { locale: he });
          sleepByDay[dayName] = (sleepByDay[dayName] || 0) + hours;
        }

        if (data.type === 'supplement' || data.type === 'supplements') {
          stats.supplements += 1;
          if (dayMap[dayKey]) dayMap[dayKey].supplements += 1;
        }
      });

      // Calculate time insights
      let avgFeedingInterval = 0;
      if (feedingTimes.length > 1) {
        feedingTimes.sort((a, b) => a - b);
        let totalInterval = 0;
        for (let i = 1; i < feedingTimes.length; i++) {
          totalInterval += feedingTimes[i] - feedingTimes[i - 1];
        }
        avgFeedingInterval = totalInterval / (feedingTimes.length - 1) / (1000 * 60 * 60); // Hours
      }

      // Best sleep day
      let bestDay = '';
      let bestSleep = 0;
      Object.entries(sleepByDay).forEach(([day, hours]) => {
        if (hours > bestSleep) {
          bestSleep = hours;
          bestDay = day;
        }
      });

      setTimeInsights({
        avgSleepTime: sleepTimes.length > 0 ? `${Math.round(sleepTimes.reduce((a, b) => a + b, 0) / sleepTimes.length)}:00` : '--:--',
        avgWakeTime: '--:--',
        avgFeedingInterval: Math.round(avgFeedingInterval * 10) / 10,
        nightWakeups: 0,
        longestSleep: Math.round(maxSleepDuration / 3600 * 10) / 10,
        biggestFeeding: maxFeedingAmount,
        bestSleepDay: bestDay || t('reports.empty.unknown'),
      });

      setDailyStats(stats);
      setDayBreakdown(dayMap);
      setAllEvents(events);

      // Calculate real weekly goals
      const dayKeys = Object.keys(dayMap);
      let sleepDaysMet = 0;
      let docDaysMet = 0;
      let currentStreak = 0;
      let streakBroken = false;

      // Check each day (from most recent to oldest)
      const reversedDays = [...dayKeys].reverse();
      for (const dayKey of reversedDays) {
        const day = dayMap[dayKey];
        const hasDocumentation = day.foodCount > 0 || day.sleepCount > 0 || day.diapers > 0 || day.supplements > 0;

        // Sleep goal: 8+ hours total that day
        if (day.sleep >= 8) sleepDaysMet++;

        // Documentation goal: any entry that day
        if (hasDocumentation) docDaysMet++;

        // Calculate streak (consecutive days with documentation from today)
        if (hasDocumentation && !streakBroken) {
          currentStreak++;
        } else if (!hasDocumentation) {
          streakBroken = true;
        }
      }

      setWeeklyGoals({
        sleepDaysGoal: Math.min(daysInRange, dayKeys.length),
        sleepDaysMet,
        docDaysGoal: Math.min(daysInRange, dayKeys.length),
        docDaysMet,
        streak: currentStreak,
      });

      // Weekly chart data
      const labels = Object.keys(dayMap);
      const displayLabels = daysInRange > 14
        ? labels.filter((_, i) => i % Math.ceil(daysInRange / 7) === 0)
        : labels;

      setWeeklyData({
        labels: displayLabels,
        food: labels.map(l => dayMap[l].food || 0),
        sleep: labels.map(l => parseFloat(dayMap[l].sleep.toFixed(1)) || 0),
        diapers: labels.map(l => dayMap[l].diapers || 0)
      });

      // Fetch previous period for comparison
      if (timeRange !== 'custom') {
        const prevStart = subDays(start, daysInRange);
        const prevEnd = subDays(start, 1);

        const prevQ = query(
          collection(db, 'events'),
          where('childId', '==', activeChild.childId),
          where('timestamp', '>=', Timestamp.fromDate(prevStart)),
          where('timestamp', '<=', Timestamp.fromDate(endOfDay(prevEnd)))
        );

        const prevSnapshot = await getDocs(prevQ);
        const prevStats: DailyStats = {
          food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
          diapers: 0, supplements: 0,
          feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
        };

        prevSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'feeding' || data.type === 'food') {
            // Parse amount - same logic as main stats
            let amount = 0;
            if (data.amount) {
              const parsed = parseInt(String(data.amount).replace(/[^\d]/g, ''));
              amount = isNaN(parsed) ? 0 : parsed;
            }
            prevStats.food += amount;
            prevStats.foodCount += 1;
          }
          if (data.type === 'diaper') prevStats.diapers += 1;
          if (data.type === 'sleep' && data.duration) {
            prevStats.sleep += (data.duration / 3600);
            prevStats.sleepCount += 1;
          }
          if (data.type === 'supplement' || data.type === 'supplements') prevStats.supplements += 1;
        });

        setPrevWeekStats(prevStats);
      }

    } catch (error) {
      logger.error('ReportsScreen fetchData error:', error);
      // Silent fail - don't show error to user
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, timeRange, activeChild?.childId, customStartDate, customEndDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [activeChild?.childId, timeRange, selectedDate, customStartDate, customEndDate]);

  // Export report with beautiful PDF formatting using expo-print
  const handleExport = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Lock behind premium
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }

    const avgSleep = dailyStats.sleepCount > 0
      ? (dailyStats.sleep / dailyStats.sleepCount).toFixed(1)
      : '0';

    const periodText = timeRange === 'week' ? `${t('reports.misc.period')}: ${t('reports.misc.periodWeek')}` : timeRange === 'month' ? `${t('reports.misc.period')}: ${t('reports.misc.periodMonth')}` : `${t('reports.misc.period')}: ${t('reports.misc.periodDay')}`;
    const dateText = format(selectedDate || new Date(), 'd MMMM yyyy', { locale: he });

    // Generate table rows for daily breakdown (if week or month)
    let dailyRows = '';
    if (timeRange !== 'day' && dayBreakdown) {
      Object.keys(dayBreakdown).forEach(day => {
        const stats = dayBreakdown[day];
        dailyRows += `
          <tr>
            <td style="font-weight: 600;">${day}</td>
            <td>${stats.food > 0 ? `${stats.food} ${t('detailedStats.ml')}` : ''} (${stats.foodCount} ${t('reports.misc.meals')})</td>
            <td>${stats.sleep.toFixed(1)} ${t('reports.units.hours')}</td>
            <td>${stats.diapers}</td>
            <td>${stats.supplements}</td>
          </tr>
        `;
      });
    }

    // Load app logo as base64 for PDF embedding
    let logoBase64 = '';
    try {
      const asset = Asset.fromModule(require('../assets/icon.png'));
      await asset.downloadAsync();
      if (asset.localUri) {
        logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: 'base64',
        });
      }
    } catch (_) { }

    const htmlContent = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('reports.misc.reportTitle')} - ${activeChild?.childName || t('reports.misc.baby')}</title>
    <style>
        body {
            font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
            background-color: #F8FAFC;
            color: #1E293B;
            margin: 0;
            padding: 24px 28px;
            direction: rtl;
        }

        .report-header {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 14px;
            padding: 0 0 10px 0;
            margin-bottom: 14px;
            border-bottom: 3px solid #4F46E5;
        }
        .report-header-logo {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            flex-shrink: 0;
        }
        .report-header-text h1 {
            margin: 0 0 4px 0;
            font-size: 22px;
            font-weight: 800;
            color: #1E293B;
        }
        .report-header-text p {
            margin: 0;
            font-size: 13px;
            color: #64748B;
            font-weight: 600;
        }

        .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #0F172A;
            margin: 18px 0 10px 0;
            padding: 2px 12px 8px 0;
            border-bottom: 1px solid #E2E8F0;
            border-right: 4px solid #4F46E5;
            letter-spacing: -0.3px;
            page-break-after: avoid;
            break-after: avoid;
        }
        .section-title-summary { border-right-color: #334155; }
        .section-title-trends  { border-right-color: #10B981; }
        .section-title-daily   { border-right-color: #3B82F6; }

        .section-block {
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
            margin-bottom: 16px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            border: 1px solid #F1F5F9;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            gap: 12px;
        }

        .icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: #F8FAFC;
            border: 1px solid #F1F5F9;
        }
        .icon-food        { background: #FFF7ED; border-color: #FED7AA; }
        .icon-sleep       { background: #F5F3FF; border-color: #DDD6FE; }
        .icon-diaper      { background: #ECFEFF; border-color: #A5F3FC; }
        .icon-supplements { background: #F0FDF4; border-color: #BBF7D0; }
        .icon-trends      { background: #F0FDF4; border-color: #BBF7D0; }

        h3 {
            margin: 0;
            font-size: 16px;
            color: #334155;
            font-weight: 700;
        }

        .stat-main {
            font-size: 28px;
            font-weight: 800;
            color: #0F172A;
            margin-bottom: 4px;
            display: flex;
            align-items: baseline;
            gap: 6px;
        }

        .stat-unit {
            font-size: 13px;
            color: #64748B;
            font-weight: 600;
        }

        .stat-sub {
            font-size: 13px;
            color: #64748B;
            font-weight: 600;
            background: #F8FAFC;
            padding: 5px 10px;
            border-radius: 6px;
            display: inline-block;
            margin-bottom: 10px;
        }

        .details-list {
            display: flex;
            flex-direction: column;
            gap: 7px;
            padding-top: 10px;
            border-top: 1px dashed #E2E8F0;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            color: #475569;
        }

        .detail-value {
            font-weight: 700;
            color: #1E293B;
            background: #F1F5F9;
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 12px;
        }

        .trends-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-top: 14px;
        }

        .trend-card {
            background: #F8FAFC;
            padding: 12px;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            border: 1px solid #F1F5F9;
        }

        .trend-label {
            color: #64748B;
            font-size: 13px;
            font-weight: 600;
        }

        .trend-value {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
        }

        /* Table Styles */
        .data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-top: 12px;
            background: white;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid #E2E8F0;
        }

        .data-table th {
            background: #F8FAFC;
            color: #475569;
            font-weight: 700;
            text-align: right;
            padding: 10px 12px;
            border-bottom: 2px solid #E2E8F0;
            font-size: 13px;
        }

        .data-table td {
            padding: 9px 12px;
            border-bottom: 1px solid #F1F5F9;
            color: #1E293B;
            font-size: 13px;
        }

        .data-table tr:last-child td {
            border-bottom: none;
        }

        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 14px;
            border-top: 1px solid #E2E8F0;
            color: #94A3B8;
            font-size: 13px;
            font-weight: 600;
        }

        .brand {
            font-weight: 800;
            color: #4F46E5;
            font-size: 14px;
        }

        /* Goals styles */
        .goals-container {
            display: flex;
            gap: 14px;
            margin-bottom: 16px;
        }

        .goal-item {
            flex: 1;
            background: white;
            padding: 16px;
            border-radius: 16px;
            text-align: center;
            border: 1px solid #F1F5F9;
        }

        .goal-circle {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #EEF2FF;
            color: #4F46E5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 800;
            margin: 0 auto 10px auto;
            border: 3px solid #DFE7FF;
        }
    </style>
</head>
<body>

    <div class="report-header">
        ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" class="report-header-logo" />` : ''}
        <div class="report-header-text">
            <h1>${t('reports.misc.reportTitle')} - ${activeChild?.childName || t('reports.misc.baby')}</h1>
            <p>${dateText} | ${periodText}</p>
        </div>
    </div>

    <!-- Goals & Consistency -->
    <div class="section-title">{t('reports.sections.consistencyGoals')}</div>
    <div class="goals-container">
        <div class="goal-item">
            <div class="goal-circle">${weeklyGoals.streak}</div>
            <h3 style="margin-bottom: 4px;">{t('reports.sections.trackingStreak')}</h3>
            <span style="color:#64748B; font-size:14px;">{t('reports.sections.consecutiveDays')}</span>
        </div>
        <div class="goal-item">
            <div class="goal-circle" style="background:#F0FDF4; color:#16A34A; border-color:#DCFCE7;">
                ${weeklyGoals.sleepDaysMet}/${weeklyGoals.sleepDaysGoal}
            </div>
            <h3 style="margin-bottom: 4px;">{t('reports.goals.sleepGoals')}</h3>
            <span style="color:#64748B; font-size:14px;">${t('reports.goals.daysOver8Hours')}</span>
        </div>
        <div class="goal-item">
            <div class="goal-circle" style="background:#FFF7ED; color:#EA580C; border-color:#FFEDD5;">
                ${weeklyGoals.docDaysMet}/${weeklyGoals.docDaysGoal}
            </div>
            <h3 style="margin-bottom: 4px;">{t('reports.goals.trackingGoals')}</h3>
            <span style="color:#64748B; font-size:14px;">{t('reports.goals.dailyJournalDays')}</span>
        </div>
    </div>

    <div class="section-title section-title-summary">{t('reports.sections.overallSummary')}</div>
    <div class="grid">
        <!-- Feeding Card -->
        <div class="card">
            <div class="card-header">
                <div class="icon icon-food"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div>
                <h3>{t('reports.sections.nutritionFeeding')}</h3>
            </div>
            <div class="stat-main">${dailyStats.foodCount} <span class="stat-unit">{t('reports.sections.totalMeals')}</span></div>
            <div class="stat-sub">${t('reports.misc.totalAmount')}: ${dailyStats.food} ${t('detailedStats.ml')}</div>
            
            <div class="details-list">
                <div class="detail-item">
                    <span>{t('reports.feeding.formulaPumped')}</span>
                    <span class="detail-value">${dailyStats.feedingTypes.bottle} ${t('reports.misc.meals')}</span>
                </div>
                <div class="detail-item">
                    <span>{t('reports.feeding.directBreastfeeding')}</span>
                    <span class="detail-value">${dailyStats.feedingTypes.breast} ${t('reports.misc.meals')}</span>
                </div>
                <div class="detail-item">
                    <span>{t('reports.feeding.solids')}</span>
                    <span class="detail-value">${dailyStats.feedingTypes.solids} ${t('reports.misc.meals')}</span>
                </div>
            </div>
        </div>

        <!-- Sleep Card -->
        <div class="card">
            <div class="card-header">
                <div class="icon icon-sleep"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></div>
                <h3>{t('reports.sections.sleepRest')}</h3>
            </div>
            <div class="stat-main">${dailyStats.sleep.toFixed(1)} <span class="stat-unit">{t('reports.sections.cumulativeSleepHours')}</span></div>
            <div class="stat-sub">${t('reports.misc.avgPerNap')}: ${avgSleep} ${t('reports.units.hours')}</div>
            
            <div class="details-list">
                <div class="detail-item">
                    <span>{t('reports.sleep.longestNap')}</span>
                    <span class="detail-value">${timeInsights?.longestSleep || 0} ${t('reports.units.hours')}</span>
                </div>
                <div class="detail-item">
                    <span>{t('reports.sleep.idealDay')}</span>
                    <span class="detail-value">${timeInsights?.bestSleepDay || '-'}</span>
                </div>
                <div class="detail-item">
                    <span>{t('reports.sleep.avgBedtime')}</span>
                    <span class="detail-value">${timeInsights?.avgSleepTime || '-'}</span>
                </div>
            </div>
        </div>

        <!-- Diapers Card -->
        <div class="card">
            <div class="card-header">
                <div class="icon icon-diaper"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0891B2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
                <h3>{t('reports.sections.diaperingHygiene')}</h3>
            </div>
            <div class="stat-main">${dailyStats.diapers} <span class="stat-unit">{t('reports.sections.diaperChanges')}</span></div>
            <div class="stat-sub">{t('reports.sections.normalTracking')}</div>
        </div>

        <!-- Supplements Card -->
        <div class="card">
            <div class="card-header">
                <div class="icon icon-supplements"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
                <h3>{t('reports.sections.supplementsMeds')}</h3>
            </div>
            <div class="stat-main">${dailyStats.supplements} <span class="stat-unit">{t('reports.sections.dosesGiven')}</span></div>
            <div class="stat-sub">{t('reports.sections.perParentTracking')}</div>
        </div>
    </div>

    <!-- Analytics & Comparisons -->
    ${comparison && (comparison.sleepChange !== 0 || comparison.feedingChange !== 0 || comparison.diaperChange !== 0) ? `
    <div class="section-block">
    <div class="section-title section-title-trends">{t('reports.sections.weeklyTrends')}</div>
    <div class="card">
        <div class="card-header">
            <div class="icon icon-trends"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
            <h3>{t('reports.comparison.previousPeriod')}</h3>
        </div>
        <p style="color:#64748B; margin-top:0; font-size:16px;">{t('reports.comparison.patternDetection')}</p>
        
        <div class="trends-grid">
            <div class="trend-card" style="border-top: 4px solid ${comparison.sleepChange > 0 ? '#10B981' : comparison.sleepChange < 0 ? '#EF4444' : '#CBD5E1'};">
                <span class="trend-label">{t('reports.sections.sleepRest')}</span>
                <span class="trend-value" style="color: ${comparison.sleepChange > 0 ? '#10B981' : comparison.sleepChange < 0 ? '#EF4444' : '#1E293B'}">
                    ${comparison.sleepChange > 0 ? '+' : ''}${comparison.sleepChange}%
                </span>
            </div>
            
            <div class="trend-card" style="border-top: 4px solid ${comparison.feedingChange > 0 ? '#10B981' : comparison.feedingChange < 0 ? '#EF4444' : '#CBD5E1'};">
                <span class="trend-label">{t('reports.sections.feedingAmounts')}</span>
                <span class="trend-value" style="color: ${comparison.feedingChange > 0 ? '#10B981' : comparison.feedingChange < 0 ? '#EF4444' : '#1E293B'}">
                    ${comparison.feedingChange > 0 ? '+' : ''}${comparison.feedingChange}%
                </span>
            </div>
            
            <div class="trend-card" style="border-top: 4px solid ${comparison.diaperChange > 0 ? '#10B981' : comparison.diaperChange < 0 ? '#EF4444' : '#CBD5E1'};">
                <span class="trend-label">{t('reports.sections.diaperChanges')}</span>
                <span class="trend-value" style="color: ${comparison.diaperChange > 0 ? '#10B981' : comparison.diaperChange < 0 ? '#EF4444' : '#1E293B'}">
                    ${comparison.diaperChange > 0 ? '+' : ''}${comparison.diaperChange}%
                </span>
            </div>
        </div>
    </div>
    </div>
    ` : ''}

    <!-- Daily Breakdown Table -->
    ${dailyRows ? `
    <div class="section-block">
    <div class="section-title section-title-daily">{t('reports.sections.dailyBreakdown')}</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>{t('reports.dates.date')}</th>
                <th>{t('reports.charts.feedingAmountMeals')}</th>
                <th>{t('reports.charts.sleepHours')}</th>
                <th>{t('reports.metrics.diapers')}</th>
                <th>{t('reports.metrics.supplements')}</th>
            </tr>
        </thead>
        <tbody>
            ${dailyRows}
        </tbody>
    </table>
    </div>
    ` : ''}

    <div class="footer">
        ${t('reports.misc.generatedBy')} <span class="brand">Calmino</span>
        <br>
        <span style="font-weight:400; font-size:14px; margin-top:8px; display:block;">{t('reports.share.dataDisclaimer')}</span>
    </div>

</body>
</html>
    `;

    try {
      // 1. Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // 2. Share the generated PDF file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `דוח מערכת - ${activeChild?.childName || t('reports.misc.baby')}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert(t('common.error'), t('reports.share.notSupported'));
      }
    } catch (error) {
      logger.error('Failed to generate/share PDF report:', error);
      // Use toast instead of Alert
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast({ message: t('reports.share.cannotShare'), type: 'error' });
      }
    }
  };

  // Calculate comparison
  const comparison: WeekComparison | null = useMemo(() => {
    if (!prevWeekStats) return null;
    return {
      sleepChange: prevWeekStats.sleep > 0
        ? Math.round((dailyStats.sleep - prevWeekStats.sleep) / prevWeekStats.sleep * 100)
        : 0,
      feedingChange: prevWeekStats.foodCount > 0
        ? Math.round((dailyStats.foodCount - prevWeekStats.foodCount) / prevWeekStats.foodCount * 100)
        : 0,
      diaperChange: prevWeekStats.diapers > 0
        ? Math.round((dailyStats.diapers - prevWeekStats.diapers) / prevWeekStats.diapers * 100)
        : 0,
    };
  }, [dailyStats, prevWeekStats]);

  // Generate AI Insight


  // ========== COMPONENTS ==========

  // ✨ Premium Stat Card with Category Colors, Sparkline & Smart Trends
  const StatCard = ({ icon: Icon, value, label, subValue, change, iconColor, iconBg, accentColor, sparklineData, onPress, neutralTrend }: any) => {
    // Smart trend color: green = positive, red = negative, amber = neutral metric (e.g. diapers), gray = no change
    const getTrendColor = (val: number) => {
      if (neutralTrend) return '#F59E0B'; // Amber - neither good nor bad
      if (val > 0) return '#10B981'; // Green
      if (val < 0) return '#EF4444'; // Red
      return theme.textSecondary;
    };
    const trendColor = change !== undefined && change !== 0 ? getTrendColor(change) : null;

    // Mini sparkline renderer
    const renderSparkline = () => {
      if (!sparklineData || sparklineData.length < 2) return null;
      const max = Math.max(...sparklineData, 1);
      const barWidth = Math.max(2, Math.min(4, (SCREEN_WIDTH - 100) / sparklineData.length / 2));
      return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 20, marginTop: 8, opacity: 0.6 }}>
          {sparklineData.slice(-7).map((val: number, i: number) => (
            <View
              key={i}
              style={{
                width: barWidth,
                height: Math.max(2, (val / max) * 20),
                borderRadius: 1.5,
                backgroundColor: accentColor || theme.textSecondary,
              }}
            />
          ))}
        </View>
      );
    };

    return (
      <TouchableOpacity
        style={[styles.statCard, { backgroundColor: theme.card }]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.statIconWrap, { backgroundColor: iconBg || theme.cardSecondary }]}>
          <Icon size={20} color={iconColor || theme.textSecondary} strokeWidth={1.5} />
        </View>
        <View style={styles.statValueRow}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
          {trendColor && (
            <View style={[styles.trendBadge, { backgroundColor: trendColor + '18' }]}>
              {change > 0 ? (
                <TrendingUp size={11} color={trendColor} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={11} color={trendColor} strokeWidth={2.5} />
              )}
              <Text style={{ fontSize: 10, color: trendColor, fontWeight: '700' }}>
                {Math.abs(change)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        {subValue && <Text style={[styles.statSubValue, { color: theme.textSecondary }]}>{subValue}</Text>}
        {renderSparkline()}
        <ChevronRight size={16} color={theme.textSecondary} style={styles.cardChevron} />
      </TouchableOpacity>
    );
  };

  // Insight Card
  const InsightCard = ({ icon: Icon, title, value, subtitle }: any) => (
    <View style={[styles.insightCard, { backgroundColor: theme.card }]}>
      <View style={[styles.insightIcon, { backgroundColor: theme.cardSecondary }]}>
        <Icon size={18} color={theme.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: theme.textSecondary }]}>{title}</Text>
        <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{value}</Text>
        {subtitle && <Text style={[styles.insightSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
    </View>
  );

  // Tabs
  const TabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.cardSecondary }]}>
      {(['summary', 'insights'] as TabName[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: theme.card }]]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(tab);
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === tab ? theme.textPrimary : theme.textSecondary }]}>
            {tab === 'summary' ? t('reports.tabs.summary') : tab === 'insights' ? t('reports.insights.title') : t('reports.tabs.charts')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // State for single day mode
  const [isSingleDayMode, setSingleDayMode] = useState(false);
  const [activePickerField, setActivePickerField] = useState<'start' | 'end' | null>(null);

  // Temporary dates for modal - prevents continuous fetching while scrolling
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);

  // Sync temp dates when modal opens
  useEffect(() => {
    if (showRangeModal) {
      setTempStartDate(customStartDate);
      setTempEndDate(customEndDate);
    }
  }, [showRangeModal]);

  // Date Range Modal with inline calendar
  const DateRangeModal = () => (
    <Modal visible={showRangeModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.rangeModal, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowRangeModal(false); setActivePickerField(null); }}>
              <X size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('reports.dates.selectDates')}</Text>
            <TouchableOpacity onPress={() => {
              // Commit temp dates to actual state
              if (isSingleDayMode) {
                setCustomStartDate(tempStartDate);
                setCustomEndDate(tempStartDate);
              } else {
                setCustomStartDate(tempStartDate);
                setCustomEndDate(tempEndDate);
              }
              setTimeRange('custom');
              setShowRangeModal(false);
              setActivePickerField(null);
            }}>
              <Check size={22} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {/* Toggle: Single Day vs Range */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, { backgroundColor: theme.inputBackground }, isSingleDayMode && { backgroundColor: theme.primary }]}
              onPress={() => {
                setSingleDayMode(true);
                setActivePickerField('start');
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.modeToggleText, { color: theme.textSecondary }, isSingleDayMode && { color: theme.card }]}>{t('reports.dates.singleDay')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, { backgroundColor: theme.inputBackground }, !isSingleDayMode && { backgroundColor: theme.primary }]}
              onPress={() => {
                setSingleDayMode(false);
                setActivePickerField('start');
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.modeToggleText, { color: theme.textSecondary }, !isSingleDayMode && { color: theme.card }]}>{t('reports.dates.dateRange')}</Text>
            </TouchableOpacity>
          </View>

          {/* Date Selection Buttons - now showing temp dates */}
          {isSingleDayMode ? (
            <View style={styles.singleDatePicker}>
              <TouchableOpacity
                style={[styles.datePickerBtn, styles.singleDateBtn, { backgroundColor: activePickerField === 'start' ? (isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#EEF2FF') : theme.cardSecondary }]}
                onPress={() => setActivePickerField('start')}
              >
                <Calendar size={18} color={theme.primary} />
                <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                  {format(tempStartDate, 'd MMMM yyyy', { locale: he })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerItem}>
                <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>{t('reports.dates.from')}</Text>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: activePickerField === 'start' ? (isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#EEF2FF') : theme.cardSecondary }]}
                  onPress={() => setActivePickerField('start')}
                >
                  <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                    {format(tempStartDate, 'd/M/yy')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerItem}>
                <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>{t('reports.dates.to')}</Text>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: activePickerField === 'end' ? (isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#EEF2FF') : theme.cardSecondary }]}
                  onPress={() => setActivePickerField('end')}
                >
                  <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                    {format(tempEndDate, 'd/M/yy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Inline Calendar - uses temp dates to avoid continuous fetching */}
          {activePickerField && (
            <View style={styles.inlineCalendarContainer}>
              <DateTimePicker
                value={activePickerField === 'start' ? tempStartDate : tempEndDate}
                mode="date"
                display="inline"
                onChange={(event, date) => {
                  if (date) {
                    if (activePickerField === 'start') {
                      setTempStartDate(date);
                      if (!isSingleDayMode && date > tempEndDate) {
                        setTempEndDate(date);
                      }
                    } else {
                      setTempEndDate(date);
                    }
                  }
                }}
                maximumDate={activePickerField === 'start' ? (isSingleDayMode ? new Date() : tempEndDate) : new Date()}
                minimumDate={activePickerField === 'end' ? tempStartDate : undefined}
                locale="he"
                themeVariant="light"
                accentColor="#6366F1"
                style={styles.inlineCalendar}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const FeedingPieChart = () => {
    const total = dailyStats.feedingTypes.bottle + dailyStats.feedingTypes.breast + dailyStats.feedingTypes.pumping + dailyStats.feedingTypes.solids;
    if (total === 0) return null;

    const items = [
      { name: 'בקבוק 🍼', value: dailyStats.feedingTypes.bottle, color: '#818CF8' },
      { name: 'הנקה 🤱', value: dailyStats.feedingTypes.breast, color: '#A78BFA' },
      { name: 'שאיבה 🥛', value: dailyStats.feedingTypes.pumping, color: '#F472B6' },
      { name: 'מוצקים 🥣', value: dailyStats.feedingTypes.solids, color: '#C4B5FD' }
    ].filter(item => item.value > 0);

    // Calculate percentages for the progress bars
    const getPercentage = (value: number) => Math.round((value / total) * 100);

    return (
      <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>{t('reports.feeding.distribution')}</Text>

        <View style={styles.donutContainer}>
          {/* Simple circular indicator */}
          <View style={[styles.donutRing, { borderColor: theme.cardSecondary }]}>
            <Text style={[styles.donutTotal, { color: theme.textPrimary }]}>{total}</Text>
            <Text style={[styles.donutLabel, { color: theme.textSecondary }]}>{t('reports.misc.total')}</Text>
          </View>

          {/* Legend with progress bars */}
          <View style={styles.donutLegend}>
            {items.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={styles.legendHeader}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendName, { color: theme.textSecondary }]}>{item.name}</Text>
                  <Text style={[styles.legendValue, { color: theme.textPrimary }]}>{item.value}</Text>
                </View>
                <View style={[styles.legendBar, { backgroundColor: theme.cardSecondary }]}>
                  <View style={[styles.legendBarFill, { width: `${getPercentage(item.value)}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: () => '#6B7280',
    labelColor: () => theme.textSecondary,
    barPercentage: 0.6,
    propsForBackgroundLines: { stroke: theme.border, strokeDasharray: '4,4' }
  };

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ✨ Staggered entry animation
  const cardAnims = useRef(
    Array.from({ length: 6 }, () => new RNAnimated.Value(0))
  ).current;
  const cardSlides = useRef(
    Array.from({ length: 6 }, () => new RNAnimated.Value(18))
  ).current;

  useEffect(() => {
    // Reset
    cardAnims.forEach(a => a.setValue(0));
    cardSlides.forEach(a => a.setValue(18));
    // Stagger
    const animations = cardAnims.map((anim, i) =>
      RNAnimated.parallel([
        RNAnimated.timing(anim, { toValue: 1, duration: 350, delay: i * 60, useNativeDriver: true }),
        RNAnimated.timing(cardSlides[i], { toValue: 0, duration: 350, delay: i * 60, useNativeDriver: true }),
      ])
    );
    RNAnimated.parallel(animations).start();
  }, [loading]);

  const AnimatedCard = ({ index, children }: { index: number; children: React.ReactNode }) => (
    <RNAnimated.View style={{
      width: (SCREEN_WIDTH - 52) / 2,
      opacity: cardAnims[Math.min(index, 5)],
      transform: [{ translateY: cardSlides[Math.min(index, 5)] }],
    }}>
      {children}
    </RNAnimated.View>
  );

  // Summary Tab
  const SummaryTab = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Stats Grid */}
      <View
        style={[styles.statsGrid, { position: 'relative' }]}
      >
        {statsOrder.map((key, idx) => {
          if (key === 'food') return (
            <AnimatedCard key="food" index={idx}>
              <StatCard
                icon={Utensils}
                value={dailyStats.foodCount}
                label={t('reports.metrics.feeding')}
                subValue={dailyStats.food > 0 ? `${dailyStats.food} ${t('detailedStats.ml')}` : (dailyStats.foodCount > 0 ? `${dailyStats.foodCount} ${t('reports.misc.meals')}` : undefined)}
                change={comparison?.feedingChange}
                accentColor="#F59E0B"
                iconColor="#F59E0B"
                iconBg={isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'}
                sparklineData={weeklyData.food}
                onPress={() => isPremium ? setSelectedMetric('food') : setShowPaywall(true)}
              />
            </AnimatedCard>
          );
          if (key === 'sleep') return (
            <AnimatedCard key="sleep" index={idx}>
              <StatCard
                icon={Moon}
                value={dailyStats.sleep > 0 ? dailyStats.sleep.toFixed(1) : (dailyStats.sleepCount > 0 ? `${dailyStats.sleepCount}` : '—')}
                label={dailyStats.sleep > 0 ? t('reports.charts.sleepHours') : (dailyStats.sleepCount > 0 ? t('reports.charts.naps') : t('reports.charts.sleepHours'))}
                subValue={dailyStats.sleep > 0 && dailyStats.sleepCount > 0 ? `${dailyStats.sleepCount} ${t('reports.misc.naps')}` : undefined}
                change={comparison?.sleepChange}
                accentColor="#6366F1"
                iconColor="#6366F1"
                iconBg={isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)'}
                sparklineData={weeklyData.sleep}
                onPress={() => isPremium ? setSelectedMetric('sleep') : setShowPaywall(true)}
              />
            </AnimatedCard>
          );
          if (key === 'diapers') return (
            <AnimatedCard key="diapers" index={idx}>
              <StatCard
                icon={Droplets}
                value={dailyStats.diapers}
                label={t('reports.metrics.diapers')}
                change={comparison?.diaperChange}
                accentColor="#0EA5E9"
                iconColor="#0EA5E9"
                iconBg={isDarkMode ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)'}
                sparklineData={weeklyData.diapers}
                neutralTrend
                onPress={() => isPremium ? setSelectedMetric('diapers') : setShowPaywall(true)}
              />
            </AnimatedCard>
          );
          if (key === 'supplements') return (
            <AnimatedCard key="supplements" index={idx}>
              <StatCard
                icon={Pill}
                value={dailyStats.supplements}
                label={t('reports.metrics.supplements')}
                accentColor="#EC4899"
                iconColor="#EC4899"
                iconBg={isDarkMode ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)'}
                onPress={() => isPremium ? setSelectedMetric('supplements') : setShowPaywall(true)}
              />
            </AnimatedCard>
          );
          return null;
        })}

        {/* Growth Cube */}
        <AnimatedCard index={4}>
          {renderLockedSection(
            <GrowthStatCube
              childId={activeChild?.childId}
              onPress={() => setShowGrowthScreen(true)}
            />,
            true
          )}
        </AnimatedCard>

        {/* History Cube */}
        <AnimatedCard index={5}>
          {renderLockedSection(
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: theme.card }]}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconWrap, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                <Clock size={20} color="#3B82F6" strokeWidth={1.5} />
              </View>

              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: theme.textPrimary, fontSize: 20 }]}>{t('reports.history.journal')}</Text>
              </View>

              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('reports.history.title')}</Text>
              <Text style={[styles.statSubValue, { color: theme.textTertiary }]}>{t('reports.history.fullTimeline')}</Text>

              <ChevronRight size={16} color={theme.textTertiary} style={styles.cardChevron} />
            </TouchableOpacity>,
            true
          )}
        </AnimatedCard>

        <TouchableOpacity style={styles.editStatsBtn} onPress={() => setShowStatsEdit(true)}>
          <Edit2 size={16} color={theme.textSecondary} />
          <Text style={[styles.editStatsText, { color: theme.textSecondary }]}>{t('stats.editOrder')}</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Comparison - Enhanced */}
      {renderLockedSection(
        <View style={[styles.comparisonSection, { backgroundColor: theme.card }]}>
          <View style={styles.goalsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {timeRange === 'day' ? t('stats.comparison.yesterday') : timeRange === 'month' ? t('stats.comparison.lastMonth') : t('stats.comparison.lastWeek')}
            </Text>
          </View>

          <View style={styles.comparisonGrid}>
            {/* Sleep Comparison */}
            <View style={styles.comparisonItem}>
              <View style={[styles.comparisonIconWrap, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
                <Moon size={16} color="#6366F1" strokeWidth={2} />
              </View>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>{t('reports.metrics.sleep')}</Text>
              <Text style={[styles.comparisonValue, {
                color: comparison?.sleepChange !== undefined && comparison.sleepChange !== 0
                  ? (comparison.sleepChange > 0 ? '#10B981' : '#EF4444')
                  : theme.textSecondary
              }]}>
                {comparison?.sleepChange !== undefined && comparison.sleepChange !== 0
                  ? (comparison.sleepChange >= 0 ? '+' : '') + comparison.sleepChange + '%'
                  : '—'}
              </Text>
              {comparison?.sleepChange !== undefined && comparison.sleepChange !== 0 && (
                <View style={[styles.comparisonBar, { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)' }]}>
                  <View style={[styles.comparisonBarFill, { width: `${Math.min(100, Math.abs(comparison.sleepChange))}%`, backgroundColor: '#6366F1' }]} />
                </View>
              )}
            </View>

            {/* Food Comparison */}
            <View style={styles.comparisonItem}>
              <View style={[styles.comparisonIconWrap, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }]}>
                <Utensils size={16} color="#F59E0B" strokeWidth={2} />
              </View>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>{t('reports.metrics.feeding')}</Text>
              <Text style={[styles.comparisonValue, {
                color: comparison?.feedingChange !== undefined && comparison.feedingChange !== 0
                  ? (comparison.feedingChange > 0 ? '#F59E0B' : '#EF4444')
                  : theme.textSecondary
              }]}>
                {comparison?.feedingChange !== undefined && comparison.feedingChange !== 0
                  ? (comparison.feedingChange >= 0 ? '+' : '') + comparison.feedingChange + '%'
                  : '—'}
              </Text>
              {comparison?.feedingChange !== undefined && comparison.feedingChange !== 0 && (
                <View style={[styles.comparisonBar, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)' }]}>
                  <View style={[styles.comparisonBarFill, { width: `${Math.min(100, Math.abs(comparison.feedingChange))}%`, backgroundColor: '#F59E0B' }]} />
                </View>
              )}
            </View>

            {/* Diapers Comparison */}
            <View style={styles.comparisonItem}>
              <View style={[styles.comparisonIconWrap, { backgroundColor: isDarkMode ? 'rgba(14, 165, 233, 0.15)' : 'rgba(14, 165, 233, 0.1)' }]}>
                <Droplets size={16} color="#0EA5E9" strokeWidth={2} />
              </View>
              <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>{t('reports.metrics.diapers')}</Text>
              <Text style={[styles.comparisonValue, {
                color: comparison?.diaperChange !== undefined && comparison.diaperChange !== 0
                  ? '#10B981'
                  : theme.textSecondary
              }]}>
                {comparison?.diaperChange !== undefined && comparison.diaperChange !== 0
                  ? (comparison.diaperChange >= 0 ? '+' : '') + comparison.diaperChange + '%'
                  : '—'}
              </Text>
              {comparison?.diaperChange !== undefined && comparison.diaperChange !== 0 && (
                <View style={[styles.comparisonBar, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)' }]}>
                  <View style={[styles.comparisonBarFill, { width: `${Math.min(100, Math.abs(comparison.diaperChange))}%`, backgroundColor: '#10B981' }]} />
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Weekly Goals & Streaks - Enhanced */}
      {renderLockedSection(
        <View style={[styles.goalsSection, { backgroundColor: theme.card }]}>
          <View style={styles.goalsSectionHeader}>
            <View style={styles.goalsSectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {timeRange === 'day' ? t('stats.goals.daily') : timeRange === 'month' ? t('stats.goals.monthly') : t('stats.goals.weekly')}
              </Text>
            </View>
          </View>

          {/* Sleep Goal - Blue */}
          <View style={styles.goalItem}>
            <View style={styles.goalItemHeader}>
              <Text style={[styles.goalItemTitle, { color: theme.textPrimary }]}>{t('reports.goals.sleepOver8')}</Text>
              <Text style={[styles.goalItemProgress, { color: '#3B82F6' }]}>
                {weeklyGoals.sleepDaysMet}/{weeklyGoals.sleepDaysGoal}
              </Text>
            </View>
            <View style={[styles.goalProgressBar, { backgroundColor: isDarkMode ? 'rgba(60, 130, 246, 0.2)' : 'rgba(60, 130, 246, 0.1)' }]}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${weeklyGoals.sleepDaysGoal > 0 ? (weeklyGoals.sleepDaysMet / weeklyGoals.sleepDaysGoal) * 100 : 0}%`,
                    backgroundColor: '#3B82F6'
                  }
                ]}
              />
            </View>
          </View>

          {/* Documentation Goal - Green */}
          <View style={styles.goalItem}>
            <View style={styles.goalItemHeader}>
              <Text style={[styles.goalItemTitle, { color: theme.textPrimary }]}>{t('reports.goals.daysWithTracking')}</Text>
              <Text style={[styles.goalItemProgress, { color: '#10B981' }]}>
                {weeklyGoals.docDaysMet}/{weeklyGoals.docDaysGoal}
              </Text>
            </View>
            <View style={[styles.goalProgressBar, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)' }]}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${weeklyGoals.docDaysGoal > 0 ? (weeklyGoals.docDaysMet / weeklyGoals.docDaysGoal) * 100 : 0}%`,
                    backgroundColor: '#10B981'
                  }
                ]}
              />
            </View>
          </View>

          {/* Streak — same visual language as the goal rows above */}
          {weeklyGoals.streak > 0 && (
            <View style={[styles.goalItem, {
              marginTop: 6,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: theme.border,
            }]}>
              <View style={styles.goalItemHeader}>
                {/* Right side: flame icon + label (flex:1 to fill available space) */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Flame size={15} color="#F97316" strokeWidth={2.5} />
                  <Text style={[styles.goalItemTitle, { color: theme.textPrimary }]}>{t('reports.misc.trackingStreak')}</Text>
                </View>
                {/* Left side: count */}
                <Text style={[styles.goalItemProgress, { color: '#F97316', fontWeight: '600' }]}>
                  {weeklyGoals.streak} {weeklyGoals.streak === 1 ? t('reports.units.day') : t('reports.units.days')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );


  // Generate AI Insights
  const aiInsights = useMemo(() => {
    return generateAIInsights({
      dailyStats,
      timeInsights,
      weeklyData,
      prevWeekStats,
      childName: activeChild?.childName,
    }, t);
  }, [dailyStats, timeInsights, weeklyData, prevWeekStats, activeChild?.childName, t]);

  // Premium Insights Tab
  const renderLockedSection = (children: React.ReactNode, compact: boolean = false) => {
    if (isPremium) return children;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowPaywall(true)}
        style={{ overflow: 'hidden', borderRadius: 24, marginTop: 10 }}
      >
        <View style={{ opacity: 0.4 }} pointerEvents="none">
          {children}
        </View>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 100}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', padding: compact ? 12 : 20 }]}
        >
          <View style={{
            backgroundColor: theme.textPrimary,
            paddingVertical: compact ? 8 : 14,
            paddingHorizontal: compact ? 16 : 24,
            borderRadius: 100, // Pill shape
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 8 : 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: compact ? 4 : 6 },
            shadowOpacity: 0.15,
            shadowRadius: compact ? 8 : 12,
            elevation: 0,
            maxWidth: '100%',
          }}>
            <Lock size={compact ? 14 : 18} color={theme.card} strokeWidth={2} />
            <Text
              style={{ color: theme.card, fontWeight: '700', fontSize: compact ? 13 : 16, textAlign: 'center' }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {compact ? t('reports.insights.advanced') : t('reports.insights.unlockAdvanced')}
            </Text>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const InsightsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Insights Section */}
      <View style={styles.sectionTitleRow}>
        <Trophy size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.insights.title')}</Text>
      </View>
      {aiInsights.tips.slice(0, 2).map((tipData, index) => (
        <AITipCard
          key={index}
          tip={tipData.tip}
          category={tipData.category}
          delay={index * 100}
        />
      ))}

      {/* Achievements Section */}
      <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
        <Award size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.sections.achievements')}</Text>
      </View>
      {renderLockedSection(
        <View style={styles.insightsList}>
          <PremiumInsightCard
            icon={Moon}
            title={t('reports.sleep.longestSleep')}
            value={`${timeInsights?.longestSleep || 0} ${t('reports.units.hours')}`}
            color={isDarkMode ? '#fff' : '#000'}
            delay={0}
          />
          <PremiumInsightCard
            icon={Utensils}
            title={t('reports.feeding.biggestFeeding')}
            value={`${timeInsights?.biggestFeeding || 0} ${t('detailedStats.ml')}`}
            color={isDarkMode ? '#fff' : '#000'}
            delay={50}
          />
          <PremiumInsightCard
            icon={Clock}
            title={t('reports.feeding.avgTimeBetween')}
            value={`${timeInsights?.avgFeedingInterval || 0} ${t('reports.units.hours')}`}
            color={isDarkMode ? '#fff' : '#000'}
            delay={100}
          />
        </View>
      )}

      {/* Patterns Section */}
      {aiInsights.patterns.length > 0 && (
        <>
          <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
            <Activity size={16} color="#6366F1" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.sections.patterns')}</Text>
          </View>
          {renderLockedSection(
            <View style={styles.insightsList}>
              {aiInsights.patterns.map((pattern, index) => (
                <PremiumInsightCard
                  key={index}
                  icon={pattern.icon}
                  title={pattern.label}
                  value={pattern.value}
                  color={pattern.color}
                  delay={index * 50}
                />
              ))}
            </View>
          )}
        </>
      )}

      {/* Milestones Section */}
      <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
        <TrendingUp size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stats.goals')}</Text>
      </View>
      {aiInsights.milestones.map((milestone, index) => (
        <MilestoneCard
          key={index}
          title={milestone.title}
          current={milestone.current}
          target={milestone.target}
          unit={milestone.unit}
          delay={index * 100}
        />
      ))}

      {/* Comparison Section */}
      {comparison && (
        <>
          <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
            <BarChart2 size={16} color="#6366F1" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stats.comparison')}</Text>
          </View>
          {renderLockedSection(
            <View style={styles.insightsList}>
              <PremiumInsightCard
                icon={Moon}
                title={t('reports.metrics.sleep')}
                value={`${comparison.sleepChange >= 0 ? '+' : ''}${comparison.sleepChange}%`}
                subtitle={comparison.sleepChange >= 0 ? t('reports.comparison.moreSleep') : t('reports.comparison.lessSleep')}
                trend={comparison.sleepChange >= 0 ? 'up' : 'down'}
                color="#8B5CF6"
                delay={0}
              />
              <PremiumInsightCard
                icon={Utensils}
                title={t('reports.metrics.feeding')}
                value={`${comparison.feedingChange >= 0 ? '+' : ''}${comparison.feedingChange}%`}
                trend={comparison.feedingChange >= 0 ? 'up' : 'down'}
                color="#F59E0B"
                delay={50}
              />
            </View>
          )}
        </>
      )}

      {/* Share Button */}
      <ShareSummaryButton
        dailyStats={dailyStats}
        childName={activeChild?.childName}
      />
    </ScrollView>
  );

  // Charts Tab - Premium Glass Bar Charts
  const ChartsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {weeklyData.sleep.some(v => v > 0) && (
        <GlassBarChartPerfect
          data={weeklyData.sleep}
          labels={weeklyData.labels}
          title={t('reports.charts.sleepInHours')}
          unit={t('detailedStats.hourShort')}
          gradientColors={['#8B5CF6', '#8B5CF620']}
          height={260}
          yAxisSteps={[0, 4, 8, 12, 16]}
        />
      )}

      {weeklyData.food.some(v => v > 0) && (
        <GlassBarChartPerfect
          data={weeklyData.food}
          labels={weeklyData.labels}
          title={t('reports.charts.feedingAmountMeals')}
          unit={t('detailedStats.ml')}
          gradientColors={['#3B82F6', '#3B82F620']}
          height={260}
        />
      )}

      {weeklyData.diapers.some(v => v > 0) && (
        <GlassBarChartPerfect
          data={weeklyData.diapers}
          labels={weeklyData.labels}
          title={t('reports.metrics.diapers')}
          gradientColors={['#10B981', '#10B98120']}
          height={220}
          yAxisSteps={[0, 3, 6, 9, 12]}
        />
      )}
    </ScrollView>
  );

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const mainContent = (
    <View style={styles.container}>
      {/* Enhanced Background - Minimalist Apple Style */}
      <LinearGradient
        colors={isDarkMode
          ? ['#0F0F0F', '#1C1C1E', '#0A0A0A', '#0F0F0F']
          : ['#FAFAFA', '#F7F7F7', '#F3F3F3', '#FAFAFA']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Dot Pattern Texture */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        preserveAspectRatio="none"
      >
        <Defs>
          <Pattern
            id="dotPatternReports"
            patternUnits="userSpaceOnUse"
            width={28}
            height={28}
          >
            <Circle
              cx={14}
              cy={14}
              r={1.5}
              fill={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'}
            />
          </Pattern>
        </Defs>
        <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#dotPatternReports)" />
      </Svg>

      {/* Radial Glow at Top */}
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(79, 70, 229, 0.15)', 'transparent']
          : ['rgba(79, 70, 229, 0.08)', 'transparent']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header - Enhanced */}
      <Animated.View
        entering={ANIMATIONS.fadeInDown(0, 400)}
        style={[styles.header, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', borderBottomColor: theme.border }]}
      >
        <View style={styles.headerTop}>
          <ChildPicker compact />
          <TouchableOpacity
            style={[styles.exportBtn, {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)',
              borderWidth: 1,
              shadowColor: isDarkMode ? '#000' : '#6366F1',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDarkMode ? 0.4 : 0.12,
              shadowRadius: 10,
              elevation: 0,
            }]}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Download size={20} color={isDarkMode ? '#FFF' : theme.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('stats.title')}</Text>

        {/* Time Range Pills */}
        <View style={styles.filterRow}>
          {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.filterPill, { backgroundColor: timeRange === range ? theme.textPrimary : 'transparent', borderColor: theme.border }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(range);
              }}
            >
              <Text style={[styles.filterPillText, { color: timeRange === range ? theme.card : theme.textSecondary }]}>
                {range === 'day' ? t('reports.tabs.daily') : range === 'week' ? t('reports.tabs.weekly') : t('reports.tabs.monthly')}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterPill, { backgroundColor: timeRange === 'custom' ? theme.textPrimary : 'transparent', borderColor: theme.border }]}
            onPress={() => setShowRangeModal(true)}
          >
            <Calendar size={14} color={timeRange === 'custom' ? theme.card : theme.textSecondary} />
            <Text style={[styles.filterPillText, { color: timeRange === 'custom' ? theme.card : theme.textSecondary }]}>{t('settings.custom')}</Text>
          </TouchableOpacity>
        </View>

        {/* Day navigation removed - use custom date picker instead */}

        {/* Custom range display */}
        {timeRange === 'custom' && (
          <TouchableOpacity onPress={() => setShowRangeModal(true)} style={styles.customRangeBtn}>
            <Text style={[styles.customRangeText, { color: theme.textSecondary }]}>
              {format(customStartDate, 'd/M')} - {format(customEndDate, 'd/M')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.textPrimary} />
        </View>
      ) : !activeChild?.childId ? (
        <View style={styles.emptyState}>
          <Baby size={48} color={theme.border} strokeWidth={1} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('empty.noChild')}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <SummaryTab />
        </View>
      )}

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }} maximumDate={new Date()} />
      )}
      {showStartPicker && (
        <DateTimePicker value={customStartDate} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); if (d) setCustomStartDate(d); }} maximumDate={customEndDate} />
      )}
      {showEndPicker && (
        <DateTimePicker value={customEndDate} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); if (d) setCustomEndDate(d); }} minimumDate={customStartDate} maximumDate={new Date()} />
      )}

      <DateRangeModal />

      <StatsEditModal
        visible={showStatsEdit}
        onClose={() => setShowStatsEdit(false)}
        currentOrder={statsOrder}
        onOrderChange={setStatsOrder}
      />

      <GrowthModal
        visible={showGrowthModal}
        onClose={() => setShowGrowthModal(false)}
        childId={activeChild?.childId}
      />

      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="reports_screen_blur"
      />

      <DynamicPromoModal
        currentScreenName="Reports"
        onNavigateToPaywall={() => setShowPaywall(true)}
      />

      {/* History Log Modal */}
      <Modal visible={showHistoryModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.historyModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.historyHeader, { borderColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={[styles.closeButton, { backgroundColor: theme.cardSecondary }]}>
              <X size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.historyModalTitle, { color: theme.textPrimary }]}>{t('reports.history.fullHistory')}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <DailyTimeline
              childId={activeChild?.childId}
              showOnlyToday={false}
              preloadedEvents={allEvents}
              useGrouping={true}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );

  return (
    <>
      {mainContent}

      {/* Detailed Stats Modal */}
      <Modal
        visible={!!selectedMetric}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMetric(null)}
      >
        {selectedMetric && (
          <DetailedStatsScreen
            onClose={() => setSelectedMetric(null)}
            metricType={selectedMetric}
            childId={activeChild?.childId || ''}
            initialTimeRange={timeRange}
          />
        )}
      </Modal>

      {/* Growth Screen Modal - PageSheet for Blur Effect */}
      <Modal
        visible={showGrowthScreen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGrowthScreen(false)}
      >
        <DetailedGrowthScreen
          onClose={() => setShowGrowthScreen(false)}
          childId={activeChild?.childId || ''}
          ageInMonths={babyAgeMonths}
          gender={baby?.gender || 'boy'}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', textAlign: 'right', marginBottom: 14 },
  exportBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Filters
  filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  filterPillText: { fontSize: 13, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  dateText: { fontSize: 14, fontWeight: '500' },
  customRangeBtn: { alignSelf: 'center', marginBottom: 12 },
  customRangeText: { fontSize: 13 },

  // Tabs
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },

  // Content
  tabContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 140 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },

  // Stats Grid - 2x2 Layout
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, justifyContent: 'space-between' },
  editStatsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4 },
  editStatsText: { fontSize: 13 },
  statCard: { width: '100%', minHeight: 150, padding: 16, borderRadius: 20, alignItems: 'flex-end', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  statSubValue: { fontSize: 11, marginTop: 2 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cardChevron: { position: 'absolute', left: 10, top: '50%', marginTop: -8 },

  // Insights
  sectionTitle: { fontSize: 16, fontWeight: '600', textAlign: 'right', marginBottom: 12 },
  insightsList: { gap: 10 },
  insightCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightContent: { flex: 1, alignItems: 'flex-end' },
  insightTitle: { fontSize: 12, marginBottom: 2 },
  insightValue: { fontSize: 18, fontWeight: '700' },
  insightSubtitle: { fontSize: 11, marginTop: 2 },

  // Quick Stats
  quickStatsCard: { borderRadius: 14, padding: 16, marginTop: 8 },
  quickStatsRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  quickStatItem: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: 24, fontWeight: '700' },
  quickStatLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  quickStatDivider: { width: 1, height: 36, marginHorizontal: 16 },

  // Charts
  chartCard: { borderRadius: 14, padding: 14, marginBottom: 14 },
  chartTitle: { fontSize: 15, fontWeight: '600', textAlign: 'right', marginBottom: 12 },
  chart: { borderRadius: 10, alignSelf: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  rangeModal: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  datePickerRow: { flexDirection: 'row-reverse', gap: 16 },
  datePickerItem: { flex: 1 },
  datePickerLabel: { fontSize: 12, marginBottom: 8, textAlign: 'right' },
  datePickerBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  datePickerValue: { fontSize: 16, fontWeight: '600' },
  modeToggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  modeToggleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  modeToggleText: { fontSize: 14, fontWeight: '600' },
  singleDatePicker: { alignItems: 'center' },
  singleDateBtn: { flexDirection: 'row', gap: 10, paddingVertical: 14, paddingHorizontal: 20 },
  inlineCalendarContainer: { marginTop: 16, alignItems: 'center' },
  inlineCalendar: { width: '100%', height: 320 },

  // Donut Chart
  donutContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20, paddingVertical: 8 },
  donutRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontSize: 22, fontWeight: '700' },
  donutLabel: { fontSize: 11 },
  donutLegend: { flex: 1, gap: 12 },
  legendItem: { gap: 6 },
  legendHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { fontSize: 13, flex: 1 },
  legendValue: { fontSize: 14, fontWeight: '600' },
  legendBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  legendBarFill: { height: '100%', borderRadius: 2 },
  sectionTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },

  // Goals Section
  goalsSection: { borderRadius: 20, padding: 20, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 },
  goalsSectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 16 },
  goalItem: { marginBottom: 16 },
  goalItemHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  goalIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalItemTitle: { flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  goalItemProgress: { fontSize: 12 },
  goalProgressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 4 },



  historyButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
  historyIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  historySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  historyModalContainer: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  historyModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  streakBadge: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginTop: 8 },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: 13, fontWeight: '600' },
  streakSimple: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },

  // Comparison Section
  comparisonSection: { borderRadius: 20, padding: 20, marginTop: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 },
  comparisonGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8 },
  comparisonItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  comparisonIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  comparisonLabel: { fontSize: 12, marginBottom: 4 },
  comparisonValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comparisonValue: { fontSize: 18, fontWeight: '700' },
  comparisonBar: { width: '80%', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  comparisonBarFill: { height: '100%', borderRadius: 2 },

  // Growth Section
  growthSection: { borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 0 },
  growthGrid: { flexDirection: 'row-reverse', justifyContent: 'space-around', gap: 12 },
  growthItem: { alignItems: 'center', flex: 1 },
  growthValue: { fontSize: 22, fontWeight: '700' },
  growthLabel: { fontSize: 12, marginTop: 4 },

  // Premium Streak Badge
  streakBadgePremium: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, alignSelf: 'center' },
  streakIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  streakTextWrap: { alignItems: 'center' },
  streakNumber: { fontSize: 22, fontWeight: '800' },
  streakDaysLabel: { fontSize: 11, fontWeight: '500', marginTop: -2 },
});