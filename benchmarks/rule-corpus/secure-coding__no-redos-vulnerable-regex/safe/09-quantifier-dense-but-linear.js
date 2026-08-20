/**
 * SAFE (adversarial) - Deliberately dense in quantifier characters. Nine
 * quantifiers, four optional groups, two alternations - and a single parse for
 * every input, because every repeated element is separated by a mandatory
 * literal that belongs to none of its neighbours.
 */
const US_PHONE = /^(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}$/;
const CURRENCY = /^-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/;

export function isPhone(value) {
  return US_PHONE.test(value);
}

export function isCurrency(value) {
  return CURRENCY.test(value);
}
