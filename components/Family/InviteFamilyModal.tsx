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
} from 'react-native';
import { X, Copy, Share2, RefreshCw, Users, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useFamily } from '../../hooks/useFamily';

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
    const { family, inviteCode, create, refreshInviteCode, isLoading } = useFamily();
    const [copied, setCopied] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [creatingFamily, setCreatingFamily] = useState(false);

    // DEBUG
    React.useEffect(() => {
        if (__DEV__ && visible) {
            console.log('📋 InviteFamilyModal Debug:', {
                visible,
                family: !!family,
                familyId: family?.id,
                inviteCode,
                isLoading,
                creatingFamily,
            });
        }
    }, [visible, family, inviteCode, isLoading, creatingFamily]);

    // Create family if doesn't exist
    const handleCreateFamily = React.useCallback(async () => {
        if (!family && !creatingFamily) {
            setCreatingFamily(true);
            if (__DEV__) console.log('📋 Creating family for:', babyId, babyName);
            const success = await create(babyId, babyName);
            if (__DEV__) console.log('📋 Family creation result:', success);
            setCreatingFamily(false);
        }
    }, [family, creatingFamily, babyId, babyName, create]);

    React.useEffect(() => {
        if (visible && !family && !isLoading && !creatingFamily) {
            handleCreateFamily();
        }
    }, [visible, family, isLoading, creatingFamily, handleCreateFamily]);

    const handleCopyCode = async () => {
        if (!inviteCode) return;

        await Clipboard.setStringAsync(inviteCode);
        setCopied(true);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!inviteCode) return;

        const message = `🍼 הצטרף/י למשפחת ${babyName} באפליקציית CalmParent!\n\nקוד ההצטרפות: ${inviteCode}\n\nהורד/י את האפליקציה והזן/י את הקוד כדי לראות את התיעודים בזמן אמת!`;

        try {
            await Share.share({
                message,
            });
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
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={22} color="#9CA3AF" />
                        </TouchableOpacity>
                        <Text style={styles.title}>הזמן למשפחה</Text>
                        <Users size={22} color="#6366F1" />
                    </View>

                    {(isLoading || creatingFamily) ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#6366F1" />
                            <Text style={styles.loadingText}>
                                {creatingFamily ? 'יוצר משפחה...' : 'טוען...'}
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Description */}
                            <Text style={styles.description}>
                                שתף/י את הקוד עם בן/בת הזוג או בני משפחה כדי שיוכלו לראות ולתעד יחד
                            </Text>

                            {/* Invite Code Box */}
                            <View style={styles.codeBox}>
                                <Text style={styles.codeLabel}>קוד ההזמנה</Text>
                                {inviteCode ? (
                                    <Text style={styles.code}>{inviteCode}</Text>
                                ) : (
                                    <View style={styles.noCodeContainer}>
                                        <Text style={styles.noCodeText}>אין קוד זמין</Text>
                                        <TouchableOpacity
                                            style={styles.generateCodeBtn}
                                            onPress={handleRefreshCode}
                                            disabled={refreshing}
                                        >
                                            <RefreshCw size={16} color="#fff" />
                                            <Text style={styles.generateCodeText}>צור קוד חדש</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {inviteCode && (
                                    <View style={styles.codeActions}>
                                        <TouchableOpacity
                                            style={[styles.codeBtn, copied && styles.codeBtnSuccess]}
                                            onPress={handleCopyCode}
                                        >
                                            {copied ? (
                                                <Check size={18} color="#10B981" />
                                            ) : (
                                                <Copy size={18} color="#6366F1" />
                                            )}
                                            <Text style={[styles.codeBtnText, copied && { color: '#10B981' }]}>
                                                {copied ? 'הועתק!' : 'העתק'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.codeBtn}
                                            onPress={handleRefreshCode}
                                            disabled={refreshing}
                                        >
                                            <RefreshCw size={18} color="#6366F1" style={refreshing ? { opacity: 0.5 } : {}} />
                                            <Text style={styles.codeBtnText}>חדש</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Share Button */}
                            <TouchableOpacity
                                style={[styles.shareBtn, !inviteCode && styles.shareBtnDisabled]}
                                onPress={handleShare}
                                disabled={!inviteCode}
                            >
                                <Share2 size={20} color="#fff" />
                                <Text style={styles.shareBtnText}>שתף בוואטסאפ</Text>
                            </TouchableOpacity>

                            {/* Tip */}
                            <Text style={styles.tip}>
                                💡 מי שמצטרף יוכל לראות את כל התיעודים ולהוסיף חדשים
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
        backgroundColor: '#fff',
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
        color: '#1F2937',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#6B7280',
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    codeBox: {
        backgroundColor: '#F5F3FF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    codeLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    code: {
        fontSize: 36,
        fontWeight: '900',
        color: '#6366F1',
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
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    codeBtnSuccess: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    codeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#25D366',
        paddingVertical: 16,
        borderRadius: 14,
        marginBottom: 16,
    },
    shareBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    tip: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    noCodeContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    noCodeText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginBottom: 12,
    },
    generateCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#6366F1',
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
