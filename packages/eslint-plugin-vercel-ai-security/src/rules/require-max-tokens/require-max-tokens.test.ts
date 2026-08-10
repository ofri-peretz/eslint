/**
 * @fileoverview Tests for require-max-tokens rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireMaxTokens } from './index';

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

ruleTester.run('require-max-tokens', requireMaxTokens, {
  valid: xai([
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
    // v5+ rename: maxOutputTokens
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          maxOutputTokens: 4096,
        });
      `,
    },
    // v5+ rename on streamText
    {
      code: `
        await streamText({
          model: 'openai/gpt-5',
          messages,
          maxOutputTokens: 2048,
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
  ]),

  invalid: xai([
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
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: argument shapes and key shapes
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-tokens (coverage gaps)', requireMaxTokens, {
  valid: xai([
    // no arguments — nothing to check
    { code: `generateText();` },
    // non-object first argument — nothing to check
    { code: `generateText(cfg);` },
    // string-literal 'max_tokens' key resolves via String(key.value)
    { code: `generateText({ 'max_tokens': 100, prompt: 'x' });` },
    // spread property skipped, real maxTokens still found
    { code: `generateText({ ...opts, maxTokens: 100 });` },
  ]),
  invalid: xai([
    // computed key resolves to null — maxTokens not found
    {
      code: `generateText({ [getKey()]: 100, prompt: 'x' });`,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// SDK version compatibility.
// v4 spelled the option `maxTokens`; v5+ renamed it to `maxOutputTokens`
// (CallSettings.maxOutputTokens — `maxTokens` no longer exists in ai@6).
// Both must satisfy the rule, or every v5+ codebase gets a false positive.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-tokens (AI SDK v4 + v5 option names)', requireMaxTokens, {
  valid: xai([
    // v5+: generateText with maxOutputTokens
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          maxOutputTokens: 4096,
        });
      `,
    },
    // v5+: streamText with maxOutputTokens
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          maxOutputTokens: 2048,
        });
      `,
    },
    // v5+: generateObject with maxOutputTokens
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: 'Generate user',
          maxOutputTokens: 1000,
          schema: z.object({ name: z.string() }),
        });
      `,
    },
    // v5+: snake_case variant (OpenAI-shaped proxies)
    { code: `generateText({ max_output_tokens: 100, prompt: 'x' });` },
    // v5+: string-literal key
    { code: `generateText({ 'maxOutputTokens': 100, prompt: 'x' });` },
    // v4 spelling still accepted
    { code: `generateText({ maxTokens: 100, prompt: 'x' });` },
  ]),
  invalid: xai([
    // v5+ call with no token limit at all is still reported
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          temperature: 0.7,
        });
      `,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
    // near-miss key must not be mistaken for the real option
    {
      code: `generateText({ maxOutputTokenCount: 100, prompt: 'x' });`,
      errors: [{ messageId: 'missingMaxTokens' }],
    },
  ]),
});
