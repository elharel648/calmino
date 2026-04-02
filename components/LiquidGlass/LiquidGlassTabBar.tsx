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
const ACTIVE_COLOR = '#007AFF';
const SCREEN_W = Dimensions.get('window').width;
const BAR_MARGIN_H = 16;
const BAR_W = SCREEN_W - BAR_MARGIN_H * 2;
const BAR_H = 62;
const BAR_R = 34;
const CONTAINER_H = BAR_H;
const BOTTOM_OFFSET = 28;

// Screens where the tab bar should be completely hidden
const FULLSCREEN_SCREENS: string[] = [];

// ─── Component ───────────────────────────────────────────────────────────────
const LiquidGlassTabBar: React.FC<BottomTabBarProps> = React.memo(
  ({ state, descriptors, navigation }) => {
    const { isDarkMode } = useTheme();
    const insets = useSafeAreaInsets();

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
      <View style={[styles.outer, { paddingBottom: safeBottom }]}>
        {/* Safe area bottom tint fill */}
        <View
          style={[
            styles.bottomFill,
            {
              height: safeBottom,
              backgroundColor: isDarkMode
                ? 'rgba(18,18,22,0.88)'
                : 'rgba(255,255,255,0.88)',
            },
          ]}
        />

        <View style={styles.container}>
          {useLiquidGlass ? (
            /* ─── Liquid Glass Path (iOS 26+) ────────────────────── */
            <LiquidGlassContainerView style={styles.glassContainer}>
              <LiquidGlassView
                effect="regular"
                colorScheme={isDarkMode ? 'dark' : 'light'}
                style={styles.barGlass}
              />
            </LiquidGlassContainerView>
          ) : (
            /* ─── Fallback Path (older iOS / Android) ────────────── */
            <View style={styles.glassContainer}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  tint={
                    isDarkMode
                      ? 'systemChromeMaterialDark'
                      : 'systemChromeMaterial'
                  }
                  intensity={80}
                  style={[styles.barGlass, { overflow: 'hidden' }]}
                />
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

          {/* ─── Tab Items Layer (on top of glass via zIndex) ────── */}
          <View style={styles.tabsRow} pointerEvents="box-none">
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const IconComponent = options.tabBarIcon;

              const accessibilityLabel =
                options.tabBarAccessibilityLabel ??
                options.title ??
                route.name;

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={accessibilityLabel}
                  onPress={() => handleTabPress(route, isFocused)}
                  onLongPress={() => handleTabLongPress(route)}
                  activeOpacity={0.7}
                  style={styles.tab}
                >
                  <View style={styles.iconWrap}>
                    {IconComponent &&
                      IconComponent({
                        focused: isFocused,
                        color: isFocused
                          ? ACTIVE_COLOR
                          : isDarkMode
                            ? 'rgba(255,255,255,0.4)'
                            : 'rgba(0,0,0,0.3)',
                        size: 24,
                      })}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
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
    right: 0,
    height: BAR_H,
    borderRadius: BAR_R,
  },

  // ── Tab items layer ───────────────────────────────────────────
  tabsRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    height: BAR_H - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Bottom safe area tint ─────────────────────────────────────
  bottomFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default LiquidGlassTabBar;
