/**
 * @fileoverview Branch-coverage tests for require-embedding-validation.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireEmbeddingValidation } from './index';

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

ruleTester.run('require-embedding-validation (branch coverage)', requireEmbeddingValidation, {
  valid: xai([
    // Vector store op with a non-object argument — nothing to inspect.
    {
      code: `vectorStore.upsert(records);`,
    },
    // Spread element inside the argument object — skipped.
    {
      code: `vectorStore.upsert({ ...defaults });`,
    },
    // String-literal 'embedding' key — keyName resolves to null, prop skipped
    // (documented FN: only Identifier keys are matched).
    {
      code: `vectorStore.upsert({ 'embedding': await embed(text) });`,
    },
    // embedding value that is a plain identifier, not a call.
    {
      code: `vectorStore.upsert({ embedding: precomputedVector });`,
    },
  ]),
  invalid: xai([
    // Baseline: unvalidated embedding call still reported alongside skipped props.
    {
      code: `vectorStore.upsert({ ...defaults, embedding: await embed(text) });`,
      errors: [{ messageId: 'unvalidatedEmbedding' }],
    },
  ]),
});
