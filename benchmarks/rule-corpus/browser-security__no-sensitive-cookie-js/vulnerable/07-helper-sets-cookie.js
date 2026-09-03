/**
 * VULNERABLE - Written from inside a helper.
 */
export function remember(profile) {
  document.cookie = 'credit_card_number=' + profile.pan + '; Secure; SameSite=Strict';
}
