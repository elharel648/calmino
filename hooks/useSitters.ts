// hooks/useSitters.ts - Production Firebase Sitters Hook with Caching
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@sitters_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export interface MutualFriend {
    id: string;
    name: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

export interface Sitter {
    id: string;
    name: string;
    age: number;
    photoUrl: string | null;
    rating: number;
    reviewCount: number;
    pricePerHour: number;
    isVerified: boolean;
    experience: string;
    bio: string;
    phone?: string; // Contact phone number
    distance?: number;
    availability: string[];
    languages: string[];
    certifications: string[];
    mutualFriends?: MutualFriend[]; // Facebook mutual friends
    badges?: string[]; // Sitter badges
    isAvailable?: boolean; // Currently available
    createdAt?: Date | any; // Account creation date
    // Location fields for city + GPS search
    city?: string; // City name (e.g., "תל אביב")
    location?: {
        latitude: number;
        longitude: number;
    };
}

/**
 * Custom Hook לניהול רשימת בייביסיטרים מ-Firebase
 */
const useSitters = () => {
    console.log('🔧 useSitters: HOOK CALLED');
    const [sitters, setSitters] = useState<Sitter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastFetchRef = useRef<number>(0);

    // Load from cache
    const loadFromCache = useCallback(async (): Promise<Sitter[] | null> => {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is still valid
            if (now - timestamp < CACHE_EXPIRY_MS) {
                console.log('📦 useSitters: Loading from cache');
                return data;
            }

            // Cache expired, remove it
            await AsyncStorage.removeItem(CACHE_KEY);
            return null;
        } catch (error) {
            console.warn('useSitters: Error loading cache:', error);
            return null;
        }
    }, []);

    // Save to cache
    const saveToCache = useCallback(async (data: Sitter[]) => {
        try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now(),
            }));
            console.log('💾 useSitters: Saved to cache');
        } catch (error) {
            console.warn('useSitters: Error saving cache:', error);
        }
    }, []);

    const fetchSitters = useCallback(async (forceRefresh = false) => {
        console.log('🔧 useSitters: fetchSitters START', { forceRefresh });
        
        // Try to load from cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedSitters = await loadFromCache();
            if (cachedSitters && cachedSitters.length > 0) {
                setSitters(cachedSitters);
                setIsLoading(false);
                // Fetch in background to update cache
                fetchSitters(true).catch(() => {});
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        lastFetchRef.current = Date.now();

        // 🔧 Always fetch real sitters from Firebase (even in DEV mode)
        // Mock data will be used as fallback only when no real sitters found

        try {
            // Query registered sitters from Firebase
            const q = query(
                collection(db, 'users'),
                where('isSitter', '==', true),
                where('sitterActive', '==', true)
            );

            const snapshot = await getDocs(q);
            console.log('🔧 useSitters: Found', snapshot.size, 'sitters in Firebase');
            const fetchedSitters: Sitter[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // Validate and sanitize numeric values
                const rating = typeof data.sitterRating === 'number' && !isNaN(data.sitterRating) && data.sitterRating >= 0 
                    ? Math.max(0, Math.min(5, data.sitterRating)) // Clamp between 0-5
                    : 0;
                const pricePerHour = typeof data.sitterPrice === 'number' && !isNaN(data.sitterPrice) && data.sitterPrice > 0
                    ? Math.max(0, data.sitterPrice)
                    : 50;
                const reviewCount = typeof data.sitterReviewCount === 'number' && !isNaN(data.sitterReviewCount) && data.sitterReviewCount >= 0
                    ? Math.max(0, data.sitterReviewCount)
                    : 0;
                const age = typeof data.age === 'number' && !isNaN(data.age) && data.age > 0
                    ? Math.max(0, Math.min(120, data.age)) // Clamp between 0-120
                    : 0;
                
                fetchedSitters.push({
                    id: doc.id,
                    name: (data.displayName && typeof data.displayName === 'string') ? data.displayName : 'סיטר',
                    age,
                    photoUrl: (data.photoUrl && typeof data.photoUrl === 'string') ? data.photoUrl : null,
                    rating,
                    reviewCount,
                    pricePerHour,
                    isVerified: Boolean(data.sitterVerified),
                    experience: (data.sitterExperience && typeof data.sitterExperience === 'string') ? data.sitterExperience : '',
                    bio: (data.sitterBio && typeof data.sitterBio === 'string') ? data.sitterBio : '',
                    phone: (data.phone && typeof data.phone === 'string') ? data.phone : undefined,
                    distance: 0, // Will be calculated based on user location
                    availability: Array.isArray(data.sitterAvailability) ? data.sitterAvailability : [],
                    languages: Array.isArray(data.sitterLanguages) && data.sitterLanguages.length > 0 ? data.sitterLanguages : ['עברית'],
                    certifications: Array.isArray(data.sitterCertifications) ? data.sitterCertifications : [],
                    // Location fields
                    city: (data.sitterCity && typeof data.sitterCity === 'string') ? data.sitterCity : undefined,
                    location: (data.sitterLocation && 
                               typeof data.sitterLocation === 'object' &&
                               typeof data.sitterLocation.latitude === 'number' &&
                               typeof data.sitterLocation.longitude === 'number' &&
                               !isNaN(data.sitterLocation.latitude) &&
                               !isNaN(data.sitterLocation.longitude) &&
                               data.sitterLocation.latitude >= -90 && data.sitterLocation.latitude <= 90 &&
                               data.sitterLocation.longitude >= -180 && data.sitterLocation.longitude <= 180)
                        ? data.sitterLocation
                        : undefined,
                });
            });

            console.log('🔧 useSitters: fetchedSitters.length =', fetchedSitters.length);

            // In production, if no sitters found, show empty state (no mock data)
            if (fetchedSitters.length === 0) {
                console.log('📭 useSitters: No sitters found in database');
                setSitters([]);
                setIsLoading(false);
                return;
            }

            // Sort by rating by default (with validation)
            fetchedSitters.sort((a, b) => {
                const ratingA = typeof a.rating === 'number' && !isNaN(a.rating) ? a.rating : 0;
                const ratingB = typeof b.rating === 'number' && !isNaN(b.rating) ? b.rating : 0;
                return ratingB - ratingA;
            });
            
            // Save to cache
            await saveToCache(fetchedSitters);
            
            // Only update state if this is the latest fetch
            if (Date.now() - lastFetchRef.current < 1000) {
                setSitters(fetchedSitters);
            }

        } catch (err) {
            // Silent fail - just show empty state (user needs to update Firebase rules)
            console.warn('useSitters: Firebase permission issue');
            setSitters([]);
            setError(null);
        } finally {
            setIsLoading(false);
        }
    }, [loadFromCache, saveToCache]);

    useEffect(() => {
        fetchSitters();
    }, [fetchSitters]);

    return {
        sitters,
        isLoading,
        error,
        refetch: () => fetchSitters(true), // Force refresh
    };
};

export default useSitters;

