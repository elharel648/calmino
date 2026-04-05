import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface InlineLoaderProps {
  color?: string;
  size?: number | 'small' | 'large';
  thickness?: number;
}

const InlineLoader: React.FC<InlineLoaderProps> = ({
  color = '#C8806A',
  size = 'small',
  thickness = 2.5,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  let diameter = 20;
  if (typeof size === 'number') {
    diameter = size;
  } else if (size === 'large') {
    diameter = 36;
  }

  const radius = (diameter - thickness * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashLength = circumference * 0.72;
  const gapLength = circumference * 0.28;

  return (
    <View style={{ width: diameter, height: diameter }}>
      <Animated.View
        style={{
          width: diameter,
          height: diameter,
          transform: [{ rotate: spin }],
        }}
      >
        <Svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
        >
          <Circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dashLength} ${gapLength}`}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default React.memo(InlineLoader);
