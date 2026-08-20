/**
 * VULNERABLE (adversarial) - A computed key that is a plain string literal.
 * `{ ['ssl']: ... }` is the same property as `{ ssl: ... }`.
 */
import { Client } from 'pg';

export const client = new Client({
  ['ssl']: { ['rejectUnauthorized']: false },
});
