// services/revenueCatService.ts - RevenueCat Integration
import Purchases, {
    PurchasesPackage,
    CustomerInfo,
    PurchasesOfferings
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

// RevenueCat API Keys (get from RevenueCat Dashboard)
const REVENUECAT_API_KEY_IOS = 'YOUR_IOS_API_KEY'; // TODO: Replace with real key
const REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY'; // TODO: Replace with real key

// Entitlement ID (what the user gets when they subscribe)
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// Check if running in Expo Go (RevenueCat doesn't work there)
const isExpoGo = Constants.appOwnership === 'expo';

/**
 * Initialize RevenueCat SDK
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
    // Skip in Expo Go - RevenueCat only works in development builds
    if (isExpoGo) {
        logger.debug('⚠️', 'RevenueCat skipped in Expo Go - use dev build for IAP testing');
        return;
    }

    try {
        const apiKey = Platform.OS === 'ios'
            ? REVENUECAT_API_KEY_IOS
            : REVENUECAT_API_KEY_ANDROID;

        Purchases.configure({ apiKey });

        // Identify user if logged in
        if (userId) {
            await Purchases.logIn(userId);
            logger.debug('🔑', 'RevenueCat initialized for user:', userId);
        } else {
            logger.debug('🔑', 'RevenueCat initialized (anonymous)');
        }
    } catch (error) {
        logger.error('❌ RevenueCat init failed:', error);
    }
}

/**
 * Get current offerings (available packages)
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
    if (isExpoGo) return null;

    try {
        const offerings = await Purchases.getOfferings();
        logger.debug('💰', 'Offerings loaded:', offerings.current?.identifier);
        return offerings;
    } catch (error) {
        logger.error('❌ Failed to get offerings:', error);
        return null;
    }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
    if (isExpoGo) return null;

    try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        logger.debug('✅', 'Purchase successful');
        return customerInfo;
    } catch (error: any) {
        if (error.userCancelled) {
            logger.debug('ℹ️', 'User cancelled purchase');
        } else {
            logger.error('❌ Purchase failed:', error);
        }
        return null;
    }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
    if (isExpoGo) return null;

    try {
        const customerInfo = await Purchases.restorePurchases();
        logger.debug('🔄', 'Purchases restored');
        return customerInfo;
    } catch (error) {
        logger.error('❌ Restore failed:', error);
        return null;
    }
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
    if (isExpoGo) return null;

    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return customerInfo;
    } catch (error) {
        logger.error('❌ Failed to get customer info:', error);
        return null;
    }
}

/**
 * Check if user has premium entitlement
 */
export function isPremiumUser(customerInfo: CustomerInfo | null): boolean {
    if (!customerInfo) return false;
    return typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
}

/**
 * Identify user (call after login)
 */
export async function identifyUser(userId: string): Promise<void> {
    if (isExpoGo) return;

    try {
        await Purchases.logIn(userId);
        logger.debug('🔑', 'User identified:', userId);
    } catch (error) {
        logger.error('❌ Failed to identify user:', error);
    }
}

/**
 * Logout (call on sign out)
 */
export async function logoutRevenueCat(): Promise<void> {
    if (isExpoGo) return;

    try {
        await Purchases.logOut();
        logger.debug('👋', 'RevenueCat logged out');
    } catch (error) {
        logger.error('❌ RevenueCat logout failed:', error);
    }
}
