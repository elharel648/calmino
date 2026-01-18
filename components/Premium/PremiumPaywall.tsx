// components/Premium/PremiumPaywall.tsx - Premium Subscription Paywall
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform,
} from 'react-native';
import { X, Crown, Check, Sparkles, Shield, Download, Users, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { ANIMATIONS } from '../../utils/designSystem';

interface PremiumPaywallProps {
    visible: boolean;
    onClose: () => void;
    trigger?: string; // What triggered the paywall (for analytics)
}

const FEATURES = [
    { icon: Sparkles, text: 'דוחות מפורטים ותובנות חכמות', color: '#6366F1' },
    { icon: Download, text: 'ייצוא נתונים ל-PDF ואקסל', color: '#10B981' },
    { icon: Users, text: 'שיתוף ללא הגבלה למשפחה ובייביסיטר', color: '#F59E0B' },
    { icon: Shield, text: 'גיבוי אוטומטי ותמיכה VIP', color: '#8B5CF6' },
    { icon: Star, text: 'ללא פרסומות לעולם', color: '#EC4899' },
];

const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ visible, onClose, trigger }) => {
    const { theme } = useTheme();
    const { offerings, purchase, restore, isLoading } = usePremium();
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
    const [purchasing, setPurchasing] = useState(false);

    const monthlyPackage = offerings?.current?.monthly;
    const annualPackage = offerings?.current?.annual;

    const handlePurchase = async () => {
        const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
        if (!pkg) {
            Alert.alert('שגיאה', 'המוצר לא זמין כרגע');
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
            Alert.alert('שגיאה', 'לא הצלחנו להשלים את הרכישה');
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
            Alert.alert('שגיאה', 'לא הצלחנו לשחזר את הרכישות');
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
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <Animated.View entering={ANIMATIONS.fadeInDown(100)} style={styles.header}>
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={styles.closeBtn}
                        activeOpacity={0.7}
                    >
                        <X size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                </Animated.View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Crown Icon */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(200)} style={styles.iconContainer}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.iconGradient}
                        >
                            <Crown size={40} color="#fff" strokeWidth={2} />
                        </LinearGradient>
                    </Animated.View>

                    {/* Title */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(300)}>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            CalmParent Premium
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            גישה מלאה לכל התכונות המתקדמות
                        </Text>
                    </Animated.View>

                    {/* Plan Selection */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(400)} style={styles.plansContainer}>
                        {/* Annual Plan */}
                        <TouchableOpacity
                            style={[
                                styles.planCard,
                                { backgroundColor: isDarkMode ? theme.card : '#F9FAFB', borderColor: selectedPlan === 'annual' ? '#6366F1' : theme.border },
                                selectedPlan === 'annual' && [styles.planCardSelected, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]
                            ]}
                            onPress={() => {
                                setSelectedPlan('annual');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.8}
                        >
                            <View style={styles.savingsBadge}>
                                <Text style={styles.savingsText}>חסכון {monthlySavings}%</Text>
                            </View>
                            <Text style={[styles.planName, { color: theme.textPrimary }]}>שנתי</Text>
                            <Text style={[styles.planPrice, { color: theme.primary }]}>{annualPrice}</Text>
                            <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>
                                לשנה (₪{(annualPriceNumber / 12).toFixed(2)}/חודש)
                            </Text>
                        </TouchableOpacity>

                        {/* Monthly Plan */}
                        <TouchableOpacity
                            style={[
                                styles.planCard,
                                { backgroundColor: isDarkMode ? theme.card : '#F9FAFB', borderColor: selectedPlan === 'monthly' ? '#6366F1' : theme.border },
                                selectedPlan === 'monthly' && [styles.planCardSelected, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]
                            ]}
                            onPress={() => {
                                setSelectedPlan('monthly');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.planName, { color: theme.textPrimary }]}>חודשי</Text>
                            <Text style={[styles.planPrice, { color: theme.primary }]}>{monthlyPrice}</Text>
                            <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>לחודש</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Features List */}
                    <Animated.View entering={ANIMATIONS.fadeInDown(500)} style={styles.featuresContainer}>
                        {FEATURES.map((feature, index) => (
                            <Animated.View 
                                key={index} 
                                entering={ANIMATIONS.fadeInDown(600 + ANIMATIONS.stagger(index, 50))}
                                style={styles.featureRow}
                            >
                                <View style={[styles.checkContainer, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }]}>
                                    <Check size={18} color="#10B981" strokeWidth={2.5} />
                                </View>
                                <Text style={[styles.featureText, { color: theme.textPrimary }]}>
                                    {feature.text}
                                </Text>
                                <View style={[styles.featureIcon, { backgroundColor: isDarkMode ? `${feature.color}25` : `${feature.color}20` }]}>
                                    <feature.icon size={18} color={feature.color} strokeWidth={2} />
                                </View>
                            </Animated.View>
                        ))}
                    </Animated.View>
                </ScrollView>

                {/* Bottom Actions */}
                <Animated.View entering={ANIMATIONS.fadeInDown(900)} style={[styles.bottomActions, { backgroundColor: theme.background }]}>
                    <TouchableOpacity
                        style={[styles.purchaseBtn, purchasing && styles.purchaseBtnDisabled]}
                        onPress={handlePurchase}
                        disabled={purchasing || isLoading}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.purchaseBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {purchasing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.purchaseBtnText}>
                                    הירשם ל-Premium {selectedPlan === 'annual' ? 'שנתי' : 'חודשי'}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.restoreBtn}
                        onPress={handleRestore}
                        disabled={purchasing}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.restoreBtnText, { color: theme.textSecondary }]}>
                            שחזור רכישות
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.laterBtn} 
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.laterBtnText, { color: theme.textSecondary }]}>
                            אולי אחר כך
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
    },
    closeBtn: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    iconGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
    },
    plansContainer: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 32,
        width: '100%',
    },
    planCard: {
        flex: 1,
        borderRadius: 18,
        padding: 18,
        alignItems: 'center',
        borderWidth: 2.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    planCardSelected: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    savingsBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    savingsText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    planName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    planPrice: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    planPeriod: {
        fontSize: 12,
        marginTop: 4,
    },
    featuresContainer: {
        width: '100%',
        gap: 16,
    },
    featureRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 4,
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
        textAlign: 'right',
        letterSpacing: -0.2,
    },
    bottomActions: {
        padding: 24,
        paddingBottom: 40,
        gap: 12,
    },
    purchaseBtn: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    purchaseBtnDisabled: {
        opacity: 0.7,
    },
    purchaseBtnGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    purchaseBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    restoreBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    restoreBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    laterBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    laterBtnText: {
        fontSize: 14,
    },
});

export default PremiumPaywall;
