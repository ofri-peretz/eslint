/**
 * @fileoverview Tests for require-embedding-validation rule
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

ruleTester.run('require-embedding-validation', requireEmbeddingValidation, {
  valid: xai([
        'const x = 42;',
        'const flag = true;',
    // Validated embedding
    {
      name: 'the embedding is validated before upsert',
      code: `
        await vectorStore.upsert({
          id: docId,
          embedding: validateEmbedding(await embed(text)),
        });
      `,
    },
    // Normalized vector
    {
      code: `
        await index.add({
          vector: normalize(embedding),
        });
      `,
    },
    // Not a vector store operation
    {
      code: `
        const result = await embed(text);
      `,
    },
    // No embedding property
    {
      code: `
        await vectorStore.upsert({
          id: docId,
          text: content,
        });
      `,
    },
  ]),

  invalid: xai([
    // Direct embedding without validation
    {
      name: 'an embedding written to the store without being checked first',
      code: `
        await vectorStore.upsert({
          id: docId,
          embedding: await embed(text),
        });
      `,
      errors: [{ messageId: 'unvalidatedEmbedding' }],
    },
    // Unvalidated createEmbedding
    {
      code: `
        await index.insert({
          vector: await createEmbedding(input),
        });
      `,
      errors: [{ messageId: 'unvalidatedEmbedding' }],
    },
    // Direct getEmbedding
    {
      code: `
        await store.add({
          embedding: getEmbedding(content),
        });
      `,
      errors: [{ messageId: 'unvalidatedEmbedding' }],
    },
  ]),
});
