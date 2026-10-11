/**
 * @fileoverview Tests for require-validated-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireValidatedPrompt } from './index';
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

ruleTester.run('require-validated-prompt', requireValidatedPrompt, {
  valid: xai([
    // Static prompts are safe
    {
      name: 'a fixed prompt',
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
  ]),

  invalid: xai([
    // Direct user input in prompt
    {
      name: 'user input passed straight through as the prompt',
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
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures (Layer 1): option paths, key shapes, argument shapes
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-validated-prompt (coverage gaps)', requireValidatedPrompt, {
  valid: xai([
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
  ]),
  invalid: xai([
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
  ]),
});

// (Removed 2026-10-10) A Layer-2 synthetic test pinned the `|| 'user input'`
// label fallback for an Identifier with an empty name. The report label is now
// the node's source text, which is never empty for a parsed node, so the branch
// and its synthetic test are gone. See the fp-fn audit note.

// ─────────────────────────────────────────────────────────────────────────────
// AI SDK v7 renamed the system prompt to `instructions` (`system` is deprecated
// in the SDK's own types). Regression lock: the rule used to match `system` only.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-validated-prompt (instructions prop)', requireValidatedPrompt, {
  valid: [],
  invalid: xai([
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          instructions: \`You are an assistant. \${userInput}\`,
        });
      `,
      errors: [{ messageId: 'unsafeSystemPrompt' }],
    },
  ]),
});

// Computed key colliding with the property name — see no-dynamic-system-prompt.
ruleTester.run('require-validated-prompt (computed key collision)', requireValidatedPrompt, {
  valid: xai([
    {
      code: `
        const instructions = 'topP';
        generateText({ model, [instructions]: userInput });
      `,
    },
  ]),
  invalid: [],
});


// ─────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10: user input is recognised by SHAPE (read from the
// request), and a name pattern must be the name's head noun, whole words —
// `inputTokens` is a count of tokens, not an input.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('require-validated-prompt (fp-fn audit)', requireValidatedPrompt, {
  valid: xai([
    {
      name: 'a constant whose name merely starts with "input" is not user input',
      code: `
        const inputTokens = 1200;
        await generateText({ model, prompt: \`Summarize the usage report (\${inputTokens} tokens).\` });
      `,
    },
    {
      name: 'a value parsed through a schema is validated',
      code: `
        export async function POST(req) {
          const { query } = z.object({ query: z.string().max(500) }).parse(await req.json());
          return streamText({ model, prompt: query });
        }
      `,
    },
    {
      name: 'a value bound from a validator call is validated',
      code: `
        const safeInput = validateInput(userInput);
        await generateText({ model, prompt: safeInput });
      `,
    },
    {
      name: 'a runtime-keyed member names no property to match',
      code: `await generateText({ model, prompt: data[key] });`,
    },
    {
      name: 'a member of an unrelated object whose head noun is not an input word',
      code: `await generateText({ model, prompt: settings.inputMode });`,
    },
  ]),
  invalid: xai([
    {
      name: 'prompt destructured straight out of the request, under a neutral name',
      code: `
        export async function POST(req) {
          const { prompt } = await req.json();
          return streamText({ model, prompt });
        }
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    {
      name: 'a member of the parsed body interpolated into the prompt',
      code: `
        export async function POST(req) {
          const body = await req.json();
          return streamText({ model, prompt: \`Translate to French: \${body.text}\` });
        }
      `,
      errors: [{ messageId: 'unsafePrompt' }],
    },
    {
      name: 'a query-string value in the system prompt',
      code: `
        export async function GET(req) {
          const q = new URL(req.url).searchParams.get('q') ?? '';
          return streamText({ model, system: \`Answer about \${q}\`, prompt: 'go' });
        }
      `,
      errors: [{ messageId: 'unsafeSystemPrompt' }],
    },
  ]),
});
