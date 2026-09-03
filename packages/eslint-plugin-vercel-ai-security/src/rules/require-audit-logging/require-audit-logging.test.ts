/**
 * @fileoverview Tests for require-audit-logging rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireAuditLogging } from './index';

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

ruleTester.run('require-audit-logging', requireAuditLogging, {
  valid: xai([
    // Logging before AI call
    {
      name: 'the call is logged',
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
  ]),

  invalid: xai([
    // No logging before generateText
    {
      name: 'a generation with nothing recording that it happened',
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
  ]),
});
