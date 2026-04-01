import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { Utensils, Moon, ChevronDown, ChevronUp, X, Plus, Pill, AlertCircle, RefreshCw, Sparkles, FileText } from 'lucide-react-native';
import DiaperIcon from './Common/DiaperIcon';
import { CUSTOM_ICON_MAP } from './Home/AddCustomActionModal';
import Svg, { Path } from 'react-native-svg';
import { getRecentHistory, deleteEvent } from '../services/firebaseService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../hooks/useFamily';
import Animated from 'react-native-reanimated';
import { ANIMATIONS, TYPOGRAPHY, SPACING } from '../utils/designSystem';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { auth } from '../services/firebaseConfig';
import { TimelineSkeleton } from './Home/SkeletonLoader';
import SwipeableRow from './SwipeableRow';
import { useToast } from '../context/ToastContext';
import { logger } from '../utils/logger';

// Custom Tooth Icon from QuickActions
const TeethIcon = ({ size, color, strokeWidth = 2 }: { size: number; color: string; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M7.5 22C6.5 22 5.5 21 5.5 19C5.5 15.5 5 12 5 10C5 5.5 8 2 12 2C16 2 19 5.5 19 10C19 12 18.5 15.5 18.5 19C18.5 21 17.5 22 16.5 22C15.5 22 14.5 20.5 14.5 20.5L12 18L9.5 20.5C9.5 20.5 8.5 22 7.5 22Z" />
    <Path d="M9 7C9 7 10.5 8.5 12 8.5C13.5 8.5 15 7 15 7" opacity="0.6" strokeWidth={strokeWidth * 0.8} />
  </Svg>
);

interface TimelineEvent {
  id: string;
  type: 'food' | 'sleep' | 'diaper' | 'supplements' | 'custom' | 'teeth';
  timestamp: Date;
  amount?: string;
  note?: string;
  subType?: string;
  reporterName?: string;
  reporterPhotoUrl?: string;
  toothId?: string;
  toothLabel?: string;
  toothType?: string;
  [key: string]: any;
}

interface DailyTimelineProps {
  refreshTrigger?: number;
  childId?: string; // Accept childId as prop
  showOnlyToday?: boolean;
  preloadedEvents?: any[];
  useGrouping?: boolean;
  onEditEvent?: (event: TimelineEvent) => void;
}


const INITIAL_VISIBLE_COUNT = 4;

const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const DailyTimeline = memo<DailyTimelineProps>(({ refreshTrigger = 0, childId = '', showOnlyToday = false, preloadedEvents, useGrouping = false, onEditEvent }) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { family } = useFamily();
  const { showSuccess, showError } = useToast();

  // Get translated TYPE_CONFIG with theme-aware colors
  const TYPE_CONFIG = {
    food: {
      icon: Utensils,
      color: theme.actionColors.food.accentColor,
      label: t('actions.food'),
    },
    sleep: {
      icon: Moon,
      color: theme.actionColors.sleep.accentColor,
      label: t('actions.sleep'),
    },
    diaper: {
      icon: DiaperIcon,
      color: theme.actionColors.diaper.accentColor,
      label: t('actions.diaper'),
    },
    supplements: {
      icon: Pill,
      color: theme.actionColors.supplements.accentColor,
      label: t('actions.supplements'),
    },
    custom: {
      icon: Plus,
      color: theme.actionColors.custom.accentColor,
      label: t('actions.custom'),
    },
    teeth: {
      icon: TeethIcon,
      color: theme.actionColors.teeth.accentColor,
      label: t('profile.teeth'),
    },
  };

  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // Initialize with preloaded events if provided
  useEffect(() => {
    if (preloadedEvents) {
      // Map preloaded events to ensure correct timestamp type
      const mapped = preloadedEvents.map(e => ({
        ...e,
        timestamp: e.dateObj || (e.timestamp instanceof Date ? e.timestamp : new Date(e.timestamp))
      }));
      setEvents(mapped);
      setLoading(false);
    }
  }, [preloadedEvents]);

  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineHeight, setLineHeight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Per-day "show more" state for grouped/history view
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const EVENTS_PER_DAY = 5;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (childId && !preloadedEvents) {
      loadTimeline();
    } else if (!childId && !preloadedEvents) {
      setEvents([]);
      setLoading(false);
    }
  }, [childId, refreshTrigger, family, preloadedEvents]);

  // Check if event happened in last hour for pulsing effect
  const isRecentEvent = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    return diff < 3600000; // 1 hour in milliseconds
  };

  const loadTimeline = async () => {
    if (!childId) return;
    setLoading(true);
    setError(null);
    try {
      // Check if user is a guest and get historyAccessDays
      const userId = auth.currentUser?.uid;
      const historyAccessDays = userId && family?.members[userId]?.historyAccessDays;

      const history = await getRecentHistory(childId, undefined, historyAccessDays);
      // Map Firebase data directly
      const mapped: TimelineEvent[] = history.map((item: any) => ({
        ...item,
        timestamp: item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp),
      }))
        // Filter for today if requested
        .filter(event => {
          if (!showOnlyToday) return true;
          const eventDate = new Date(event.timestamp);
          const today = new Date();
          const isSameDay = (d1: Date, d2: Date) =>
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
          // Normal check: event started today
          if (isSameDay(eventDate, today)) return true;
          // Overnight sleep: event started yesterday but ended today
          if (event.type === 'sleep' && event.duration && event.duration > 0) {
            const endDate = new Date(eventDate.getTime() + event.duration * 1000);
            if (isSameDay(endDate, today)) return true;
          }
          return false;
        });

      setEvents(mapped);
      setError(null);
    } catch (error: any) {
      logger.log('Timeline load error:', error);
      const errorMessage = error?.message || t('timeline.loading');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ... (keeping existing handlers)

  // Group events by date — returns a sorted array of [label, events] pairs (newest first)
  const groupedEvents = React.useMemo(() => {
    if (!useGrouping || events.length === 0) return null;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const getLabelForDate = (date: Date): string => {
      if (date.toDateString() === today.toDateString()) return t('common.today');
      if (date.toDateString() === yesterday.toDateString()) return t('common.yesterday');
      return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
    };

    // Map: dateString → { label, events, dateObj }
    const map = new Map<string, { label: string; dateObj: Date; events: TimelineEvent[] }>();

    const addToDay = (date: Date, event: TimelineEvent) => {
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(dayKey)) {
        map.set(dayKey, { label: getLabelForDate(date), dateObj: date, events: [] });
      }
      // Avoid duplicates (same event id already in this day)
      const group = map.get(dayKey)!;
      if (!group.events.some(e => e.id === event.id)) {
        group.events.push(event);
      }
    };

    events.forEach(event => {
      const date = new Date(event.timestamp);
      // Always add to the start day
      addToDay(date, event);

      // Overnight sleep: also add to the end day
      if (event.type === 'sleep' && event.duration && event.duration > 0) {
        const endDate = new Date(date.getTime() + event.duration * 1000);
        if (endDate.getDate() !== date.getDate() ||
            endDate.getMonth() !== date.getMonth() ||
            endDate.getFullYear() !== date.getFullYear()) {
          addToDay(endDate, event);
        }
      }
    });

    // Sort groups: newest first
    return Array.from(map.values()).sort(
      (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
    );
  }, [events, useGrouping]);

  // ... (render logic update below) ...


  const handleDelete = async (eventId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      await deleteEvent(eventId);
      setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
      showSuccess(t('common.deletedSuccess'), 3000);
    } catch (error) {
      showError(t('errors.deleteError'));
    }
  };


  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);

    if (seconds < 60) return t('time.now');

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return hours === 1 ? t('time.hourAgo') : t('time.hoursAgo', { count: hours });
    }

    const days = Math.floor(hours / 24);
    if (days === 1) return t('timeline.yesterday');
    if (days < 7) return t('time.daysAgo', { count: days });

    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  const getTimeAgoShort = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);

    // Future events or within last minute
    if (seconds < 60 && seconds > -300) return 'עכשיו';
    // Far future (bad data) — show nothing
    if (seconds <= -300) return '';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} דק'`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} שע'`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'אתמול';
    if (days < 7) return `${days} ימים`;

    // For older events, show date
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  // Format event details
  const getEventDetails = (event: TimelineEvent) => {
    if (event.type === 'food') {
      // Timerange mode: show DURATION only (category is already in the meta line below)
      if (event.startTime && event.endTime && event.duration && event.duration > 0) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        if (h > 0) return `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        if (m > 0) return `${m} דק'`;
        // Very short — show amount if available
        return event.amount || t('timeline.food');
      }
      // Timerange with no duration: show amount/note or generic subtype
      if (event.startTime && event.endTime) {
        return event.amount || event.note || t('timeline.food');
      }
      if (event.subType === 'bottle') {
        // Handle missing amount gracefully
        if (!event.amount || event.amount === 'לא צוין') {
          return t('timeline.bottle');
        }
        return `${t('timeline.bottle')} ${event.amount}`;
      } else if (event.subType === 'breast') {
        return t('timeline.breast');
      } else if (event.subType === 'pumping') {
        return event.amount ? `${t('timeline.pumping')} ${event.amount}` : t('timeline.pumping');
      } else if (event.subType === 'solids') {
        return event.note || t('tracking.solidsFood');
      }
      return event.amount || event.note || t('timeline.food');
    } else if (event.type === 'sleep') {
      // Timerange mode: show DURATION as the primary detail
      if (event.startTime && event.endTime && event.duration && event.duration > 0) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        const s = Math.floor(event.duration % 60);
        if (h > 0) return `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        if (m > 0 && s > 0) return `${m} דק' ו-${s} שנ'`;
        if (m > 0) return `${m} דקות`;
        if (s > 0) return `${s} שניות`;
        return t('timeline.sleep');
      }
      // Timerange with no duration: fallback
      if (event.startTime && event.endTime) {
        return t('timeline.sleep');
      }
      // Extract duration from duration field
      if (event.duration && event.duration > 0) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        const s = Math.floor(event.duration % 60);
        
        if (h > 0) {
          return `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        }
        if (m > 0 && s > 0) {
          return `${m} דק' ו-${s} שנ'`;
        }
        if (m > 0) {
          return `${m} דקות`;
        }
        if (s > 0) {
          return `${s} שניות`;
        }
        return t('timeline.sleep');
      }
      // Handle "שינה חדשה" (new sleep) - show as sleep label
      if (event.note && event.note.includes('שינה חדשה')) {
        return t('timeline.sleep');
      }
      // Try to extract from note
      if (event.note && event.note.includes('משך שינה')) {
        const match = event.note.match(/משך שינה:? (\d+:\d+)/);
        if (match) return match[1];
      }
      return t('timeline.sleep');
    } else if (event.type === 'diaper') {
      if (event.subType === 'pee') return t('diaper.wet');
      if (event.subType === 'poop') return t('diaper.dirty');
      if (event.subType === 'both') return t('tracking.both');
      return 'החלפת חיתול';
    } else if (event.type === 'supplements') {
      if (event.subType === 'vitaminD') return 'ויטמין D';
      if (event.subType === 'iron') return t('timeline.iron');
      if (event.subType === 'probiotic') return t('timeline.probiotic');
      if (event.subType === 'multivitamin') return 'Multivitamin';
      return event.note || t('timeline.supplement');
    } else if (event.type === 'custom') {
      return event.note || 'פעולה מותאמת';
    } else if (event.type === 'teeth') {
      return event.toothLabel || event.note || 'בקעה שן';
    }
    return '';
  };

  const getEventSubtext = (event: TimelineEvent) => {
    if (event.type === 'food') {
      // For timerange mode: duration is already shown in details — only show amount/note here
      if (event.startTime && event.endTime && !useGrouping) {
        if (event.amount) return event.amount;
        if (event.note && event.note.includes(' | ')) {
          const parts = event.note.split(' | ');
          return parts[1] ? parts[1].substring(0, 35) : '';
        }
        return '';
      }
      if (event.subType === 'bottle') {
        // Don't show "לא צוין" - just show bottle label or note
        if (event.note && event.note !== 'לא צוין') return event.note;
        return '';
      }
      if (event.subType === 'breast') {
        // Parse structured note "שמאל: MM:SS | ימין: MM:SS" into readable format
        if (event.note && event.note.includes(' | ')) {
          const parseBreastTime = (timeStr: string): string => {
            const match = timeStr.match(/(\d+):(\d+)/);
            if (!match) return '';
            const mins = parseInt(match[1]);
            const secs = parseInt(match[2]);
            if (mins === 0 && secs < 10) return ''; // threshold: less than 10 seconds = irrelevant
            if (mins === 0) return `${secs} שנ'`;
            return `${mins} דק'`;
          };
          const parts = event.note.split(' | ');
          const rightMatch = parts.find(p => p.includes('ימין:'));
          const leftMatch = parts.find(p => p.includes('שמאל:'));
          const rightVal = rightMatch ? parseBreastTime(rightMatch) : '';
          const leftVal = leftMatch ? parseBreastTime(leftMatch) : '';
          const segments = [
            rightVal ? `ימין ${rightVal}` : '',
            leftVal ? `שמאל ${leftVal}` : '',
          ].filter(Boolean);
          return segments.join(' · ');
        }
        return event.note || '';
      }
      if (event.subType === 'solids') {
        // Note is already shown as the main title — don't repeat as subtext
        return '';
      }
      if (event.subType === 'pumping') return event.note || '';
    } else if (event.type === 'sleep') {
      // For timerange mode: duration is already shown in details — only show user note here
      if (event.startTime && event.endTime && !useGrouping) {
        if (event.note && event.note.includes(' | ')) {
          const parts = event.note.split(' | ');
          return parts[1] ? parts[1].substring(0, 35) : '';
        }
        return '';
      }
      // Handle "שינה חדשה" - don't show as subtext, already in title
      if (event.note && event.note.includes('שינה חדשה')) {
        return '';
      }
      // Extract user note after pipe separator
      if (event.note) {
        if (event.note.includes(' | ')) {
          const parts = event.note.split(' | ');
          return parts[1] ? parts[1].substring(0, 35) : '';
        }
        // If note exists but no pipe (and it's not just "שינה חדשה" or duration-like), show it
        const isDuration = event.note.includes('משך שינה') || event.note.match(/^\d{2}:\d{2} →/);
        return isDuration ? '' : event.note;
      }
      return '';
    } else if (event.type === 'diaper') {
      return event.note || '';
    } else if (event.type === 'custom') {
      return '';
    } else if (event.type === 'teeth') {
      return event.note || '';
    }
    return event.note || '';
  };

  const stats = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const visibleEvents = isExpanded ? events : events.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = events.length > INITIAL_VISIBLE_COUNT;

  // Hide reporter badge when all events share the same reporter
  const uniqueReporters = new Set(events.map(e => e.creatorId || e.userId).filter(Boolean));
  const showReporterBadge = uniqueReporters.size > 1;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
        </View>
        <TimelineSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
        </View>
        <View style={[styles.errorContainer, { backgroundColor: theme.card }]}>
          <AlertCircle size={24} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadTimeline}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={theme.card} />
            <Text style={[styles.retryButtonText, { color: theme.card }]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <FileText size={32} color={theme.textSecondary} strokeWidth={1.5} />
          </View>
          <Text style={[styles.emptyText, { color: theme.textPrimary }]}>{t('timeline.noRecordsToday')}</Text>
          <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
            {t('timeline.emptyHint')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - Only show if NOT in sectioned/grouped mode (e.g. Home Screen) */}
      {!useGrouping && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>

          {/* Stats Pills — inline right of title */}
          <View style={styles.statsContainer}>
            {Object.entries(stats).map(([type, count]) => {
              const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <View key={type} style={[styles.statPill, { backgroundColor: hexToRgba(config.color, isDarkMode ? 0.15 : 0.08) }]}>
                  <Icon size={10} color={config.color} strokeWidth={2.5} />
                  <Text style={[styles.statCount, { color: config.color }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Timeline with Staggered Entry and Growing Line */}
      <View style={[styles.timeline, useGrouping && styles.timelineGrouped]}>
        {/* Grouped Rendering */}
        {useGrouping && groupedEvents ? (
          groupedEvents.map(({ label: dateLabel, events: groupEvents }, groupIndex) => {
            const isDayExpanded = expandedDays[dateLabel] ?? false;
            const visibleDayEvents = isDayExpanded ? groupEvents : groupEvents.slice(0, EVENTS_PER_DAY);
            const hiddenCount = groupEvents.length - EVENTS_PER_DAY;

            return (
              <View key={dateLabel} style={{ marginBottom: 4 }}>
                {/* DATE HEADER */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: groupIndex === 0 ? 8 : 28,
                  marginBottom: 10,
                }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border, opacity: 0.15 }} />
                  <View style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 20,
                    marginHorizontal: 12,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.2 }}>
                      {dateLabel} · {groupEvents.length}
                    </Text>
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border, opacity: 0.15 }} />
                </View>

                {/* Events for this date — limited to EVENTS_PER_DAY unless expanded */}
                {visibleDayEvents.map((event, index) => {
                  const config = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.food;
                  const Icon = (event.type === 'custom' && event.subType && CUSTOM_ICON_MAP[event.subType]) ? CUSTOM_ICON_MAP[event.subType] : config.icon;
                  const details = getEventDetails(event);
                  let subtext = getEventSubtext(event);

                  // For grouped view, format subtext for timerange events
                  if (useGrouping) {
                    const isTimerangeEvent = event.startTime && event.endTime;
                    if (isTimerangeEvent && event.duration) {
                      const h = Math.floor(event.duration / 3600);
                      const m = Math.floor((event.duration % 3600) / 60);
                      let durationText = '';
                      if (h > 0) {
                        durationText = `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
                      } else if (m > 0) {
                        durationText = `${m} דקות`;
                      }
                      if (durationText) {
                        if (event.amount && event.type === 'food') {
                          subtext = `${durationText} • ${event.amount}`;
                        } else if (event.note && event.note.includes(' | ')) {
                          const parts = event.note.split(' | ');
                          subtext = parts[1] ? `${durationText} • ${parts[1].substring(0, 30)}` : durationText;
                        } else {
                          subtext = durationText;
                        }
                      }
                    }
                  }

                  const memberId = event.creatorId || event.userId;
                  const member = family?.members[memberId];
                  const photoUrl = member?.photoURL || event.reporterPhotoUrl;
                  const timeStr = event.timestamp.toLocaleTimeString('he-IL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  });

                  // Build subtitle: show "אוכל · 120מ"ל" when there's extra info
                  // When details IS the label (e.g. "אוכל"), don't repeat it — show time instead
                  const detailsIsJustLabel = details === config.label;
                  const subtitle = subtext
                    ? `${config.label} · ${subtext}`
                    : detailsIsJustLabel
                      ? `${config.label} · ${timeStr}`   // Show category + time so there's useful info
                      : '';            // title has real content (e.g. "בקבוק 120מ"ל") — no need to repeat category

                  return (
                    <Animated.View
                      key={event.id}
                      entering={ANIMATIONS.fadeInDown(ANIMATIONS.stagger(index, 50), 300)}
                    >
                      <SwipeableRow
                        onDelete={() => handleDelete(event.id)}
                      >
                        {/* Simple 3-part RTL row: [time] [content] [icon] */}
                        <TouchableOpacity 
                          activeOpacity={0.7} 
                          onPress={() => onEditEvent?.(event)} 
                          style={[styles.historyRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                        >

                          {/* LEFT (RTL: last in JSX): time */}
                          <Text style={[styles.historyTime, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]} numberOfLines={1} adjustsFontSizeToFit>{timeStr}</Text>

                          {/* CENTER: title + subtitle */}
                          <View style={styles.historyContent}>
                            <Text style={[styles.historyTitle, { color: theme.textPrimary, fontSize: 14, fontWeight: '600', letterSpacing: -0.3 }]} numberOfLines={1}>
                              {details}
                            </Text>
                            {subtitle ? (
                              <Text style={[styles.historySubtext, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)', fontSize: 13, fontWeight: '400', marginTop: 2 }]} numberOfLines={1}>
                                {subtitle}
                              </Text>
                            ) : null}
                          </View>

                          {/* RIGHT (RTL: first in JSX): icon badge */}
                          <View style={[styles.historyIconBadge, { backgroundColor: hexToRgba(config.color, isDarkMode ? 0.15 : 0.1) }]}>
                            <Icon size={17} color={config.color} strokeWidth={2.5} />
                          </View>

                        </TouchableOpacity>
                      </SwipeableRow>
                    </Animated.View>
                  );
                })}

                {/* Show More / Show Less button per day */}
                {groupEvents.length > EVENTS_PER_DAY && (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpandedDays(prev => ({ ...prev, [dateLabel]: !isDayExpanded }));
                    }}
                    style={{
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      marginBottom: 4,
                    }}
                    activeOpacity={0.6}
                  >
                    {isDayExpanded ? (
                      <>
                        <ChevronUp size={14} color={theme.primary} strokeWidth={2.5} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>הצג פחות</Text>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} color={theme.primary} strokeWidth={2.5} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.primary }}>
                          {`עוד ${hiddenCount} רשומות`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          /* Regular Flat Rendering (Fallback or Today View) */
          visibleEvents.map((event, index) => {
            const config = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.food;
            const Icon = (event.type === 'custom' && event.subType && CUSTOM_ICON_MAP[event.subType]) ? CUSTOM_ICON_MAP[event.subType] : config.icon;
            const isLast = index === visibleEvents.length - 1;
            const isFirst = index === 0;
            const details = getEventDetails(event);
            const subtext = getEventSubtext(event);
            const isRecent = isRecentEvent(event.timestamp);

            const timeStr = event.timestamp.toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });

            // Calculate colors for the continuous line
            const prevConfig = isFirst ? null : (TYPE_CONFIG[visibleEvents[index - 1].type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.food);
            const prevColor = prevConfig ? prevConfig.color : 'transparent';
            const bottomColor = isLast ? 'transparent' : config.color;

            // Optional: reporter badge
            const showBadge = showReporterBadge && event.reporterName;
            const reporterInitial = event.reporterName ? event.reporterName.charAt(0) : '';

            return (
              <Animated.View
                key={event.id}
                entering={ANIMATIONS.fadeInDown(ANIMATIONS.stagger(index, 80), 300)}
              >
                <SwipeableRow onDelete={() => handleDelete(event.id)}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => onEditEvent?.(event)} style={styles.elegantEventRow}>
                    
                    {/* FAR RIGHT: TIME BLOCK */}
                    <View style={styles.elegantTimeBlock}>
                      <Text style={[styles.elegantTimeMain, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{timeStr}</Text>
                      <Text style={[styles.elegantTimeAgo, { color: theme.textSecondary }]} numberOfLines={1}>{getTimeAgoShort(event.timestamp)}</Text>
                    </View>

                    {/* MIDDLE RIGHT: TIMELINE TRACK */}
                    <View style={styles.elegantTrack}>
                      <View style={[styles.elegantLineTop, { backgroundColor: isFirst ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') }]} />
                      <View style={[styles.elegantIconWrapper, { backgroundColor: hexToRgba(config.color, isDarkMode ? 0.2 : 0.12) }]}>
                        <Icon size={15} color={config.color} strokeWidth={2.5} />
                      </View>
                      <View style={[styles.elegantLineBottom, { backgroundColor: isLast ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') }]} />
                    </View>

                    {/* LEFT: CARD CONTENT */}
                    <View style={styles.elegantCardContainer}>
                      <View style={[styles.elegantCard, { backgroundColor: theme.card, borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        {/* Color accent strip - right side for RTL */}
                        <View style={[styles.accentStrip, { backgroundColor: config.color }]} />
                        
                        {/* Right side of card: Texts */}
                        <View style={styles.elegantCardTextContainer}>
                          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
                            {details !== config.label ? (
                              <Text style={[styles.elegantCategoryLabel, { color: config.color }]}>{config.label}</Text>
                            ) : null}
                            {isRecent && isFirst && (
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' }} />
                            )}
                          </View>
                          <Text style={[styles.elegantCardTitle, { color: theme.textPrimary }]} numberOfLines={2}>{details}</Text>
                          {subtext ? <Text style={[styles.elegantCardSubtext, { color: theme.textSecondary }]} numberOfLines={3}>{subtext}</Text> : null}
                        </View>

                        {/* Left side: Reporter Badge only */}
                        {showBadge ? (
                          <View style={styles.elegantCardLeft}>
                            <View style={[styles.cardReporterBadge, { borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.8)' }]}>
                              <Text style={[styles.cardReporterText, { color: theme.textPrimary }]}>{reporterInitial}</Text>
                            </View>
                          </View>
                        ) : null}

                      </View>
                    </View>

                  </TouchableOpacity>
                </SwipeableRow>
              </Animated.View>
            );
          })
        )}
      </View>

      {/* Expand */}
      {hasMore && (
        <Animated.View entering={ANIMATIONS.fadeIn(ANIMATIONS.stagger(visibleEvents.length, 80), 300)}>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => {
              setIsExpanded(!isExpanded);
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            activeOpacity={0.6}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.expandText, { color: theme.textSecondary }]}>{t('timeline.showLess')}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.expandText, { color: theme.textSecondary }]}>{t('timeline.showMore', { count: events.length - INITIAL_VISIBLE_COUNT })}</Text>
                <ChevronDown size={14} color={theme.textSecondary} strokeWidth={2} />
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
});

DailyTimeline.displayName = 'DailyTimeline';

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },

  // Header
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statCount: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Timeline — outer margins frame the cards (Law of Proximity)
  timeline: {
    gap: 0,
    paddingHorizontal: SPACING.lg,
  },
  timelineGrouped: {
    paddingHorizontal: SPACING.xxl,
  },
  eventRow: {
    flexDirection: 'row-reverse',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  loadingContainer: {
    padding: SPACING.huge,
    borderRadius: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorContainer: {
    borderRadius: SPACING.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    minHeight: 100,
  },
  errorText: {
    ...TYPOGRAPHY.label,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.md,
    marginTop: SPACING.sm,
  },
  retryButtonText: {
    ...TYPOGRAPHY.label,
  },

  // Left: Time
  leftSection: {
    width: 62,
    paddingTop: 3,
    alignItems: 'flex-end',
    paddingRight: 4,
    flexWrap: 'nowrap',
  },
  time: {
    ...TYPOGRAPHY.labelSmall,
    fontVariant: ['tabular-nums'],
  },
  timeAgo: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    opacity: 0.7,
  },

  // Center: Timeline
  timelineTrack: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 4,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
    marginTop: 6,
  },
  connector: {
    position: 'absolute',
    top: 34,
    bottom: -8,
    width: 2,
    zIndex: 1,
    borderRadius: 1,
  },

  // Right: Content - Premium Card Style
  eventCardContainer: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 0,
  },
  eventCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 48,
    borderWidth: 0.5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: 4,
    borderRadius: 6,
  },
  cardContent: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    marginBottom: 3,
  },
  eventTitle: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'right',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventSubtext: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'right',
    marginTop: 3,
    opacity: 0.55,
  },

  // Empty
  emptyCard: {
    padding: 44,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 0,
    // Floating shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 24,
    elevation: 0,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 0,
  },
  emptyEmoji: {
    ...TYPOGRAPHY.h1,
  },
  emptyText: {
    ...TYPOGRAPHY.label,
    marginBottom: 4,
  },
  emptyHint: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Expand
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  expandText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Reporter Badge - Enhanced with glow
  reporterBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 10,
    // Subtle glow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 0,
  },
  reporterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
  },
  reporterAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  reporterInitial: {
    fontSize: 10,
    fontWeight: '700',
  },

  // ── Grouped / History view ──────────────────────────────────────────────
  historyRow: {
    // RTL: first element in JSX is visually rightmost
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 0,
  },
  historyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
    gap: 3,
  },
  historyTitleRow: {
    // unused — kept for safety
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  historyTypePill: {
    // unused — kept for safety
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  historyTypeText: {
    // unused — kept for safety
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  historySubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    opacity: 0.75,
  },
  historyRight: {
    // unused — kept for safety
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    minWidth: 36,
  },
  historyTime: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    minWidth: 46,
    textAlign: 'left',
  },
  historyAvatar: {
    // unused — kept for safety
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  historyAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  historyAvatarText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // ===== ELEGANT TIMELINE (HOME/FLAT VIEW) =====
  elegantEventRow: {
    flexDirection: 'row-reverse',
    minHeight: 80,
    alignItems: 'stretch',
  },
  elegantTimeBlock: {
    width: 58,
    paddingTop: 16,
    alignItems: 'center',
    paddingLeft: 2,
  },
  elegantTimeMain: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  elegantTimeAgo: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.8,
  },
  elegantTrack: {
    width: 38,
    alignItems: 'center',
  },
  elegantLineTop: {
    width: 1.5,
    flex: 1,
  },
  elegantLineBottom: {
    width: 1.5,
    flex: 1,
  },
  elegantIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4, // connects the lines tightly
  },
  elegantCardContainer: {
    flex: 1,
    paddingVertical: 5, // Gap between rows
    paddingRight: 6,
  },
  elegantCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 0.5,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 62,
    overflow: 'hidden',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 0,
  },
  accentStrip: {
    width: 3.5,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    opacity: 0.7,
  },
  elegantCardTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  elegantCategoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  elegantCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  elegantCardSubtext: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
    opacity: 0.8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  elegantCardLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 12,
  },
  cardReporterBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardReporterText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default DailyTimeline;