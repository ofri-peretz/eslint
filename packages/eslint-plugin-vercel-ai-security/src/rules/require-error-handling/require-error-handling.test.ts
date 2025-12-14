/**
 * @fileoverview Tests for require-error-handling rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireErrorHandling } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-error-handling', requireErrorHandling, {
  valid: [
    // Inside try-catch with await
    {
      code: `
        try {
          await generateText({
            model: openai('gpt-4'),
            prompt: 'Hello',
          });
        } catch (error) {
          console.error(error);
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Nested try-catch
    {
      code: `
        async function handler() {
          try {
            const result = await streamText({
              model: anthropic('claude-3'),
              prompt: 'Hello',
            });
            return result;
          } catch (e) {
            throw new Error('AI call failed');
          }
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Not an AI function - should pass
    {
      code: `
        await someOtherFunction({
          prompt: 'Hello',
        });
      `,
      options: [{ allowInTests: false }],
    },
    // generateObject inside try-catch
    {
      code: `
        try {
          await generateObject({
            model: openai('gpt-4'),
            prompt: 'Generate',
            schema: z.object({ name: z.string() }),
          });
        } catch (e) {
          handleError(e);
        }
      `,
      options: [{ allowInTests: false }],
    },
    // streamObject inside try-catch
    {
      code: `
        try {
          await streamObject({
            model: anthropic('claude-3'),
            prompt: 'Stream',
          });
        } catch (e) {
          handleError(e);
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Non-awaited call inside try-catch
    {
      code: `
        try {
          generateText({ prompt: 'Hello' });
        } catch (e) {
          handleError(e);
        }
      `,
      options: [{ allowInTests: false }],
    },
  ],

  invalid: [
    // generateText without error handling
    {
      code: `
        const result = await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling' }],
    },
    // streamText without error handling in function
    {
      code: `
        async function handler() {
          return await streamText({
            model: anthropic('claude-3'),
            prompt: 'Hello',
          });
        }
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling' }],
    },
    // generateObject without error handling
    {
      code: `
        const obj = await generateObject({
          model: openai('gpt-4'),
          prompt: 'Generate',
          schema: z.object({ name: z.string() }),
        });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling' }],
    },
    // streamObject without error handling
    {
      code: `
        const stream = await streamObject({
          model: openai('gpt-4'),
          prompt: 'Stream objects',
        });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling' }],
    },
    // Non-awaited call without try-catch
    {
      code: `
        generateText({ prompt: 'Hello' });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling' }],
    },
  ],
});
