import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { Moon, Sun, CloudSun, Sparkles, BedDouble } from 'lucide-react-native';
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
  const { t, isRTL } = useLanguage();
  const sleepTimer = useSleepTimer();

  // When the system layout direction (I18nManager) already matches the app
  // language, RN flips rows and left/right styles by itself; when it doesn't
  // (e.g. RTL language before the restart that applies forceRTL), flip manually.
  const rowDirection = I18nManager.isRTL === isRTL
    ? ('row' as const)
    : ('row-reverse' as const);
  const textAlign = I18nManager.isRTL
    ? ('left' as const) // remapped to physical right by RN under RTL
    : isRTL ? ('right' as const) : ('left' as const);

  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const logged = useRef(false);
  // Re-render each minute so the live "awake for" / "sleeping for" tile ticks
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

  const food = theme.actionColors.food;     // muted mustard
  const sleep = theme.actionColors.sleep;   // muted navy
  const sage = theme.actionColors.diaper;   // sage teal
  const isSleeping = sleepTimer.isRunning && !sleepTimer.isPaused;

  // ── Tile A: live status — sleeping now (from the running timer) or awake-for
  let statusTile: { icon: React.ReactNode; label: string; value: string; palette: typeof food } | null = null;
  if (isSleeping) {
    statusTile = {
      icon: <Moon size={16} color={sleep.accentColor} strokeWidth={2.2} />,
      label: t('insight.sleepingNow'),
      value: asClockDuration(Math.max(1, Math.round(sleepTimer.elapsedSeconds / 60))),
      palette: sleep,
    };
  } else if (insight.awakeForMin !== null && insight.awakeForMin >= 1) {
    statusTile = {
      icon: <Sun size={16} color={food.accentColor} strokeWidth={2.2} />,
      label: t('insight.awakeFor'),
      value: asClockDuration(insight.awakeForMin),
      palette: food,
    };
  }

  // ── Tile B: today's daytime sleep vs the baby's own average
  const showDayTile = insight.todayDaySleepMin > 0;
  let dayDeltaText: string | null = null;
  if (showDayTile && insight.daySleepDeltaMin !== null && Math.abs(insight.daySleepDeltaMin) >= 15) {
    dayDeltaText = insight.daySleepDeltaMin > 0
      ? t('insight.aboveAvg', { min: insight.daySleepDeltaMin })
      : t('insight.belowAvg', { min: Math.abs(insight.daySleepDeltaMin) });
  }

  const hasTiles = !!statusTile || showDayTile;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(22).stiffness(240)}
      style={[styles.card, {
        backgroundColor: theme.card,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      }]}
    >
      <View style={[styles.headerRow, { flexDirection: rowDirection }]}>
        <View style={[styles.iconWrap, { backgroundColor: sleep.lightColor }]}>
          <Sparkles size={15} color={sleep.accentColor} strokeWidth={2.2} />
        </View>
        <Text style={[styles.title, { color: theme.textPrimary, textAlign }]}>
          {t('insight.title')}
        </Text>
      </View>

      {hasTiles && (
        <View style={[styles.tilesRow, { flexDirection: rowDirection }]}>
          {statusTile && (
            <View style={[styles.tile, { backgroundColor: statusTile.palette.lightColor }]}>
              <View style={[styles.tileLabelRow, { flexDirection: rowDirection }]}>
                {statusTile.icon}
                <Text style={[styles.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                  {statusTile.label}
                </Text>
              </View>
              <Text style={[styles.tileValue, { color: statusTile.palette.accentColor, textAlign }]}>
                {statusTile.value}
              </Text>
            </View>
          )}
          {showDayTile && (
            <View style={[styles.tile, { backgroundColor: sage.lightColor }]}>
              <View style={[styles.tileLabelRow, { flexDirection: rowDirection }]}>
                <CloudSun size={16} color={sage.accentColor} strokeWidth={2.2} />
                <Text style={[styles.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                  {t('insight.daySleepLabel')}
                </Text>
              </View>
              <Text style={[styles.tileValue, { color: sage.accentColor, textAlign }]}>
                {asClockDuration(insight.todayDaySleepMin)}
              </Text>
              {dayDeltaText && (
                <Text style={[styles.tileDelta, { color: theme.textSecondary, textAlign }]} numberOfLines={1}>
                  {dayDeltaText}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Hero strip — tonight's bedtime (or collecting progress) */}
      <View style={[styles.hero, { backgroundColor: sleep.lightColor, flexDirection: rowDirection }]}>
        <View style={[styles.heroIconWrap, { backgroundColor: theme.card }]}>
          <BedDouble size={19} color={sleep.accentColor} strokeWidth={2.1} />
        </View>
        {insight.bedtimeWindow ? (
          <View style={styles.heroTextCol}>
            <Text style={[styles.heroLabel, { color: theme.textSecondary, textAlign }]}>
              {t('insight.bedtimeShort')}
            </Text>
            <Text style={[styles.heroValue, { color: sleep.accentColor, textAlign }]} numberOfLines={1}>
              {insight.bedtimeWindow.start}
              {'⁠–⁠'}
              {insight.bedtimeWindow.end}
            </Text>
            <Text style={[styles.heroTrust, { color: theme.textTertiary, textAlign }]}>
              {t('insight.basedOnNights', { count: insight.nightsTracked })}
            </Text>
          </View>
        ) : (
          <View style={styles.heroTextCol}>
            <Text style={[styles.heroLabel, { color: theme.textSecondary, textAlign }]}>
              {t('insight.collectingShort', { tracked: insight.nightsTracked, needed: insight.nightsNeeded })}
            </Text>
            <View style={[styles.dotsRow, { flexDirection: rowDirection }]}>
              {Array.from({ length: insight.nightsNeeded }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, {
                    backgroundColor: i < insight.nightsTracked ? sleep.accentColor : 'transparent',
                    borderColor: sleep.accentColor,
                  }]}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tile: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tileLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  tileValue: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  tileDelta: {
    fontSize: 11,
    marginTop: 2,
  },
  hero: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  heroValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    marginTop: 1,
  },
  heroTrust: {
    fontSize: 11,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.2,
  },
});

export default DailyInsightCard;
