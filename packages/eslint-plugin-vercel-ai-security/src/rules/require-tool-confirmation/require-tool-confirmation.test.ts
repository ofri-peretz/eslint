/**
 * @fileoverview Tests for require-tool-confirmation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolConfirmation } from './index';

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

ruleTester.run('require-tool-confirmation', requireToolConfirmation, {
  valid: xai([
    // Non-destructive tool - no confirmation needed
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: {
            getWeather: {
              description: 'Get weather',
              execute: async () => ({ temp: 72 }),
            },
          },
        });
      `,
    },
    // Destructive tool WITH confirmation
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Delete file',
          tools: {
            deleteFile: {
              description: 'Delete a file',
              requiresConfirmation: true,
              execute: async ({ path }) => deleteFile(path),
            },
          },
        });
      `,
    },
    // Transfer with approval flag
    {
      code: `
        await generateText({
          prompt: 'Transfer funds',
          tools: {
            transferFunds: {
              description: 'Transfer money',
              requireApproval: true,
              execute: async () => {},
            },
          },
        });
      `,
    },
    // Tool helper function (assumed handled)
    {
      code: `
        await generateText({
          prompt: 'Execute command',
          tools: {
            executeCommand: deleteTool,
          },
        });
      `,
    },
    // Read-only tools
    {
      code: `
        await streamText({
          prompt: 'Search',
          tools: {
            searchDocs: {
              description: 'Search documents',
              execute: async () => [],
            },
            readFile: {
              description: 'Read file',
              execute: async () => '',
            },
          },
        });
      `,
    },
    // Execute with confirmation
    {
      code: `
        await generateText({
          prompt: 'Run code',
          tools: {
            executeCode: {
              confirmation: true,
              execute: async () => {},
            },
          },
        });
      `,
    },
  ]),

  invalid: xai([
    // Delete without confirmation
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Delete files',
          tools: {
            deleteFile: {
              description: 'Delete a file',
              execute: async ({ path }) => fs.unlinkSync(path),
            },
          },
        });
      `,
      errors: [{ messageId: 'missingConfirmation' }],
    },
    // Transfer without approval
    {
      code: `
        await streamText({
          prompt: 'Send money',
          tools: {
            transferMoney: {
              description: 'Transfer funds',
              execute: async ({ to, amount }) => {},
            },
          },
        });
      `,
      errors: [{ messageId: 'missingConfirmation' }],
    },
    // Execute without confirmation
    {
      code: `
        await generateText({
          prompt: 'Run command',
          tools: {
            executeCommand: {
              description: 'Execute shell command',
              execute: async ({ cmd }) => exec(cmd),
            },
          },
        });
      `,
      errors: [{ messageId: 'missingConfirmation' }],
    },
    // Remove without confirmation
    {
      code: `
        await generateText({
          prompt: 'Clean up',
          tools: {
            removeEntry: {
              description: 'Remove entry',
              execute: async ({ id }) => db.remove(id),
            },
          },
        });
      `,
      errors: [{ messageId: 'missingConfirmation' }],
    },
    // Update without confirmation
    {
      code: `
        await generateText({
          prompt: 'Modify settings',
          tools: {
            updateSettings: {
              description: 'Update user settings',
              execute: async ({ settings }) => {},
            },
          },
        });
      `,
      errors: [{ messageId: 'missingConfirmation' }],
    },
  ]),
});
