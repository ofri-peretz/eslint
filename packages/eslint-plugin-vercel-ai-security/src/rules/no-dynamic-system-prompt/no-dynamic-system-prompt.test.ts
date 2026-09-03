/**
 * @fileoverview Tests for no-dynamic-system-prompt rule
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicSystemPrompt } from './index';

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

ruleTester.run('no-dynamic-system-prompt', noDynamicSystemPrompt, {
  valid: xai([
    // Static string literal
    {
      name: 'a fixed system prompt with the user text in `prompt`',
      code: `
        await generateText({
          model: openai('gpt-4'),
          system: 'You are a helpful assistant.',
          prompt: userInput,
        });
      `,
    },
    // Static constant
    {
      code: `
        const SYSTEM = 'You are a helpful assistant.';
        await generateText({
          system: SYSTEM,
          prompt: userInput,
        });
      `,
    },
    // Static template literal (no expressions)
    {
      code: `
        await streamText({
          system: \`You are a helpful assistant.
          You can help with coding tasks.\`,
          prompt: userInput,
        });
      `,
    },
    // No system property
    {
      code: `
        await generateText({
          model: openai('gpt-4'),
          prompt: userInput,
        });
      `,
    },
    // Not an AI function
    {
      code: `
        await someFunction({
          system: \`Dynamic: \${role}\`,
        });
      `,
    },
  ]),

  invalid: xai([
    // Template literal with expression
    {
      name: 'a value interpolated into the system prompt can rewrite the instructions',
      code: `
        await generateText({
          system: \`You are a \${role} assistant.\`,
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Concatenation
    {
      code: `
        await generateText({
          system: 'You are a ' + role + ' assistant.',
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Function call result
    {
      code: `
        await streamText({
          system: getSystemPrompt(agentType),
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Await expression
    {
      code: `
        await generateObject({
          system: await fetchSystemPrompt(),
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Template with multiple expressions
    {
      code: `
        await generateText({
          system: \`You are \${name}. Your role is \${role}.\`,
          prompt: question,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Coverage-gap fixtures: argument shapes and non-Identifier keys
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-dynamic-system-prompt (coverage gaps)', noDynamicSystemPrompt, {
  valid: xai([
    // no arguments at all
    { code: `generateText();` },
    // non-object first argument
    { code: `generateText(cfg);` },
    // spread-only options object
    { code: `generateText({ ...cfg });` },
    // computed key — the name genuinely isn't statically known
    { code: `generateText({ [k]: buildPrompt() });` },
  ]),
  invalid: xai([
    // Quoted keys are the same property as bare ones. This used to sit in
    // `valid` with the note "keyName resolves to null", which recorded the gap
    // as if it were intended: a rule that stops firing because someone put
    // quotes round the key is a silent miss, not a design decision.
    { code: `generateText({ 'system': buildPrompt() });`, errors: [{ messageId: 'dynamicSystemPrompt' }] },
    { code: `streamText({ "instructions": \`\${userInput}\` });`, errors: [{ messageId: 'dynamicSystemPrompt' }] },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// AI SDK v7: `instructions` is the system prompt; `system` is deprecated.
// Regression lock — before this was fixed the rule matched only `system`, so it
// was inert on any code written against current AI SDK docs.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-dynamic-system-prompt (instructions prop)', noDynamicSystemPrompt, {
  valid: xai([
    {
      code: `
        await streamText({
          model,
          instructions: 'You are a helpful assistant.',
          prompt: userInput,
        });
      `,
    },
  ]),
  invalid: xai([
    {
      code: `
        await streamText({
          model,
          instructions: \`You are a helpful assistant. \${userName}\`,
          prompt: userInput,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // The shape actually found in nuxt-ui-templates/chat
    // (server/api/chats/[id].post.ts) — a conditional interpolating the
    // session username straight into the system prompt.
    {
      code: `
        const result = streamText({
          abortSignal: abortController.signal,
          model,
          instructions: \`You are a knowledgeable and helpful AI assistant. \${session.user?.username ? \`The user's name is \${session.user.username}.\` : ''} Your goal is to provide clear responses.\`,
          messages,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }],
    },
    // Both props present: each is reported on its own.
    {
      code: `
        await generateText({
          model,
          instructions: \`\${a}\`,
          system: \`\${b}\`,
        });
      `,
      errors: [{ messageId: 'dynamicSystemPrompt' }, { messageId: 'dynamicSystemPrompt' }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// A computed key whose variable is named exactly like the property.
// `{ [instructions]: x }` has an Identifier key called `instructions`, but it is
// a variable reference — the property being set is unknown. Reading it as the
// literal name made these rules treat an arbitrary property as the system
// prompt. The collision case is the only one that was broken.
// ─────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-dynamic-system-prompt (computed key collision)', noDynamicSystemPrompt, {
  valid: xai([
    {
      code: `
        const instructions = 'temperature';
        streamText({ model, [instructions]: \`\${x}\` });
      `,
    },
    {
      code: `
        const system = 'topP';
        generateText({ model, [system]: buildValue() });
      `,
    },
    // Numeric literal key — not a string, so not a statically known name.
    { code: 'generateText({ model, 0: buildValue() });' },
  ]),
  invalid: xai([]),
});
