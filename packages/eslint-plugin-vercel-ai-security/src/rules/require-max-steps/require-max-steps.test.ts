/**
 * @fileoverview Tests for require-max-steps rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireMaxSteps } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-max-steps', requireMaxSteps, {
  valid: [
    // Has maxSteps
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: { weather: weatherTool },
          maxSteps: 5,
        });
      `,
    },
    // No tools - maxSteps not required
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
        });
      `,
    },
    // streamText with maxSteps
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          tools: { search: searchTool },
          maxSteps: 10,
        });
      `,
    },
    // generateObject doesn't need maxSteps (no tool loops)
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: 'Generate',
          tools: { helper: helperTool },
          schema: z.object({ name: z.string() }),
        });
      `,
    },
    // Not an AI function — should be skipped entirely
    {
      code: `
        await someOtherFunction({
          tools: { helper: helperTool },
        });
      `,
    },
    // No arguments at all — early return
    {
      code: `
        await generateText();
      `,
    },
    // Non-object argument — early return
    {
      code: `
        await generateText(someVariable);
      `,
    },
    // tools with max_steps (underscore variant)
    {
      code: `
        await generateText({
          prompt: 'Hello',
          tools: { weather: weatherTool },
          max_steps: 5,
        });
      `,
    },
    // Tools with spread element properties (spread should be ignored gracefully)
    {
      code: `
        await generateText({
          ...baseOptions,
          tools: { helper: helperTool },
          maxSteps: 3,
        });
      `,
    },
  ],

  invalid: [
    // generateText with tools but no maxSteps
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: {
            weather: weatherTool,
          },
        });
      `,
      errors: [{ messageId: 'missingMaxSteps' }],
    },
    // streamText with tools but no maxSteps
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          tools: {
            search: searchTool,
            weather: weatherTool,
          },
        });
      `,
      errors: [{ messageId: 'missingMaxSteps' }],
    },
    // Tools with spread elements but no maxSteps
    {
      code: `
        await generateText({
          ...baseOptions,
          tools: { helper: helperTool },
        });
      `,
      errors: [{ messageId: 'missingMaxSteps' }],
    },
  ],
});

