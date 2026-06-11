/**
 * Pure helpers for formatting event times on the timeline and in editors.
 *
 * Events store startTime/endTime as "HH:MM" strings (TrackingModal), but
 * legacy records may carry Date objects or Firestore Timestamps — every
 * consumer must normalize before parsing/printing (a raw `.split(':')` on a
 * Timestamp crashed the edit flow; see the pre-launch audit).
 *
 * Kept free of React/Firebase imports so they stay unit-testable.
 */

/** Anything that looks like a Firestore Timestamp. */
type TimestampLike = { toDate: () => Date };

const pad = (n: number) => String(n).padStart(2, '0');

/** Format a Date's wall-clock time as "HH:MM" (24h, deterministic — no locale). */
export const clockString = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Normalize one end of an event's time range to an "HH:MM" string.
 * Accepts "HH:MM" string | Date | Firestore Timestamp; null/invalid → null.
 */
export const formatTimePoint = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  const d = typeof (v as TimestampLike).toDate === 'function' ? (v as TimestampLike).toDate() : v;
  if (d instanceof Date && !isNaN(d.getTime())) return clockString(d);
  return null;
};

/**
 * Build the "start–end" display for an event.
 * - both ends present → "HH:MM–HH:MM" (collapses to a single time when equal)
 * - duration > 60s with a Date timestamp → range derived from duration
 *   (timer saves stamp `timestamp` at stop, i.e. the END of the event)
 * - otherwise → the provided single-time fallback
 */
export const buildTimeDisplay = (
  event: { startTime?: unknown; endTime?: unknown; duration?: number; timestamp?: unknown },
  timeStr: string,
): string => {
  const start = formatTimePoint(event.startTime);
  const end = formatTimePoint(event.endTime);
  if (start && end) return start === end ? start : `${start}–${end}`;
  const durationSec = event.duration || 0;
  if (durationSec > 60 && event.timestamp instanceof Date) {
    const startD = new Date(event.timestamp.getTime() - durationSec * 1000);
    return `${clockString(startD)}–${timeStr}`;
  }
  return timeStr;
};
