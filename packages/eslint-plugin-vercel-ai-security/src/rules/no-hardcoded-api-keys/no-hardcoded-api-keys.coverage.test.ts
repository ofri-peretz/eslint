/**
 * @fileoverview Branch-coverage tests for no-hardcoded-api-keys.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedApiKeys } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-hardcoded-api-keys (branch coverage)', noHardcodedApiKeys, {
  valid: [
    // Computed MemberExpression key — key is neither Identifier nor Literal,
    // so keyName resolves to null and the Property handler bails out.
    {
      code: `
        const config = {
          [settings.keyName]: 'sk-abcdefghijklmnopqrstuvwxyz123456',
        };
      `,
    },
    // Spread element in provider options — non-Property entries are skipped.
    {
      code: `const model = openai('gpt-4', { ...providerDefaults });`,
    },
    // Computed key in provider options — keyName is null, entry skipped.
    {
      code: `const model = openai('gpt-4', { [cfg.field]: 'value' });`,
    },
    // Provider option that is not an API key property.
    {
      code: `const model = openai('gpt-4', { baseURL: 'https://api.example.com' });`,
    },
    // apiKey in provider options whose value is not a string literal.
    {
      code: `const model = openai('gpt-4', { apiKey: fetchKey() });`,
    },
  ],
  invalid: [
    // String-literal snake_case key — Literal key path via String(key.value).
    {
      code: `
        const config = {
          'api_key': 'sk-abcdefghijklmnopqrstuvwxyz123456',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ],
});
