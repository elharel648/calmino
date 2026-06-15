import {
    isValidInviteCode,
    parseCallableResponse,
    INVITE_CODE_REGEX,
} from '../callableResponse';

describe('isValidInviteCode', () => {
    it('accepts exactly 6 digits', () => {
        expect(isValidInviteCode('123456')).toBe(true);
        expect(isValidInviteCode('000000')).toBe(true);
    });

    it('trims surrounding whitespace before validating', () => {
        expect(isValidInviteCode('  654321  ')).toBe(true);
    });

    it('rejects wrong length (the client/server asymmetry bug)', () => {
        expect(isValidInviteCode('12345')).toBe(false);   // 5 digits
        expect(isValidInviteCode('1234567')).toBe(false);  // 7 digits
        expect(isValidInviteCode('')).toBe(false);
    });

    it('rejects non-numeric codes', () => {
        expect(isValidInviteCode('12ab56')).toBe(false);
        expect(isValidInviteCode('abcdef')).toBe(false);
        expect(isValidInviteCode('12/456')).toBe(false); // path-injection char
    });

    it('rejects null/undefined safely', () => {
        expect(isValidInviteCode(null)).toBe(false);
        expect(isValidInviteCode(undefined)).toBe(false);
    });

    it('regex matches the server contract (length === 6, digits only)', () => {
        expect(INVITE_CODE_REGEX.test('482910')).toBe(true);
        expect(INVITE_CODE_REGEX.test('48291')).toBe(false);
    });
});

describe('parseCallableResponse', () => {
    // This is THE regression test for the root-cause bug: v2 onCall returns the
    // payload under "result", and the old wrapper read only "data" -> undefined
    // -> callers saw success as a failure (red error despite server success).
    it('unwraps the v2 "result" key on success', () => {
        const r = parseCallableResponse(true, { result: { success: true, isGuest: false } });
        expect(r.ok).toBe(true);
        expect(r.payload).toEqual({ success: true, isGuest: false });
    });

    it('falls back to the legacy "data" key', () => {
        const r = parseCallableResponse(true, { data: { success: true } });
        expect(r.ok).toBe(true);
        expect(r.payload).toEqual({ success: true });
    });

    it('prefers "result" when both are present', () => {
        const r = parseCallableResponse(true, { result: { success: true }, data: { success: false } });
        expect(r.payload).toEqual({ success: true });
    });

    it('surfaces a curated HttpsError message on failure', () => {
        const r = parseCallableResponse(false, { error: { message: 'קוד ההזמנה פג תוקף' } });
        expect(r.ok).toBe(false);
        expect(r.errorMessage).toBe('קוד ההזמנה פג תוקף');
        expect(r.payload).toBeUndefined();
    });

    it('treats an error body as failure even with HTTP 200', () => {
        const r = parseCallableResponse(true, { error: { message: 'boom' } });
        expect(r.ok).toBe(false);
    });

    it('reports failure on non-2xx with no body', () => {
        const r = parseCallableResponse(false, {});
        expect(r.ok).toBe(false);
        expect(r.errorMessage).toBeUndefined();
    });

    it('returns a falsy-but-defined payload correctly (e.g. result: false)', () => {
        const r = parseCallableResponse(true, { result: false });
        expect(r.ok).toBe(true);
        expect(r.payload).toBe(false);
    });
});
