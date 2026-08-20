/**
 * SAFE — numeric array indexing.
 *
 * A key that is provably a number cannot be `__proto__`, `constructor` or
 * `prototype`; there is no prototype-pollution reachable through it at all.
 * `eslint-plugin-security` reports every line of this file, which is why its
 * `detect-object-injection` is the most disabled rule in its own plugin.
 */
export function summariseInvoice(lineItems) {
  let total = 0;

  for (let index = 0; index < lineItems.length; index++) {
    total += lineItems[index].amountCents;
  }

  const last = lineItems[lineItems.length - 1];
  return { total, currency: last.currency };
}
