/**
 * Pure helpers for the hand-rolled Firebase Callable REST wrapper
 * (services/firebaseConfig.ts -> callFirebaseFunction).
 *
 * These were extracted so the fragile parts — which historically broke the
 * family invite/join flow on every release — are unit-tested in isolation,
 * without needing to mock React Native / Firebase native modules.
 */

/** A 6-digit numeric invite/guest code (the only shape the system issues). */
export const INVITE_CODE_REGEX = /^\d{6}$/;

export function isValidInviteCode(code: string | null | undefined): boolean {
    if (!code) return false;
    return INVITE_CODE_REGEX.test(code.trim());
}

/**
 * Unwrap a Firebase Callable HTTPS response body.
 *
 * The wire format differs by runtime: `firebase-functions/v2` returns the
 * payload under `result`, while v1 / the client SDK historically used `data`.
 * Reading only one key yielded `undefined` on success, which callers treated
 * as a failure — the actual root cause of "join succeeds on the server but the
 * app shows a red error". Accept both, preferring `result`.
 *
 * Returns `{ ok, payload, errorMessage }`:
 *  - ok=false when the HTTP status is non-2xx or the body carries an `error`.
 *  - payload is the unwrapped success value (may be any shape the fn returns).
 */
export function parseCallableResponse(
    httpOk: boolean,
    body: any
): { ok: boolean; payload: any; errorMessage?: string } {
    if (!httpOk || body?.error) {
        return {
            ok: false,
            payload: undefined,
            errorMessage: body?.error?.message,
        };
    }
    const payload = body?.result !== undefined ? body.result : body?.data;
    return { ok: true, payload };
}
