/**
 * services/retention/genderCopy.ts
 *
 * Gender-aware copy rendering for retention notifications.
 *
 * Two independent axes of adaptation:
 *   1. PARENT address → handled directly in the copy using plural ("בואו",
 *      "תנו", "תראו"). It is gender-neutral by design, so there is nothing to
 *      resolve at runtime and no parent-gender data is needed.
 *   2. BABY reference → resolved here. Copy may contain `{masculine|feminine}`
 *      tokens that are swapped based on the baby's gender, e.g.
 *        "מתי {הקטנצ'יק|הקטנצ'יקה} {ישן|ישנה} או {אכל|אכלה} לאחרונה?"
 *
 * Fallback: anything that is not explicitly 'girl' (i.e. 'boy', 'other', null,
 * undefined) renders the masculine side, which is the conventional Hebrew
 * generic form.
 */

export type BabyGender = 'boy' | 'girl' | 'other';

// Matches a {masculine|feminine} token. Nested braces/pipes are not supported
// (intentionally simple — the copy only needs flat two-way alternation).
const GENDER_TOKEN = /\{([^{}|]*)\|([^{}|]*)\}/g;

/**
 * Resolve `{masculine|feminine}` tokens in `text` according to the baby gender.
 * Text without tokens is returned unchanged.
 */
export function renderGenderedCopy(text: string, gender?: BabyGender | null): string {
  const useFeminine = gender === 'girl';
  return text.replace(GENDER_TOKEN, (_match, masculine, feminine) =>
    useFeminine ? feminine : masculine
  );
}
