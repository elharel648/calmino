import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Users, ChevronDown, Crown, Edit3, Eye } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFamily } from '../../hooks/useFamily';
import { FamilyRole } from '../../services/familyService';
import { auth } from '../../services/firebaseConfig';
import { useLanguage } from '../../context/LanguageContext';

interface GuardianSelectorProps {
    currentGuardian?: string;
    availableRoles?: string[];
    isPremium?: boolean;
    onSelect?: (role: string) => void;
    onUpgradePress?: () => void;
    dynamicStyles?: { text: string };
    onFamilyPress?: () => void;
}

const ROLE_ICONS: Record<FamilyRole, any> = {
    admin: Crown,
    member: Edit3,
    viewer: Eye,
    guest: Eye, // Guest uses same icon as viewer
};

/**
 * Family-connected guardian display - shows who's in the family
 */
const GuardianSelector = memo<GuardianSelectorProps>(({
    onFamilyPress,
    dynamicStyles,
}) => {
    const { theme, isDarkMode } = useTheme();
    const styles = React.useMemo(() => getStyles(theme, isDarkMode), [theme, isDarkMode]);
    const { family, members, myRole } = useFamily();
    const currentUser = auth.currentUser;

    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onFamilyPress?.();
    };

    // No family - show invite prompt
    if (!family) {
        return (
            <TouchableOpacity
                style={styles.container}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <View style={styles.leftSide}>
                    <View style={styles.iconCircle}>
                        <Users size={16} color="#6366F1" />
                    </View>
                    <Text style={styles.label}>
                        <Text style={styles.inviteText}>הזמן בן/בת זוג לצפות יחד</Text>
                    </Text>
                </View>
                <View style={styles.addBtn}>
                    <Text style={styles.addBtnText}>הזמן</Text>
                    <ChevronDown size={14} color="#6366F1" />
                </View>
            </TouchableOpacity>
        );
    }

    // Has family - show members summary
    const myName = members.find(m => m.id === currentUser?.uid)?.name || 'אני';
    const otherMembers = members.filter(m => m.id !== currentUser?.uid);
    const Icon = ROLE_ICONS[myRole || 'member'];

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <View style={styles.leftSide}>
                <View style={styles.familyCircle}>
                    <Users size={16} color="#10B981" />
                </View>
                <View>
                    <Text style={styles.familyLabel}>משפחת {family.babyName}</Text>
                    <Text style={styles.familySubtext}>
                        {otherMembers.length > 0
                            ? `${myName} + ${otherMembers.length} נוספים`
                            : `${myName} - מחובר/ת`
                        }
                    </Text>
                </View>
            </View>

            {/* Member avatars */}
            <View style={styles.avatarsRow}>
                {members.slice(0, 3).map((member, idx) => {
                    const MemberIcon = ROLE_ICONS[member.role];
                    const isMe = member.id === currentUser?.uid;
                    return (
                        <View
                            key={member.id || idx}
                            style={[
                                styles.avatar,
                                { marginLeft: idx > 0 ? -10 : 0 },
                                isMe && styles.avatarActive
                            ]}
                        >
                            <MemberIcon size={12} color={isMe ? '#10B981' : '#6B7280'} />
                        </View>
                    );
                })}
                {members.length > 3 && (
                    <View style={[styles.avatar, { marginLeft: -10 }]}>
                        <Text style={styles.moreText}>+{members.length - 3}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
});

GuardianSelector.displayName = 'GuardianSelector';

const getStyles = (theme: any, isDarkMode: boolean) => StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 0,
    },
    leftSide: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    familyCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#D1FAE5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 14,
    },
    inviteText: {
        color: theme.textSecondary,
        fontWeight: '500',
    },
    familyLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.textPrimary,
        textAlign: 'right',
    },
    familySubtext: {
        fontSize: 12,
        color: theme.textSecondary,
        textAlign: 'right',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366F1',
    },

    // Avatars
    avatarsRow: {
        flexDirection: 'row-reverse',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: theme.cardSecondary,
        borderWidth: 2,
        borderColor: theme.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarActive: {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
    },
    moreText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.textSecondary,
    },
});

export default GuardianSelector;
