/**
 * @fileoverview Tests for require-rag-content-validation rule
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

ruleTester.run('require-rag-content-validation', requireRagContentValidation, {
  valid: xai([
    // Validated RAG content
    {
      name: 'the retrieved content is validated first',
      code: `
        const docs = await vectorStore.search(query);
        await generateText({
          prompt: buildPrompt(validateContent(docs)),
        });
      `,
    },
    // Sanitized documents
    {
      code: `
        const results = await retrieve(query);
        await streamText({
          prompt: \`Context: \${sanitize(results)}\`,
        });
      `,
    },
    // No RAG content
    {
      code: `
        await generateText({
          prompt: userInput,
        });
      `,
    },
    // Filtered before use
    {
      code: `
        const chunks = await getDocuments(id);
        const safe = filterDocs(chunks);
        await generateText({
          prompt: \`Docs: \${safe}\`,
        });
      `,
    },
    // Not an AI function
    {
      code: `
        const docs = await search(query);
        await someFunction({
          prompt: \`Docs: \${docs}\`,
        });
      `,
    },
  ]),

  invalid: xai([
    // Direct vector store results in prompt
    {
      name: 'retrieved documents interpolated straight into the prompt',
      code: `
        const docs = await vectorStore.search(query);
        await generateText({
          prompt: \`Based on: \${docs}\`,
        });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
    // Unvalidated RAG call inline
    {
      code: `
        await streamText({
          prompt: \`Context: \${await retrieve(query)}\`,
        });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
    // Direct search results
    {
      code: `
        const results = await similaritySearch(embedding);
        await generateObject({
          prompt: \`Use this context: \${results}\`,
        });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI SDK v7 renamed the system prompt to `instructions` (`system` is deprecated
// in the SDK's own types). Regression lock: the rule used to match `system` only.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-rag-content-validation (instructions prop)', requireRagContentValidation, {
  valid: xai([]),
  invalid: xai([
    {
      code: `
        await streamText({
          instructions: \`Context: \${await retrieve(query)}\`,
        });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
  ]),
});

// Quoted keys are the same property as bare ones.
ruleTester.run('require-rag-content-validation (quoted key)', requireRagContentValidation, {
  valid: xai([]),
  invalid: xai([
    {
      code: `
        await streamText({
          "instructions": \`Context: \${await retrieve(query)}\`,
        });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
  ]),
});

// Computed key colliding with the property name — see no-dynamic-system-prompt.
ruleTester.run('require-rag-content-validation (computed key collision)', requireRagContentValidation, {
  valid: xai([
    {
      code: `
        const instructions = 'seed';
        streamText({ [instructions]: await retrieve(query) });
      `,
    },
  ]),
  invalid: xai([]),
});
