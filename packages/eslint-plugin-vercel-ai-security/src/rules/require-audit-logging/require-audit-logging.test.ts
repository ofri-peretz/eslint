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
    // Test file with allowInTests (default true)
    {
      code: `
        await generateText({ prompt: 'Hello' });
      `,
      filename: 'handler.test.ts',
    },
    // Winston logger before AI call
    {
      code: `
        async function handler() {
          winston.info('Processing');
          await streamObject({ prompt: 'Hello' });
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Pino logger
    {
      code: `
        async function handler() {
          pino.info('Processing');
          await generateText({ prompt: 'Hello' });
        }
      `,
      options: [{ allowInTests: false }],
    },
    // Top-level logging before AI call
    {
      code: `
        console.log('Starting');
        generateText({ prompt: 'Hello' });
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
    // No logging before streamObject
    {
      code: `
        async function generate() {
          const obj = await streamObject({ prompt: 'Create' });
          return obj;
        }
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging' }],
    },
    // Top-level without any logging
    {
      code: `
        generateText({ prompt: 'Hello' });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging' }],
    },
    // Test file with allowInTests: false
    {
      code: `
        async function handler() {
          await generateText({ prompt: 'Hello' });
        }
      `,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging' }],
    },
  ],
});
