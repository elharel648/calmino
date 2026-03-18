import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface DiaperIconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
}

/**
 * Custom cute diaper SVG icon — used in TrackingModal header and QuickActions.
 * Compatible with the lucide-react-native interface: { size, color, strokeWidth }.
 */
const DiaperIcon = ({ size = 24, color = '#10B981', strokeWidth = 2 }: DiaperIconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Waistband (top band) */}
        <Path
            d="M5 4 C4.4 4 4 4.4 4 5 L4 8.5 L20 8.5 L20 5 C20 4.4 19.6 4 19 4 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Main body */}
        <Path
            d="M4 8.5 L4 17.5 C4 20 6 22 8.5 22 L15.5 22 C18 22 20 20 20 17.5 L20 8.5 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Left tape tab */}
        <Path
            d="M4 7 L1.5 7 C1 7 1 7.5 1 8 L1 10.5 C1 11 1.5 11.5 2 11.5 L4 11.5"
            stroke={color}
            strokeWidth={strokeWidth * 0.85}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Right tape tab */}
        <Path
            d="M20 7 L22.5 7 C23 7 23 7.5 23 8 L23 10.5 C23 11 22.5 11.5 22 11.5 L20 11.5"
            stroke={color}
            strokeWidth={strokeWidth * 0.85}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        {/* Small tape dots on tabs */}
        <Circle cx="2.2" cy="9.25" r="0.7" fill={color} />
        <Circle cx="21.8" cy="9.25" r="0.7" fill={color} />
        {/* Heart decoration in center of body */}
        <Path
            d="M12 18 C12 18 9 15.8 9 13.8 C9 12.6 9.9 12 10.8 12.5 C11.2 12.7 11.6 13.1 12 13.6 C12.4 13.1 12.8 12.7 13.2 12.5 C14.1 12 15 12.6 15 13.8 C15 15.8 12 18 12 18 Z"
            fill={color}
            stroke="none"
        />
    </Svg>
);

export default DiaperIcon;
