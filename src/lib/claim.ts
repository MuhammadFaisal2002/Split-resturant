export const CLAIM_COOKIE_PREFIX = "split_claim_";

export function claimCookieName(code: string) {
  return CLAIM_COOKIE_PREFIX + code.toLowerCase();
}
