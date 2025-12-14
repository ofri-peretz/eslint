/**
 * @fileoverview Tests for no-dynamic-system-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicSystemPrompt } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-dynamic-system-prompt', noDynamicSystemPrompt, {
  valid: [
    // Static string literal
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          system: 'You are a helpful assistant.',
          prompt: userInput,
        });
      `,
    },
    // Static constant
    {
      code: `
        const SYSTEM = 'You are a helpful assistant.';
        await generateText({
          system: SYSTEM,
          prompt: userInput,
        });
      `,
    },
    // Static template literal (no expressions)
    {
      code: `
        await streamText({
          system: \`You are a helpful assistant.
          You can help with coding tasks.\`,
          prompt: userInput,
        });
      `,
    },
    // No system property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userInput,
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          system: \`Dynamic: \${role}\`,
        });
      `,
    },
  ],

  invalid: [
    // Template literal with expression
    {
      code: `
        await generateText({
          system: \`You are a \${role} assistant.\`,
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Concatenation
    {
      code: `
        await generateText({
          system: 'You are a ' + role + ' assistant.',
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Function call result
    {
      code: `
        await streamText({
          system: getSystemPrompt(agentType),
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Await expression
    {
      code: `
        await generateObject({
          system: await fetchSystemPrompt(),
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Template with multiple expressions
    {
      code: `
        await generateText({
          system: \`You are \${name}. Your role is \${role}.\`,
          prompt: question,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
  ],
});
