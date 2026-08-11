/**
 * @fileoverview Tests for no-hardcoded-api-keys rule
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

ruleTester.run('no-hardcoded-api-keys', noHardcodedApiKeys, {
  valid: xai([
    // Environment variable
    {
      code: `
        const openai = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
      `,
    },
    // Empty placeholder
    {
      code: `
        const config = {
          apiKey: '',
        };
      `,
    },
    // Config placeholder
    {
      code: `
        const config = {
          apiKey: 'YOUR_API_KEY',
        };
      `,
    },
    // Variable reference
    {
      code: `
        const key = getApiKey();
        const openai = createOpenAI({ apiKey: key });
      `,
    },
    // Not an API key property
    {
      code: `
        const config = {
          name: 'sk-proj-1234567890abcdefghijklmn',
        };
      `,
    },
    // Short value - not flagged
    {
      code: `
        const config = {
          apiKey: 'short',
        };
      `,
    },
    // Environment variable placeholder
    {
      code: `
        const config = {
          apiKey: '$OPENAI_API_KEY',
        };
      `,
    },
    // Template literal (not literal string)
    {
      code: `
        const config = {
          apiKey: \`\${prefix}-\${suffix}\`,
        };
      `,
    },
    // Anthropic with env var
    {
      code: `
        const anthropic = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
      `,
    },
    // Google with env var
    {
      code: `
        const google = createGoogle({
          apiKey: process.env.GOOGLE_API_KEY,
        });
      `,
    },
    // Mistral with env var
    {
      code: `
        const mistral = createMistral({
          apiKey: process.env.MISTRAL_API_KEY,
        });
      `,
    },
    // Provider function with only model arg (no options)
    {
      code: `
        const model = openai('gpt-4');
      `,
    },
    // Provider function with variable for options
    {
      code: `
        const model = openai('gpt-4', options);
      `,
    },
    // Provider function with short key in second arg
    {
      code: `
        const model = openai('gpt-4', { apiKey: 'test' });
      `,
    },
    // Non-literal key property
    {
      code: `
        const model = createOpenAI({ [dynamic]: 'value' });
      `,
    },
    // Spread element in options
    {
      code: `
        const model = createOpenAI({ ...baseOptions });
      `,
    },
  ]),

  invalid: xai([
    // Hardcoded OpenAI key in Property
    {
      code: `
        const config = {
          apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Hardcoded key in provider function (second arg) - fires both handlers
    {
      code: `
        const model = openai('gpt-4', {
          apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }, { messageId: 'hardcodedApiKey' }],
    },
    // Hardcoded key in createOpenAI
    {
      code: `
        const openai = createOpenAI({
          apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Hardcoded token
    {
      code: `
        const config = {
          token: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Hardcoded secret in anthropic
    {
      code: `
        const anthropic = createAnthropic({
          apiKey: 'sk-ant-abcdefghijklmnop-1234567890',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Long generic key
    {
      code: `
        const config = {
          credentials: 'abcdefghijklmnopqrstuvwxyz12345678901234567890',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Secret property
    {
      code: `
        const config = {
          secret: 'supersecretkey1234567890abcdef',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // api_key snake case
    {
      code: `
        const config = {
          api_key: 'sk-abcdef1234567890abcdefghij',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Google API key pattern
    {
      code: `
        const config = {
          apiKey: 'AIzaSyA1234567890abcdefghijklmnopqrstu',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // anthropic provider with hardcoded key in second arg - fires both handlers
    {
      code: `
        const model = anthropic('claude-3', {
          apiKey: 'sk-ant-1234567890abcdefghijklmnop',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }, { messageId: 'hardcodedApiKey' }],
    },
    // api_key snake case in provider - fires both handlers
    {
      code: `
        const model = google('gemini-pro', {
          api_key: 'AIzaSyA1234567890abcdefghijklmnopqrstu',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }, { messageId: 'hardcodedApiKey' }],
    },
    // String literal key name in Property
    {
      code: `
        const config = {
          'apiKey': 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ]),
});
