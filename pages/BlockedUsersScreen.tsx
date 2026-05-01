import React, { useEffect, useState } from 'react';
import InlineLoader from '../components/Common/InlineLoader';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert,  Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../services/firebaseConfig';
import { getBlockedUsers, unblockUser, BlockedUser } from '../services/blockService';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { UserX } from 'lucide-react-native';

const BlockedUsersScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        setLoading(true);
        const userId = auth.currentUser?.uid;
        if (userId) {
            const users = await getBlockedUsers(userId);
            setBlockedUsers(users);
        }
        setLoading(false);
    };

    const handleUnblock = (user: BlockedUser) => {
        Alert.alert('הסרת חסימה', `האם אתה בטוח שברצונך להסיר את החסימה מ-${user.name}?`, [
            { text: 'ביטול', style: 'cancel' },
            {
                text: 'הסר חסימה', onPress: async () => {
                    const currentUserId = auth.currentUser?.uid;
                    if (currentUserId) {
                        const success = await unblockUser(currentUserId, user);
                        if (success) {
                            setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
                        } else {
                            Alert.alert('שגיאה', 'אירעה שגיאה בהסרת החסימה.');
                        }
                    }
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textPrimary }]}>משתמשים חסומים</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <InlineLoader size="large" color={theme.primary}  />
                </View>
            ) : blockedUsers.length === 0 ? (
                <View style={styles.center}>
                    <UserX size={64} color={theme.textSecondary} style={{ marginBottom: 16 }} opacity={0.5} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>אין לך משתמשים חסומים.</Text>
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: isDarkMode ? theme.card : '#fff', borderColor: theme.border }]}>
                            <TouchableOpacity
                                style={[styles.unblockBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => handleUnblock(item)}
                            >
                                <Text style={[styles.unblockText, { color: theme.textPrimary }]}>הסר חסימה</Text>
                            </TouchableOpacity>

                            <View style={styles.info}>
                                <Text style={[styles.name, { color: theme.textPrimary }]}>{item.name}</Text>
                                <Text style={[styles.type, { color: theme.textSecondary }]}>{t('blockedUsers.user')}</Text>
                            </View>

                            {item.image ? (
                                <Image source={{ uri: item.image }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}>
                                    <Ionicons name="person" size={24} color={theme.textSecondary} />
                                </View>
                            )}
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    info: {
        flex: 1,
        marginHorizontal: 16,
        alignItems: 'flex-end',
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
    },
    type: {
        fontSize: 13,
        marginTop: 2,
        textAlign: 'right',
    },
    unblockBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    unblockText: {
        fontSize: 14,
        fontWeight: '600',
    }
});

export default BlockedUsersScreen;
