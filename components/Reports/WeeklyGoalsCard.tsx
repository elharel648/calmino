import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withDelay, withRepeat,
  withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { Moon, ClipboardCheck, Flame } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const SLEEP_COLOR  = '#C8806A';
const DOC_COLOR    = '#10B981';
const STREAK_COLOR = '#F97316';

// ─── Stat tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: React.ElementType;
  met: number;
  goal: number;
  label: string;
  color: string;
  delay?: number;
}

const StatTile = memo(({ icon: Icon, met, goal, label, color, delay = 0 }: StatTileProps) => {
  const { theme, isDarkMode } = useTheme();
  const scale = useSharedValue(0.88);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withDelay(delay, withSpring(1, { mass: 0.5, stiffness: 200, damping: 16 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 260 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const tileBg = isDarkMode
    ? `rgba(${hexToRgb(color)}, 0.13)`
    : `rgba(${hexToRgb(color)}, 0.08)`;

  const pct = goal > 0 ? met / goal : 0;
  const hasData = met > 0;

  return (
    <Animated.View style={[styles.tile, { backgroundColor: tileBg }, style]}>
      <View style={styles.tileTop}>
        <Icon size={16} color={hasData ? color : (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)')} strokeWidth={2} />
      </View>
      <View style={styles.tileCenter}>
        <Text style={[styles.tileNum, { color: hasData ? color : (isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)') }]}>
          {met}
        </Text>
        <Text style={[styles.tileDenom, { color: theme.textTertiary }]}>
          /{goal}
        </Text>
      </View>
      <Text style={[styles.tileLabel, { color: hasData ? theme.textSecondary : theme.textTertiary }]}>
        {label}
      </Text>
      {/* Subtle fill bar */}
      <View style={[styles.tileBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={[styles.tileBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color, opacity: hasData ? 0.6 : 0 }]} />
      </View>
    </Animated.View>
  );
});
StatTile.displayName = 'StatTile';

// ─── Streak ───────────────────────────────────────────────────────────────────

const StreakRow = memo(({ streak }: { streak: number }) => {
  const { theme, isDarkMode } = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,   { duration: 900, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const msg =
    streak >= 14 ? 'שבועיים ברצף! 🏆'
    : streak >= 7  ? 'שבוע שלם!'
    : streak >= 4  ? 'אתה בדרך!'
    : streak >= 2  ? 'המשך כך'
    : 'יום ראשון ✨';

  return (
    <View style={[styles.streakRow, {
      backgroundColor: isDarkMode ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.07)',
    }]}>
      <View style={styles.streakLeft}>
        <Text style={[styles.streakMsg, { color: theme.textTertiary }]}>{msg}</Text>
        <View style={styles.streakLabelRow}>
          <Text style={[styles.streakLabel, { color: theme.textPrimary }]}>רצף תיעוד</Text>
          <Animated.View style={pulseStyle}>
            <Flame size={15} color={STREAK_COLOR} strokeWidth={2.5} />
          </Animated.View>
        </View>
      </View>
      <View style={styles.streakRight}>
        <Text style={[styles.streakNum, { color: STREAK_COLOR }]}>{streak}</Text>
        <Text style={[styles.streakUnit, { color: STREAK_COLOR }]}>ימים</Text>
      </View>
    </View>
  );
});
StreakRow.displayName = 'StreakRow';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

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
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>

      <View style={styles.tilesRow}>
        <StatTile
          icon={ClipboardCheck}
          met={docDaysMet}
          goal={docDaysGoal}
          label="ימים תועדו"
          color={DOC_COLOR}
          delay={0}
        />
        <StatTile
          icon={Moon}
          met={sleepDaysMet}
          goal={sleepDaysGoal}
          label="שינה 8+ שעות"
          color={SLEEP_COLOR}
          delay={80}
        />
      </View>

      {streak > 0 && <StreakRow streak={streak} />}
    </View>
  );
});
WeeklyGoalsCard.displayName = 'WeeklyGoalsCard';
export default WeeklyGoalsCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, padding: 18, marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    gap: 14,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3, textAlign: 'right' },
  // Tiles
  tilesRow: { flexDirection: 'row-reverse', gap: 10 },
  tile: {
    flex: 1, borderRadius: 16, padding: 14, gap: 4, overflow: 'hidden',
  },
  tileTop: { flexDirection: 'row-reverse' },
  tileCenter: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 1 },
  tileNum: { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 40 },
  tileDenom: { fontSize: 14, fontWeight: '500' },
  tileLabel: { fontSize: 12, fontWeight: '500', textAlign: 'right' },
  tileBar: {
    height: 3, borderRadius: 2, marginTop: 6, overflow: 'hidden',
  },
  tileBarFill: { height: '100%', borderRadius: 2 },
  // Streak
  streakRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  streakLeft: { alignItems: 'flex-end', gap: 2 },
  streakLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  streakLabel: { fontSize: 14, fontWeight: '600' },
  streakMsg: { fontSize: 11 },
  streakRight: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  streakNum: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  streakUnit: { fontSize: 13, fontWeight: '600' },
});
