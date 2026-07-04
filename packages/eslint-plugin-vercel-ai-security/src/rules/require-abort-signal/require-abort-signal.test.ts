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
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
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

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: argument shapes and key shapes
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-abort-signal (coverage gaps)', requireAbortSignal, {
  valid: [
    // no arguments — nothing to check
    { code: `streamText();` },
    // non-object first argument — nothing to check
    { code: `streamText(cfg);` },
    // spread property skipped, real abortSignal still found
    { code: `streamText({ ...opts, abortSignal: controller.signal });` },
    // string-literal 'signal' key resolves via String(key.value)
    { code: `streamText({ 'signal': controller.signal, prompt: 'x' });` },
  ],
  invalid: [
    // computed key resolves to null — abortSignal not found
    {
      code: `streamText({ [getKey()]: controller.signal, prompt: 'x' });`,
      errors: [{ messageId: 'missingAbortSignal' }],
    },
  ],
});
