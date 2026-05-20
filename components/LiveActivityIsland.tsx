/**
 * LiveActivityIsland
 * 
 * An in-app status pill that mirrors the native Dynamic Island appearance.
 * Shows the active timer (bottle, pumping, sleep, breast) as a compact
 * black pill — icon on the left, timer on the right — centered at the top.
 * 
 * Key layout rule: use alignSelf: 'center' (NOT width: '100%' / flex: 1)
 * so the pill hugs its content tightly.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useFoodTimer } from '../context/FoodTimerContext';
import { useSleepTimer } from '../context/SleepTimerContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActivityType = 'bottle' | 'pumping' | 'breast' | 'sleep' | null;

interface IslandConfig {
  icon: string;
  color: string;
  seconds: number;
  isPaused: boolean;
  type: ActivityType;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LiveActivityIslandProps {
  /** Optional tap handler — e.g. open the active tracker modal */
  onPress?: (type: ActivityType) => void;
}

const LiveActivityIsland: React.FC<LiveActivityIslandProps> = ({ onPress }) => {
  const food = useFoodTimer();
  const sleep = useSleepTimer();

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  // ─── Determine active config ───────────────────────────────────────────────
  const config: IslandConfig | null = (() => {
    if (food.bottleIsRunning)
      return { icon: '🍼', color: '#F59E0B', seconds: food.bottleElapsedSeconds, isPaused: food.bottleIsPaused, type: 'bottle' };
    if (food.pumpingIsRunning)
      return { icon: '🤱', color: '#8B5CF6', seconds: food.pumpingElapsedSeconds, isPaused: food.pumpingIsPaused, type: 'pumping' };
    if (food.breastIsRunning)
      return { icon: '💜', color: '#EC4899', seconds: food.breastElapsedSeconds, isPaused: food.breastIsPaused, type: 'breast' };
    if (sleep.isRunning)
      return { icon: '🌙', color: '#818CF8', seconds: sleep.elapsedSeconds, isPaused: sleep.isPaused, type: 'sleep' };
    return null;
  })();

  const isActive = config !== null;

  // Animate in/out
  useEffect(() => {
    if (isActive && !visible) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (!isActive && visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, damping: 14, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
  }, [isActive]);

  if (!visible || !config) return null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress?.(config.type)}
        style={styles.pill}
      >
        {/* Icon */}
        <Text style={styles.icon}>{config.icon}</Text>

        {/* Separator dot */}
        <View style={[styles.dot, { backgroundColor: config.color }]} />

        {/* Timer */}
        <Text style={[styles.timer, { color: config.isPaused ? '#9CA3AF' : config.color }]}>
          {config.isPaused ? '⏸' : ''}{formatTime(config.seconds)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /**
   * Wrapper: centers the pill horizontally.
   * alignItems: 'center' ensures the pill hugs its content.
   * Do NOT use width: '100%' on the pill itself.
   */
  wrapper: {
    alignItems: 'center',   // ← centers pill horizontally
    marginTop: Platform.OS === 'ios' ? 14 : 8,
    zIndex: 999,
  },

  /**
   * The pill itself.
   * Key: NO width / flex: 1 — it grows only as wide as its content.
   * alignSelf: 'center' is the insurance policy.
   */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',         // ← hugs content, does NOT stretch
    backgroundColor: '#000000',
    borderRadius: 100,           // ← perfect pill shape
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    // Subtle glow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 0,
  },

  icon: {
    fontSize: 15,
    lineHeight: 18,
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.7,
  },

  timer: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
});

export default LiveActivityIsland;
