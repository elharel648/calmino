import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Moon, Sun, Sparkles, BedDouble } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSleepTimer } from '../../context/SleepTimerContext';
import { getRecentHistory } from '../../services/firebaseService';
import { computeDailyInsight, DailyInsight } from '../../utils/dailyInsight';
import { analyticsDailyInsightViewed } from '../../services/analyticsService';
import { logger } from '../../utils/logger';

interface DailyInsightCardProps {
  childId: string;
  /** Bump to recompute after a new event is logged (same trigger as the timeline). */
  refreshTrigger?: number;
}

/** 135 → "2:15" */
const asClockDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}`;
};

const DailyInsightCard = ({ childId, refreshTrigger = 0 }: DailyInsightCardProps) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const sleepTimer = useSleepTimer();
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const logged = useRef(false);
  // Re-render each minute so the live "awake for" / "sleeping for" row ticks
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMinuteTick(v => v + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    getRecentHistory(childId)
      .then((history: any[]) => {
        if (!cancelled) setInsight(computeDailyInsight(history));
      })
      .catch(e => logger.warn('DailyInsightCard: history fetch failed', e));
    return () => { cancelled = true; };
  }, [childId, refreshTrigger]);

  useEffect(() => {
    if (insight && !logged.current) {
      logged.current = true;
      analyticsDailyInsightViewed(insight.bedtimeWindow ? 'bedtime' : 'collecting');
    }
  }, [insight]);

  if (!insight) return null;

  const sleepAccent = theme.actionColors.sleep.accentColor;
  const foodAccent = theme.actionColors.food.accentColor;
  const isSleeping = sleepTimer.isRunning && !sleepTimer.isPaused;

  // Row 1 — live status: sleeping now (from the running timer) or awake-for
  let statusRow: { icon: React.ReactNode; text: string; strong: string } | null = null;
  if (isSleeping) {
    statusRow = {
      icon: <Moon size={17} color={sleepAccent} strokeWidth={2.2} />,
      text: t('insight.sleepingNow'),
      strong: asClockDuration(Math.max(1, Math.round(sleepTimer.elapsedSeconds / 60))),
    };
  } else if (insight.awakeForMin !== null && insight.awakeForMin >= 1) {
    statusRow = {
      icon: <Sun size={17} color={foodAccent} strokeWidth={2.2} />,
      text: t('insight.awakeFor'),
      strong: asClockDuration(insight.awakeForMin),
    };
  }

  // Row 2 — today's daytime sleep (+ comparison to the baby's own average)
  const showDayRow = insight.todayDaySleepMin > 0;
  let dayDeltaText: string | null = null;
  if (showDayRow && insight.daySleepDeltaMin !== null && Math.abs(insight.daySleepDeltaMin) >= 15) {
    dayDeltaText = insight.daySleepDeltaMin > 0
      ? t('insight.aboveAvg', { min: insight.daySleepDeltaMin })
      : t('insight.belowAvg', { min: Math.abs(insight.daySleepDeltaMin) });
  }

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(22).stiffness(240)}
      style={[styles.card, {
        backgroundColor: theme.card,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      }]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${sleepAccent}1F` }]}>
          <Sparkles size={16} color={sleepAccent} strokeWidth={2} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('insight.title')}
        </Text>
      </View>

      {statusRow && (
        <View style={styles.row}>
          {statusRow.icon}
          <Text style={[styles.rowText, { color: theme.textPrimary }]}>
            {statusRow.text}{' '}
            <Text style={[styles.rowStrong, { color: theme.textPrimary }]}>{statusRow.strong}</Text>
          </Text>
        </View>
      )}

      {showDayRow && (
        <View style={styles.row}>
          <Sun size={17} color={theme.textTertiary} strokeWidth={2} />
          <Text style={[styles.rowText, { color: theme.textPrimary }]}>
            {t('insight.daySleepSoFar')}{' '}
            <Text style={[styles.rowStrong, { color: theme.textPrimary }]}>
              {asClockDuration(insight.todayDaySleepMin)}
            </Text>
            {dayDeltaText ? <Text style={{ color: theme.textSecondary }}> · {dayDeltaText}</Text> : null}
          </Text>
        </View>
      )}

      {insight.bedtimeWindow ? (
        <View style={styles.row}>
          <BedDouble size={17} color={sleepAccent} strokeWidth={2} />
          <Text style={[styles.rowText, { color: theme.textPrimary }]}>
            {t('insight.bedtimeShort')}{' '}
            <Text style={[styles.rowStrong, { color: sleepAccent }]}>
              {insight.bedtimeWindow.start}–{insight.bedtimeWindow.end}
            </Text>
          </Text>
        </View>
      ) : (
        <View style={styles.row}>
          <BedDouble size={17} color={theme.textTertiary} strokeWidth={2} />
          <Text style={[styles.rowText, { color: theme.textSecondary }]}>
            {t('insight.collectingShort', { tracked: insight.nightsTracked, needed: insight.nightsNeeded })}
          </Text>
        </View>
      )}

      {insight.bedtimeWindow && (
        <Text style={[styles.trustLine, { color: theme.textTertiary }]}>
          {t('insight.basedOnNights', { count: insight.nightsTracked })}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'left',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  rowText: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
    flex: 1,
  },
  rowStrong: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  trustLine: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
});

export default DailyInsightCard;
