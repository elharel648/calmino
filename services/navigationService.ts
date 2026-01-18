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
        console.log('Navigation not ready, queuing:', name);
        setTimeout(() => navigate(name, params), 100);
    }
}

/**
 * Navigate to Home tab
 */
export function navigateToHome() {
    navigate('בית');
}

/**
 * Navigate to Reports tab
 */
export function navigateToReports() {
    navigate('סטטיסטיקות');
}

/**
 * Navigate to Babysitter tab
 */
export function navigateToBabysitter() {
    navigate('בייביסיטר');
}

/**
 * Navigate to Notifications screen
 */
export function navigateToNotifications() {
    if (navigationRef.isReady()) {
        navigationRef.dispatch(
            CommonActions.navigate({
                name: 'בית',
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
    console.log('🔔 Navigating from notification:', type);

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
                navigate('בייביסיטר', {
                    screen: 'ChatScreen',
                    params: { chatId: data.chatId },
                });
            } else {
                navigateToBabysitter();
            }
            break;

        case 'booking_update':
            // Go to sitter dashboard or babysitter tab
            navigateToBabysitter();
            break;

        default:
            // Default: go to notifications screen
            navigateToNotifications();
            break;
    }
}
