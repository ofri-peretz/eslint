/**
 * SAFE — a READ off a `const` object literal.
 *
 * Nothing is written, and the object's shape is fixed at parse time, so no
 * property can be added to any prototype through this expression. The worst an
 * attacker achieves is reading `MESSAGES.constructor`, which is `Object` — and
 * the `??` already handles a miss.
 *
 * This is precisely the constant-table lookup that the CWE-915 guidance
 * recommends as the fix for a dynamic dispatch.
 */
const MESSAGES = {
  'en-GB': 'Your invoice is ready.',
  'de-DE': 'Ihre Rechnung ist bereit.',
  'fr-FR': 'Votre facture est prête.',
};

export function invoiceReadyMessage(locale) {
  return MESSAGES[locale] ?? MESSAGES['en-GB'];
}
