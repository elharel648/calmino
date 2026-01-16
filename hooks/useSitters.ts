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

        // 🔧 DEV MOCK: Bypass Firebase entirely in development mode
        if (__DEV__) {
            console.log('🔧 DEV MOCK: Returning mock sitters immediately');
            const mockSitters: Sitter[] = [
                {
                    id: 'mock_1',
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
                    distance: 1.2,
                    availability: ['0', '1', '2', '3', '4'],
                    languages: ['עברית', 'אנגלית'],
                    certifications: ['עזרה ראשונה'],
                    mutualFriends: MOCK_MUTUAL_FRIENDS.slice(0, 2),
                },
                {
                    id: 'mock_2',
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
                    distance: 0.8,
                    availability: ['1', '2', '3', '4', '5'],
                    languages: ['עברית'],
                    certifications: [],
                    mutualFriends: MOCK_MUTUAL_FRIENDS.slice(0, 3),
                },
                {
                    id: 'mock_3',
                    name: 'דניאל אברהם',
                    age: 20,
                    photoUrl: 'https://i.pravatar.cc/200?img=12',
                    rating: 4.5,
                    reviewCount: 8,
                    pricePerHour: 45,
                    isVerified: false,
                    experience: 'שנה ניסיון',
                    bio: 'סטודנט לפסיכולוגיה, אוהב לקרוא סיפורים',
                    phone: undefined, // No phone - for testing fallback
                    distance: 2.5,
                    availability: ['3', '4', '5', '6'],
                    languages: ['עברית', 'צרפתית'],
                    certifications: [],
                    mutualFriends: MOCK_MUTUAL_FRIENDS.slice(0, 1),
                },
                {
                    id: 'mock_4',
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
                    distance: 1.8,
                    availability: ['0', '1', '2', '3', '4', '5', '6'],
                    languages: ['עברית', 'אנגלית', 'ערבית'],
                    certifications: ['עזרה ראשונה', 'גננת מוסמכת'],
                    mutualFriends: MOCK_MUTUAL_FRIENDS,
                },
                {
                    id: 'mock_5',
                    name: 'תמר רוזנברג',
                    age: 21,
                    photoUrl: 'https://i.pravatar.cc/200?img=32',
                    rating: 4.6,
                    reviewCount: 12,
                    pricePerHour: 48,
                    isVerified: true,
                    experience: '2 שנות ניסיון',
                    bio: 'אוהבת אומנות ויצירה עם ילדים',
                    phone: '053-3333333',
                    distance: 3.0,
                    availability: ['0', '2', '4', '6'],
                    languages: ['עברית'],
                    certifications: ['עזרה ראשונה'],
                    mutualFriends: [],
                },
            ];
            setSitters(mockSitters);
            setIsLoading(false);
            console.log('🔧 DEV MOCK: Mock sitters loaded:', mockSitters.length);
            return;
        }

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
                    phone: data.phone || undefined, // Include phone from Firebase
                    distance: 0, // Calculate based on location if needed
                    availability: data.sitterAvailability || [],
                    languages: data.sitterLanguages || ['עברית'],
                    certifications: data.sitterCertifications || [],
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
            console.error('🔧 useSitters: ERROR:', err);
            setError('שגיאה בטעינת בייביסיטרים');
            setSitters([]);
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

