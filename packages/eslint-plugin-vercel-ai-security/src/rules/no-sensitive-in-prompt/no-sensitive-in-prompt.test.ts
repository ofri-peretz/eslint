/**
 * @fileoverview Tests for no-sensitive-in-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveInPrompt } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-sensitive-in-prompt', noSensitiveInPrompt, {
  valid: [
    // Safe: no sensitive data
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: safeUserInput,
        });
      `,
    },
    // Safe: static prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello, how can I help you?',
        });
      `,
    },
    // Safe: validated user input
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: validateInput(userMessage),
        });
      `,
    },
    // Safe: non-sensitive variable
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: userName,
        });
      `,
    },
    // Safe: user question
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: \`Answer this question: \${userQuestion}\`,
          schema: z.object({ answer: z.string() }),
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          prompt: userPassword,
        });
      `,
    },
    // No prompt property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
        });
      `,
    },
    // Non-object argument
    {
      code: `
        await generateText(options);
      `,
    },
    // Non-matching property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          other: userPassword,
        });
      `,
    },
  ],

  invalid: [
    // Password in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // API key in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Secret in system prompt
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          system: \`Secret context: \${clientSecret}\`,
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Credit card in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: creditCardNumber,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Token in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: accessToken,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // SSN in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userSsn,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Member expression with sensitive property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: user.password,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Private key in template
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: \`Sign with: \${privateKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Database password
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: dbPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Binary expression with sensitive data
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Context: ' + userPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Nested binary expression
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: prefix + userSecret + suffix,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ],
});
