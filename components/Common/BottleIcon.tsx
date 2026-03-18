import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface BottleIconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
}

/**
 * Custom baby bottle SVG icon — baby feeding bottle shape.
 * Compatible with the lucide-react-native interface: { size, color, strokeWidth }.
 */
const BottleIcon = ({ size = 24, color = '#60A5FA', strokeWidth = 2 }: BottleIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Nipple/teat */}
        <Path
            d="M10 2 L10 4 L14 4 L14 2"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Collar/ring */}
        <Rect
            x="8.5"
            y="4"
            width="7"
            height="2.5"
            rx="1"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Bottle body */}
        <Path
            d="M8.5 6.5 L7 9 C6.5 10 6 11 6 12.5 L6 19 C6 20.7 7.3 22 9 22 L15 22 C16.7 22 18 20.7 18 19 L18 12.5 C18 11 17.5 10 17 9 L15.5 6.5 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Milk level line */}
        <Path
            d="M8 15 Q12 13.5 16 15"
            stroke={color}
            strokeWidth={strokeWidth * 0.75}
            strokeLinecap="round"
            opacity={0.55}
        />
    </Svg>
);

export default BottleIcon;
