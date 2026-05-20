/**
 * LiquidGlassTabBar — Apple iOS 26 Liquid Glass Tab Bar
 *
 * Uses @callstack/liquid-glass for native Liquid Glass material.
 * Architecture:
 *   • LiquidGlassContainerView wraps everything (enables liquid merge)
 *   • LiquidGlassView effect="regular" → main bar background
 *   • Icons & labels are rendered in a standard View on top (zIndex)
 *     so they aren't distorted by the glass
 *
 * Falls back to BlurView / solid background on unsupported devices.
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
let LiquidGlassView: any = View;
let LiquidGlassContainerView: any = View;
let isLiquidGlassSupported = false;

try {
  const LiquidGlass = require('@callstack/liquid-glass');
  LiquidGlassView = LiquidGlass.LiquidGlassView;
  LiquidGlassContainerView = LiquidGlass.LiquidGlassContainerView;
  isLiquidGlassSupported = LiquidGlass.isLiquidGlassSupported;
} catch (e) {
  if (__DEV__) console.log('LiquidGlass native module not found, falling back to BlurView');
}
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

// ─── Constants ───────────────────────────────────────────────────────────────
const ACTIVE_COLOR = '#C8806A'; // Warm terracotta — matches app pastel palette
const SCREEN_W = Dimensions.get('window').width;
const BAR_MARGIN_H = 16;
const BAR_W = SCREEN_W - BAR_MARGIN_H * 2;
const BAR_H = 62;
const BAR_R = 34;
const CONTAINER_H = BAR_H;
const BOTTOM_OFFSET = 28;
const FAB_COLUMN_W = 68; // space reserved for the FAB on the right
const TAB_AREA_PADDING = 8; // horizontal padding inside the tab row

// Screens where the tab bar should be completely hidden
const FULLSCREEN_SCREENS: string[] = [];

import { useScrollTracking } from '../../context/ScrollTrackingContext';
import { useQuickActions } from '../../context/QuickActionsContext';
import { Plus } from 'lucide-react-native';


// ─── Animated Tab Item ───────────────────────────────────────────────────────
const AnimatedTabItem = React.memo(({
  route,
  isFocused,
  options,
  isDarkMode,
  onPress,
  onLongPress,
}: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 0.82, duration: 60, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 240, mass: 0.8, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(translateY, { toValue: 3, duration: 60, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, damping: 14, stiffness: 240, mass: 0.8, useNativeDriver: true })
        ])
      ]).start();
    }
  }, [isFocused, scale, translateY]);

  const IconComponent = options.tabBarIcon;
  const accessibilityLabel = options.tabBarAccessibilityLabel ?? options.title ?? route.name;

  // For the active label we can render text if the IconComponent returns it, 
  // but usually IconComponent renders both icon and text in our custom tab bar setup.

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={styles.tab}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }, { translateY }] }]}>
        {IconComponent &&
          IconComponent({
            focused: isFocused,
            color: isFocused
              ? ACTIVE_COLOR
              : isDarkMode
                ? 'rgba(255,255,255,0.5)'
                : 'rgba(0,0,0,0.4)',
            size: 24,
          })}
      </Animated.View>
    </TouchableOpacity>
  );
});

// ─── Animated FAB ────────────────────────────────────────────────────────────
const AnimatedFAB = React.memo(({ onPress, onLongPress }: any) => {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.85, damping: 18, stiffness: 300, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, damping: 14, stiffness: 220, mass: 0.8, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
        activeOpacity={0.9}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={22} color="#fff" strokeWidth={2.8} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Component ───────────────────────────────────────────────────────────────
const LiquidGlassTabBar: React.FC<BottomTabBarProps> = React.memo(
  ({ state, descriptors, navigation }) => {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const { setFabSheetVisible, setSosEditVisible } = useQuickActions();
    
    // ── Active tab indicator animation ───────────────────────────
    const tabCount = state.routes.length;
    const tabAreaW = BAR_W - FAB_COLUMN_W - TAB_AREA_PADDING * 2;
    const tabW = tabAreaW / tabCount;
    const indicatorW = tabW * 0.72;
    const indicatorH = BAR_H - 18;

    const indicatorLeft = React.useRef(
      new Animated.Value(TAB_AREA_PADDING + state.index * tabW + (tabW - indicatorW) / 2)
    ).current;

    React.useEffect(() => {
      Animated.spring(indicatorLeft, {
        toValue: TAB_AREA_PADDING + state.index * tabW + (tabW - indicatorW) / 2,
        useNativeDriver: false,
        damping: 18,
        stiffness: 260,
        mass: 0.7,
      }).start();
    }, [state.index, tabW, indicatorW]);

    // Responsive scroll tracking
    const { scrollY } = useScrollTracking();
    
    // Use diffClamp to hide on scroll down, show on scroll up
    const clampedScroll = React.useMemo(() => {
      const positiveScroll = scrollY.interpolate({
        inputRange: [0, Number.MAX_SAFE_INTEGER],
        outputRange: [0, Number.MAX_SAFE_INTEGER],
        extrapolateLeft: 'clamp', // Ignore negative elastic bounces at the top of the scroll
      });
      return Animated.diffClamp(positiveScroll, 0, 120);
    }, [scrollY]);

    const translateY = clampedScroll.interpolate({
      inputRange: [0, 120],
      outputRange: [0, 120],
      extrapolate: 'clamp',
    });

    const opacity = clampedScroll.interpolate({
      inputRange: [0, 60, 120],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });

    // ── Fullscreen hide logic ────────────────────────────────────────
    const activeRoute = state.routes[state.index];
    const nested = activeRoute.state as
      | { index?: number; routes?: { name: string }[] }
      | undefined;
    if (nested?.routes && nested.index !== undefined) {
      const nr = nested.routes[nested.index];
      if (nr && FULLSCREEN_SCREENS.includes(nr.name)) return null;
    }

    // ── Tab press handler ────────────────────────────────────────────
    const handleTabPress = useCallback(
      (route: any, isFocused: boolean) => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          navigation.navigate(route.name, route.params);
        }
      },
      [navigation],
    );

    const handleTabLongPress = useCallback(
      (route: any) => {
        navigation.emit({
          type: 'tabLongPress',
          target: route.key,
        });
      },
      [navigation],
    );

    // ── Render ───────────────────────────────────────────────────────
    const useLiquidGlass = isLiquidGlassSupported;
    const safeBottom = Math.max(insets.bottom, BOTTOM_OFFSET);

    return (
      <Animated.View style={[styles.outer, { bottom: safeBottom, transform: [{ translateY }], opacity }]}>
        <View style={styles.container}>
          {useLiquidGlass ? (
            /* ─── Liquid Glass Path (iOS 26+) ────────────────────── */
            <LiquidGlassContainerView style={styles.glassContainer}>
              {/* Main bar */}
              <LiquidGlassView
                effect="regular"
                colorScheme={isDarkMode ? 'dark' : 'light'}
                style={styles.barGlass}
              />
              {/* Active tab indicator — merges with bar via liquid glass */}
              <Animated.View
                style={[
                  styles.indicatorBase,
                  {
                    left: indicatorLeft,
                    width: indicatorW,
                    height: indicatorH,
                    top: (BAR_H - indicatorH) / 2,
                  },
                ]}
              >
                <LiquidGlassView
                  effect="regular"
                  colorScheme={isDarkMode ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </LiquidGlassContainerView>
          ) : (
            /* ─── Fallback Path (older iOS / Android) ────────────── */
            <View style={styles.glassContainer}>
              {Platform.OS === 'ios' ? (
                <>
                  <BlurView
                    tint={isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
                    intensity={80}
                    style={[styles.barGlass, { overflow: 'hidden' }]}
                  />
                  {/* Animated active pill fallback */}
                  <Animated.View
                    style={[
                      styles.indicatorBase,
                      styles.indicatorFallback,
                      {
                        left: indicatorLeft,
                        width: indicatorW,
                        height: indicatorH,
                        top: (BAR_H - indicatorH) / 2,
                        backgroundColor: isDarkMode
                          ? 'rgba(255,255,255,0.13)'
                          : 'rgba(0,0,0,0.07)',
                      },
                    ]}
                  />
                </>
              ) : (
                <View
                  style={[
                    styles.barGlass,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(30,30,38,0.88)'
                        : 'rgba(255,255,255,0.82)',
                    },
                  ]}
                />
              )}
            </View>
          )}

          {/* ─── FAB (+) button — left side ──────────────────────── */}
          <AnimatedFAB
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setFabSheetVisible(true);
            }}
            onLongPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setSosEditVisible(true);
            }}
          />

          {/* ─── Tab Items Layer (on top of glass via zIndex) ────── */}
          <View style={styles.tabsRow} pointerEvents="box-none">
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              return (
                <AnimatedTabItem
                  key={route.key}
                  route={route}
                  isFocused={isFocused}
                  options={options}
                  isDarkMode={isDarkMode}
                  onPress={() => handleTabPress(route, isFocused)}
                  onLongPress={() => handleTabLongPress(route)}
                />
              );
            })}
          </View>
        </View>
      </Animated.View>
    );
  },
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: BAR_MARGIN_H,
  },
  container: {
    height: CONTAINER_H,
    overflow: 'visible',
  },
  glassContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },

  // ── Liquid Glass (native) ─────────────────────────────────────
  barGlass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0, // Full width — FAB sits on top of the glass bar
    height: BAR_H,
    borderRadius: BAR_R,
  },

  // ── Active tab indicator ──────────────────────────────────────
  indicatorBase: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
  },
  indicatorFallback: {
    borderRadius: 20,
  },

  // ── Tab items layer ───────────────────────────────────────────
  tabsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 68, // Match the barGlass width
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 8, // Equal padding on both sides
    zIndex: 10,
  },
  tab: {
    flex: 1,
    height: BAR_H - 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  fab: {
    position: 'absolute',
    right: 6,
    bottom: 7,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#C8806A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#C8806A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

});

export default LiquidGlassTabBar;
