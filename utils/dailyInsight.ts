/**
 * Rule-based Daily Insight — the first slice of "the app knows my baby".
 *
 * Computes a live status snapshot from the baby's OWN data (no LLM involved):
 * how long the baby has been awake, today's daytime sleep vs the 7-day
 * average, and tonight's suggested bedtime window (average bedtime adjusted
 * by today's day-sleep surplus/deficit). Honest by design: with fewer than
 * MIN_NIGHTS tracked nights the bedtime window is null and the card shows a
 * "collecting" progress line instead of guessing (trust > confidence theater).
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

export interface DailyInsight {
  /** Minutes since the last sleep ended; null when unknown or implausibly stale. */
  awakeForMin: number | null;
  /** Total daytime (nap) sleep logged today, in minutes. */
  todayDaySleepMin: number;
  /** Average daytime sleep across previous tracked days; null with no history. */
  avgDaySleepMin: number | null;
  /** todayDaySleepMin - avgDaySleepMin (rounded); null when no average exists. */
  daySleepDeltaMin: number | null;
  /** Tonight's suggested "HH:MM" window; null until MIN_NIGHTS nights are tracked. */
  bedtimeWindow: { start: string; end: string } | null;
  nightsTracked: number;
  nightsNeeded: number;
}

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
/** An "awake for" older than this is stale data, not a real awake window. */
const MAX_AWAKE_MIN = 16 * 60;

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
  // Most recent sleep end → "awake for"
  let lastSleepEnd: Date | null = null;

  for (const { start, end } of sleeps) {
    if (end <= now && (!lastSleepEnd || end > lastSleepEnd)) lastSleepEnd = end;

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

  const awakeRaw = lastSleepEnd ? Math.round((now.getTime() - lastSleepEnd.getTime()) / 60000) : null;
  const awakeForMin = awakeRaw !== null && awakeRaw >= 0 && awakeRaw <= MAX_AWAKE_MIN ? awakeRaw : null;

  // Today's daytime sleep vs the average of previous tracked days
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const todayDaySleepMin = Math.round(daySleepByDay.get(todayKey) || 0);
  const previousDays = [...daySleepByDay.entries()].filter(([key]) => key !== todayKey).map(([, v]) => v);
  const avgDaySleepMin = previousDays.length > 0
    ? Math.round(previousDays.reduce((s, v) => s + v, 0) / previousDays.length)
    : null;
  const daySleepDeltaMin = avgDaySleepMin !== null ? todayDaySleepMin - avgDaySleepMin : null;

  let bedtimeWindow: { start: string; end: string } | null = null;
  if (bedtimesMin.length >= MIN_NIGHTS) {
    const avgBedtime = bedtimesMin.reduce((s, v) => s + v, 0) / bedtimesMin.length;
    const shift = Math.max(-MAX_SHIFT_MIN, Math.min(MAX_SHIFT_MIN, (daySleepDeltaMin ?? 0) * SHIFT_RATIO));
    const center = avgBedtime + shift;
    bedtimeWindow = {
      start: toClock(center - WINDOW_HALF_MIN),
      end: toClock(center + WINDOW_HALF_MIN),
    };
  }

  return {
    awakeForMin,
    todayDaySleepMin,
    avgDaySleepMin,
    daySleepDeltaMin,
    bedtimeWindow,
    nightsTracked: bedtimesMin.length,
    nightsNeeded: MIN_NIGHTS,
  };
};
