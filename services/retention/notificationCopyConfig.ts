/**
 * services/retention/notificationCopyConfig.ts
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  CENTRAL COPY + TRIGGER CONFIG FOR RETENTION / ENGAGEMENT NOTIFICATIONS
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  This is the ONLY file you need to edit to tweak copy.
 *  Every retention notification the app can fire is declared here with a
 *  clear key, its trigger condition, its deep-link target, and its
 *  title/body strings.
 *
 *  Copy status: FINAL Hebrew copy is in place. To localize later, swap the
 *  literal title/body strings for i18n keys — nothing else in the scheduling
 *  layer needs to change.
 *
 *  Gender handling (see genderCopy.ts):
 *   • PARENT is addressed in the plural ("בואו"/"תנו"/"תראו") → gender-neutral,
 *     no runtime resolution and no parent-gender data required.
 *   • BABY references use `{masculine|feminine}` tokens that the scheduler
 *     resolves from the baby's gender at schedule time, e.g.
 *     "{הקטנצ'יק|הקטנצ'יקה} {ישן|ישנה}". Non-'girl' falls back to masculine.
 *
 *  The scheduler (retentionScheduler.ts) reads `title`/`body` from here and
 *  attaches `deepLinkScreen` + `deepLinkParams` to each notification's data
 *  payload so a tap routes straight to the relevant screen.
 */

// ── Semantic deep-link screen keys ──────────────────────────────────────────
// These are app-agnostic keys. navigationService.ts maps each one to the real
// (localized) navigation target, so copy/config never hard-codes route names.
export enum RetentionDeepLinkScreen {
  /** Quick-entry landing — the Home screen's quick-action buttons. */
  QUICK_ENTRY = 'QUICK_ENTRY',
  /** Daily timeline — the DailyTimeline on the Home screen. */
  DAILY_TIMELINE = 'DAILY_TIMELINE',
  /** Weekly insights — the Reports / statistics screen. */
  INSIGHTS_WEEKLY = 'INSIGHTS_WEEKLY',
}

// ── Notification keys ────────────────────────────────────────────────────────
// Stable identifiers used across the scheduler, persistence and cancellation.
export enum RetentionNotificationKey {
  /** D0: 2h after install if the first core action was never completed. */
  D0_ONBOARDING_INCOMPLETE = 'D0_ONBOARDING_INCOMPLETE',
  /** D1: exactly 24h after the first session — habit check-in. */
  D1_HABIT_CHECKIN = 'D1_HABIT_CHECKIN',
  /** D3: evening of the third day (~20:30) — activity reminder. */
  D3_EVENING_NUDGE = 'D3_EVENING_NUDGE',
  /** D7: weekly digest, Sunday morning 09:00. */
  D7_DIGEST = 'D7_DIGEST',
  /** Behavioral: X hours of inactivity since the last core action. */
  INACTIVITY_GAP = 'INACTIVITY_GAP',
}

export interface RetentionNotificationConfig {
  /** Stable id — mirrors the key; also stamped into the notification payload. */
  id: RetentionNotificationKey;
  /** Human-readable description of WHEN/WHY this fires (documentation only). */
  triggerCondition: string;
  /** Semantic destination opened when the user taps the notification. */
  deepLinkScreen: RetentionDeepLinkScreen;
  /** Params forwarded to the destination screen (optional). */
  deepLinkParams?: Record<string, string | number | boolean>;
  /** Notification title (final Hebrew copy; swap for an i18n key to localize). */
  title: string;
  /** Notification body (final Hebrew copy; swap for an i18n key to localize). */
  body: string;
}

// ── The config map ────────────────────────────────────────────────────────────
// Copy is final (Hebrew). Edit title/body here to adjust wording.
export const RETENTION_NOTIFICATIONS: Record<
  RetentionNotificationKey,
  RetentionNotificationConfig
> = {
  [RetentionNotificationKey.D0_ONBOARDING_INCOMPLETE]: {
    id: RetentionNotificationKey.D0_ONBOARDING_INCOMPLETE,
    triggerCondition:
      '2 hours after the first session if the user has not logged their first core action yet.',
    deepLinkScreen: RetentionDeepLinkScreen.QUICK_ENTRY,
    deepLinkParams: { source: 'retention_d0' },
    title: 'צעד קטן לשקט נפשי 🤍',
    body: "בואו נתחיל בצעד אחד קטן: מתי {הקטנצ'יק|המתוקה} {ישן|ישנה} או {אכל|אכלה} לאחרונה?",
  },

  [RetentionNotificationKey.D1_HABIT_CHECKIN]: {
    id: RetentionNotificationKey.D1_HABIT_CHECKIN,
    triggerCondition: 'Exactly 24 hours after the first session.',
    deepLinkScreen: RetentionDeepLinkScreen.DAILY_TIMELINE,
    deepLinkParams: { source: 'retention_d1' },
    title: 'פשוט לפרוק את היום מהראש ✨',
    body: 'תנו ל-Calmino לזכור את הזמנים. לחיצה אחת לסנכרון היומן היומי.',
  },

  [RetentionNotificationKey.D3_EVENING_NUDGE]: {
    id: RetentionNotificationKey.D3_EVENING_NUDGE,
    triggerCondition: 'Evening of the third day (~20:30) — activity reminder.',
    deepLinkScreen: RetentionDeepLinkScreen.DAILY_TIMELINE,
    deepLinkParams: { source: 'retention_d3' },
    title: 'זמן לנשום רגע 🌿',
    body: 'היום מתקרב לסיומו. הצצה קצרה ביומן תראה לכם כמה כבר הספקתם יחד.',
  },

  [RetentionNotificationKey.D7_DIGEST]: {
    id: RetentionNotificationKey.D7_DIGEST,
    triggerCondition: 'Weekly digest — the first Sunday morning at 09:00 after day 7.',
    deepLinkScreen: RetentionDeepLinkScreen.INSIGHTS_WEEKLY,
    deepLinkParams: { source: 'retention_d7' },
    title: 'תראו כמה עשיתם השבוע 🤍',
    body: 'מבט על השבוע החולף מראה כמה סדר וביטחון נבנו. בואו נציץ בתובנות.',
  },

  [RetentionNotificationKey.INACTIVITY_GAP]: {
    id: RetentionNotificationKey.INACTIVITY_GAP,
    triggerCondition:
      'X hours have passed since the last core action with no new interaction. Re-armed every time a core action is logged.',
    deepLinkScreen: RetentionDeepLinkScreen.QUICK_ENTRY,
    deepLinkParams: { source: 'retention_inactivity' },
    title: 'הכל בסדר? אנחנו פה 🕊️',
    body: 'עברו כמה שעות מהעדכון האחרון. נגיעה קטנה כדי להחזיר את היומן לקצב.',
  },
};

// ── Timing knobs ──────────────────────────────────────────────────────────────
// Behavioral + lifecycle timing lives here so it can be tuned without touching
// scheduler logic. (Copy stays above; these are the numeric parameters.)
export const RETENTION_TIMING = {
  /** Inactivity gap (hours) after the last core action before we re-engage. */
  INACTIVITY_GAP_HOURS: 8,
  /** D0: hours after install before nudging an incomplete onboarding. */
  D0_DELAY_HOURS: 2,
  /** D1: hours after the first session. */
  D1_DELAY_HOURS: 24,
  /** D3: which day after the first session, and at what local clock time. */
  D3_DAY_OFFSET: 3,
  D3_HOUR: 20,
  D3_MINUTE: 30,
  /** D7: day offset, the local clock time, and the target weekday (0=Sunday). */
  D7_DAY_OFFSET: 7,
  D7_HOUR: 9,
  D7_MINUTE: 0,
  D7_WEEKDAY: 0, // 0 = Sunday (week start in Israel)
} as const;

// ── Quiet-hours window ────────────────────────────────────────────────────────
// No notification may fire or be scheduled inside this window; see quietHours.ts.
export const QUIET_HOURS = {
  START_HOUR: 22,
  START_MINUTE: 30,
  END_HOUR: 7,
  END_MINUTE: 30,
  /** When a time lands inside the window, it is pushed to this morning time. */
  DEFER_TO_HOUR: 8,
  DEFER_TO_MINUTE: 0,
} as const;
