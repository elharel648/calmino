import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withDelay, withSequence,
  withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import { Moon, ClipboardList, Flame } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const SLEEP_COLOR  = '#C8806A';
const DOC_COLOR    = '#10B981';
const STREAK_COLOR = '#F97316';

// ─── Single day dot ───────────────────────────────────────────────────────────

interface DayDotProps {
  label: string;
  logged: boolean;
  goodSleep: boolean;
  isToday: boolean;
  index: number;
}

const DayDot = memo(({ label, logged, goodSleep, isToday, index }: DayDotProps) => {
  const { theme, isDarkMode } = useTheme();
  const scale = useSharedValue(0);
  const innerScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1, { mass: 0.4, stiffness: 320, damping: 16 }));
    if (goodSleep && logged) {
      innerScale.value = withDelay(index * 50 + 200, withSpring(1, { mass: 0.3, stiffness: 400, damping: 14 }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dotStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ scale: innerScale.value }] }));

  const dotBg = logged
    ? (goodSleep ? SLEEP_COLOR : DOC_COLOR)
    : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const borderColor = isToday
    ? theme.primary
    : logged ? 'transparent' : (isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)');

  return (
    <View style={styles.dayCol}>
      <Animated.View style={[styles.dot, { backgroundColor: dotBg, borderColor, borderWidth: isToday && !logged ? 2 : 1.5 }, dotStyle]}>
        {/* Inner white dot for sleep+logged premium days */}
        {goodSleep && logged && (
          <Animated.View style={[styles.innerDot, innerStyle]} />
        )}
      </Animated.View>
      <Text style={[
        styles.dayLabel,
        { color: isToday ? theme.textPrimary : (logged ? theme.textSecondary : theme.textTertiary) },
        isToday && styles.dayLabelToday,
      ]}>
        {label}
      </Text>
    </View>
  );
});
DayDot.displayName = 'DayDot';

// ─── Stat row ─────────────────────────────────────────────────────────────────

interface StatRowProps {
  icon: React.ElementType;
  label: string;
  met: number;
  goal: number;
  color: string;
}

const StatRow = memo(({ icon: Icon, label, met, goal, color }: StatRowProps) => {
  const { theme } = useTheme();
  const pct = goal > 0 ? met / goal : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(400, withSpring(pct, { mass: 0.6, stiffness: 100, damping: 18 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    width.value = withSpring(pct, { mass: 0.6, stiffness: 100, damping: 18 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [met, goal]);

  const fillStyle = useAnimatedStyle(() => ({ flex: width.value }));

  return (
    <View style={styles.statRow}>
      <Text style={[styles.statCount, { color }]}>{met}/{goal}</Text>
      <View style={styles.statBar}>
        <Animated.View style={[styles.statBarFill, { backgroundColor: color }, fillStyle]} />
        <View style={{ flex: Math.max(1 - pct, 0.001) }} />
      </View>
      <View style={styles.statLabelRow}>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Icon size={13} color={color} strokeWidth={2} />
      </View>
    </View>
  );
});
StatRow.displayName = 'StatRow';

// ─── Streak ───────────────────────────────────────────────────────────────────

const StreakSection = memo(({ streak }: { streak: number }) => {
  const { theme, isDarkMode } = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 900, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const msg = streak >= 14 ? 'שתי שבועות! 🏆'
    : streak >= 7  ? 'שבוע שלם!'
    : streak >= 4  ? 'אתה בדרך!'
    : streak >= 2  ? 'המשך כך'
    : 'יום ראשון ברצף';

  return (
    <View style={[styles.streakWrap, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
      <View style={styles.streakLeft}>
        <Text style={[styles.streakMsg, { color: theme.textTertiary }]}>{msg}</Text>
        <View style={styles.streakTitleRow}>
          <Text style={[styles.streakTitle, { color: theme.textPrimary }]}>רצף תיעוד</Text>
          <Animated.View style={pulseStyle}>
            <Flame size={15} color={STREAK_COLOR} strokeWidth={2.5} />
          </Animated.View>
        </View>
      </View>
      <View style={[styles.streakBadge, { backgroundColor: isDarkMode ? 'rgba(249,115,22,0.16)' : 'rgba(249,115,22,0.09)' }]}>
        <Text style={[styles.streakNum, { color: STREAK_COLOR }]}>{streak}</Text>
        <Text style={[styles.streakUnit, { color: STREAK_COLOR }]}>ימים</Text>
      </View>
    </View>
  );
});
StreakSection.displayName = 'StreakSection';

// ─── Card ─────────────────────────────────────────────────────────────────────

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
  title, sleepDaysMet, sleepDaysGoal,
  docDaysMet, docDaysGoal, streak,
  perDayLogged = [], perDaySleep = [], dayLabels = [],
}: WeeklyGoalsCardProps) => {
  const { theme, isDarkMode } = useTheme();
  const numDots = Math.min(perDayLogged.length, 7);

  // Overall score for header badge
  const total = docDaysGoal > 0 ? (docDaysMet + sleepDaysMet) / (docDaysGoal + sleepDaysGoal) : 0;
  const badge = total >= 1 ? { text: 'שבוע מושלם 🎉', color: DOC_COLOR }
    : total >= 0.65 ? { text: 'שבוע מצוין', color: DOC_COLOR }
    : total >= 0.35 ? { text: 'בדרך הנכונה', color: SLEEP_COLOR }
    : { text: 'בוא נשפר', color: theme.textTertiary };

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>

      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={[styles.badge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      </View>

      {/* Dots week view */}
      {numDots > 0 && (
        <View style={styles.dotsRow}>
          {Array.from({ length: numDots }, (_, i) => (
            <DayDot
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

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />

      {/* Stats */}
      <View style={styles.statsBlock}>
        <StatRow icon={Moon}          label="שינה 8+ שעות"  met={sleepDaysMet} goal={sleepDaysGoal} color={SLEEP_COLOR} />
        <View style={{ height: 12 }} />
        <StatRow icon={ClipboardList} label="ימים עם תיעוד" met={docDaysMet}   goal={docDaysGoal}   color={DOC_COLOR}   />
      </View>

      {/* Streak */}
      {streak > 0 && <StreakSection streak={streak} />}
    </View>
  );
});
WeeklyGoalsCard.displayName = 'WeeklyGoalsCard';
export default WeeklyGoalsCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const DOT_SIZE = 30;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 18, marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  titleRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  // Dots
  dotsRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    paddingHorizontal: 2, marginBottom: 18,
  },
  dayCol: { alignItems: 'center', gap: 6, flex: 1 },
  dot: {
    width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  innerDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dayLabel: { fontSize: 11, fontWeight: '500' },
  dayLabelToday: { fontWeight: '700' },
  // Divider
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  // Stats
  statsBlock: { paddingHorizontal: 2 },
  statRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  statLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, flex: 1 },
  statLabel: { fontSize: 13, fontWeight: '500', textAlign: 'right' },
  statCount: { fontSize: 13, fontWeight: '700', minWidth: 30, textAlign: 'left' },
  statBar: {
    width: 80, height: 5, borderRadius: 3,
    flexDirection: 'row', overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  statBarFill: { height: '100%', borderRadius: 3 },
  // Streak
  streakWrap: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  streakLeft: { alignItems: 'flex-end', gap: 2 },
  streakTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  streakTitle: { fontSize: 14, fontWeight: '600' },
  streakMsg: { fontSize: 11 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'baseline',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 2,
  },
  streakNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  streakUnit: { fontSize: 12, fontWeight: '600' },
});
