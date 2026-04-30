import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

// ─── Base Skeleton Bone ──────────────────────────────────────────────────────
interface SkeletonBoneProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

export const SkeletonBone = ({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBoneProps) => {
    const { isDarkMode } = useTheme();
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(
            withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: interpolate(shimmer.value, [0, 1], [0.45, 0.85]),
    }));

    const baseColor = isDarkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';

    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius, backgroundColor: baseColor },
                shimmerStyle,
                style,
            ]}
        />
    );
};


// ─── Stats Card Skeleton ──────────────────────────────────────────────────────
export const StatsCardSkeleton = () => (
    <View style={s.statsCard}>
        <SkeletonBone width={40} height={40} borderRadius={12} style={{ marginBottom: 12 }} />
        <SkeletonBone width="50%" height={28} borderRadius={8} style={{ marginBottom: 6 }} />
        <SkeletonBone width="70%" height={12} borderRadius={5} />
    </View>
);

// ─── Home Screen Skeleton ─────────────────────────────────────────────────────
export const HomeScreenSkeleton = () => (
    <View style={s.homeContainer}>
        {/* Header area */}
        <View style={s.homeHeader}>
            <SkeletonBone width={120} height={22} borderRadius={8} />
            <SkeletonBone width={44} height={44} borderRadius={22} />
        </View>
        {/* Quick actions row */}
        <View style={s.actionsRow}>
            {[...Array(4)].map((_, i) => (
                <View key={i} style={s.actionItem}>
                    <SkeletonBone width={52} height={52} borderRadius={16} style={{ marginBottom: 6 }} />
                    <SkeletonBone width={44} height={10} borderRadius={4} />
                </View>
            ))}
        </View>
        {/* Timeline cards */}
        {[...Array(3)].map((_, i) => (
            <View key={i} style={s.timelineCard}>
                <SkeletonBone width={36} height={36} borderRadius={12} />
                <View style={{ flex: 1, marginRight: 12 }}>
                    <SkeletonBone width="55%" height={14} borderRadius={5} style={{ marginBottom: 6 }} />
                    <SkeletonBone width="35%" height={11} borderRadius={4} />
                </View>
                <SkeletonBone width={50} height={24} borderRadius={8} />
            </View>
        ))}
    </View>
);

// ─── Profile Skeleton ─────────────────────────────────────────────────────────
export const ProfileSkeleton = () => (
    <View style={s.profileContainer}>
        {/* Avatar */}
        <View style={s.profileHeader}>
            <SkeletonBone width={88} height={88} borderRadius={44} style={{ marginBottom: 12 }} />
            <SkeletonBone width={140} height={20} borderRadius={8} style={{ marginBottom: 6 }} />
            <SkeletonBone width={100} height={14} borderRadius={5} />
        </View>
        {/* Stats row */}
        <View style={s.profileStats}>
            {[...Array(3)].map((_, i) => (
                <View key={i} style={s.profileStat}>
                    <SkeletonBone width={40} height={24} borderRadius={6} style={{ marginBottom: 4 }} />
                    <SkeletonBone width={55} height={12} borderRadius={4} />
                </View>
            ))}
        </View>
        {/* Rows */}
        {[...Array(4)].map((_, i) => (
            <View key={i} style={s.profileRow}>
                <SkeletonBone width={32} height={32} borderRadius={10} />
                <View style={{ flex: 1, marginRight: 12 }}>
                    <SkeletonBone width="60%" height={14} borderRadius={5} style={{ marginBottom: 4 }} />
                    <SkeletonBone width="40%" height={11} borderRadius={4} />
                </View>
                <SkeletonBone width={20} height={20} borderRadius={5} />
            </View>
        ))}
    </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    // Stats
    statsCard: {
        borderRadius: 16,
        padding: 16,
        margin: 8,
        flex: 1,
        alignItems: 'flex-end',
    },

    // Home
    homeContainer: { paddingHorizontal: 20, paddingTop: 20 },
    homeHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    actionsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionItem: { alignItems: 'center' },
    timelineCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },

    // Profile
    profileContainer: { paddingHorizontal: 20 },
    profileHeader: { alignItems: 'center', paddingVertical: 24 },
    profileStats: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        paddingVertical: 16,
        marginBottom: 12,
    },
    profileStat: { alignItems: 'center' },
    profileRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
});
