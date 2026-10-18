/**
 * @fileoverview Tests for no-disabled-safety-settings (Gemini)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noDisabledSafetySettings } from './index';

const ruleTester = new RuleTester({
  // The TypeScript parser, so a user `enum` in a Gemini file can be a case.
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const IMPORT = `import { GoogleGenAI } from '@google/genai';`;

ruleTester.run('no-disabled-safety-settings', noDisabledSafetySettings, {
  valid: [
    // A real threshold
    {
      name: 'a threshold that still blocks',
      code: `${IMPORT}
        const cfg = { safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }] };`,
    },
    // Enum member that is not a disabling one
    {
      code: `${IMPORT}
        const cfg = { safetySettings: [{ threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE }] };`,
    },
    // Value not readable here
    { code: `${IMPORT}\nconst cfg = { threshold: configuredThreshold };` },
    // Computed key
    { code: `${IMPORT}\nconst cfg = { [k]: 'BLOCK_NONE' };` },
    // Computed member value
    { code: `${IMPORT}\nconst cfg = { threshold: Thresholds['BLOCK_NONE'] };` },
    // Unrelated property with the same value
    { code: `${IMPORT}\nconst cfg = { mode: 'BLOCK_NONE' };` },
    // Non-string literal threshold
    { code: `${IMPORT}\nconst cfg = { threshold: 0 };` },
    // Scope promise: no Gemini import, no finding
    { code: `const cfg = { threshold: 'BLOCK_NONE' };` },
    // require of an unrelated module
    {
      code: `const z = require('zod');\nconst cfg = { threshold: 'BLOCK_NONE' };`,
    },
    // require with a non-string argument
    {
      code: `const m = require(dyn);\nconst cfg = { threshold: 'BLOCK_NONE' };`,
    },
    // Zero-argument call — the require gate must not choke on it
    { code: `${IMPORT}\ninitialise();` },
    // Quoted key that is not a threshold
    { code: `${IMPORT}\nconst cfg = { 'mode': 'BLOCK_NONE' };` },
    // An import of an unrelated module must not arm the rule
    {
      code: `import { z } from 'zod';\nconst cfg = { threshold: 'BLOCK_NONE' };`,
    },
    /*
     * Moved from invalid (2026-10-12 FP/FN audit, FP-5). A bare
     * `threshold: 'OFF'` or `X.BLOCK_NONE` is also how a circuit breaker, a log
     * level or a lint severity is written, and a file that calls Gemini can
     * hold all of those. The rule now needs either the SDK's own enum
     * (resolved through its import) or the SafetySetting shape around the
     * value — a `category` beside it, or an enclosing `safetySettings` list.
     * Each mechanism is re-pinned in `invalid` in that shape.
     */
    {
      name: '(was invalid) a bare threshold OFF',
      code: `${IMPORT}\nconst cfg = { threshold: 'OFF' };`,
    },
    {
      name: '(was invalid) an unbound enum member',
      code: `${IMPORT}\nconst cfg = { threshold: HarmBlockThreshold.BLOCK_NONE };`,
    },
    {
      name: '(was invalid) a bare threshold under the legacy SDK',
      code: `import { GoogleGenerativeAI } from '@google/generative-ai';\nconst cfg = { threshold: 'BLOCK_NONE' };`,
    },
    {
      name: '(was invalid) a bare threshold under require()',
      code: `const { GoogleGenAI } = require('@google/genai');\nconst cfg = { threshold: 'BLOCK_NONE' };`,
    },
    {
      name: '(was invalid) a bare quoted threshold',
      code: `${IMPORT}\nconst cfg = { 'threshold': 'BLOCK_NONE' };`,
    },
    {
      name: 'FP: a circuit breaker, a lint config and a logger in a Gemini file',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
      code: `${IMPORT}\nexport const retry = { threshold: 'OFF', mode: 'circuit-breaker' };\nexport const lint = { rules: { complexity: { threshold: 'OFF' } } };\nenum Level { OFF = 'OFF' }\nexport const logging = { threshold: Level.OFF };`,
    },
    {
      name: 'a destructuring pattern is not a setting',
      code: `${IMPORT}\nconst { threshold = 'OFF' } = opts;`,
    },
  ],
  invalid: [
    {
      name: 'BLOCK_NONE turns the safety filter off entirely',
      code: `${IMPORT}
        const cfg = { safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }] };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // OFF is the newer spelling
    {
      name: 'OFF beside its category',
      code: `${IMPORT}\nconst cfg = { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' };`,
      errors: [{ messageId: 'safetyDisabled', data: { value: 'OFF' } }],
    },
    // Enum member form, bound to the SDK
    {
      name: 'the SDK enum member is evidence on its own',
      code: `import { HarmBlockThreshold } from '@google/genai';\nconst cfg = { threshold: HarmBlockThreshold.BLOCK_NONE };`,
      errors: [{ messageId: 'safetyDisabled', data: { value: 'BLOCK_NONE' } }],
    },
    // Legacy SDK name still arms the rule
    {
      name: 'the legacy SDK',
      code: `import { GoogleGenerativeAI } from '@google/generative-ai';\nconst cfg = { safetySettings: [{ threshold: 'BLOCK_NONE' }] };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // require() arms it
    {
      name: 'require() binds the SDK enum',
      code: `const { HarmBlockThreshold } = require('@google/genai');\nconst cfg = { threshold: HarmBlockThreshold.OFF };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // String-literal key
    {
      name: 'quoted keys',
      code: `${IMPORT}\nconst cfg = { 'category': 'HARM_CATEGORY_HARASSMENT', 'threshold': 'BLOCK_NONE' };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // Every disabled category is its own finding
    {
      code: `${IMPORT}
        const cfg = { safetySettings: [
          { threshold: 'BLOCK_NONE' },
          { threshold: 'OFF' },
        ] };`,
      errors: [
        { messageId: 'safetyDisabled' },
        { messageId: 'safetyDisabled' },
      ],
    },
    // FN (2026-10-12): the threshold through a const, and a mapped list.
    {
      name: 'FN: the disabling constant held in a const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
      code: `import { HarmBlockThreshold, HarmCategory } from '@google/genai';\nconst foo = HarmBlockThreshold.BLOCK_NONE;\nexport const settings = [{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: foo }];`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    {
      name: 'every category mapped to BLOCK_NONE',
      code: `import * as genai from '@google/genai';\nexport const s = Object.values(genai.HarmCategory).map((category) => ({ category, threshold: genai.HarmBlockThreshold.BLOCK_NONE }));`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
  ],
});
