// Renders one state of models/anthropic-security.no-browser-api-key-exposure.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { BROWSER_DIMENSIONS, renderBrowser } from './_ai.mjs';

export const plugin = 'anthropic-security';
export const rule = 'no-browser-api-key-exposure';
export const dimensions = BROWSER_DIMENSIONS;

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  return renderBrowser('anthropic', c);
}
