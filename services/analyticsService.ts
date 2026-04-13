import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import { logger } from '../utils/logger';

const track = async (event: string, params?: Record<string, string | number | boolean>) => {
  try {
    await analytics().logEvent(event, params);
  } catch (e) {
    logger.warn('[Analytics] Failed to log event:', event, e);
  }
};

// Auth
export const analyticsLogin = (method: 'google' | 'apple' | 'email') =>
  analytics().logLogin({ method }).catch(() => {});

export const analyticsSignUp = (method: 'google' | 'apple' | 'email') =>
  analytics().logSignUp({ method }).catch(() => {});

// User identification — call after login so crashes are tied to a real user
export const setAnalyticsUser = (userId: string, displayName?: string) => {
  analytics().setUserId(userId).catch(() => {});
  crashlytics().setUserId(userId).catch(() => {});
  if (displayName) crashlytics().setAttribute('displayName', displayName).catch(() => {});
};

// Clear user on logout / account deletion
export const clearAnalyticsUser = () => {
  analytics().setUserId(null).catch(() => {});
  crashlytics().setUserId('').catch(() => {});
};

// Baby events
export const analyticsLogBabyEvent = (eventType: string) =>
  track('log_baby_event', { event_type: eventType });

// Account
export const analyticsDeleteAccount = () =>
  track('delete_account');

// Screens — called manually where needed
export const analyticsScreen = (screenName: string) =>
  analytics().logScreenView({ screen_name: screenName, screen_class: screenName }).catch(() => {});

// Performance — wrap any async operation to measure it
export const perfTrace = async <T>(traceName: string, fn: () => Promise<T>): Promise<T> => {
  const trace = await perf().startTrace(traceName);
  try {
    const result = await fn();
    return result;
  } finally {
    trace.stop().catch(() => {});
  }
};
