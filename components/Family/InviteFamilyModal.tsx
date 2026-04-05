import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Share,
    Platform,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { X, Copy, Share2, RefreshCw, Users, Check, Info, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useFamily } from '../../hooks/useFamily';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface InviteFamilyModalProps {
    visible: boolean;
    onClose: () => void;
    babyId: string;
    babyName: string;
}

export const InviteFamilyModal: React.FC<InviteFamilyModalProps> = ({
    visible,
    onClose,
    babyId,
    babyName,
}) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const { family, inviteCode, create, refreshInviteCode, isLoading } = useFamily();
    const [copied, setCopied] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [creatingFamily, setCreatingFamily] = useState(false);

    // Create family if doesn't exist
    const handleCreateFamily = React.useCallback(async () => {
        if (!family && !creatingFamily) {
            setCreatingFamily(true);
            const success = await create(babyId, babyName);
            setCreatingFamily(false);
        }
    }, [family, creatingFamily, babyId, babyName, create]);

    React.useEffect(() => {
        if (visible && !family && !isLoading && !creatingFamily) {
            handleCreateFamily();
        }
    }, [visible, family, isLoading, creatingFamily, handleCreateFamily]);

    // Show help tooltip
    const showHelp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            t('familyInvite.helpTitle'),
            t('familyInvite.helpBody'),
            [{ text: t('familyInvite.helpOk'), style: 'default' }]
        );
    };

    const handleCopyCode = async () => {
        if (!inviteCode) return;

        await Clipboard.setStringAsync(inviteCode);
        setCopied(true);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setTimeout(() => setCopied(false), 2000);
    };

    // Direct WhatsApp share with fallback
    const handleShare = async () => {
        if (!inviteCode) return;

        const message = t('familyInvite.shareMessage', { name: babyName, code: inviteCode });

        // Try WhatsApp first
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        try {
            const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
            if (canOpenWhatsApp) {
                await Linking.openURL(whatsappUrl);
                if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                return;
            }
        } catch (e) {
            // Fall through to generic share
        }

        // Fallback to generic share
        try {
            await Share.share({ message });
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } catch (error) {
            // Ignore
        }
    };

    const handleRefreshCode = async () => {
        setRefreshing(true);
        await refreshInviteCode();
        setRefreshing(false);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('familyInvite.title')}</Text>
                        <TouchableOpacity onPress={showHelp} style={styles.closeBtn}>
                            <Info size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {(isLoading || creatingFamily) ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.textPrimary} />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                                {creatingFamily ? t('familyInvite.creatingFamily') : t('familyInvite.loading')}
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Description */}
                            <Text style={[styles.description, { color: theme.textSecondary }]}>
                                {t('familyInvite.description')}
                            </Text>

                            {/* Invite Code Box */}
                            <View style={[styles.codeBox, {
                                backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.1)' : '#F5F3FF',
                            }]}>
                                <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>{t('familyInvite.codeLabel')}</Text>
                                {inviteCode ? (
                                    <>
                                        <View style={styles.qrWrapper}>
                                            <QRCode
                                                value={inviteCode}
                                                size={140}
                                                color={isDarkMode ? '#fff' : '#1F2937'}
                                                backgroundColor="transparent"
                                            />
                                        </View>
                                        <Text style={styles.code}>{inviteCode}</Text>
                                    </>
                                ) : (
                                    <View style={styles.noCodeContainer}>
                                        <Text style={[styles.noCodeText, { color: theme.textSecondary }]}>{t('familyInvite.noCode')}</Text>
                                        <TouchableOpacity
                                            style={styles.generateCodeBtn}
                                            onPress={handleRefreshCode}
                                            disabled={refreshing}
                                        >
                                            <RefreshCw size={16} color="#fff" />
                                            <Text style={styles.generateCodeText}>{t('familyInvite.generateCode')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {inviteCode && (
                                    <View style={styles.codeActions}>
                                        <TouchableOpacity
                                            style={[styles.codeBtn, {
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#fff',
                                                borderColor: copied ? '#7DAF8F' : (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB'),
                                            }, copied && { backgroundColor: isDarkMode ? 'rgba(125,175,143,0.15)' : '#F0F7F3' }]}
                                            onPress={handleCopyCode}
                                        >
                                            {copied ? (
                                                <Check size={18} color="#7DAF8F" />
                                            ) : (
                                                <Copy size={18} color="#C8806A" />
                                            )}
                                            <Text style={[styles.codeBtnText, copied && { color: '#7DAF8F' }]}>
                                                {copied ? t('familyInvite.copied') : t('familyInvite.copy')}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.codeBtn, {
                                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#fff',
                                                borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB',
                                            }]}
                                            onPress={handleRefreshCode}
                                            disabled={refreshing}
                                        >
                                            <RefreshCw size={18} color="#C8806A" style={refreshing ? { opacity: 0.5 } : {}} />
                                            <Text style={styles.codeBtnText}>{t('familyInvite.refresh')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* WhatsApp Share Button */}
                            <TouchableOpacity
                                style={[styles.shareBtn, !inviteCode && styles.shareBtnDisabled]}
                                onPress={handleShare}
                                disabled={!inviteCode}
                            >
                                <MessageCircle size={20} color="#25D366" />
                                <Text style={styles.shareBtnText}>{t('familyInvite.shareWhatsapp')}</Text>
                            </TouchableOpacity>

                            {/* Tip */}
                            <Text style={[styles.tip, { color: theme.textSecondary }]}>
                                {t('familyInvite.tip')}
                            </Text>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    codeBox: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 12,
        marginBottom: 12,
    },
    qrWrapper: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        marginBottom: 16,
    },
    code: {
        fontSize: 36,
        fontWeight: '900',
        color: '#C8806A',
        letterSpacing: 6,
        marginBottom: 16,
    },
    codeActions: {
        flexDirection: 'row',
        gap: 12,
    },
    codeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    codeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#C8806A',
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: 'rgba(37, 211, 102, 0.10)',
        borderWidth: 1,
        borderColor: 'rgba(37, 211, 102, 0.30)',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 16,
    },
    shareBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1DA851',
    },
    tip: {
        fontSize: 12,
        textAlign: 'center',
    },
    noCodeContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    noCodeText: {
        fontSize: 16,
        marginBottom: 12,
    },
    generateCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#C8806A',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    generateCodeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    shareBtnDisabled: {
        opacity: 0.5,
    },
});

export default InviteFamilyModal;
