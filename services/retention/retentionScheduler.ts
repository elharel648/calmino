/**
 * services/retention/retentionScheduler.ts
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  RETENTION & ENGAGEMENT NOTIFICATION SCHEDULER
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  Responsibilities:
 *   1. Lifecycle scheduling (D0 / D1 / D3 / D7) anchored to the first session.
 *   2. Behavioral inactivity-gap scheduling (re-armed on every core action).
 *   3. Quiet-hours guard on every scheduled time.
 *   4. Smart invalidation: when the user performs a core action, pending
 *      reminders tied to that behavior are cancelled and the inactivity timer
 *      is recomputed forward.
 *   5. Structured deep-link payload on every notification (screen + params).
 *
 *  This module is intentionally standalone from the existing
 *  `notificationService` so the two never fight over each other's schedules.
 *  All retention notifications are tagged with `data.type === 'retention'` and
 *  `data.retentionKey`, which is how we find/cancel them across app restarts.
 *  (Disabling notifications globally cancels these too, since the user-facing
 *  toggle calls expo's cancelAllScheduledNotificationsAsync.)
 *
 *  Copy lives in `notificationCopyConfig.ts`.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';
import { adjustForQuietHours } from './quietHours';
import { renderGenderedCopy, BabyGender } from './genderCopy';
import {
  RETENTION_NOTIFICATIONS,
  RETENTION_TIMING,
  RetentionNotificationKey,
  RetentionNotificationConfig,
} from './notificationCopyConfig';

const STORAGE_KEY = '@calmino_retention_state';

interface RetentionState {
  /** First time the scheduler ever ran for this install (ms epoch). */
  firstSessionMs: number | null;
  /** True once lifecycle (D0–D7) has been scheduled, so we never double-schedule. */
  lifecycleScheduled: boolean;
  /** True once the user has logged their first core action (cancels D0). */
  onboardingCoreActionDone: boolean;
  /** Last-known baby gender, used to render gendered copy at schedule time. */
  babyGender: BabyGender | null;
}

const DEFAULT_STATE: RetentionState = {
  firstSessionMs: null,
  lifecycleScheduled: false,
  onboardingCoreActionDone: false,
  babyGender: null,
};

class RetentionScheduler {
  private state: RetentionState = { ...DEFAULT_STATE };
  private loaded = false;

  // ── Persistence ────────────────────────────────────────────────────────────
  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) this.state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (e) {
      logger.warn('[retention] Failed to load state:', e);
    } finally {
      this.loaded = true;
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      logger.warn('[retention] Failed to persist state:', e);
    }
  }

  // ── Low-level scheduling helpers ─────────────────────────────────────────────

  /**
   * Schedule one retention notification for an absolute date, applying the
   * quiet-hours guard. Any existing notification with the same key is cancelled
   * first, so scheduling is idempotent. Past dates are skipped.
   */
  private async scheduleAt(key: RetentionNotificationKey, when: Date): Promise<void> {
    const config = RETENTION_NOTIFICATIONS[key];
    if (!config) {
      logger.warn('[retention] No config for key:', key);
      return;
    }

    const fireDate = adjustForQuietHours(when);

    // Never schedule in the past (expo throws on past DATE triggers).
    if (fireDate.getTime() <= Date.now()) {
      logger.debug('🔔', `[retention] ${key} fire time in the past — skipping`);
      return;
    }

    // Idempotent: clear any previously-scheduled instance of this key.
    await this.cancel(key);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          // Resolve {masculine|feminine} baby tokens from the last-known gender.
          // Parent address is already plural (neutral) in the copy itself.
          title: renderGenderedCopy(config.title, this.state.babyGender),
          body: renderGenderedCopy(config.body, this.state.babyGender),
          sound: 'default',
          data: this.buildPayload(config),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
      logger.debug('🔔', `[retention] Scheduled ${key} for ${fireDate.toLocaleString('he-IL')}`);
    } catch (e) {
      logger.warn(`[retention] Failed to schedule ${key}:`, e);
    }
  }

  /** Structured payload: type tag + key + deep-link screen/params. */
  private buildPayload(config: RetentionNotificationConfig) {
    return {
      type: 'retention' as const,
      retentionKey: config.id,
      screen: config.deepLinkScreen,
      params: config.deepLinkParams ?? {},
    };
  }

  /** Cancel every pending notification for a given retention key (restart-safe). */
  private async cancel(key: RetentionNotificationKey): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(
        (n) => (n.content.data as any)?.retentionKey === key
      );
      for (const n of toCancel) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
      if (toCancel.length > 0) {
        logger.debug('🔔', `[retention] Cancelled ${toCancel.length} × ${key}`);
      }
    } catch (e) {
      logger.warn(`[retention] Failed to cancel ${key}:`, e);
    }
  }

  // ── Lifecycle (D0 / D1 / D3 / D7) ────────────────────────────────────────────

  /**
   * Call once per app start (after notifications are initialized). On the very
   * first run it records the first-session anchor and schedules the lifecycle
   * notifications exactly once.
   */
  async recordSessionStart(): Promise<void> {
    await this.load();

    if (this.state.firstSessionMs == null) {
      this.state.firstSessionMs = Date.now();
      await this.persist();
      logger.debug('🔔', '[retention] First session recorded');
    }

    if (!this.state.lifecycleScheduled) {
      await this.scheduleLifecycle();
      this.state.lifecycleScheduled = true;
      await this.persist();
    }
  }

  /** (Re)schedule the D0 onboarding nudge at firstSession + D0_DELAY_HOURS. */
  private async scheduleD0(): Promise<void> {
    const anchor = this.state.firstSessionMs ?? Date.now();
    const d0 = new Date(anchor);
    d0.setHours(d0.getHours() + RETENTION_TIMING.D0_DELAY_HOURS);
    await this.scheduleAt(RetentionNotificationKey.D0_ONBOARDING_INCOMPLETE, d0);
  }

  /** Schedule D0, D1, D3 and D7 relative to the first-session anchor. */
  private async scheduleLifecycle(): Promise<void> {
    const base = new Date(this.state.firstSessionMs ?? Date.now());

    // D0 — only if the first core action hasn't happened yet.
    if (!this.state.onboardingCoreActionDone) {
      await this.scheduleD0();
    }

    // D1 — exactly 24h after the first session.
    const d1 = new Date(base);
    d1.setHours(d1.getHours() + RETENTION_TIMING.D1_DELAY_HOURS);
    await this.scheduleAt(RetentionNotificationKey.D1_HABIT_CHECKIN, d1);

    // D3 — evening of the third day at the configured clock time.
    const d3 = new Date(base);
    d3.setDate(d3.getDate() + RETENTION_TIMING.D3_DAY_OFFSET);
    d3.setHours(RETENTION_TIMING.D3_HOUR, RETENTION_TIMING.D3_MINUTE, 0, 0);
    await this.scheduleAt(RetentionNotificationKey.D3_EVENING_NUDGE, d3);

    // D7 — first configured weekday (Sunday) at 09:00, on/after day 7.
    const d7 = new Date(base);
    d7.setDate(d7.getDate() + RETENTION_TIMING.D7_DAY_OFFSET);
    d7.setHours(RETENTION_TIMING.D7_HOUR, RETENTION_TIMING.D7_MINUTE, 0, 0);
    // Advance to the next target weekday (0 = Sunday) if not already on it.
    const dayDiff = (RETENTION_TIMING.D7_WEEKDAY - d7.getDay() + 7) % 7;
    d7.setDate(d7.getDate() + dayDiff);
    await this.scheduleAt(RetentionNotificationKey.D7_DIGEST, d7);
  }

  // ── Behavioral: inactivity gap ───────────────────────────────────────────────

  /**
   * (Re)arm the inactivity-gap notification: fire X hours from now if no further
   * core action happens in the meantime. Called on every core action.
   */
  private async scheduleInactivityGap(): Promise<void> {
    const when = new Date();
    when.setHours(when.getHours() + RETENTION_TIMING.INACTIVITY_GAP_HOURS);
    await this.scheduleAt(RetentionNotificationKey.INACTIVITY_GAP, when);
  }

  // ── Invalidation (core action performed) ─────────────────────────────────────

  /**
   * Call whenever the user performs a core action (e.g. logs a feeding/sleep).
   *
   *  - Cancels the D0 onboarding nudge (onboarding is clearly complete).
   *  - Cancels the pending inactivity reminder and re-arms the timer forward,
   *    so active users never get "we miss you" pings.
   *
   * @param babyGender current baby gender, persisted for gendered copy.
   */
  async onCoreActionLogged(babyGender?: BabyGender | null): Promise<void> {
    await this.load();

    if (babyGender) this.state.babyGender = babyGender;
    if (!this.state.onboardingCoreActionDone) {
      this.state.onboardingCoreActionDone = true;
      await this.cancel(RetentionNotificationKey.D0_ONBOARDING_INCOMPLETE);
    }
    await this.persist();

    // Re-arm the inactivity gap forward (cancel + reschedule handled in scheduleAt).
    await this.scheduleInactivityGap();
  }

  /**
   * Keep the stored baby gender in sync (call when the active child/profile is
   * known, e.g. on Home mount). If the gender changed and the D0 onboarding
   * nudge is still pending (lifecycle scheduled, no core action yet), D0 is
   * re-rendered with the correct gender before it fires. No-op if unchanged.
   */
  async syncBabyGender(babyGender?: BabyGender | null): Promise<void> {
    if (!babyGender) return;
    await this.load();

    if (this.state.babyGender === babyGender) return; // nothing to do
    this.state.babyGender = babyGender;
    await this.persist();

    // Only D0 contains baby-gendered copy and is scheduled ahead of time.
    if (this.state.lifecycleScheduled && !this.state.onboardingCoreActionDone) {
      await this.scheduleD0();
    }
  }
}

export const retentionScheduler = new RetentionScheduler();
export default retentionScheduler;
