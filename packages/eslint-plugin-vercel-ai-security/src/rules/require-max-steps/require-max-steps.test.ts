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
  ],
});
