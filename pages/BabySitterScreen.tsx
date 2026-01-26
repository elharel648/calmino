// pages/BabySitterScreen.tsx - Minimalist Parent Sitter Search
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    Platform,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import {
    Search, Briefcase, Star, ChevronRight,
    User, Award, UserPlus, MapPin, Calendar, Plus, Minus
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import useSitters, { Sitter } from '../hooks/useSitters';
import { calculateSitterBadges } from '../services/babysitterService';
import { BADGE_INFO, SitterBadge } from '../types/babysitter';
import { ISRAELI_CITIES } from '../constants/israeliCities';
import { logger } from '../utils/logger';

const BabySitterScreen = ({ navigation }: any) => {
    const { theme, isDarkMode } = useTheme();
    const { t } = useLanguage();

    // Hooks
    const { sitters, isLoading, refetch } = useSitters();

    // 🔧 DEBUG: Log when screen loads
    useEffect(() => {
        logger.debug('🔧', 'BabySitterScreen: Mounted! isLoading:', isLoading, 'sitters:', sitters.length);
    }, [sitters, isLoading]);

    // State
    const [userMode, setUserMode] = useState<'parent' | 'sitter'>('parent');
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance'>('rating');
    const [maxDistance, setMaxDistance] = useState<number | null>(null); // Radius filter
    const [isSitterRegistered, setIsSitterRegistered] = useState<boolean | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [filterCity, setFilterCity] = useState<string>(''); // Manual city filter
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
    const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // User location state
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
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

                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });

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
                            // Auto-filter by detected city - try to match with Israeli cities list
                            const normalizedCity = detectedCity.trim();
                            // Check exact match first
                            if (ISRAELI_CITIES.includes(normalizedCity)) {
                                setFilterCity(normalizedCity);
                            } else {
                                // Try to find similar city name (case-insensitive)
                                const matchedCity = ISRAELI_CITIES.find(city => 
                                    city.toLowerCase() === normalizedCity.toLowerCase() ||
                                    city.toLowerCase().includes(normalizedCity.toLowerCase()) ||
                                    normalizedCity.toLowerCase().includes(city.toLowerCase())
                                );
                                if (matchedCity) {
                                    setFilterCity(matchedCity);
                                }
                            }
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
        } catch {
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

    // Check sitter status on every screen focus
    useFocusEffect(
        useCallback(() => {
            if (userMode === 'sitter') {
                checkSitterStatus();
            }
        }, [userMode])
    );

    // Navigate directly to dashboard when sitter mode selected and user is registered
    const navigatedToDashboard = useRef(false);

    useEffect(() => {
        if (userMode === 'sitter' &&
            isSitterRegistered === true &&
            !checkingStatus &&
            !navigatedToDashboard.current) {
            navigatedToDashboard.current = true;
            navigation.navigate('SitterDashboard');

            // Reset to parent mode after navigation completes
            setTimeout(() => {
                setUserMode('parent');
                navigatedToDashboard.current = false;
            }, 100);
        }
    }, [userMode, isSitterRegistered, checkingStatus]);

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

    // Filter: Show all sitters by default, or filter by manually selected city (memoized)
    const sittersToShow = useMemo(() => {
        let filtered = processedSitters;

        // 1. Filter by manual city selection
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
        }

        // 2. Filter by Radius (Max Distance)
        if (maxDistance !== null && userLocation) {
            filtered = filtered.filter(s => {
                // If sitter has valid distance calculated
                if (typeof s.distance === 'number' && !isNaN(s.distance)) {
                    return s.distance <= maxDistance;
                }
                return false; // Exclude if distance unknown
            });
        }

        return filtered;
    }, [processedSitters, activeCity, maxDistance, userLocation]);

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
            name: (sitter.name && typeof sitter.name === 'string') ? sitter.name : 'סיטר',
            age: typeof sitter.age === 'number' && !isNaN(sitter.age) && sitter.age > 0 ? sitter.age : 0,
            image: (sitter.photoUrl && typeof sitter.photoUrl === 'string') ? sitter.photoUrl : 'https://i.pravatar.cc/200',
            rating,
            reviews,
            price,
            distance,
            phone: (sitter.phone && typeof sitter.phone === 'string') ? sitter.phone : undefined,
            bio: (sitter.bio && typeof sitter.bio === 'string') ? sitter.bio : '',
            reviewsList: [], // Reviews are fetched by SitterProfileScreen
        };

        try {
            navigation.navigate('SitterProfile', { sitterData });
        } catch (error) {
            logger.error('Navigation error:', error);
        }
    }, [navigation]);

    // ========== COMPONENTS ==========

    // Minimalist Sitter Card
    const SitterCard = ({ sitter }: { sitter: Sitter }) => {
        const mutualFriends = sitter.mutualFriends || [];
        const hasMutualFriends = mutualFriends.length > 0;
        const [imageError, setImageError] = useState(false);
        const [badges, setBadges] = useState<SitterBadge[]>([]);

        // Calculate badges on mount
        useEffect(() => {
            const loadBadges = async () => {
                try {
                    const calculatedBadges = await calculateSitterBadges(sitter.id, {
                        rating: sitter.rating,
                        reviewCount: sitter.reviewCount,
                        isAvailable: sitter.isAvailable,
                        createdAt: sitter.createdAt,
                    });
                    setBadges(calculatedBadges);
                } catch (error) {
                    // Silent fail
                }
            };
            if (sitter.id && !sitter.id.startsWith('mock_')) {
                loadBadges();
            }
        }, [sitter.id, sitter.rating, sitter.reviewCount]);

        return (
            <TouchableOpacity
                style={[styles.sitterCard, { backgroundColor: theme.card }]}
                onPress={() => handleSitterPress(sitter)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${sitter.name || 'סיטר'}, ${t('babysitter.rating')} ${(typeof sitter.rating === 'number' && !isNaN(sitter.rating) ? Math.max(0, Math.min(5, sitter.rating)) : 0).toFixed(1)}, ${t('babysitter.price')} ${typeof sitter.pricePerHour === 'number' && !isNaN(sitter.pricePerHour) ? Math.max(0, sitter.pricePerHour) : 50} ${t('babysitter.perHour')}`}
            >
                <View style={styles.sitterCardContent}>
                    {sitter.photoUrl && !imageError ? (
                        <Image
                            source={{ uri: sitter.photoUrl }}
                            style={styles.sitterPhoto}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={[styles.sitterPhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                            <User size={24} color={theme.textSecondary} />
                        </View>
                    )}
                    <View style={styles.sitterInfo}>
                        <View style={styles.sitterHeader}>
                            <Text style={[styles.sitterName, { color: theme.textPrimary }]}>{sitter.name}</Text>
                            {sitter.isVerified && (
                                <Award size={14} color={theme.success} strokeWidth={1.5} />
                            )}
                        </View>
                        {/* Badges */}
                        {badges.length > 0 && (
                            <View style={styles.badgesRow}>
                                {badges.slice(0, 2).map((badgeType) => {
                                    const badge = BADGE_INFO[badgeType];
                                    return (
                                        <View key={badgeType} style={[styles.badge, { backgroundColor: badge.bgColor }]}>
                                            {badge.icon && <Text style={styles.badgeIcon}>{badge.icon}</Text>}
                                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                        <View style={styles.sitterMeta}>
                            {typeof sitter.rating === 'number' && !isNaN(sitter.rating) && sitter.rating > 0 && (
                                <View style={styles.ratingBadge}>
                                    <Star size={12} color={theme.warning} fill={theme.warning} />
                                    <Text style={[styles.ratingText, { color: theme.textPrimary }]}>
                                        {Math.max(0, Math.min(5, sitter.rating)).toFixed(1)}
                                    </Text>
                                </View>
                            )}
                            {sitter.experience && (
                                <Text style={[styles.experienceText, { color: theme.textSecondary }]}>
                                    {sitter.experience}
                                </Text>
                            )}
                        </View>
                        {/* 🔥 חברים משותפים */}
                        {hasMutualFriends && mutualFriends.every(f => f.id && f.name) && (
                            <View style={styles.mutualFriendsRow}>
                                <View style={styles.mutualAvatars}>
                                    {mutualFriends.slice(0, 3).map((friend, index) => (
                                        <Image
                                            key={friend.id}
                                            source={{ uri: friend.picture?.data?.url || `https://i.pravatar.cc/50?u=${friend.id}` }}
                                            style={[
                                                styles.mutualAvatar,
                                                {
                                                    marginLeft: index > 0 ? -8 : 0,
                                                    zIndex: 3 - index,
                                                    borderColor: theme.card,
                                                    backgroundColor: theme.cardSecondary
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={[styles.mutualText, { color: theme.primary }]}>
                                    {t('babysitter.mutualFriends', { count: mutualFriends.length })}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.priceSection}>
                        <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>
                            ₪{typeof sitter.pricePerHour === 'number' && !isNaN(sitter.pricePerHour) ? Math.max(0, sitter.pricePerHour) : 50}
                        </Text>
                        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('babysitter.perHour')}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // Radius Filter Component
    const RadiusFilter = () => {
        // Only show if we have user location
        if (!userLocation) return null;

        const radii = [1, 3, 5, 10, 20, 50];

        return (
            <View style={styles.radiusRow}>
                <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>{t('babysitter.distanceFilter')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll}>
                    {/* "All" option */}
                    <TouchableOpacity
                        style={[
                            styles.radiusPill,
                            {
                                backgroundColor: maxDistance === null ? theme.primary : theme.card,
                                borderColor: maxDistance === null ? theme.primary : theme.border,
                            }
                        ]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMaxDistance(null);
                        }}
                    >
                        <Text style={[styles.radiusPillText, { color: maxDistance === null ? theme.card : theme.textPrimary }]}>
                            {t('common.all')}
                        </Text>
                    </TouchableOpacity>

                    {radii.map((radius) => (
                        <TouchableOpacity
                            key={radius}
                            style={[
                                styles.radiusPill,
                                {
                                    backgroundColor: maxDistance === radius ? theme.primary : theme.card,
                                    borderColor: maxDistance === radius ? theme.primary : theme.border,
                                }
                            ]}
                            onPress={() => {
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setMaxDistance(radius);
                            }}
                        >
                            <Text style={[styles.radiusPillText, { color: maxDistance === radius ? theme.card : theme.textPrimary }]}>
                                {radius} {t('units.km')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    // Sort Pills
    const SortPills = () => (
        <View style={styles.filtersContainer}>
            <RadiusFilter />
            <View style={styles.sortRow}>
                {(['rating', 'price', 'distance'] as const).map((sort) => (
                    <TouchableOpacity
                        key={sort}
                        style={[
                            styles.sortPill,
                            {
                                backgroundColor: sortBy === sort ? theme.textPrimary : 'transparent',
                                borderColor: theme.border,
                            }
                        ]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSortBy(sort);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('common.sortBy')} ${sort === 'rating' ? t('babysitter.sortByRating') : sort === 'price' ? t('babysitter.sortByPrice') : t('babysitter.sortByDistance')}`}
                        accessibilityState={{ selected: sortBy === sort }}
                    >
                        <Text style={[styles.sortPillText, { color: sortBy === sort ? theme.card : theme.textSecondary }]}>
                            {sort === 'rating' ? t('babysitter.sortByRating') :
                                sort === 'price' ? t('babysitter.sortByPrice') :
                                    t('babysitter.sortByDistance')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
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
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.back')}
                    >
                        <ChevronRight size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('babysitter.findSitter')}</Text>
                    <View style={styles.headerRight}>
                        {userMode === 'parent' && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('ParentBookings')}
                                style={styles.bookingsButton}
                                accessibilityRole="button"
                                accessibilityLabel="ההזמנות שלי"
                            >
                                <Calendar size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        )}
                        {userPhoto ? (
                            <Image source={{ uri: userPhoto }} style={styles.userPhoto} />
                        ) : (
                            <View style={[styles.userPhotoPlaceholder, { backgroundColor: theme.cardSecondary }]}>
                                <User size={16} color={theme.textSecondary} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Mode Toggle */}
                <View style={[styles.modeToggle, { backgroundColor: theme.cardSecondary }]}>
                    <TouchableOpacity
                        style={[styles.modeBtn, userMode === 'parent' && [styles.modeBtnActive, { backgroundColor: theme.card }]]}
                        onPress={() => setUserMode('parent')}
                        accessibilityRole="tab"
                        accessibilityLabel={t('babysitter.parentMode')}
                        accessibilityState={{ selected: userMode === 'parent' }}
                    >
                        <Search size={16} color={userMode === 'parent' ? theme.textPrimary : theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.modeBtnText, { color: userMode === 'parent' ? theme.textPrimary : theme.textSecondary }]}>
                            {t('babysitter.parentMode')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeBtn, userMode === 'sitter' && [styles.modeBtnActive, { backgroundColor: theme.card }]]}
                        onPress={() => setUserMode('sitter')}
                        accessibilityRole="tab"
                        accessibilityLabel={t('babysitter.sitterMode')}
                        accessibilityState={{ selected: userMode === 'sitter' }}
                    >
                        <Briefcase size={16} color={userMode === 'sitter' ? theme.textPrimary : theme.textSecondary} strokeWidth={1.5} />
                        <Text style={[styles.modeBtnText, { color: userMode === 'sitter' ? theme.textPrimary : theme.textSecondary }]}>
                            {t('babysitter.sitterMode')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Parent Mode Content */}
            {userMode === 'parent' && (
                <>
                    {/* Location Filter - Premium Minimalist Design */}
                    <View style={styles.locationSection}>
                        <View style={[styles.locationButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            {/* Search Icon - Left */}
                            <View style={[styles.locationIconContainer, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)' }]}>
                                <Search size={15} color={theme.primary} strokeWidth={2} />
                            </View>

                            {/* Input Field - Center */}
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
                                        // Show suggestions when focusing empty field
                                        const filtered = ISRAELI_CITIES.slice(0, 5);
                                        setCitySuggestions(filtered);
                                        setShowCitySuggestions(true);
                                    }
                                }}
                                onBlur={() => {
                                    // Delay hiding to allow selection
                                    if (autocompleteTimeoutRef.current) {
                                        clearTimeout(autocompleteTimeoutRef.current);
                                    }
                                    autocompleteTimeoutRef.current = setTimeout(() => {
                                        setShowCitySuggestions(false);
                                    }, 200);
                                }}
                                placeholder={userCity && ISRAELI_CITIES.includes(userCity) ? `${userCity} (אוטומטי)` : 'חפש לפי עיר...'}
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                                accessibilityLabel="חפש לפי עיר"
                                accessibilityHint="הקלד שם עיר כדי למצוא ביביסטרים באזור"
                            />

                            {/* Right Side - Clear or Location Icon */}
                            {filterCity.length > 0 ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (autocompleteTimeoutRef.current) {
                                            clearTimeout(autocompleteTimeoutRef.current);
                                        }
                                        setFilterCity('');
                                        setShowCitySuggestions(false);
                                        setCitySuggestions([]);
                                    }}
                                    style={[styles.clearButton, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)' }]}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ color: theme.textSecondary, fontSize: 20, fontWeight: '200', lineHeight: 20 }}>×</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={[styles.locationBadge, { backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.06)' }]}>
                                    <MapPin size={15} color={theme.primary} strokeWidth={2} />
                                </View>
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

                    {/* Sort & Count */}
                    <View style={styles.filterSection}>
                        <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
                            {t('babysitter.availableSitters', { count: sortedSitters.length })} {activeCity ? t('babysitter.inCity', { city: activeCity }) : ''}
                        </Text>
                        <SortPills />
                    </View>

                    {/* Sitters List */}
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    ) : sortedSitters.length === 0 ? (
                        <View style={styles.emptyState}>
                            <User size={48} color={theme.border} strokeWidth={1} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('babysitter.noSitters')}</Text>
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                            }
                            contentContainerStyle={styles.scrollContent}
                        >
                            {sortedSitters.map((sitter) => (
                                <SitterCard key={sitter.id} sitter={sitter} />
                            ))}
                            <View style={{ height: 100 }} />
                        </ScrollView>
                    )}
                </>
            )}

            {/* Sitter Mode */}
            {userMode === 'sitter' && (
                <>
                    {checkingStatus ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('babysitter.checkingStatus')}</Text>
                        </View>
                    ) : isSitterRegistered ? (
                        <SitterDashboardCTA />
                    ) : (
                        <SitterRegistrationCTA />
                    )}
                </>
            )}
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
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerRight: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    bookingsButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    userPhoto: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    userPhotoPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Mode Toggle
    modeToggle: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modeBtnActive: {},
    modeBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Filter Section
    filterSection: {
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    resultsCount: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
        marginBottom: 10,
    },
    sortRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    sortPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    sortPillText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Sitter Card - Enhanced with shadow
    scrollContent: {
        paddingHorizontal: 20,
    },
    sitterCard: {
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        ...SHADOWS.subtle,
    },
    sitterCardContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    sitterPhoto: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    sitterPhotoPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sitterInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    sitterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sitterName: {
        fontSize: 15,
        fontWeight: '600',
    },
    sitterMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
    },
    experienceText: {
        fontSize: 12,
    },
    badgesRow: {
        flexDirection: 'row-reverse',
        gap: 6,
        marginTop: 6,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeIcon: {
        fontSize: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    priceSection: {
        alignItems: 'center',
    },
    priceAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    priceLabel: {
        fontSize: 11,
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
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },

    // Registration CTA - Enhanced with elevated shadow
    registrationContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 120,
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

    // Location filter styles - Enhanced with medium shadow
    locationSection: {
        paddingHorizontal: 20,
        marginBottom: 16,
        position: 'relative',
        zIndex: 10,
    },
    locationButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        ...SHADOWS.subtle,
        gap: 10,
    },
    locationIconContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        paddingHorizontal: 6,
        paddingVertical: 0,
        minHeight: 20,
    },
    clearButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
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
    radiusRow: {
        marginBottom: 14,
    },
    filterLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
        paddingHorizontal: 20,
        textAlign: 'right',
    },
    radiusScroll: {
        paddingHorizontal: 20,
        gap: 8,
        flexDirection: 'row-reverse', // RTL
        paddingBottom: 4,
    },
    radiusPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 64,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.subtle,
    },
    radiusPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

export default BabySitterScreen;
