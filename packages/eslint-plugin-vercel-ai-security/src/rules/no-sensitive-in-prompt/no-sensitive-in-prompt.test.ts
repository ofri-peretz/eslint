/**
 * @fileoverview Tests for no-sensitive-in-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveInPrompt } from './index';

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

ruleTester.run('no-sensitive-in-prompt', noSensitiveInPrompt, {
  valid: xai([
    // Safe: no sensitive data
    {
      name: 'ordinary user input',
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: safeUserInput,
        });
      `,
    },
    // Safe: static prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Hello, how can I help you?',
        });
      `,
    },
    // Safe: validated user input
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: validateInput(userMessage),
        });
      `,
    },
    // Safe: non-sensitive variable
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: userName,
        });
      `,
    },
    // Safe: user question
    {
      code: `
        await generateObject({
          model: openai('gpt-4'),
          prompt: \`Answer this question: \${userQuestion}\`,
          schema: z.object({ answer: z.string() }),
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          prompt: userPassword,
        });
      `,
    },
    // No prompt property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
        });
      `,
    },
    // Non-object argument
    {
      code: `
        await generateText(options);
      `,
    },
    // Non-matching property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          other: userPassword,
        });
      `,
    },
  ]),

  invalid: xai([
    // Password in prompt
    {
      name: 'a password sent to the provider as prompt text',
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // API key in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Secret in system prompt
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          system: \`Secret context: \${clientSecret}\`,
          prompt: 'Hello',
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Credit card in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: creditCardNumber,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Token in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: accessToken,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // SSN in prompt
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userSsn,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Member expression with sensitive property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: user.password,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Private key in template
    {
      code: `
        await streamText({
          model: anthropic('claude-3'),
          prompt: \`Sign with: \${privateKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Database password
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: dbPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Binary expression with sensitive data
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: 'Context: ' + userPassword,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
    // Nested binary expression
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: prefix + userSecret + suffix,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: key shapes, member/binary edge branches
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-sensitive-in-prompt (coverage gaps)', noSensitiveInPrompt, {
  valid: xai([
    // spread-only options object
    { code: `generateText({ ...opts });` },
    // computed key — the name genuinely isn't statically known
    { code: `generateText({ [k]: password });` },
    // computed member access — property is not an Identifier
    { code: `generateText({ prompt: user['password'] });` },
    // member access to a non-sensitive property
    { code: `generateText({ prompt: user.displayName });` },
    // concatenation of two non-sensitive operands
    { code: `generateText({ prompt: 'a' + 'b' });` },
  ]),
  invalid: xai([
    // sensitive value on the right side of concatenation
    {
      code: `generateText({ prompt: 'user data: ' + password });`,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI SDK v7 renamed the system prompt to `instructions` (`system` is deprecated
// in the SDK's own types). Regression lock: the props set used to carry `system`
// only, so secrets interpolated into `instructions` went unreported.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-sensitive-in-prompt (instructions prop)', noSensitiveInPrompt, {
  valid: xai([]),
  invalid: xai([
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          instructions: \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// Quoted keys are the same property as bare ones — `{ "instructions": x }` must
// be read like `{ instructions: x }`, or a secret slips through on formatting alone.
ruleTester.run('no-sensitive-in-prompt (quoted key)', noSensitiveInPrompt, {
  valid: xai([]),
  invalid: xai([
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          "instructions": \`Use this key: \${apiKey}\`,
        });
      `,
      errors: [{ messageId: 'sensitiveInPrompt' }],
    },
  ]),
});

// Computed key whose variable is named exactly like the property. The existing
// computed-key fixture uses `[k]`, which never collided and so never caught the
// bug: `{ [instructions]: … }` was read as the literal `instructions`.
ruleTester.run('no-sensitive-in-prompt (computed key collision)', noSensitiveInPrompt, {
  valid: xai([
    {
      code: `
        const instructions = 'temperature';
        generateText({ model, [instructions]: apiKey });
      `,
    },
  ]),
  invalid: xai([]),
});
