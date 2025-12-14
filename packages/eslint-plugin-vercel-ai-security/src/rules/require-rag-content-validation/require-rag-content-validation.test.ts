/**
 * @fileoverview Tests for require-rag-content-validation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRagContentValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-rag-content-validation', requireRagContentValidation, {
  valid: [
    // Validated RAG content
    {
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
  ],

  invalid: [
    // Direct vector store results in prompt
    {
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
  ],
});
