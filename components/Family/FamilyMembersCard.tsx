import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    Image,
} from 'react-native';
import { Users, UserPlus, Crown, Eye, Trash2, LogOut, Link, ChevronLeft, Pencil, UserCheck, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFamily } from '../../hooks/useFamily';
import { FamilyRole } from '../../services/familyService';
import { auth } from '../../services/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

interface FamilyMembersCardProps {
    onInvitePress: () => void;
    onJoinPress: () => void;
    onGuestInvitePress?: () => void;
    onEditFamilyName?: () => void;
}

const ROLE_CONFIG: Record<FamilyRole, { label: string; color: string; icon: any; bgLight: string; bgDark: string }> = {
    admin: { label: 'מנהל', color: '#F59E0B', icon: Crown, bgLight: '#FFF7ED', bgDark: 'rgba(245,158,11,0.15)' },
    member: { label: 'חבר', color: '#C8806A', icon: UserCheck, bgLight: '#EEF2FF', bgDark: 'rgba(99,102,241,0.15)' },
    viewer: { label: 'צופה', color: '#10B981', icon: Eye, bgLight: '#ECFDF5', bgDark: 'rgba(16,185,129,0.15)' },
    guest: { label: 'אורח', color: '#F59E0B', icon: Clock, bgLight: '#FFF7ED', bgDark: 'rgba(245,158,11,0.15)' },
};

export const FamilyMembersCard: React.FC<FamilyMembersCardProps> = ({
    onInvitePress,
    onJoinPress,
    onGuestInvitePress,
    onEditFamilyName,
}) => {
    const { theme, isDarkMode } = useTheme();
    const { family, members, isAdmin, remove, leave } = useFamily();

    const getMemberCountText = (count: number) => {
        if (count === 1) return 'חבר 1';
        return `${count} חברים`;
    };

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'הסרת חבר',
            `להסיר את ${memberName}?`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הסר',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await remove(memberId);
                        if (success && Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    };

    const handleLeaveFamily = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'עזיבת משפחה',
            'בטוח שברצונך לעזוב?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'עזוב',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await leave();
                        if (success && Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    };

    // No family yet - simple options
    if (!family) {
        return (
            <View style={[styles.container, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                    style={styles.simpleRow}
                    onPress={onInvitePress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color={isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'} />
                    <Text style={[styles.simpleRowText, { color: theme.textPrimary }]}>צור משפחה</Text>
                    <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                        <UserPlus size={16} color="#C8806A" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.simpleRow}
                    onPress={onJoinPress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color={isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'} />
                    <Text style={[styles.simpleRowText, { color: theme.textPrimary }]}>הצטרף עם קוד</Text>
                    <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : '#ECFDF5' }]}>
                        <Link size={16} color="#10B981" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    // Has family - premium view
    return (
        <View style={[styles.container, { backgroundColor: theme.card }]}>
            {/* Family Header */}
            <View style={styles.header}>
                <View style={styles.headerRight}>
                    <View style={styles.headerTitleRow}>
                        <View style={[styles.familyIconCircle, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                            <Users size={16} color="#C8806A" />
                        </View>
                        <Text style={[styles.familyName, { color: theme.textPrimary }]}>משפחת {family.babyName}</Text>
                    </View>
                    <Text style={[styles.memberCount, { color: theme.textSecondary }]}>{getMemberCountText(members.length)}</Text>
                </View>
                {isAdmin && onEditFamilyName && (
                    <TouchableOpacity
                        onPress={onEditFamilyName}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={[styles.editBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
                    >
                        <Pencil size={14} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Members */}
            <View style={styles.membersSection}>
                {members.map((member, index) => {
                    const config = ROLE_CONFIG[member.role];
                    const isMe = member.id === auth.currentUser?.uid;
                    const initial = (member.name || 'מ').charAt(0).toUpperCase();
                    const RoleIcon = config.icon;

                    return (
                        <View
                            key={member.id || index}
                            style={[styles.memberChip, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                            }]}
                        >
                            {/* Avatar */}
                            {member.photoURL ? (
                                <Image source={{ uri: member.photoURL }} style={styles.chipAvatarImg} />
                            ) : (
                                <View style={[styles.chipAvatar, { backgroundColor: isDarkMode ? config.bgDark : config.bgLight }]}>
                                    <Text style={[styles.chipInitial, { color: config.color }]}>
                                        {initial}
                                    </Text>
                                </View>
                            )}

                            {/* Info */}
                            <View style={styles.chipInfo}>
                                <Text style={[styles.chipName, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {member.name || 'משתמש'}{isMe ? ' (אני)' : ''}
                                </Text>
                                {member.email && (
                                    <Text style={[styles.chipEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {member.email}
                                    </Text>
                                )}
                            </View>

                            {/* Role Badge */}
                            <View style={[styles.roleBadge, { backgroundColor: isDarkMode ? config.bgDark : config.bgLight }]}>
                                <Text style={[styles.roleBadgeText, { color: config.color }]}>
                                    {config.label}
                                </Text>
                            </View>

                            {/* Remove button */}
                            {isAdmin && !isMe && (
                                <TouchableOpacity
                                    onPress={() => handleRemoveMember(member.id!, member.name)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.removeBtn}
                                >
                                    <Trash2 size={14} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]} />

            {/* Actions Section */}
            <View style={styles.actionsSection}>
                {isAdmin && (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={onInvitePress}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color={isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'} />
                        <Text style={[styles.actionText, { color: theme.textPrimary }]}>הזמנה למשפחה</Text>
                        <View style={[styles.actionIcon, { backgroundColor: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EEF2FF' }]}>
                            <UserPlus size={14} color="#C8806A" />
                        </View>
                    </TouchableOpacity>
                )}

                {onGuestInvitePress && (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={onGuestInvitePress}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color={isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'} />
                        <Text style={[styles.actionText, { color: theme.textPrimary }]}>הזמן אורח</Text>
                        <View style={[styles.actionIcon, { backgroundColor: isDarkMode ? 'rgba(16,185,129,0.15)' : '#ECFDF5' }]}>
                            <Users size={14} color="#10B981" />
                        </View>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onJoinPress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color={isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'} />
                    <Text style={[styles.actionText, { color: theme.textPrimary }]}>הצטרף עם קוד</Text>
                    <View style={[styles.actionIcon, { backgroundColor: isDarkMode ? 'rgba(245,158,11,0.15)' : '#FFF7ED' }]}>
                        <Link size={14} color="#F59E0B" />
                    </View>
                </TouchableOpacity>

                {!isAdmin && (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={handleLeaveFamily}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color={isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'} />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>עזוב משפחה</Text>
                        <View style={[styles.actionIcon, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEE2E2' }]}>
                            <LogOut size={14} color="#EF4444" />
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
    },

    // Simple row for no-family state
    simpleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    simpleRowText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerRight: {
        alignItems: 'flex-end',
        flex: 1,
    },
    headerTitleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    familyIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    familyName: {
        fontSize: 17,
        fontWeight: '700',
    },
    memberCount: {
        fontSize: 12,
        marginTop: 4,
        marginRight: 36, // align with text after icon
    },
    editBtn: {
        padding: 8,
        borderRadius: 10,
    },

    // Members section
    membersSection: {
        gap: 8,
        marginBottom: 16,
    },
    memberChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderRadius: 14,
        padding: 12,
        gap: 10,
        borderWidth: 1,
    },
    chipAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipAvatarImg: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    chipInitial: {
        fontSize: 15,
        fontWeight: '700',
    },
    chipInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    chipName: {
        fontSize: 14,
        fontWeight: '600',
    },
    chipEmail: {
        fontSize: 11,
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    removeBtn: {
        padding: 6,
    },

    // Divider
    divider: {
        height: 1,
        marginVertical: 12,
    },

    // Actions section
    actionsSection: {
        gap: 4,
    },
    actionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
    },
    actionIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
    },
});

export default FamilyMembersCard;
