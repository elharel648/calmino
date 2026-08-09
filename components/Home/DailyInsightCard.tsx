import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Moon, Sparkles } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { getRecentHistory } from '../../services/firebaseService';
import { computeDailyInsight, DailyInsight } from '../../utils/dailyInsight';
import { analyticsDailyInsightViewed } from '../../services/analyticsService';
import { logger } from '../../utils/logger';

interface DailyInsightCardProps {
  childId: string;
  /** Bump to recompute after a new event is logged (same trigger as the timeline). */
  refreshTrigger?: number;
}

const DailyInsightCard = ({ childId, refreshTrigger = 0 }: DailyInsightCardProps) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const loggedType = useRef<string | null>(null);

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
    if (insight && loggedType.current !== insight.type) {
      loggedType.current = insight.type;
      analyticsDailyInsightViewed(insight.type);
    }
  }, [insight]);

  if (!insight) return null;

  const accent = theme.actionColors.sleep.accentColor;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(22).stiffness(240)}
      style={[styles.card, {
        backgroundColor: theme.card,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      }]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}1F` }]}>
          {insight.type === 'bedtime'
            ? <Moon size={18} color={accent} strokeWidth={2} />
            : <Sparkles size={18} color={accent} strokeWidth={2} />}
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('insight.title')}
        </Text>
      </View>

      {insight.type === 'bedtime' ? (
        <>
          <Text style={[styles.body, { color: theme.textPrimary }]}>
            {t('insight.bedtimeSuggestion', { start: insight.windowStart, end: insight.windowEnd })}
          </Text>
          {Math.abs(insight.daySleepDeltaMin) >= 15 && (
            <Text style={[styles.subline, { color: theme.textSecondary }]}>
              {insight.daySleepDeltaMin > 0
                ? t('insight.daySleepMore', { min: insight.daySleepDeltaMin })
                : t('insight.daySleepLess', { min: Math.abs(insight.daySleepDeltaMin) })}
            </Text>
          )}
          <Text style={[styles.trustLine, { color: theme.textTertiary }]}>
            {t('insight.basedOnNights', { count: insight.nightsTracked })}
          </Text>
        </>
      ) : (
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {t('insight.collecting', { tracked: insight.nightsTracked, needed: insight.nightsNeeded })}
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
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'left',
    flex: 1,
  },
  body: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'left',
  },
  subline: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
    textAlign: 'left',
  },
  trustLine: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'left',
  },
});

export default DailyInsightCard;
