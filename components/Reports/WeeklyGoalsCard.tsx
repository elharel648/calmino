import React, { useEffect, useRef, memo } from 'react';
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
import { Check, Flame } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const SLEEP_COLOR = '#C8806A';
const DOC_COLOR = '#10B981';
const STREAK_COLOR = '#F97316';

// ─── Single animated dot ─────────────────────────────────────────────────────

interface GoalDotProps {
  filled: boolean;
  color: string;
  emptyColor: string;
  index: number;
}

const GoalDot = memo(({ filled, color, emptyColor, index }: GoalDotProps) => {
  const scale = useSharedValue(0.15);
  const prevFilled = useRef(filled);

  // Staggered entrance on mount
  useEffect(() => {
    scale.value = withDelay(
      index * 55,
      withSpring(1, { mass: 0.5, stiffness: 340, damping: 14 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pop animation when dot becomes filled
  useEffect(() => {
    if (filled && !prevFilled.current) {
      scale.value = withSequence(
        withSpring(1.5, { mass: 0.3, stiffness: 500, damping: 9 }),
        withSpring(1, { mass: 0.5, stiffness: 300, damping: 18 })
      );
    }
    prevFilled.current = filled;
  }, [filled, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: filled ? color : emptyColor },
        animStyle,
      ]}
    />
  );
});
GoalDot.displayName = 'GoalDot';

// ─── Goal row (label + dots + progress) ──────────────────────────────────────

interface GoalRowProps {
  label: string;
  met: number;
  goal: number;
  color: string;
}

const GoalRow = memo(({ label, met, goal, color }: GoalRowProps) => {
  const { theme, isDarkMode } = useTheme();
  const completed = met >= goal && goal > 0;

  const emptyColor = isDarkMode
    ? 'rgba(255,255,255,0.09)'
    : 'rgba(0,0,0,0.08)';

  // ✓ badge pops in after all dots have animated
  const badgeScale = useSharedValue(0);
  const prevCompleted = useRef(completed);

  useEffect(() => {
    if (completed && !prevCompleted.current) {
      badgeScale.value = withDelay(
        goal * 55 + 140,
        withSpring(1, { mass: 0.4, stiffness: 420, damping: 12 })
      );
    } else if (completed) {
      // Already completed on mount — pop in immediately after dots settle
      badgeScale.value = withDelay(
        goal * 55 + 140,
        withSpring(1, { mass: 0.4, stiffness: 420, damping: 12 })
      );
    } else {
      badgeScale.value = withTiming(0, { duration: 120 });
    }
    prevCompleted.current = completed;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, goal]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  // Completed row gets a subtle warm tint
  const rowBg = useSharedValue(0);
  useEffect(() => {
    rowBg.value = withDelay(
      goal * 55 + 120,
      withTiming(completed ? 1 : 0, { duration: 500 })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, goal]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(${completed ? hexToRgb(color) : '0,0,0'}, ${rowBg.value * (isDarkMode ? 0.07 : 0.05)})`,
    borderRadius: 12,
    paddingHorizontal: rowBg.value * 10,
    paddingVertical: rowBg.value * 8,
    marginHorizontal: rowBg.value * -10,
  }));

  return (
    <Animated.View style={[styles.goalRow, rowStyle]}>
      {/* Label + count/badge */}
      <View style={styles.goalRowHeader}>
        <Text style={[styles.goalLabel, { color: theme.textPrimary }]}>
          {label}
        </Text>
        {completed ? (
          <Animated.View
            style={[
              styles.completedBadge,
              { backgroundColor: color + '25' },
              badgeStyle,
            ]}
          >
            <Check size={11} color={color} strokeWidth={3} />
          </Animated.View>
        ) : (
          <Text style={[styles.goalCount, { color }]}>
            {met}/{goal}
          </Text>
        )}
      </View>

      {/* Dots row (RTL: right = day 1, left = day 7) */}
      <View style={styles.dotsRow}>
        {Array.from({ length: goal }, (_, i) => (
          <GoalDot
            key={i}
            index={i}
            filled={i < met}
            color={color}
            emptyColor={emptyColor}
          />
        ))}
      </View>
    </Animated.View>
  );
});
GoalRow.displayName = 'GoalRow';

// ─── Streak badge ─────────────────────────────────────────────────────────────

interface StreakBadgeProps {
  streak: number;
}

const StreakBadge = memo(({ streak }: StreakBadgeProps) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const flamePulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0.25);

  // Gentle infinite pulse on the flame
  useEffect(() => {
    flamePulse.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 850, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flamePulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const milestoneStreak = streak >= 7;

  return (
    <View style={[styles.streakRow, { borderTopColor: theme.border }]}>
      {/* Right: flame + label */}
      <View style={styles.streakLeft}>
        <View style={styles.flameWrap}>
          <Animated.View style={[styles.flameGlow, glowStyle]} />
          <Animated.View style={flameStyle}>
            <Flame size={18} color={STREAK_COLOR} strokeWidth={2.5} />
          </Animated.View>
        </View>
        <Text style={[styles.streakLabel, { color: theme.textPrimary }]}>
          {t('reports.misc.trackingStreak')}
        </Text>
      </View>

      {/* Left: count badge */}
      <View style={[
        styles.streakCountBadge,
        {
          backgroundColor: milestoneStreak
            ? (isDarkMode ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)')
            : (isDarkMode ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)'),
        },
      ]}>
        <Text style={[styles.streakCount, { color: STREAK_COLOR }]}>
          {streak} {streak === 1 ? t('reports.units.day') : t('reports.units.days')}
        </Text>
      </View>
    </View>
  );
});
StreakBadge.displayName = 'StreakBadge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export interface WeeklyGoalsCardProps {
  title: string;
  sleepDaysMet: number;
  sleepDaysGoal: number;
  docDaysMet: number;
  docDaysGoal: number;
  streak: number;
}

const WeeklyGoalsCard = memo(({
  title,
  sleepDaysMet,
  sleepDaysGoal,
  docDaysMet,
  docDaysGoal,
  streak,
}: WeeklyGoalsCardProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          {title}
        </Text>
      </View>

      <GoalRow
        label={t('reports.goals.sleepOver8')}
        met={sleepDaysMet}
        goal={sleepDaysGoal}
        color={SLEEP_COLOR}
      />

      <GoalRow
        label={t('reports.goals.daysWithTracking')}
        met={docDaysMet}
        goal={docDaysGoal}
        color={DOC_COLOR}
      />

      {streak > 0 && <StreakBadge streak={streak} />}
    </View>
  );
});
WeeklyGoalsCard.displayName = 'WeeklyGoalsCard';

export default WeeklyGoalsCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  // Goal row
  goalRow: {
    marginBottom: 16,
  },
  goalRowHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  goalCount: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  completedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row-reverse',
    gap: 7,
    alignItems: 'center',
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  // Streak
  streakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  streakLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  flameWrap: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: STREAK_COLOR,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  streakCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
