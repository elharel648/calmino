import React from 'react';
import { Utensils, Moon, Music, Pill, Plus, HeartPulse, TrendingUp, Award, Sparkles, Lightbulb, Bell } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { QuickActionKey } from '../../context/QuickActionsContext';
import DiaperIcon from '../Common/DiaperIcon';
import SOSIcon from '../Common/SOSIcon';

export type QuickActionMeta = {
    icon: any;
    labelKey: string;
    activeLabelKey: string;
    hasBorder?: boolean;
};

// Custom tooth icon in Lucide style. Shared across home and edit modal for consistency.
export const TeethIcon = ({ size, color, strokeWidth = 2 }: { size: number; color: string; strokeWidth?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M7.5 22C6.5 22 5.5 21 5.5 19C5.5 15.5 5 12 5 10C5 5.5 8 2 12 2C16 2 19 5.5 19 10C19 12 18.5 15.5 18.5 19C18.5 21 17.5 22 16.5 22C15.5 22 14.5 20.5 14.5 20.5L12 18L9.5 20.5C9.5 20.5 8.5 22 7.5 22Z" />
        <Path d="M9 7C9 7 10.5 8.5 12 8.5C13.5 8.5 15 7 15 7" opacity="0.6" strokeWidth={strokeWidth * 0.8} />
    </Svg>
);

export const QUICK_ACTION_BASE_CONFIG: Record<QuickActionKey, QuickActionMeta> = {
    food: { icon: Utensils, labelKey: 'actions.food', activeLabelKey: 'actions.active.food' },
    sleep: { icon: Moon, labelKey: 'actions.sleep', activeLabelKey: 'actions.active.sleep' },
    diaper: { icon: DiaperIcon, labelKey: 'actions.diaper', activeLabelKey: 'actions.diaper' },
    supplements: { icon: Pill, labelKey: 'actions.supplements', activeLabelKey: 'actions.supplements' },
    whiteNoise: { icon: Music, labelKey: 'actions.whiteNoise', activeLabelKey: 'actions.whiteNoise' },
    sos: { icon: SOSIcon, labelKey: 'actions.sos', activeLabelKey: 'actions.sos' },
    health: { icon: HeartPulse, labelKey: 'actions.health', activeLabelKey: 'actions.health' },
    growth: { icon: TrendingUp, labelKey: 'actions.growth', activeLabelKey: 'actions.growth' },
    milestones: { icon: Award, labelKey: 'actions.milestones', activeLabelKey: 'actions.milestones' },
    magicMoments: { icon: Sparkles, labelKey: 'actions.magicMoments', activeLabelKey: 'actions.magicMoments' },
    teeth: { icon: TeethIcon, labelKey: 'actions.teeth', activeLabelKey: 'actions.teeth' },
    nightLight: { icon: Lightbulb, labelKey: 'actions.nightLight', activeLabelKey: 'actions.nightLight' },
    quickReminder: { icon: Bell, labelKey: 'actions.quickReminder', activeLabelKey: 'actions.quickReminder' },
    custom: { icon: Plus, labelKey: 'actions.custom', activeLabelKey: 'actions.custom', hasBorder: true },
};
