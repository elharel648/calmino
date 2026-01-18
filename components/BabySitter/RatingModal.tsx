/**
 * RatingModal - מודל דירוג בייביסיטר
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { X, Star, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { ReviewTag, REVIEW_TAG_LABELS } from '../../types/babysitter';
import { logger } from '../../utils/logger';

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    bookingId?: string; // Optional - not present for guest invite ratings
    babysitterId: string;
    babysitterName: string;
    onSuccess?: () => void;
}

const TAGS: ReviewTag[] = [
    'reliable',
    'punctual',
    'great_with_babies',
    'great_with_toddlers',
    'kids_loved_her',
    'clean_organized',
    'flexible',
    'professional',
];

const RatingModal: React.FC<RatingModalProps> = ({
    visible,
    onClose,
    bookingId,
    babysitterId,
    babysitterName,
    onSuccess,
}) => {
    const { theme } = useTheme();
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [selectedTags, setSelectedTags] = useState<ReviewTag[]>([]);
    const [loading, setLoading] = useState(false);
    const [categoryRatings, setCategoryRatings] = useState<{
        reliability?: number;
        professionalism?: number;
        kidsInteraction?: number;
        cleanliness?: number;
    }>({});

    // Toggle tag selection
    const toggleTag = useCallback((tag: ReviewTag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    }, []);

    // Handle star press
    const handleStarPress = (value: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRating(value);
    };

    // Submit review
    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('שגיאה', 'יש לבחור דירוג');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            // Check if this is a verified review (has real booking)
            const isVerified = bookingId && !bookingId.startsWith('guest_');

            // Create review
            await addDoc(collection(db, 'reviews'), {
                bookingId: bookingId || null,
                parentId: user.uid,
                babysitterId,
                rating,
                text: text.trim() || null,
                tags: selectedTags.length > 0 ? selectedTags : null,
                isVerified: isVerified || false,
                helpfulCount: 0,
                helpfulBy: [],
                createdAt: serverTimestamp(),
            });

            // Mark booking as rated (only if this is a real booking, not a guest invite)
            if (bookingId && !bookingId.startsWith('guest_')) {
                await updateDoc(doc(db, 'bookings', bookingId), {
                    rated: true,
                    ratedAt: serverTimestamp(),
                });
            }

            // Update babysitter's average rating
            try {
                const sitterDoc = await getDoc(doc(db, 'users', babysitterId));
                if (sitterDoc.exists()) {
                    const sitterData = sitterDoc.data();
                    const currentRating = sitterData.sitterRating || 0;
                    const currentCount = sitterData.sitterReviewCount || 0;

                    // Calculate new average: (oldAvg * oldCount + newRating) / newCount
                    const newCount = currentCount + 1;
                    const newAverage = ((currentRating * currentCount) + rating) / newCount;

                    await updateDoc(doc(db, 'users', babysitterId), {
                        sitterRating: Math.round(newAverage * 10) / 10, // Round to 1 decimal
                        sitterReviewCount: increment(1),
                    });
                    logger.debug('✅', 'Rating updated: new average =', newAverage.toFixed(1));
                }
            } catch (ratingError) {
                logger.warn('⚠️ Could not update sitter rating:', ratingError);
                // Don't fail the whole submission if rating update fails
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                '⭐ תודה!',
                `הדירוג שלך נשמר. זה עוזר להורים אחרים לבחור.`,
                [{ text: 'סגור', onPress: () => { onClose(); onSuccess?.(); } }]
            );
        } catch (error) {
            logger.error('Rating error:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את הדירוג');
        } finally {
            setLoading(false);
        }
    };

    // Render stars
    const renderStars = () => {
        return (
            <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(value => (
                    <TouchableOpacity
                        key={value}
                        onPress={() => handleStarPress(value)}
                        style={styles.starBtn}
                    >
                        <Star
                            size={40}
                            color={value <= rating ? '#FBBF24' : '#E5E7EB'}
                            fill={value <= rating ? '#FBBF24' : 'transparent'}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        דרגי את {babysitterName}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Emoji Header */}
                    <View style={styles.emojiHeader}>
                        <Text style={styles.emoji}>⭐</Text>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            איך היה?
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            הדירוג שלך עוזר להורים אחרים לבחור
                        </Text>
                    </View>

                    {/* Stars */}
                    <View style={styles.section}>
                        {renderStars()}
                        <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
                            {rating === 0 && 'לחצי על הכוכבים'}
                            {rating === 1 && 'גרוע 😞'}
                            {rating === 2 && 'לא טוב 😐'}
                            {rating === 3 && 'בסדר 🙂'}
                            {rating === 4 && 'טוב מאוד 😊'}
                            {rating === 5 && 'מעולה! 🤩'}
                        </Text>
                    </View>

                    {/* Category Ratings */}
                    {rating > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                דירוג לפי קטגוריות (אופציונלי)
                            </Text>
                            {[
                                { key: 'reliability', label: 'אמינות' },
                                { key: 'professionalism', label: 'מקצועיות' },
                                { key: 'kidsInteraction', label: 'יחס לילדים' },
                                { key: 'cleanliness', label: 'נקיון' },
                            ].map(({ key, label }) => (
                                <View key={key} style={styles.categoryRow}>
                                    <Text style={[styles.categoryLabel, { color: theme.textPrimary }]}>{label}</Text>
                                    <View style={styles.categoryStars}>
                                        {[1, 2, 3, 4, 5].map(value => (
                                            <TouchableOpacity
                                                key={value}
                                                onPress={() => {
                                                    setCategoryRatings(prev => ({
                                                        ...prev,
                                                        [key]: value,
                                                    }));
                                                }}
                                                style={styles.categoryStarBtn}
                                            >
                                                <Star
                                                    size={24}
                                                    color={value <= (categoryRatings[key as keyof typeof categoryRatings] || 0) ? '#FBBF24' : '#E5E7EB'}
                                                    fill={value <= (categoryRatings[key as keyof typeof categoryRatings] || 0) ? '#FBBF24' : 'transparent'}
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Quick Tags */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                            מה מיוחד? (אופציונלי)
                        </Text>
                        <View style={styles.tagsGrid}>
                            {TAGS.map(tag => (
                                <TouchableOpacity
                                    key={tag}
                                    style={[
                                        styles.tag,
                                        selectedTags.includes(tag) && styles.tagSelected
                                    ]}
                                    onPress={() => toggleTag(tag)}
                                >
                                    {selectedTags.includes(tag) && (
                                        <Check size={14} color="#fff" />
                                    )}
                                    <Text style={[
                                        styles.tagText,
                                        selectedTags.includes(tag) && styles.tagTextSelected
                                    ]}>
                                        {REVIEW_TAG_LABELS[tag]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Text Review */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                            כתבי ביקורת (אופציונלי)
                        </Text>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                            placeholder="מה עוד היית רוצה לספר?"
                            placeholderTextColor={theme.textSecondary}
                            value={text}
                            onChangeText={setText}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>

                {/* Submit Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            rating === 0 && styles.submitBtnDisabled,
                            loading && styles.submitBtnDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={rating === 0 || loading}
                    >
                        <Text style={styles.submitBtnText}>
                            {loading ? 'שומר...' : '⭐ שלחי דירוג'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
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
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    emojiHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    emoji: {
        fontSize: 56,
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 14,
        textAlign: 'right',
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    starBtn: {
        padding: 4,
    },
    ratingLabel: {
        textAlign: 'center',
        marginTop: 12,
        fontSize: 16,
        fontWeight: '500',
    },
    tagsGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tagSelected: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
    },
    tagTextSelected: {
        color: '#fff',
    },
    categoryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 8,
    },
    categoryLabel: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    categoryStars: {
        flexDirection: 'row-reverse',
        gap: 4,
    },
    categoryStarBtn: {
        padding: 2,
    },
    textInput: {
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        minHeight: 100,
        textAlign: 'right',
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    submitBtn: {
        backgroundColor: '#FBBF24',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: '#1F2937',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default RatingModal;
