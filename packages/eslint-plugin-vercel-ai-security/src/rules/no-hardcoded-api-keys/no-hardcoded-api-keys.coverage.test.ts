/**
 * @fileoverview Branch-coverage tests for no-hardcoded-api-keys.
 * Layer 1 only — every remaining branch is reachable through the real parser.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHardcodedApiKeys } from './index';

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

ruleTester.run('no-hardcoded-api-keys (branch coverage)', noHardcodedApiKeys, {
  valid: xai([
    // Computed MemberExpression key — key is neither Identifier nor Literal,
    // so keyName resolves to null and the Property handler bails out.
    {
      code: `
        const config = {
          [settings.keyName]: 'sk-abcdefghijklmnopqrstuvwxyz123456',
        };
      `,
    },
    // Spread element in provider options — non-Property entries are skipped.
    {
      code: `const model = openai('gpt-4', { ...providerDefaults });`,
    },
    // Computed key in provider options — keyName is null, entry skipped.
    {
      code: `const model = openai('gpt-4', { [cfg.field]: 'value' });`,
    },
    // Provider option that is not an API key property.
    {
      code: `const model = openai('gpt-4', { baseURL: 'https://api.example.com' });`,
    },
    // apiKey in provider options whose value is not a string literal.
    {
      code: `const model = openai('gpt-4', { apiKey: fetchKey() });`,
    },
  ]),
  invalid: xai([
    // String-literal snake_case key — Literal key path via String(key.value).
    {
      code: `
        const config = {
          'api_key': 'sk-abcdefghijklmnopqrstuvwxyz123456',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ]),
});
