/**
 * @fileoverview Tests for require-audit-logging rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireAuditLogging } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-audit-logging', requireAuditLogging, {
  valid: [
    // Logging before AI call
    {
      code: `
        async function handler() {
          logger.info('Starting AI generation');
          const result = await generateText({ prompt: 'Hello' });
          return result;
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Console log before
    {
      code: `
        async function handler() {
          console.log('AI call started', { userId });
          await streamText({ prompt: 'Hello' });
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Debug logging
    {
      code: `
        async function process() {
          debug('Processing request');
          const result = await generateObject({ prompt: 'Generate' });
          return result;
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Not an AI function
    {
      code: `
        async function handler() {
          await someOtherFunction({ prompt: 'Hello' });
        }
      `,
      options: [{ allowInTests: false }],
    },
  ],

  invalid: [
    // No logging before generateText
    {
      code: `
        async function handler() {
          const result = await generateText({ prompt: 'Hello' });
          return result;
        }
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging' }],
    },
    // No logging before streamText
    {
      code: `
        async function process() {
          await streamText({ prompt: 'Stream this' });
        }
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging' }],
    },
    // No logging before generateObject
    {
      code: `
        async function generate() {
          const obj = await generateObject({ prompt: 'Create' });
          return obj;
        }
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging' }],
    },
  ],
});
