/**
 * services/retention/index.ts
 * Public surface of the retention / engagement notification layer.
 *
 * Copy lives in notificationCopyConfig.ts; timing knobs in RETENTION_TIMING and
 * the quiet-hours window in QUIET_HOURS there. Those are imported directly by
 * the scheduler and don't need to be re-exported here.
 */
export { retentionScheduler, default } from './retentionScheduler';
export type { BabyGender } from './genderCopy';
