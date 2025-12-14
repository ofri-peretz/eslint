/**
 * @fileoverview Tests for require-request-timeout rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRequestTimeout } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-request-timeout', requireRequestTimeout, {
  valid: [
    // With abortSignal
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          abortSignal: controller.signal,
        });
      `,
      options: [{ allowInTests: false }],
    },
    // With timeout property
    {
      code: `
        await streamText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          timeout: 30000,
        });
      `,
      options: [{ allowInTests: false }],
    },
    // With signal
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: 'Hello',
          signal: abortController.signal,
        });
      `,
      options: [{ allowInTests: false }],
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          prompt: 'Hello',
        });
      `,
      options: [{ allowInTests: false }],
    },
  ],

  invalid: [
    // No timeout
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingTimeout' }],
    },
    // No options at all
    {
      code: `
        await streamText();
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingTimeout' }],
    },
    // Missing timeout in streamObject
    {
      code: `
        await streamObject({
          model: openai('gpt-4'),
          prompt: 'Generate',
          schema: mySchema,
        });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingTimeout' }],
    },
  ],
});
