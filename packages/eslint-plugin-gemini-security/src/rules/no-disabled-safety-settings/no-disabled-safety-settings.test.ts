/**
 * @fileoverview Tests for no-disabled-safety-settings (Gemini)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDisabledSafetySettings } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import { GoogleGenAI } from '@google/genai';`;

ruleTester.run('no-disabled-safety-settings', noDisabledSafetySettings, {
  valid: [
    // A real threshold
    {
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
    { code: `const z = require('zod');\nconst cfg = { threshold: 'BLOCK_NONE' };` },
    // require with a non-string argument
    { code: `const m = require(dyn);\nconst cfg = { threshold: 'BLOCK_NONE' };` },
    // Zero-argument call — the require gate must not choke on it
    { code: `${IMPORT}\ninitialise();` },
    // Quoted key that is not a threshold
    { code: `${IMPORT}\nconst cfg = { 'mode': 'BLOCK_NONE' };` },
    // An import of an unrelated module must not arm the rule
    { code: `import { z } from 'zod';\nconst cfg = { threshold: 'BLOCK_NONE' };` },
  ],
  invalid: [
    {
      code: `${IMPORT}
        const cfg = { safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }] };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // OFF is the newer spelling
    {
      code: `${IMPORT}\nconst cfg = { threshold: 'OFF' };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // Enum member form
    {
      code: `${IMPORT}\nconst cfg = { threshold: HarmBlockThreshold.BLOCK_NONE };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // Legacy SDK name still arms the rule
    {
      code: `import { GoogleGenerativeAI } from '@google/generative-ai';\nconst cfg = { threshold: 'BLOCK_NONE' };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // require() arms it
    {
      code: `const { GoogleGenAI } = require('@google/genai');\nconst cfg = { threshold: 'BLOCK_NONE' };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // String-literal key
    {
      code: `${IMPORT}\nconst cfg = { 'threshold': 'BLOCK_NONE' };`,
      errors: [{ messageId: 'safetyDisabled' }],
    },
    // Every disabled category is its own finding
    {
      code: `${IMPORT}
        const cfg = { safetySettings: [
          { threshold: 'BLOCK_NONE' },
          { threshold: 'OFF' },
        ] };`,
      errors: [{ messageId: 'safetyDisabled' }, { messageId: 'safetyDisabled' }],
    },
  ],
});
