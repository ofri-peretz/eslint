// Renders one state of models/gemini-security.no-disabled-safety-settings.qnt.
// Spells the shape only; the verdict is the model's `expected`.

export const plugin = 'gemini-security';
export const rule = 'no-disabled-safety-settings';
export const dimensions = ['value', 'shape', 'importStyle'];

const IMPORT = {
  Named: [
    "import { HarmBlockThreshold, HarmCategory } from '@google/genai';",
    'HarmBlockThreshold',
    'HarmCategory',
  ],
  Namespace: [
    "import * as genai from '@google/genai';",
    'genai.HarmBlockThreshold',
    'genai.HarmCategory',
  ],
  RequireCjs: [
    "const { HarmBlockThreshold, HarmCategory } = require('@google/genai');",
    'HarmBlockThreshold',
    'HarmCategory',
  ],
  Legacy: [
    "import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';",
    'HarmBlockThreshold',
    'HarmCategory',
  ],
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [imp, E, C] = IMPORT[c.importStyle];
  let pre = '';
  const value = {
    LiteralBlockNone: "'BLOCK_NONE'",
    LiteralOff: "'OFF'",
    EnumBlockNone: `${E}.BLOCK_NONE`,
    EnumOff: `${E}.OFF`,
    ConstEnumBlockNone: 'none',
    // An enum of the same shape that nothing imports — e.g. a local one.
    UnboundEnumBlockNone: 'Thresholds.BLOCK_NONE',
    EnumSafe: `${E}.BLOCK_ONLY_HIGH`,
    LiteralSafe: "'BLOCK_ONLY_HIGH'",
  }[c.value];
  if (c.value === 'ConstEnumBlockNone') pre = `const none = ${E}.BLOCK_NONE;\n`;
  const shape = {
    WithCategory: `export const setting = { category: ${C}.HARM_CATEGORY_HARASSMENT, threshold: ${value} };`,
    InSafetySettings: `export const config = { safetySettings: [{ threshold: ${value} }] };`,
    MappedCategories: `export const settings = Object.values(${C}).map((category) => ({ category, threshold: ${value} }));`,
    Bare: `export const breaker = { threshold: ${value}, mode: 'circuit' };`,
  }[c.shape];
  const decl =
    c.value === 'UnboundEnumBlockNone'
      ? 'declare const Thresholds: any;\n'
      : '';
  return `${imp}\n${decl}${pre}${shape}\n`;
}
