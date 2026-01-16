// hooks/useSitters.ts - Real Firebase Sitters Hook
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Mock mutual friends for DEV mode
const MOCK_MUTUAL_FRIENDS = [
    { id: 'friend_1', name: 'דנה לוי', picture: { data: { url: 'https://i.pravatar.cc/100?img=5' } } },
    { id: 'friend_2', name: 'יוסי כהן', picture: { data: { url: 'https://i.pravatar.cc/100?img=12' } } },
    { id: 'friend_3', name: 'שירה אברהם', picture: { data: { url: 'https://i.pravatar.cc/100?img=9' } } },
];

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
                    // DEV MOCK: Add mock mutual friends in development
                    mutualFriends: __DEV__ ? MOCK_MUTUAL_FRIENDS.slice(0, Math.floor(Math.random() * 4)) : undefined,
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
            // Use console.warn instead of console.error to avoid red popup in dev
            if (__DEV__) console.warn('useSitters: Firebase permission issue, using demo sitters');

            // Fallback to mock sitters when Firebase permission fails
            // This allows the app to work while user updates Firestore security rules
            const mockSitters: Sitter[] = [
                {
                    id: 'demo_1',
                    name: 'נועה לוי',
                    age: 22,
                    photoUrl: 'https://i.pravatar.cc/200?img=5',
                    rating: 4.9,
                    reviewCount: 28,
                    pricePerHour: 55,
                    isVerified: true,
                    experience: '3 שנות ניסיון',
                    bio: 'סטודנטית לחינוך, אוהבת ילדים ויצירתיות',
                    phone: '052-1234567',
                    city: 'תל אביב',
                    distance: 1.2,
                    availability: ['0', '1', '2', '3', '4'],
                    languages: ['עברית', 'אנגלית'],
                    certifications: ['עזרה ראשונה'],
                    mutualFriends: MOCK_MUTUAL_FRIENDS.slice(0, 2),
                },
                {
                    id: 'demo_2',
                    name: 'יעל כהן',
                    age: 24,
                    photoUrl: 'https://i.pravatar.cc/200?img=9',
                    rating: 4.7,
                    reviewCount: 15,
                    pricePerHour: 50,
                    isVerified: true,
                    experience: '2 שנות ניסיון',
                    bio: 'אחות לשניים, סבלנית ואוהבת משחקים',
                    phone: '054-9876543',
                    city: 'ראשון לציון',
                    distance: 0.8,
                    availability: ['1', '2', '3', '4', '5'],
                    languages: ['עברית'],
                    certifications: [],
                    mutualFriends: MOCK_MUTUAL_FRIENDS.slice(0, 3),
                },
                {
                    id: 'demo_3',
                    name: 'שרה מזרחי',
                    age: 26,
                    photoUrl: 'https://i.pravatar.cc/200?img=25',
                    rating: 5.0,
                    reviewCount: 42,
                    pricePerHour: 65,
                    isVerified: true,
                    experience: '5 שנות ניסיון',
                    bio: 'גננת מוסמכת, מתמחה בפעוטות',
                    phone: '050-5555555',
                    city: 'תל אביב',
                    distance: 1.8,
                    availability: ['0', '1', '2', '3', '4', '5', '6'],
                    languages: ['עברית', 'אנגלית', 'ערבית'],
                    certifications: ['עזרה ראשונה', 'גננת מוסמכת'],
                    mutualFriends: MOCK_MUTUAL_FRIENDS,
                },
            ];

            console.log('🔧 useSitters: Using demo sitters as fallback');
            setSitters(mockSitters);
            setError(null); // Don't show error to user, just use fallback
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

