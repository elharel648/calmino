// components/Premium/PremiumPaywall.tsx - Premium Subscription Paywall
import React, { useState, useEffect } from 'react';
import { View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    
    Alert,
    ScrollView,
    Platform } from 'react-native';
import InlineLoader from '../../components/Common/InlineLoader';
import { X, Crown, Check, Sparkles, Shield, Download, Users, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../../utils/designSystem';
import { initRemoteConfig, getPaywallConfig } from '../../services/remoteConfigService';
import { useLanguage } from '../../context/LanguageContext';

interface PremiumPaywallProps {
    visible: boolean;
    onClose: () => void;
    trigger?: string; // What triggered the paywall (for analytics)
}

// האייקונים נשארים hardcoded — רק הטקסטים מגיעים מ-Remote Config
const FEATURE_ICONS = [
    { icon: Sparkles, color: '#C8806A' },
    { icon: Download, color: '#7DAF8F' },
    { icon: Users, color: '#F59E0B' },
    { icon: Shield, color: '#8B5CF6' },
    { icon: Star, color: '#EC4899' },
];

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ visible, onClose, trigger }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { offerings, purchase, restore, isLoading } = usePremium();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
    const [purchasing, setPurchasing] = useState(false);
    const [rc, setRc] = useState(getPaywallConfig()); // default values immediately

    useEffect(() => {
        initRemoteConfig().then(() => setRc(getPaywallConfig()));
    }, []);

    const monthlyPackage = offerings?.current?.monthly;
    const annualPackage = offerings?.current?.annual;

    const handlePurchase = async () => {
        const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
        if (!pkg) {
            Alert.alert(t('common.error'), 'המוצר לא זמין כרגע');
            return;
        }

        setPurchasing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const success = await purchase(pkg);
            if (success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('🎉 ברוכים הבאים ל-Premium!', 'תהנה מכל התכונות המתקדמות', [
                    { text: 'מעולה!', onPress: onClose }
                ]);
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'לא הצלחנו להשלים את הרכישה');
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setPurchasing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const success = await restore();
            if (success) {
                Alert.alert('✅ שוחזר!', 'המנוי שלך שוחזר בהצלחה', [
                    { text: 'מעולה!', onPress: onClose }
                ]);
            } else {
                Alert.alert('לא נמצאו רכישות', 'לא מצאנו מנוי קיים לשחזר');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'לא הצלחנו לשחזר את הרכישות');
        } finally {
            setPurchasing(false);
        }
    };

    // Calculate savings for annual plan
    const monthlyPrice = monthlyPackage?.product.priceString || '₪19.90';
    const annualPrice = annualPackage?.product.priceString || '₪139';
    const annualPriceNumber = annualPackage?.product.price || 139;
    const monthlySavings = Math.round(((19.90 * 12) - annualPriceNumber) / (19.90 * 12) * 100);

    const { isDarkMode } = useTheme();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                )}
                <Animated.View
                    entering={ANIMATIONS.fadeInDown(0, 400)}
                    style={[styles.modalContainer, { backgroundColor: theme.card }]}
                >
                    {/* Header */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(100)} style={styles.modalHeader}>
                        <LinearGradient
                            colors={['#FF6B35', '#F7931E']}
                            style={styles.modalIconContainer}
                        >
                            <Crown size={28} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                        <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                            {rc.title}
                        </Text>
                        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                            {rc.subtitle}
                        </Text>
                    </Animated.View>

                    {/* Urgency Banner */}
                    {rc.showBanner && (
                        <Animated.View
                            entering={ANIMATIONS.fadeInDown(150)}
                            style={[styles.urgencyBanner, { backgroundColor: rc.bannerColor }]}
                        >
                            <Text style={styles.urgencyBannerText}>{rc.bannerText}</Text>
                        </Animated.View>
                    )}

                    {/* Plans */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(200)} style={styles.plansContainer}>
                        {/* Monthly */}
                        <TouchableOpacity
                            style={[
                                styles.planCard,
                                {
                                    borderColor: selectedPlan === 'monthly' ? theme.primary : theme.divider,
                                    backgroundColor: selectedPlan === 'monthly'
                                        ? (isDarkMode ? 'rgba(99,102,241,0.15)' : theme.primaryLight)
                                        : (isDarkMode ? theme.card : theme.background),
                                },
                            ]}
                            onPress={() => {
                                setSelectedPlan('monthly');
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.planDuration, { color: theme.textPrimary }]}>{t('premium.monthly')}</Text>
                            <Text style={[styles.planPrice, { color: theme.primary }]}>{monthlyPrice}</Text>
                            <Text style={[styles.planPer, { color: theme.textSecondary }]}>לחודש</Text>
                        </TouchableOpacity>

                        {/* Yearly */}
                        <TouchableOpacity
                            style={[
                                styles.planCard,
                                {
                                    borderColor: selectedPlan === 'annual' ? theme.primary : theme.divider,
                                    backgroundColor: selectedPlan === 'annual'
                                        ? (isDarkMode ? 'rgba(99,102,241,0.15)' : theme.primaryLight)
                                        : (isDarkMode ? theme.card : theme.background),
                                },
                            ]}
                            onPress={() => {
                                setSelectedPlan('annual');
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={styles.planBadge}>
                                <Text style={styles.planBadgeText}>חסכון {monthlySavings}%</Text>
                            </View>
                            <Text style={[styles.planDuration, { color: theme.textPrimary }]}>{t('premium.yearly')}</Text>
                            <Text style={[styles.planPrice, { color: theme.primary }]}>{annualPrice}</Text>
                            <Text style={[styles.planPer, { color: theme.textSecondary }]}>לשנה (₪{(annualPriceNumber / 12).toFixed(2)}/חודש)</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Features */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(300)} style={styles.featuresContainer}>
                        {FEATURE_ICONS.map((feature, index) => (
                            <Animated.View
                                key={index}
                                entering={ANIMATIONS.fadeInDown(400 + ANIMATIONS.stagger(index, 50))}
                                style={styles.featureRow}
                            >
                                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
                                    <Check size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2.5} />
                                </View>
                                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                                    {rc.features[index]}
                                </Text>
                                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }]}>
                                    <feature.icon size={18} color={isDarkMode ? '#fff' : '#000'} strokeWidth={2} />
                                </View>
                            </Animated.View>
                        ))}
                    </Animated.View>

                    {/* Subscribe Button */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(700)}>
                        <TouchableOpacity
                            style={styles.subscribeButton}
                            onPress={handlePurchase}
                            disabled={purchasing || isLoading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#C8806A', '#CD8B87']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.subscribeButtonGradient}
                            >
                                {purchasing ? (
                                    <InlineLoader color="#fff"  />
                                ) : (
                                    <Text style={styles.subscribeButtonText}>
                                        {selectedPlan === 'annual' ? rc.annualCta : rc.monthlyCta}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Close */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(800)}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>אולי אחר כך</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '90%',
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 28,
    },
    modalIconContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 0,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.36,
    },
    modalSubtitle: {
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: -0.24,
    },
    urgencyBanner: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'center',
        marginBottom: 20,
    },
    urgencyBannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    plansContainer: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 28,
    },
    planCard: {
        flex: 1,
        padding: 18,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
    },
    planBadge: {
        backgroundColor: '#C8806A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    planBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.07,
    },
    planDuration: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: -0.24,
    },
    planPrice: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    planPer: {
        fontSize: 13,
        fontWeight: '400',
        letterSpacing: -0.08,
    },
    featuresContainer: {
        gap: 14,
        marginBottom: 28,
    },
    featureRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 14,
    },
    checkContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.2,
        textAlign: 'right',
    },
    subscribeButton: {
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#C8806A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 0,
    },
    subscribeButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    subscribeButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.41,
    },
    closeButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    closeButtonText: {
        fontSize: 14,
    },
});

export default PremiumPaywall;
