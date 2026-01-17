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
                fetchedSitters.push({
                    id: doc.id,
                    name: data.displayName || 'סיטר',
                    age: data.age || 0,
                    photoUrl: data.photoUrl || null,
                    rating: data.sitterRating || 0,
                    reviewCount: data.sitterReviewCount || 0,
                    pricePerHour: data.sitterPrice || 50,
                    isVerified: data.sitterVerified || false,
                    experience: data.sitterExperience || '',
                    bio: data.sitterBio || '',
                    phone: data.phone || undefined,
                    distance: 0, // Will be calculated based on user location
                    availability: data.sitterAvailability || [],
                    languages: data.sitterLanguages || ['עברית'],
                    certifications: data.sitterCertifications || [],
                    // Location fields
                    city: data.sitterCity || undefined,
                    location: data.sitterLocation || undefined,
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

            // Sort by rating by default
            fetchedSitters.sort((a, b) => b.rating - a.rating);
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

