import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, Animated as RNAnimated, ScrollView, TextInput, Alert } from 'react-native';
import { Sun, Droplet, Check, Pill, X, Plus, Trash2, Fish, Heart, Star, Zap, Flame, Apple, Leaf, Bean, Egg, CircleDot, Pencil } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
    withDelay,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MedicationsState, CustomSupplement } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { notificationStorageService } from '../../services/notificationStorageService';
import { auth } from '../../services/firebaseConfig';

// Icon map for custom supplements
const ICON_MAP: Record<string, any> = {
    pill: Pill,
    fish: Fish,
    heart: Heart,
    star: Star,
    zap: Zap,
    flame: Flame,
    apple: Apple,
    leaf: Leaf,
    bean: Bean,
    egg: Egg,
    droplet: Droplet,
    sun: Sun,
    circle: CircleDot,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

interface SupplementsModalProps {
    visible: boolean;
    onClose: () => void;
    meds: MedicationsState;
    onToggle: (type: string) => void;
    onRefresh?: () => void;
    customSupplements: CustomSupplement[];
    onAddCustom: (name: string, icon: string) => Promise<void>;
    onRemoveCustom: (id: string) => Promise<void>;
    takenCount: number;
    totalCount: number;
}

// Individual supplement row component (list layout)
const SupplementCard = memo(({
    id,
    name,
    icon,
    taken,
    isDefault,
    isEditMode,
    isDarkMode,
    theme,
    onToggle,
    onRemove,
}: {
    id: string;
    name: string;
    icon: string;
    taken: boolean;
    isDefault: boolean;
    isEditMode: boolean;
    isDarkMode: boolean;
    theme: any;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
}) => {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        if (isEditMode) return;

        scale.value = withSequence(
            withTiming(0.97, { duration: 80 }),
            withTiming(1, { duration: 150 })
        );

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(
                taken ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
            );
        }

        onToggle(id);
    };

    const IconComponent = ICON_MAP[icon] || Pill;

    return (
        <Animated.View style={animStyle} entering={FadeIn.duration(250)}>
            <TouchableOpacity
                style={[
                    styles.rowItem,
                    {
                        backgroundColor: taken
                            ? (isDarkMode ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.07)')
                            : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                        borderColor: taken
                            ? (isDarkMode ? 'rgba(52,199,89,0.3)' : 'rgba(52,199,89,0.2)')
                            : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    },
                ]}
                onPress={handlePress}
                activeOpacity={0.75}
                disabled={isEditMode}
            >
                {/* Delete badge in edit mode */}
                {isEditMode && (
                    <TouchableOpacity
                        style={styles.deleteBadge}
                        onPress={() => onRemove(id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Trash2 size={13} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                )}

                {/* Check/status indicator — left side (LTR left = RTL end) */}
                <View style={[
                    styles.checkCircle,
                    taken && {
                        backgroundColor: isDarkMode ? 'rgba(52,199,89,0.3)' : '#34C759',
                        borderColor: 'transparent',
                    },
                    !taken && {
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                        backgroundColor: 'transparent',
                    },
                ]}>
                    {taken && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>

                {/* Name — flex 1, right-aligned */}
                <Text style={[styles.rowName, { color: theme.textPrimary }]} numberOfLines={1}>
                    {name}
                </Text>

                {/* Icon circle — right side (RTL start) */}
                <View style={[
                    styles.rowIconCircle,
                    { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
                ]}>
                    <IconComponent
                        size={18}
                        color={taken ? '#34C759' : (isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)')}
                        strokeWidth={1.75}
                    />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

SupplementCard.displayName = 'SupplementCard';

// Add supplement mini form
const AddSupplementForm = memo(({
    isDarkMode,
    theme,
    onAdd,
    onCancel,
}: {
    isDarkMode: boolean;
    theme: any;
    onAdd: (name: string, icon: string) => void;
    onCancel: () => void;
}) => {
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('pill');
    const { t } = useLanguage();

    const handleAdd = () => {
        const trimmed = name.trim();
        if (!trimmed) {
            Alert.alert(t('common.error'), t('supplements.enterName'));
            return;
        }
        onAdd(trimmed, selectedIcon);
        setName('');
        setSelectedIcon('pill');
    };

    return (
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={[
            styles.addForm,
            {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            }
        ]}>
            <Text style={[styles.addFormTitle, { color: theme.textPrimary }]}>
                {t('supplements.addNewSupplement')}
            </Text>

            <TextInput
                style={[
                    styles.input,
                    {
                        color: theme.textPrimary,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#fff',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                    }
                ]}
                placeholder={t('supplements.namePlaceholder')}
                placeholderTextColor={theme.textTertiary}
                value={name}
                onChangeText={setName}
                textAlign="right"
                maxLength={20}
            />

            <Text style={[styles.iconPickerLabel, { color: theme.textSecondary }]}>
                {t('supplements.selectIcon')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconPicker} contentContainerStyle={styles.iconPickerContent}>
                {ICON_OPTIONS.map((iconKey) => {
                    const Icon = ICON_MAP[iconKey];
                    const isSelected = selectedIcon === iconKey;
                    return (
                        <TouchableOpacity
                            key={iconKey}
                            style={[
                                styles.iconOption,
                                {
                                    backgroundColor: isSelected
                                        ? (isDarkMode ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.1)')
                                        : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
                                    borderColor: isSelected
                                        ? '#007AFF'
                                        : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                }
                            ]}
                            onPress={() => setSelectedIcon(iconKey)}
                        >
                            <Icon size={20} color={isSelected ? '#007AFF' : (isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)')} strokeWidth={1.5} />
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={styles.addFormButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                    <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.confirmBtn, { opacity: name.trim() ? 1 : 0.5 }]}
                    onPress={handleAdd}
                    disabled={!name.trim()}
                >
                    <Text style={styles.confirmBtnText}>{t('supplements.add')}</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
});

AddSupplementForm.displayName = 'AddSupplementForm';

const SupplementsModal = memo(({ visible, onClose, meds, onToggle, onRefresh, customSupplements, onAddCustom, onRemoveCustom, takenCount, totalCount }: SupplementsModalProps) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const [isEditMode, setIsEditMode] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // Animation values
    const celebrationScale = useSharedValue(0);
    const celebrationOpacity = useSharedValue(0);
    const fadeAnim = useRef(new RNAnimated.Value(0)).current;
    const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;

    const celebrationStyle = useAnimatedStyle(() => ({
        transform: [{ scale: celebrationScale.value }],
        opacity: celebrationOpacity.value,
    }));

    // Modal animations
    useEffect(() => {
        if (visible) {
            RNAnimated.parallel([
                RNAnimated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }),
            ]).start();
        } else {
            RNAnimated.parallel([
                RNAnimated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                RNAnimated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
            ]).start();
            // Reset edit mode when modal closes
            setIsEditMode(false);
            setShowAddForm(false);
        }
    }, [visible]);

    // Celebration when all are done
    useEffect(() => {
        if (takenCount === totalCount && totalCount > 0) {
            celebrationScale.value = withSequence(
                withSpring(1.2, { damping: 8, stiffness: 200 }),
                withSpring(1, { damping: 10 })
            );
            celebrationOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(1500, withTiming(0, { duration: 300 }))
            );
        }
    }, [takenCount, totalCount]);

    const handleClose = () => {
        RNAnimated.parallel([
            RNAnimated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            RNAnimated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            onClose();
        });
    };

    const handleToggle = useCallback((id: string) => {
        onToggle(id);
        // Check if it was previously not taken (meaning we're marking it as taken)
        const wasTaken = id === 'vitaminD' ? meds.vitaminD : id === 'iron' ? meds.iron : (meds.custom?.[id] || false);
        if (!wasTaken) {
            // Save in-app notification for supplement taken
            const userId = auth.currentUser?.uid;
            if (userId) {
                // Find the supplement name
                const suppName = id === 'vitaminD' ? t('notifications.vitaminD') : id === 'iron' ? t('notifications.iron') : customSupplements.find(s => s.id === id)?.name || id;
                notificationStorageService.saveNotification({
                    userId,
                    type: 'medication',
                    title: t('supplements.supplementGiven'),
                    message: suppName,
                    timestamp: new Date(),
                    isRead: false,
                }).catch(() => {});
            }
            if (onRefresh) {
                setTimeout(onRefresh, 300);
            }
        }
    }, [onToggle, meds, onRefresh, customSupplements]);

    const handleAddCustom = useCallback(async (name: string, icon: string) => {
        await onAddCustom(name, icon);
        setShowAddForm(false);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [onAddCustom]);

    const handleRemoveCustom = useCallback((id: string) => {
        Alert.alert(
            t('supplements.removeTitle'),
            t('supplements.removeConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'), style: 'destructive', onPress: async () => {
                        await onRemoveCustom(id);
                        if (Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        }
                    }
                },
            ]
        );
    }, [onRemoveCustom]);

    if (!visible) return null;

    // Build supplement list: defaults (unless hidden) + custom
    const hiddenDefaults = meds.hiddenDefaults || [];
    const allSupplements = [
        { id: 'vitaminD', name: t('notifications.vitaminD'), icon: 'sun', taken: meds.vitaminD, isDefault: true },
        { id: 'iron', name: t('notifications.iron'), icon: 'droplet', taken: meds.iron, isDefault: true },
        ...customSupplements.map(s => ({
            id: s.id,
            name: s.name,
            icon: s.icon,
            taken: meds.custom?.[s.id] || false,
            isDefault: false,
        })),
    ].filter(s => !s.isDefault || !hiddenDefaults.includes(s.id));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <RNAnimated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <RNAnimated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: theme.card,
                            transform: [{ scale: scaleAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={[
                                styles.iconCircle,
                                {
                                    backgroundColor: isEditMode
                                        ? (isDarkMode ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)')
                                        : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                                    borderColor: isEditMode
                                        ? 'rgba(0,122,255,0.4)'
                                        : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                                }
                            ]}
                            onPress={() => {
                                setIsEditMode(!isEditMode);
                                if (isEditMode) setShowAddForm(false);
                                if (Platform.OS !== 'web') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Pill size={20} color={isEditMode ? '#007AFF' : (isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.65)')} strokeWidth={2} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            {isEditMode ? t('supplements.editTitle') : t('supplements.dailyTitle')}
                        </Text>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={isEditMode ? () => { setIsEditMode(false); setShowAddForm(false); } : onClose}
                            activeOpacity={0.7}
                        >
                            <X size={20} color={theme.textSecondary} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {/* Supplements list */}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.supplementsList}>
                            {allSupplements.map((supp) => (
                                <SupplementCard
                                    key={supp.id}
                                    id={supp.id}
                                    name={supp.name}
                                    icon={supp.icon}
                                    taken={supp.taken}
                                    isDefault={supp.isDefault}
                                    isEditMode={isEditMode}
                                    isDarkMode={isDarkMode}
                                    theme={theme}
                                    onToggle={handleToggle}
                                    onRemove={handleRemoveCustom}
                                />
                            ))}

                            {/* Add button — full-width row in edit mode */}
                            {isEditMode && !showAddForm && (
                                <Animated.View entering={FadeIn.duration(300)}>
                                    <TouchableOpacity
                                        style={[
                                            styles.rowItem,
                                            styles.addRowBtn,
                                            {
                                                backgroundColor: isDarkMode ? 'rgba(0,122,255,0.06)' : 'rgba(0,122,255,0.04)',
                                                borderColor: isDarkMode ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.18)',
                                                borderStyle: 'dashed',
                                            },
                                        ]}
                                        onPress={() => setShowAddForm(true)}
                                        activeOpacity={0.7}
                                    >
                                        <Plus size={18} color="#007AFF" strokeWidth={2.5} />
                                        <Text style={[styles.addRowText, { color: '#007AFF' }]}>
                                            {t('supplements.addSupplement')}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </View>

                        {/* Add form */}
                        {showAddForm && (
                            <AddSupplementForm
                                isDarkMode={isDarkMode}
                                theme={theme}
                                onAdd={handleAddCustom}
                                onCancel={() => setShowAddForm(false)}
                            />
                        )}
                    </ScrollView>

                    {/* Progress indicator */}
                    {!isEditMode && (
                        <View style={styles.progressContainer}>
                            <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                                {t('supplements.givenToday', { taken: takenCount.toString(), total: totalCount.toString() })}
                            </Text>
                            <View style={[
                                styles.progressTrack,
                                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                            ]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: totalCount > 0 ? `${(takenCount / totalCount) * 100}%` : '0%',
                                            backgroundColor: '#007AFF',
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    )}

                    {/* Edit mode hint */}
                    {!isEditMode && (
                        <TouchableOpacity
                            style={styles.editHint}
                            onPress={() => {
                                setIsEditMode(true);
                                if (Platform.OS !== 'web') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={styles.editHintRow}>
                                <Pencil size={14} color="#007AFF" strokeWidth={2} />
                                <Text style={[styles.editHintText, { color: '#007AFF' }]}>
                                    {t('supplements.editSupplements')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </RNAnimated.View>
            </RNAnimated.View>
        </Modal>
    );
});

SupplementsModal.displayName = 'SupplementsModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 380,
        maxHeight: '80%',
        borderRadius: 28,
        paddingVertical: 32,
        paddingHorizontal: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    title: {
        flex: 1,
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'right',
        marginRight: 12,
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    scrollArea: {
        flexGrow: 0,
    },
    scrollContent: {
        paddingBottom: 4,
    },
    supplementsList: {
        flexDirection: 'column',
        gap: 8,
    },
    rowItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 60,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    rowIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    rowName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
        letterSpacing: -0.3,
    },
    checkCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    addRowBtn: {
        justifyContent: 'center',
        gap: 8,
    },
    addRowText: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
    },
    deleteBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 0,
    },
    progressContainer: {
        marginTop: 28,
        alignItems: 'center',
        gap: 10,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.6,
        letterSpacing: -0.2,
    },
    editHintRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    editHint: {
        marginTop: 16,
        alignItems: 'center',
        paddingVertical: 6,
    },
    editHintText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Add form styles
    addForm: {
        marginTop: 16,
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
    },
    addFormTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'right',
        marginBottom: 12,
    },
    input: {
        height: 46,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    iconPickerLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 8,
    },
    iconPicker: {
        marginBottom: 14,
    },
    iconPickerContent: {
        gap: 8,
        flexDirection: 'row-reverse',
    },
    iconOption: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    addFormButtons: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',
        gap: 10,
    },
    confirmBtn: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default SupplementsModal;
