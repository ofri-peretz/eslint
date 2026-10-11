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

// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10: RAG calls are matched by whole word of the call
// chain (`researchTopic` has no `search` word), and `context` is not a default
// RAG word (`getRequestContext()` retrieves no documents).
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-rag-content-validation (fp-fn audit)', requireRagContentValidation, {
  valid: xai([
    {
      name: 'a call whose name merely contains "search"',
      code: `
        const notes = await researchTopic(topic);
        await generateText({ model, prompt: \`Notes: \${notes}\` });
      `,
    },
    {
      name: 'a request context is not retrieved content',
      code: `
        const ctx = getRequestContext();
        await generateText({ model, prompt: \`Locale: \${ctx}\` });
      `,
    },
    {
      name: 'a user function whose name contains generateText is not the SDK',
      code: `
        const docs = await vectorStore.search(q);
        generateTextureAtlas({ prompt: docs });
      `,
    },
  ]),
  invalid: xai([
    {
      name: 'a store chosen at runtime is still searched',
      code: `
        const hits = await stores[kind].search(q);
        await generateText({ model, prompt: \`\${hits}\` });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
    {
      name: 'retrieved docs filtered with Array#filter are still unvalidated content',
      code: `
        const docs = (await vectorStore.similaritySearch(question, 8)).filter((d) => d.score > 0.8);
        await generateText({ model, prompt: \`\${docs}\` });
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Zero-deferral pass 2026-10-11: retrieved content is followed through
// derivations (.map/.join/.filter/.slice, templates, member reads) and the
// returns of same-file helpers into the prompt.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-rag-content-validation (derivations)', requireRagContentValidation, {
  valid: xai([
    {
      // guard reasoned from F-20: a same-file validator is a barrier, not a derivation
      name: 'guard: retrieved docs passed through a same-file sanitizer before the prompt',
      code: `
        function sanitizeDocs(docs) { return docs.map((d) => stripInstructions(d.pageContent)); }
        export async function answer(question) {
          const docs = await vectorStore.similaritySearch(question, 4);
          const safe = sanitizeDocs(docs);
          return generateText({ model, system: \`Context: \${safe}\`, prompt: question });
        }
      `,
    },
    {
      // guard reasoned from F-20: an unrelated array derivation must not taint
      name: 'guard: a derived array that never touched retrieved content',
      code: `
        const RULES = ['Be brief.', 'Cite sources.'];
        await generateText({ model, system: RULES.map((r) => '- ' + r).join('\\n'), prompt: q });
      `,
    },
  ]),
  invalid: xai([
    {
      // @found F-20, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md)
      name: 'FN: retrieved docs mapped and joined into a context variable',
      code: `
        export async function answer(question) {
          const docs = await vectorStore.similaritySearch(question, 4);
          const context = docs.map((d) => d.pageContent).join('\\n---\\n');
          return generateText({ model, system: \`Answer only from the context below.\\n\\n\${context}\`, prompt: question });
        }
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
    {
      // @found F-20, harness-reproduced FP/FN audit 2026-10-10 (Pinecone shape)
      name: 'FN: query matches reshaped, then joined inside the prompt template',
      code: `
        export async function answer2(question, embedding) {
          const res = await index.query({ vector: embedding, topK: 5, includeMetadata: true });
          // neutral names on purpose: the rule must not lean on \`chunks\` being a RAG word
          const foo = res.matches.map((m) => m.metadata.text);
          return streamText({ model, prompt: \`Context:\\n\${foo.join('\\n')}\\n\\nQ: \${question}\` });
        }
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
    {
      // @found reasoned from F-20: the same derivation inside a same-file formatter
      name: 'FN: retrieved docs formatted by a same-file helper',
      code: `
        function formatDocs(docs) { return docs.slice(0, 3).map((d) => d.pageContent).join('\\n'); }
        export async function answer(question) {
          const docs = await retrieve(question);
          return generateText({ model, system: formatDocs(docs), prompt: question });
        }
      `,
      errors: [{ messageId: 'unsanitizedRagContent' }],
    },
  ]),
});
