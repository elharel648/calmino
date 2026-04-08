# 🎬 Premium Motion Spec — Calmino Home Screen
## `react-native-reanimated` v3 Animation Wrappers

---

## Easing Philosophy — "Calm Parent" Motion Language

The golden rule: **every animation should feel like the app is breathing, not bouncing.**

| Feeling | Curve | Use case |
|---|---|---|
| **Resting / Alive** | `Easing.bezier(0.45, 0.05, 0.55, 0.95)` — slow sine | Breathing glow, wave |
| **Tactile press** | `spring { damping: 20, stiffness: 200, mass: 0.8 }` | Quick action tap |
| **Bouncy release** | `spring { damping: 14, stiffness: 160, mass: 1 }` | Spring-back after press |
| **Entrance / Stagger** | `Easing.bezier(0.22, 1, 0.36, 1)` — ease-out-expo | Timeline card fade-up |

> **Rule of thumb:** Duration for "living" loops = 2800–3600ms. Duration for interactions = 180–280ms. Always use the native driver (`useNativeDriver` / worklets run on UI thread by default in Reanimated v3).

---

## Install Check

```bash
# Already in most Expo SDK 50+ projects:
npx expo install react-native-reanimated react-native-svg
```

Add to `babel.config.js` if not present:
```js
plugins: ['react-native-reanimated/plugin']
```

---

## Animation 1 — `BreathingGlow` (Active Sleep Card)

**Spec:** 3400ms repeat · sine-like bezier · animates a colored halo behind the badge from opacity `0.0` → `0.4` → `0.0`. Feels like a resting heartbeat, not an alert.

```tsx
// components/animations/BreathingGlow.tsx
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface BreathingGlowProps {
  children: React.ReactNode;
  /** Color of the glow halo — default: soft purple */
  color?: string;
  /** How far the glow ring extends beyond the child in px */
  spread?: number;
  /** Full cycle duration in ms. Lower = faster heartbeat */
  duration?: number;
  active?: boolean;
}

export const BreathingGlow: React.FC<BreathingGlowProps> = ({
  children,
  color = 'rgba(155, 126, 200, 1)',
  spread = 12,
  duration = 3400,
  active = true,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
        }),
        -1,   // infinite
        true  // reverse (ping-pong: 0→1→0)
      );
    } else {
      progress.value = withTiming(0, { duration: 600 });
    }
  }, [active]);

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.0, 0.35, 0.0]);
    const scale   = interpolate(progress.value, [0, 1],       [1.0, 1.08]);
    return { opacity, transform: [{ scale }] };
  });

  const glowRingStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.0, 0.18, 0.0]);
    return { opacity };
  });

  return (
    <Animated.View style={styles.container}>
      {/* Outer soft ring */}
      <Animated.View
        style={[
          styles.ring,
          { margin: -spread * 1.6, borderColor: color },
          glowRingStyle,
        ]}
        pointerEvents="none"
      />
      {/* Inner glow fill */}
      <Animated.View
        style={[
          styles.fill,
          { margin: -spread, backgroundColor: color },
          glowStyle,
        ]}
        pointerEvents="none"
      />
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative', alignSelf: 'flex-start' },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
});
```

### Usage on the sleep badge:
```tsx
// Wraps just the live badge pill, not the whole card
<BreathingGlow color="rgba(155, 126, 200, 1)" spread={10} duration={3400}>
  <View style={styles.liveBadge}>
    <View style={styles.liveDot} />
    <Text style={styles.liveText}>{timerValue} שעות פעיל</Text>
  </View>
</BreathingGlow>
```

---

## Animation 2 — `FluidWave` (Feeding Card Background)

**Spec:** Two SVG wave paths translate horizontally in opposing directions on a slow 3600ms loop. Combined opacity ≈ 8% — invisible on white, visible as soft "milk" movement on the card background. Uses `react-native-svg`.

```tsx
// components/animations/FluidWave.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface FluidWaveProps {
  /** Width of the parent card — pass it explicitly for accurate wave sizing */
  width?: number;
  height?: number;
  /** Main wave color */
  color?: string;
  visible?: boolean;
}

export const FluidWave: React.FC<FluidWaveProps> = ({
  width = 340,
  height = 28,
  color = 'rgba(176, 88, 56, 1)',
  visible = true,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = withRepeat(
        withTiming(1, {
          duration: 3600,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
        }),
        -1,
        true
      );
    } else {
      progress.value = 0;
    }
  }, [visible]);

  // Wave 1 — moves right
  const wave1Props = useAnimatedProps(() => {
    const tx = interpolate(progress.value, [0, 1], [0, width * 0.12]);
    const W = width + 60;
    const d = `M${-30 + tx},${height * 0.6} ` +
      `C${W * 0.12 + tx},${height * 0.15} ${W * 0.38 + tx},${height * 0.95} ${W * 0.5 + tx},${height * 0.55} ` +
      `C${W * 0.65 + tx},${height * 0.12} ${W * 0.85 + tx},${height * 0.9} ${W + 30 + tx},${height * 0.5} ` +
      `L${W + 30 + tx},${height} L${-30 + tx},${height} Z`;
    return { d };
  });

  // Wave 2 — moves left (offset phase)
  const wave2Props = useAnimatedProps(() => {
    const tx = interpolate(progress.value, [0, 1], [0, -width * 0.08]);
    const W = width + 60;
    const d = `M${-30 + tx},${height * 0.75} ` +
      `C${W * 0.2 + tx},${height * 0.3} ${W * 0.45 + tx},${height * 0.9} ${W * 0.6 + tx},${height * 0.65} ` +
      `C${W * 0.75 + tx},${height * 0.35} ${W * 0.9 + tx},${height * 0.85} ${W + 30 + tx},${height * 0.6} ` +
      `L${W + 30 + tx},${height} L${-30 + tx},${height} Z`;
    return { d };
  });

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <AnimatedPath
          animatedProps={wave1Props}
          fill={color}
          fillOpacity={0.08}
        />
        <AnimatedPath
          animatedProps={wave2Props}
          fill={color}
          fillOpacity={0.05}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});
```

### Usage inside the feeding card:
```tsx
// Add at the end of your feeding card View, before closing tag
// Pass the measured card width for best results, or use onLayout
<View style={styles.feedingCard}>
  {/* ...existing card content... */}

  <FluidWave
    color="rgba(176, 88, 56, 1)"  // matches your food orange-brown
    height={30}
    width={cardWidth}  // measure via onLayout or use a fixed value
  />
</View>
```

---

## Animation 3 — `TactilePress` (Quick Action Circles)

**Spec:**
- **Press down:** scale `1.0 → 0.88` in 120ms with ease-in (feels like physical depression of a button)
- **Release:** spring `damping:14, stiffness:160` → bounces back past 1.0 slightly before settling
- **Ripple:** an expanding + fading ring on the press point (uses a single `Animated.View`)

```tsx
// components/animations/TactilePress.tsx
import React, { useCallback } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface TactilePressProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Color of the ripple ring. Default: white 30% */
  rippleColor?: string;
  style?: ViewStyle;
}

export const TactilePress: React.FC<TactilePressProps> = ({
  children,
  onPress,
  rippleColor = 'rgba(255, 255, 255, 0.55)',
  style,
}) => {
  const scale       = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const triggerPress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const gesture = Gesture.Tap()
    .onBegin(() => {
      // Scale down — quick, crisp
      scale.value = withTiming(0.88, {
        duration: 110,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
      // Ripple expands
      rippleScale.value = 0;
      rippleOpacity.value = 1;
      rippleScale.value = withTiming(1.4, { duration: 380, easing: Easing.out(Easing.quad) });
      rippleOpacity.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) });
    })
    .onEnd(() => {
      // Bouncy spring release
      scale.value = withSpring(1, {
        damping: 14,
        stiffness: 160,
        mass: 1,
        overshootClamping: false,
      });
      runOnJS(triggerPress)();
    })
    .onFinalize(() => {
      // Safety reset if gesture cancelled
      scale.value = withSpring(1, { damping: 18, stiffness: 200 });
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrapper, style, containerStyle]}>
        {children}
        {/* Ripple overlay — absolutely positioned over the circle */}
        <Animated.View
          style={[styles.ripple, { borderColor: rippleColor }, rippleStyle]}
          pointerEvents="none"
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 2,
    margin: -4,
  },
});
```

### Usage on each Quick Action circle:
```tsx
<TactilePress onPress={() => handleQuickAction('sleep')} rippleColor="rgba(200,160,240,0.5)">
  <View style={[styles.qaCircle, styles.cSleep]}>
    <MoonIcon />
  </View>
</TactilePress>
```

> **Note:** `GestureHandlerRootView` must wrap your screen (usually already done in `App.tsx`).

---

## Animation 4 — `StaggerFadeIn` (Timeline Card Entrance)

**Spec:**
- Each card enters with `translateY: 18 → 0` + `opacity: 0 → 1`
- Easing: `bezier(0.22, 1, 0.36, 1)` — expo ease-out (fast snap, smooth landing)
- Duration: 480ms per card
- Stagger: 100ms delay per index (card 0 starts immediately, card 1 at +100ms, etc.)
- Trigger: only on mount (or when `visible` prop flips to `true`)

```tsx
// components/animations/StaggerFadeIn.tsx
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';

interface StaggerFadeInProps {
  children: React.ReactNode;
  /** Position in the list — controls delay (0 = first card) */
  index: number;
  /** Base delay per item in ms. Default: 100 */
  staggerMs?: number;
  /** Animation duration per card. Default: 480 */
  duration?: number;
  /** translateY starting offset in px. Default: 18 */
  offsetY?: number;
  style?: ViewStyle;
}

export const StaggerFadeIn: React.FC<StaggerFadeInProps> = ({
  children,
  index,
  staggerMs = 100,
  duration = 480,
  offsetY = 18,
  style,
}) => {
  const opacity   = useSharedValue(0);
  const translateY = useSharedValue(offsetY);

  useEffect(() => {
    const delay = index * staggerMs;
    const easing = Easing.bezier(0.22, 1, 0.36, 1);

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration, easing })
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animStyle, style]}>
      {children}
    </Animated.View>
  );
};
```

### Usage in the timeline:
```tsx
{timelineEvents.map((event, index) => (
  <StaggerFadeIn key={event.id} index={index} staggerMs={90}>
    <TimelineCard event={event} />
  </StaggerFadeIn>
))}
```

> **Tip:** If the screen re-mounts on navigation, this triggers automatically. If it stays mounted, use a `key` prop tied to the date to force remount when the day changes.

---

## Summary — Where Each Wrapper Goes

```
HomeScreen.tsx
├── <StaggerFadeIn index={i}>          ← wraps each TimelineCard
│   └── <TimelineCard>
│       ├── [if sleep + active]
│       │   └── <BreathingGlow>        ← wraps the live badge pill only
│       │       └── <LiveBadge />
│       └── [if feeding]
│           └── <FluidWave />          ← absolute child inside card View
│
└── <TactilePress onPress={...}>       ← wraps each QuickAction circle
    └── <QuickActionCircle />
```

---

## Motion Tokens (reuse these constants)

```ts
// lib/motionTokens.ts
export const MOTION = {
  // Easing
  easeOutExpo: [0.22, 1, 0.36, 1] as const,
  easeInOut:   [0.45, 0.05, 0.55, 0.95] as const,

  // Durations
  breathDuration: 3400,
  waveDuration:   3600,
  pressDuration:  120,
  entranceDuration: 480,
  staggerDelay:   100,

  // Springs
  springBounce: { damping: 14, stiffness: 160, mass: 1 },
  springSnap:   { damping: 20, stiffness: 200, mass: 0.8 },
} as const;
```
