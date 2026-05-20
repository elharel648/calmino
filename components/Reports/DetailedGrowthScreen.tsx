// components/Reports/DetailedGrowthScreen.tsx - Production-Ready Growth Detail Screen
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Platform,
    SafeAreaView,
    
    RefreshControl,
    Share,
    Alert } from 'react-native';
import InlineLoader from '../../components/Common/InlineLoader';
import {
    ChevronLeft, TrendingUp, Scale, Ruler, Activity,
    Plus, Info, Calendar, Edit3, Share2, ChevronDown
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { logger } from '../../utils/logger';
import { format } from 'date-fns';
import { differenceInMonths } from 'date-fns';
import { he, enUS, es, ar, fr, de } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import {
    getMeasurementsForChart,
    getGrowthChange,
    GrowthMeasurement
} from '../../services/growthService';
import { Timestamp } from 'firebase/firestore';
import { calculatePercentile, getPercentileStatus, WHO_GROWTH_DATA } from '../../utils/whoGrowthStandards';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { Svg, Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import GrowthModal from '../Home/GrowthModal';
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated';
import { useLanguage } from '../../context/LanguageContext';

const DATE_FNS_LOCALES: Record<string, any> = { he, en: enUS, es, ar, fr, de };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Demo mock data — realistic boy growth curve 0–12 months
const DEMO_BIRTH_DATE = new Date(Date.now() - 365 * 24 * 3600 * 1000); // ~12 months ago
const makeDemoTs = (monthsAgo: number): Timestamp =>
    Timestamp.fromDate(new Date(Date.now() - monthsAgo * 30.4 * 24 * 3600 * 1000));
const DEMO_MEASUREMENTS: GrowthMeasurement[] = [
    { id: 'd0', babyId: 'demo', date: makeDemoTs(12), weight: 3.4, height: 52, headCircumference: 35, createdBy: 'demo', createdAt: makeDemoTs(12) },
    { id: 'd1', babyId: 'demo', date: makeDemoTs(10), weight: 5.2, height: 58, headCircumference: 38, createdBy: 'demo', createdAt: makeDemoTs(10) },
    { id: 'd2', babyId: 'demo', date: makeDemoTs(8),  weight: 6.8, height: 64, headCircumference: 41, createdBy: 'demo', createdAt: makeDemoTs(8) },
    { id: 'd3', babyId: 'demo', date: makeDemoTs(6),  weight: 7.9, height: 68, headCircumference: 43, createdBy: 'demo', createdAt: makeDemoTs(6) },
    { id: 'd4', babyId: 'demo', date: makeDemoTs(4),  weight: 8.7, height: 71, headCircumference: 44.5, createdBy: 'demo', createdAt: makeDemoTs(4) },
    { id: 'd5', babyId: 'demo', date: makeDemoTs(2),  weight: 9.3, height: 74, headCircumference: 45.5, createdBy: 'demo', createdAt: makeDemoTs(2) },
    { id: 'd6', babyId: 'demo', date: makeDemoTs(0),  weight: 9.8, height: 76, headCircumference: 46.2, createdBy: 'demo', createdAt: makeDemoTs(0) },
];

interface DetailedGrowthScreenProps {
    onClose: () => void;
    childId: string;
    ageInMonths: number;
    gender: 'boy' | 'girl' | 'other';
    demoMode?: boolean;
}

// Developmental milestones (0–24 months)
const BABY_MILESTONES = [
    { month: 2,  label: 'חיוך',   dot: '#FBBF24' },
    { month: 4,  label: 'מתהפך',  dot: '#FB923C' },
    { month: 6,  label: 'יושב',   dot: '#34D399' },
    { month: 9,  label: 'זוחל',   dot: '#60A5FA' },
    { month: 12, label: 'צועד',   dot: '#A78BFA' },
    { month: 18, label: 'הולך',   dot: '#F472B6' },
    { month: 24, label: 'שנתיים', dot: '#C8806A' },
];

// Growth Chart Component — WHO clinical standard
const GrowthChart = ({
    data, color, title, unit, type, gender, birthDate,
}: {
    data: { date: Date; value: number }[];
    color: string; title: string; unit: string;
    type: 'weight' | 'length' | 'head';
    gender: 'boy' | 'girl' | 'other';
    birthDate: Date | null;
}) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    if (!data || data.length < 2) {
        return (
            <View style={[chartStyles.container, { backgroundColor: theme.card }]}>
                <Text style={[chartStyles.title, { color: theme.textPrimary }]}>{title}</Text>
                <View style={chartStyles.empty}>
                    <View style={[chartStyles.emptyIcon, { backgroundColor: `${color}18` }]}>
                        <TrendingUp size={24} color={color} strokeWidth={1.5} />
                    </View>
                    <Text style={[chartStyles.emptyText, { color: theme.textTertiary }]}>
                        {t('detailedGrowth.needMinMeasurements')}
                    </Text>
                </View>
            </View>
        );
    }

    const genderKey = gender === 'girl' ? 'girls' : 'boys';
    const whoMetric: 'weight' | 'length' | 'head' = type === 'weight' ? 'weight' : type === 'length' ? 'length' : 'head';
    const whoData = WHO_GROWTH_DATA[genderKey][whoMetric];

    const agePoints = data.map(d =>
        birthDate ? Math.max(0, Math.min(24, differenceInMonths(d.date, birthDate))) : 0
    );
    const maxAge = Math.min(24, Math.max(4, Math.max(...agePoints) + 1));
    const whoMonths = Array.from({ length: maxAge + 1 }, (_, i) => i);

    const allWhoVals = whoMonths.flatMap(m => { const d = whoData[m]; return d ? [d.p3, d.p97] : []; });
    const yMin = Math.min(...allWhoVals) * 0.97;
    const yMax = Math.max(...allWhoVals) * 1.02;
    const yRange = yMax - yMin || 1;

    const cW = SCREEN_WIDTH - 64;
    const cH = 200;
    const pad = { top: 16, right: 30, bottom: 32, left: 38 };
    const iW = cW - pad.left - pad.right;
    const iH = cH - pad.top - pad.bottom;

    const toX = (m: number) => pad.left + (m / maxAge) * iW;
    const toY = (v: number) => pad.top + iH - ((v - yMin) / yRange) * iH;

    const whoPath = (key: 'p3' | 'p15' | 'p50' | 'p85' | 'p97') =>
        whoMonths.map((m, i) => `${i === 0 ? 'M' : 'L'} ${toX(m).toFixed(1)} ${toY(whoData[m]?.[key] ?? 0).toFixed(1)}`).join(' ');

    // Outer envelope p3–p97 (very subtle background tint)
    const outerZone = [
        ...whoMonths.map((m, i) => `${i === 0 ? 'M' : 'L'} ${toX(m).toFixed(1)} ${toY(whoData[m]?.p97 ?? 0).toFixed(1)}`),
        ...whoMonths.slice().reverse().map(m => `L ${toX(m).toFixed(1)} ${toY(whoData[m]?.p3 ?? 0).toFixed(1)}`),
        'Z',
    ].join(' ');

    // Healthy zone p15–p85
    const healthyZone = [
        ...whoMonths.map((m, i) => `${i === 0 ? 'M' : 'L'} ${toX(m).toFixed(1)} ${toY(whoData[m]?.p85 ?? 0).toFixed(1)}`),
        ...whoMonths.slice().reverse().map(m => `L ${toX(m).toFixed(1)} ${toY(whoData[m]?.p15 ?? 0).toFixed(1)}`),
        'Z',
    ].join(' ');

    const babyCurve = agePoints.map((age, i) => {
        const x = toX(age); const y = toY(data[i].value);
        if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        const px = toX(agePoints[i - 1]); const py = toY(data[i - 1].value);
        const cpx = ((px + x) / 2).toFixed(1);
        return `C ${cpx} ${py.toFixed(1)} ${cpx} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    const babyArea = `${babyCurve} L ${toX(agePoints[agePoints.length - 1]).toFixed(1)} ${(pad.top + iH).toFixed(1)} L ${toX(agePoints[0]).toFixed(1)} ${(pad.top + iH).toFixed(1)} Z`;

    const lastVal = data[data.length - 1].value;
    const lastAge = agePoints[agePoints.length - 1];
    const lastX = toX(lastAge);
    const lastY = toY(lastVal);

    const latestPct = Math.round(calculatePercentile(
        lastVal, lastAge,
        whoMetric === 'head' ? 'head' : whoMetric,
        gender === 'girl' ? 'girl' : 'boy'
    ));
    const pctStatus = getPercentileStatus(latestPct);

    const xTicks = [0, 3, 6, 9, 12, 18, 24].filter(m => m <= maxAge);

    // 4 evenly distributed Y ticks, rounded to sane precision
    const yDecimals = type === 'weight' ? 1 : 0;
    const yTicks = Array.from({ length: 4 }, (_, i) =>
        parseFloat((yMin + (yRange / 3) * i).toFixed(yDecimals))
    );

    const milestones = BABY_MILESTONES.filter(m => m.month <= maxAge);
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const axisColor = isDarkMode ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)';

    return (
        <View style={[chartStyles.container, { backgroundColor: theme.card }]}>
            {/* ── Header: 2-row RTL layout ─────────────────────── */}
            <View style={{ marginBottom: 14 }}>
                {/* Row 1: title (right) + percentile badge (left) */}
                <View style={chartStyles.headerRow1}>
                    <Text style={[chartStyles.title, { color: theme.textPrimary }]}>{title}</Text>
                    <View style={[chartStyles.pctPill, { backgroundColor: pctStatus.bgColor }]}>
                        <Text style={[chartStyles.pctText, { color: pctStatus.color }]}>א׳ {latestPct}</Text>
                    </View>
                </View>
                {/* Row 2: big value (right) + status label (left) */}
                <View style={chartStyles.headerRow2}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }}>
                        <Text style={[chartStyles.currentValue, { color: theme.textPrimary }]}>
                            {lastVal.toFixed(1)}
                        </Text>
                        <Text style={[chartStyles.valueUnit, { color: theme.textTertiary }]}>{unit}</Text>
                    </View>
                    <Text style={[chartStyles.statusLabel, { color: pctStatus.color }]}>{pctStatus.statusHe}</Text>
                </View>
            </View>

            {/* ── SVG Chart ────────────────────────────────────── */}
            <Svg width={cW} height={cH}>
                <Defs>
                    <LinearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.28" />
                        <Stop offset="1" stopColor={color} stopOpacity="0.02" />
                    </LinearGradient>
                </Defs>

                {/* Outer envelope p3–p97 */}
                <Path d={outerZone} fill={isDarkMode ? 'rgba(212,131,122,0.05)' : 'rgba(212,131,122,0.07)'} />

                {/* Healthy zone p15–p85 */}
                <Path d={healthyZone} fill="rgba(107,175,138,0.13)" />

                {/* Horizontal grid */}
                {yTicks.map((v, i) => (
                    <Line key={i} x1={pad.left} y1={toY(v)} x2={pad.left + iW} y2={toY(v)}
                        stroke={gridColor} strokeWidth={1} />
                ))}

                {/* Vertical grid at X ticks */}
                {xTicks.filter(m => m > 0).map(m => (
                    <Line key={m} x1={toX(m)} y1={pad.top} x2={toX(m)} y2={pad.top + iH}
                        stroke={gridColor} strokeWidth={1} strokeDasharray="2,5" />
                ))}

                {/* WHO reference lines */}
                <Path d={whoPath('p97')} fill="none" stroke="rgba(212,131,122,0.35)" strokeWidth={1} strokeDasharray="3,4" />
                <Path d={whoPath('p50')} fill="none" stroke="rgba(107,175,138,0.65)" strokeWidth={1.5} strokeDasharray="5,4" />
                <Path d={whoPath('p3')}  fill="none" stroke="rgba(212,131,122,0.35)" strokeWidth={1} strokeDasharray="3,4" />

                {/* Percentile labels — right edge */}
                <SvgText x={pad.left + iW + 3} y={toY(whoData[maxAge]?.p97 ?? 0) + 3}
                    textAnchor="start" fill="rgba(212,131,122,0.65)" fontSize="7.5">97</SvgText>
                <SvgText x={pad.left + iW + 3} y={toY(whoData[maxAge]?.p50 ?? 0) + 3}
                    textAnchor="start" fill="rgba(107,175,138,0.8)" fontSize="7.5">50</SvgText>
                <SvgText x={pad.left + iW + 3} y={toY(whoData[maxAge]?.p3 ?? 0) + 3}
                    textAnchor="start" fill="rgba(212,131,122,0.65)" fontSize="7.5">3</SvgText>

                {/* Baby gradient fill */}
                <Path d={babyArea} fill={`url(#grad-${type})`} />

                {/* Baby line */}
                <Path d={babyCurve} fill="none" stroke={color} strokeWidth={2.5}
                    strokeLinecap="round" strokeLinejoin="round" />

                {/* Intermediate measurement dots */}
                {agePoints.slice(0, -1).map((age, i) => (
                    <Circle key={i} cx={toX(age)} cy={toY(data[i].value)} r={3.5}
                        fill="#fff" stroke={color} strokeWidth={2} />
                ))}

                {/* Last measurement — halo + solid dot (most recent reading) */}
                <Circle cx={lastX} cy={lastY} r={11} fill={color} opacity={0.1} />
                <Circle cx={lastX} cy={lastY} r={6} fill={color} />
                <Circle cx={lastX} cy={lastY} r={2.5} fill="#fff" />

                {/* Milestone dots on X axis */}
                {milestones.map(m => (
                    <Circle key={m.month} cx={toX(m.month)} cy={pad.top + iH + 10}
                        r={3} fill={m.dot} opacity={0.7} />
                ))}

                {/* X-axis labels (months) */}
                {xTicks.map(m => (
                    <SvgText key={m} x={toX(m)} y={cH - 2} textAnchor="middle"
                        fill={axisColor} fontSize="8.5">{m}</SvgText>
                ))}

                {/* Y-axis labels */}
                {yTicks.map((v, i) => (
                    <SvgText key={i} x={pad.left - 4} y={toY(v) + 3} textAnchor="end"
                        fill={axisColor} fontSize="8.5">
                        {v.toFixed(yDecimals)}
                    </SvgText>
                ))}
            </Svg>

            {/* Legend */}
            <View style={chartStyles.legend}>
                <View style={chartStyles.legendItem}>
                    <View style={chartStyles.legendGreen} />
                    <Text style={[chartStyles.legendText, { color: theme.textTertiary }]}>טווח תקין WHO</Text>
                </View>
                <View style={chartStyles.legendItem}>
                    <View style={{ width: 16, height: 1.5, backgroundColor: 'rgba(212,131,122,0.5)', borderRadius: 1 }} />
                    <Text style={[chartStyles.legendText, { color: theme.textTertiary }]}>3% / 97%</Text>
                </View>
            </View>
        </View>
    );
};

const chartStyles = StyleSheet.create({
    container: { borderRadius: 18, padding: 18, marginBottom: 12 },
    headerRow1: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    headerRow2: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
    title: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
    statusLabel: { fontSize: 11, fontWeight: '600' },
    currentValue: { fontSize: 28, fontWeight: '700' },
    valueUnit: { fontSize: 13, fontWeight: '500' },
    pctPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    pctText: { fontSize: 11, fontWeight: '700' },
    empty: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 13, textAlign: 'center' },
    legend: { flexDirection: 'row-reverse', gap: 14, marginTop: 8, paddingHorizontal: 2 },
    legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
    legendGreen: { width: 14, height: 9, backgroundColor: 'rgba(107,175,138,0.3)', borderRadius: 3 },
    legendText: { fontSize: 10, fontWeight: '500' },
});

// Percentile Card
const PercentileCard = ({ icon: Icon, label, value, unit, percentile, change, color, bgColor }: {
    icon: any; label: string; value: number | null; unit: string;
    percentile: number; change?: number; color: string; bgColor: string;
}) => {
    const { theme } = useTheme();
    const status = getPercentileStatus(percentile);
    const hasValue = value !== null && value > 0;
    const hasChange = change !== undefined && change !== 0;

    return (
        <View style={[percStyles.card, { backgroundColor: theme.card }]}>
            <View style={[percStyles.iconWrap, { backgroundColor: bgColor }]}>
                <Icon size={20} color={color} strokeWidth={2} />
            </View>
            <View style={percStyles.content}>
                <Text style={[percStyles.label, { color: theme.textSecondary }]}>{label}</Text>
                <View style={percStyles.valueRow}>
                    <Text style={[percStyles.value, { color: theme.textPrimary }]}>
                        {hasValue ? value : '-'}
                    </Text>
                    <Text style={[percStyles.unit, { color: theme.textTertiary }]}>{unit}</Text>
                    {hasChange && (
                        <View style={[percStyles.changeBadge, { backgroundColor: change > 0 ? '#E8F5EE' : '#FAEAE8' }]}>
                            <Text style={[percStyles.changeText, { color: change > 0 ? '#6BAF8A' : '#D4837A' }]}>
                                {change > 0 ? '+' : ''}{change}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            {hasValue && (
                <View style={percStyles.percentileWrap}>
                    <View style={[percStyles.percentileBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[percStyles.percentileText, { color: status.color }]}>
                            {Math.round(percentile)}%
                        </Text>
                    </View>
                    <Text style={[percStyles.percentileLabel, { color: theme.textTertiary }]}>{status.statusHe}</Text>
                </View>
            )}
        </View>
    );
};

const percStyles = StyleSheet.create({
    card: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12 },
    iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, marginRight: 12, alignItems: 'flex-end' },
    label: { fontSize: 12, marginBottom: 2 },
    valueRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    value: { fontSize: 24, fontWeight: '700' },
    unit: { fontSize: 14 },
    changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4 },
    changeText: { fontSize: 11, fontWeight: '600' },
    percentileWrap: { alignItems: 'center', marginLeft: 12 },
    percentileBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    percentileText: { fontSize: 14, fontWeight: '700' },
    percentileLabel: { fontSize: 10, marginTop: 2 },
});

// Measurement Row - Now tappable for edit
const MeasurementRow = ({ measurement, onEdit }: {
    measurement: GrowthMeasurement;
    onEdit: (m: GrowthMeasurement) => void;
}) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const date = measurement.date.toDate();

    return (
        <TouchableOpacity onPress={() => onEdit(measurement)} activeOpacity={0.7}>
            <Animated.View
                layout={Layout.springify()}
                style={[histStyles.row, { backgroundColor: theme.card }]}
            >
                <View style={histStyles.dateWrap}>
                    <Calendar size={14} color={theme.textTertiary} />
                    <Text style={[histStyles.date, { color: theme.textSecondary }]}>
                        {format(date, 'd/M/yy', { locale: he })}
                    </Text>
                </View>

                <View style={histStyles.values}>
                    {measurement.weight && (
                        <View style={histStyles.valueItem}>
                            <Scale size={12} color="#C8806A" />
                            <Text style={[histStyles.valueText, { color: theme.textPrimary }]}>
                                {measurement.weight} {t('reports.units.kg')}
                            </Text>
                        </View>
                    )}
                    {measurement.height && (
                        <View style={histStyles.valueItem}>
                            <Ruler size={12} color="#83C5BE" />
                            <Text style={[histStyles.valueText, { color: theme.textPrimary }]}>
                                {measurement.height} {t('reports.units.cm')}
                            </Text>
                        </View>
                    )}
                    {measurement.headCircumference && (
                        <View style={histStyles.valueItem}>
                            <Activity size={12} color={theme.actionColors.quickReminder.color} />
                            <Text style={[histStyles.valueText, { color: theme.textPrimary }]}>
                                {measurement.headCircumference} {t('reports.units.cm')}
                            </Text>
                        </View>
                    )}
                </View>

                <Edit3 size={16} color={theme.textTertiary} />
            </Animated.View>
        </TouchableOpacity>
    );
};

const histStyles = StyleSheet.create({
    row: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
    dateWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginLeft: 12 },
    date: { fontSize: 12, fontWeight: '500' },
    values: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    valueItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    valueText: { fontSize: 13, fontWeight: '500' },
});

export default function DetailedGrowthScreen({
    onClose,
    childId,
    ageInMonths: propAge,
    gender,
    demoMode = false,
}: DetailedGrowthScreenProps) {
    const { theme } = useTheme();
    const { t, language } = useLanguage();
    const dateFnsLocale = DATE_FNS_LOCALES[language] || he;
    let { baby, refresh } = useBabyProfile(demoMode ? '' : childId);
    let ageInMonths = demoMode ? 12 : propAge;
    const [measurements, setMeasurements] = useState<GrowthMeasurement[]>(demoMode ? DEMO_MEASUREMENTS : []);
    const [change, setChange] = useState<{ weight?: number; height?: number; headCircumference?: number } | null>(null);
    const [loading, setLoading] = useState(!demoMode);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editMeasurement, setEditMeasurement] = useState<GrowthMeasurement | undefined>(undefined);

    const genderKey = gender === 'girl' ? 'girl' : 'boy';

    const birthDate = React.useMemo(() => {
        if (demoMode) return DEMO_BIRTH_DATE;
        if (!baby?.birthDate) return null;
        return baby.birthDate.toDate ? baby.birthDate.toDate() : new Date(baby.birthDate as any);
    }, [demoMode, baby?.birthDate]);

    const fetchData = useCallback(async () => {
        if (!childId) return;

        try {
            const data = await getMeasurementsForChart(childId, 50);
            setMeasurements(data);
            const growthChange = await getGrowthChange(childId);
            setChange(growthChange);
        } catch (error) {
            logger.error('Error fetching growth data:', error);
        }
    }, [childId]);

    useEffect(() => {
        if (demoMode) { setLoading(false); return; }
        setLoading(true);
        fetchData().finally(() => setLoading(false));
    }, [fetchData, demoMode]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        await refresh?.();
        setRefreshing(false);
    }, [fetchData, refresh]);



    const handleEdit = useCallback((m: GrowthMeasurement) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditMeasurement(m);
        setShowModal(true);
    }, []);

    const handleAddNew = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditMeasurement(undefined);
        setShowModal(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setShowModal(false);
        setEditMeasurement(undefined);
        fetchData();
        refresh?.();
    }, [fetchData, refresh]);

    // Export to share with doctor
    const handleExport = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const babyName = baby?.name || t('reports.misc.baby');
        let reportText = `📊 ${t('reports.growth.title')} - ${babyName}\n`;
        reportText += `${t('reports.growth.childAge')}: ${ageInMonths} ${t('reports.units.months')}\n`;
        reportText += `${format(new Date(), 'd MMMM yyyy', { locale: dateFnsLocale })}\n\n`;

        reportText += `━━━ ${t('detailedGrowth.currentMeasurements')} ━━━\n`;
        if (baby?.stats?.weight) reportText += `• ${t('reports.metrics.weight')}: ${baby.stats.weight} ${t('reports.units.kg')}\n`;
        if (baby?.stats?.height) reportText += `• ${t('reports.metrics.height')}: ${baby.stats.height} ${t('reports.units.cm')}\n`;
        if (baby?.stats?.headCircumference) reportText += `• ${t('reports.metrics.headCircumference')}: ${baby.stats.headCircumference} ${t('reports.units.cm')}\n`;

        if (measurements.length > 0) {
            reportText += `\n━━━ ${t('detailedGrowth.measurementHistory')} (${measurements.length}) ━━━\n`;
            measurements.slice().reverse().slice(0, 10).forEach((m) => {
                const date = format(m.date.toDate(), 'd/M/yy');
                const parts: string[] = [];
                if (m.weight) parts.push(`${m.weight} ${t('reports.units.kg')}`);
                if (m.height) parts.push(`${m.height} ${t('reports.units.cm')}`);
                if (m.headCircumference) parts.push(`${t('reports.metrics.headCircumference')} ${m.headCircumference}`);
                reportText += `${date}: ${parts.join(' | ')}\n`;
            });
        }

        reportText += `\n📱 Calmino`;

        try {
            await Share.share({
                message: reportText,
                title: `${t('reports.growth.title')} - ${babyName}`,
            });
        } catch (error) {
            Alert.alert(t('common.error'), t('reports.share.error'));
        }
    }, [baby, measurements, ageInMonths, t, dateFnsLocale]);

    const chartData = useMemo(() => ({
        weightData: measurements.filter(m => m.weight !== undefined).map(m => ({ date: m.date.toDate(), value: m.weight! })),
        heightData: measurements.filter(m => m.height !== undefined).map(m => ({ date: m.date.toDate(), value: m.height! })),
        headData: measurements.filter(m => m.headCircumference !== undefined).map(m => ({ date: m.date.toDate(), value: m.headCircumference! })),
    }), [measurements]);

    const currentValues = useMemo(() => {
        // Try baby.stats first, fallback to latest measurement
        const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

        // Read current stats from baby profile
        const stats = baby?.stats;

        const weight = stats?.weight
            ? parseFloat(stats.weight)
            : latestMeasurement?.weight || null;
        const height = stats?.height
            ? parseFloat(stats.height)
            : latestMeasurement?.height || null;
        const head = stats?.headCircumference
            ? parseFloat(stats.headCircumference)
            : latestMeasurement?.headCircumference || null;

        return {
            weight, height, head,
            weightPercentile: weight ? calculatePercentile(weight, ageInMonths, 'weight', genderKey) : 0,
            heightPercentile: height ? calculatePercentile(height, ageInMonths, 'length', genderKey) : 0,
            headPercentile: head ? calculatePercentile(head, ageInMonths, 'head', genderKey) : 0,
        };
    }, [baby?.stats, measurements, ageInMonths, genderKey]);

    const lastMeasurementDate = useMemo(() => {
        if (measurements.length === 0) return null;
        return format(measurements[measurements.length - 1].date.toDate(), 'd MMMM yyyy', { locale: dateFnsLocale });
    }, [measurements]);

    return (

        <View style={[styles.container, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={styles.backButton}
                    onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                >
                    <ChevronDown size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <TrendingUp size={20} color="#83C5BE" strokeWidth={2} />
                    <Text style={[styles.headerText, { color: theme.textPrimary }]}>{t('reports.growth.title')}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleExport}>
                        <Share2 size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleAddNew}>
                        <Plus size={24} color="#83C5BE" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#83C5BE" />}
            >
                {/* Summary */}
                <View style={[styles.summaryCard, { backgroundColor: theme.actionColors.growth.lightColor }]}>
                    <Text style={[styles.summaryLabel, { color: '#83C5BE' }]}>{t('reports.growth.childAge')}</Text>
                    <View style={styles.summaryValue}>
                        <Text style={[styles.summaryNumber, { color: '#83C5BE' }]}>{ageInMonths}</Text>
                        <Text style={[styles.summaryUnit, { color: '#83C5BE' }]}>{t('reports.units.months')}</Text>
                    </View>
                    {lastMeasurementDate && (
                        <Text style={[styles.lastUpdate, { color: '#83C5BE' }]}>{lastMeasurementDate}</Text>
                    )}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <InlineLoader size="large" color="#83C5BE" />
                    </View>
                ) : (
                    <>
                        {/* Percentile Cards */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.growth.currentMeasurements')}</Text>
                            <PercentileCard icon={Scale} label={t('reports.metrics.weight')} value={currentValues.weight} unit={t('reports.units.kg')}
                                percentile={currentValues.weightPercentile} change={change?.weight} color={theme.primary} bgColor={theme.primaryLight} />
                            <PercentileCard icon={Ruler} label={t('reports.metrics.height')} value={currentValues.height} unit={t('reports.units.cm')}
                                percentile={currentValues.heightPercentile} change={change?.height} color={theme.actionColors.growth.color} bgColor={theme.actionColors.growth.lightColor} />
                            <PercentileCard icon={Activity} label={t('reports.metrics.headCircumference')} value={currentValues.head} unit={t('reports.units.cm')}
                                percentile={currentValues.headPercentile} change={change?.headCircumference} color={theme.actionColors.quickReminder.color} bgColor={theme.actionColors.quickReminder.lightColor} />
                        </View>

                        {/* Charts */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('reports.growth.trend')}</Text>
                            <GrowthChart data={chartData.weightData} color={theme.primary} title={t('reports.metrics.weight')} unit={t('reports.units.kg')} type="weight" gender={gender} birthDate={birthDate} />
                            <GrowthChart data={chartData.heightData} color={theme.actionColors.growth.color} title={t('reports.metrics.height')} unit={t('reports.units.cm')} type="length" gender={gender} birthDate={birthDate} />
                            <GrowthChart data={chartData.headData} color={theme.actionColors.quickReminder.color} title={t('reports.metrics.headCircumference')} unit={t('reports.units.cm')} type="head" gender={gender} birthDate={birthDate} />
                        </View>

                        {/* History */}
                        {measurements.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                    {t('detailedGrowth.measurementHistory')} ({measurements.length})
                                </Text>
                                {measurements.slice().reverse().map((m) => (
                                    <MeasurementRow key={m.id} measurement={m} onEdit={handleEdit} />
                                ))}
                            </View>
                        )}

                        {/* Export Button */}
                        <TouchableOpacity
                            style={[styles.exportBtn, { backgroundColor: theme.cardSecondary }]}
                            onPress={handleExport}
                        >
                            <Share2 size={18} color="#83C5BE" />
                            <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>
                                {t('detailedGrowth.shareReportToDoctor')}
                            </Text>
                        </TouchableOpacity>

                        {/* Disclaimer */}
                        <View style={[styles.disclaimer, { backgroundColor: theme.cardSecondary }]}>
                            <Info size={14} color={theme.textTertiary} />
                            <Text style={[styles.disclaimerText, { color: theme.textTertiary }]}>
                                {t('detailedGrowth.whoDisclaimer')}
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <GrowthModal
                visible={showModal}
                onClose={handleModalClose}
                childId={childId}
                editMeasurement={editMeasurement}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 // Reduced padding top for modal
    },
    backButton: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' }, // Right align for RTL
    headerTitle: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    headerText: { fontSize: 18, fontWeight: '600' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBtn: { padding: 6 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    summaryCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
    summaryLabel: { fontSize: 13, marginBottom: 4 },
    summaryValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    summaryNumber: { fontSize: 48, fontWeight: '300' },
    summaryUnit: { fontSize: 20, fontWeight: '300' },
    lastUpdate: { fontSize: 12, marginTop: 8 },
    loadingContainer: { height: 300, alignItems: 'center', justifyContent: 'center' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '600', textAlign: 'right', marginBottom: 12 },
    exportBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: 16, borderRadius: 16, marginBottom: 16
    },
    exportBtnText: { fontSize: 15, fontWeight: '600' },
    disclaimer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
    disclaimerText: { fontSize: 12, flex: 1, textAlign: 'right' },
});
