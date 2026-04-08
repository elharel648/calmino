// pages/SitterRegistrationScreen.tsx - Super Premium Sitter Registration
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import InlineLoader from '../components/Common/InlineLoader';
import { View,
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
    Platform } from 'react-native';
import {
    User, Camera, Clock, MapPin,
    ChevronLeft, ChevronRight, Check, Plus, Minus, Search,
    Sparkles, Shield, Star,
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
            {/* Premium Step Header */}
            <View style={styles.stepHeader}>
                <View style={styles.stepIconOuter}>
                    <LinearGradient
                        colors={isDarkMode ? ['#2C2C2E', '#3A3A3C'] : ['#F2F2F7', '#E5E5EA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.stepIconGradient}
                    >
                        <User size={26} color={isDarkMode ? '#fff' : '#1C1C1E'} strokeWidth={1.8} />
                    </LinearGradient>
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{t('sitterReg.personalDetails')}</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    {t('sitterReg.tellUsAboutYourself')}
                </Text>
            </View>

            <View style={styles.inputsContainer}>
                {/* Full Name */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.fullName')} *</Text>
                    <View style={[styles.premiumInputWrapper, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }]}>
                        <TextInput
                            style={[styles.premiumInput, { color: theme.textPrimary }]}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('sitterReg.fullName')}
                            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                            textAlign="right"
                        />
                        <View style={[styles.inputIconBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F2F2F7' }]}>
                            <User size={15} color={isDarkMode ? '#fff' : '#1C1C1E'} strokeWidth={2} />
                        </View>
                    </View>
                </View>

                {/* Age + Phone Row */}
                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.age')} *</Text>
                        <View style={[styles.premiumInputWrapper, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }]}>
                            <TextInput
                                style={[styles.premiumInput, { color: theme.textPrimary }]}
                                value={age}
                                onChangeText={setAge}
                                placeholder="18+"
                                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                keyboardType="numeric"
                                textAlign="right"
                            />
                        </View>
                    </View>
                    <View style={[styles.inputGroup, { flex: 2 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.phone')} *</Text>
                        <View style={[styles.premiumInputWrapper, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }]}>
                            <TextInput
                                style={[styles.premiumInput, { color: theme.textPrimary }]}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="050-1234567"
                                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                keyboardType="phone-pad"
                                textAlign="right"
                            />
                        </View>
                    </View>
                </View>

                {/* Experience + Price Row */}
                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.yearsExperience')}</Text>
                        <View style={[styles.premiumInputWrapper, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }]}>
                            <TextInput
                                style={[styles.premiumInput, { color: theme.textPrimary }]}
                                value={experienceYears}
                                onChangeText={setExperienceYears}
                                placeholder={t('sitterReg.years')}
                                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                keyboardType="numeric"
                                textAlign="right"
                            />
                        </View>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.pricePerHour')} *</Text>
                        <View style={[styles.premiumInputWrapper, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }]}>
                            <TextInput
                                style={[styles.premiumInput, { color: theme.textPrimary }]}
                                value={pricePerHour}
                                onChangeText={setPricePerHour}
                                placeholder="₪50"
                                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                keyboardType="numeric"
                                textAlign="right"
                            />
                        </View>
                    </View>
                </View>

                {/* ── City Picker ── */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.city')} *</Text>

                    <View style={styles.cityInputContainer}>
                        <View style={[styles.premiumInputWrapper, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            flexDirection: 'row-reverse',
                            alignItems: 'center',
                            gap: 10,
                        }]}>
                            <View style={[styles.inputIconBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F2F2F7' }]}>
                                <MapPin size={15} color={isDarkMode ? '#fff' : '#1C1C1E'} strokeWidth={2} />
                            </View>

                            <TextInput
                                style={[styles.premiumInput, { color: theme.textPrimary, flex: 1 }]}
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
                                placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                textAlign="right"
                            />

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
                                    style={[styles.cityClearBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                >
                                    <Text style={{ color: theme.textSecondary, fontSize: 16, fontWeight: '300', lineHeight: 18 }}>×</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* City Autocomplete Suggestions */}
                        {showCitySuggestions && citySuggestions.length > 0 && (
                            <View style={[styles.citySuggestionsContainer, {
                                backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            }]}>
                                {citySuggestions.map((cityName, index) => (
                                    <TouchableOpacity
                                        key={cityName}
                                        style={[
                                            styles.citySuggestionItem,
                                            {
                                                borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
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
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                                            <MapPin size={14} color={theme.textSecondary} strokeWidth={1.5} />
                                            <Text style={[styles.citySuggestionText, { color: theme.textPrimary }]}>
                                                {cityName}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* GPS Location Button */}
                <TouchableOpacity
                    style={[styles.locationBtn, {
                        overflow: 'hidden',
                    }]}
                    onPress={getLocation}
                    disabled={isLoadingLocation}
                    activeOpacity={0.7}
                >
                    <LinearGradient
                        colors={gpsLocation
                            ? (isDarkMode ? ['rgba(200,128,106,0.2)', 'rgba(200,128,106,0.1)'] : ['#FDF7F5', '#FAEAE5'])
                            : (isDarkMode ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : ['#F2F2F7', '#E5E5EA'])
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {isLoadingLocation ? (
                        <InlineLoader size="small" color={theme.textPrimary}  />
                    ) : (
                        <>
                            <View style={[styles.locationIconBadge, {
                                backgroundColor: gpsLocation
                                    ? (isDarkMode ? 'rgba(200,128,106,0.25)' : 'rgba(200,128,106,0.15)')
                                    : (isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)')
                            }]}>
                                {gpsLocation ? (
                                    <Check size={14} color="#C8806A" strokeWidth={2.5} />
                                ) : (
                                    <MapPin size={14} color={isDarkMode ? '#fff' : '#1C1C1E'} strokeWidth={2} />
                                )}
                            </View>
                            <Text style={[styles.locationBtnText, {
                                color: gpsLocation ? '#C8806A' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#374151'),
                                fontWeight: gpsLocation ? '600' : '500',
                            }]}>
                                {gpsLocation ? t('sitterReg.locationSaved') : t('sitterReg.shareGps')}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* About You */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('sitterReg.aboutYou')}</Text>
                    <View style={[styles.premiumInputWrapper, {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }]}>
                        <TextInput
                            style={[styles.premiumInput, styles.textArea, { color: theme.textPrimary }]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder={t('sitterReg.tellAboutExperience')}
                            placeholderTextColor={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                            multiline
                            numberOfLines={4}
                            textAlign="right"
                        />
                    </View>
                </View>
            </View>
        </View>
    ), [name, age, phone, bio, city, gpsLocation, isLoadingLocation, experienceYears, pricePerHour, theme, isDarkMode]);

    // Step 2: Photo - memoized
    const PhotoStep = useMemo(() => (
        <View style={styles.stepContent}>
            {/* Premium Step Header */}
            <View style={styles.stepHeader}>
                <View style={styles.stepIconOuter}>
                    <LinearGradient
                        colors={isDarkMode ? ['#2C2C2E', '#3A3A3C'] : ['#F2F2F7', '#E5E5EA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.stepIconGradient}
                    >
                        <Camera size={26} color={isDarkMode ? '#fff' : '#1C1C1E'} strokeWidth={1.8} />
                    </LinearGradient>
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{t('sitter.registration.uploadPhotoHint')}</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    {t('sitter.registration.uploadPhotoHint')}
                </Text>
            </View>

            <TouchableOpacity style={styles.photoUpload} onPress={pickImage} activeOpacity={0.85}>
                {profilePhoto ? (
                    <View style={styles.photoContainer}>
                        {/* Gradient ring behind photo */}
                        <LinearGradient
                            colors={['#1C1C1E', '#3A3A3C', '#636366', '#1C1C1E']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.photoGradientRing}
                        />
                        <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                        <View style={[styles.photoEditBadge, { backgroundColor: '#1C1C1E' }]}>
                            <Camera size={14} color="#fff" strokeWidth={2.5} />
                        </View>
                    </View>
                ) : (
                    <View style={styles.photoPlaceholderOuter}>
                        {/* Dashed ring with gradient hint */}
                        <LinearGradient
                            colors={isDarkMode ? ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)'] : ['#F2F2F7', '#E5E5EA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.photoPlaceholderInner}
                        >
                            <View style={styles.photoUploadIcon}>
                                <LinearGradient
                                    colors={['#1C1C1E', '#3A3A3C']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.photoUploadIconGradient}
                                >
                                    <Camera size={28} color="#fff" strokeWidth={1.8} />
                                </LinearGradient>
                            </View>
                            <Text style={[styles.photoPlaceholderText, { color: theme.textPrimary }]}>{t('sitter.registration.uploadPhoto')}</Text>
                            <Text style={[styles.photoPlaceholderHint, { color: theme.textSecondary }]}>
                                {t('common.tapToSelect') || 'לחצ/י לבחירה'}
                            </Text>
                        </LinearGradient>
                    </View>
                )}
            </TouchableOpacity>

            {/* Trust badge */}
            <View style={[styles.trustBadge, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F2F2F7' }]}>
                <Shield size={16} color={isDarkMode ? '#fff' : '#1C1C1E'} strokeWidth={2} />
                <Text style={[styles.trustBadgeText, { color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#64748B' }]}>
                    {t('sitter.registration.photoPrivacy') || 'התמונה שלך מוצגת רק להורים בסביבתך'}
                </Text>
            </View>
        </View>
    ), [profilePhoto, pickImage, theme, isDarkMode]);


    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Premium Atmospheric Background */}
            <LinearGradient
                colors={isDarkMode
                    ? ['#0A0A0F', '#0F0F18', '#0A0A0F']
                    : ['#FAFAFA', '#F5F5F5', '#F5F5F5']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Header — Minimalist Apple Style */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={isDarkMode ? 40 : 60}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={[StyleSheet.absoluteFill, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    />
                )}
                {Platform.OS === 'android' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)' }]} />
                )}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn} activeOpacity={0.6}>
                    <ChevronRight size={22} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('sitter.registration.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Premium Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressSteps}>
                    {[1, 2].map((step) => (
                        <View key={step} style={styles.progressStepItem}>
                            <View style={[
                                styles.progressDot,
                                currentStep >= step && styles.progressDotActive,
                                currentStep >= step && { backgroundColor: '#1C1C1E' },
                                currentStep < step && { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
                            ]}>
                                {currentStep > step ? (
                                    <Check size={10} color="#fff" strokeWidth={3} />
                                ) : (
                                    <Text style={[styles.progressDotText, {
                                        color: currentStep >= step ? '#fff' : theme.textSecondary,
                                    }]}>{step}</Text>
                                )}
                            </View>
                            {step < 2 && (
                                <View style={[styles.progressLine, {
                                    backgroundColor: currentStep > step
                                        ? '#1C1C1E'
                                        : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                                }]} />
                            )}
                        </View>
                    ))}
                </View>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                    {t('sitterReg.stepOf', { current: currentStep.toString(), total: '2' })}
                </Text>
            </View>

            {/* Content */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {currentStep === 1 && PersonalInfoStep}
                    {currentStep === 2 && PhotoStep}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Premium Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 70 }]}>
                {Platform.OS === 'ios' && (
                    <BlurView
                        intensity={isDarkMode ? 40 : 60}
                        tint={isDarkMode ? 'dark' : 'light'}
                        style={[StyleSheet.absoluteFill, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                    />
                )}
                {Platform.OS === 'android' && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)' }]} />
                )}

                <View style={styles.footerContent}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            style={[styles.secondaryBtn, {
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                            }]}
                            onPress={prevStep}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>{t('sitter.back')}</Text>
                            <ChevronLeft size={16} color={theme.textSecondary} />
                        </TouchableOpacity>
                    )}

                    {currentStep < 2 ? (
                        <TouchableOpacity
                            style={[styles.primaryBtnWrapper, currentStep > 1 && { flex: 2 }]}
                            onPress={nextStep}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#1C1C1E', '#2C2C2E']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryBtnGradient}
                            >
                                <ChevronRight size={16} color="#fff" strokeWidth={2.5} />
                                <Text style={styles.primaryBtnText}>{t('common.continue')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.primaryBtnWrapper}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={isSubmitting ? ['#9CA3AF', '#9CA3AF'] : ['#1C1C1E', '#2C2C2E']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.primaryBtnGradient}
                            >
                                {isSubmitting ? (
                                    <InlineLoader size="small" color="#fff"  />
                                ) : (
                                    <>
                                        <Sparkles size={16} color="#fff" strokeWidth={2} />
                                        <Text style={styles.primaryBtnText}>{t('sitter.registration.complete')}</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        zIndex: 10,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },

    // ── Progress ──
    progressContainer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
        alignItems: 'center',
        gap: 10,
    },
    progressSteps: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
    },
    progressStepItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressDotActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    progressDotText: {
        fontSize: 12,
        fontWeight: '700',
    },
    progressLine: {
        width: 60,
        height: 2,
        borderRadius: 1,
        marginHorizontal: 8,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.2,
    },

    // ── Content ──
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 140,
    },
    stepContent: {
        gap: 28,
    },
    stepHeader: {
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    stepIconOuter: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
        overflow: 'visible',
    },
    stepIconGradient: {
        width: 60,
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 20,
    },

    // ── Inputs ──
    inputsContainer: {
        gap: 18,
    },
    inputGroup: {
        gap: 8,
    },
    inputRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
        letterSpacing: 0.1,
    },
    premiumInputWrapper: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 0,
    },
    premiumInput: {
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 14,
        flex: 1,
        minHeight: 48,
    },
    inputIconBadge: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textArea: {
        minHeight: 110,
        textAlignVertical: 'top',
        paddingTop: 14,
    },

    // ── City Picker ──
    cityInputContainer: {
        position: 'relative',
        zIndex: 10,
    },
    cityClearBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    citySuggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 6,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 8,
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

    // ── Location Button ──
    locationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 10,
    },
    locationIconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationBtnText: {
        fontSize: 14,
        letterSpacing: 0.1,
    },

    // ── Photo Upload ──
    photoUpload: {
        alignSelf: 'center',
    },
    photoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoGradientRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    photoPreview: {
        width: 168,
        height: 168,
        borderRadius: 84,
        borderWidth: 3,
        borderColor: '#fff',
    },
    photoEditBadge: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    photoPlaceholderOuter: {
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(0,0,0,0.15)',
        overflow: 'hidden',
    },
    photoPlaceholderInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    photoUploadIcon: {
        marginBottom: 4,
    },
    photoUploadIconGradient: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    photoPlaceholderText: {
        fontSize: 14,
        fontWeight: '600',
    },
    photoPlaceholderHint: {
        fontSize: 12,
        fontWeight: '400',
        opacity: 0.6,
    },

    // ── Trust Badge ──
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignSelf: 'center',
    },
    trustBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },

    // ── Footer ──
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        zIndex: 10,
    },
    footerContent: {
        flexDirection: 'row',
        gap: 12,
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 15,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    primaryBtnWrapper: {
        flex: 2,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    primaryBtnGradient: {
        flexDirection: 'row',
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.2,
    },
});

export default SitterRegistrationScreen;
