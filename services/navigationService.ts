import { logger } from '../utils/logger';
// services/navigationService.ts
// Global navigation service for deep linking from notifications

import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen from anywhere (e.g., notification handler)
 */
export function navigate(name: string, params?: object) {
    if (navigationRef.isReady()) {
        navigationRef.dispatch(
            CommonActions.navigate({
                name,
                params,
            })
        );
    } else {
        // Navigation not ready, queue the navigation
        logger.log('Navigation not ready, queuing:', name);
        setTimeout(() => navigate(name, params), 100);
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
 * Navigate to Babysitter tab
 */
export function navigateToBabysitter() {
    const babysitterTab = getTranslation ? getTranslation('navigation.babysitter') : 'בייביסיטר';
    navigate(babysitterTab);
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

        case 'chat_message':
            // Go to chat
            if (data?.chatId) {
                const babysitterTab = getTranslation ? getTranslation('navigation.babysitter') : 'בייביסיטר';
                navigate(babysitterTab, {
                    screen: 'ChatScreen',
                    params: { chatId: data.chatId },
                });
            } else {
                navigateToBabysitter();
            }
            break;

        case 'booking_new':
        case 'booking_update':
        case 'booking_cancelled':
            // Go to bookings screen
            if (navigationRef.isReady()) {
                navigationRef.dispatch(
                    CommonActions.navigate({
                        name: getTranslation ? getTranslation('navigation.babysitter') : 'בייביסיטר',
                        params: {
                            screen: 'ParentBookings',
                        },
                    })
                );
            } else {
                navigateToBabysitter();
            }
            break;

        default:
            // Default: go to notifications screen
            navigateToNotifications();
            break;
    }
}
