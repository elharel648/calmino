import { logger } from '../utils/logger';
// services/navigationService.ts
// Global navigation service for deep linking from notifications

import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from anywhere (e.g., notification handler)
 * Retries up to 3 seconds with 300ms intervals for cold-start scenarios
 */
export function navigate(name: string, params?: object) {
    const doNavigate = () => {
        navigationRef.dispatch(
            CommonActions.navigate({
                name,
                params,
            })
        );
    };

    if (navigationRef.isReady()) {
        doNavigate();
    } else {
        // Navigation not ready (cold start from notification tap)
        // Retry with 300ms intervals, up to 10 attempts (3 seconds total)
        logger.log('⏳ Navigation not ready, will retry:', name);
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 300;

        const retry = () => {
            if (navigationRef.isReady()) {
                logger.log('✅ Navigation ready after', retryCount, 'retries, navigating to:', name);
                doNavigate();
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(retry, retryInterval);
            } else {
                logger.log('❌ Navigation still not ready after', maxRetries, 'retries');
            }
        };
        setTimeout(retry, retryInterval);
    }
}

// Import language context - we'll need to get translations dynamically
let getTranslation: ((key: string) => string) | null = null;

export function setTranslationFunction(translator: (key: string) => string) {
    getTranslation = translator;
}

/**
 * Navigate to Home tab
 */
export function navigateToHome() {
    const homeTab = getTranslation ? getTranslation('navigation.home') : 'בית';
    navigate(homeTab);
}

/**
 * Navigate to Reports tab
 */
export function navigateToReports() {
    const reportsTab = getTranslation ? getTranslation('navigation.reports') : 'סטטיסטיקות';
    navigate(reportsTab);
}

/**
 * Navigate to Notifications screen
 */
export function navigateToNotifications() {
    if (navigationRef.isReady()) {
        const homeTab = getTranslation ? getTranslation('navigation.home') : 'בית';
        navigationRef.dispatch(
            CommonActions.navigate({
                name: homeTab,
                params: {
                    screen: 'Notifications',
                },
            })
        );
    }
}

/**
 * Navigate based on notification type
 */
export function navigateFromNotification(type: string, data?: any) {
    logger.log('🔔 Navigating from notification:', type);

    switch (type) {
        case 'feeding_reminder':
        case 'sleep_reminder':
        case 'supplement_reminder':
            // Go to home to log the event
            navigateToHome();
            break;

        case 'daily_summary':
            // Go to reports
            navigateToReports();
            break;

        case 'vaccine_reminder':
            // Go to notifications screen
            navigateToNotifications();
            break;

        default:
            // Default: go to notifications screen
            navigateToNotifications();
            break;
    }
}
