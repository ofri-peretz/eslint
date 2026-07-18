/**
 * @fileoverview Branch-coverage tests for require-embedding-validation.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireEmbeddingValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-embedding-validation (branch coverage)', requireEmbeddingValidation, {
  valid: [
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
  ],
  invalid: [
    // Baseline: unvalidated embedding call still reported alongside skipped props.
    {
      code: `vectorStore.upsert({ ...defaults, embedding: await embed(text) });`,
      errors: [{ messageId: 'unvalidatedEmbedding' }],
    },
  ],
});
