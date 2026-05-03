import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withTiming, withDelay, withRepeat, withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Flame } from 'lucide-react-native';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useTheme } from '../../context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STREAK_COLOR = '#F97316';

// ─── Ring ─────────────────────────────────────────────────────────────────────

interface RingProps {
  met: number;
  goal: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  delay?: number;
  label: string;
  isStreak?: boolean;
}

const Ring = memo(({ met, goal, color, size = 76, strokeWidth = 7, delay = 0, label, isStreak }: RingProps) => {
  const { theme, isDarkMode } = useTheme();
  const R = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * R;
  const pct = goal > 0 ? Math.min(met / goal, 1) : 0;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(pct, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 600, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [met, goal]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  const trackColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={R}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <AnimatedCircle
          cx={cx} cy={cy} r={R}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          animatedProps={animProps}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center text */}
      <View style={[styles.ringCenter, { width: size, height: size }]}>
        {isStreak ? (
          <>
            <Flame size={size * 0.24} color={color} strokeWidth={2.5} />
            <Text style={[styles.ringNum, { color: theme.textPrimary, fontSize: size * 0.22 }]}>{met}</Text>
          </>
        ) : (
          <>
            <Text style={[styles.ringNum, { color: theme.textPrimary, fontSize: size * 0.27 }]}>{met}</Text>
            <Text style={[styles.ringDenom, { color: theme.textTertiary, fontSize: size * 0.155 }]}>/{goal}</Text>
          </>
        )}
      </View>
      <Text style={[styles.ringLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
});
Ring.displayName = 'Ring';

// ─── Streak pill ──────────────────────────────────────────────────────────────

// StreakPill removed — streak is shown as a third ring

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
  title,
  sleepDaysMet, sleepDaysGoal,
  docDaysMet, docDaysGoal,
  streak,
}: WeeklyGoalsCardProps) => {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={[styles.card, {
      backgroundColor: theme.card,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>

      <View style={styles.ringsRow}>
        <Ring met={docDaysMet}   goal={docDaysGoal}   color="#10B981"    label="תיעוד"    delay={0}   />
        <Ring met={sleepDaysMet} goal={sleepDaysGoal} color="#C8806A"    label="שינה 8+"  delay={100} />
        {streak > 0 && (
          <Ring met={Math.min(streak, 7)} goal={7} color={STREAK_COLOR} label="רצף" delay={200} isStreak />
        )}
      </View>
    </View>
  );
});
WeeklyGoalsCard.displayName = 'WeeklyGoalsCard';
export default WeeklyGoalsCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 24, padding: 18, marginTop: 20,
    borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
    gap: 16,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, textAlign: 'right' },
  ringsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  ringWrap: { alignItems: 'center', gap: 8 },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    top: 0, left: 0,
  },
  ringNum: { fontWeight: '800', letterSpacing: -0.5 },
  ringDenom: { fontWeight: '500', marginTop: 2 },
  ringLabel: { fontSize: 12, fontWeight: '500' },
});
