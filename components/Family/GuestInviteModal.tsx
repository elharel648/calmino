import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Share,
    Alert,
    ScrollView,
    Image,
    Animated,
    Linking,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, UserPlus, Copy, Share2, Clock, CheckCircle, Check, Users, Baby, Trash2, Info, MessageCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { createGuestInvite, createFamily, getActiveGuestInvites, cancelGuestInvite, GuestInvite } from '../../services/familyService';
import { notificationService } from '../../services/notificationService';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild, ActiveChild } from '../../context/ActiveChildContext';
import { useLanguage } from '../../context/LanguageContext';
import QRCode from 'react-native-qrcode-svg';

interface Props {
    visible: boolean;
    onClose: () => void;
    familyId?: string;
}

type Step = 'select' | 'code';

interface InviteResult {
    childId: string;
    childName: string;
    code: string;
    expiresAt: Date;
}

const GuestInviteModal: React.FC<Props> = ({ visible, onClose, familyId }) => {
    const { theme, isDarkMode } = useTheme();
    const { allChildren } = useActiveChild();
    const { t } = useLanguage();

    const [step, setStep] = useState<Step>('select');
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteResults, setInviteResults] = useState<InviteResult[]>([]);
    const [expiryHours, setExpiryHours] = useState(24);
    const [copied, setCopied] = useState<string | null>(null);

    // Active invites state
    const [activeInvites, setActiveInvites] = useState<GuestInvite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [cancelingCode, setCancelingCode] = useState<string | null>(null);

    // Success animation
    const successScale = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;
    const cardsSlide = useRef(new Animated.Value(40)).current;

    const EXPIRY_OPTIONS = [
        { hours: 6, label: t('guestInvite.hours6') },
        { hours: 12, label: t('guestInvite.hours12') },
        { hours: 24, label: t('guestInvite.hours24') },
        { hours: 48, label: t('guestInvite.hours48') },
    ];

    const toggleChild = (childId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedChildren.includes(childId)) {
            setSelectedChildren(prev => prev.filter(id => id !== childId));
            setSelectAll(false);
        } else {
            const newSelected = [...selectedChildren, childId];
            setSelectedChildren(newSelected);
            if (newSelected.length === allChildren.length) {
                setSelectAll(true);
            }
        }
    };

    const toggleSelectAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectAll) {
            setSelectedChildren([]);
            setSelectAll(false);
        } else {
            setSelectedChildren(allChildren.map(c => c.childId));
            setSelectAll(true);
        }
    };

    // Load active invites
    const loadActiveInvites = useCallback(async () => {
        if (!familyId) return;
        setLoadingInvites(true);
        try {
            const invites = await getActiveGuestInvites(familyId);
            setActiveInvites(invites);
        } catch (error) {
            // Silently fail
        } finally {
            setLoadingInvites(false);
        }
    }, [familyId]);

    // Handle cancel invite
    const handleCancelInvite = async (code: string) => {
        Alert.alert(
            t('guestInvite.cancelInvite'),
            t('guestInvite.cancelConfirm'),
            [
                { text: t('guestInvite.cancel'), style: 'cancel' },
                {
                    text: t('guestInvite.cancelYes'),
                    style: 'destructive',
                    onPress: async () => {
                        setCancelingCode(code);
                        try {
                            const success = await cancelGuestInvite(code);
                            if (success) {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                setActiveInvites(prev => prev.filter(inv => inv.code !== code));
                            } else {
                                Alert.alert(t('common.error'), t('guestInvite.cancelFailed'));
                            }
                        } catch (error) {
                            Alert.alert(t('common.error'), t('guestInvite.somethingWentWrong'));
                        } finally {
                            setCancelingCode(null);
                        }
                    }
                }
            ]
        );
    };

    // Show help tooltip
    const showHelp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            t('guestInvite.helpTitle'),
            t('guestInvite.helpBody'),
            [{ text: t('guestInvite.helpOk'), style: 'default' }]
        );
    };

    // Play success animation
    const playSuccessAnimation = () => {
        successScale.setValue(0);
        successOpacity.setValue(0);
        cardsSlide.setValue(40);

        Animated.parallel([
            Animated.spring(successScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(successOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(cardsSlide, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    };

    // Schedule local notification for when invite expires
    const scheduleExpiryNotification = async (childName: string, expiresAt: Date) => {
        try {
            await notificationService.createCustomReminder({
                title: t('guestInvite.expiryNotifTitle'),
                body: t('guestInvite.expiryNotifBody', { name: childName }),
                date: expiresAt,
            });
        } catch (error) {
            // Non-critical, don't block the flow
        }
    };

    const handleCreateInvite = async () => {
        if (selectedChildren.length === 0) {
            Alert.alert(t('common.error'), t('guestInvite.selectAtLeastOne'));
            return;
        }

        setIsLoading(true);
        try {
            let targetFamilyId = familyId;

            // Auto-create family if none exists
            if (!targetFamilyId) {
                const firstChild = allChildren.find(c => selectedChildren.includes(c.childId)) || allChildren[0];
                if (!firstChild) {
                    Alert.alert(t('common.error'), t('guestInvite.childNotFound'));
                    return;
                }
                const newFamily = await createFamily(firstChild.childId, firstChild.childName);
                if (!newFamily) {
                    Alert.alert(t('common.error'), t('guestInvite.familyCreateFailed'));
                    return;
                }
                targetFamilyId = newFamily.id;
            }

            // Create invite for EACH selected child
            const results: InviteResult[] = [];
            for (const childId of selectedChildren) {
                const child = allChildren.find(c => c.childId === childId);
                const childName = child?.childName || 'ילד';
                const result = await createGuestInvite(childId, targetFamilyId, expiryHours);
                if (result) {
                    results.push({
                        childId,
                        childName,
                        code: result.code,
                        expiresAt: result.expiresAt,
                    });
                    // Schedule expiry notification
                    await scheduleExpiryNotification(childName, result.expiresAt);
                }
            }

            if (results.length > 0) {
                setInviteResults(results);
                setStep('code');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                loadActiveInvites();
                setTimeout(playSuccessAnimation, 100);
            } else {
                Alert.alert(t('common.error'), t('guestInvite.inviteCreateFailed'));
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('guestInvite.somethingWentWrong'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (code: string) => {
        await Clipboard.setStringAsync(code);
        setCopied(code);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleCopyAll = async () => {
        const allCodes = inviteResults.map(r => `${r.childName}: ${r.code}`).join('\n');
        await Clipboard.setStringAsync(allCodes);
        setCopied('all');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setCopied(null), 2000);
    };

    // Direct WhatsApp share (fallback to generic share)
    const handleShare = async () => {
        if (inviteResults.length === 0) return;

        const childNames = inviteResults.map(r => r.childName).join(', ');
        const codesList = inviteResults.map(r => `${r.childName}: ${r.code}`).join('\n');
        const message = `${t('guestInvite.invitedToView', { names: childNames })}\n\n${codesList}\n\n${t('guestInvite.downloadApp')}`;

        // Try WhatsApp first
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        try {
            const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
            if (canOpenWhatsApp) {
                await Linking.openURL(whatsappUrl);
                return;
            }
        } catch (e) {
            // Fall through to generic share
        }

        // Fallback to generic share
        try {
            await Share.share({ message });
        } catch (error) {
            // Ignore
        }
    };

    const formatExpiry = (date: Date) => {
        const hours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
        if (hours < 1) {
            const minutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
            return t('guestInvite.minutes', { count: String(minutes) });
        }
        return t('guestInvite.hoursLeft', { count: String(hours) });
    };

    // Load active invites when modal opens
    useEffect(() => {
        if (visible && familyId) {
            loadActiveInvites();
        }
    }, [visible, familyId, loadActiveInvites]);

    // Reset when modal closes
    useEffect(() => {
        if (!visible) {
            setStep('select');
            setSelectedChildren([]);
            setSelectAll(false);
            setInviteResults([]);
            setExpiryHours(24);
            setCopied(null);
        }
    }, [visible]);

    const renderChildItem = (child: ActiveChild) => {
        const isSelected = selectedChildren.includes(child.childId);
        return (
            <TouchableOpacity
                key={child.childId}
                style={[
                    styles.childItem,
                    {
                        backgroundColor: isSelected
                            ? (isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF')
                            : theme.background,
                        borderColor: isSelected ? '#6366F1' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                    }
                ]}
                onPress={() => toggleChild(child.childId)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.checkbox,
                    {
                        backgroundColor: isSelected ? '#6366F1' : 'transparent',
                        borderColor: isSelected ? '#6366F1' : '#D1D5DB',
                    }
                ]}>
                    {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>

                <View style={styles.childInfo}>
                    <Text style={[styles.childName, { color: theme.textPrimary }]}>
                        {child.childName}
                    </Text>
                </View>

                {child.photoUrl ? (
                    <Image source={{ uri: child.photoUrl }} style={styles.childAvatar} />
                ) : (
                    <View style={[styles.childAvatarPlaceholder, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                        <Baby size={18} color="#6366F1" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            {t('guestInvite.title')}
                        </Text>
                        <TouchableOpacity onPress={showHelp} style={styles.closeBtn}>
                            <Info size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {step === 'select' ? (
                        <>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={styles.selectScrollView}
                                contentContainerStyle={styles.selectScrollContent}
                            >
                                {/* Icon */}
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.iconContainer}
                                >
                                    <UserPlus size={32} color="#fff" />
                                </LinearGradient>

                                {/* Description */}
                                <Text style={[styles.description, { color: theme.textSecondary }]}>
                                    {t('guestInvite.selectChildren')}
                                </Text>

                                {/* Select All Option */}
                                {allChildren.length > 1 && (
                                    <TouchableOpacity
                                        style={[
                                            styles.selectAllBtn,
                                            {
                                                backgroundColor: selectAll
                                                    ? (isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF')
                                                    : theme.background,
                                                borderColor: selectAll ? '#6366F1' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                                            }
                                        ]}
                                        onPress={toggleSelectAll}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.checkbox,
                                            {
                                                backgroundColor: selectAll ? '#6366F1' : 'transparent',
                                                borderColor: selectAll ? '#6366F1' : '#D1D5DB',
                                            }
                                        ]}>
                                            {selectAll && <Check size={14} color="#fff" strokeWidth={3} />}
                                        </View>
                                        <View style={styles.selectAllContent}>
                                            <Text style={[styles.selectAllText, { color: theme.textPrimary }]}>
                                                {t('guestInvite.allChildren')}
                                            </Text>
                                            <Text style={[styles.selectAllSubtext, { color: theme.textSecondary }]}>
                                                {t('guestInvite.allChildrenSub')}
                                            </Text>
                                        </View>
                                        <Users size={20} color="#6366F1" />
                                    </TouchableOpacity>
                                )}

                                {/* Children List — no maxHeight, all items visible */}
                                <View style={styles.childrenList}>
                                    {allChildren.map(renderChildItem)}
                                </View>

                                {/* Expiry Duration Picker */}
                                <View style={styles.expirySection}>
                                    <Text style={[styles.expirySectionTitle, { color: theme.textSecondary }]}>
                                        <Clock size={12} color={theme.textSecondary} /> {t('guestInvite.expiryLabel')}
                                    </Text>
                                    <View style={styles.expiryPills}>
                                        {EXPIRY_OPTIONS.map(opt => {
                                            const isActive = expiryHours === opt.hours;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.hours}
                                                    style={[
                                                        styles.expiryPill,
                                                        {
                                                            backgroundColor: isActive
                                                                ? '#6366F1'
                                                                : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6'),
                                                            borderColor: isActive
                                                                ? '#6366F1'
                                                                : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                                                        }
                                                    ]}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setExpiryHours(opt.hours);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[
                                                        styles.expiryPillText,
                                                        { color: isActive ? '#fff' : theme.textSecondary }
                                                    ]}>
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Info Text */}
                                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                                    {t('guestInvite.viewOnly')}{'\n'}
                                    {t('guestInvite.noReports')}
                                </Text>

                                {/* Active Invites Section */}
                                {activeInvites.length > 0 && (
                                    <View style={styles.activeInvitesSection}>
                                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                            {t('guestInvite.activeInvites')} ({activeInvites.length})
                                        </Text>
                                        {activeInvites.map((invite) => {
                                            const childName = allChildren.find(c => c.childId === invite.childId)?.childName || 'ילד';
                                            return (
                                                <View
                                                    key={invite.code}
                                                    style={[styles.activeInviteCard, { backgroundColor: theme.background, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}
                                                >
                                                    <View style={styles.inviteCardContent}>
                                                        <View style={styles.inviteCodeRow}>
                                                            <Text style={[styles.inviteCodeLabel, { color: theme.textSecondary }]}>
                                                                {t('guestInvite.code')}
                                                            </Text>
                                                            <Text style={[styles.inviteCodeValue, { color: theme.textPrimary }]}>
                                                                {invite.code}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.inviteInfoRow}>
                                                            <View style={[styles.inviteChildBadge, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                                                                <Baby size={12} color="#6366F1" />
                                                                <Text style={styles.inviteChildName}>{childName}</Text>
                                                            </View>
                                                            <View style={[styles.inviteExpiryBadge, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : '#FFF7ED' }]}>
                                                                <Clock size={12} color="#F59E0B" />
                                                                <Text style={styles.inviteExpiryText}>
                                                                    {formatExpiry(invite.expiresAt)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={styles.cancelInviteBtn}
                                                        onPress={() => handleCancelInvite(invite.code)}
                                                        disabled={cancelingCode === invite.code}
                                                    >
                                                        {cancelingCode === invite.code ? (
                                                            <ActivityIndicator size="small" color="#EF4444" />
                                                        ) : (
                                                            <Trash2 size={18} color="#EF4444" />
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {loadingInvites && (
                                    <View style={styles.loadingInvites}>
                                        <ActivityIndicator size="small" color={theme.textSecondary} />
                                        <Text style={[styles.loadingInvitesText, { color: theme.textSecondary }]}>
                                            {t('guestInvite.loadingInvites')}
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Create Button — Fixed at bottom */}
                            <TouchableOpacity
                                style={[
                                    styles.createBtn,
                                    { opacity: selectedChildren.length === 0 ? 0.5 : 1 }
                                ]}
                                onPress={handleCreateInvite}
                                disabled={isLoading || selectedChildren.length === 0}
                            >
                                <LinearGradient
                                    colors={['#6366F1', '#4F46E5']}
                                    style={styles.createBtnGradient}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.createBtnText}>
                                            {t('guestInvite.createCode')}{selectedChildren.length > 1 ? ` (${selectedChildren.length})` : ''}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* Code Display Step - With Success Animation */}
                            <Animated.View style={{ alignItems: 'center', transform: [{ scale: successScale }], opacity: successOpacity }}>
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    style={styles.iconContainer}
                                >
                                    <CheckCircle size={32} color="#fff" />
                                </LinearGradient>

                                <Text style={[styles.successText, { color: theme.textPrimary }]}>
                                    {inviteResults.length > 1
                                        ? t('guestInvite.codesCreated', { count: String(inviteResults.length) })
                                        : t('guestInvite.codeCreated')}
                                </Text>
                            </Animated.View>

                            <Animated.View style={[styles.codeSection, { transform: [{ translateY: cardsSlide }], opacity: successOpacity }]}>
                                {/* Show each invite code */}
                                {inviteResults.map((result) => (
                                    <View key={result.code} style={[styles.codeCard, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.1)' : '#F5F3FF' }]}>
                                        {inviteResults.length > 1 && (
                                            <Text style={[styles.codeChildLabel, { color: theme.textSecondary }]}>
                                                {result.childName}
                                            </Text>
                                        )}
                                        <View style={styles.qrContainer}>
                                            <View style={styles.qrWrapper}>
                                                <QRCode
                                                    value={result.code}
                                                    size={inviteResults.length > 1 ? 100 : 140}
                                                    color={isDarkMode ? '#fff' : '#1F2937'}
                                                    backgroundColor="transparent"
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.codeRow}>
                                            <Text style={[styles.codeText, { color: '#6366F1' }]}>
                                                {result.code}
                                            </Text>
                                            <TouchableOpacity
                                                style={[styles.codeCopyBtn, {
                                                    backgroundColor: copied === result.code ? '#10B981' : (isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF'),
                                                }]}
                                                onPress={() => handleCopy(result.code)}
                                            >
                                                {copied === result.code ? (
                                                    <Check size={14} color="#fff" strokeWidth={3} />
                                                ) : (
                                                    <Copy size={14} color="#6366F1" />
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}

                                {/* Expiry */}
                                {inviteResults[0]?.expiresAt && (
                                    <View style={styles.expiryRow}>
                                        <Clock size={14} color={theme.textSecondary} />
                                        <Text style={[styles.expiryText, { color: theme.textSecondary }]}>
                                            {t('guestInvite.validFor', { time: formatExpiry(inviteResults[0].expiresAt) })}
                                        </Text>
                                    </View>
                                )}

                                {/* Actions */}
                                <View style={styles.actions}>
                                    {inviteResults.length > 1 && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, { backgroundColor: copied === 'all' ? '#10B981' : (isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF') }]}
                                            onPress={handleCopyAll}
                                        >
                                            {copied === 'all' ? (
                                                <CheckCircle size={20} color="#fff" />
                                            ) : (
                                                <Copy size={20} color="#6366F1" />
                                            )}
                                            <Text style={[styles.actionText, { color: copied === 'all' ? '#fff' : '#6366F1' }]}>
                                                {copied === 'all' ? t('guestInvite.copied') : t('guestInvite.copyAll')}
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
                                        onPress={handleShare}
                                    >
                                        <MessageCircle size={20} color="#fff" />
                                        <Text style={[styles.actionText, { color: '#fff' }]}>
                                            {t('guestInvite.shareWhatsapp')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
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
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '85%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    closeBtn: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    selectScrollView: {
        flexShrink: 1,
    },
    selectScrollContent: {
        paddingBottom: 8,
    },
    selectAllBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 12,
        gap: 12,
    },
    selectAllContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    selectAllText: {
        fontSize: 15,
        fontWeight: '600',
    },
    selectAllSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    childrenList: {
        marginBottom: 16,
    },
    childItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        marginBottom: 8,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    childInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    childName: {
        fontSize: 15,
        fontWeight: '600',
    },
    childAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    childAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expirySection: {
        marginBottom: 16,
    },
    expirySectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 8,
    },
    expiryPills: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
    },
    expiryPill: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    expiryPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    infoText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    createBtn: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    createBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    createBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    successText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    codeSection: {
        alignItems: 'center',
        width: '100%',
    },
    codeCard: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        marginBottom: 10,
        width: '100%',
    },
    qrContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    qrWrapper: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        overflow: 'hidden',
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    codeChildLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    codeText: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 6,
        flex: 1,
        textAlign: 'center',
    },
    codeCopyBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    expiryText: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    activeInvitesSection: {
        marginBottom: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
        textAlign: 'right',
    },
    activeInviteCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    inviteCardContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    inviteCodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    inviteCodeLabel: {
        fontSize: 12,
    },
    inviteCodeValue: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 2,
    },
    inviteInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    inviteChildBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    inviteChildName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6366F1',
    },
    inviteExpiryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    inviteExpiryText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F59E0B',
    },
    cancelInviteBtn: {
        padding: 10,
        marginLeft: 8,
    },
    loadingInvites: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    loadingInvitesText: {
        fontSize: 13,
    },
});

export default GuestInviteModal;
