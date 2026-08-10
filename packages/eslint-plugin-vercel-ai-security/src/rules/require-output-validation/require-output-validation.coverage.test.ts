/**
 * @fileoverview Branch-coverage tests for require-output-validation.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireOutputValidation } from './index';

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

ruleTester.run('require-output-validation (branch coverage)', requireOutputValidation, {
  valid: xai([
    // Destructuring declarator — id is not an Identifier, tracking skipped.
    {
      code: `const { a } = result;`,
    },
    // Declarator with no initializer.
    {
      code: `let pendingOutput;`,
    },
    // Initializer that is not a MemberExpression.
    {
      code: `const n = 42;`,
    },
    // MemberExpression initializer that matches no AI output pattern.
    {
      code: `const x = obj.data;`,
    },
    // Display call with a spread-only object argument — non-Property skipped.
    {
      code: `render({ ...props });`,
    },
  ]),
  invalid: xai([
    // Spread + AI output property in the same displayed object: spread is
    // skipped, the AI-output property is still reported.
    {
      code: `render({ ...props, body: result.text });`,
      errors: [{ messageId: 'unvalidatedOutput' }],
    },
  ]),
});
