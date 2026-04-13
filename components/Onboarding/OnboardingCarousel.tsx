import React, { useState, useRef, useEffect } from 'react';
import {
    Modal, View, Text, TouchableOpacity, StyleSheet,
    Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, Platform, Image,
} from 'react-native';
import { LiquidGlassView } from '@callstack/liquid-glass';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeIn, FadeInDown, FadeInUp,
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, withRepeat, withSequence, withDelay,
    Easing, interpolate, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';

const { width } = Dimensions.get('window');

export const ONBOARDING_KEY = '@calmino_onboarding_done';

// ─── SLIDE THEME CONFIG ──────────────────────────────────────────────────────

type SlideConfig = {
    gradient: readonly [string, string, string];
    accentColor: string;
};

const SLIDE_CONFIGS: SlideConfig[] = [
    { gradient: ['#7B3030', '#C8806A', '#D49A80'], accentColor: '#FFFFFF' },
    { gradient: ['#1a0a2e', '#2d1b4e', '#1e0e3e'], accentColor: '#A78BFA' },
    { gradient: ['#0a1e28', '#0d2A37', '#073828'], accentColor: '#34D399' },
    { gradient: ['#2e0f14', '#1f090d', '#0f0406'], accentColor: '#F43F5E' },
    { gradient: ['#0f1923', '#1a2844', '#0f3460'], accentColor: '#C8806A' },
];

// ─── EFFECTS & COLORS ────────────────────────────────────────────────────────
const GLOW_COLOR = 'rgba(255, 230, 210, 0.2)';
const ICON_COLOR = '#FFE1D6';

// ─── GLASSMORPHISM BABY HOLOGRAM ─────────────────────────────────────────────

function GlassBabyHologram() {
    const floatY = useSharedValue(0);
    const rotate = useSharedValue(0);
    const shimmer = useSharedValue(0);
    const ring1Scale = useSharedValue(1);
    const ring2Scale = useSharedValue(1);

    useEffect(() => {
        // Float up and down
        floatY.value = withRepeat(
            withSequence(
                withTiming(-14, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, true,
        );
        // Slow rotation sway
        rotate.value = withRepeat(
            withSequence(
                withTiming(-4, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
                withTiming(4, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, true,
        );
        // Shimmer pulse
        shimmer.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.4, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, true,
        );
        // Expanding rings
        ring1Scale.value = withRepeat(
            withSequence(
                withTiming(1.4, { duration: 3000, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 0 }),
            ),
            -1, false,
        );
        ring2Scale.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500 }),
                withTiming(1.4, { duration: 1500, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 0 }),
            ),
            -1, false,
        );
    }, []);

    const hologramStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: floatY.value },
            { rotate: `${rotate.value}deg` },
        ],
    }));
    const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring1Scale.value }],
        opacity: interpolate(ring1Scale.value, [1, 1.4], [0.35, 0]),
    }));
    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: ring2Scale.value }],
        opacity: interpolate(ring2Scale.value, [1, 1.4], [0.25, 0]),
    }));

    return (
        <View style={gbh.wrapper}>
            {/* Pulsing aura rings */}
            <Animated.View style={[gbh.ring, gbh.ring1, ring1Style]} />
            <Animated.View style={[gbh.ring, gbh.ring2, ring2Style]} />

            {/* Main hologram orb */}
            <Animated.View style={[gbh.hologram, hologramStyle]}>
                {/* Background soft glow */}
                <Animated.View style={[gbh.innerGlow, shimmerStyle]} />

                {/* Glass Sphere */}
                <View style={gbh.glassSphere}>
                    <View style={gbh.glassSphereHighlight} />
                    
                    {/* App icon inside the crystal */}
                    <Image source={require('../../assets/icon.png')} style={{ width: 62, height: 62, borderRadius: 16 }} />
                    
                    {/* Floating sparkle dots inside glass */}
                    <Animated.View style={[gbh.sparkle, { top: 18, right: 22 }, shimmerStyle]} />
                    <Animated.View style={[gbh.sparkle, { bottom: 25, left: 24, width: 4, height: 4 }, shimmerStyle]} />
                </View>
            </Animated.View>
        </View>
    );
}

const gbh = StyleSheet.create({
    wrapper: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', borderRadius: 90, borderWidth: 1.5 },
    ring1: { width: 160, height: 160, borderColor: 'rgba(255,230,210,0.5)' },
    ring2: { width: 160, height: 160, borderColor: 'rgba(255,255,255,0.25)' },
    hologram: { alignItems: 'center', justifyContent: 'center' },
    innerGlow: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: GLOW_COLOR },
    // Glass Sphere
    glassSphere: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        backgroundColor: 'rgba(255,255,255,0.08)', 
        borderWidth: 1.5, 
        borderColor: 'rgba(255,255,255,0.3)', 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden',
        shadowColor: 'white',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
    },
    glassSphereHighlight: { 
        position: 'absolute', 
        top: 2, 
        left: 10, 
        width: 40, 
        height: 25, 
        borderRadius: 15, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        transform: [{ rotate: '-25deg' }] 
    },
    // Sparkles
    sparkle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.95)' },
});

// ─── SLIDE 1: WELCOME ────────────────────────────────────────────────────────

function WelcomeSlideContent({ babyName }: { babyName: string }) {
    const { t } = useLanguage();
    const contentScale = useSharedValue(0.85);
    const contentOpacity = useSharedValue(0);

    useEffect(() => {
        contentScale.value = withSpring(1, { damping: 14, stiffness: 80 });
        contentOpacity.value = withTiming(1, { duration: 600 });
    }, []);

    const contentStyle = useAnimatedStyle(() => ({
        transform: [{ scale: contentScale.value }],
        opacity: contentOpacity.value,
    }));

    return (
        <Animated.View style={[wsc.container, contentStyle]}>
            <GlassBabyHologram />

            {Boolean(babyName) && (
                <Animated.Text entering={FadeInDown.delay(400).springify()} style={wsc.greeting}>
                    {t('onboarding.slide1.greeting', { name: babyName })}
                </Animated.Text>
            )}

            <Animated.Text entering={FadeInDown.delay(babyName ? 520 : 400).springify()} style={wsc.title}>
                {t('onboarding.slide1.title')}
            </Animated.Text>

            <Animated.Text entering={FadeInDown.delay(babyName ? 660 : 540).springify()} style={wsc.subtitle}>
                {t('onboarding.slide1.subtitle')}
            </Animated.Text>
        </Animated.View>
    );
}


const wsc = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
    emoji: { fontSize: 100, marginBottom: 8 },
    greeting: { fontSize: 21, color: 'rgba(255,255,255,0.88)', fontWeight: '600', textAlign: 'center' },
    title: { fontSize: 42, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1.5, lineHeight: 50 },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 25, maxWidth: 300, marginTop: 4 },
});

// (Timer Slide Removed as requested)

// ─── SLIDE 2: QUICK ACTIONS SHOWCASE ────────────────────────────────────────
import { Moon, Utensils, Droplets, Activity, Users, UserPlus, Heart, Stethoscope, Syringe, Thermometer, Rocket, Star, MapPin, Music, Pill, Award, Sparkles, Lightbulb, Bell, Plus, TrendingUp, HeartPulse } from 'lucide-react-native';

// Exact colors + icons from QuickActionsConfig / ThemeContext
const QUICK_ACTIONS_GRID = [
    { Icon: Utensils,   color: '#D4A373', key: 'food' },
    { Icon: Moon,       color: '#4A6572', key: 'sleep' },
    { Icon: Droplets,   color: '#6A9C89', key: 'diaper' },
    { Icon: Pill,       color: '#B5838D', key: 'supplements' },
    { Icon: Music,      color: '#557A9D', key: 'whiteNoise' },
    { Icon: Sparkles,   color: '#8D4A60', key: 'moments' },
    { Icon: Award,      color: '#D4A373', key: 'milestones' },
    { Icon: HeartPulse, color: '#8EB168', key: 'health' },
    { Icon: TrendingUp, color: '#83C5BE', key: 'growth' },
    { Icon: Lightbulb,  color: '#E9C46A', key: 'nightLight' },
    { Icon: Bell,       color: '#A29BFE', key: 'reminder' },
    { Icon: Heart,      color: '#CD8B87', key: 'sos' },
];

function QuickActionsSlideContent() {
    const { t } = useLanguage();
    // 3 staggered float values for rows
    const f0 = useSharedValue(0);
    const f1 = useSharedValue(0);
    const f2 = useSharedValue(0);

    useEffect(() => {
        const float = (sv: typeof f0, delayMs: number) => {
            sv.value = withDelay(delayMs, withRepeat(
                withSequence(
                    withTiming(-7, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0,  { duration: 2200, easing: Easing.inOut(Easing.ease) }),
                ),
                -1, false,
            ));
        };
        float(f0, 0);
        float(f1, 730);
        float(f2, 1460);
    }, []);

    const s0 = useAnimatedStyle(() => ({ transform: [{ translateY: f0.value }] }));
    const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: f1.value }] }));
    const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: f2.value }] }));
    const rowStyles = [s0, s1, s2];

    const rows = [
        QUICK_ACTIONS_GRID.slice(0, 4),
        QUICK_ACTIONS_GRID.slice(4, 8),
        QUICK_ACTIONS_GRID.slice(8, 12),
    ];

    return (
        <View style={qas.container}>
            <Animated.Text entering={FadeInDown.delay(60).springify()} style={qas.title}>
                {t('onboarding.slide2.title')}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(160).springify()} style={qas.subtitle}>
                {t('onboarding.slide2.subtitle')}
            </Animated.Text>

            <View style={qas.grid}>
                {rows.map((row, ri) => (
                    <Animated.View key={ri} style={[qas.row, rowStyles[ri]]}>
                        {row.map(({ Icon, color, key }, ci) => (
                            <Animated.View
                                key={ci}
                                entering={FadeInDown.delay(220 + ri * 80 + ci * 40).springify()}
                                style={qas.item}
                            >
                                <View style={[qas.circle, { backgroundColor: color }]}>
                                    <Icon size={22} color="#FFFFFF" strokeWidth={1.8} />
                                </View>
                                <Text style={qas.label}>{t('onboarding.slide2.' + key)}</Text>
                            </Animated.View>
                        ))}
                    </Animated.View>
                ))}
            </View>
        </View>
    );
}

const qas = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
    title: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1.2 },
    subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
    grid: { gap: 8, alignItems: 'center', width: '100%' },
    row: { flexDirection: 'row', gap: 18, justifyContent: 'center' },
    item: { alignItems: 'center', gap: 6, width: 62 },
    circle: {
        width: 58, height: 58, borderRadius: 29,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
    },
    label: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
});

// ─── SLIDE 4: STATISTICS ──────────────────────────────────────────────────────

const STATS_DATA = [
    { val: '120', key: 'feedings', sub: '17908 מ"ל', subKey: null, color: '#DEAA6E', bg: '#FDF8F3', Icon: Utensils },
    { val: '150', key: 'diapers', sub: ' ', subKey: null, color: '#689A84', bg: '#F2F8F5', Icon: Droplets },
    { val: '268', key: 'sleepHours', sub: null, subKey: 'naps', subPrefix: '60 ', color: '#3A5266', bg: '#F0F3F6', Icon: Moon },
    { val: '30', key: 'supplementsLabel', sub: ' ', subKey: null, color: '#C98696', bg: '#FDF4F6', Icon: Activity },
];

function StatisticsSlideContent() {
    const { t } = useLanguage();
    return (
        <View style={stc.container}>
            <Animated.Text entering={FadeInDown.delay(80).springify()} style={stc.slideTitle}>
                {t('onboarding.slide3.title')}
            </Animated.Text>

            {/* Filter Pills */}
            <Animated.View entering={FadeInDown.delay(160).springify()} style={stc.filterRow}>
                <View style={stc.filterPillActive}><Text style={stc.filterTextActive}>{t('onboarding.slide3.weekly')}</Text></View>
                <View style={stc.filterPill}><Text style={stc.filterText}>{t('onboarding.slide3.monthly')}</Text></View>
                <View style={stc.filterPill}><Text style={stc.filterText}>{t('onboarding.slide3.daily')}</Text></View>
            </Animated.View>

            {/* Cards Grid */}
            <View style={stc.grid}>
                {STATS_DATA.map((st, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(220 + i * 140).springify()} style={stc.card}>

                        <View style={stc.cardHeader}>
                            <View style={[stc.iconBox, { backgroundColor: st.color }]}>
                                <st.Icon size={16} color="#FFFFFF" strokeWidth={2} />
                            </View>
                            <Text style={stc.arrowIcon}>‹</Text>
                        </View>

                        <View style={stc.cardBody}>
                            <Text style={stc.cardValue}>{st.val}</Text>
                            <Text style={stc.cardLabel}>{t('onboarding.slide3.' + st.key)}</Text>
                            <Text style={stc.cardSub}>
                                {st.subKey
                                    ? (st.subPrefix || '') + t('onboarding.slide3.' + st.subKey)
                                    : st.sub}
                            </Text>
                        </View>

                        {/* Mini Bar Chart Mockup */}
                        <View style={stc.chartRow}>
                            {[0.5, 0.8, 0.4, 0.9, 0.6, 1].map((h, idx) => (
                                <View key={idx} style={[stc.bar, { height: h * 16, backgroundColor: st.color }]} />
                            ))}
                        </View>

                    </Animated.View>
                ))}
            </View>

            <Animated.Text entering={FadeInUp.delay(760).springify()} style={stc.slideSubtitle}>
                {t('onboarding.slide3.subtitle')}
            </Animated.Text>
        </View>
    );
}

const stc = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 18, width: '100%' },
    slideTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1 },
    
    filterRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 4 },
    filterPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    filterPillActive: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF' },
    filterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    filterTextActive: { color: '#000000', fontSize: 13, fontWeight: '700' },
    
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    card: { width: 154, height: 162, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
    
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
    iconBox: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    arrowIcon: { fontSize: 18, color: '#D1D5DB', fontWeight: 'bold' },
    
    cardBody: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', marginTop: 4 },
    cardValue: { fontSize: 28, fontWeight: '800', color: '#1F2937', letterSpacing: -1 },
    cardLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginTop: -2 },
    cardSub: { fontSize: 10, color: '#9CA3AF', marginTop: 2, minHeight: 12 },
    
    chartRow: { flexDirection: 'row-reverse', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 3, marginTop: 10, opacity: 0.6 },
    bar: { width: 4, borderRadius: 2 },
    
    slideSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, maxWidth: 310, marginTop: 16 },
});

// ─── SLIDE 4: BABYSITTER ─────────────────────────────────────────────────────

const SITTER_LIST = [
    { name: 'שירה רוזנברג', city: 'הרצליה', rating: 4.5, reviews: 8, price: 50, experience: 'שנת ניסיון', availableTonight: false, isFavorite: true,  emoji: '👩🏻' },
    { name: 'נועה כהן',     city: 'תל אביב', rating: 4.9, reviews: 24, price: 70, experience: '3 שנות ניסיון', availableTonight: true,  isFavorite: false, emoji: '👩🏽‍🦱' },
    { name: 'מאיה אברהם',   city: 'תל אביב', rating: 5.0, reviews: 42, price: 90, experience: '10 שנות ניסיון', availableTonight: true,  isFavorite: true,  emoji: '👩🏻‍🦳' },
];

function BabysitterSlideContent() {
    const { t } = useLanguage();
    return (
        <View style={bsc.container}>
            <Animated.Text entering={FadeInDown.delay(80).springify()} style={bsc.slideTitle}>
                {t('onboarding.slide4.title')}
            </Animated.Text>

            <View style={bsc.list}>
                {SITTER_LIST.map((sitter, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(160 + i * 110).springify()}>
                        <LiquidGlassView
                            style={bsc.card}
                            effect="regular"
                            colorScheme="dark"
                        >
                            <View style={bsc.cardTop}>
                                {/* Avatar */}
                                <View style={bsc.photoWrapper}>
                                    <View style={bsc.avatarCircle}>
                                        <Text style={bsc.avatarEmoji}>{sitter.emoji}</Text>
                                    </View>
                                    {sitter.availableTonight && <View style={bsc.availableDot} />}
                                </View>

                                {/* Info */}
                                <View style={bsc.info}>
                                    <View style={bsc.nameRow}>
                                        <Heart size={15} color={sitter.isFavorite ? '#F43F5E' : 'rgba(255,255,255,0.3)'} fill={sitter.isFavorite ? '#F43F5E' : 'transparent'} strokeWidth={sitter.isFavorite ? 0 : 1.5} />
                                        {sitter.availableTonight && (
                                            <View style={bsc.tonightBadge}><Text style={bsc.tonightText}>{t('onboarding.slide4.availableTonight')}</Text></View>
                                        )}
                                        <Text style={bsc.sitterName}>{sitter.name}</Text>
                                    </View>
                                    <View style={bsc.metaRow}>
                                        <Star size={11} color="#FBBF24" fill="#FBBF24" strokeWidth={1.5} />
                                        <Text style={bsc.ratingText}>{sitter.rating.toFixed(1)}</Text>
                                        <Text style={bsc.reviewCount}>({sitter.reviews})</Text>
                                        <View style={bsc.dot} />
                                        <Text style={bsc.experience}>{sitter.experience}</Text>
                                    </View>
                                    <View style={bsc.locationRow}>
                                        <MapPin size={10} color="rgba(255,255,255,0.5)" strokeWidth={2} />
                                        <Text style={bsc.locationText}>{sitter.city}</Text>
                                    </View>
                                </View>

                                {/* Price */}
                                <View style={bsc.priceBlock}>
                                    <Text style={bsc.price}>{sitter.price} ₪</Text>
                                    <Text style={bsc.priceLabel}>{t('onboarding.slide4.perHour')}</Text>
                                </View>
                            </View>
                        </LiquidGlassView>
                    </Animated.View>
                ))}
            </View>

            <Animated.Text entering={FadeInUp.delay(660).springify()} style={bsc.slideSubtitle}>
                {t('onboarding.slide4.subtitle')}
            </Animated.Text>
        </View>
    );
}

const bsc = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 14, width: '100%' },
    slideTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1 },

    list: { width: '100%', gap: 10 },
    card: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, overflow: 'hidden' },
    cardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },

    photoWrapper: { position: 'relative', flexShrink: 0 },
    avatarCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarEmoji: { fontSize: 32 },
    availableDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: '#C8806A', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },

    info: { flex: 1, alignItems: 'flex-end' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
    sitterName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
    tonightBadge: { backgroundColor: 'rgba(200,128,106,0.35)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    tonightText: { fontSize: 10, fontWeight: '700', color: '#FFBFA8' },

    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
    ratingText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    reviewCount: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
    experience: { fontSize: 11, color: 'rgba(255,255,255,0.55)' },

    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    locationText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

    priceBlock: { alignItems: 'center', minWidth: 44 },
    price: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
    priceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

    slideSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 23, maxWidth: 300 },
});

// ─── SLIDE 5: FAMILY SHARING ─────────────────────────────────────────────────

const FAMILY_LIST = [
    { name: 'דני (אני)', email: 'dani@gmail.com', roleKey: 'admin', initial: 'ד' },
    { name: 'אמא', email: 'ima@example.com', roleKey: 'member', initial: 'א' },
    { name: 'סבתא רחל', email: 'savta@example.com', roleKey: 'guest', initial: 'ס' },
];

function FamilySharingSlideContent() {
    const { t } = useLanguage();
    return (
        <View style={fsc.container}>
            <Animated.Text entering={FadeInDown.delay(80).springify()} style={fsc.slideTitle}>
                {t('onboarding.slide5.title')}
            </Animated.Text>

            <Animated.View entering={FadeInDown.delay(200).springify()} style={fsc.card}>

                {/* Header */}
                <View style={fsc.cardHeader}>
                    <View style={fsc.iconCircle}>
                        <Users size={18} color="#1F2937" strokeWidth={2.5} />
                    </View>
                    <View style={fsc.headerTexts}>
                        <Text style={fsc.cardTitle}>משפחת נועם</Text>
                        <Text style={fsc.cardSub}>{t('onboarding.slide5.membersCount', { count: 5 })}</Text>
                    </View>
                </View>

                {/* Separator */}
                <View style={fsc.separator} />

                {/* Members List */}
                <View style={fsc.list}>
                    {FAMILY_LIST.map((m, i) => (
                        <Animated.View key={i} entering={FadeInDown.delay(300 + i * 120).springify()} style={fsc.memberRow}>
                            <View style={fsc.rolePill}><Text style={fsc.roleText}>{t('onboarding.slide5.' + m.roleKey)}</Text></View>

                            <View style={fsc.memberInfo}>
                                <Text style={fsc.memberName}>{m.name}</Text>
                                <Text style={fsc.memberEmail}>{m.email}</Text>
                            </View>

                            <View style={fsc.initialCircle}>
                                <Text style={fsc.initialText}>{m.initial}</Text>
                            </View>
                        </Animated.View>
                    ))}
                </View>

                {/* Invite Button Mock */}
                <Animated.View entering={FadeInDown.delay(700).springify()} style={fsc.inviteBtn}>
                    <View style={fsc.inviteIcon}><UserPlus size={16} color="#6B7280" strokeWidth={2.5} /></View>
                    <View style={fsc.memberInfo}>
                        <Text style={fsc.memberName}>{t('onboarding.slide5.inviteFamily')}</Text>
                        <Text style={fsc.memberEmail}>{t('onboarding.slide5.inviteSubtitle')}</Text>
                    </View>
                </Animated.View>

            </Animated.View>

            <Animated.Text entering={FadeInUp.delay(850).springify()} style={fsc.slideSubtitle}>
                {t('onboarding.slide5.subtitle')}
            </Animated.Text>
        </View>
    );
}

const fsc = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 20, width: '100%' },
    slideTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -1 },
    
    card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 28, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 6 },
    
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, marginBottom: 16 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    headerTexts: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: '#1F2937', textAlign: 'right' },
    cardSub: { fontSize: 13, color: '#9CA3AF', textAlign: 'right', marginTop: 2, fontWeight: '500' },
    
    separator: { height: 1.5, backgroundColor: '#F3F4F6', width: '100%', marginBottom: 8 },
    
    list: { gap: 4 },
    memberRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    rolePill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    roleText: { fontSize: 11, fontWeight: '700', color: '#374151' },
    
    memberInfo: { flex: 1, alignItems: 'flex-end' },
    memberName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
    memberEmail: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
    
    initialCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    initialText: { fontSize: 15, fontWeight: '800', color: '#111827' },
    
    inviteBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 12, backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 12 },
    inviteIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    
    slideSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 24, maxWidth: 320, marginTop: 6 },
});

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    onDone: () => void;
}

export default function OnboardingCarousel({ visible, onDone }: Props) {
    const { t } = useLanguage();
    const [current, setCurrent] = useState(0);
    const [babyName, setBabyName] = useState('');
    const scrollRef = useRef<ScrollView>(null);
    const btnScale = useSharedValue(1);
    const rippleScale = useSharedValue(0);
    const rippleOpacity = useSharedValue(0);
    const contentOpacity = useSharedValue(1);

    // Reset state when carousel opens
    useEffect(() => {
        if (visible) {
            setCurrent(0);
            rippleScale.value = 0;
            rippleOpacity.value = 0;
            contentOpacity.value = 1;
setTimeout(() => scrollRef.current?.scrollTo({ x: 0, animated: false }), 50);
        }
    }, [visible]);

    // Fetch baby name from Firestore (user just created their first baby)
    useEffect(() => {
        if (!visible) return;
        (async () => {
            try {
                const uid = auth.currentUser?.uid;
                if (!uid) return;
                const q = query(collection(db, 'babies'), where('parentId', '==', uid), limit(1));
                const snap = await getDocs(q);
                if (!snap.empty) setBabyName(snap.docs[0].data().childName || '');
            } catch (_) {}
        })();
    }, [visible]);

    const finish = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        onDone();
    };

    const goTo = (index: number) => {
        scrollRef.current?.scrollTo({ x: index * width, animated: true });
        setCurrent(index);
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    const triggerFinishRipple = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Button pulse
        btnScale.value = withSequence(
            withSpring(0.9, { duration: 80 }),
            withSpring(1.05, { duration: 120 }),
        );
        // Fade out content slightly
        contentOpacity.value = withTiming(0, { duration: 500, easing: Easing.in(Easing.ease) });
        // Ripple expands from button outward
        rippleOpacity.value = 1;
        rippleScale.value = withTiming(30, {
            duration: 620,
            easing: Easing.in(Easing.ease),
        }, (finished) => {
            if (finished) runOnJS(finish)();
        });
    };

const handleNext = () => {
        btnScale.value = withSequence(
            withSpring(0.93, { duration: 80 }),
            withSpring(1, { duration: 140 }),
        );
        if (current < SLIDE_CONFIGS.length - 1) {
            goTo(current + 1);
        } else {
            triggerFinishRipple();
        }
    };

    const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const page = Math.round(e.nativeEvent.contentOffset.x / width);
        if (page !== current) {
            setCurrent(page);
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
    const rippleStyle = useAnimatedStyle(() => ({
        opacity: rippleOpacity.value,
        transform: [{ scale: rippleScale.value }],
    }));
    const contentFadeStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

    const slideCfg = SLIDE_CONFIGS[current];
    const isLast = current === SLIDE_CONFIGS.length - 1;

    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent>
            <LinearGradient
                colors={slideCfg.gradient}
                style={s.container}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
            >
                {/* BG decorative blobs */}
                <View style={[s.blob1, { backgroundColor: slideCfg.accentColor }]} />
                <View style={[s.blob2, { backgroundColor: slideCfg.accentColor }]} />

                {/* Ripple overlay — expands from button on finish */}
                <Animated.View
                    pointerEvents="none"
                    style={[s.ripple, rippleStyle]}
                />

                {/* Skip button */}
                {!isLast && (
                    <TouchableOpacity style={s.skipBtn} onPress={finish} activeOpacity={0.7}>
                        <Text style={s.skipText}>{t('onboarding.skip') || 'דלג'}</Text>
                    </TouchableOpacity>
                )}

                {/* Slides */}
                <Animated.ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScrollEnd}
                    scrollEventThrottle={16}
                    style={[{ flex: 1 }, contentFadeStyle]}
                >
                    <View style={[s.slide, { width }]}>
                        <WelcomeSlideContent babyName={babyName} />
                    </View>
                    <View style={[s.slide, { width }]}>
                        <QuickActionsSlideContent />
                    </View>
                    <View style={[s.slide, { width }]}>
                        <StatisticsSlideContent />
                    </View>
                    <View style={[s.slide, { width }]}>
                        <BabysitterSlideContent />
                    </View>
                    <View style={[s.slide, { width }]}>
                        <FamilySharingSlideContent />
                    </View>
                </Animated.ScrollView>

                {/* Pagination dots */}
                <Animated.View style={[s.dots, contentFadeStyle]}>
                    {SLIDE_CONFIGS.map((cfg, i) => (
                        <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}>
                            <View style={[
                                s.dot,
                                i === current
                                    ? { backgroundColor: slideCfg.accentColor, width: 26 }
                                    : { backgroundColor: 'rgba(255,255,255,0.22)', width: 8 },
                            ]} />
                        </TouchableOpacity>
                    ))}
                </Animated.View>

                {/* CTA Button */}
                <Animated.View style={[s.btnWrapper, btnStyle, { shadowColor: slideCfg.accentColor }]}>
                    <TouchableOpacity activeOpacity={1} onPress={handleNext}>
                        <LinearGradient
                            colors={isLast
                                ? ['#C8806A', '#A05840']
                                : [`${slideCfg.accentColor}EE`, `${slideCfg.accentColor}88`]
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={s.btn}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                {isLast ? (
                                    <Rocket color="#FFFFFF" size={20} strokeWidth={2.5} />
                                ) : (
                                    <Text style={{ color: '#FFFFFF', fontSize: 28, marginTop: -4, fontWeight: '300' }}>›</Text>
                                )}
                                <Text style={s.btnText}>
                                    {isLast
                                        ? (t('onboarding.cta')?.replace(/🎉/g, '')?.trim() || 'בואו נתחיל!')
                                        : (t('onboarding.next')?.replace(/[›‹<>]/g, '')?.trim() || 'הבא')}
                                </Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 46 }} />
            </LinearGradient>
        </Modal>
    );
}

// ─── MAIN STYLESHEET ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', backgroundColor: '#0f0406', overflow: 'hidden' },
    // Ripple: a 100×100 circle centered at the CTA button, grows to cover full screen
    ripple: {
        position: 'absolute',
        bottom: 46 + 31 - 50, // button center (46px spacer + 31px = half of btn 62px height) minus half circle
        alignSelf: 'center',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#C8806A',
        zIndex: 999,
    },
    blob1: { position: 'absolute', top: -120, right: -90, width: 310, height: 310, borderRadius: 155, opacity: 0.07 },
    blob2: { position: 'absolute', bottom: 160, left: -90, width: 240, height: 240, borderRadius: 120, opacity: 0.055 },
    skipBtn: { alignSelf: 'flex-end', paddingHorizontal: 28, paddingTop: 60, paddingBottom: 8 },
    skipText: { fontSize: 15, color: 'rgba(255,255,255,0.38)', fontWeight: '500' },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    dots: { flexDirection: 'row', gap: 8, marginBottom: 22, alignItems: 'center', height: 20 },
    dot: { height: 8, borderRadius: 4 },
    btnWrapper: { width: width - 48, borderRadius: 20, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 22, elevation: 0 },
    btn: { width: '100%', height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
});
