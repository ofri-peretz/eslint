/**
 * The dominant MODERN spelling of a password policy: a schema.
 *
 * `z.string().min(6)` — and its equivalents `Joi.string().min(6)`,
 * `body('password').isLength({ min: 6 })`, `@MinLength(6)` — is where password
 * minimums actually live in code written after roughly 2021. There is no
 * `.length` comparison anywhere in this file, so a rule built entirely around
 * `BinaryExpression` on a `.length` MemberExpression cannot see any of them.
 *
 * DOCUMENTED, NOT FIXED. This is a different sink family, not a variation on the
 * one the rule implements, and adding it is a redesign rather than a bug fix.
 * It is in the corpus because the size of the gap is the point: the rule scores
 * a permanent miss here, and that number is a truer statement about the rule
 * than a corpus that only tested what it already handles.
 */
import { z } from 'zod';

export const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type Registration = z.infer<typeof registrationSchema>;
