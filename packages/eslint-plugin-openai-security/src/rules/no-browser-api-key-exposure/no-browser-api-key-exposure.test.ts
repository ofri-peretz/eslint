/**
 * @fileoverview Tests for no-browser-api-key-exposure
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noBrowserApiKeyExposure } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import OpenAI from 'openai';`;

ruleTester.run('no-browser-api-key-exposure', noBrowserApiKeyExposure, {
  valid: [
    { name: 'a server client reading the key from the environment', code: `${IMPORT}\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });` },
    // Explicitly off
    { code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: false });` },
    // Non-boolean literal
    { code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: 0 });` },
    // Value not readable here — a variable could be false
    { code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: flag });` },
    // Spread could set it either way
    { code: `${IMPORT}\nconst client = new OpenAI({ ...opts });` },
    // Computed key
    { code: `${IMPORT}\nconst client = new OpenAI({ [k]: true });` },
    // No options object
    { code: `${IMPORT}\nconst client = new OpenAI();` },
    { code: `${IMPORT}\nconst client = new OpenAI(opts);` },
    // Scope promise: no OpenAI import, no finding
    { code: `const client = new OpenAI({ dangerouslyAllowBrowser: true });` },
    // Similarly-named package must not arm the rule
    { code: `import x from 'openai-mock';\nnew OpenAI({ dangerouslyAllowBrowser: true });` },
    // require of an unrelated module
    { code: `const z = require('zod');\nnew OpenAI({ dangerouslyAllowBrowser: true });` },
    // require with a non-string argument
    { code: `const m = require(dyn);\nnew OpenAI({ dangerouslyAllowBrowser: true });` },
    // Unrelated literal key
    { code: `${IMPORT}\nconst client = new OpenAI({ 'timeout': 1000 });` },
  ],
  invalid: [
    {
      name: 'dangerouslyAllowBrowser ships the key to every visitor',
      code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // Agents SDK scope
    {
      code: `import { Agent } from '@openai/agents';\nconst c = new OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // Subpath import
    {
      code: `import x from 'openai/helpers';\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // require() arms it
    {
      code: `const OpenAI = require('openai');\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // String-literal key
    {
      code: `${IMPORT}\nnew OpenAI({ 'dangerouslyAllowBrowser': true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // Factory-style call rather than `new`
    {
      code: `${IMPORT}\nconst client = createOpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
  ],
});
