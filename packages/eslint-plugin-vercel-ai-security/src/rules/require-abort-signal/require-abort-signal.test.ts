/**
 * @fileoverview Tests for require-abort-signal rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireAbortSignal } from './index';

/**
 * Every fixture imports the AI SDK, because the rules now abstain in files with
 * no `ai` / `@ai-sdk` in them. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving any binding,
// so fixtures that already declare `generateText`/`openai` do not redeclare.
const asAi = (code: string): string => `import 'ai';\n${code}`;
type AiSuggestion = { output?: string | null };
type AiCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly AiSuggestion[] } | string>;
};
const xai = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asAi(c) as T;
    const test = c as AiCase;
    return {
      ...c,
      code: asAi(test.code),
      ...(typeof test.output === 'string' ? { output: asAi(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asAi(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-abort-signal', requireAbortSignal, {
  valid: xai([
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
  ]),

  invalid: xai([
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
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: argument shapes and key shapes
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-abort-signal (coverage gaps)', requireAbortSignal, {
  valid: xai([
    // no arguments — nothing to check
    { code: `streamText();` },
    // non-object first argument — nothing to check
    { code: `streamText(cfg);` },
    // spread property skipped, real abortSignal still found
    { code: `streamText({ ...opts, abortSignal: controller.signal });` },
    // string-literal 'signal' key resolves via String(key.value)
    { code: `streamText({ 'signal': controller.signal, prompt: 'x' });` },
  ]),
  invalid: xai([
    // computed key resolves to null — abortSignal not found
    {
      code: `streamText({ [getKey()]: controller.signal, prompt: 'x' });`,
      errors: [{ messageId: 'missingAbortSignal' }],
    },
  ]),
});
