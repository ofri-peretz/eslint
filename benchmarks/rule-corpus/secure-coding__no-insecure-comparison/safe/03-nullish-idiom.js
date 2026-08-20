/**
 * SAFE - `x == null` is the idiomatic nullish test: null AND undefined in one
 * comparison. Core `eqeqeq` exempts it under `smart`/`allow-null`, and this rule
 * documents the same exemption in its own source.
 */
import { defaults } from '../config/defaults';

export function withDefaults(options) {
  if (options == null) {
    return { ...defaults };
  }
  return { ...defaults, ...options };
}
