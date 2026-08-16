/**
 * ADVERSARIAL — the length is measured after a whitespace trim.
 *
 * `password.trim().length < 6` is the FIRST thing a form validator does, and
 * `.trim()` / `.normalize()` / `.toString()` change nothing about whose length
 * is being measured. The object of the `.length` access is now a CallExpression
 * rather than an Identifier, so the measured value stops being recognisable
 * while the policy stays exactly as weak.
 */
import { ValidationError } from '../lib/errors.js';

export function normaliseAndValidate(rawPassword) {
  const password = String(rawPassword ?? '');

  if (password.trim().length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  return password.normalize('NFKC');
}
