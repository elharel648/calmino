// context/PremiumContext.tsx - Premium Subscription State Management
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PurchasesPackage, PurchasesOfferings, CustomerInfo } from 'react-native-purchases';
import { auth } from '../services/firebaseConfig';
import {
    initializeRevenueCat,
    getOfferings,
    purchasePackage,
    restorePurchases,
    getCustomerInfo,
    isPremiumUser,
    identifyUser,
    logoutRevenueCat,
} from '../services/revenueCatService';
import { logger } from '../utils/logger';

// Feature limits for free users
export const FREE_LIMITS = {
    maxChildren: 1,
    maxFamilyMembers: 2,
    maxBabysitterBookingsPerMonth: 1,
    reportHistoryDays: 7,
    canExport: false,
    hasAds: true,
};

// Feature access for premium users
export const PREMIUM_ACCESS = {
    maxChildren: Infinity,
    maxFamilyMembers: Infinity,
    maxBabysitterBookingsPerMonth: Infinity,
    reportHistoryDays: Infinity,
    canExport: true,
    hasAds: false,
};

interface PremiumContextType {
    isPremium: boolean;
    isLoading: boolean;
    offerings: PurchasesOfferings | null;
    customerInfo: CustomerInfo | null;

    // Actions
    purchase: (pkg: PurchasesPackage) => Promise<boolean>;
    restore: () => Promise<boolean>;
    refresh: () => Promise<void>;

    // Feature checks
    getLimit: (feature: keyof typeof FREE_LIMITS) => number | boolean;
    canUseFeature: (feature: keyof typeof FREE_LIMITS) => boolean;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
    children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

    // Initialize RevenueCat
    useEffect(() => {
        const init = async () => {
            try {
                const userId = auth.currentUser?.uid;
                await initializeRevenueCat(userId);

                // Load offerings and customer info
                const [off, info] = await Promise.all([
                    getOfferings(),
                    getCustomerInfo(),
                ]);

                setOfferings(off);
                setCustomerInfo(info);
                setIsPremium(isPremiumUser(info));
            } catch (error) {
                logger.error('❌ Premium init failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    // Re-identify when user changes
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                await identifyUser(user.uid);
                const info = await getCustomerInfo();
                setCustomerInfo(info);
                setIsPremium(isPremiumUser(info));
            } else {
                await logoutRevenueCat();
                setCustomerInfo(null);
                setIsPremium(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Purchase a package
    const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
        setIsLoading(true);
        try {
            const info = await purchasePackage(pkg);
            if (info) {
                setCustomerInfo(info);
                setIsPremium(isPremiumUser(info));
                return true;
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Restore purchases
    const restore = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        try {
            const info = await restorePurchases();
            if (info) {
                setCustomerInfo(info);
                setIsPremium(isPremiumUser(info));
                return isPremiumUser(info);
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Refresh status
    const refresh = useCallback(async (): Promise<void> => {
        const info = await getCustomerInfo();
        setCustomerInfo(info);
        setIsPremium(isPremiumUser(info));
    }, []);

    // Get limit for a feature
    const getLimit = useCallback((feature: keyof typeof FREE_LIMITS): number | boolean => {
        return isPremium ? PREMIUM_ACCESS[feature] : FREE_LIMITS[feature];
    }, [isPremium]);

    // Check if user can use a feature
    const canUseFeature = useCallback((feature: keyof typeof FREE_LIMITS): boolean => {
        const limit = getLimit(feature);
        return typeof limit === 'boolean' ? limit : limit > 0;
    }, [getLimit]);

    return (
        <PremiumContext.Provider
            value={{
                isPremium,
                isLoading,
                offerings,
                customerInfo,
                purchase,
                restore,
                refresh,
                getLimit,
                canUseFeature,
            }}
        >
            {children}
        </PremiumContext.Provider>
    );
};

/**
 * Hook to access premium context
 */
export const usePremium = (): PremiumContextType => {
    const context = useContext(PremiumContext);
    if (!context) {
        throw new Error('usePremium must be used within a PremiumProvider');
    }
    return context;
};

/**
 * Hook to check if a specific feature is available
 */
export const usePremiumFeature = (feature: keyof typeof FREE_LIMITS): boolean => {
    const { canUseFeature } = usePremium();
    return canUseFeature(feature);
};

export default PremiumContext;
