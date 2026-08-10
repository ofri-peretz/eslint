/**
 * @fileoverview Tests for require-tool-schema rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolSchema } from './index';

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

ruleTester.run('require-tool-schema', requireToolSchema, {
  valid: xai([
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
  ]),

  invalid: xai([
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
  ]),
});

