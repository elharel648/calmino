import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Dimensions,
    Linking
} from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useDynamicPromo } from '../../hooks/useDynamicPromo';

const { width } = Dimensions.get('window');

interface DynamicPromoModalProps {
    currentScreenName: string;
    onNavigateToPaywall: () => void;
}

const DynamicPromoModal: React.FC<DynamicPromoModalProps> = ({ currentScreenName, onNavigateToPaywall }) => {
    const { theme, isDarkMode } = useTheme();
    const { showPromo, promoData, dismissPromo, isReady } = useDynamicPromo(currentScreenName);

    // Trigger haptic when modal is shown
    useEffect(() => {
        if (showPromo) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [showPromo]);

    if (!isReady || !showPromo) {
        return null;
    }

    const handleAction = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        dismissPromo();

        if (promoData.ctaAction === 'Paywall') {
            onNavigateToPaywall();
        } else if (promoData.ctaAction === 'Link' && promoData.linkUrl) {
            try {
                const supported = await Linking.canOpenURL(promoData.linkUrl);
                if (supported) {
                    await Linking.openURL(promoData.linkUrl);
                } else {
                    console.log("Don't know how to open this URL:", promoData.linkUrl);
                }
            } catch (e) {
                console.error("Failed to open URL:", e);
            }
        }
    };

    return (
        <Modal
            visible={showPromo}
            animationType="fade"
            transparent={true}
            onRequestClose={dismissPromo}
        >
            <BlurView intensity={isDarkMode ? 30 : 20} tint={isDarkMode ? 'dark' : 'light'} style={styles.overlay}>
                <Animated.View
                    entering={ZoomIn.duration(400).springify()}
                    style={[
                        styles.modalContainer,
                        { backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', borderColor: theme.border }
                    ]}
                >
                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            dismissPromo();
                        }}
                    >
                        <View style={[styles.closeBtnBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <X size={20} color={theme.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    {/* Image Banner (Optional) */}
                    {promoData.imageUrl ? (
                        <Image
                            source={{ uri: promoData.imageUrl }}
                            style={styles.bannerImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.gradientPlaceholder}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        </View>
                    )}

                    {/* Content */}
                    <View style={styles.contentContainer}>
                        <Animated.Text entering={FadeInDown.delay(200)} style={[styles.title, { color: theme.textPrimary }]}>
                            {promoData.title}
                        </Animated.Text>

                        <Animated.Text entering={FadeInDown.delay(300)} style={[styles.body, { color: theme.textSecondary }]}>
                            {promoData.body}
                        </Animated.Text>

                        {/* CTA Button */}
                        <Animated.View entering={FadeInDown.delay(400)} style={styles.btnContainer}>
                            <TouchableOpacity
                                style={styles.ctaButton}
                                onPress={handleAction}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#6366F1', '#8B5CF6']}
                                    style={styles.ctaGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text style={styles.ctaText}>{promoData.ctaText}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(500)}>
                            <TouchableOpacity onPress={dismissPromo} style={styles.laterBtn}>
                                <Text style={[styles.laterText, { color: theme.textSecondary }]}>
                                    אולי אחר כך
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                </Animated.View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
    },
    closeBtnBg: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerImage: {
        width: '100%',
        height: 180,
    },
    imagePlaceholder: {
        width: '100%',
        height: 120,
    },
    gradientPlaceholder: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    body: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    btnContainer: {
        width: '100%',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    ctaButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    ctaGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    laterBtn: {
        marginTop: 16,
        padding: 8,
    },
    laterText: {
        fontSize: 14,
        fontWeight: '500',
    }
});

export default DynamicPromoModal;
