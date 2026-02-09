/**
 * @fileoverview Tests for require-tool-schema rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolSchema } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-tool-schema', requireToolSchema, {
  valid: [
    // Tool with inputSchema
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: {
            weather: {
              inputSchema: z.object({ location: z.string() }),
              execute: async ({ location }) => ({ temp: 72 }),
            },
          },
        });
      `,
    },
    // Tool helper with inputSchema
    {
      code: `
        const weatherTool = tool({
          description: 'Get weather',
          inputSchema: z.object({ location: z.string() }),
          execute: async ({ location }) => ({ temp: 72 }),
        });
      `,
    },
    // Tool with parameters (alternative name)
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: {
            search: {
              parameters: z.object({ query: z.string() }),
              execute: async ({ query }) => [],
            },
          },
        });
      `,
    },
    // No tools property - valid
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          tools: {
            noSchema: { execute: async () => {} },
          },
        });
      `,
    },
    // Test file with allowInTests
    {
      code: `
        await generateText({
          tools: { weather: { execute: async () => {} } },
          prompt: 'Hello',
        });
      `,
      filename: 'handler.test.ts',
      options: [{ allowInTests: true }],
    },
    // No arguments — early return
    {
      code: `
        await generateText();
      `,
    },
    // Non-object argument — early return
    {
      code: `
        await generateText(config);
      `,
    },
    // Tool value is a CallExpression (tool() helper), checked separately
    {
      code: `
        await generateText({
          prompt: 'Hello',
          tools: {
            weather: tool({
              inputSchema: z.object({ location: z.string() }),
              execute: async () => ({}),
            }),
          },
        });
      `,
    },
    // Spread elements in tools object — gracefully ignored
    {
      code: `
        await generateText({
          prompt: 'Hello',
          tools: {
            ...existingTools,
            weather: {
              inputSchema: z.object({ location: z.string() }),
              execute: async () => ({}),
            },
          },
        });
      `,
    },
  ],

  invalid: [
    // Tool missing inputSchema
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: {
            weather: {
              description: 'Get weather',
              execute: async () => ({ temp: 72 }),
            },
          },
        });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Tool helper without inputSchema
    {
      code: `
        const myTool = tool({
          description: 'Do something',
          execute: async () => ({}),
        });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Multiple tools, one missing schema
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          tools: {
            goodTool: {
              inputSchema: z.object({ x: z.number() }),
              execute: async () => {},
            },
            badTool: {
              description: 'Missing schema',
              execute: async () => {},
            },
          },
        });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // generateObject with tool missing schema
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: 'Generate',
          tools: {
            helper: {
              execute: async () => {},
            },
          },
        });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // streamObject with tools missing schema
    {
      code: `
        await streamObject({
          model: openai('gpt-4'),
          prompt: 'Generate',
          tools: {
            helper: {
              execute: async () => {},
            },
          },
        });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
    // Tool with spread element in its value — spread is not Property, ignored, but tool itself missing schema
    {
      code: `
        await generateText({
          prompt: 'Hello',
          tools: {
            weather: {
              ...baseToolDef,
              execute: async () => ({}),
            },
          },
        });
      `,
      errors: [{ messageId: 'missingInputSchema' }],
    },
  ],
});

