// hooks/useSitters.ts - Production Firebase Sitters Hook
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

    const fetchSitters = useCallback(async () => {
        console.log('🔧 useSitters: fetchSitters START');
        setIsLoading(true);
        setError(null);

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
            setSitters(fetchedSitters);

        } catch (err) {
            // Silent fail - just show empty state (user needs to update Firebase rules)
            console.warn('useSitters: Firebase permission issue');
            setSitters([]);
            setError(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSitters();
    }, [fetchSitters]);

    return {
        sitters,
        isLoading,
        error,
        refetch: fetchSitters,
    };
};

export default useSitters;

