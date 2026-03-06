import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
    ActivityIndicator, Alert, Modal, ScrollView, Platform,
} from 'react-native';
import { getBlockedSitters, unblockSitter } from '../services/babysitterService';
import { auth } from '../services/firebaseConfig';
import { ShieldAlert, Unlock, ChevronRight, X, MapPin, Star, Clock, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

type RootStackParamList = { BlockedUsers: undefined };
type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

export default function BlockedUsersScreen({ navigation }: Props) {
    const { theme, isDarkMode } = useTheme();
    const { isRTL } = useLanguage();
    const [blockedList, setBlockedList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        setLoading(true);
        try {
            const currentUserId = auth.currentUser?.uid;
            if (currentUserId) {
                const list = await getBlockedSitters(currentUserId);
                setBlockedList(list);
            }
        } catch (error) {
            console.error('Error fetching blocked users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnblock = useCallback((sitter: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'הסרת חסימה',
            `האם להסיר את החסימה מ-${sitter.name || sitter.displayName}? הם יחזרו להופיע בתוצאות החיפוש.`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הסר חסימה',
                    style: 'default',
                    onPress: async () => {
                        const currentUserId = auth.currentUser?.uid;
                        if (!currentUserId) return;
                        try {
                            await unblockSitter(currentUserId, sitter.id);
                            setBlockedList(prev => prev.filter(s => s.id !== sitter.id));
                            setSelectedUser(null);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {
                            Alert.alert('שגיאה', 'לא ניתן להסיר את החסימה כרגע.');
                        }
                    }
                }
            ]
        );
    }, []);

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F5F7FA' }]}>
                <ShieldAlert size={48} color={theme.textTertiary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>אין משתמשים חסומים</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                משתמשים שתחסום יופיעו כאן ותוכל לנהל אותם בקלות.
            </Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        const name = item.name || item.displayName || 'סיטר';
        const photo = item.photoUrl || item.photoURL;
        const city = item.city || item.location?.city;
        const rating = typeof item.rating === 'number' ? item.rating.toFixed(1) : null;
        const age = item.age;

        return (
            <TouchableOpacity
                style={[styles.card, {
                    backgroundColor: theme.card,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedUser(item);
                }}
                activeOpacity={0.8}
            >
                {/* Profile photo */}
                <View style={styles.cardPhotoWrapper}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={styles.cardPhoto} />
                    ) : (
                        <View style={[styles.cardPhotoPlaceholder, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F0F0F0' }]}>
                            <User size={28} color={theme.textTertiary} strokeWidth={1.5} />
                        </View>
                    )}
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: theme.textPrimary }]}>{name}</Text>
                    <View style={styles.cardMeta}>
                        {city && (
                            <View style={styles.metaItem}>
                                <MapPin size={12} color={theme.textTertiary} strokeWidth={2} />
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>{city}</Text>
                            </View>
                        )}
                        {age ? (
                            <View style={styles.metaItem}>
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>גיל {age}</Text>
                            </View>
                        ) : null}
                        {rating && (
                            <View style={styles.metaItem}>
                                <Star size={12} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
                                <Text style={[styles.metaText, { color: theme.textSecondary }]}>{rating}</Text>
                            </View>
                        )}
                    </View>
                    {item.bio ? (
                        <Text numberOfLines={1} style={[styles.cardBio, { color: theme.textTertiary }]}>{item.bio}</Text>
                    ) : null}
                </View>

                {/* Unblock quick button */}
                <TouchableOpacity
                    style={[styles.quickUnblock, { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }]}
                    onPress={() => handleUnblock(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Unlock size={15} color="#EF4444" strokeWidth={2} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Custom Header */}
            <View style={[styles.header, {
                backgroundColor: theme.card,
                borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.headerBackBtn, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    }]}
                    activeOpacity={0.7}
                >
                    <ChevronRight size={18} color={theme.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>משתמשים חסומים</Text>
                <View style={{ width: 36 }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={blockedList}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContainer, blockedList.length === 0 && styles.listContainerEmpty]}
                    ListHeaderComponent={blockedList.length > 0 ? (
                        <Text style={[styles.listHeader, { color: theme.textTertiary }]}>
                            {blockedList.length} {blockedList.length === 1 ? 'משתמש חסום' : 'משתמשים חסומים'}
                        </Text>
                    ) : null}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Profile Modal */}
            <Modal
                visible={!!selectedUser}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedUser(null)}
            >
                {selectedUser && <ProfileModal
                    user={selectedUser}
                    theme={theme}
                    isDarkMode={isDarkMode}
                    onClose={() => setSelectedUser(null)}
                    onUnblock={() => handleUnblock(selectedUser)}
                />}
            </Modal>
        </View>
    );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ user, theme, isDarkMode, onClose, onUnblock }: {
    user: any; theme: any; isDarkMode: boolean;
    onClose: () => void; onUnblock: () => void;
}) {
    const name = user.name || user.displayName || 'סיטר';
    const photo = user.photoUrl || user.photoURL;
    const city = user.city || user.location?.city;
    const rating = typeof user.rating === 'number' ? user.rating : null;
    const reviewCount = user.reviewCount || 0;
    const price = user.pricePerHour;
    const experience = user.experience;
    const age = user.age;
    const languages = user.languages;
    const certifications = user.certifications;

    const rows = [
        city      && { label: 'עיר',        value: city,              icon: <MapPin size={16} color={theme.textTertiary} strokeWidth={1.8} /> },
        age       && { label: 'גיל',        value: `${age}`,          icon: <Text style={{ fontSize: 15 }}>🎂</Text> },
        price     && { label: 'מחיר לשעה', value: `₪${price}`,       icon: <Text style={{ fontSize: 15 }}>💰</Text> },
        experience && { label: 'ניסיון',   value: experience,         icon: <Clock size={16} color={theme.textTertiary} strokeWidth={1.8} /> },
        rating !== null && { label: 'דירוג', value: rating.toFixed(1) + (reviewCount > 0 ? ` · ${reviewCount} ביקורות` : ''), icon: <Star size={15} color="#F59E0B" fill="#F59E0B" strokeWidth={0} /> },
    ].filter(Boolean) as { label: string; value: string; icon: React.ReactNode }[];

    const bg = isDarkMode ? theme.background : '#fff';
    const rowBg = isDarkMode ? 'rgba(255,255,255,0.04)' : '#F7F7F7';
    const divider = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    return (
        <View style={[modalStyles.container, { backgroundColor: bg }]}>

            {/* ── Drag handle ── */}
            <View style={[modalStyles.handle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]} />

            {/* ── Close ── */}
            <TouchableOpacity
                onPress={onClose}
                style={[modalStyles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <X size={16} color={theme.textSecondary} strokeWidth={2.5} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scroll}>

                {/* ── Avatar ── */}
                <View style={modalStyles.avatarSection}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={[modalStyles.avatar, { borderColor: divider }]} />
                    ) : (
                        <View style={[modalStyles.avatarPlaceholder, { backgroundColor: rowBg, borderColor: divider }]}>
                            <User size={44} color={theme.textTertiary} strokeWidth={1.2} />
                        </View>
                    )}
                </View>

                {/* ── Name ── */}
                <Text style={[modalStyles.name, { color: theme.textPrimary }]}>{name}</Text>
                <Text style={[modalStyles.role, { color: theme.textTertiary }]}>בייביסיטר</Text>

                {/* ── Blocked pill ── */}
                <View style={modalStyles.blockedPill}>
                    <View style={modalStyles.blockedDot} />
                    <Text style={modalStyles.blockedText}>חסום</Text>
                </View>

                {/* ── Info rows ── */}
                {rows.length > 0 && (
                    <View style={[modalStyles.card, { backgroundColor: rowBg, borderColor: divider }]}>
                        {rows.map((row, i) => (
                            <View key={i} style={[
                                modalStyles.row,
                                i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: divider }
                            ]}>
                                <View style={modalStyles.rowIcon}>{row.icon}</View>
                                <Text style={[modalStyles.rowLabel, { color: theme.textSecondary }]}>{row.label}</Text>
                                <Text style={[modalStyles.rowValue, { color: theme.textPrimary }]}>{row.value}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Bio ── */}
                {user.bio ? (
                    <View style={[modalStyles.card, { backgroundColor: rowBg, borderColor: divider }]}>
                        <Text style={[modalStyles.sectionLabel, { color: theme.textTertiary }]}>אודות</Text>
                        <Text style={[modalStyles.bioText, { color: theme.textPrimary }]}>{user.bio}</Text>
                    </View>
                ) : null}

                {/* ── Languages + Certs ── */}
                {((languages && languages.length > 0) || (certifications && certifications.length > 0)) && (
                    <View style={[modalStyles.card, { backgroundColor: rowBg, borderColor: divider }]}>
                        {languages && languages.length > 0 && (
                            <>
                                <Text style={[modalStyles.sectionLabel, { color: theme.textTertiary }]}>שפות</Text>
                                <View style={modalStyles.tagsRow}>
                                    {languages.map((l: string, i: number) => (
                                        <View key={i} style={[modalStyles.tag, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                            <Text style={[modalStyles.tagText, { color: theme.textSecondary }]}>{l}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                        {certifications && certifications.length > 0 && (
                            <>
                                <Text style={[modalStyles.sectionLabel, { color: theme.textTertiary, marginTop: languages?.length ? 12 : 0 }]}>הסמכות</Text>
                                <View style={modalStyles.tagsRow}>
                                    {certifications.map((c: string, i: number) => (
                                        <View key={i} style={[modalStyles.tag, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                            <Text style={[modalStyles.tagText, { color: theme.textSecondary }]}>{c}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* ── Unblock button ── */}
            <View style={[modalStyles.footer, { backgroundColor: bg, borderTopColor: divider }]}>
                <TouchableOpacity
                    style={[modalStyles.unblockBtn, { backgroundColor: '#EF4444' }]}
                    onPress={onUnblock}
                    activeOpacity={0.82}
                >
                    <Unlock size={17} color="#fff" strokeWidth={2.5} />
                    <Text style={modalStyles.unblockText}>הסר חסימה</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 58 : 44,
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBackBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18, fontWeight: '700', letterSpacing: -0.3,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 20, paddingBottom: 40 },
    listContainerEmpty: { flexGrow: 1 },
    listHeader: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 14,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardPhotoWrapper: { marginLeft: 12 },
    cardPhoto: { width: 58, height: 58, borderRadius: 29 },
    cardPhotoPlaceholder: {
        width: 58, height: 58, borderRadius: 29,
        alignItems: 'center', justifyContent: 'center',
    },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'right' },
    cardMeta: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginBottom: 3 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 13 },
    cardBio: { fontSize: 12, textAlign: 'right' },
    quickUnblock: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 4,
    },
    emptyState: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingBottom: 80,
    },
    emptyIconContainer: {
        width: 100, height: 100, borderRadius: 50,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptyDesc: { fontSize: 15, textAlign: 'center', maxWidth: '75%', lineHeight: 22 },
});

const modalStyles = StyleSheet.create({
    container: { flex: 1 },
    handle: {
        alignSelf: 'center',
        width: 36, height: 4, borderRadius: 2,
        marginTop: 10, marginBottom: 4,
    },
    closeBtn: {
        position: 'absolute',
        top: 16, left: 20,
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
    },
    scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

    // Avatar
    avatarSection: { alignItems: 'center', marginBottom: 14, marginTop: 8 },
    avatar: {
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 1,
    },
    avatarPlaceholder: {
        width: 96, height: 96, borderRadius: 48,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },

    // Identity
    name: { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: -0.4 },
    role: { fontSize: 13, textAlign: 'center', marginTop: 3, marginBottom: 12 },
    blockedPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'center',
        backgroundColor: 'rgba(239,68,68,0.1)',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, marginBottom: 24,
    },
    blockedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    blockedText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

    // Info card
    card: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 10,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 10,
    },
    rowIcon: { width: 22, alignItems: 'center' },
    rowLabel: { flex: 1, fontSize: 14, textAlign: 'right' },
    rowValue: { fontSize: 14, fontWeight: '600' },

    // Bio + tags
    sectionLabel: {
        fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
        letterSpacing: 0.6, textAlign: 'right',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
    },
    bioText: { fontSize: 14, lineHeight: 22, textAlign: 'right', paddingHorizontal: 16, paddingBottom: 14 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14 },
    tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
    tagText: { fontSize: 13, fontWeight: '500' },

    // Footer
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    unblockBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 15,
        borderRadius: 14,
    },
    unblockText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
