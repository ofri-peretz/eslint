/**
 * @fileoverview Tests for require-embedding-validation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireEmbeddingValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-embedding-validation', requireEmbeddingValidation, {
  valid: [
    // Validated embedding
    {
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
  ],

  invalid: [
    // Direct embedding without validation
    {
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
  ],
});
