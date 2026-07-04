/**
 * @fileoverview Branch-coverage tests for require-rag-content-validation.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRagContentValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-rag-content-validation (branch coverage)', requireRagContentValidation, {
  valid: [
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
    // String-literal 'prompt' key — keyName resolves to null, prop skipped
    // (documented FN: only Identifier keys are matched).
    {
      code: `
        async function f() {
          const docs = await vectorStore.search(q);
          generateText({ 'prompt': docs });
        }
      `,
    },
  ],
  invalid: [
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
  ],
});
