/**
 * @fileoverview Branch-coverage tests for require-error-handling.
 * Layer 1 only — the test-file early return and the allowInTests option
 * branches are reachable via RuleTester's `filename` support.
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

ruleTester.run('require-error-handling (branch coverage)', requireErrorHandling, {
  valid: xai([
    // Test file with default options — rule disables itself entirely.
    {
      code: `async function f() { const r = await generateText({ prompt: p }); }`,
      filename: 'handler.test.ts',
    },
    // Spec-suffixed file also matches the test-file pattern.
    {
      code: `async function f() { const r = await streamText({ prompt: p }); }`,
      filename: 'handler.spec.tsx',
    },
  ]),
  invalid: xai([
    // allowInTests: false — test filename no longer exempts the call.
    {
      code: `async function f() { const r = await generateText({ prompt: p }); }`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling', data: { function: 'generateText' } }],
    },
  ]),
});
