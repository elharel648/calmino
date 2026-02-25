import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPromoConfig, initRemoteConfig } from '../services/remoteConfigService';
import { logger } from '../utils/logger';

const SEEN_PROMOS_KEY = '@seen_promos';

export const useDynamicPromo = (currentScreenName: string) => {
    const [showPromo, setShowPromo] = useState(false);
    const [promoData, setPromoData] = useState(getPromoConfig());
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const checkPromo = async () => {
            try {
                // Ensure we await the fetch from Firestore, ignoring cache duration based on my recent edit
                await initRemoteConfig();

                // Get fresh properties after await
                const config = getPromoConfig();
                setPromoData(config);

                logger.info(`[DynamicPromo] Fetched config: isActive=${config.isActive}, id=${config.id}, targetScreen=${config.targetScreen}, currentScreen=${currentScreenName}`);

                // 1. Check if the promo is globally active
                if (config.isActive !== true) {
                    logger.info(`[DynamicPromo] Promo is not active globally.`);
                    setIsReady(true);
                    return;
                }

                // 2. Check if the current screen targets this promo
                if (config.targetScreen !== 'All' && config.targetScreen !== currentScreenName) {
                    logger.info(`[DynamicPromo] Target screen mismatch. Expected ${config.targetScreen}, strictly matched ${currentScreenName}`);
                    setIsReady(true);
                    return;
                }

                // 3. Check if the user has already seen and dismissed this specific promo ID
                const seenPromosStr = await AsyncStorage.getItem(SEEN_PROMOS_KEY);
                const seenPromos = seenPromosStr ? JSON.parse(seenPromosStr) : [];

                if (seenPromos.includes(config.id)) {
                    logger.info(`[DynamicPromo] Promo ${config.id} was already seen by user.`);
                    setIsReady(true);
                    return;
                }

                // All checks passed!
                logger.info(`[DynamicPromo] All checks passed! Showing promo ${config.id}`);
                setShowPromo(true);
            } catch (e) {
                logger.error('Error checking dynamic promo', e);
            } finally {
                setIsReady(true);
            }
        };

        checkPromo();
    }, [currentScreenName]); // Re-run when screen changes

    const dismissPromo = async () => {
        // Hide immediately for best UX
        setShowPromo(false);

        try {
            // Save to AsyncStorage so it doesn't pop up again
            const seenPromosStr = await AsyncStorage.getItem(SEEN_PROMOS_KEY);
            const seenPromos = seenPromosStr ? JSON.parse(seenPromosStr) : [];

            if (!seenPromos.includes(promoData.id)) {
                seenPromos.push(promoData.id);
                await AsyncStorage.setItem(SEEN_PROMOS_KEY, JSON.stringify(seenPromos));
            }
        } catch (e) {
            logger.error('Error saving dismissed promo', e);
        }
    };

    return { showPromo, promoData, dismissPromo, isReady };
};
