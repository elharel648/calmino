import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Plus, Baby, Users, X, UserPlus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/LanguageContext';

interface AddBabyPlaceholderProps {
    onCreateBaby: () => void;
    onJoinWithCode: () => void;
}

const AddBabyPlaceholder: React.FC<AddBabyPlaceholderProps> = ({ onCreateBaby, onJoinWithCode }) => {
    const { theme } = useTheme();
    const { t } = useLanguage();
    const [showModal, setShowModal] = useState(false);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowModal(true);
    };

    const handleCreateBaby = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowModal(false);
        onCreateBaby();
    };

    const handleJoinWithCode = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowModal(false);
        onJoinWithCode();
    };

    return (
        <>
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                {/* Icon + badge wrapper — badge lives OUTSIDE the gradient so it's never clipped */}
                <View style={styles.iconWrapper}>
                    <LinearGradient
                        colors={['#C8806A', '#CD8B87']}
                        style={styles.iconContainer}
                    >
                        <Baby size={32} color="#fff" />
                    </LinearGradient>
                    <View style={styles.plusBadge}>
                        <Plus size={14} color="#fff" strokeWidth={3} />
                    </View>
                </View>

                <View style={styles.textBlock}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>{t('child.addChild')}</Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        לחץ כאן כדי ליצור פרופיל לילד שלך
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Options Modal */}
            <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                                <X size={22} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('child.addChild')}</Text>
                            <View style={{ width: 30 }} />
                        </View>

                        <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
                            בחר כיצד ברצונך להתחיל
                        </Text>

                        {/* Option 1: Create Own Baby */}
                        <TouchableOpacity
                            style={[styles.optionCard, { borderColor: '#C8806A' }]}
                            onPress={handleCreateBaby}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#C8806A', '#CD8B87']}
                                style={styles.optionIcon}
                            >
                                <Baby size={24} color="#fff" />
                            </LinearGradient>
                            <View style={styles.optionText}>
                                <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                                    יצירת פרופיל ילד חדש
                                </Text>
                                <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                                    אני ההורה ורוצה להתחיל לתעד
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Join with Code */}
                        <TouchableOpacity
                            style={[styles.optionCard, { borderColor: '#10B981' }]}
                            onPress={handleJoinWithCode}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.optionIcon}
                            >
                                <UserPlus size={24} color="#fff" />
                            </LinearGradient>
                            <View style={styles.optionText}>
                                <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                                    הצטרף עם קוד הזמנה
                                </Text>
                                <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
                                    קיבלתי קוד מהורה לצפות בילד
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 16,
    },
    iconWrapper: {
        width: 72,
        height: 72,
        position: 'relative',
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: '#fff',
    },
    textBlock: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 5,
        textAlign: 'right',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'right',
        lineHeight: 20,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    closeBtn: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    modalDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        marginBottom: 12,
        gap: 14,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'right',
    },
    optionSubtitle: {
        fontSize: 13,
        textAlign: 'right',
    },
});

export default AddBabyPlaceholder;
