import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  Easing,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const STREAK_COLOR = '#F97316';

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
  sleepDaysMet, sleepDaysGoal,
  docDaysMet, docDaysGoal,
  streak,
  perDayLogged = [],
  dayLabels = [],
}: WeeklyGoalsCardProps) => {
  const { theme, isDarkMode } = useTheme();

  // Flame pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,    { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const heroNum   = streak > 0 ? streak : docDaysMet;
  const heroLabel = streak > 0 ? 'ימים ברצף' : 'ימים תועדו';
  const sub1 = `${docDaysMet}/${docDaysGoal} ימים תועדו`;
  const sub2 = sleepDaysMet > 0 ? `${sleepDaysMet}/${sleepDaysGoal} שינה 8+` : null;

  const streakMsg =
    streak >= 14 ? 'שבועיים ברצף!'
    : streak >= 7  ? 'שבוע שלם!'
    : streak >= 4  ? 'אתה בדרך!'
    : streak >= 2  ? 'המשך כך'
    : streak === 1 ? 'יום ראשון'
    : '';

  // Tiny week dots (8 px) — same pattern as sparklines in other cards
  const numDots = Math.min(perDayLogged.length, 7);
  const emptyDotColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.09)';

  return (
    <View style={[styles.card, {
      backgroundColor: theme.card,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    }]}>

      {/* ── Header row ── */}
      <View style={styles.header}>
        {/* week day dots — top left in RTL */}
        {numDots > 0 && (
          <View style={styles.dotsRow}>
            {Array.from({ length: numDots }, (_, i) => (
              <Dot
                key={i}
                filled={perDayLogged[i] ?? false}
                label={dayLabels[i] ?? ''}
                delay={i * 40}
                emptyColor={emptyDotColor}
              />
            ))}
          </View>
        )}

        {/* flame icon — same style as other stat icon wraps */}
        <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)' }]}>
          <Animated.View style={pulseStyle}>
            <Flame size={20} color={STREAK_COLOR} strokeWidth={2.5} />
          </Animated.View>
        </View>
      </View>

      {/* ── Bottom section — same structure as StatCard ── */}
      <View style={styles.bottom}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {heroLabel}{streakMsg ? `  ·  ${streakMsg}` : ''}
        </Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: theme.textPrimary }]}>{heroNum}</Text>
        </View>
        <Text style={[styles.sub, { color: theme.textTertiary }]}>
          {sub2 ? `${sub1}  ·  ${sub2}` : sub1}
        </Text>
      </View>
    </View>
  );
});
WeeklyGoalsCard.displayName = 'WeeklyGoalsCard';
export default WeeklyGoalsCard;

// ─── Tiny dot ────────────────────────────────────────────────────────────────

interface DotProps { filled: boolean; label: string; delay: number; emptyColor: string }

const Dot = memo(({ filled, label, delay, emptyColor }: DotProps) => {
  const { theme } = useTheme();
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 240 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View style={[styles.dotCol, s]}>
      <View style={[styles.dot, { backgroundColor: filled ? STREAK_COLOR : emptyColor }]} />
      <Text style={[styles.dotLabel, { color: theme.textTertiary }]}>{label}</Text>
    </Animated.View>
  );
});
Dot.displayName = 'Dot';

// ─── Styles — mirror ReportsScreen statCard exactly ──────────────────────────

const styles = StyleSheet.create({
  card: {
    width: '100%', minHeight: 165, padding: 18,
    borderRadius: 24, justifyContent: 'space-between',
    marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 24, elevation: 0,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dotsRow: { flexDirection: 'row-reverse', gap: 4, alignItems: 'flex-end' },
  dotCol: { alignItems: 'center', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLabel: { fontSize: 9, fontWeight: '500' },
  // Bottom — same as StatCard bottom section
  bottom: { width: '100%', alignItems: 'flex-end', marginTop: 'auto' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  valueRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 2 },
  value: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  sub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
});
