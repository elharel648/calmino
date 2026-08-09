import { computeDailyInsight, InsightEvent } from '../dailyInsight';

// "now" = a fixed Wednesday 17:00
const NOW = new Date(2026, 7, 12, 17, 0, 0, 0);

const daysAgo = (days: number, h: number, m: number): Date => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(h, m, 0, 0);
  return d;
};

const sleep = (start: Date, durationMin: number): InsightEvent => ({
  type: 'sleep',
  timestamp: start,
  duration: durationMin * 60,
  startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
  endTime: '—', // presence marks the record as start-stamped
});

describe('computeDailyInsight', () => {
  it('no bedtime window with fewer than 3 tracked nights, but still reports progress', () => {
    const events = [sleep(daysAgo(1, 19, 30), 600), sleep(daysAgo(2, 19, 30), 600)];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.bedtimeWindow).toBeNull();
    expect(insight.nightsTracked).toBe(2);
    expect(insight.nightsNeeded).toBe(3);
  });

  it('computes awake-for from the most recent sleep end', () => {
    // nap today 13:00–14:30 → awake 2.5h at 17:00
    const events = [sleep(daysAgo(0, 13, 0), 90)];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.awakeForMin).toBe(150);
    expect(insight.todayDaySleepMin).toBe(90);
  });

  it('ignores a stale sleep end (> 16h ago) for awake-for', () => {
    const events = [sleep(daysAgo(3, 13, 0), 90)];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.awakeForMin).toBeNull();
  });

  it('suggests a window around the average bedtime when day sleep is typical', () => {
    const events = [
      // three nights at 19:20 / 19:40 / 19:30 → avg 19:30
      sleep(daysAgo(1, 19, 20), 600),
      sleep(daysAgo(2, 19, 40), 600),
      sleep(daysAgo(3, 19, 30), 600),
      // naps: 90min on each previous day and 90min today → delta 0
      sleep(daysAgo(1, 13, 0), 90),
      sleep(daysAgo(2, 13, 0), 90),
      sleep(daysAgo(3, 13, 0), 90),
      sleep(daysAgo(0, 13, 0), 90),
    ];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.bedtimeWindow).toEqual({ start: '19:20', end: '19:40' });
    expect(insight.daySleepDeltaMin).toBe(0);
    expect(insight.avgDaySleepMin).toBe(90);
    expect(insight.nightsTracked).toBe(3);
  });

  it('shifts bedtime later when today had more daytime sleep', () => {
    const events = [
      sleep(daysAgo(1, 19, 30), 600),
      sleep(daysAgo(2, 19, 30), 600),
      sleep(daysAgo(3, 19, 30), 600),
      sleep(daysAgo(1, 13, 0), 60),
      sleep(daysAgo(2, 13, 0), 60),
      // today: 60 extra minutes → shift +20 (60/3)
      sleep(daysAgo(0, 13, 0), 120),
    ];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.daySleepDeltaMin).toBe(60);
    expect(insight.bedtimeWindow).toEqual({ start: '19:40', end: '20:00' });
  });

  it('caps the shift at 30 minutes', () => {
    const events = [
      sleep(daysAgo(1, 19, 30), 600),
      sleep(daysAgo(2, 19, 30), 600),
      sleep(daysAgo(3, 19, 30), 600),
      sleep(daysAgo(1, 13, 0), 30),
      // today: +180min → raw shift 60, capped at 30
      sleep(daysAgo(0, 10, 0), 210),
    ];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.bedtimeWindow).toEqual({ start: '19:50', end: '20:10' });
  });

  it('counts a post-midnight bedtime as late night, not as a nap', () => {
    const events = [
      sleep(daysAgo(1, 0, 30), 480), // 00:30 "bedtime"
      sleep(daysAgo(2, 23, 30), 480),
      sleep(daysAgo(3, 22, 30), 480),
    ];
    const insight = computeDailyInsight(events, NOW);
    // avg of 24.5h, 23.5h, 22.5h = 23.5h → 23:30
    expect(insight.bedtimeWindow).toEqual({ start: '23:20', end: '23:40' });
  });

  it('handles legacy end-stamped records via eventTimeRange', () => {
    // legacy timer sleeps: no explicit endpoints, timestamp = END.
    // Stops at 05:30 after 10h → real bedtime 19:30.
    const legacyNight = (d: number): InsightEvent => ({
      type: 'sleep',
      timestamp: daysAgo(d, 5, 30),
      duration: 10 * 3600,
    });
    const events = [legacyNight(1), legacyNight(2), legacyNight(3)];
    const insight = computeDailyInsight(events, NOW);
    expect(insight.bedtimeWindow).toEqual({ start: '19:20', end: '19:40' });
  });

  it('ignores non-sleep events and empty input', () => {
    const empty = computeDailyInsight([], NOW);
    expect(empty.bedtimeWindow).toBeNull();
    expect(empty.awakeForMin).toBeNull();
    expect(empty.todayDaySleepMin).toBe(0);
    const events: InsightEvent[] = [
      { type: 'food', timestamp: daysAgo(1, 19, 30), duration: 600 },
      { type: 'diaper', timestamp: daysAgo(1, 20, 0) },
    ];
    expect(computeDailyInsight(events, NOW).nightsTracked).toBe(0);
  });
});
