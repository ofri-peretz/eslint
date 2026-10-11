/**
 * @fileoverview Tests for require-max-steps rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireMaxSteps } from './index';

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

ruleTester.run('require-max-steps', requireMaxSteps, {
  valid: xai([
    // Has maxSteps
    {
      name: 'maxSteps is set',
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
    // v5+: stopWhen with stepCountIs replaces maxSteps
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
    // v7 idiom (e.g. nuxt-ui chat template): stopWhen: isStepCount(5)
    {
      code: `
        await streamText({
          model: 'openai/gpt-5',
          messages,
          tools: { getWeather },
          stopWhen: isStepCount(5),
        });
      `,
    },
    // v5+: stopWhen array of conditions
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: 'Hello',
          tools: { search: searchTool },
          stopWhen: [stepCountIs(10), hasToolCall('finalize')],
        });
      `,
    },
    // (Changed 2026-10-10) Tools with no step option used to be reported. With
    // no maxSteps/stopWhen the SDK runs exactly ONE step (v4 maxSteps: 1,
    // v5+ stopWhen: stepCountIs(1)), so the loop the message warned about
    // cannot happen — this is the safest configuration there is.
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
    },
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
    },
    {
      code: `
        await generateText({
          ...baseOptions,
          tools: { helper: helperTool },
        });
      `,
    },
  ]),

  invalid: xai([]),
});


// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: key shapes for tools/maxSteps detection
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-steps (coverage gaps)', requireMaxSteps, {
  valid: xai([
    // string-literal 'tools' key is NOT recognized — rule bails before maxSteps check
    { code: `generateText({ 'tools': myTools, prompt: 'x' });` },
    // spread-only options object
    { code: `generateText({ ...opts });` },
    // string-literal 'maxSteps' key resolves via String(key.value)
    { code: `generateText({ tools: myTools, 'maxSteps': 3 });` },
    // snake_case max_steps also accepted
    { code: `generateText({ tools: myTools, max_steps: 3 });` },
    // (Changed 2026-10-10) a computed key sets no known step option, so the
    // SDK default of one step applies — no longer reported.
    { code: `generateText({ tools: myTools, [getKey()]: 3 });` },
  ]),
  invalid: xai([]),
});

// ─────────────────────────────────────────────────────────────────────────────
// SDK version compatibility.
// v4 bounded the tool loop with `maxSteps`; v5+ replaced it with
// `stopWhen` (idiomatically `stopWhen: stepCountIs(n)` — `maxSteps` no longer
// exists in ai@6). Both must satisfy the rule, or every v5+ codebase gets a
// false positive.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-steps (AI SDK v4 + v5 option names)', requireMaxSteps, {
  valid: xai([
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
    // (Changed 2026-10-10) `stopWhen: hasToolCall('answer')` alone moved to
    // invalid: it stops only if the model ever calls that tool, so it bounds
    // nothing. It is covered in the fp-fn audit suite below.
    // v5+: string-literal key
    { code: `generateText({ tools: myTools, 'stopWhen': stepCountIs(3) });` },
    // v4 spelling still accepted
    { code: `generateText({ tools: myTools, maxSteps: 3 });` },
    // (Changed 2026-10-10) no step option means the one-step default — valid.
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello',
          tools: { weather: weatherTool },
          maxOutputTokens: 4096,
        });
      `,
    },
    { code: `generateText({ tools: myTools, stopWhenever: stepCountIs(3) });` },
  ]),
  invalid: xai([]),
});


// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10: report UNBOUNDED step configurations, not absent ones.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-max-steps (fp-fn audit)', requireMaxSteps, {
  valid: xai([
    {
      name: 'tools with no step option run a single step (SDK default) — not reported',
      code: `const { toolCalls } = await generateText({ model, tools: { getWeather }, prompt: 'Weather in Paris?' });`,
    },
    {
      name: 'hasToolCall combined with a step count is bounded',
      code: `await generateText({ model, tools, stopWhen: [hasToolCall('done'), stepCountIs(20)] });`,
    },
    {
      name: 'a custom stop condition is not provably unbounded',
      code: `await generateText({ model, tools, stopWhen: myCondition });`,
    },
    {
      name: 'a step count from server config is bounded',
      code: `await generateText({ model, tools, maxSteps: config.maxSteps });`,
    },
    {
      name: 'an unrelated function named like the SDK is not checked',
      code: `generateTextureAtlas({ tools, stopWhen: hasToolCall('x') });`,
    },
  ]),
  invalid: xai([
    {
      name: 'hasToolCall alone never bounds the loop',
      code: `await generateText({ model, tools: { getWeather }, stopWhen: hasToolCall('finalAnswer'), prompt: 'research' });`,
      errors: [{ messageId: 'unboundedSteps' }],
    },
    {
      name: 'an array of only hasToolCall conditions never bounds the loop',
      code: `await generateText({ model, tools, stopWhen: [hasToolCall('a'), hasToolCall('b')] });`,
      errors: [{ messageId: 'unboundedSteps' }],
    },
    {
      name: 'maxSteps taken from the request body',
      code: `
        export async function POST(req) {
          const body = await req.json();
          return streamText({ model, tools, maxSteps: body.maxSteps, prompt: 'x' });
        }
      `,
      errors: [{ messageId: 'unboundedSteps' }],
    },
    {
      name: 'stepCountIs with a request-chosen count',
      code: `
        export async function POST(req) {
          const { steps } = await req.json();
          return streamText({ model, tools, stopWhen: stepCountIs(steps) });
        }
      `,
      errors: [{ messageId: 'unboundedSteps' }],
    },
    {
      name: 'a stop condition taken from the request body',
      code: `
        export async function POST(req) {
          return streamText({ model, tools, stopWhen: req.body.stopWhen });
        }
      `,
      errors: [{ messageId: 'unboundedSteps' }],
    },
    {
      name: 'maxSteps: Infinity',
      code: `await generateText({ model, tools, maxSteps: Infinity });`,
      errors: [{ messageId: 'unboundedSteps' }],
    },
  ]),
});
