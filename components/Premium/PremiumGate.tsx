// PremiumGate — Wrap any content to lock it behind Feature Flags
// Usage: <PremiumGate feature="statistics">{children}</PremiumGate>
// Control remotely: Firebase → system/settings → lockedFeatures.statistics = true

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePremium, FeatureKey } from '../../context/PremiumContext';

interface PremiumGateProps {
    feature: FeatureKey;
    children: React.ReactNode;
    onUpgrade?: () => void;
    // Optional: show blurred preview instead of full lock
    showPreview?: boolean;
}

/**
 * PremiumGate — Wraps content and shows a premium paywall if the feature is locked.
 * 
 * Features are locked/unlocked remotely from Firebase Console:
 *   Firestore → system/settings → lockedFeatures → { statistics: true, growth_charts: false }
 * 
 * Premium users always bypass all locks.
 * globalPremiumUnlock = true also bypasses all locks.
 */
const PremiumGate: React.FC<PremiumGateProps> = ({ feature, children, onUpgrade, showPreview = false }) => {
    const { isFeatureLocked } = usePremium();
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    // If not locked, render children normally
    if (!isFeatureLocked(feature)) {
        return <>{children}</>;
    }

    // Feature is locked — show premium overlay
    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
            {/* Optional blurred preview */}
            {showPreview && (
                <View style={styles.previewContainer} pointerEvents="none">
                    <View style={styles.blurOverlay}>
                        {children}
                    </View>
                </View>
            )}

            {/* Lock overlay */}
            <View style={[styles.lockOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)' }]}>
                <View style={styles.lockContent}>
                    {/* Lock icon */}
                    <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)' }]}>
                        <Lock size={28} color="#C8806A" strokeWidth={1.8} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        {t('premium.featureLocked') || 'תוכן פרמיום'}
                    </Text>

                    {/* Description */}
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        {t('premium.upgradeToUnlock') || 'שדרג לפרמיום כדי לפתוח תוכן זה'}
                    </Text>

                    {/* CTA Button */}
                    {onUpgrade && (
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onUpgrade();
                            }}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#C8806A', '#CD8B87']}
                                style={styles.upgradeGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Sparkles size={16} color="#fff" strokeWidth={2} />
                                <Text style={styles.upgradeText}>
                                    {t('premium.upgradeCta') || 'שדרג לפרמיום'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
    },
    previewContainer: {
        opacity: 0.3,
    },
    blurOverlay: {
        overflow: 'hidden',
    },
    lockOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        minHeight: 200,
    },
    lockContent: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.4,
    },
    description: {
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    upgradeButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#C8806A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 0,
    },
    upgradeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 28,
    },
    upgradeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});

export default PremiumGate;
