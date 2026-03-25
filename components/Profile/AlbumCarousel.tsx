import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Plus, X, Check, Edit3, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withSpring,
    withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Minimal color - just one accent
const ACCENT = '#8B5CF6';

// Clean Month Card Component
const MonthCard = memo(({
    month,
    url,
    note,
    index,
    onPress,
    onEditNote,
    isLoading,
    setLoading,
    isDarkMode,
    theme,
}: {
    month: number;
    url?: string;
    note?: string;
    index: number;
    onPress: () => void;
    onEditNote: () => void;
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
    isDarkMode: boolean;
    theme: any;
}) => {
    const scale = useSharedValue(1);
    const hasImage = !!url;

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15 });
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Staggered entrance
    const entranceOpacity = useSharedValue(0);
    const entranceTranslate = useSharedValue(20);

    useEffect(() => {
        entranceOpacity.value = withDelay(index * 50, withTiming(1, { duration: 300 }));
        entranceTranslate.value = withDelay(index * 50, withSpring(0, { damping: 15 }));
    }, []);

    const entranceStyle = useAnimatedStyle(() => ({
        opacity: entranceOpacity.value,
        transform: [{ translateY: entranceTranslate.value }],
    }));

    return (
        <Animated.View style={[styles.monthCardWrapper, entranceStyle]}>
            <AnimatedTouchable
                style={[styles.monthCard, containerStyle]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
            >
                <View style={[
                    styles.cardInner,
                    {
                        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                        borderColor: hasImage ? ACCENT + '30' : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    }
                ]}>
                    {hasImage ? (
                        <>
                            {isLoading && (
                                <View style={styles.loadingOverlay}>
                                    <ActivityIndicator size="small" color={ACCENT} />
                                </View>
                            )}
                            <Image
                                source={{ uri: url }}
                                style={[styles.cardImage, { opacity: isLoading ? 0.4 : 1 }]}
                                onLoadStart={() => setLoading(true)}
                                onLoad={() => setLoading(false)}
                                onError={() => setLoading(false)}
                            />
                            {/* Month number badge */}
                            <View style={styles.monthBadge}>
                                <Text style={styles.monthBadgeText}>{month}</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.emptyCardContent}>
                            <Plus size={20} color={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} strokeWidth={1.5} />
                            <Text style={[styles.emptyMonthNumber, { color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                                {month}
                            </Text>
                        </View>
                    )}
                </View>
            </AnimatedTouchable>

            {/* Note indicator */}
            {hasImage && (
                <TouchableOpacity
                    style={styles.noteButton}
                    onPress={onEditNote}
                    activeOpacity={0.7}
                >
                    {note ? (
                        <Text style={[styles.noteText, { color: ACCENT }]} numberOfLines={1}>
                            {note.length > 8 ? note.substring(0, 8) + '...' : note}
                        </Text>
                    ) : (
                        <Edit3 size={12} color={theme.textTertiary} strokeWidth={1.5} />
                    )}
                </TouchableOpacity>
            )}
        </Animated.View>
    );
});

interface AlbumCarouselProps {
    album?: { [month: number]: string };
    albumNotes?: { [month: number]: string };
    onMonthPress: (month: number) => void;
    onAddCustomPhoto?: (month: number) => void;
    onNoteUpdate?: (month: number, note: string) => void;
}

const AlbumCarousel = memo(({ album, albumNotes, onMonthPress, onAddCustomPhoto, onNoteUpdate }: AlbumCarouselProps) => {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());

    const getPhotoData = (month: number): { url?: string; note?: string } => {
        const url = album?.[month];
        const note = albumNotes?.[month];
        return { url, note };
    };

    const handleEditNote = (month: number) => {
        const { note } = getPhotoData(month);
        setNoteText(note || '');
        setEditingMonth(month);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSaveNote = () => {
        if (editingMonth && onNoteUpdate) {
            onNoteUpdate(editingMonth, noteText);
        }
        setEditingMonth(null);
        setNoteText('');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const getVisibleMonths = (): number[] => {
        const baseMonths = Array.from({ length: 12 }, (_, i) => i + 1);
        const extraMonths: number[] = [];
        if (album) {
            for (let m = 13; m <= 36; m++) {
                if (album[m]) extraMonths.push(m);
            }
        }
        return [...baseMonths, ...extraMonths];
    };

    const visibleMonths = getVisibleMonths();

    const setImageLoading = (month: number, loading: boolean) => {
        setLoadingImages(prev => {
            const next = new Set(prev);
            if (loading) next.add(month);
            else next.delete(month);
            return next;
        });
    };

    return (
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {visibleMonths.map((month, index) => {
                    const { url, note } = getPhotoData(month);
                    return (
                        <MonthCard
                            key={month}
                            month={month}
                            url={url}
                            note={note}
                            index={index}
                            onPress={() => onMonthPress(month)}
                            onEditNote={() => handleEditNote(month)}
                            isLoading={loadingImages.has(month)}
                            setLoading={(loading) => setImageLoading(month, loading)}
                            isDarkMode={isDarkMode}
                            theme={theme}
                        />
                    );
                })}

                {/* Add custom photo button */}
                {onAddCustomPhoto && (
                    <TouchableOpacity
                        style={styles.addCustomButton}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMonthPickerOpen(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.addCustomCircle, { borderColor: ACCENT }]}>
                            <Plus size={20} color={ACCENT} strokeWidth={1.5} />
                        </View>
                        <Text style={[styles.addCustomLabel, { color: ACCENT }]}>{t('common.add')}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Month Picker Modal - Clean */}
            <Modal
                visible={monthPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setMonthPickerOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    {Platform.OS === 'ios' && (
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    )}
                    <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setMonthPickerOpen(false)}>
                                <X size={20} color={theme.textSecondary} strokeWidth={1.5} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>בחר חודש</Text>
                            <View style={{ width: 20 }} />
                        </View>
                        <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                            הוסיפו תמונה לחודש 13-36
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.monthPickerScroll}
                        >
                            {Array.from({ length: 24 }, (_, i) => i + 13).map(month => (
                                <TouchableOpacity
                                    key={month}
                                    style={styles.monthPickerItem}
                                    onPress={() => {
                                        setMonthPickerOpen(false);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onAddCustomPhoto?.(month);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.monthPickerCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <Text style={[styles.monthPickerNumber, { color: ACCENT }]}>{month}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Note Edit Modal - Clean */}
            <Modal
                visible={editingMonth !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setEditingMonth(null)}
            >
                <View style={styles.modalOverlay}>
                    {Platform.OS === 'ios' && (
                        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                    )}
                    <View style={[styles.noteModalContent, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setEditingMonth(null)}>
                                <X size={20} color={theme.textSecondary} strokeWidth={1.5} />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                הערה לחודש {editingMonth}
                            </Text>
                            <TouchableOpacity onPress={handleSaveNote}>
                                <Check size={20} color={ACCENT} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[
                                styles.noteInput,
                                {
                                    color: theme.textPrimary,
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                }
                            ]}
                            placeholder="הוסף הערה או תיאור לתמונה..."
                            placeholderTextColor={theme.textTertiary}
                            value={noteText}
                            onChangeText={setNoteText}
                            multiline
                            maxLength={200}
                            autoFocus
                        />
                    </View>
                </View>
            </Modal>
        </>
    );
});

AlbumCarousel.displayName = 'AlbumCarousel';

const styles = StyleSheet.create({
    scrollContent: {
        gap: 12,
        paddingVertical: 8,
        paddingHorizontal: 2,
    },
    monthCardWrapper: {
        alignItems: 'center',
        gap: 6,
    },
    monthCard: {
        position: 'relative',
    },
    cardInner: {
        width: 72,
        height: 72,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 0,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        zIndex: 1,
    },
    monthBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyCardContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    emptyMonthNumber: {
        fontSize: 14,
        fontWeight: '600',
    },
    noteButton: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 30,
        alignItems: 'center',
    },
    noteText: {
        fontSize: 10,
        fontWeight: '500',
    },
    addCustomButton: {
        alignItems: 'center',
        gap: 6,
        marginLeft: 4,
    },
    addCustomCircle: {
        width: 56,
        height: 56,
        borderRadius: 18,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    addCustomLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: 20,
    },
    noteModalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    monthPickerScroll: {
        gap: 10,
        paddingVertical: 8,
    },
    monthPickerItem: {
        alignItems: 'center',
    },
    monthPickerCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthPickerNumber: {
        fontSize: 17,
        fontWeight: '600',
    },
    noteInput: {
        borderRadius: 14,
        padding: 14,
        minHeight: 90,
        fontSize: 15,
        textAlign: 'right',
        textAlignVertical: 'top',
    },
});

export default AlbumCarousel;
