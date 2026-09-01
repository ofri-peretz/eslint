/**
 * @fileoverview Tests for require-error-handling rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireErrorHandling } from './index';

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

ruleTester.run('require-error-handling', requireErrorHandling, {
  valid: xai([
    // Inside try-catch with await
    {
      name: 'the call is wrapped in try/catch',
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
  ]),

  invalid: xai([
    // generateText without error handling
    {
      name: 'a provider call with no catch — a rate limit takes down the route',
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
  ]),
});
