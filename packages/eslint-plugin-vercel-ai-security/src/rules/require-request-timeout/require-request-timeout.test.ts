/**
 * @fileoverview Tests for require-request-timeout rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRequestTimeout } from './index';

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

ruleTester.run('require-request-timeout', requireRequestTimeout, {
  valid: xai([
        'const x = 42;',
        'const flag = true;',
    // With abortSignal
    {
      name: 'an abort signal bounds the call',
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
  ]),

  invalid: xai([
    // No timeout
    {
      name: 'a provider call that can hang for as long as the provider wants',
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
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: test-file skip, spread props, non-Identifier keys
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-request-timeout (coverage gaps)', requireRequestTimeout, {
  valid: xai([
    // allowInTests defaults to true — test files are skipped entirely
    {
      code: `generateText({ prompt: 'x' });`,
      filename: 'call.test.ts',
    },
    // spread properties are skipped while a real timeout prop still counts
    { code: `generateText({ ...opts, timeout: 5000, prompt: 'x' });` },
  ]),
  invalid: xai([
    // string-literal 'timeout' key is NOT recognized (keyName resolves to null)
    {
      code: `generateText({ 'timeout': 5000, prompt: 'x' });`,
      errors: [{ messageId: 'missingTimeout' }],
    },
  ]),
});
