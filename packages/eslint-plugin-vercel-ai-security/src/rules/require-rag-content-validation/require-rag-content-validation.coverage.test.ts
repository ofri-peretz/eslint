/**
 * @fileoverview Branch-coverage tests for require-rag-content-validation.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRagContentValidation } from './index';

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

ruleTester.run('require-rag-content-validation (branch coverage)', requireRagContentValidation, {
  valid: xai([
    // Awaited identifier init — isRagCall bails on non-CallExpression.
    {
      code: `
        async function f() {
          const docs = await cachedDocs;
          generateText({ prompt: docs });
        }
      `,
    },
    // Array-pattern declarator — id is not an Identifier, tracking skipped.
    {
      code: `const [first] = items;`,
    },
    // Declarator with no initializer.
    {
      code: `let docs;`,
    },
    // AI call with no arguments.
    {
      code: `generateText();`,
    },
    // AI call whose options argument is not an object literal.
    {
      code: `generateText(makeOptions());`,
    },
    // Spread-only options object — non-Property entries skipped.
    {
      code: `
        async function f() {
          const docs = await vectorStore.search(q);
          generateText({ ...baseOptions });
        }
      `,
    },
    // Computed key — the name genuinely isn't statically known.
    {
      code: `
        async function f() {
          const docs = await vectorStore.search(q);
          generateText({ [k]: docs });
        }
      `,
    },
  ]),
  invalid: xai([
    // Was a "documented FN: only Identifier keys are matched" entry in `valid`.
    // Quoting a key doesn't change what the property means, so recording the
    // miss as expected behaviour just made the gap permanent.
    {
      code: `
        async function f() {
          const docs = await vectorStore.search(q);
          generateText({ 'prompt': docs });
        }
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
    // RAG content reaching the system property (not just prompt).
    {
      code: `
        async function f() {
          const docs = await vectorStore.search(q);
          generateText({ model: m, system: docs });
        }
      `,
      errors: [{ messageId: 'unsanitizedRagContent', data: { source: 'docs' } }],
    },
  ]),
});
