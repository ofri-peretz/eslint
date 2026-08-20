/**
 * VULNERABLE (adversarial) - Optional chaining in the guard. `payload?.settings`
 * is an OptionalMemberExpression; `typeof undefined === 'undefined'` so the
 * guard is skipped for a missing key, but a `null` settings value still passes
 * the object test and reaches the merge.
 */
import { settings } from '../store/settings';

export function ingest(payload) {
  if (typeof payload?.settings === 'object') {
    Object.assign(settings, payload.settings);
    return settings;
  }
  throw new TypeError('settings must be an object');
}
