/**
 * SAFE - `value == null` is the idiomatic nullish test: it matches null AND
 * undefined in one comparison, which is precisely why it is written that way.
 * Core `eqeqeq` exempts it under `smart`/`allow-null`, and this plugin's own
 * `no-insecure-comparison` exempts it too, in as many words. It is not a type
 * confusion and rewriting it to `=== null` silently drops the undefined case.
 */
import { defaults } from '../config/defaults';

export function resolvePageSize(requested) {
  if (requested == null) {
    return defaults.pageSize;
  }
  const parsed = Number(requested);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : defaults.pageSize;
}
