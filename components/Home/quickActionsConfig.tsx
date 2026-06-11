import React from 'react';
import { View, Text } from 'react-native';
import { Utensils, Moon, Music, Music2, Bird, CloudRain, Pill, Plus, HeartPulse, TrendingUp, Award, Sparkles, Lightbulb, Bell, TriangleAlert, Milk, Droplets, Stethoscope, Syringe, Heart, Thermometer, MapPin, ShieldAlert, ClipboardList } from 'lucide-react-native';
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

// Recognizable nursing pictogram (Material Symbols "breastfeeding", Apache-2.0).
// Filled glyph — reads clearly as breastfeeding, not a "smiley baby".
export const BreastfeedingGlyph = ({ size, color }: { size: number; color: string; strokeWidth?: number }) => (
    <Svg width={size} height={size} viewBox="0 -960 960 960" fill={color}>
        <Path d="M477-80q-42 0-81.5-9T324-112q-46-20-75-48.5T220-224v-231q0-31 23.5-57t60.5-46q38-20 83.5-31t92.5-11q47 0 92.5 11t83.5 31q38 20 61 46t23 57v231q0 17-7.5 33T711-161q-14 14-32.5 26.5T637-112q1-5 3-28 0-58-41-99t-99-41q-43 0-76 23t-50 59q32 8 58.5 11t46.5 3q17 0 27.5-1t13.5-1v104q-11 1-21.5 1.5T477-80Zm123-220q33 0 56.5-23.5T680-380q0-33-23.5-56.5T600-460q-33 0-56.5 23.5T520-380q0 33 23.5 56.5T600-300ZM480-640q50 0 85-34.5t35-85.5q0-50-35-85t-85-35q-51 0-85.5 35T360-760q0 51 34.5 85.5T480-640Z" />
    </Svg>
);

const BreastfeedingSideIcon = ({ size, color, side }: { size: number; color: string; strokeWidth?: number; side: 'R' | 'L' }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <BreastfeedingGlyph size={size * 0.82} color={color} />
        {/* L / R badge — fixed dark chip + white letter so it stays readable on BOTH
            a selected (tinted) tile and an unselected (white) tile. */}
        <View style={{ position: 'absolute', bottom: -size * 0.04, right: side === 'R' ? -size * 0.04 : undefined, left: side === 'L' ? -size * 0.04 : undefined, width: size * 0.48, height: size * 0.48, borderRadius: size * 0.24, backgroundColor: '#2C2C2E', borderWidth: size * 0.055, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.28, fontWeight: '900', color: '#fff', lineHeight: size * 0.32 }}>{side}</Text>
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
    healthVaccines:      { icon: Syringe,       labelKey: 'actions.healthVaccines',      activeLabelKey: 'actions.healthVaccines' },
    healthIllness:       { icon: Heart,         labelKey: 'actions.healthIllness',       activeLabelKey: 'actions.healthIllness' },
    healthTemperature:   { icon: Thermometer,   labelKey: 'actions.healthTemperature',   activeLabelKey: 'actions.healthTemperature' },
    healthMedications:   { icon: Pill,          labelKey: 'actions.healthMedications',   activeLabelKey: 'actions.healthMedications' },
    healthTipatHalav:    { icon: MapPin,        labelKey: 'actions.healthTipatHalav',    activeLabelKey: 'actions.healthTipatHalav' },
    healthAllergies:     { icon: ShieldAlert,   labelKey: 'actions.healthAllergies',     activeLabelKey: 'actions.healthAllergies' },
    healthDoctor:        { icon: Stethoscope,   labelKey: 'actions.healthDoctor',        activeLabelKey: 'actions.healthDoctor' },
    healthHistory:       { icon: ClipboardList, labelKey: 'actions.healthHistory',       activeLabelKey: 'actions.healthHistory' },
    growth: { icon: TrendingUp, labelKey: 'actions.growth', activeLabelKey: 'actions.growth' },
    milestones: { icon: Award, labelKey: 'actions.milestones', activeLabelKey: 'actions.milestones' },
    magicMoments: { icon: Sparkles, labelKey: 'actions.magicMoments', activeLabelKey: 'actions.magicMoments' },
    teeth: { icon: TeethIcon, labelKey: 'actions.teeth', activeLabelKey: 'actions.teeth' },
    nightLight: { icon: Lightbulb, labelKey: 'actions.nightLight', activeLabelKey: 'actions.nightLight' },
    quickReminder: { icon: Bell, labelKey: 'actions.quickReminder', activeLabelKey: 'actions.quickReminder' },
    custom: { icon: Plus, labelKey: 'actions.custom', activeLabelKey: 'actions.custom', hasBorder: true },
    breastfeeding: { icon: BreastfeedingGlyph, labelKey: 'actions.breastfeeding', activeLabelKey: 'actions.active.breastfeeding' },
    breastfeedingRight: { icon: BreastfeedingRIcon, labelKey: 'actions.breastfeedingRight', activeLabelKey: 'actions.active.breastfeeding' },
    breastfeedingLeft: { icon: BreastfeedingLIcon, labelKey: 'actions.breastfeedingLeft', activeLabelKey: 'actions.active.breastfeeding' },
    bottle: { icon: Milk, labelKey: 'actions.bottle', activeLabelKey: 'actions.active.bottle' },
    pumping: { icon: Droplets, labelKey: 'actions.pumping', activeLabelKey: 'actions.active.pumping' },
};
