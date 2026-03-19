// components/Effects/ConfettiBurst.tsx — Full-screen confetti celebration overlay
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#8B5CF6', '#F59E0B', '#3B82F6', '#EF4444',
  '#10B981', '#EC4899', '#F97316', '#06B6D4',
  '#A855F7', '#14B8A6', '#F43F5E', '#6366F1',
];

const PARTICLE_COUNT = 40;

interface ParticleConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
  delay: number;
  isRect: boolean;
  rotation: number;
}

function generateParticles(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
    const centerX = SCREEN_WIDTH / 2;
    const startY = SCREEN_HEIGHT * 0.35;
    const angle = (Math.random() * Math.PI * 2);
    const distance = 80 + Math.random() * (SCREEN_WIDTH * 0.5);

    return {
      startX: centerX + (Math.random() - 0.5) * 40,
      startY: startY + (Math.random() - 0.5) * 40,
      endX: centerX + Math.cos(angle) * distance,
      endY: startY + Math.sin(angle) * distance + Math.random() * 200, // gravity bias
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 4 + Math.random() * 6,
      delay: Math.random() * 300,
      isRect: Math.random() > 0.5,
      rotation: Math.random() * 720 - 360,
    };
  });
}

function ConfettiPiece({ config }: { config: ParticleConfig }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withSequence(
        withSpring(1, { damping: 12, stiffness: 80 }),
        withDelay(400, withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) }))
      )
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const x = config.startX + (config.endX - config.startX) * progress.value;
    const y = config.startY + (config.endY - config.startY) * progress.value;
    return {
      position: 'absolute' as const,
      left: x,
      top: y,
      width: config.isRect ? config.size * 1.8 : config.size,
      height: config.size,
      borderRadius: config.isRect ? 2 : config.size / 2,
      backgroundColor: config.color,
      opacity: progress.value,
      transform: [
        { rotate: `${progress.value * config.rotation}deg` },
      ],
    };
  });

  return <Animated.View style={style} />;
}

interface ConfettiBurstProps {
  visible: boolean;
  onFinish?: () => void;
}

export default function ConfettiBurst({ visible, onFinish }: ConfettiBurstProps) {
  const particles = React.useMemo(() => generateParticles(), [visible]);

  useEffect(() => {
    if (visible && onFinish) {
      const timer = setTimeout(onFinish, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((config, i) => (
        <ConfettiPiece key={i} config={config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
