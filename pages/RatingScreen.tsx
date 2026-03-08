import React, { useState } from 'react';
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
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from '../context/ThemeContext';
import { Star, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { submitReview } from '../services/babysitterService';
import { auth } from '../services/firebaseConfig';
import { ReviewTag, REVIEW_TAG_LABELS } from '../types/babysitter';
import { logger } from '../utils/logger';

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

export default function RatingScreen({ route, navigation }: Props) {
    const tabBarHeight = useBottomTabBarHeight();
    const { bookingId, babysitterId, sitterName } = route.params;
    const { theme, isDarkMode } = useTheme();

    const [rating, setRating] = useState<number>(0);
    const [selectedTags, setSelectedTags] = useState<ReviewTag[]>([]);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTagToggle = (tag: ReviewTag) => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter((t) => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleRatingSelect = (selected: number) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRating(selected);
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert('שגיאה', 'אנא בחר/י דירוג של 1 עד 5 כוכבים.');
            return;
        }

        const parentId = auth.currentUser?.uid;
        if (!parentId) {
            Alert.alert('שגיאה', 'עליך להיות מחובר כדי לדרג.');
            return;
        }

        try {
            setIsSubmitting(true);
            await submitReview(bookingId, babysitterId, parentId, rating, selectedTags, text);

            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('תודה רבה!', 'הדירוג שלך נשמר בהצלחה ועוזר להורים אחרים.', [
                { text: 'סגור', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            logger.error('Submit review error:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בחיבור לשרת. נסה/י שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <X size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                    איך היה עם {sitterName || 'הבייביסיטר'}?
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 100 }]} showsVerticalScrollIndicator={false}>

                {/* Stars Section */}
                <View style={styles.starsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>דרג/י את החוויה הכללית</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity
                                key={star}
                                onPress={() => handleRatingSelect(star)}
                                style={styles.starBtn}
                            >
                                <Star
                                    size={40}
                                    color={star <= rating ? '#FBBF24' : (isDarkMode ? '#374151' : '#E5E7EB')}
                                    fill={star <= rating ? '#FBBF24' : 'transparent'}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tags Section */}
                {rating > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>מה אהבת במיוחד?</Text>
                        <View style={styles.tagsContainer}>
                            {AVAILABLE_TAGS.map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[
                                            styles.tagBtn,
                                            {
                                                backgroundColor: isSelected ? theme.primary : (isDarkMode ? '#374151' : '#F3F4F6'),
                                                borderColor: isSelected ? theme.primary : 'transparent',
                                            }
                                        ]}
                                        onPress={() => handleTagToggle(tag)}
                                    >
                                        <Text style={[
                                            styles.tagText,
                                            { color: isSelected ? '#fff' : theme.textPrimary }
                                        ]}>
                                            {REVIEW_TAG_LABELS[tag]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Text Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                        מילים חמות (אופציונלי)
                    </Text>
                    <TextInput
                        style={[styles.textInput, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                            borderColor: theme.border,
                            color: theme.textPrimary
                        }]}
                        placeholder="איך הייתה החוויה שלך? ספרי להורים אחרים..."
                        placeholderTextColor={theme.textTertiary}
                        multiline
                        textAlign="right"
                        maxLength={500}
                        value={text}
                        onChangeText={setText}
                    />
                </View>

            </ScrollView>

            {/* Footer Action */}
            <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: tabBarHeight + 16 }]}>
                <TouchableOpacity
                    style={[
                        styles.submitBtn,
                        { backgroundColor: rating > 0 ? theme.primary : (isDarkMode ? '#374151' : '#E5E7EB') }
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={[styles.submitBtnText, { color: rating > 0 ? '#fff' : theme.textTertiary }]}>
                            שמור דירוג
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 30,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'right',
    },
    starsContainer: {
        alignItems: 'center',
        marginVertical: 32,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    starBtn: {
        padding: 4,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: 10,
    },
    tagBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 14,
        fontWeight: '500',
    },
    textInput: {
        height: 120,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        paddingTop: 16,
        fontSize: 16,
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
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
