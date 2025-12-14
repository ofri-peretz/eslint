/**
 * @fileoverview Tests for require-tool-confirmation rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireToolConfirmation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-tool-confirmation', requireToolConfirmation, {
  valid: [
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
  ],

  invalid: [
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
  ],
});
