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
    Alert,
    ScrollView,
    TextInput,
} from 'react-native';
import { X, Star, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { logger } from '../../utils/logger';
import { containsInappropriateContent, hasNegativeSentiment } from '../../utils/moderation';

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    bookingId?: string; // Optional - not present for guest invite ratings
    babysitterId: string;
    babysitterName: string;
    onSuccess?: () => void;
}

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
    const [loading, setLoading] = useState(false);
    
    // Reset form when modal closes
    React.useEffect(() => {
        if (!visible) {
            setRating(0);
            setText('');
        }
    }, [visible]);
    
    // Check if text review is allowed
    // Only 5 stars can write text (not 4) - to prevent negative reviews with high rating
    const isVerified = bookingId && !bookingId.startsWith('guest_');
    const isPerfectRating = rating === 5; // Only 5 stars can write text
    const canAddText = isVerified && isPerfectRating;
    
    // Character limit
    const MAX_TEXT_LENGTH = 100;

    // Handle star press
    const handleStarPress = (value: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRating(value);
        // Clear text if rating is not 5 (text only allowed for 5 stars)
        if (value !== 5) {
            setText('');
        }
    };

    // Submit review
    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('שגיאה', 'יש לבחור דירוג');
            return;
        }

        // Validate text if provided
        const trimmedText = text.trim();
        if (trimmedText.length > 0) {
            // Check if text is allowed (only for verified 5-star reviews)
            if (!canAddText) {
                Alert.alert('שגיאה', 'תגובות טקסט אפשריות רק לביקורות מאומתות עם 5 כוכבים');
                return;
            }
            
            // Check for inappropriate content
            if (containsInappropriateContent(trimmedText)) {
                Alert.alert('שגיאה', 'התגובה מכילה תוכן לא הולם. אנא נסי שוב.');
                return;
            }
            
            // Check for negative sentiment (even with 5 stars)
            if (hasNegativeSentiment(trimmedText)) {
                Alert.alert(
                    'שגיאה', 
                    'נראה שהתגובה שלך שלילית. תגובות טקסט אפשריות רק לביקורות חיוביות. אם יש לך ביקורת, אנא צרי קשר עם התמיכה.'
                );
                return;
            }
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            // Create review with conditional text
            await addDoc(collection(db, 'reviews'), {
                bookingId: bookingId || null,
                parentId: user.uid,
                babysitterId,
                rating,
                // Only save text if: verified booking AND positive rating (4-5 stars)
                text: (canAddText && trimmedText.length > 0) ? trimmedText : null,
                tags: null, // No tags allowed
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
            const successMessage = trimmedText.length > 0 
                ? 'הדירוג והתגובה שלך נשמרו בהצלחה!'
                : 'הדירוג שלך נשמר.';
            Alert.alert(
                '⭐ תודה!',
                successMessage,
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

                    {/* Text Review - Only for verified positive reviews */}
                    {canAddText && (
                        <View style={styles.section}>
                            <View style={styles.textSectionHeader}>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                    כתבי ביקורת (אופציונלי)
                                </Text>
                                <View style={[styles.verifiedBadge, { backgroundColor: '#10B981' + '20' }]}>
                                    <Text style={[styles.verifiedBadgeText, { color: '#10B981' }]}>✓ מאומת</Text>
                                </View>
                            </View>
                            <TextInput
                                style={[
                                    styles.textInput, 
                                    { 
                                        backgroundColor: theme.card, 
                                        color: theme.textPrimary,
                                        borderColor: theme.border,
                                    }
                                ]}
                                placeholder="מה עוד היית רוצה לספר? (עד 100 תווים)"
                                placeholderTextColor={theme.textSecondary}
                                value={text}
                                onChangeText={(newText) => {
                                    if (newText.length <= MAX_TEXT_LENGTH) {
                                        setText(newText);
                                    }
                                }}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                maxLength={MAX_TEXT_LENGTH}
                            />
                            <View style={styles.charCounter}>
                                <Text style={[styles.charCounterText, { 
                                    color: text.length >= MAX_TEXT_LENGTH ? theme.danger : theme.textSecondary 
                                }]}>
                                    {text.length}/{MAX_TEXT_LENGTH}
                                </Text>
                            </View>
                            {text.length > 0 && (
                                <>
                                    {containsInappropriateContent(text) && (
                                        <View style={[styles.warningBox, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}>
                                            <AlertCircle size={16} color={theme.danger} />
                                            <Text style={[styles.warningText, { color: theme.danger }]}>
                                                התגובה מכילה תוכן לא הולם
                                            </Text>
                                        </View>
                                    )}
                                    {hasNegativeSentiment(text) && (
                                        <View style={[styles.warningBox, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}>
                                            <AlertCircle size={16} color={theme.danger} />
                                            <Text style={[styles.warningText, { color: theme.danger }]}>
                                                התגובה נראית שלילית. תגובות טקסט אפשריות רק לביקורות חיוביות
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {/* Info message for non-verified or non-5-star reviews */}
                    {rating > 0 && !canAddText && (
                        <View style={[styles.infoBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                                {!isVerified 
                                    ? '💡 תגובות טקסט אפשריות רק לביקורות מאומתות (אחרי הזמנה שהושלמה)'
                                    : rating !== 5
                                    ? '💡 תגובות טקסט אפשריות רק לביקורות עם 5 כוכבים'
                                    : ''
                                }
                            </Text>
                        </View>
                    )}

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
    textSectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    verifiedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    textInput: {
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        minHeight: 80,
        textAlign: 'right',
        borderWidth: 1,
    },
    charCounter: {
        alignItems: 'flex-end',
        marginTop: 6,
    },
    charCounterText: {
        fontSize: 12,
        fontWeight: '500',
    },
    warningBox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
    },
    warningText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    infoBox: {
        padding: 14,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 18,
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
