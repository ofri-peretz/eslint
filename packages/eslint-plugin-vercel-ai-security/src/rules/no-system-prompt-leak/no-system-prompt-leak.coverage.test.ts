/**
 * @fileoverview Branch-coverage tests for no-system-prompt-leak.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSystemPromptLeak } from './index';

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

ruleTester.run('no-system-prompt-leak (branch coverage)', noSystemPromptLeak, {
  valid: xai([
    // Spread element inside a returned object — skipped by checkObjectForLeaks.
    {
      code: `function f() { return { ...meta }; }`,
    },
    // Bare return with no argument.
    {
      code: `function f() { return; }`,
    },
    // res.json() with no argument at all.
    {
      code: `res.json();`,
    },
    // res.json() with a non-object argument.
    {
      code: `res.json(payload);`,
    },
  ]),
  invalid: xai([
    // Spread + leaking property in the same returned object: the spread is
    // skipped but the leaking property is still reported.
    {
      code: `function f() { return { ...meta, prompt: systemPrompt }; }`,
      errors: [{ messageId: 'systemPromptLeak', data: { variable: 'systemPrompt' } }],
    },
  ]),
});
