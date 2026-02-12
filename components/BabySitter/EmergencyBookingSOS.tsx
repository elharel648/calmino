/**
 * EmergencyBookingSOS - זרימת הזמנה חירום לבייביסיטר
 * Quick path: "I need help NOW" → Find available sitter in < 2 hours
 */

import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, AlertCircle, Clock, MapPin, Star, Phone } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { BlurView } from 'expo-blur';
import { auth } from '../../services/firebaseConfig';
import { searchBabysitters } from '../../services/babysitterService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onBookSitter: (sitterId: string) => void;
}

interface EmergencySitter {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    distance: number;
    availableIn: number; // minutes
    hourlyRate: number;
    photoUrl?: string;
}

export default function EmergencyBookingSOS({ visible, onClose, onBookSitter }: Props) {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [availableSitters, setAvailableSitters] = useState<EmergencySitter[]>([]);
    const [selectedSitter, setSelectedSitter] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            loadEmergencySitters();
        }
    }, [visible]);

    const loadEmergencySitters = async () => {
        setLoading(true);
        try {
            // TODO: Replace mock data with real search when you have user location
            // Example:
            // const result = await searchBabysitters(userLat, userLon, 5); // 5km radius
            // For now, using mock data:
            const result = [
                {
                    id: 'mock-sitter-1',
                    name: 'שרה כהן',
                    rating: 4.8,
                    reviewCount: 24,
                    distance: 1.2,
                    hourlyRate: 80,
                },
                {
                    id: 'mock-sitter-2',
                    name: 'מיכל לוי',
                    rating: 4.9,
                    reviewCount: 31,
                    distance: 2.5,
                    hourlyRate: 85,
                },
            ];

            // Transform to emergency sitter format
            const emergency: EmergencySitter[] = result.map((s: any) => ({
                id: s.id,
                name: s.name,
                rating: s.rating || 0,
                reviewCount: s.reviewCount || 0,
                distance: s.distance || 0,
                availableIn: Math.floor(Math.random() * 90) + 30, // Mock: 30-120 minutes
                hourlyRate: s.hourlyRate || 80,
                photoUrl: s.photoUrl,
            }));

            // Sort by availability (soonest first)
            emergency.sort((a, b) => a.availableIn - b.availableIn);

            setAvailableSitters(emergency.slice(0, 5)); // Top 5
        } catch (error) {
            console.error('Error loading emergency sitters:', error);
            Alert.alert('שגיאה', 'לא הצלחנו למצוא בייביסיטרים זמינים');
        } finally {
            setLoading(false);
        }
    };

    const handleBookNow = (sitterId: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onBookSitter(sitterId);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Header with urgency */}
                    <LinearGradient
                        colors={isDarkMode ? ['#991B1B', '#7F1D1D'] : ['#FEE2E2', '#FECACA']}
                        style={styles.headerGradient}
                    >
                        <BlurView
                            intensity={isDarkMode ? 30 : 15}
                            tint={isDarkMode ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.headerContent}>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={24} color={theme.textPrimary} />
                            </TouchableOpacity>
                            <View style={styles.headerIcon}>
                                <AlertCircle size={28} color="#DC2626" strokeWidth={2.5} />
                            </View>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>
                                צריכ/ה עזרה עכשיו?
                            </Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                בייביסיטרים זמינים בקרבתך
                            </Text>
                        </View>
                    </LinearGradient>

                    {/* Available sitters list */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                                מחפש בייביסיטרים זמינים...
                            </Text>
                        </View>
                    ) : availableSitters.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <AlertCircle size={48} color={theme.textTertiary} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                אין בייביסיטרים זמינים כרגע
                            </Text>
                            <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
                                נסה/י שוב בעוד כמה דקות
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            style={styles.sittersList}
                            showsVerticalScrollIndicator={false}
                        >
                            {availableSitters.map((sitter) => (
                                <TouchableOpacity
                                    key={sitter.id}
                                    style={[
                                        styles.sitterCard,
                                        {
                                            backgroundColor: isDarkMode
                                                ? 'rgba(255,255,255,0.05)'
                                                : '#F9FAFB',
                                            borderColor:
                                                selectedSitter === sitter.id
                                                    ? theme.primary
                                                    : 'transparent',
                                        },
                                    ]}
                                    onPress={() => setSelectedSitter(sitter.id)}
                                    activeOpacity={0.7}
                                >
                                    {/* Sitter info */}
                                    <View style={styles.sitterInfo}>
                                        <Text
                                            style={[
                                                styles.sitterName,
                                                { color: theme.textPrimary },
                                            ]}
                                        >
                                            {sitter.name}
                                        </Text>

                                        {/* Rating */}
                                        <View style={styles.ratingRow}>
                                            <Star
                                                size={14}
                                                color="#F59E0B"
                                                fill="#F59E0B"
                                            />
                                            <Text style={styles.ratingText}>
                                                {sitter.rating.toFixed(1)} ({sitter.reviewCount})
                                            </Text>
                                        </View>

                                        {/* Distance & Availability */}
                                        <View style={styles.metaRow}>
                                            <View style={styles.metaBadge}>
                                                <MapPin size={12} color="#6366F1" />
                                                <Text style={styles.metaText}>
                                                    {sitter.distance.toFixed(1)} ק"מ
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.metaBadge,
                                                    { backgroundColor: '#DCFCE7' },
                                                ]}
                                            >
                                                <Clock size={12} color="#16A34A" />
                                                <Text
                                                    style={[
                                                        styles.metaText,
                                                        { color: '#16A34A' },
                                                    ]}
                                                >
                                                    זמינ/ה בעוד {sitter.availableIn} דק'
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Book button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.bookBtn,
                                            { backgroundColor: theme.primary },
                                        ]}
                                        onPress={() => handleBookNow(sitter.id)}
                                    >
                                        <Text style={styles.bookBtnText}>הזמן/י עכשיו</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Help Text */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.textTertiary }]}>
                            💡 אנחנו מציגים רק בייביסיטרים שיכולים להגיע תוך שעתיים
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    headerGradient: {
        paddingTop: 20,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerContent: {
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 8,
        zIndex: 10,
    },
    headerIcon: {
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
    },
    loadingContainer: {
        padding: 60,
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
    },
    sittersList: {
        padding: 20,
    },
    sitterCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
    },
    sitterInfo: {
        marginBottom: 12,
    },
    sitterName: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    ratingText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366F1',
    },
    bookBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    bookBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        padding: 20,
        paddingTop: 0,
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});
