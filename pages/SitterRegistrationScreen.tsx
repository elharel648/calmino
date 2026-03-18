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
    ChevronLeft, ChevronRight, Check, Plus, Minus, Search,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadSitterPhoto } from '../services/imageUploadService';
import { ISRAELI_CITIES } from '../constants/israeliCities';
import { logger } from '../utils/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');



const SitterRegistrationScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const progressAnim = useRef(new Animated.Value(0.33)).current;

    // Current step (2 steps: Personal Info, Photo)
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Personal info
    const [name, setName] = useState(auth.currentUser?.displayName || '');
    const [age, setAge] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');
    const [experienceYears, setExperienceYears] = useState(''); // Years of experience
    const [pricePerHour, setPricePerHour] = useState(''); // Hourly rate in NIS

    // Location
    const [city, setCity] = useState('');
    const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Step 3: Media
    const [profilePhoto, setProfilePhoto] = useState<string | null>(auth.currentUser?.photoURL || null);

    // Availability (keeping for future use)
    const [availability, setAvailability] = useState<{ [key: number]: boolean }>({
        0: false, 1: true, 2: true, 3: true, 4: true, 5: false, 6: false
    });

    // Navigate between steps
    const goToStep = (step: number) => {
        if (step < 1 || step > 2) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStep(step);

        Animated.spring(progressAnim, {
            toValue: step / 2,
            useNativeDriver: false,
        }).start();
    };

    const nextStep = () => {
        if (validateCurrentStep()) {
            goToStep(currentStep + 1);
        }
    };

    const prevStep = () => goToStep(currentStep - 1);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (autocompleteTimeoutRef.current) {
                clearTimeout(autocompleteTimeoutRef.current);
            }
        };
    }, []);

    // Auto-capture GPS on mount for accurate distance calculations
    useEffect(() => {
        const captureLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                setIsLoadingLocation(true);
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                if (
                    loc?.coords &&
                    typeof loc.coords.latitude === 'number' &&
                    typeof loc.coords.longitude === 'number' &&
                    !isNaN(loc.coords.latitude) &&
                    !isNaN(loc.coords.longitude)
                ) {
                    setGpsLocation({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                    });

                    // Reverse geocode to auto-fill city
                    try {
                        const addresses = await Location.reverseGeocodeAsync({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                        });
                        if (addresses && addresses.length > 0) {
                            const detectedCity = addresses[0]?.city || addresses[0]?.subregion || addresses[0]?.region;
                            if (detectedCity && typeof detectedCity === 'string') {
                                setCity(detectedCity);
                            }
                        }
                    } catch (geocodeError) {
                        logger.debug('Reverse geocode failed:', geocodeError);
                    }
                }
            } catch (e) {
                logger.debug('Auto-capture location failed:', e);
            } finally {
                setIsLoadingLocation(false);
            }
        };
        captureLocation();
    }, []);

    // Validation
    const validateCurrentStep = () => {
        switch (currentStep) {
            case 1:
                if (!name.trim() || !age || !phone.trim()) {
                    Alert.alert(t('sitter.registration.requiredFields'), t('sitter.registration.fillRequiredFields'));
                    return false;
                }
                // Basic phone validation - just check it's not empty
                if (phone.trim().length < 9) {
                    Alert.alert(t('common.error'), t('sitterReg.phoneMinDigits'));
                    return false;
                }
                return true;
            case 2:
                if (!profilePhoto) {
                    Alert.alert(t('sitter.registration.photoRequired'), t('sitter.registration.uploadPhoto'));
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
                Alert.alert(t('sitter.locationPermissionRequired'), t('sitter.locationPermissionMessage'));
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

            // Reverse geocode to auto-fill city
            try {
                const addresses = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
                if (addresses && addresses.length > 0) {
                    const detectedCity = addresses[0]?.city || addresses[0]?.subregion || addresses[0]?.region;
                    if (detectedCity && typeof detectedCity === 'string') {
                        setCity(detectedCity);
                    }
                }
            } catch (geocodeError) {
                logger.debug('Reverse geocode failed:', geocodeError);
            }

            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            logger.error('Location error:', error);
            Alert.alert(t('common.error'), t('sitter.registration.locationError'));
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Submit registration
    const handleSubmit = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert(t('common.error'), t('sitter.registration.loginRequired'));
            return;
        }

        // Validate city
        if (!city) {
            Alert.alert(t('sitter.registration.cityRequired'), t('sitter.registration.selectCity'));
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
                    logger.debug('📸', 'Sitter photo uploaded:', photoUrl);
                } catch (uploadError) {
                    logger.warn('Failed to upload photo, continuing without:', uploadError);
                    photoUrl = null; // Don't save local URI
                }
            }

            await updateDoc(doc(db, 'users', userId), {
                isSitter: true,
                sitterActive: true,
                sitterAvailable: true, // Set available status for badge
                sitterBio: bio,
                sitterExperience: experienceYears ? `${experienceYears} ${t('sitterReg.yearsOfExperience')}` : null,
                sitterPrice: pricePerHour ? parseInt(pricePerHour) : 50, // Hourly rate
                sitterAvailability: Object.entries(availability)
                    .filter(([_, v]) => v)
                    .map(([k]) => parseInt(k)),
                sitterVerified: false, // Must be verified manually by admin
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
            Alert.alert(t('common.error'), t('sitter.registration.saveError'));
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
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{t('sitterReg.personalDetails')}</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    {t('sitterReg.tellUsAboutYourself')}
                </Text>
            </View>

            <View style={styles.inputsContainer}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.fullName')} *</Text>
                    <View style={styles.inputWrapper}>
                        {Platform.OS === 'ios' && (
                            <BlurView
                                intensity={15}
                                tint={isDarkMode ? 'dark' : 'light'}
                                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                            />
                        )}
                        <TextInput
                            style={[styles.input, {
                                backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.card,
                                color: theme.textPrimary,
                                borderColor: theme.border
                            }]}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('sitterReg.fullName')}
                            placeholderTextColor={theme.textSecondary}
                            textAlign="right"
                        />
                    </View>
                </View>

                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.age')} *</Text>
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
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.phone')} *</Text>
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

                {/* Experience + Price Row */}
                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.yearsExperience')}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                            value={experienceYears}
                            onChangeText={setExperienceYears}
                            placeholder={t('sitterReg.years')}
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            textAlign="right"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.pricePerHour')} *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                            value={pricePerHour}
                            onChangeText={setPricePerHour}
                            placeholder="50"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            textAlign="right"
                        />
                    </View>
                </View>

                {/* City Picker - Premium Autocomplete */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.city')} *</Text>

                    <View style={styles.cityInputContainer}>
                        <View style={[styles.cityInputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            {/* Premium Glass Effect */}
                            {Platform.OS === 'ios' && (
                                <BlurView
                                    intensity={20}
                                    tint={isDarkMode ? 'dark' : 'light'}
                                    style={StyleSheet.absoluteFill}
                                />
                            )}

                            {/* Search Icon with Gradient */}
                            <LinearGradient
                                colors={[theme.primary + '20', theme.primary + '10']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.cityIconContainer}
                            >
                                <MapPin size={15} color={theme.primary} strokeWidth={2} />
                            </LinearGradient>

                            {/* Input Field */}
                            <TextInput
                                style={[styles.cityInput, { color: theme.textPrimary }]}
                                value={city}
                                onChangeText={(text) => {
                                    setCity(text);
                                    if (autocompleteTimeoutRef.current) {
                                        clearTimeout(autocompleteTimeoutRef.current);
                                    }

                                    if (text.length > 0) {
                                        autocompleteTimeoutRef.current = setTimeout(() => {
                                            const filtered = ISRAELI_CITIES.filter(cityName =>
                                                cityName.toLowerCase().startsWith(text.toLowerCase().trim())
                                            );
                                            setCitySuggestions(filtered.slice(0, 5));
                                            setShowCitySuggestions(filtered.length > 0);
                                        }, 150);
                                    } else {
                                        setShowCitySuggestions(false);
                                        setCitySuggestions([]);
                                    }
                                }}
                                onFocus={() => {
                                    if (city.length > 0) {
                                        const filtered = ISRAELI_CITIES.filter(cityName =>
                                            cityName.toLowerCase().startsWith(city.toLowerCase())
                                        );
                                        setCitySuggestions(filtered.slice(0, 5));
                                        setShowCitySuggestions(filtered.length > 0);
                                    } else {
                                        const filtered = ISRAELI_CITIES.slice(0, 5);
                                        setCitySuggestions(filtered);
                                        setShowCitySuggestions(true);
                                    }
                                }}
                                onBlur={() => {
                                    if (autocompleteTimeoutRef.current) {
                                        clearTimeout(autocompleteTimeoutRef.current);
                                    }
                                    setTimeout(() => setShowCitySuggestions(false), 200);
                                }}
                                placeholder={t('sitterReg.typeOrSelect')}
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                            />

                            {/* Clear Button with Gradient */}
                            {city.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (autocompleteTimeoutRef.current) {
                                            clearTimeout(autocompleteTimeoutRef.current);
                                        }
                                        setCity('');
                                        setShowCitySuggestions(false);
                                        setCitySuggestions([]);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={[theme.primary + '20', theme.primary + '10']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.cityClearButton}
                                    >
                                        <Text style={{ color: theme.textSecondary, fontSize: 20, fontWeight: '200', lineHeight: 20 }}>×</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* City Autocomplete Suggestions - Premium Glass Effect */}
                        {showCitySuggestions && citySuggestions.length > 0 && (
                            <View style={[styles.citySuggestionsContainer, {
                                borderColor: theme.border,
                                shadowColor: '#000',
                            }]}>
                                {Platform.OS === 'ios' && (
                                    <BlurView
                                        intensity={60}
                                        tint={isDarkMode ? 'dark' : 'light'}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <View style={[StyleSheet.absoluteFill, {
                                    backgroundColor: Platform.OS === 'android' ? theme.card : 'transparent',
                                    borderRadius: 16,
                                }]} />
                                {citySuggestions.map((cityName, index) => (
                                    <TouchableOpacity
                                        key={cityName}
                                        style={[
                                            styles.citySuggestionItem,
                                            {
                                                borderBottomColor: theme.border,
                                                borderBottomWidth: index < citySuggestions.length - 1 ? StyleSheet.hairlineWidth : 0,
                                            }
                                        ]}
                                        onPress={() => {
                                            if (autocompleteTimeoutRef.current) {
                                                clearTimeout(autocompleteTimeoutRef.current);
                                            }
                                            setCity(cityName);
                                            setShowCitySuggestions(false);
                                            setCitySuggestions([]);
                                            if (Platform.OS !== 'web') {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.citySuggestionText, { color: theme.textPrimary }]}>
                                            {cityName}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* GPS Location Button - Premium Design with Gradient */}
                <TouchableOpacity
                    style={[styles.locationBtn, {
                        borderColor: gpsLocation ? theme.success : theme.border,
                        overflow: 'hidden',
                    }]}
                    onPress={getLocation}
                    disabled={isLoadingLocation}
                    activeOpacity={0.7}
                >
                    {Platform.OS === 'ios' && (
                        <BlurView
                            intensity={20}
                            tint={isDarkMode ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                    <LinearGradient
                        colors={gpsLocation
                            ? [theme.success + '20', theme.success + '10']
                            : [theme.card, theme.card]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {isLoadingLocation ? (
                        <ActivityIndicator size="small" color={theme.textPrimary} />
                    ) : (
                        <>
                            <LinearGradient
                                colors={gpsLocation
                                    ? [theme.success + '30', theme.success + '20']
                                    : [theme.primary + '20', theme.primary + '10']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.locationIconWrapper}
                            >
                                <MapPin size={16} color={gpsLocation ? theme.success : theme.primary} strokeWidth={2} />
                            </LinearGradient>
                            <Text style={[styles.locationBtnText, { color: gpsLocation ? theme.success : theme.textPrimary }]}>
                                {gpsLocation ? t('sitterReg.locationSaved') : t('sitterReg.shareGps')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.aboutYou')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder={t('sitterReg.tellAboutExperience')}
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        numberOfLines={4}
                        textAlign="right"
                    />
                </View>
            </View>
        </View>
    ), [name, age, phone, bio, city, gpsLocation, isLoadingLocation, experienceYears, pricePerHour, theme]);

    // Step 2: Photo - memoized
    const PhotoStep = useMemo(() => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <Camera size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{t('sitter.registration.uploadPhotoHint')}</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    {t('sitter.registration.uploadPhotoHint')}
                </Text>
            </View>

            <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Camera size={40} color={theme.textSecondary} strokeWidth={1} />
                        <Text style={[styles.photoPlaceholderText, { color: theme.textSecondary }]}>{t('sitter.registration.uploadPhoto')}</Text>
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


    // Steps are now memoized and won't cause input lag

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Premium Gradient Background */}
            <LinearGradient
                colors={isDarkMode
                    ? [theme.background, theme.cardSecondary + '40', theme.background]
                    : ['#FAFAFA', '#F5F5F5', '#FAFAFA']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronRight size={24} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('sitter.registration.title')}</Text>
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
                    {t('sitterReg.stepOf', { current: currentStep.toString(), total: '2' })}
                </Text>
            </View>

            {/* Content */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {currentStep === 1 && PersonalInfoStep}
                    {currentStep === 2 && PhotoStep}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + 70 }]}>
                {currentStep > 1 && (
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: theme.border }]}
                        onPress={prevStep}
                    >
                        <ChevronRight size={18} color={theme.textSecondary} />
                        <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>{t('sitter.back')}</Text>
                    </TouchableOpacity>
                )}

                {currentStep < 2 ? (
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
                        onPress={nextStep}
                    >
                        <Text style={[styles.primaryBtnText, { color: theme.card }]}>{t('common.continue')}</Text>
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
                            <Text style={[styles.primaryBtnText, { color: theme.card }]}>{t('sitter.registration.complete')}</Text>
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
    inputWrapper: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    input: {
        fontSize: 15,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 0,
        minHeight: 48,
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
        paddingTop: 16,
        paddingBottom: 16,
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

    // City Input - Premium Autocomplete
    cityInputContainer: {
        position: 'relative',
        zIndex: 10,
    },
    cityInputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
        gap: 10,
    },
    cityIconContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cityInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        paddingHorizontal: 6,
        paddingVertical: 0,
        minHeight: 20,
    },
    cityClearButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    citySuggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        borderRadius: 16,
        borderWidth: 1,
        maxHeight: 200,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        overflow: 'hidden',
    },
    citySuggestionItem: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    citySuggestionText: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
    },

    // Location button styles - Premium Design
    locationBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    locationIconWrapper: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    locationBtnText: {
        fontSize: 15,
        fontWeight: '400',
    },
});

export default SitterRegistrationScreen;
