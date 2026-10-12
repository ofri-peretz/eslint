// Renders one state of models/gemini-security.no-untrusted-content-in-prompt.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { PROMPT_DIMENSIONS, renderPrompt } from './_ai.mjs';

export const plugin = 'gemini-security';
export const rule = 'no-untrusted-content-in-prompt';
export const dimensions = PROMPT_DIMENSIONS;

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  return renderPrompt(c);
}
