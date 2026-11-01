// Permission prompts (ATT, push) wait until the user has logged their first
// event — asking a brand-new parent for "personalized ads" tracking before they
// have seen any value was costing us activations.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { FIRST_TRACKING_KEY } from './analyticsService';
import { registerForPushNotifications } from './pushNotificationService';
import { notificationService } from './notificationService';
import { retentionScheduler } from './retention';
import { logger } from '../utils/logger';

export const hasLoggedFirstEvent = async (): Promise<boolean> => {
  try {
    return !!(await AsyncStorage.getItem(FIRST_TRACKING_KEY));
  } catch {
    return false;
  }
};

const hasPushPermission = async (): Promise<boolean> => {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
};

export const requestTrackingPermission = async () => {
  if (Platform.OS !== 'ios') return;
  try {
    await requestTrackingPermissionsAsync();
  } catch (e) {
    logger.warn('ATT request failed:', e);
  }
};

// Registers push and schedules recurring reminders (prompts if not yet granted)
export const setupPushAndReminders = () => {
  registerForPushNotifications().catch((err) => {
    logger.log('Push registration:', err);
  });
  notificationService.initialize().then((success) => {
    if (success) {
      notificationService.scheduleSupplementReminder();
      notificationService.scheduleSleepReminder();
      notificationService.scheduleDailySummary();

      // Retention/engagement layer: record the session anchor and
      // schedule the lifecycle notifications (D0/D1/D3/D7) once.
      // Guarded by `success` so it only runs when notifications are
      // permitted, matching the recurring-reminder behavior above.
      retentionScheduler.recordSessionStart().catch((err) => {
        logger.log('Retention session register:', err);
      });
    }
  }).catch((err) => {
    logger.log('Notification init:', err);
  });
};

// On login: only set up push now if it won't show a prompt to a new user
export const setupPushIfActivated = async () => {
  if ((await hasLoggedFirstEvent()) || (await hasPushPermission())) {
    setupPushAndReminders();
  }
};

// Called once, right after the first event is logged
export const requestDeferredPermissions = async () => {
  await requestTrackingPermission();
  setupPushAndReminders();
};
