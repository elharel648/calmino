import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Animated,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Star, X, Send, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { submitReview } from '../services/babysitterService';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { ReviewTag, REVIEW_TAG_LABELS, REVIEW_TAG_LABELS_MALE } from '../types/babysitter';
import { logger } from '../utils/logger';
import { useLanguage } from '../context/LanguageContext';

type RootStackParamList = {
    RatingScreen: { bookingId?: string; babysitterId: string; sitterName?: string };
    [key: string]: any;
};

type Props = NativeStackScreenProps<RootStackParamList, 'RatingScreen'>;

const AVAILABLE_TAGS: ReviewTag[] = [
    'reliable',
    'punctual',
    'great_with_babies',
    'kids_loved_her',
    'flexible',
    'professional',
];

const RATING_LABELS_FALLBACK = ['', 'לא טוב', 'סביר', 'טוב', 'מצוין', 'מושלם! ⭐'];

export default function RatingScreen({
    route, navigation }: Props) {
    const insets = useSafeAreaInsets();
    const { bookingId, babysitterId, sitterName } = route.params;
    const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();

    const [rating, setRating] = useState<number>(0);
    const [selectedTags, setSelectedTags] = useState<ReviewTag[]>([]);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sitterGender, setSitterGender] = useState<'male' | 'female'>('female');
    const [customTagInput, setCustomTagInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customTags, setCustomTags] = useState<string[]>([]);

    // Fetch sitter gender
    React.useEffect(() => {
        getDoc(doc(db, 'users', babysitterId)).then((snap) => {
            const g = snap.data()?.gender;
            if (g === 'male' || g === 'זכר') setSitterGender('male');
        }).catch(() => {});
    }, [babysitterId]);

    const tagLabels = sitterGender === 'male' ? REVIEW_TAG_LABELS_MALE : REVIEW_TAG_LABELS;

    const handleAddCustomTag = () => {
        const trimmed = customTagInput.trim();
        if (!trimmed || customTags.includes(trimmed)) return;
        setCustomTags([...customTags, trimmed]);
        setCustomTagInput('');
        setShowCustomInput(false);
        Haptics.selectionAsync();
    };

    // Star animations
    const starScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

    const handleTagToggle = (tag: ReviewTag) => {
        Haptics.selectionAsync();
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleRatingSelect = (selected: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setRating(selected);

        // Animate the selected star with a pop effect
        Animated.sequence([
            Animated.timing(starScales[selected - 1], {
                toValue: 1.35,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.spring(starScales[selected - 1], {
                toValue: 1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert(t('common.error'), t('rating.selectRatingError'));
            return;
        }

        const parentId = auth.currentUser?.uid;
        if (!parentId) {
            Alert.alert(t('common.error'), t('rating.loginRequired'));
            return;
        }

        try {
            setIsSubmitting(true);
            // Check if parent contacted this sitter via WhatsApp → verified review
            let isVerified = !!bookingId;
            if (!isVerified) {
                try {
                    const parentDoc = await getDoc(doc(db, 'users', parentId));
                    const contacted: string[] = parentDoc.data()?.contactedSitters || [];
                    isVerified = contacted.includes(babysitterId);
                } catch { /* silent */ }
            }
            // Auto-save any unsaved custom tag text
            const pendingTag = customTagInput.trim();
            const finalCustomTags = pendingTag && !customTags.includes(pendingTag)
                ? [...customTags, pendingTag]
                : customTags;
            const allTags = [...selectedTags, ...finalCustomTags] as ReviewTag[];
            await submitReview(bookingId, babysitterId, parentId, rating, allTags, text, isVerified);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t('rating.thankYou'), t('rating.thankYouMessage'), [
                { text: t('common.close'), onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            logger.error('Submit review error:', error);
            Alert.alert(t('common.error'), t('rating.serverError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <LinearGradient
                    colors={isDarkMode ? ['#1a1040', '#0F0A1A'] : ['#F8F7FF', theme.background]}
                    style={StyleSheet.absoluteFill}
                />
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <View style={[styles.closeBtnCircle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <X size={20} color={theme.textPrimary} strokeWidth={2.5} />
                    </View>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                    {t('rating.howWasItWith', { name: sitterName || t('rating.sitterFallback') })}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>

                    {/* Stars Card */}
                    <View style={[styles.card, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        shadowColor: isDarkMode ? 'transparent' : '#000',
                    }]}>
                        <View style={styles.starsIconRow}>
                            <Sparkles size={16} color="#FBBF24" strokeWidth={2} />
                            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{t('rating.rateOverall')}</Text>
                        </View>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => handleRatingSelect(star)}
                                    style={styles.starBtn}
                                    activeOpacity={0.7}
                                >
                                    <Animated.View style={{ transform: [{ scale: starScales[star - 1] }] }}>
                                        <Star
                                            size={44}
                                            color={star <= rating ? '#FBBF24' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB')}
                                            fill={star <= rating ? '#FBBF24' : 'transparent'}
                                            strokeWidth={star <= rating ? 2 : 1.5}
                                        />
                                    </Animated.View>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {rating > 0 && (
                            <Text style={[styles.ratingLabel, { color: theme.primary }]}>
                                {RATING_LABELS_FALLBACK[rating]}
                            </Text>
                        )}
                    </View>

                    {/* Tags Card */}
                    {rating > 0 && (
                        <View style={[styles.card, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            shadowColor: isDarkMode ? 'transparent' : '#000',
                        }]}>
                            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{t('rating.whatDidYouLike')}</Text>
                            <View style={styles.tagsContainer}>
                                {AVAILABLE_TAGS.map((tag) => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <TouchableOpacity
                                            key={tag}
                                            style={[
                                                styles.tagBtn,
                                                isSelected
                                                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                                    : {
                                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F3FF',
                                                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E9E5FF',
                                                    }
                                            ]}
                                            onPress={() => handleTagToggle(tag)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.tagText,
                                                { color: isSelected ? '#fff' : (isDarkMode ? theme.textPrimary : '#6D28D9') }
                                            ]}>
                                                {tagLabels[tag]}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}

                                {/* Custom tags */}
                                {customTags.map((tag) => (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[styles.tagBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                        onPress={() => setCustomTags(customTags.filter(t => t !== tag))}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.tagText, { color: '#fff' }]}>{tag} ✕</Text>
                                    </TouchableOpacity>
                                ))}

                                {/* Custom input */}
                                {showCustomInput ? (
                                    <View style={[styles.tagBtn, {
                                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F3FF',
                                        borderColor: theme.primary,
                                        paddingHorizontal: 8,
                                        flexDirection: 'row',
                                        gap: 4,
                                    }]}>
                                        <TouchableOpacity onPress={handleAddCustomTag}>
                                            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>✓</Text>
                                        </TouchableOpacity>
                                        <TextInput
                                            autoFocus
                                            value={customTagInput}
                                            onChangeText={setCustomTagInput}
                                            onSubmitEditing={handleAddCustomTag}
                                            placeholder={t('rating.enterTag')}
                                            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF'}
                                            style={{ color: theme.textPrimary, fontSize: 14, minWidth: 80, textAlign: 'right' }}
                                            returnKeyType="done"
                                        />
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.tagBtn, {
                                            backgroundColor: theme.primary,
                                            borderColor: theme.primary,
                                            paddingHorizontal: 14,
                                        }]}
                                        onPress={() => { setShowCustomInput(true); Haptics.selectionAsync(); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300', lineHeight: 24 }}>+</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Text Card */}
                    <View style={[styles.card, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        shadowColor: isDarkMode ? 'transparent' : '#000',
                    }]}>
                        <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
                            {t('rating.warmWords')}
                        </Text>
                        <TextInput
                            style={[styles.textInput, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#FAFAFE',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F0EDFF',
                                color: theme.textPrimary,
                            }]}
                            placeholder={t('rating.reviewPlaceholder')}
                            placeholderTextColor={theme.textTertiary}
                            multiline
                            textAlign="right"
                            maxLength={500}
                            value={text}
                            onChangeText={setText}
                        />
                    </View>

                    {/* Submit Button — inside ScrollView so it's always reachable */}
                    <TouchableOpacity
                        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting || rating === 0}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={rating > 0
                                ? ['#7C3AED', '#6D28D9', '#5B21B6']
                                : [isDarkMode ? '#2a2a2a' : '#E5E7EB', isDarkMode ? '#222' : '#D1D5DB']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.submitGradient}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={[styles.submitBtnText, { color: rating > 0 ? '#fff' : theme.textTertiary }]}>
                                        {t('rating.saveRating')}
                                    </Text>
                                    {rating > 0 && <Send size={18} color="#fff" strokeWidth={2.5} style={{ marginRight: 8 }} />}
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>


                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 16,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    closeBtn: {},
    closeBtnCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 0,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 16,
        letterSpacing: -0.2,
    },
    starsIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        marginBottom: 16,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
        paddingVertical: 4,
    },
    starBtn: {
        padding: 4,
    },
    ratingLabel: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 12,
        letterSpacing: -0.3,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 8,
    },
    tagBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    textInput: {
        height: 110,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        paddingTop: 14,
        fontSize: 15,
        textAlignVertical: 'top',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        borderTopWidth: 1,
    },
    submitBtn: {
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
    },
    submitBtnDisabled: {
        opacity: 0.7,
    },
    submitGradient: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row-reverse',
    },
    submitBtnText: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
});
