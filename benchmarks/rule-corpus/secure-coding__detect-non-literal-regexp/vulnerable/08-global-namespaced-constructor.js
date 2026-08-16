/**
 * ADVERSARIAL — the constructor reached through `globalThis`.
 *
 * Isomorphic libraries reach for `globalThis.RegExp` deliberately, to survive a
 * bundler that shadows the bare identifier. Semantically identical to
 * `new RegExp(...)`; the taint is identical. A rule that matches only
 * `callee.type === 'Identifier' && name === 'RegExp'` cannot see it, and an
 * attacker does not have to know that — the shape occurs on its own.
 */
import { logger } from '../lib/logger.js';

export function createFieldMatcher(request) {
  const expression = new globalThis.RegExp(request.query.filter, 'u');
  logger.debug({ source: expression.source }, 'compiled field matcher');
  return expression;
}
