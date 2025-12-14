/**
 * @fileoverview Tests for require-validated-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireValidatedPrompt } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-validated-prompt', requireValidatedPrompt, {
  valid: [
    // Static prompts are safe
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Summarize the following text',
        });
      `,
    },
    // Validated input is safe
    {
      code: `
        const safeInput = validateInput(userInput);
        await generateText({
          model: openai('gpt-4'),
          prompt: safeInput,
        });
      `,
    },
    // Sanitized prompt is safe
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: sanitizePrompt(userMessage),
        });
      `,
    },
    // Non-user variables are safe
    {
      code: `
        const systemConfig = getConfig();
        await generateText({
          model: openai('gpt-4'),
          prompt: systemConfig.defaultPrompt,
        });
      `,
    },
    // Not an AI call
    {
      code: `
        await someOtherFunction({
          prompt: userInput,
        });
      `,
    },
  ],

  invalid: [
    // Direct user input in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // User message in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userMessage,
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // User query in streamText
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: userQuery,
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // Template literal with unsafe input
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: \`Process this: \${userInput}\`,
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // Dynamic system prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          system: userInput,
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'unsafeSystemPrompt' }],
    },
    // Request body
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: req.body.message,
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // String concatenation
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello ' + userInput,
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // generateObject with user input
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: userQuery,
          schema: z.object({ name: z.string() }),
        });
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
  ],
});
