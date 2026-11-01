/**
 * services/retention/quietHours.ts
 *
 * Quiet Hours Guard.
 *
 * No retention notification may fire or be scheduled inside the quiet window
 * (default 22:30 → 07:30 local). If a candidate fire time lands inside the
 * window it is deferred to 08:00 the same morning (for early-morning times) or
 * the next morning (for late-evening times).
 *
 * Pure, side-effect-free functions → trivially unit-testable.
 */

import { QUIET_HOURS } from './notificationCopyConfig';

const toMinutes = (h: number, m: number) => h * 60 + m;

const QUIET_START = toMinutes(QUIET_HOURS.START_HOUR, QUIET_HOURS.START_MINUTE); // 1350
const QUIET_END = toMinutes(QUIET_HOURS.END_HOUR, QUIET_HOURS.END_MINUTE); // 450

/**
 * True if the given local time falls inside the quiet window.
 * The window crosses midnight, so it is "after start OR before end".
 */
export function isWithinQuietHours(date: Date): boolean {
  const minutes = toMinutes(date.getHours(), date.getMinutes());
  // e.g. >= 22:30  OR  < 07:30
  return minutes >= QUIET_START || minutes < QUIET_END;
}

/**
 * Return a safe fire time: if `date` is inside quiet hours, push it to the
 * configured morning time; otherwise return `date` unchanged.
 *
 * - Late evening (>= 22:30): deferred to NEXT day 08:00.
 * - Early morning (< 07:30): deferred to the SAME day 08:00.
 */
export function adjustForQuietHours(date: Date): Date {
  if (!isWithinQuietHours(date)) return date;

  const result = new Date(date);
  const minutes = toMinutes(date.getHours(), date.getMinutes());

  // Late-evening times belong to the following morning.
  if (minutes >= QUIET_START) {
    result.setDate(result.getDate() + 1);
  }

  result.setHours(QUIET_HOURS.DEFER_TO_HOUR, QUIET_HOURS.DEFER_TO_MINUTE, 0, 0);
  return result;
}
