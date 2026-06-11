import { clockString, formatTimePoint, buildTimeDisplay } from '../eventTime';

// Build a local Date at a given wall-clock time (today's date, deterministic clock)
const at = (h: number, m: number) => {
  const d = new Date(2026, 5, 11); // June 11 2026, local midnight
  d.setHours(h, m, 0, 0);
  return d;
};

// Minimal Firestore-Timestamp lookalike
const ts = (d: Date) => ({ toDate: () => d });

describe('clockString', () => {
  it('formats with zero-padding', () => {
    expect(clockString(at(7, 5))).toBe('07:05');
  });

  it('formats midnight as 00:00 (never 24:00)', () => {
    expect(clockString(at(0, 0))).toBe('00:00');
  });
});

describe('formatTimePoint', () => {
  it('passes "HH:MM" strings through unchanged', () => {
    expect(formatTimePoint('19:43')).toBe('19:43');
  });

  it('formats Date objects', () => {
    expect(formatTimePoint(at(19, 43))).toBe('19:43');
  });

  it('formats Firestore Timestamps (legacy records — the edit-crash case)', () => {
    expect(formatTimePoint(ts(at(8, 30)))).toBe('08:30');
  });

  it('returns null for null/undefined/empty', () => {
    expect(formatTimePoint(null)).toBeNull();
    expect(formatTimePoint(undefined)).toBeNull();
    expect(formatTimePoint('')).toBeNull();
  });

  it('returns null for invalid Dates and unknown objects', () => {
    expect(formatTimePoint(new Date('nonsense'))).toBeNull();
    expect(formatTimePoint({ some: 'object' })).toBeNull();
    expect(formatTimePoint(12345)).toBeNull();
  });

  it('result is always parseable by the editor (split(":") → numbers)', () => {
    const out = formatTimePoint(ts(at(23, 59)))!;
    const [h, m] = out.split(':').map(Number);
    expect(h).toBe(23);
    expect(m).toBe(59);
  });
});

describe('buildTimeDisplay', () => {
  it('shows a stored start–end range', () => {
    expect(buildTimeDisplay({ startTime: '19:43', endTime: '21:00' }, '19:43'))
      .toBe('19:43–21:00');
  });

  it('collapses a zero-length range to a single time (no "19:39–19:39")', () => {
    expect(buildTimeDisplay({ startTime: '19:39', endTime: '19:39' }, '19:39'))
      .toBe('19:39');
  });

  it('handles legacy Timestamp range ends', () => {
    expect(buildTimeDisplay({ startTime: ts(at(6, 30)), endTime: ts(at(6, 50)) }, '06:50'))
      .toBe('06:30–06:50');
  });

  it('derives the range from duration (timer saves stamp the END)', () => {
    // 2h sleep timer stopped at 15:00 → started at 13:00
    expect(buildTimeDisplay({ duration: 2 * 3600, timestamp: at(15, 0) }, '15:00'))
      .toBe('13:00–15:00');
  });

  it('derived range crosses midnight backwards correctly', () => {
    // 90min timer stopped at 00:45 → started 23:15 the previous day
    expect(buildTimeDisplay({ duration: 90 * 60, timestamp: at(0, 45) }, '00:45'))
      .toBe('23:15–00:45');
  });

  it('short durations (≤60s) stay a single time', () => {
    expect(buildTimeDisplay({ duration: 45, timestamp: at(14, 50) }, '14:50'))
      .toBe('14:50');
  });

  it('ignores duration when timestamp is not a Date (no crash, falls back)', () => {
    expect(buildTimeDisplay({ duration: 3600, timestamp: '2026-06-11' as unknown }, '10:00'))
      .toBe('10:00');
  });

  it('falls back to the single time when nothing else is available', () => {
    expect(buildTimeDisplay({}, '12:34')).toBe('12:34');
  });

  it('one-sided range (start only) falls back to the single time', () => {
    expect(buildTimeDisplay({ startTime: '09:00' }, '09:00')).toBe('09:00');
  });
});
