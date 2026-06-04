import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet,
  Animated, Platform, StyleProp, ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const TRAY_H = 44;
const TRAY_R = 12;
const INSET  = 3;

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
  style?: StyleProp<ViewStyle>;
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

  const trayBg    = isDarkMode ? '#2C2C2E' : '#E5E5EA';
  const pillBg    = isDarkMode ? '#48484A' : '#FFFFFF';
  const activeColor   = isDarkMode ? '#FFFFFF' : '#000000';
  const inactiveColor = isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';

  return (
    <View style={[styles.tray, { backgroundColor: trayBg }, style]}>
      {/* Sliding pill */}
      {indicatorW > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              left: indicatorX,
              width: indicatorW,
              backgroundColor: pillBg,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDarkMode ? 0.3 : 0.12,
              shadowRadius: 3,
              elevation: 2,
            },
          ]}
        />
      )}

      {/* Labels */}
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
            <Text style={[
              styles.label,
              {
                color: selected === seg.value ? activeColor : inactiveColor,
                fontWeight: selected === seg.value ? '600' : '400',
              },
            ]}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    height: TRAY_H,
    borderRadius: TRAY_R,
    flexDirection: 'row',
  },
  pill: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    borderRadius: TRAY_R - INSET,
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
    fontSize: 14,
    letterSpacing: -0.2,
  },
});
