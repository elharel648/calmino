import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ScrollView, Share } from 'react-native';
import { Utensils, Moon, Layers, ChevronDown, ChevronUp, X, FileText, Pill, AlertCircle, RefreshCw, Sparkles } from 'lucide-react-native';
import { getRecentHistory, deleteEvent } from '../services/firebaseService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFamily } from '../hooks/useFamily';
import Animated from 'react-native-reanimated';
import { ANIMATIONS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../utils/designSystem';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { auth } from '../services/firebaseConfig';
import { TimelineSkeleton } from './Home/SkeletonLoader';
import SwipeableRow from './SwipeableRow';
import { useToast } from '../context/ToastContext';

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
}


const INITIAL_VISIBLE_COUNT = 4;

const DailyTimeline = memo<DailyTimelineProps>(({ refreshTrigger = 0, childId = '', showOnlyToday = false, preloadedEvents, useGrouping = false }) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { family } = useFamily();
  const { showSuccess, showError } = useToast();

  // Get translated TYPE_CONFIG
  const TYPE_CONFIG = {
    food: {
      icon: Utensils,
      color: '#F59E0B',
      label: t('actions.food'),
    },
    sleep: {
      icon: Moon,
      color: '#8B5CF6',
      label: t('actions.sleep'),
    },
    diaper: {
      icon: Layers,
      color: '#10B981',
      label: t('actions.diaper'),
    },
    supplements: {
      icon: Pill,
      color: '#EC4899',
      label: t('actions.supplements'),
    },
    custom: {
      icon: FileText,
      color: '#8B5CF6',
      label: t('actions.custom'),
    },
    teeth: {
      icon: Sparkles,
      color: '#8B5CF6',
      label: 'שיניים',
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
          return eventDate.getDate() === today.getDate() &&
            eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear();
        });

      setEvents(mapped);
      setError(null);
    } catch (error: any) {
      if (__DEV__) console.log('Timeline load error:', error);
      const errorMessage = error?.message || t('timeline.loading');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ... (keeping existing handlers)

  // Group events by date
  const groupedEvents = React.useMemo(() => {
    if (!useGrouping || events.length === 0) return null;

    const groups: { [key: string]: TimelineEvent[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    events.forEach(event => {
      const date = new Date(event.timestamp);
      let dateKey = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

      // Check for Today/Yesterday
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'היום';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'אתמול';
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });

    return groups;
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

  const handleShare = async (event: TimelineEvent) => {
    const eventText = `${getEventDetails(event)}\n${getTimeAgo(event.timestamp)}`;
    try {
      await Share.share({ message: eventText });
    } catch (error) {
      showError(t('errors.shareError'));
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

    // For older events, show date
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  // Format event details
  const getEventDetails = (event: TimelineEvent) => {
    if (event.type === 'food') {
      // Show start and end times if available (timerange mode)
      if (event.startTime && event.endTime) {
        return `${event.startTime} → ${event.endTime}`;
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
      // Show start and end times if available (timerange mode)
      if (event.startTime && event.endTime) {
        return `${event.startTime} → ${event.endTime}`;
      }
      // Extract duration from duration field
      if (event.duration && event.duration > 0) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        if (h > 0) {
          return `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        }
        // Don't show "0 דקות" - show sleep label instead
        if (m === 0) {
          return t('timeline.sleep');
        }
        return `${m} דקות`;
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
      // For timerange mode: show total duration in subtext (handled in grouped view separately)
      if (event.startTime && event.endTime && event.duration && !useGrouping) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        let durationText = '';
        if (h > 0) {
          durationText = `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        } else {
          durationText = `${m} דקות`;
        }
        // Add amount/note if exists
        if (event.amount) {
          return `${durationText} • ${event.amount}`;
        }
        if (event.note && event.note.includes(' | ')) {
          const parts = event.note.split(' | ');
          return parts[1] ? `${durationText} • ${parts[1].substring(0, 30)}` : durationText;
        }
        return durationText;
      }
      if (event.subType === 'bottle') {
        // Don't show "לא צוין" - just show bottle label or note
        if (event.note && event.note !== 'לא צוין') return event.note;
        return '';
      }
      if (event.subType === 'breast') return event.note || '';
      if (event.subType === 'solids') return t('tracking.solidsFood');
      if (event.subType === 'pumping') return event.note || t('timeline.pumping');
    } else if (event.type === 'sleep') {
      // For timerange mode: show total duration in subtext (handled in grouped view separately)
      if (event.startTime && event.endTime && event.duration && !useGrouping) {
        const h = Math.floor(event.duration / 3600);
        const m = Math.floor((event.duration % 3600) / 60);
        let durationText = '';
        if (h > 0) {
          durationText = `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
        } else {
          durationText = `${m} דקות`;
        }
        // Add user note if exists
        if (event.note && event.note.includes(' | ')) {
          const parts = event.note.split(' | ');
          return parts[1] ? `${durationText} • ${parts[1].substring(0, 30)}` : durationText;
        }
        return durationText;
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
      return event.subType || '';
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>
        </View>
        <TimelineSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>
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
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>
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
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('timeline.title')}</Text>
          </View>

          {/* Stats Pills */}
          <View style={styles.statsContainer}>
            {Object.entries(stats).map(([type, count]) => {
              const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
              if (!config) return null; // Skip if type not in config
              const Icon = config.icon;
              return (
                <View key={type} style={[styles.statPill, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.statCount, { color: theme.textPrimary }]}>{count}</Text>
                  <Icon size={11} color={theme.textSecondary} strokeWidth={2.5} />
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
          Object.entries(groupedEvents).map(([dateLabel, groupEvents], groupIndex) => (
            <View key={dateLabel} style={{ marginBottom: 12 }}>
              {/* DATE SEPARATOR - Clean and minimal */}
              {groupIndex > 0 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginVertical: 28,
                  paddingHorizontal: 0
                }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border, opacity: 0.2 }} />
                  <View style={{
                    backgroundColor: theme.cardSecondary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    marginHorizontal: 16,
                  }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, letterSpacing: -0.2 }}>{dateLabel}</Text>
                  </View>
                  <View style={{ flex: 1, height: 1, backgroundColor: theme.border, opacity: 0.2 }} />
                </View>
              )}
              {groupIndex === 0 && (
                <View style={{
                  alignItems: 'flex-end',
                  marginBottom: 20,
                  marginTop: 8,
                }}>
                  <View style={{
                    backgroundColor: theme.cardSecondary,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.textSecondary, letterSpacing: -0.2 }}>{dateLabel}</Text>
                  </View>
                </View>
              )}

              {/* Events for this date */}
              {groupEvents.map((event, index) => {
                const config = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.food;
                const Icon = config.icon;
                const isLast = index === groupEvents.length - 1;
                const details = getEventDetails(event);
                let subtext = getEventSubtext(event);
                
                // For grouped view, format subtext consistently (without date - already in header)
                if (useGrouping) {
                  const isTimerangeEvent = event.startTime && event.endTime;
                  if (isTimerangeEvent && event.duration) {
                    // For timerange events, show only duration (date is in group header)
                    const h = Math.floor(event.duration / 3600);
                    const m = Math.floor((event.duration % 3600) / 60);
                    let durationText = '';
                    if (h > 0) {
                      durationText = `${h} שע' ${m > 0 ? `${m} דק'` : ''}`;
                    } else {
                      durationText = `${m} דקות`;
                    }
                    // Add amount/note if exists, but not date
                    if (event.amount && event.type === 'food') {
                      subtext = `${durationText} • ${event.amount}`;
                    } else if (event.note && event.note.includes(' | ')) {
                      const parts = event.note.split(' | ');
                      subtext = parts[1] ? `${durationText} • ${parts[1].substring(0, 30)}` : durationText;
                    } else {
                      subtext = durationText;
                    }
                  }
                  // For non-timerange events, keep subtext but remove date if present
                  // Date is already shown in the group header, no need to repeat
                }

                return (
                  <Animated.View
                    key={event.id}
                    entering={ANIMATIONS.fadeInDown(ANIMATIONS.stagger(index, 50), 300)}
                  >
                    <SwipeableRow
                      onDelete={() => handleDelete(event.id)}
                      onShare={() => handleShare(event)}
                    >
                      <View style={styles.eventRow} collapsable={false}>
                        {/* Left side: Time */}
                        <View style={styles.leftSection}>
                          <Text style={[styles.time, { color: theme.textPrimary }]}>
                            {event.timestamp.toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </Text>
                          {/* Only show relative time for recent events in grouped view */}
                          {useGrouping && (() => {
                            const now = new Date();
                            const diffMs = now.getTime() - event.timestamp.getTime();
                            const hours = Math.floor(diffMs / (1000 * 60 * 60));
                            // Only show "X hours ago" for events within last 24 hours
                            if (hours < 24 && hours > 0) {
                              return <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{getTimeAgo(event.timestamp)}</Text>;
                            }
                            return null;
                          })()}
                          {!useGrouping && (
                            <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{getTimeAgo(event.timestamp)}</Text>
                          )}
                        </View>

                        {/* Timeline icon + line */}
                        <View style={styles.timelineTrack}>
                          <View style={[styles.timelineIcon, { backgroundColor: config.color + '20' }]}>
                            <Icon size={14} color={config.color} strokeWidth={2} />
                          </View>
                          {/* Line connector */}
                          {!isLast && <View style={[styles.connector, { backgroundColor: theme.border }]} />}
                        </View>

                        {/* Right side: Content */}
                        <View style={styles.eventCardContainer}>
                          <View style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={styles.cardContent}>
                              <View style={styles.eventHeader}>
                                <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{details}</Text>
                              </View>
                              {subtext && (
                                <Text style={[styles.eventSubtext, { color: theme.textSecondary }]}>{subtext}</Text>
                              )}
                            </View>

                            {/* Reporter Badge */}
                            {event.reporterName && (
                              <View style={styles.reporterBadge}>
                                {event.reporterPhotoUrl ? (
                                  <Image 
                                    source={{ uri: event.reporterPhotoUrl }} 
                                    style={styles.reporterAvatar}
                                    onError={() => {
                                      // Image failed to load, will fallback to placeholder
                                    }}
                                  />
                                ) : (
                                  <View style={[styles.reporterAvatarPlaceholder, { backgroundColor: config.color + '30' }]}>
                                    <Text style={[styles.reporterInitial, { color: config.color }]}>
                                      {event.reporterName.charAt(0)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </SwipeableRow>
                  </Animated.View>
                );
              })}
            </View>
          ))
        ) : (
          /* Regular Flat Rendering (Fallback or Today View) */
          visibleEvents.map((event, index) => {
            const config = TYPE_CONFIG[event.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.food;
            const Icon = config.icon;
            const isLast = index === visibleEvents.length - 1;
            const details = getEventDetails(event);
            const subtext = getEventSubtext(event);
            const isRecent = isRecentEvent(event.timestamp);

            return (
              <Animated.View
                key={event.id}
                entering={ANIMATIONS.fadeInDown(ANIMATIONS.stagger(index, 80), 300)}
              >
                <SwipeableRow
                  onDelete={() => handleDelete(event.id)}
                  onShare={() => handleShare(event)}
                >
                  <View style={styles.eventRow} collapsable={false}>
                    {/* Left side: Time + Dot */}
                    <View style={styles.leftSection}>
                      <Text style={[styles.time, { color: theme.textPrimary }]}>
                        {event.timestamp.toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </Text>
                      <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>{getTimeAgo(event.timestamp)}</Text>
                    </View>

                    {/* Timeline icon + line */}
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineIcon, { backgroundColor: config.color + '20' }]}>
                        <Icon size={14} color={config.color} strokeWidth={2} />
                      </View>
                      {/* Line connector */}
                      {!isLast && <View style={[styles.connector, { backgroundColor: theme.border }]} />}
                    </View>

                    {/* Right side: Content */}
                    <View style={styles.eventCardContainer}>
                      <View style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.cardContent}>
                          <View style={styles.eventHeader}>
                            <Text style={[styles.eventTitle, { color: theme.textPrimary }]}>{details}</Text>
                          </View>
                          {subtext && (
                            <Text style={[styles.eventSubtext, { color: theme.textSecondary }]}>{subtext}</Text>
                          )}
                        </View>

                        {/* Reporter Badge - Small avatar showing who reported */}
                        {event.reporterName && (
                          <View style={styles.reporterBadge}>
                            {event.reporterPhotoUrl ? (
                              <Image 
                                source={{ uri: event.reporterPhotoUrl }} 
                                style={styles.reporterAvatar}
                                onError={() => {
                                  // Image failed to load, will fallback to placeholder
                                }}
                              />
                            ) : (
                              <View style={[styles.reporterAvatarPlaceholder, { backgroundColor: config.color + '30' }]}>
                                <Text style={[styles.reporterInitial, { color: config.color }]}>
                                  {event.reporterName.charAt(0)}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
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
            style={[styles.expandButton, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
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
                <ChevronUp size={14} color={theme.textSecondary} strokeWidth={2.5} />
                <Text style={[styles.expandText, { color: theme.textSecondary }]}>{t('timeline.showLess')}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.expandText, { color: theme.textSecondary }]}>{t('timeline.showMore', { count: events.length - INITIAL_VISIBLE_COUNT })}</Text>
                <ChevronDown size={14} color={theme.textSecondary} strokeWidth={2.5} />
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
    marginTop: SPACING.xxxl,
    marginBottom: SPACING.xxxl,
  },

  // Header
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  titleSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  accentLine: {
    width: 3,
    height: 18,
    borderRadius: BORDER_RADIUS.xs,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    gap: SPACING.xs + 2,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  statCount: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Timeline
  timeline: {
    gap: 0,
  },
  timelineGrouped: {
    paddingHorizontal: SPACING.xxxl,
  },
  eventRow: {
    flexDirection: 'row-reverse',
    marginBottom: SPACING.sm + 2,
    alignItems: 'flex-start',
  },
  loadingContainer: {
    padding: SPACING.huge,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorContainer: {
    borderRadius: BORDER_RADIUS.xl,
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
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.sm,
  },
  retryButtonText: {
    ...TYPOGRAPHY.label,
  },

  // Left: Time
  leftSection: {
    width: 56,
    paddingTop: 3,
    alignItems: 'flex-end',
    paddingRight: SPACING.xs,
  },
  time: {
    ...TYPOGRAPHY.labelSmall,
    fontVariant: ['tabular-nums'],
  },
  timeAgo: {
    ...TYPOGRAPHY.captionSmall,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    opacity: 0.7,
  },

  // Center: Timeline
  timelineTrack: {
    width: 36,
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: SPACING.xs,
  },
  timelineIcon: {
    width: 26,
    height: 26,
    borderRadius: BORDER_RADIUS.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.xs,
    zIndex: 2,
    marginTop: SPACING.xs + 2,
  },
  connector: {
    position: 'absolute',
    top: 30,
    width: 1.5,
    height: '100%',
    zIndex: 1,
  },

  // Right: Content - Premium Card Style
  eventCardContainer: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.subtle,
  },
  eventCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 68,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  deleteBtn: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  cardContent: {
    paddingVertical: SPACING.md + 1,
    paddingHorizontal: SPACING.lg,
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
    textAlign: 'right',
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventSubtext: {
    ...TYPOGRAPHY.caption,
    textAlign: 'right',
    marginTop: 2,
    opacity: 0.75,
  },

  // Empty
  emptyCard: {
    padding: SPACING.huge,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    ...TYPOGRAPHY.label,
    marginBottom: SPACING.xs,
  },
  emptyHint: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },

  // Expand
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md + 2,
    borderWidth: 1,
  },
  expandText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },

  // Reporter Badge - Enhanced with glow
  reporterBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    zIndex: 10,
    ...SHADOWS.subtle,
  },
  reporterAvatar: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2.5,
  },
  reporterAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  reporterInitial: {
    ...TYPOGRAPHY.captionSmall,
    fontWeight: '800',
  },
});

export default DailyTimeline;