/**
 * SAFE - NOMINAL CONTROL. A CSV import. The receiver is literally called
 * `parser` and the sink is literally `parser.parse(...)`, but csv-parse has no
 * concept of an entity, a DTD or an external reference, so CWE-611 cannot
 * apply. Only the construction site distinguishes this from vulnerable/03.
 */
import { parse } from 'csv-parse/sync';

export function importContacts(req) {
  const parser = { parse };
  return parser.parse(req.body.upload, { columns: true, skip_empty_lines: true });
}
