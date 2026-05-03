import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const STREAK_COLOR = '#F97316';
const SLEEP_COLOR = '#C8806A';
const DOC_COLOR = '#10B981';

// ─── Animated day bar ────────────────────────────────────────────────────────

interface DayBarProps {
  label: string;
  logged: boolean;
  goodSleep: boolean;
  index: number;
  isToday: boolean;
}

const DayBar = memo(({ label, logged, goodSleep, index, isToday }: DayBarProps) => {
  const { theme, isDarkMode } = useTheme();

  const heightPct = goodSleep ? 1 : logged ? 0.58 : 0.18;
  const BAR_MAX = 44;
  const targetH = BAR_MAX * heightPct;

  const h = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    h.value = withDelay(index * 60, withSpring(targetH, { mass: 0.5, stiffness: 180, damping: 14 }));
    op.value = withDelay(index * 60, withTiming(1, { duration: 300 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-animate if data changes
  useEffect(() => {
    h.value = withSpring(targetH, { mass: 0.5, stiffness: 180, damping: 14 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged, goodSleep]);

  const barStyle = useAnimatedStyle(() => ({ height: h.value, opacity: op.value }));

  const barColor = goodSleep
    ? SLEEP_COLOR
    : logged
    ? DOC_COLOR
    : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  return (
    <View style={styles.dayCol}>
      {/* Bar */}
      <View style={[styles.barTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
        <Animated.View
          style={[
            styles.barFill,
            { backgroundColor: barColor },
            isToday && { borderColor: barColor, borderWidth: 2, opacity: 1 },
            barStyle,
          ]}
        />
      </View>
      {/* Day label */}
      <Text style={[
        styles.dayLabel,
        { color: isToday ? theme.textPrimary : theme.textTertiary },
        isToday && { fontWeight: '700' },
      ]}>
        {label}
      </Text>
      {isToday && <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />}
    </View>
  );
});
DayBar.displayName = 'DayBar';

// ─── Animated progress bar ───────────────────────────────────────────────────

interface ProgressRowProps {
  label: string;
  met: number;
  goal: number;
  color: string;
}

const ProgressRow = memo(({ label, met, goal, color }: ProgressRowProps) => {
  const { theme } = useTheme();
  const pct = goal > 0 ? Math.min(met / goal, 1) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(300, withSpring(pct, { mass: 0.6, stiffness: 120, damping: 16 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    width.value = withSpring(pct, { mass: 0.6, stiffness: 120, damping: 16 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [met, goal]);

  const barStyle = useAnimatedStyle(() => ({ flex: width.value }));

  return (
    <View style={styles.progressRow}>
      <Text style={[styles.progressCount, { color }]}>{met}/{goal}</Text>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { backgroundColor: color }, barStyle]} />
        <View style={{ flex: Math.max(1 - pct, 0) }} />
      </View>
      <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
});
ProgressRow.displayName = 'ProgressRow';

// ─── Streak section ──────────────────────────────────────────────────────────

const StreakRow = memo(({ streak }: { streak: number }) => {
  const { theme, isDarkMode } = useTheme();
  const flamePulse = useSharedValue(1);

  useEffect(() => {
    flamePulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: 900, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flamePulse.value }] }));

  const msg = streak >= 7 ? '🎉 שבוע מושלם!'
    : streak >= 4 ? 'אתה בדרך!'
    : streak >= 2 ? 'המשך כך'
    : 'יום ראשון ברצף';

  return (
    <View style={[styles.streakRow, { borderTopColor: theme.border }]}>
      <View style={[styles.streakBadge, { backgroundColor: isDarkMode ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.1)' }]}>
        <Text style={[styles.streakDays, { color: STREAK_COLOR }]}>{streak}</Text>
        <Text style={[styles.streakUnit, { color: STREAK_COLOR }]}> ימים</Text>
      </View>
      <View style={styles.streakInfo}>
        <Text style={[styles.streakMsg, { color: theme.textSecondary }]}>{msg}</Text>
        <View style={styles.streakLabelRow}>
          <Animated.View style={flameStyle}>
            <Flame size={14} color={STREAK_COLOR} strokeWidth={2.5} />
          </Animated.View>
          <Text style={[styles.streakLabel, { color: theme.textPrimary }]}>רצף תיעוד</Text>
        </View>
      </View>
    </View>
  );
});
StreakRow.displayName = 'StreakRow';

// ─── Main card ────────────────────────────────────────────────────────────────

export interface WeeklyGoalsCardProps {
  title: string;
  sleepDaysMet: number;
  sleepDaysGoal: number;
  docDaysMet: number;
  docDaysGoal: number;
  streak: number;
  perDayLogged?: boolean[];
  perDaySleep?: boolean[];
  dayLabels?: string[];
}

const WeeklyGoalsCard = memo(({
  title,
  sleepDaysMet,
  sleepDaysGoal,
  docDaysMet,
  docDaysGoal,
  streak,
  perDayLogged = [],
  perDaySleep = [],
  dayLabels = [],
}: WeeklyGoalsCardProps) => {
  const { theme, isDarkMode } = useTheme();

  const total = docDaysGoal > 0 ? docDaysMet / docDaysGoal : 0;
  const statusMsg = total >= 1 ? 'שבוע מושלם 🎉'
    : total >= 0.7 ? 'שבוע מצוין!'
    : total >= 0.4 ? 'בדרך הנכונה'
    : 'בוא נשפר';

  const statusColor = total >= 0.7 ? DOC_COLOR : total >= 0.4 ? SLEEP_COLOR : theme.textTertiary;
  const numBars = Math.min(perDayLogged.length, 7);

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusMsg}</Text>
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      </View>

      {/* Day bars */}
      {numBars > 0 && (
        <View style={styles.barsRow}>
          {Array.from({ length: numBars }, (_, i) => (
            <DayBar
              key={i}
              index={i}
              label={dayLabels[i] ?? ''}
              logged={perDayLogged[i] ?? false}
              goodSleep={perDaySleep[i] ?? false}
              isToday={i === 0}
            />
          ))}
        </View>
      )}

      {/* Legend */}
      {numBars > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]} />
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>לא תועד</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: DOC_COLOR }]} />
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>תועד</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: SLEEP_COLOR }]} />
            <Text style={[styles.legendText, { color: theme.textTertiary }]}>שינה 8+</Text>
          </View>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Progress rows */}
      <ProgressRow
        label="שינה 8+ שעות"
        met={sleepDaysMet}
        goal={sleepDaysGoal}
        color={SLEEP_COLOR}
      />
      <View style={{ height: 10 }} />
      <ProgressRow
        label="ימים עם תיעוד"
        met={docDaysMet}
        goal={docDaysGoal}
        color={DOC_COLOR}
      />

      {/* Streak */}
      {streak > 0 && <StreakRow streak={streak} />}
    </View>
  );
});
WeeklyGoalsCard.displayName = 'WeeklyGoalsCard';
export default WeeklyGoalsCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  // Day bars
  barsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  barTrack: {
    width: '70%',
    height: 44,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: { fontSize: 11, fontWeight: '500' },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
  // Legend
  legend: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },
  // Progress rows
  progressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  progressCount: { fontSize: 13, fontWeight: '700', width: 32, textAlign: 'left' },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  progressFill: { borderRadius: 3, height: '100%' },
  // Streak
  streakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  streakDays: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  streakUnit: { fontSize: 12, fontWeight: '600' },
  streakInfo: { alignItems: 'flex-end', gap: 2 },
  streakLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  streakLabel: { fontSize: 14, fontWeight: '600' },
  streakMsg: { fontSize: 12 },
});
