import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_WIDTH = SCREEN_WIDTH * 0.88;

const ACCENT = '#E8567F';

interface BrandedShareModalProps {
    visible: boolean;
    onClose: () => void;
    imageUrl: string;
    month: number;
    babyName: string;
}

export default function BrandedShareModal({
    visible,
    onClose,
    imageUrl,
    month,
    babyName,
}: BrandedShareModalProps) {
    const { theme, isDarkMode } = useTheme();
    const frameRef = useRef<View>(null);
    const [isSharing, setIsSharing] = useState(false);

    const monthLabel = month === 0 ? 'יום הלידה' : `חודש ${month}`;

    const handleShare = async () => {
        if (!frameRef.current) return;
        setIsSharing(true);

        try {
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }

            const uri = await captureRef(frameRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: `רגע קסום של ${babyName}`,
                    UTI: 'public.png',
                });
            }
        } catch (error) {
            console.error('Share error:', error);
        } finally {
            setIsSharing(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {Platform.OS === 'ios' && (
                    <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                )}

                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                    <BlurView intensity={30} tint="dark" style={styles.closeBlur}>
                        <X size={22} color="#fff" strokeWidth={1.5} />
                    </BlurView>
                </TouchableOpacity>

                {/* ═══════════════════════════════════════════
                    BRANDED FRAME — captured for sharing
                    ═══════════════════════════════════════════ */}
                <View
                    ref={frameRef}
                    style={styles.frame}
                    collapsable={false}
                >
                    {/* Soft gradient background */}
                    <LinearGradient
                        colors={['#FFF5F7', '#FFFFFF', '#FFF0F5']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Decorative corner accents */}
                    <View style={[styles.cornerDecor, styles.cornerTopLeft]} />
                    <View style={[styles.cornerDecor, styles.cornerTopRight]} />
                    <View style={[styles.cornerDecor, styles.cornerBottomLeft]} />
                    <View style={[styles.cornerDecor, styles.cornerBottomRight]} />

                    {/* Month pill badge at top */}
                    <View style={styles.monthPill}>
                        <LinearGradient
                            colors={[ACCENT, '#D44074']}
                            style={styles.monthPillGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.monthPillText}>{monthLabel}</Text>
                        </LinearGradient>
                    </View>

                    {/* Photo with layered frame effect */}
                    <View style={styles.photoOuter}>
                        <View style={styles.photoShadowWrap}>
                            <View style={styles.photoInner}>
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.photo}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Bottom branding — logo + app name */}
                    <View style={styles.brandingBar}>
                        <View style={styles.brandingLine} />
                        <View style={styles.brandingRow}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.appLogo}
                                resizeMode="contain"
                            />
                            <Text style={styles.appName}>Calmino</Text>
                        </View>
                    </View>
                </View>

                {/* ═══════════════════════════════════════════
                    SHARE BUTTON — outside frame
                    ═══════════════════════════════════════════ */}
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                    disabled={isSharing}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[ACCENT, '#D44074']}
                        style={styles.shareGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {isSharing ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Share2 size={18} color="#fff" strokeWidth={2.5} />
                                <Text style={styles.shareText}>שתף רגע קסום</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 56,
        right: 16,
        zIndex: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    closeBlur: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },

    // ─── Premium Frame ───
    frame: {
        width: FRAME_WIDTH,
        borderRadius: 28,
        overflow: 'hidden',
        alignItems: 'center',
        paddingTop: 28,
        paddingBottom: 24,
        paddingHorizontal: 20,
        // Elevated shadow
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 20,
    },

    // Decorative corner accents
    cornerDecor: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: ACCENT + '18',
    },
    cornerTopLeft: {
        top: 12,
        left: 12,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderTopLeftRadius: 12,
    },
    cornerTopRight: {
        top: 12,
        right: 12,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderTopRightRadius: 12,
    },
    cornerBottomLeft: {
        bottom: 12,
        left: 12,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderBottomLeftRadius: 12,
    },
    cornerBottomRight: {
        bottom: 12,
        right: 12,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderBottomRightRadius: 12,
    },

    // Month badge
    monthPill: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 10,
    },
    monthPillGradient: {
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderRadius: 20,
    },
    monthPillText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
    },

    // Baby name
    babyNameText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1A1A2E',
        letterSpacing: -0.8,
        marginBottom: 18,
        textAlign: 'center',
    },

    // Photo layers
    photoOuter: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    photoShadowWrap: {
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    photoInner: {
        width: FRAME_WIDTH - 40,
        aspectRatio: 1,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#fff',
    },
    photo: {
        width: '100%',
        height: '100%',
    },

    // Branding
    brandingBar: {
        width: '100%',
        alignItems: 'center',
        paddingTop: 4,
    },
    brandingLine: {
        width: 48,
        height: 2,
        borderRadius: 1,
        backgroundColor: ACCENT + '20',
        marginBottom: 14,
    },
    brandingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    appLogo: {
        width: 28,
        height: 28,
        borderRadius: 8,
    },
    appName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1A1A2E',
        letterSpacing: -0.3,
    },

    // ─── Share Button ───
    shareButton: {
        marginTop: 28,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    shareGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 17,
        paddingHorizontal: 44,
        borderRadius: 30,
    },
    shareText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});
