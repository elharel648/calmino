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
/**
 * Resolve an event's actual [start, end] Dates from its stored fields.
 *
 * New events (TrackingModal, all modes) stamp `timestamp` at the START and
 * carry explicit "HH:MM" startTime/endTime. Legacy timer/duration records
 * have a duration but no startTime/endTime, and their `timestamp` was taken
 * when the entry was logged — i.e. at the END of the event. Treating those
 * as start-stamped is what duplicated overnight sleeps into a future-dated
 * day group, so they are detected here and shifted back by their duration.
 */
export const eventTimeRange = (event: {
  timestamp: Date;
  duration?: number;
  startTime?: unknown;
  endTime?: unknown;
}): { start: Date; end: Date } => {
  const durationMs = (event.duration || 0) * 1000;
  const hasExplicitEnds = !!formatTimePoint(event.startTime) || !!formatTimePoint(event.endTime);
  if (!hasExplicitEnds && durationMs > 0) {
    // Legacy end-stamped record
    return { start: new Date(event.timestamp.getTime() - durationMs), end: new Date(event.timestamp) };
  }
  return { start: new Date(event.timestamp), end: new Date(event.timestamp.getTime() + durationMs) };
};

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
