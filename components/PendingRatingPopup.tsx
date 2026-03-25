import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Platform,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Star, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { query, collection, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import { BabysitterBooking } from '../types/babysitter';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLanguage } from '../context/LanguageContext';

export default function PendingRatingPopup() {
    const { t } = useLanguage();
    const { theme, isDarkMode } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();

    const [isVisible, setIsVisible] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<BabysitterBooking | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkPendingRatings();
    }, []);

    const checkPendingRatings = async () => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            // Find completed bookings where isRated is false or doesn't exist
            const q = query(
                collection(db, 'bookings'),
                where('parentId', '==', userId),
                where('status', '==', 'completed'),
                orderBy('actualEnd', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const bookingData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BabysitterBooking;

                // If it's not rated, show popup
                if (!bookingData.isRated) {
                    setPendingBooking(bookingData);
                    // Slight delay to allow screen to render before showing modal
                    setTimeout(() => {
                        setIsVisible(true);
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error checking pending ratings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRateNow = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsVisible(false);

        if (pendingBooking) {
            navigation.navigate('Babysitter', {
                screen: 'RatingScreen',
                params: {
                    bookingId: pendingBooking.id,
                    babysitterId: pendingBooking.babysitterId,
                    sitterName: pendingBooking.sitterName
                }
            });
        }
    };

    const handleDismiss = () => {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        setIsVisible(false);
        // We do not mark it as rated here. They will be prompted again next time they load the app/component.
        // If we want to prevent nagging, we could save a 'dismissedAt' local state.
    };

    if (loading || !pendingBooking) return null;

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleDismiss}
        >
            <View style={styles.overlay}>
                <View style={[styles.popupContainer, { backgroundColor: theme.card, shadowColor: isDarkMode ? '#000' : '#d1d5db' }]}>
                    <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
                        <X size={20} color={theme.textTertiary} />
                    </TouchableOpacity>

                    <View style={styles.iconContainer}>
                        <Star size={36} color="#FBBF24" fill="#FBBF24" />
                    </View>

                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        איך היה עם {pendingBooking.sitterName || 'הבייביסיטר'}?
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        ראינו שנעזרת בבייביסיטר לאחרונה, נשמח לדירוג כדי לעזור להורים אחרים ⭐️
                    </Text>

                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                        onPress={handleRateNow}
                    >
                        <Text style={styles.primaryBtnText}>דרג/י עכשיו</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={handleDismiss}
                    >
                        <Text style={[styles.secondaryBtnText, { color: theme.textTertiary }]}>
                            אולי בפעם אחרת
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    popupContainer: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 0,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        padding: 8,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FEF3C7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    primaryBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        width: '100%',
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
