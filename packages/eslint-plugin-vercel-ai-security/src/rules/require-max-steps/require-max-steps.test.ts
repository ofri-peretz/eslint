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


// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: key shapes for tools/maxSteps detection
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-steps (coverage gaps)', requireMaxSteps, {
  valid: [
    // string-literal 'tools' key is NOT recognized — rule bails before maxSteps check
    { code: `generateText({ 'tools': myTools, prompt: 'x' });` },
    // spread-only options object
    { code: `generateText({ ...opts });` },
    // string-literal 'maxSteps' key resolves via String(key.value)
    { code: `generateText({ tools: myTools, 'maxSteps': 3 });` },
    // snake_case max_steps also accepted
    { code: `generateText({ tools: myTools, max_steps: 3 });` },
  ],
  invalid: [
    // computed key resolves to null — maxSteps not found
    {
      code: `generateText({ tools: myTools, [getKey()]: 3 });`,
      errors: [{ messageId: 'missingMaxSteps' }],
    },
  ],
});

// ─────────────────────────────────────────────────────────────────────────────
// SDK version compatibility.
// v4 bounded the tool loop with `maxSteps`; v5+ replaced it with
// `stopWhen` (idiomatically `stopWhen: stepCountIs(n)` — `maxSteps` no longer
// exists in ai@6). Both must satisfy the rule, or every v5+ codebase gets a
// false positive.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-steps (AI SDK v4 + v5 option names)', requireMaxSteps, {
  valid: [
    // v5+: the canonical replacement
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: { weather: weatherTool },
          stopWhen: stepCountIs(5),
        });
      `,
    },
    // v5+: streamText with stopWhen
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          tools: { search: searchTool },
          stopWhen: stepCountIs(10),
        });
      `,
    },
    // v5+: stopWhen accepts an array of conditions
    {
      code: `
        await generateText({
          tools: { weather: weatherTool },
          stopWhen: [stepCountIs(5), hasToolCall('final')],
        });
      `,
    },
    // v5+: any StopCondition terminates the loop, not just stepCountIs
    { code: `generateText({ tools: myTools, stopWhen: hasToolCall('answer') });` },
    // v5+: string-literal key
    { code: `generateText({ tools: myTools, 'stopWhen': stepCountIs(3) });` },
    // v4 spelling still accepted
    { code: `generateText({ tools: myTools, maxSteps: 3 });` },
  ],
  invalid: [
    // v5+ call with tools and no bound at all is still reported
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: { weather: weatherTool },
          maxOutputTokens: 4096,
        });
      `,
      errors: [{ messageId: 'missingMaxSteps' }],
    },
    // near-miss key must not be mistaken for the real option
    {
      code: `generateText({ tools: myTools, stopWhenever: stepCountIs(3) });`,
      errors: [{ messageId: 'missingMaxSteps' }],
    },
  ],
});
