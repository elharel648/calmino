import { logger } from '../utils/logger';
// services/navigationService.ts
// Global navigation service for deep linking from notifications

import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import i18n from './i18n';
const t = i18n.t.bind(i18n);

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
    const homeTab = getTranslation ? getTranslation('navigation.home') : t('navigation.home');
    navigate(homeTab);
}

/**
 * Navigate to Reports tab
 */
export function navigateToReports() {
    const reportsTab = getTranslation ? getTranslation('navigation.reports') : t('navigation.reports');
    navigate(reportsTab);
}

/**
 * Navigate to Notifications screen
 */
export function navigateToNotifications() {
    if (navigationRef.isReady()) {
        const homeTab = getTranslation ? getTranslation('navigation.home') : t('navigation.home');
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
 * Route a structured deep-link payload (used by retention notifications).
 * `screen` is a semantic key — see RetentionDeepLinkScreen in
 * services/retention/notificationCopyConfig.ts — so copy/config never hard-code
 * localized route names. Returns true if it handled the navigation.
 */
export function navigateToDeepLinkScreen(screen?: string, params?: object): boolean {
    if (!screen) return false;
    logger.log('🔔 Deep-link navigate to screen:', screen, params);

    switch (screen) {
        // Retention deep-link targets. QUICK_ENTRY + DAILY_TIMELINE both live on
        // the Home screen (quick-action buttons + DailyTimeline); INSIGHTS_WEEKLY
        // maps to the Reports/statistics tab.
        case 'QUICK_ENTRY':
        case 'DAILY_TIMELINE':
            navigateToHome();
            return true;
        case 'INSIGHTS_WEEKLY':
            navigateToReports();
            return true;
        default:
            return false;
    }
}

/**
 * Navigate based on notification type
 */
export function navigateFromNotification(type: string, data?: any) {
    logger.log('🔔 Navigating from notification:', type);

    // Structured payload (retention notifications): route by explicit screen key
    // before falling back to the legacy type-based switch below.
    if (data?.screen && navigateToDeepLinkScreen(data.screen, data.params)) {
        return;
    }

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
