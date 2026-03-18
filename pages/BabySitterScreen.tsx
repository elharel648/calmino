// pages/BabySitterScreen.tsx - Minimalist Parent Sitter Search
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
    Platform,
    ActivityIndicator,
    TextInput,
    FlatList,
    ListRenderItem,
    ScrollView,
} from 'react-native';
import {
    Search, Briefcase, Star, ChevronLeft,
    User, Award, UserPlus, MapPin, Calendar, UserX, Ban, Heart
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import useSitters, { Sitter } from '../hooks/useSitters';
import { ISRAELI_CITIES } from '../constants/israeliCities';
import { logger } from '../utils/logger';
import SitterCard from '../components/BabySitter/SitterCard';
import DynamicPromoModal from '../components/Premium/DynamicPromoModal';
import PremiumPaywall from '../components/Premium/PremiumPaywall';
import { useFavoriteSitters } from '../hooks/useFavoriteSitters';

const NEARBY_RADIUS_KM = 30; // Show sitters within 30km by default

const BabySitterScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    // Hooks
    const { sitters, isLoading, refetch } = useSitters();
    const { favorites, toggleFavorite } = useFavoriteSitters();

    // 🔧 DEBUG: Log when screen loads
    useEffect(() => {
        logger.debug('🔧', 'BabySitterScreen: Mounted! isLoading:', isLoading, 'sitters:', sitters.length);
    }, [sitters, isLoading]);

    // State
    // userMode toggle removed — parent mode is always shown, sitter access via + button
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance' | 'favorites'>('rating');
    const [isSitterRegistered, setIsSitterRegistered] = useState<boolean | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [filterCity, setFilterCity] = useState<string>(''); // Manual city filter
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // User location state
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
        null
    );
    const [userCity, setUserCity] = useState<string | null>(null);

    // Get user photo from Auth or Firestore (prioritize sitter photo if user is a sitter)
    const [userPhoto, setUserPhoto] = useState<string | null>(auth.currentUser?.photoURL || null);

    // Load user photo from Firestore - prioritize sitter photo if user is a sitter
    const loadUserPhoto = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();

                // If user is a sitter, prioritize sitter photo (photoUrl)
                // Otherwise use regular user photo
                if (data.isSitter === true && data.photoUrl) {
                    // User is a sitter - use their sitter profile photo
                    setUserPhoto(data.photoUrl);
                } else if (data.photoUrl) {
                    // Regular user - use their photo
                    setUserPhoto(data.photoUrl);
                } else if (auth.currentUser?.photoURL) {
                    // Fallback to Auth photo
                    setUserPhoto(auth.currentUser.photoURL);
                } else {
                    // No photo available
                    setUserPhoto(null);
                }
            } else {
                // No Firestore doc - use Auth photo if available
                if (auth.currentUser?.photoURL) {
                    setUserPhoto(auth.currentUser.photoURL);
                }
            }
        } catch (error) {
            // Silent fail - fallback to Auth photo
            if (auth.currentUser?.photoURL) {
                setUserPhoto(auth.currentUser.photoURL);
            }
        }
    }, []);

    // Load photo on mount
    useEffect(() => {
        loadUserPhoto();
    }, [loadUserPhoto]);

    // Reload photo when screen is focused (in case user updated their photo)
    useFocusEffect(
        useCallback(() => {
            loadUserPhoto();
        }, [loadUserPhoto])
    );

    // Calculate distance between two GPS coordinates (Haversine formula)
    const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        // Validate inputs
        if (
            typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
            typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
            isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2) ||
            lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
            lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180
        ) {
            return 999; // Return max distance for invalid coordinates
        }

        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Validate result
        if (isNaN(distance) || !isFinite(distance)) {
            return 999;
        }

        return Math.round(distance * 10) / 10; // Round to 1 decimal
    }, []);

    // Fetch user's location on mount
    useEffect(() => {
        let isMounted = true;

        const fetchUserLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    logger.log('Location permission denied');
                    return;
                }

                // Phase 1: Try last-known position for instant results
                let location: Location.LocationObject | null = null;
                try {
                    const lastKnown = await Location.getLastKnownPositionAsync();
                    if (lastKnown?.coords &&
                        !isNaN(lastKnown.coords.latitude) &&
                        !isNaN(lastKnown.coords.longitude)) {
                        // Use last-known immediately so sitters show up fast
                        if (isMounted) {
                            setUserLocation({
                                latitude: lastKnown.coords.latitude,
                                longitude: lastKnown.coords.longitude,
                            });
                            setSortBy(prev => prev === 'rating' ? 'distance' : prev);
                        }
                        location = lastKnown;
                    }
                } catch {
                    // Silent - will fall through to getCurrentPosition
                }

                // Phase 2: Get fresh position with Balanced accuracy (~100m, 1-2s)
                // Balanced is plenty accurate for a 30km search radius
                const freshLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                location = freshLocation;

                // Validate coordinates
                if (!location?.coords ||
                    typeof location.coords.latitude !== 'number' ||
                    typeof location.coords.longitude !== 'number' ||
                    isNaN(location.coords.latitude) ||
                    isNaN(location.coords.longitude) ||
                    location.coords.latitude < -90 || location.coords.latitude > 90 ||
                    location.coords.longitude < -180 || location.coords.longitude > 180) {
                    logger.warn('Invalid location coordinates');
                    return;
                }

                if (isMounted) {
                    setUserLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });
                    // Auto-switch to distance sort when GPS is available
                    setSortBy(prev => prev === 'rating' ? 'distance' : prev);
                }

                // Get city name from coordinates (reverse geocoding)
                try {
                    const addresses = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });

                    if (isMounted && addresses && addresses.length > 0) {
                        const address = addresses[0];
                        let detectedCity: string | null = null;

                        if (address?.city && typeof address.city === 'string') {
                            detectedCity = address.city;
                        } else {
                            // Fallback to other address fields
                            const cityFallback = address?.subregion || address?.region;
                            if (cityFallback && typeof cityFallback === 'string') {
                                detectedCity = cityFallback;
                            }
                        }

                        if (detectedCity) {
                            setUserCity(detectedCity);
                            // Don't auto-filter — just use for proximity sorting and placeholder hint
                        }
                    }
                } catch (geocodeError) {
                    // Silent fail for geocoding - location still works
                    logger.warn('Geocoding error:', geocodeError);
                }
            } catch (error) {
                logger.error('Location fetch error:', error);
                // Don't set error state - app works fine without location
            }
        };

        fetchUserLocation();

        return () => {
            isMounted = false;
        };
    }, []);

    // Check if user is registered as sitter
    const checkSitterStatus = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setIsSitterRegistered(false);
            return;
        }

        setCheckingStatus(true);
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setIsSitterRegistered(data.isSitter === true);
            } else {
                setIsSitterRegistered(false);
            }
        } catch (error) {
            logger.error('Failed to check sitter status:', error);
            setIsSitterRegistered(false);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (autocompleteTimeoutRef.current) {
                clearTimeout(autocompleteTimeoutRef.current);
            }
        };
    }, []);

    // Reload user photo when sitter status changes
    useEffect(() => {
        if (isSitterRegistered !== null) {
            loadUserPhoto();
        }
    }, [isSitterRegistered, loadUserPhoto]); // Reload when sitter status changes

    // Check sitter status on every screen focus (for the + button)
    useFocusEffect(
        useCallback(() => {
            checkSitterStatus();
        }, [])
    );

    // Handle sitter button press — navigate to dashboard or registration
    const handleSitterButtonPress = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isSitterRegistered === true) {
            navigation.navigate('SitterDashboard');
        } else {
            navigation.navigate('SitterRegistration');
        }
    }, [isSitterRegistered, navigation]);

    // Refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Process sitters: add distance, filter by city match (memoized for performance)
    const processedSitters = useMemo(() => {
        return sitters.map(sitter => {
            let distance = 999; // Default to max distance

            // Calculate real distance if both user and sitter have GPS (with validation)
            if (userLocation &&
                sitter.location &&
                typeof sitter.location.latitude === 'number' &&
                typeof sitter.location.longitude === 'number' &&
                typeof userLocation.latitude === 'number' &&
                typeof userLocation.longitude === 'number' &&
                !isNaN(sitter.location.latitude) &&
                !isNaN(sitter.location.longitude) &&
                !isNaN(userLocation.latitude) &&
                !isNaN(userLocation.longitude)) {
                distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    sitter.location.latitude,
                    sitter.location.longitude
                );
            }

            return { ...sitter, distance };
        });
    }, [sitters, userLocation, calculateDistance]);

    // Handle city input change with autocomplete (debounced for performance)
    const handleCityInputChange = useCallback((text: string) => {
        setFilterCity(text);

        // Clear previous timeout
        if (autocompleteTimeoutRef.current) {
            clearTimeout(autocompleteTimeoutRef.current);
        }

        if (text.length > 0) {
            // Debounce autocomplete for better performance
            autocompleteTimeoutRef.current = setTimeout(() => {
                // Filter cities that start with the input
                const filtered = ISRAELI_CITIES.filter(city =>
                    city.toLowerCase().startsWith(text.toLowerCase().trim())
                );
                setCitySuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
                setShowCitySuggestions(filtered.length > 0);
            }, 150); // 150ms debounce
        } else {
            setShowCitySuggestions(false);
            setCitySuggestions([]);
        }
    }, []);

    // Handle city selection from suggestions
    const handleCitySelect = useCallback((city: string) => {
        if (!city || typeof city !== 'string') return;
        if (autocompleteTimeoutRef.current) {
            clearTimeout(autocompleteTimeoutRef.current);
        }
        setFilterCity(city.trim());
        setShowCitySuggestions(false);
        setCitySuggestions([]);
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, []);

    // Determine which city to filter by: only manual filter (user explicitly chose a city)
    const activeCity = useMemo(() => {
        if (!filterCity || typeof filterCity !== 'string') return '';
        return filterCity.trim();
    }, [filterCity]);

    // Smart filtering: radius-based when GPS available, with fallback to all
    const { sittersToShow, showingAllFallback } = useMemo(() => {
        let filtered = processedSitters;

        // Apply Favorites Filter (bypass radius)
        if (sortBy === 'favorites') {
            return {
                sittersToShow: filtered.filter(s => s.id && favorites.includes(s.id)),
                showingAllFallback: false,
            };
        }

        // 1. Filter by manual city selection (bypass radius)
        if (activeCity && activeCity.length > 0) {
            const searchCity = activeCity.toLowerCase().trim();
            if (searchCity.length > 0) {
                filtered = filtered.filter(s => {
                    if (!s.city || typeof s.city !== 'string') return false;
                    const sitterCity = s.city.toLowerCase().trim();
                    if (sitterCity.length === 0) return false;
                    return sitterCity === searchCity || sitterCity.startsWith(searchCity) || sitterCity.includes(searchCity);
                });
            }
            return { sittersToShow: filtered, showingAllFallback: false };
        }

        // 2. Radius filter when GPS is available (no manual city)
        if (userLocation) {
            const nearby = filtered.filter(s => {
                const dist = typeof s.distance === 'number' && !isNaN(s.distance) ? s.distance : 999;
                return dist <= NEARBY_RADIUS_KM;
            });

            if (nearby.length > 0) {
                return { sittersToShow: nearby, showingAllFallback: false };
            }

            // No nearby sitters — fall back to showing all
            return { sittersToShow: filtered, showingAllFallback: true };
        }

        // No GPS — show all
        return { sittersToShow: filtered, showingAllFallback: false };
    }, [processedSitters, activeCity, userLocation, sortBy, favorites]);

    // Sort sitters intelligently: prioritize nearby sitters, then by selected sort (memoized)
    const sortedSitters = useMemo(() => {
        const sitters = [...sittersToShow];

        // If user has location and no manual city filter, prioritize nearby sitters
        if (userLocation && !activeCity && sortBy === 'rating') {
            // Split into nearby (within 50km) and far
            const nearby = sitters.filter(s => {
                const dist = typeof s.distance === 'number' && !isNaN(s.distance) ? s.distance : 999;
                return dist <= 50;
            });
            const far = sitters.filter(s => {
                const dist = typeof s.distance === 'number' && !isNaN(s.distance) ? s.distance : 999;
                return dist > 50;
            });

            // Sort each group by rating (with validation)
            nearby.sort((a, b) => {
                const ratingA = typeof a.rating === 'number' && !isNaN(a.rating) ? a.rating : 0;
                const ratingB = typeof b.rating === 'number' && !isNaN(b.rating) ? b.rating : 0;
                return ratingB - ratingA;
            });
            far.sort((a, b) => {
                const ratingA = typeof a.rating === 'number' && !isNaN(a.rating) ? a.rating : 0;
                const ratingB = typeof b.rating === 'number' && !isNaN(b.rating) ? b.rating : 0;
                return ratingB - ratingA;
            });

            // Return nearby first, then far
            return [...nearby, ...far];
        }

        // Otherwise, use the selected sort method
        return sitters.sort((a, b) => {
            switch (sortBy) {
                case 'rating': {
                    const ratingA = typeof a.rating === 'number' && !isNaN(a.rating) ? a.rating : 0;
                    const ratingB = typeof b.rating === 'number' && !isNaN(b.rating) ? b.rating : 0;
                    return ratingB - ratingA;
                }
                case 'price': {
                    const priceA = typeof a.pricePerHour === 'number' && !isNaN(a.pricePerHour) ? a.pricePerHour : Infinity;
                    const priceB = typeof b.pricePerHour === 'number' && !isNaN(b.pricePerHour) ? b.pricePerHour : Infinity;
                    return priceA - priceB;
                }
                case 'distance': {
                    const distA = typeof a.distance === 'number' && !isNaN(a.distance) ? a.distance : 999;
                    const distB = typeof b.distance === 'number' && !isNaN(b.distance) ? b.distance : 999;
                    return distA - distB;
                }
                default: return 0;
            }
        });
    }, [sittersToShow, sortBy, userLocation, activeCity]);

    // Handle sitter press
    const handleSitterPress = useCallback((sitter: Sitter) => {
        if (!sitter || !sitter.id) return; // Safety check

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Validate and sanitize data before navigation
        const rating = typeof sitter.rating === 'number' && !isNaN(sitter.rating) && sitter.rating >= 0
            ? Math.max(0, Math.min(5, sitter.rating))
            : 0;
        const price = typeof sitter.pricePerHour === 'number' && !isNaN(sitter.pricePerHour) && sitter.pricePerHour > 0
            ? Math.max(0, sitter.pricePerHour)
            : 50;
        const reviews = typeof sitter.reviewCount === 'number' && !isNaN(sitter.reviewCount) && sitter.reviewCount >= 0
            ? Math.max(0, sitter.reviewCount)
            : 0;
        const distance = typeof sitter.distance === 'number' && !isNaN(sitter.distance) && sitter.distance >= 0
            ? sitter.distance
            : 0;

        // Map Sitter type to SitterData format expected by SitterProfileScreen
        const sitterData = {
            id: sitter.id,
            name: (sitter.name && typeof sitter.name === 'string') ? sitter.name : t('babysitter.sitter'),
            age: typeof sitter.age === 'number' && !isNaN(sitter.age) && sitter.age > 0 ? sitter.age : 0,
            image: (sitter.photoUrl && typeof sitter.photoUrl === 'string') ? sitter.photoUrl : 'https://i.pravatar.cc/200',
            rating,
            reviews,
            price,
            distance,
            phone: (sitter.phone && typeof sitter.phone === 'string') ? sitter.phone : undefined,
            bio: (sitter.bio && typeof sitter.bio === 'string') ? sitter.bio : '',
            reviewsList: [], // Reviews are fetched by SitterProfileScreen
            socialLinks: sitter.socialLinks,
            experience: sitter.experience || undefined,
            languages: sitter.languages || undefined,
            certifications: sitter.certifications || undefined,
            city: sitter.city || undefined,
        };

        try {
            navigation.navigate('SitterProfile', { sitterData });
        } catch (error) {
            logger.error('Navigation error:', error);
        }
    }, [navigation]);

    // Render Sitter Card component for FlatList
    const renderSitterItem: ListRenderItem<Sitter> = useCallback(({ item }) => (
        <SitterCard
            sitter={item}
            theme={theme}
            isDarkMode={isDarkMode}
            onPress={handleSitterPress}
            isFavorite={item.id ? favorites.includes(item.id) : false}
            onToggleFavorite={toggleFavorite}
        />
    ), [theme, isDarkMode, handleSitterPress, favorites, toggleFavorite]);

    // ========== COMPONENTS ==========

    // Sort Pills
    const SORT_OPTIONS = [
        { key: 'rating' as const, label: t('sitter.rating'), IconComp: Star },
        { key: 'price' as const, label: t('sitter.price'), IconComp: null, iconText: '₪' },
        { key: 'distance' as const, label: t('sitter.distance'), IconComp: MapPin },
        { key: 'favorites' as const, label: t('sitter.favorites'), IconComp: Heart },
    ];

    const SortPills = () => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortRow}
            style={styles.filtersContainer}
        >
            {SORT_OPTIONS.map((opt) => {
                const isActive = sortBy === opt.key;
                return (
                    <TouchableOpacity
                        key={opt.key}
                        style={[
                            styles.sortPill,
                            {
                                backgroundColor: isActive ? theme.textPrimary : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                borderColor: isActive ? theme.textPrimary : theme.border,
                            }
                        ]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSortBy(opt.key);
                        }}
                        activeOpacity={0.7}
                    >
                        {opt.IconComp ? (
                            <opt.IconComp size={12} color={isActive ? theme.card : theme.textSecondary} strokeWidth={2} />
                        ) : (
                            <Text style={{ fontSize: 12, color: isActive ? theme.card : theme.textSecondary, fontWeight: '700' }}>{opt.iconText}</Text>
                        )}
                        <Text style={[styles.sortPillText, { color: isActive ? theme.card : theme.textSecondary, fontWeight: isActive ? '700' : '500' }]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}

            {/* Blocked Users pill */}
            <TouchableOpacity
                style={[styles.sortPill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: theme.border }]}
                onPress={() => navigation.navigate('BlockedUsers')}
                activeOpacity={0.7}
            >
                <Ban size={12} color={theme.textSecondary} strokeWidth={2} />
                <Text style={[styles.sortPillText, { color: theme.textSecondary, fontWeight: '500' }]}>{t('sitter.blocked')}</Text>
            </TouchableOpacity>

        </ScrollView>
    );

    // Sitter Registration CTA (for non-registered users)
    const SitterRegistrationCTA = () => (
        <View style={styles.registrationContainer}>
            <View style={[styles.registrationCard, { backgroundColor: theme.card }]}>
                <UserPlus size={48} color={theme.textSecondary} strokeWidth={1} />
                <Text style={[styles.registrationTitle, { color: theme.textPrimary }]}>
                    {t('babysitter.becomeSitter')}
                </Text>
                <Text style={[styles.registrationSubtitle, { color: theme.textSecondary }]}>
                    {t('babysitter.earnMoney')}
                </Text>
                <TouchableOpacity
                    style={[styles.registrationBtn, { backgroundColor: theme.textPrimary }]}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.navigate('SitterRegistration');
                    }}
                >
                    <Text style={[styles.registrationBtnText, { color: theme.card }]}>
                        {t('babysitter.startRegistration')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Sitter Dashboard CTA (for registered users)
    const SitterDashboardCTA = () => (
        <View style={styles.sitterModeContainer}>
            <Briefcase size={48} color={theme.textSecondary} strokeWidth={1} />
            <Text style={[styles.sitterModeTitle, { color: theme.textPrimary }]}>{t('babysitter.sitterDashboard')}</Text>
            <Text style={[styles.sitterModeSubtitle, { color: theme.textSecondary }]}>
                {t('babysitter.goToDashboard')}
            </Text>
            <TouchableOpacity
                style={[styles.dashboardBtn, { backgroundColor: theme.textPrimary }]}
                onPress={() => navigation.navigate('SitterDashboard')}
            >
                <Text style={[styles.dashboardBtnText, { color: theme.card }]}>{t('babysitter.openDashboard')}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Background Gradient - Apple Style */}
            <LinearGradient
                colors={isDarkMode
                    ? [theme.background, theme.cardSecondary, theme.background]
                    : ['#FAFAFA', '#F5F5F5', '#FAFAFA']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, {
                backgroundColor: theme.card,
                borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }]}>
                {/* Top: back + title + avatar */}
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.headerBackBtn, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        }]}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={18} color={theme.textPrimary} strokeWidth={2.5} />
                    </TouchableOpacity>

                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('sitter.findSitter')}</Text>

                    <View style={styles.headerRight}>
                        {/* Join / Open Sitter button */}
                        <TouchableOpacity
                            onPress={handleSitterButtonPress}
                            style={[styles.headerBackBtn, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                marginRight: 8,
                            }]}
                            activeOpacity={0.7}
                        >
                            {isSitterRegistered === true ? (
                                <Briefcase size={16} color={theme.textPrimary} strokeWidth={2} />
                            ) : (
                                <UserPlus size={16} color={theme.textPrimary} strokeWidth={2} />
                            )}
                        </TouchableOpacity>

                        {userPhoto ? (
                            <Image source={{ uri: userPhoto }} style={styles.userPhoto} />
                        ) : (
                            <View style={[styles.userPhotoPlaceholder, {
                                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                            }]}>
                                <User size={15} color={theme.textSecondary} strokeWidth={1.5} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Mode toggle removed — sitter access via + button in header */}
            </View>

            {/* Sitter Search Content (always shown) */}
                <>
                    {/* Location Search Bar */}
                    <View style={styles.locationSection}>
                        <View style={[styles.locationButton, {
                            backgroundColor: theme.card,
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                        }]}>
                            {/* MapPin icon - right side */}
                            <MapPin size={16} color={theme.textSecondary} strokeWidth={2} />

                            {/* Input */}
                            <TextInput
                                style={[styles.locationInput, { color: theme.textPrimary }]}
                                value={filterCity}
                                onChangeText={handleCityInputChange}
                                onFocus={() => {
                                    if (filterCity.length > 0) {
                                        const filtered = ISRAELI_CITIES.filter(city =>
                                            city.toLowerCase().startsWith(filterCity.toLowerCase())
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
                                    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
                                    autocompleteTimeoutRef.current = setTimeout(() => setShowCitySuggestions(false), 200);
                                }}
                                placeholder={userCity && ISRAELI_CITIES.includes(userCity) ? `${userCity} ${t('babysitter.automatic')}` : t('sitter.searchByCity')}
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                            />

                            {/* Clear button or search icon */}
                            {filterCity.length > 0 ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
                                        setFilterCity('');
                                        setShowCitySuggestions(false);
                                        setCitySuggestions([]);
                                    }}
                                    style={styles.clearButton}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ color: theme.textSecondary, fontSize: 18, lineHeight: 20 }}>×</Text>
                                </TouchableOpacity>
                            ) : (
                                <Search size={15} color={theme.textSecondary} strokeWidth={2} />
                            )}
                        </View>

                        {/* City Autocomplete Suggestions */}
                        {showCitySuggestions && citySuggestions.length > 0 && (
                            <View style={[styles.citySuggestionsContainer, {
                                backgroundColor: isDarkMode ? theme.card : '#fff',
                                borderColor: theme.border,
                                shadowColor: '#000',
                            }]}>
                                {citySuggestions.map((city, index) => (
                                    <TouchableOpacity
                                        key={city}
                                        style={[
                                            styles.citySuggestionItem,
                                            {
                                                borderBottomColor: theme.border,
                                                borderBottomWidth: index < citySuggestions.length - 1 ? StyleSheet.hairlineWidth : 0,
                                            }
                                        ]}
                                        onPress={() => handleCitySelect(city)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.citySuggestionText, { color: theme.textPrimary }]}>
                                            {city}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Sort Pills Only */}
                    <View style={styles.filterSection}>
                        <SortPills />
                    </View>

                    {/* Sitters Count + GPS indicator */}
                    <View style={[styles.sittersHeader, { borderTopColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                        {!isLoading && sortedSitters.length > 0 && (
                            <Text style={[styles.sittersHeaderTitle, { color: theme.textSecondary }]}>
                                {t('babysitter.sittersCount', { count: sortedSitters.length.toString() })}{activeCity ? ` ${t('babysitter.inCity', { city: activeCity })}` : showingAllFallback ? ` ${t('babysitter.nationwide')}` : userLocation ? ` ${t('babysitter.inYourArea')}` : ` ${t('babysitter.available')}`}
                            </Text>
                        )}
                        {userLocation && !activeCity && (
                            <View style={[styles.gpsActivePill, {
                                backgroundColor: isDarkMode ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.10)',
                            }]}>
                                <MapPin size={10} color="#10B981" strokeWidth={2.5} />
                                <Text style={styles.gpsActiveText}>{t('sitter.sortByProximity')}</Text>
                            </View>
                        )}
                    </View>

                    {/* Sitters List - Switched to FlatList */}
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.textPrimary} />
                        </View>
                    ) : sortedSitters.length === 0 ? (
                        <View style={styles.emptyState}>
                            {sortBy === 'favorites' ? (
                                <>
                                    <View style={styles.emptyIconOuter}>
                                        <View style={styles.emptyIconInner}>
                                            <Heart size={32} color="#EF4444" strokeWidth={2} fill="#EF4444" />
                                        </View>
                                    </View>
                                    <View style={styles.emptyTextGroup}>
                                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('babysitter.noFavoritesYet')}</Text>
                                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{t('babysitter.tapHeartToAdd')}</Text>
                                    </View>
                                </>
                            ) : activeCity ? (
                                <>
                                    <MapPin size={52} color={theme.border} strokeWidth={1} />
                                    <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('babysitter.noSittersInCity', { city: activeCity })}</Text>
                                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('babysitter.tryAnotherCity')}</Text>
                                </>
                            ) : (
                                <>
                                    <View style={styles.emptyIconOuter}>
                                        <View style={styles.emptyIconInner}>
                                            <MapPin size={38} color={theme.textSecondary} strokeWidth={1.2} />
                                        </View>
                                    </View>
                                    <View style={styles.emptyTextGroup}>
                                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                                            {t('babysitter.noSittersInArea')}
                                        </Text>
                                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                                            {t('babysitter.newSittersJoining')}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    ) : (
                        <FlatList
                            data={sortedSitters}
                            renderItem={renderSitterItem}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                            }
                            contentContainerStyle={styles.scrollContent}
                            ListFooterComponent={<View style={{ height: 180 }} />}
                            initialNumToRender={5}
                            windowSize={10}
                        />
                    )}
                </>
            <DynamicPromoModal
                currentScreenName="BabySitter"
                onNavigateToPaywall={() => setIsPaywallOpen(true)}
            />
            <PremiumPaywall
                visible={isPaywallOpen}
                onClose={() => setIsPaywallOpen(false)}
                trigger="promo_modal_babysitter"
            />
        </View>
    );
};

// Premium Shadow System - 3 Levels
const SHADOWS = {
    subtle: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    elevated: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
    },
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        paddingTop: Platform.OS === 'ios' ? 58 : 44,
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    headerBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    bookingsButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    userPhoto: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    userPhotoPlaceholder: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Mode Toggle - Monochromatic pill
    modeToggle: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 4,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 11,
    },
    modeBtnActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },
    modeBtnText: {
        fontSize: 13,
    },

    // Parent Actions Header
    parentActionsHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    blockedUsersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    blockedUsersText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Filter Section
    filterSection: {
        paddingVertical: 10,
    },
    resultsCount: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
        marginBottom: 10,
    },

    // Sitters Header - Clean & Minimal
    sittersHeader: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 8,
        marginBottom: 2,
    },
    sittersHeaderTitle: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'right',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    sortRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingRight: 20,
        paddingLeft: 8,
        paddingVertical: 2,
    },
    sortPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    sortPillText: {
        fontSize: 13,
    },

    // Sitter Card - STYLES MOVED TO SitterCard.tsx, keeping scrollContent
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
    },

    // Loading & Empty
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingBottom: 60,
    },
    emptyIconOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(0,0,0,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTextGroup: {
        alignItems: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.4,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: '400',
        textAlign: 'center',
        opacity: 0.6,
        lineHeight: 20,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
        lineHeight: 20,
    },

    // Registration CTA - Enhanced with elevated shadow
    registrationContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    registrationCard: {
        alignItems: 'center',
        padding: 32,
        borderRadius: 20,
        gap: 12,
        ...SHADOWS.elevated,
    },
    registrationTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginTop: 8,
    },
    registrationSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    registrationBtn: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginTop: 8,
        ...SHADOWS.medium,
    },
    registrationBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },

    // Sitter Mode
    sitterModeContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: 160,
        gap: 12,
    },
    sitterModeTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    sitterModeSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    dashboardBtn: {
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 12,
        marginTop: 8,
        ...SHADOWS.medium,
    },
    dashboardBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },

    // Mutual Friends Styles
    mutualFriendsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    mutualAvatars: {
        flexDirection: 'row',
    },
    mutualAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
    },
    mutualText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // GPS Active indicator
    gpsActivePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    gpsActiveText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#10B981',
    },

    // Location filter styles - Enhanced with medium shadow
    locationSection: {
        paddingHorizontal: 20,
        marginTop: 12,
        marginBottom: 4,
        position: 'relative',
        zIndex: 10,
    },
    locationButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        ...SHADOWS.subtle,
    },
    locationInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        paddingVertical: 0,
        minHeight: 20,
    },
    clearButton: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    citySuggestionsContainer: {
        position: 'absolute',
        top: '100%',
        left: 20,
        right: 20,
        marginTop: 4,
        borderRadius: 16,
        borderWidth: 1,
        maxHeight: 200,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
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

    // Legacy city filter (kept for reference)
    cityFilterContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    cityFilterInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },

    // Radius Filter Styles
    filtersContainer: {
        paddingBottom: 10,
    },
});

export default BabySitterScreen;
