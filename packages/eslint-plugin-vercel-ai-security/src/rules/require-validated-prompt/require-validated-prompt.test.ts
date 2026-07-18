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

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures (Layer 1): option paths, key shapes, argument shapes
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-validated-prompt (coverage gaps)', requireValidatedPrompt, {
  valid: [
    // allowInTests skips test files entirely
    {
      code: `generateText({ prompt: userInput });`,
      options: [{ allowInTests: true }],
      filename: 'prompt.test.ts',
    },
    // no arguments at all
    { code: `generateText();` },
    // non-object first argument
    { code: `generateText(cfg);` },
    // spread-only options object (property is not a Property node)
    { code: `generateText({ ...cfg });` },
    // computed key is skipped (keyName resolves to null)
    { code: `generateText({ [getKey()]: userInput });` },
    // concatenation of two static strings is safe
    { code: `generateText({ prompt: 'a' + 'b' });` },
    // template literal whose expressions are not user input
    { code: `generateText({ prompt: \`ctx: \${staticVal}\` });` },
    // static system prompt alongside validated prompt
    { code: `generateText({ system: 'static', prompt: validateInput(userInput) });` },
  ],
  invalid: [
    // string-literal 'prompt' key still resolves and reports
    {
      code: `generateText({ 'prompt': userInput });`,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // concatenation with user input on the right side
    {
      code: `generateText({ prompt: 'prefix: ' + userInput });`,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // concatenation with user input on the left side
    {
      code: `generateText({ prompt: userInput + ' suffix' });`,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // member expression user input (req.body)
    {
      code: `generateText({ prompt: req.body });`,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    // string-literal 'system' key with dynamic user input
    {
      code: `generateText({ 'system': userInput });`,
      errors: [{ messageId: 'unsafeSystemPrompt' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for parser-unreachable branches.
// A local mock context is used (instead of devkit's createWithMockContext)
// because this branch needs a node-sensitive getText stub: the callee must
// read as an AI SDK call while the matched identifier reads as user input.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import type { TSESLint } from '@interlace/eslint-devkit';

describe('require-validated-prompt — synthetic AST', () => {
  it('falls back to the "user input" label when the matched identifier has an empty name', () => {
    const reports: TSESLint.ReportDescriptor<string>[] = [];
    const callee = { type: 'Identifier', name: 'generateText' };
    const emptyNameIdentifier = { type: 'Identifier', name: '' };
    const callNode = {
      type: 'CallExpression',
      callee,
      arguments: [
        {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: { type: 'Identifier', name: 'prompt' },
              value: emptyNameIdentifier,
            },
          ],
        },
      ],
    };
    const context = {
      options: [{}],
      filename: 'synthetic.ts',
      sourceCode: {
        // Node-sensitive stub: callee looks like an AI SDK call, the empty-name
        // identifier looks like user input to the pattern matcher.
        getText: (n?: unknown) => (n === callee ? 'generateText' : 'userInput'),
      },
      report: (descriptor: TSESLint.ReportDescriptor<string>) => {
        reports.push(descriptor);
      },
    } as unknown as Parameters<typeof requireValidatedPrompt.create>[0];

    const listeners = requireValidatedPrompt.create(context);
    (listeners.CallExpression as (node: unknown) => void)(callNode);

    expect(reports).toHaveLength(1);
    const report = reports[0] as { messageId: string; data?: { input?: string } };
    expect(report.messageId).toBe('unsafePrompt');
    expect(report.data?.input).toBe('user input');
  });
});
