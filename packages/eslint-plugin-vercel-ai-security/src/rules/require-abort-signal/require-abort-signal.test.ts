/**
 * @fileoverview Tests for require-abort-signal rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireAbortSignal } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-abort-signal', requireAbortSignal, {
  valid: [
    // Has abortSignal
    {
      code: `
        const controller = new AbortController();
        await streamText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          abortSignal: controller.signal,
        });
      `,
    },
    // Has signal (alternative name)
    {
      code: `
        await streamObject({
          model: anthropic('claude-3'),
          prompt: 'Generate',
          signal: abortController.signal,
          schema: z.object({ name: z.string() }),
        });
      `,
    },
    // generateText doesn't need abort signal (non-streaming)
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          prompt: 'Hello',
        });
      `,
    },
  ],

  invalid: [
    // streamText without abortSignal
    {
      code: `
        await streamText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'missingAbortSignal' }],
    },
    // streamObject without abortSignal
    {
      code: `
        await streamObject({
          model: anthropic('claude-3'),
          prompt: 'Generate',
          schema: z.object({ name: z.string() }),
        });
      `,
      errors: [{ messageId: 'missingAbortSignal' }],
    },
  ],
});
