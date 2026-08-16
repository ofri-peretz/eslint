/**
 * VULNERABLE (adversarial, CWE-789 arm) - the size is a `let` whose
 * DECLARATION is a harmless default and whose last write before the sink comes
 * off the request. Reading only the declarator answers "1024" — a false
 * negative that looks exactly like a safe constant.
 */
import { Buffer } from 'node:buffer';

export function reserve(req) {
  let capacity = 1024;
  if (req.query.capacity !== undefined) {
    capacity = Number(req.query.capacity);
  }
  return Buffer.alloc(capacity);
}
