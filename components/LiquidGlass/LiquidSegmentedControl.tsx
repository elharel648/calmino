import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

let LiquidGlassView: any = null;
let LiquidGlassContainerView: any = null;
let isLiquidGlassSupported = false;

try {
  const LG = require('@callstack/liquid-glass');
  LiquidGlassView = LG.LiquidGlassView;
  LiquidGlassContainerView = LG.LiquidGlassContainerView;
  isLiquidGlassSupported = LG.isLiquidGlassSupported;
} catch {}

const TRAY_H = 42;
const TRAY_R = 24;
const INSET = 3;

export interface LiquidSegment<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  segments: LiquidSegment<T>[];
  selected: T;
  onChange: (value: T) => void;
  isDarkMode?: boolean;
  style?: object;
}

export function LiquidSegmentedControl<T extends string>({
  segments,
  selected,
  onChange,
  isDarkMode = false,
  style,
}: Props<T>) {
  const activeIndex = segments.findIndex(s => s.value === selected);
  const [segWidths, setSegWidths] = useState<number[]>([]);
  const indicatorX = useRef(new Animated.Value(INSET)).current;
  const [indicatorW, setIndicatorW] = useState(0);
  const colorScheme = isDarkMode ? 'dark' : 'light';

  const handleSegLayout = useCallback((index: number, w: number) => {
    setSegWidths(prev => {
      const next = [...prev];
      next[index] = w;
      return next;
    });
  }, []);

  useEffect(() => {
    if (segWidths.length < segments.length || segWidths.some(w => !w)) return;
    const xOffset = segWidths.slice(0, activeIndex).reduce((a, b) => a + b, 0) + INSET;
    const w = (segWidths[activeIndex] ?? 0) - INSET * 2;
    setIndicatorW(w);
    Animated.spring(indicatorX, {
      toValue: xOffset,
      useNativeDriver: false,
      damping: 18,
      stiffness: 260,
      mass: 0.7,
    }).start();
  }, [activeIndex, segWidths]);

  const handlePress = (value: T) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value);
  };

  const activeTextColor  = isDarkMode ? '#fff' : '#000';
  const inactiveTextColor = isDarkMode ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.38)';

  // ── Shared inner content (labels + sliding indicator) ───────────────────────
  const renderInner = () => (
    <>
      {/* Sliding active indicator */}
      {indicatorW > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              left: indicatorX,
              width: indicatorW,
              top: INSET,
              bottom: INSET,
              borderRadius: TRAY_R - INSET,
              backgroundColor: isDarkMode
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(255,255,255,0.85)',
              // subtle shadow so it "lifts" above the tray
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDarkMode ? 0.3 : 0.12,
              shadowRadius: 4,
            },
          ]}
        />
      )}

      {/* Labels layer (zIndex above indicator) */}
      <View style={styles.labelsRow} pointerEvents="box-none">
        {segments.map((seg, i) => (
          <TouchableOpacity
            key={seg.value}
            style={styles.segBtn}
            onPress={() => handlePress(seg.value)}
            onLayout={e => handleSegLayout(i, e.nativeEvent.layout.width)}
            activeOpacity={0.75}
          >
            {seg.icon}
            <Text style={[styles.label, { color: selected === seg.value ? activeTextColor : inactiveTextColor }]}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  // ── Liquid Glass path (iOS 26+) ─────────────────────────────────────────────
  if (isLiquidGlassSupported && LiquidGlassContainerView && LiquidGlassView) {
    return (
      <LiquidGlassContainerView style={[styles.tray, style]}>
        <LiquidGlassView
          effect="regular"
          colorScheme={colorScheme}
          style={[StyleSheet.absoluteFill, { borderRadius: TRAY_R }]}
        />
        {/* Replace the solid indicator with its own LiquidGlassView */}
        {indicatorW > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                left: indicatorX,
                width: indicatorW,
                top: INSET,
                bottom: INSET,
                borderRadius: TRAY_R - INSET,
              },
            ]}
          >
            <LiquidGlassView
              effect="regular"
              colorScheme={colorScheme}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <View style={styles.labelsRow} pointerEvents="box-none">
          {segments.map((seg, i) => (
            <TouchableOpacity
              key={seg.value}
              style={styles.segBtn}
              onPress={() => handlePress(seg.value)}
              onLayout={e => handleSegLayout(i, e.nativeEvent.layout.width)}
              activeOpacity={0.75}
            >
              {seg.icon}
              <Text style={[styles.label, { color: selected === seg.value ? activeTextColor : inactiveTextColor }]}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LiquidGlassContainerView>
    );
  }

  // ── Blur / fallback path (iOS < 26, Android) ────────────────────────────────
  // BlurView gives a frosted-glass tray that looks premium on every device.
  return (
    <View style={[styles.tray, style, { overflow: 'hidden' }]}>
      <BlurView
        tint={isDarkMode ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
        intensity={70}
        style={StyleSheet.absoluteFill}
      />
      {/* Tray tint overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDarkMode ? 'rgba(30,30,38,0.35)' : 'rgba(255,255,255,0.35)' },
        ]}
      />
      {renderInner()}
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    height: TRAY_H,
    borderRadius: TRAY_R,
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
  },
  labelsRow: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 10,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: TRAY_H,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
