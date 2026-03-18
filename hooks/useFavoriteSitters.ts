import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';
import { logger } from '../utils/logger';

export const useFavoriteSitters = () => {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

    const fetchFavorites = useCallback(async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setIsLoadingFavorites(false);
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setFavorites(data.favoriteSitters || []);
            }
        } catch (error) {
            logger.error('Error fetching favorite sitters:', error);
        } finally {
            setIsLoadingFavorites(false);
        }
    }, []);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const toggleFavorite = async (sitterId: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const isFavorite = favorites.includes(sitterId);

        // Optimistic update
        setFavorites(prev =>
            isFavorite ? prev.filter(id => id !== sitterId) : [...prev, sitterId]
        );

        try {
            const userRef = doc(db, 'users', userId);
            if (isFavorite) {
                await updateDoc(userRef, {
                    favoriteSitters: arrayRemove(sitterId)
                });
            } else {
                await updateDoc(userRef, {
                    favoriteSitters: arrayUnion(sitterId)
                });
            }
        } catch (error) {
            logger.error('Error toggling favorite sitter:', error);
            // Revert optimistic update on error
            setFavorites(prev =>
                isFavorite ? [...prev, sitterId] : prev.filter(id => id !== sitterId)
            );
        }
    };

    return { favorites, isLoadingFavorites, toggleFavorite };
};
