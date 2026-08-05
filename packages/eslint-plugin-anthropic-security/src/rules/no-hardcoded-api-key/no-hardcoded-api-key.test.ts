/**
 * @fileoverview Tests for no-hardcoded-api-key (Anthropic)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedApiKey } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import Anthropic from '@anthropic-ai/sdk';`;

ruleTester.run('no-hardcoded-api-key', noHardcodedApiKey, {
  valid: [
    { code: `${IMPORT}\nconst c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });` },
    // Empty string is a placeholder, not a credential
    { code: `${IMPORT}\nconst c = new Anthropic({ apiKey: '' });` },
    // Non-string literal
    { code: `${IMPORT}\nconst c = new Anthropic({ apiKey: null });` },
    // Spread could carry the key
    { code: `${IMPORT}\nconst c = new Anthropic({ ...opts });` },
    // Computed key
    { code: `${IMPORT}\nconst c = new Anthropic({ [k]: 'sk-ant-xxx' });` },
    // Unrelated property holding a literal
    { code: `${IMPORT}\nconst c = new Anthropic({ baseURL: 'https://api.anthropic.com' });` },
    // No options / non-object options
    { code: `${IMPORT}\nconst c = new Anthropic();` },
    { code: `${IMPORT}\nconst c = new Anthropic(opts);` },
    // Scope promise: no Anthropic import, no finding
    { code: `const c = new Anthropic({ apiKey: 'sk-ant-hardcoded' });` },
    // require of an unrelated module
    { code: `const z = require('zod');\nnew Anthropic({ apiKey: 'sk-ant-hardcoded' });` },
    // require with a non-string argument
    { code: `const m = require(dyn);\nnew Anthropic({ apiKey: 'sk-ant-hardcoded' });` },
    // Zero-argument call — the require gate must not choke on it
    { code: `${IMPORT}\ninitialise();` },
    // Quoted key that is not a credential
    { code: `${IMPORT}\nnew Anthropic({ 'baseURL': 'https://api.anthropic.com' });` },
    // An import of an unrelated module must not arm the rule
    { code: `import { z } from 'zod';\nnew Anthropic({ apiKey: 'sk-ant-x' });` },
  ],
  invalid: [
    {
      code: `${IMPORT}\nconst c = new Anthropic({ apiKey: 'sk-ant-api03-hardcoded' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'apiKey' } }],
    },
    // authToken is the same class of credential. `data` is asserted on both
    // this and the apiKey case on purpose: the message interpolates {{prop}}
    // into the description AND the fix hint, and without pinning it the rule
    // could name either option for either input and still pass on messageId.
    {
      code: `${IMPORT}\nconst c = new Anthropic({ authToken: 'tok-live-123' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
    },
    {
      // Regression: a safe `apiKey` used to end the scan, so a hardcoded
      // `authToken` after it was never inspected. Anthropic is the only
      // config with two credential props, so this miss only showed up here.
      name: 'a safe apiKey does not hide a hardcoded authToken',
      code: `${IMPORT}\nconst c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, authToken: 'tok-live-123' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
    },
    // Quoted credential key — the prop name still comes from the source.
    {
      code: `${IMPORT}\nconst c = new Anthropic({ 'authToken': 'tok-live-123' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
    },
    // Agent SDK shares the client options
    {
      code: `import { query } from '@anthropic-ai/claude-agent-sdk';\nnew Anthropic({ apiKey: 'sk-ant-x' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // require() arms it
    {
      code: `const Anthropic = require('@anthropic-ai/sdk');\nnew Anthropic({ apiKey: 'sk-ant-x' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // String-literal key
    {
      code: `${IMPORT}\nnew Anthropic({ 'apiKey': 'sk-ant-x' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Factory-style call
    {
      code: `${IMPORT}\nconst c = createAnthropic({ apiKey: 'sk-ant-x' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ],
});
