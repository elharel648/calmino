import { logger } from '../utils/logger';
// services/pushNotificationService.ts
// Push Notifications Service using Expo Push Notifications

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import Constants from 'expo-constants';

/**
 * Get Expo Push Token and save to Firebase
 */
export async function registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
        logger.log('Push notifications only work on physical devices');
        return null;
    }

    try {
        // Check permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            logger.log('Push notification permissions not granted');
            return null;
        }

        // Get Expo push token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId
            ?? Constants.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
        });

        const pushToken = tokenData.data;
        logger.log('📱 Push token:', pushToken);

        // Save to Firebase
        const userId = auth.currentUser?.uid;
        if (userId && pushToken) {
            await savePushToken(userId, pushToken);
        }

        // Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Calmino',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#6366F1',
            });

            // Chat notifications channel
            await Notifications.setNotificationChannelAsync('chat', {
                name: 'הודעות צ\'אט',
                importance: Notifications.AndroidImportance.HIGH,
                sound: 'default',
            });

            // Booking notifications channel
            await Notifications.setNotificationChannelAsync('booking', {
                name: 'עדכוני הזמנות',
                importance: Notifications.AndroidImportance.HIGH,
                sound: 'default',
            });
        }

        return pushToken;
    } catch (error) {
        logger.error('Error getting push token:', error);
        return null;
    }
}

/**
 * Save push token to Firestore
 */
async function savePushToken(userId: string, token: string): Promise<void> {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                pushToken: token,
                pushTokenUpdatedAt: new Date(),
                platform: Platform.OS,
            });
        } else {
            await setDoc(userRef, {
                pushToken: token,
                pushTokenUpdatedAt: new Date(),
                platform: Platform.OS,
            }, { merge: true });
        }

        logger.log('✅ Push token saved to Firebase');
    } catch (error) {
        logger.error('Error saving push token:', error);
    }
}

/**
 * Remove push token (on logout)
 */
export async function removePushToken(): Promise<void> {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            pushToken: null,
            pushTokenUpdatedAt: new Date(),
        });

        logger.log('✅ Push token removed');
    } catch (error) {
        logger.error('Error removing push token:', error);
    }
}

/**
 * Send push notification via Expo Push API
 * This is a simple client-side implementation
 * For production, use Cloud Functions instead
 */
export async function sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: object
): Promise<boolean> {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: {
            ...data,
            // Ensure type is included for navigation
            type: (data as any)?.type || 'reminder',
        },
        // Android specific
        channelId: (data as any)?.channelId || 'default',
        priority: 'high' as const,
    };

    // Only Expo push tokens are supported (format: ExponentPushToken[...])
    if (!expoPushToken.startsWith('ExponentPushToken[')) {
        logger.warn('Push skipped: not a valid Expo push token');
        return false;
    }

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();

        // Check if there are any errors
        if (result.data && result.data.status === 'error') {
            logger.error('📤 Push error:', result.data.message);
            return false;
        }

        logger.log('📤 Push sent successfully:', result);
        return true;
    } catch (error) {
        logger.error('Error sending push:', error);
        return false;
    }
}

/**
 * Get user's push token from Firestore
 */
export async function getUserPushToken(userId: string): Promise<string | null> {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return userDoc.data()?.pushToken || null;
        }
        return null;
    } catch (error) {
        logger.error('Error getting user push token:', error);
        return null;
    }
}
