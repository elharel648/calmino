/**
 * RatingModal - מודל דירוג בייביסיטר (Centered Glass Popup)
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { X, Star, AlertCircle, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, increment } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { logger } from '../../utils/logger';
import { containsInappropriateContent, hasNegativeSentiment } from '../../utils/moderation';
import { BlurView } from 'expo-blur';

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    bookingId?: string;
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
    const { theme, isDarkMode } = useTheme();
    const [rating, setRating] = useState(0);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset form when modal closes
    useEffect(() => {
        if (!visible) {
            setRating(0);
            setText('');
        }
    }, [visible]);

    const isVerified = bookingId && !bookingId.startsWith('guest_');
    const isPerfectRating = rating === 5;
    const canAddText = isVerified && isPerfectRating;
    const MAX_TEXT_LENGTH = 100;

    const handleStarPress = (value: number) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRating(value);
        if (value !== 5) setText('');
    };

    const handleSubmit = async () => {
        if (rating === 0) return;

        // Validation for verified text reviews
        const trimmedText = text.trim();
        if (trimmedText.length > 0) {
            if (!canAddText) {
                Alert.alert('שגיאה', 'תגובות בכתב אפשריות רק לדירוג 5 כוכבים');
                return;
            }
            if (containsInappropriateContent(trimmedText)) {
                Alert.alert('תוכן לא הולם', 'אנא בדקי את הניסוח ונסה שוב');
                return;
            }
            if (hasNegativeSentiment(trimmedText)) {
                Alert.alert('שגיאה', 'תגובות טקסט מיועדות לפרגון בלבד. לבעיות אנא פני לתמיכה.');
                return;
            }
        }

        setLoading(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            // Save review
            await addDoc(collection(db, 'reviews'), {
                bookingId: bookingId || null,
                parentId: user.uid,
                babysitterId,
                rating,
                text: (canAddText && trimmedText.length > 0) ? trimmedText : null,
                tags: null,
                isVerified: isVerified || false,
                helpfulCount: 0,
                helpfulBy: [],
                createdAt: serverTimestamp(),
            });

            // Update booking status
            if (bookingId && !bookingId.startsWith('guest_')) {
                await updateDoc(doc(db, 'bookings', bookingId), {
                    rated: true,
                    ratedAt: serverTimestamp(),
                });
            }

            // Update sitter aggregation
            try {
                const sitterDoc = await getDoc(doc(db, 'users', babysitterId));
                if (sitterDoc.exists()) {
                    const data = sitterDoc.data();
                    const currentRating = data.sitterRating || 0;
                    const currentCount = data.sitterReviewCount || 0;
                    const newCount = currentCount + 1;
                    const newAverage = ((currentRating * currentCount) + rating) / newCount;

                    await updateDoc(doc(db, 'users', babysitterId), {
                        sitterRating: Math.round(newAverage * 10) / 10,
                        sitterReviewCount: increment(1),
                    });
                }
            } catch (e) {
                logger.warn('Failed to update sitter aggregated rating', e);
            }

            // Success UI
            onClose();
            onSuccess?.();

        } catch (error) {
            logger.error('Rating submit error:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לשמור את הדירוג');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <BlurView
                        intensity={20}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <View style={[styles.modalCard, {
                            backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        }]}>

                            {/* Close Button */}
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <X size={20} color={theme.textSecondary} />
                            </TouchableOpacity>

                            {/* Header */}
                            <View style={styles.headerContent}>
                                <Text style={[styles.title, { color: theme.textPrimary }]}>
                                    דרגי את {babysitterName}
                                </Text>
                                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                    איך היה הבייביסיטר?
                                </Text>
                            </View>

                            {/* Stars */}
                            <View style={styles.starsContainer}>
                                <View style={styles.starsRow}>
                                    {[1, 2, 3, 4, 5].map(value => (
                                        <TouchableOpacity
                                            key={value}
                                            onPress={() => handleStarPress(value)}
                                            activeOpacity={0.7}
                                            style={styles.starBtn}
                                        >
                                            <Star
                                                size={36}
                                                color={value <= rating ? '#FBBF24' : (isDarkMode ? '#333' : '#E5E7EB')}
                                                fill={value <= rating ? '#FBBF24' : 'transparent'}
                                                strokeWidth={2}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={[styles.ratingLabel, { color: theme.primary }]}>
                                    {rating === 1 && 'לא טוב'}
                                    {rating === 2 && 'סביר'}
                                    {rating === 3 && 'בסדר'}
                                    {rating === 4 && 'טוב'}
                                    {rating === 5 && 'מצוין!'}
                                    {rating === 0 && ' '}
                                </Text>
                            </View>

                            {/* Optional Text Input */}
                            {canAddText && (
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[styles.input, {
                                            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                                            color: theme.textPrimary
                                        }]}
                                        placeholder="איך היה? (אופציונלי)"
                                        placeholderTextColor={theme.textTertiary}
                                        multiline
                                        maxLength={MAX_TEXT_LENGTH}
                                        value={text}
                                        onChangeText={setText}
                                    />
                                    <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                                        {text.length}/{MAX_TEXT_LENGTH}
                                    </Text>
                                </View>
                            )}

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.submitBtn,
                                    { backgroundColor: theme.primary },
                                    (rating === 0 || loading) && styles.submitBtnDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={rating === 0 || loading}
                            >
                                {loading ? (
                                    <Text style={styles.submitBtnText}>שומר...</Text>
                                ) : (
                                    <View style={styles.btnContent}>
                                        <Check size={18} color="#fff" strokeWidth={2.5} />
                                        <Text style={styles.submitBtnText}>שלחי דירוג</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)', // Dimmed background
    },
    keyboardView: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCard: {
        width: '85%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 3,
        borderWidth: 1,
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    headerContent: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    starsContainer: {
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 8,
    },
    starBtn: {
        padding: 4,
    },
    ratingLabel: {
        height: 20,
        fontSize: 14,
        fontWeight: '600',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    input: {
        width: '100%',
        height: 80,
        borderRadius: 16,
        padding: 12,
        textAlign: 'right',
        textAlignVertical: 'top',
        fontSize: 14,
    },
    charCount: {
        fontSize: 11,
        textAlign: 'left', // LTR for numbers looks better usually, or 'right' if strict Hebrew
        marginTop: 4,
        marginRight: 4,
    },
    submitBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default RatingModal;
