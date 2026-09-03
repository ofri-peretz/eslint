/**
 * SAFE - A shipping-address validator. `value` is an ISO country code read off a
 * public form; `country` is a two-letter literal. There is no secret, no
 * credential and no timing channel - the whole comparison is public data against
 * a public constant.
 *
 * The only thing here that resembles security is the WORD "validate" in the
 * function names, which is a naming convention, not evidence.
 */
export interface Address {
  country: string;
  postalCode: string;
}

export function validateShippingAddress(address: Address): string[] {
  const problems: string[] = [];
  const value = address.country.toUpperCase();
  if (value === 'US' && !/^\d{5}(-\d{4})?$/.test(address.postalCode)) {
    problems.push('US postal codes are 5 or 9 digits');
  }
  return problems;
}
