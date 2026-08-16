/**
 * VULNERABLE (adversarial) - a `let` whose DECLARATION is a harmless zero and
 * whose last write before the read comes off the query string. Reading only
 * the declarator answers "0" — a false negative that looks exactly like a safe
 * constant.
 */
import { Buffer } from 'node:buffer';

const journal = Buffer.alloc(4096);

export function cursor(req) {
  let at = 0;
  if (req.query.at !== undefined) {
    at = Number(req.query.at);
  }
  return journal.readUInt8(at);
}
