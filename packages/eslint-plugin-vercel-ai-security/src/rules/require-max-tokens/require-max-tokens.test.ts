/**
 * @fileoverview Tests for require-max-tokens rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireMaxTokens } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-max-tokens', requireMaxTokens, {
  valid: [
    // Has maxTokens
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          maxTokens: 4096,
        });
      `,
    },
    // Has max_tokens (snake case)
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          max_tokens: 2048,
        });
      `,
    },
    // generateObject with maxTokens
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: 'Generate user',
          maxTokens: 1000,
          schema: z.object({ name: z.string() }),
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someOtherFunction({
          prompt: 'Hello',
        });
      `,
    },
    // streamObject with maxTokens
    {
      code: `
        await streamObject({
          model: openai('gpt-4'),
          prompt: 'Stream data',
          maxTokens: 2000,
          schema: z.object({ id: z.number() }),
        });
      `,
    },
  ],

  invalid: [
    // generateText without maxTokens
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
    // streamText without maxTokens
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
    // generateObject without maxTokens
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: 'Generate user',
          schema: z.object({ name: z.string() }),
        });
      `,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
    // streamObject without maxTokens
    {
      code: `
        await streamObject({
          model: openai('gpt-4'),
          prompt: 'Stream objects',
          schema: z.object({ id: z.number() }),
        });
      `,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
  ],
});
