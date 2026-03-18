import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

interface SOSIconProps {
    size?: number;
    color?: string;
    strokeWidth?: number;
}

// Heart with a medical cross inside — emergency / SOS feel
export default function SOSIcon({ size = 24, color = '#EF4444', strokeWidth = 2 }: SOSIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Medical cross */}
            <Line x1="12" y1="9.5" x2="12" y2="14.5" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
            <Line x1="9.5" y1="12" x2="14.5" y2="12" stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
        </Svg>
    );
}
