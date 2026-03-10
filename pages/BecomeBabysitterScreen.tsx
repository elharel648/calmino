/**
 * BecomeBabysitterScreen - מסך הצטרפות כבייביסיטר
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Baby, Clock, MapPin, Wallet, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { AgeRange, Certification } from '../types/babysitter';
import { logger } from '../utils/logger';

const AGE_RANGES: { value: AgeRange; label: string }[] = [
    { value: '0-1', label: '0-1 שנה' },
    { value: '1-3', label: '1-3 שנים' },
    { value: '3-6', label: '3-6 שנים' },
    { value: '6+', label: '6+ שנים' },
];

const CERTIFICATIONS: { value: Certification; label: string; icon: string }[] = [
    { value: 'cpr', label: 'החייאה', icon: '🫀' },
    { value: 'first_aid', label: 'עזרה ראשונה', icon: '🩹' },
    { value: 'education', label: 'לימודי חינוך', icon: '📚' },
    { value: 'nursing', label: 'סיעוד', icon: '💉' },
    { value: 'special_needs', label: 'חינוך מיוחד', icon: '🌟' },
];

const BecomeBabysitterScreen = () => {
    const navigation = useNavigation();
    const { t } = useLanguage();
    const { theme } = useTheme();

    // Form state
    const [hourlyRate, setHourlyRate] = useState('65');
    const [radius, setRadius] = useState('10');
    const [bio, setBio] = useState('');
    const [selectedAges, setSelectedAges] = useState<AgeRange[]>([]);
    const [selectedCerts, setSelectedCerts] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(false);

    // Toggle age selection
    const toggleAge = useCallback((age: AgeRange) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAges(prev =>
            prev.includes(age)
                ? prev.filter(a => a !== age)
                : [...prev, age]
        );
    }, []);

    // Toggle certification selection
    const toggleCert = useCallback((cert: Certification) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCerts(prev =>
            prev.includes(cert)
                ? prev.filter(c => c !== cert)
                : [...prev, cert]
        );
    }, []);

    // Submit handler
    const handleSubmit = async () => {
        if (selectedAges.length === 0) {
            Alert.alert('שגיאה', 'יש לבחור לפחות טווח גילאים אחד');
            return;
        }

        if (!hourlyRate || parseInt(hourlyRate) < 30) {
            Alert.alert('שגיאה', 'יש להזין מחיר לשעה (מינימום ₪30)');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not logged in');

            // 🌍 Capture GPS location + city for distance calculations
            let location: { latitude: number; longitude: number } | null = null;
            let sitterCity: string | null = null;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const currentLocation = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });

                    // Validate coordinates
                    if (currentLocation?.coords &&
                        typeof currentLocation.coords.latitude === 'number' &&
                        typeof currentLocation.coords.longitude === 'number' &&
                        !isNaN(currentLocation.coords.latitude) &&
                        !isNaN(currentLocation.coords.longitude) &&
                        currentLocation.coords.latitude >= -90 && currentLocation.coords.latitude <= 90 &&
                        currentLocation.coords.longitude >= -180 && currentLocation.coords.longitude <= 180) {
                        location = {
                            latitude: currentLocation.coords.latitude,
                            longitude: currentLocation.coords.longitude,
                        };
                        logger.log('📍 Captured babysitter location:', location);

                        // Reverse geocode to get city name
                        try {
                            const addresses = await Location.reverseGeocodeAsync(location);
                            if (addresses && addresses.length > 0) {
                                const addr = addresses[0];
                                sitterCity = addr?.city || addr?.subregion || addr?.region || null;
                                logger.log('🏙️ Detected city:', sitterCity);
                            }
                        } catch (geocodeError) {
                            logger.warn('⚠️ Reverse geocode failed:', geocodeError);
                        }
                    }
                } else {
                    logger.warn('⚠️ Location permission denied');
                }
            } catch (locationError) {
                logger.warn('⚠️ Could not get location:', locationError);
            }

            await updateDoc(doc(db, 'users', user.uid), {
                isBabysitter: true,
                isSitter: true,
                sitterActive: true,
                ...(location && { sitterLocation: location }),
                ...(sitterCity && { sitterCity }),
                babysitterProfile: {
                    isActive: true,
                    hourlyRate: parseInt(hourlyRate),
                    ageRanges: selectedAges,
                    radius: parseInt(radius),
                    bio: bio.trim(),
                    certifications: selectedCerts,
                    location: location, // 📍 Save GPS location
                    responseTimeMinutes: 0,
                    completedShifts: 0,
                    repeatFamilies: 0,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                },
            });

            // Also create/update sitters collection for search
            await updateDoc(doc(db, 'sitters', user.uid), {
                userId: user.uid,
                isActive: true,
                hourlyRate: parseInt(hourlyRate),
                ageRanges: selectedAges,
                radius: parseInt(radius),
                bio: bio.trim(),
                certifications: selectedCerts,
                location: location, // 📍 Save GPS location
                updatedAt: serverTimestamp(),
            }).catch(() => {
                // If doc doesn't exist, will create via setDoc in future
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                '🎉 ברוכה הבאה!',
                'נרשמת בהצלחה כבייביסיטר. הפרופיל שלך נוצר ומשפחות יוכלו למצוא אותך.',
                [{ text: 'מעולה', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            logger.error('Error becoming babysitter:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בשמירת הפרופיל. נסי שוב.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                    הצטרפי כבייביסיטר
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Intro Card */}
                    <View style={[styles.introCard, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={styles.introEmoji}>👶</Text>
                        <Text style={styles.introTitle}>הפכי לבייביסיטר מבוקשת!</Text>
                        <Text style={styles.introText}>
                            מלאי את הפרטים ומשפחות באזורך יוכלו למצוא אותך
                        </Text>
                    </View>

                    {/* Section: Age Ranges */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Baby size={20} color="#6366F1" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                גילאים שאני שומרת
                            </Text>
                        </View>
                        <View style={styles.chipsRow}>
                            {AGE_RANGES.map(age => (
                                <TouchableOpacity
                                    key={age.value}
                                    style={[
                                        styles.chip,
                                        selectedAges.includes(age.value) && styles.chipSelected
                                    ]}
                                    onPress={() => toggleAge(age.value)}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedAges.includes(age.value) && styles.chipTextSelected
                                    ]}>
                                        {age.label}
                                    </Text>
                                    {selectedAges.includes(age.value) && (
                                        <Check size={14} color="#fff" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Section: Hourly Rate */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Wallet size={20} color="#10B981" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                מחיר לשעה
                            </Text>
                        </View>
                        <View style={[styles.inputRow, { backgroundColor: theme.card }]}>
                            <Text style={styles.inputPrefix}>₪</Text>
                            <TextInput
                                style={[styles.input, { color: theme.textPrimary }]}
                                value={hourlyRate}
                                onChangeText={setHourlyRate}
                                keyboardType="numeric"
                                placeholder="65"
                                placeholderTextColor={theme.textSecondary}
                            />
                            <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>
                                לשעה
                            </Text>
                        </View>
                    </View>

                    {/* Section: Radius */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MapPin size={20} color="#F59E0B" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                טווח שירות
                            </Text>
                        </View>
                        <View style={[styles.inputRow, { backgroundColor: theme.card }]}>
                            <TextInput
                                style={[styles.input, { color: theme.textPrimary }]}
                                value={radius}
                                onChangeText={setRadius}
                                keyboardType="numeric"
                                placeholder="10"
                                placeholderTextColor={theme.textSecondary}
                            />
                            <Text style={[styles.inputSuffix, { color: theme.textSecondary }]}>
                                ק"מ מהבית
                            </Text>
                        </View>
                    </View>

                    {/* Section: Certifications */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Award size={20} color="#8B5CF6" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                הסמכות (אופציונלי)
                            </Text>
                        </View>
                        <View style={styles.chipsRow}>
                            {CERTIFICATIONS.map(cert => (
                                <TouchableOpacity
                                    key={cert.value}
                                    style={[
                                        styles.chip,
                                        selectedCerts.includes(cert.value) && styles.chipSelectedPurple
                                    ]}
                                    onPress={() => toggleCert(cert.value)}
                                >
                                    <Text style={styles.chipEmoji}>{cert.icon}</Text>
                                    <Text style={[
                                        styles.chipText,
                                        selectedCerts.includes(cert.value) && styles.chipTextSelected
                                    ]}>
                                        {cert.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Section: Bio */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={20} color="#EC4899" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                קצת עליי
                            </Text>
                        </View>
                        <TextInput
                            style={[styles.textArea, { backgroundColor: theme.card, color: theme.textPrimary }]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="ספרי קצת על עצמך, הניסיון שלך ומה את אוהבת לעשות עם ילדים..."
                            placeholderTextColor={theme.textSecondary}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Text style={styles.submitBtnText}>
                            {loading ? 'שומר...' : '✨ הצטרפי עכשיו'}
                        </Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
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
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    introCard: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    introEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    introTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#4338CA',
        marginBottom: 8,
    },
    introText: {
        fontSize: 14,
        color: '#6366F1',
        textAlign: 'center',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    chipsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
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
    chipSelected: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    chipSelectedPurple: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    chipTextSelected: {
        color: '#fff',
    },
    chipEmoji: {
        fontSize: 16,
    },
    inputRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 8,
    },
    inputPrefix: {
        fontSize: 20,
        fontWeight: '700',
        color: '#10B981',
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'right',
    },
    inputSuffix: {
        fontSize: 14,
    },
    textArea: {
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        minHeight: 100,
        textAlign: 'right',
    },
    submitBtn: {
        backgroundColor: '#6366F1',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default BecomeBabysitterScreen;
