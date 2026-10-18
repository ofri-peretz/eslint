// Renders one state of models/anthropic-security.no-hardcoded-api-key.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { KEY_DIMENSIONS, renderKey } from './_ai.mjs';

export const plugin = 'anthropic-security';
export const rule = 'no-hardcoded-api-key';
export const dimensions = KEY_DIMENSIONS;

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  return renderKey('anthropic', c);
}
