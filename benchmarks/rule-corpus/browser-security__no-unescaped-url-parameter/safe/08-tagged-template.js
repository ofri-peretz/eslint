/**
 * SAFE - A tagged template. Whatever `sql` does with the fragments, it is not
 * building this URL, and the tag function is opaque — the text is evidence
 * about the tag's input, not about a URL.
 */
import { sql } from './db';

export function rowsFor(host) {
  return sql`SELECT * FROM hits WHERE origin = ${`https://${host}/`}`;
}
