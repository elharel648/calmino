/**
 * Rule-based Daily Insight — the first slice of "the app knows my baby".
 *
 * Computes tonight's suggested bedtime window from the baby's OWN last-7-days
 * pattern (no LLM involved): average bedtime, adjusted by how today's daytime
 * sleep compares to the baby's daytime average. Honest by design: with fewer
 * than MIN_NIGHTS tracked nights it returns a "collecting" state instead of
 * guessing (trust > confidence theater).
 *
 * Pure and Date-injectable so it stays unit-testable, like eventTime.ts.
 */

import { eventTimeRange } from './eventTime';

export interface InsightEvent {
  type: string;
  timestamp: Date;
  duration?: number; // seconds
  startTime?: unknown;
  endTime?: unknown;
}

export type DailyInsight =
  | {
      type: 'bedtime';
      /** "HH:MM" bounds of the suggested window */
      windowStart: string;
      windowEnd: string;
      /** Today's daytime sleep minus the 7-day average, in minutes (rounded). */
      daySleepDeltaMin: number;
      /** How many tracked nights back the suggestion (for the trust line). */
      nightsTracked: number;
    }
  | {
      type: 'collecting';
      nightsTracked: number;
      nightsNeeded: number;
    };

const MIN_NIGHTS = 3;
const LOOKBACK_DAYS = 7;
/** Night sleep = starts 17:30–04:00; hours past midnight count as 24+h so averaging works. */
const NIGHT_START_MIN = 17.5 * 60;
const NIGHT_END_MIN = 28 * 60;
/** Daytime sleep = naps starting 06:00–17:30. */
const DAY_START_MIN = 6 * 60;
/** Shift bedtime by a third of the day-sleep surplus/deficit, capped. */
const SHIFT_RATIO = 1 / 3;
const MAX_SHIFT_MIN = 30;
const WINDOW_HALF_MIN = 10;

const pad = (n: number) => String(n).padStart(2, '0');
const toClock = (minutes: number): string => {
  const m = ((Math.round(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

export const computeDailyInsight = (events: InsightEvent[], now: Date = new Date()): DailyInsight => {
  const lookbackStart = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const sleeps = events
    .filter(e => e.type === 'sleep' && (e.duration || 0) > 0 && e.timestamp instanceof Date)
    .map(e => eventTimeRange(e as { timestamp: Date; duration?: number; startTime?: unknown; endTime?: unknown }))
    .filter(r => r.start >= lookbackStart && r.start <= now);

  // Bedtimes: start-of-night clock positions, normalized past midnight
  const bedtimesMin: number[] = [];
  // Daytime sleep minutes bucketed per calendar day key
  const daySleepByDay = new Map<string, number>();

  for (const { start, end } of sleeps) {
    let startMin = start.getHours() * 60 + start.getMinutes();
    if (startMin < 4 * 60) startMin += 24 * 60; // 00:30 bedtime = "24.5h"
    const isNight = startMin >= NIGHT_START_MIN && startMin <= NIGHT_END_MIN;

    if (isNight) {
      bedtimesMin.push(startMin);
    } else if (startMin >= DAY_START_MIN) {
      const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      const minutes = (end.getTime() - start.getTime()) / 60000;
      daySleepByDay.set(key, (daySleepByDay.get(key) || 0) + minutes);
    }
  }

  if (bedtimesMin.length < MIN_NIGHTS) {
    return { type: 'collecting', nightsTracked: bedtimesMin.length, nightsNeeded: MIN_NIGHTS };
  }

  const avgBedtime = bedtimesMin.reduce((s, v) => s + v, 0) / bedtimesMin.length;

  // Today's daytime sleep vs the average of previous tracked days
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const todayDaySleep = daySleepByDay.get(todayKey) || 0;
  const previousDays = [...daySleepByDay.entries()].filter(([key]) => key !== todayKey).map(([, v]) => v);
  const avgDaySleep = previousDays.length > 0
    ? previousDays.reduce((s, v) => s + v, 0) / previousDays.length
    : todayDaySleep;

  const delta = todayDaySleep - avgDaySleep;
  const shift = Math.max(-MAX_SHIFT_MIN, Math.min(MAX_SHIFT_MIN, delta * SHIFT_RATIO));
  const center = avgBedtime + shift;

  return {
    type: 'bedtime',
    windowStart: toClock(center - WINDOW_HALF_MIN),
    windowEnd: toClock(center + WINDOW_HALF_MIN),
    daySleepDeltaMin: Math.round(delta),
    nightsTracked: bedtimesMin.length,
  };
};
