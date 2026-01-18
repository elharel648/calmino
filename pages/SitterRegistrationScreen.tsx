// pages/SitterRegistrationScreen.tsx - Minimalist Sitter Registration
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import {
    User, Camera, Clock, MapPin,
    ChevronLeft, ChevronRight, Check, Plus, Minus,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadSitterPhoto } from '../services/imageUploadService';

// Israeli cities for picker
const ISRAELI_CITIES = [
    'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון',
    'פתח תקווה', 'אשדוד', 'נתניה', 'חולון', 'בני ברק',
    'רמת גן', 'אשקלון', 'בת ים', 'הרצליה', 'כפר סבא',
    'רעננה', 'מודיעין', 'רחובות', 'לוד', 'רמלה',
    'נצרת', 'עכו', 'טבריה', 'אילת', 'קריית גת',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS_HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const SitterRegistrationScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const progressAnim = useRef(new Animated.Value(0.33)).current;

    // Current step (3 steps: Personal Info, Photo, Pricing)
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Personal info
    const [name, setName] = useState(auth.currentUser?.displayName || '');
    const [age, setAge] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [experienceYears, setExperienceYears] = useState(''); // Years of experience

    // Location
    const [city, setCity] = useState('');
    const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Step 3: Media
    const [profilePhoto, setProfilePhoto] = useState<string | null>(auth.currentUser?.photoURL || null);

    // Step 4: Pricing & Availability
    const [pricePerHour, setPricePerHour] = useState(50);
    const [availability, setAvailability] = useState<{ [key: number]: boolean }>({
        0: false, 1: true, 2: true, 3: true, 4: true, 5: false, 6: false
    });

    // Navigate between steps
    const goToStep = (step: number) => {
        if (step < 1 || step > 3) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStep(step);

        Animated.spring(progressAnim, {
            toValue: step / 3,
            useNativeDriver: false,
        }).start();
    };

    const nextStep = () => {
        if (validateCurrentStep()) {
            goToStep(currentStep + 1);
        }
    };

    const prevStep = () => goToStep(currentStep - 1);

    // Validation
    const validateCurrentStep = () => {
        switch (currentStep) {
            case 1:
                if (!name.trim() || !age || !phone.trim()) {
                    Alert.alert('שדות חובה', 'יש למלא שם, גיל וטלפון');
                    return false;
                }
                return true;
            case 2:
                if (!profilePhoto) {
                    Alert.alert('תמונה נדרשת', 'יש להעלות תמונת פרופיל');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    // Media handlers
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setProfilePhoto(result.assets[0].uri);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    // Toggle day availability
    const toggleDay = (dayIndex: number) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAvailability(prev => ({
            ...prev,
            [dayIndex]: !prev[dayIndex]
        }));
    };

    // Get GPS location
    const getLocation = async () => {
        setIsLoadingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('הרשאה נדרשת', 'יש לאשר גישה למיקום כדי שהורים יוכלו למצוא אותך');
                setIsLoadingLocation(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setGpsLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            if (__DEV__) console.error('Location error:', error);
            Alert.alert('שגיאה', 'לא ניתן לקבל מיקום');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Submit registration
    const handleSubmit = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert('שגיאה', 'יש להתחבר קודם');
            return;
        }

        // Validate city
        if (!city) {
            Alert.alert('שדה חובה', 'יש לבחור עיר');
            return;
        }

        setIsSubmitting(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            // Upload photo to Firebase Storage if user selected one
            let photoUrl = profilePhoto;
            if (profilePhoto && !profilePhoto.startsWith('http')) {
                // Local URI - need to upload
                try {
                    photoUrl = await uploadSitterPhoto(profilePhoto);
                    console.log('📸 Sitter photo uploaded:', photoUrl);
                } catch (uploadError) {
                    console.warn('⚠️ Failed to upload photo, continuing without:', uploadError);
                    photoUrl = null; // Don't save local URI
                }
            }

            await updateDoc(doc(db, 'users', userId), {
                isSitter: true,
                sitterActive: true,
                sitterPrice: pricePerHour,
                sitterBio: bio,
                sitterExperience: experienceYears ? `${experienceYears} שנות ניסיון` : null,
                sitterAvailability: Object.entries(availability)
                    .filter(([_, v]) => v)
                    .map(([k]) => parseInt(k)),
                sitterVerified: true, // Verified by app registration
                phone: phone,
                age: parseInt(age),
                displayName: name,
                // Location data
                sitterCity: city,
                sitterLocation: gpsLocation || null,
                // Photo URL (from Storage)
                photoUrl: photoUrl,
            });

            // Navigate directly to dashboard
            navigation.replace('SitterDashboard');
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לשמור, נסה שוב');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ========== STEP COMPONENTS (using useMemo to prevent recreation) ==========

    // Step 1: Personal Info - memoized to prevent input lag
    const PersonalInfoStep = useMemo(() => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <User size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>פרטים אישיים</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    ספר לנו קצת על עצמך
                </Text>
            </View>

            <View style={styles.inputsContainer}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>שם מלא *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="השם שלך"
                        placeholderTextColor={theme.textSecondary}
                        textAlign="right"
                    />
                </View>

                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>גיל *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                            value={age}
                            onChangeText={setAge}
                            placeholder="18+"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            textAlign="right"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 2 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>טלפון *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="050-1234567"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="phone-pad"
                            textAlign="right"
                        />
                    </View>
                </View>

                {/* Experience */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>שנות ניסיון</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        value={experienceYears}
                        onChangeText={setExperienceYears}
                        placeholder="כמה שנים של ניסיון עם ילדים?"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="numeric"
                        textAlign="right"
                    />
                </View>

                {/* City Picker */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>עיר *</Text>

                    {/* Text input for custom city */}
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border, marginBottom: 8 }]}
                        value={city}
                        onChangeText={setCity}
                        placeholder="הקלד עיר או בחר מהרשימה"
                        placeholderTextColor={theme.textSecondary}
                        textAlign="right"
                    />

                    {/* Popular cities chips */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.cityPickerScroll}
                        contentContainerStyle={styles.cityPickerContent}
                    >
                        {ISRAELI_CITIES.map((cityName) => (
                            <TouchableOpacity
                                key={cityName}
                                style={[
                                    styles.cityChip,
                                    {
                                        backgroundColor: city === cityName ? theme.textPrimary : theme.card,
                                        borderColor: city === cityName ? theme.textPrimary : theme.border,
                                    }
                                ]}
                                onPress={() => {
                                    setCity(cityName);
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                            >
                                <Text style={[
                                    styles.cityChipText,
                                    { color: city === cityName ? '#fff' : theme.textPrimary }
                                ]}>
                                    {cityName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* GPS Location Button */}
                <TouchableOpacity
                    style={[styles.locationBtn, { backgroundColor: gpsLocation ? '#E8F5E9' : theme.card, borderColor: gpsLocation ? '#4CAF50' : theme.border }]}
                    onPress={getLocation}
                    disabled={isLoadingLocation}
                >
                    {isLoadingLocation ? (
                        <ActivityIndicator size="small" color={theme.textPrimary} />
                    ) : (
                        <>
                            <MapPin size={20} color={gpsLocation ? '#4CAF50' : theme.textSecondary} />
                            <Text style={[styles.locationBtnText, { color: gpsLocation ? '#4CAF50' : theme.textPrimary }]}>
                                {gpsLocation ? 'מיקום נשמר ✓' : 'שתף מיקום GPS (מומלץ)'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>קצת עליך</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="ספר על הניסיון שלך, מה אתה אוהב לעשות עם ילדים..."
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        numberOfLines={4}
                        textAlign="right"
                    />
                </View>
            </View>
        </View>
    ), [name, age, phone, bio, city, gpsLocation, isLoadingLocation, experienceYears, theme]);

    // Step 2: Photo - memoized
    const PhotoStep = useMemo(() => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <Camera size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>תמונת פרופיל</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    העלה תמונה שתראה להורים
                </Text>
            </View>

            <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Camera size={40} color={theme.textSecondary} strokeWidth={1} />
                        <Text style={[styles.photoPlaceholderText, { color: theme.textSecondary }]}>הקש להעלאת תמונה</Text>
                    </View>
                )}
                {profilePhoto && (
                    <View style={styles.photoCheckmark}>
                        <Check size={20} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    ), [profilePhoto, pickImage, theme]);

    // Step 3: Pricing - memoized
    const PricingStep = useMemo(() => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <Clock size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>מחיר וזמינות</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    קבע את המחיר לשעה ואת הימים הפנויים
                </Text>
            </View>

            {/* Price */}
            <View style={[styles.priceCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>מחיר לשעה</Text>
                <View style={styles.priceRow}>
                    <TouchableOpacity
                        style={[styles.priceBtn, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => setPricePerHour(Math.max(30, pricePerHour - 5))}
                    >
                        <Minus size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.priceValue, { color: theme.textPrimary }]}>₪{pricePerHour}</Text>
                    <TouchableOpacity
                        style={[styles.priceBtn, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => setPricePerHour(pricePerHour + 5)}
                    >
                        <Plus size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Availability */}
            <View style={[styles.availabilityCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.availabilityLabel, { color: theme.textSecondary }]}>ימים פנויים</Text>
                <View style={styles.daysRow}>
                    {DAYS_HEB.map((day, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayBtn,
                                { backgroundColor: availability[index] ? theme.textPrimary : theme.cardSecondary }
                            ]}
                            onPress={() => toggleDay(index)}
                        >
                            <Text style={[
                                styles.dayBtnText,
                                { color: availability[index] ? theme.card : theme.textSecondary }
                            ]}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.cardSecondary }]}>
                <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>סיכום</Text>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>שם:</Text>
                    <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{name}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>מחיר:</Text>
                    <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>₪{pricePerHour}/שעה</Text>
                </View>
            </View>
        </View>
    ), [name, pricePerHour, availability, theme]);

    // Steps are now memoized and won't cause input lag

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronRight size={24} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הרשמה כסיטר</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { backgroundColor: theme.textPrimary },
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                    שלב {currentStep} מתוך 3
                </Text>
            </View>

            {/* Content */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {currentStep === 1 && PersonalInfoStep}
                    {currentStep === 2 && PhotoStep}
                    {currentStep === 3 && PricingStep}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                {currentStep > 1 && (
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: theme.border }]}
                        onPress={prevStep}
                    >
                        <ChevronRight size={18} color={theme.textSecondary} />
                        <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>חזרה</Text>
                    </TouchableOpacity>
                )}

                {currentStep < 3 ? (
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
                        onPress={nextStep}
                    >
                        <Text style={[styles.primaryBtnText, { color: theme.card }]}>המשך</Text>
                        <ChevronLeft size={18} color={theme.card} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={theme.card} />
                        ) : (
                            <Text style={[styles.primaryBtnText, { color: theme.card }]}>סיים הרשמה</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },

    // Progress
    progressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },

    // Content
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    stepContent: {
        gap: 24,
    },
    stepHeader: {
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    stepIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    stepSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },

    // Social
    socialButtons: {
        gap: 12,
    },
    socialBtn: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    socialBtnContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    socialBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    socialBtnConnected: {
        backgroundColor: '#374151',
        borderColor: '#374151',
    },
    socialBtnConnectedIG: {
        backgroundColor: '#374151',
        borderColor: '#374151',
    },

    // Info Box
    infoBox: {
        padding: 16,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Inputs
    inputsContainer: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    inputRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
    },
    input: {
        fontSize: 15,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Photo
    photoUpload: {
        alignSelf: 'center',
    },
    photoPlaceholder: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    photoPlaceholderText: {
        fontSize: 13,
    },
    photoPreview: {
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    photoCheckmark: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Pricing
    priceCard: {
        padding: 20,
        borderRadius: 14,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 13,
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    priceBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceValue: {
        fontSize: 36,
        fontWeight: '700',
    },

    // Availability
    availabilityCard: {
        padding: 20,
        borderRadius: 14,
    },
    availabilityLabel: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    daysRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 8,
    },
    dayBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Summary
    summaryCard: {
        padding: 16,
        borderRadius: 14,
    },
    summaryTitle: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 120 : 100,
        gap: 12,
        borderTopWidth: 1,
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    primaryBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },

    // City Picker styles
    cityPickerScroll: {
        marginTop: 8,
    },
    cityPickerContent: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 4,
        gap: 8,
    },
    cityChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    cityChipText: {
        fontSize: 14,
        fontWeight: '500',
    },

    // Location button styles
    locationBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 12,
        gap: 8,
    },
    locationBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

export default SitterRegistrationScreen;
