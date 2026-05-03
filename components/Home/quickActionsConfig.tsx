import React from 'react';
import { View, Text } from 'react-native';
import { Utensils, Moon, Music, Music2, Bird, CloudRain, Pill, Plus, HeartPulse, TrendingUp, Award, Sparkles, Lightbulb, Bell, TriangleAlert, Baby, Milk, Waves, Stethoscope, Syringe, Heart, Thermometer, MapPin, ShieldAlert, ClipboardList } from 'lucide-react-native';
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

const BreastfeedingSideIcon = ({ size, color, strokeWidth = 2, side }: { size: number; color: string; strokeWidth?: number; side: 'R' | 'L' }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Baby size={size * 0.78} color={color} strokeWidth={strokeWidth} />
        <View style={{ position: 'absolute', bottom: 0, right: side === 'R' ? 0 : undefined, left: side === 'L' ? 0 : undefined, width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.22, fontWeight: '800', color: '#fff', lineHeight: size * 0.26 }}>{side}</Text>
        </View>
    </View>
);

const BreastfeedingRIcon = (props: { size: number; color: string; strokeWidth?: number }) => <BreastfeedingSideIcon {...props} side="R" />;
const BreastfeedingLIcon = (props: { size: number; color: string; strokeWidth?: number }) => <BreastfeedingSideIcon {...props} side="L" />;

export const QUICK_ACTION_BASE_CONFIG: Record<QuickActionKey, QuickActionMeta> = {
    food: { icon: Utensils, labelKey: 'actions.food', activeLabelKey: 'actions.active.food' },
    sleep: { icon: Moon, labelKey: 'actions.sleep', activeLabelKey: 'actions.active.sleep' },
    diaper: { icon: DiaperIcon, labelKey: 'actions.diaper', activeLabelKey: 'actions.diaper' },
    supplements: { icon: Pill, labelKey: 'actions.supplements', activeLabelKey: 'actions.supplements' },
    whiteNoise:        { icon: Music,     labelKey: 'actions.whiteNoise',        activeLabelKey: 'actions.whiteNoise' },
    whiteNoiseLullaby: { icon: Music,     labelKey: 'actions.whiteNoiseLullaby', activeLabelKey: 'actions.whiteNoiseLullaby' },
    whiteNoiseGentle:  { icon: Music2,    labelKey: 'actions.whiteNoiseGentle',  activeLabelKey: 'actions.whiteNoiseGentle' },
    whiteNoiseBirds:   { icon: Bird,      labelKey: 'actions.whiteNoiseBirds',   activeLabelKey: 'actions.whiteNoiseBirds' },
    whiteNoiseRain:    { icon: CloudRain, labelKey: 'actions.whiteNoiseRain',    activeLabelKey: 'actions.whiteNoiseRain' },
    sos: { icon: SOSIcon, labelKey: 'actions.sos', activeLabelKey: 'actions.sos' },
    health:              { icon: HeartPulse,    labelKey: 'actions.health',              activeLabelKey: 'actions.health' },
    healthDoctor:        { icon: Stethoscope,   labelKey: 'actions.healthDoctor',        activeLabelKey: 'actions.healthDoctor' },
    healthVaccines:      { icon: Syringe,       labelKey: 'actions.healthVaccines',      activeLabelKey: 'actions.healthVaccines' },
    healthIllness:       { icon: Heart,         labelKey: 'actions.healthIllness',       activeLabelKey: 'actions.healthIllness' },
    healthTemperature:   { icon: Thermometer,   labelKey: 'actions.healthTemperature',   activeLabelKey: 'actions.healthTemperature' },
    healthMedications:   { icon: Pill,          labelKey: 'actions.healthMedications',   activeLabelKey: 'actions.healthMedications' },
    healthTipatHalav:    { icon: MapPin,        labelKey: 'actions.healthTipatHalav',    activeLabelKey: 'actions.healthTipatHalav' },
    healthAllergies:     { icon: ShieldAlert,   labelKey: 'actions.healthAllergies',     activeLabelKey: 'actions.healthAllergies' },
    healthHistory:       { icon: ClipboardList, labelKey: 'actions.healthHistory',       activeLabelKey: 'actions.healthHistory' },
    growth: { icon: TrendingUp, labelKey: 'actions.growth', activeLabelKey: 'actions.growth' },
    milestones: { icon: Award, labelKey: 'actions.milestones', activeLabelKey: 'actions.milestones' },
    magicMoments: { icon: Sparkles, labelKey: 'actions.magicMoments', activeLabelKey: 'actions.magicMoments' },
    teeth: { icon: TeethIcon, labelKey: 'actions.teeth', activeLabelKey: 'actions.teeth' },
    nightLight: { icon: Lightbulb, labelKey: 'actions.nightLight', activeLabelKey: 'actions.nightLight' },
    quickReminder: { icon: Bell, labelKey: 'actions.quickReminder', activeLabelKey: 'actions.quickReminder' },
    custom: { icon: Plus, labelKey: 'actions.custom', activeLabelKey: 'actions.custom', hasBorder: true },
    breastfeeding: { icon: Baby, labelKey: 'actions.breastfeeding', activeLabelKey: 'actions.active.breastfeeding' },
    breastfeedingRight: { icon: BreastfeedingRIcon, labelKey: 'actions.breastfeedingRight', activeLabelKey: 'actions.active.breastfeeding' },
    breastfeedingLeft: { icon: BreastfeedingLIcon, labelKey: 'actions.breastfeedingLeft', activeLabelKey: 'actions.active.breastfeeding' },
    bottle: { icon: Milk, labelKey: 'actions.bottle', activeLabelKey: 'actions.active.bottle' },
    pumping: { icon: Waves, labelKey: 'actions.pumping', activeLabelKey: 'actions.active.pumping' },
};
