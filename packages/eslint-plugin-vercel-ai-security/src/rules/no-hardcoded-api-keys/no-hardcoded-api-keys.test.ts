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
const xai = <T>(cases: T[]): T[] =>
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
      name: 'the key comes from the environment',
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
    // (Moved 2026-10-10) `name: 'sk-proj-…'` was valid because the property is
    // not called apiKey. A string shaped like a provider key is a leaked key
    // whatever holds it — gating on the holder's name is exactly what missed
    // `const OPENAI_KEY = 'sk-…'`. It is now in the fp-fn audit invalid suite.
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
      name: 'a provider key written into the source',
      code: `
        const config = {
          apiKey: 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz123456',
        };
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // Hardcoded key in provider function (second arg). (Changed 2026-10-10)
    // This used to be reported twice — once per handler — for one literal.
    {
      code: `
        const model = openai('gpt-4', {
          apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
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
    // anthropic provider with hardcoded key in second arg (one report, see above)
    {
      code: `
        const model = anthropic('claude-3', {
          apiKey: 'sk-ant-1234567890abcdefghijklmnop',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // api_key snake case in provider (one report, see above)
    {
      code: `
        const model = google('gemini-pro', {
          api_key: 'AIzaSyA1234567890abcdefghijklmnopqrstu',
        });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
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

// ──────────────────────────────────────────────────────────────────────────────────
// FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-vercel-ai-security.md)
// A provider-prefixed key is a key wherever it sits; a generic long string is
// one only under a key-ish name AND only if it is not a URL, a resource path or
// the NAME of an environment variable.
// ──────────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-hardcoded-api-keys (fp-fn audit)', noHardcodedApiKeys, {
  valid: xai([
    {
      name: 'secret names, OAuth URLs and env-var names are not secrets',
      code: `
        const secretsConfig = {
          secretName: 'projects/acme-prod/secrets/openai-api-key/versions/latest',
          tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          apiKeyEnvVar: 'OPENAI_API_KEY_PRODUCTION',
        };
      `,
    },
    {
      name: 'an sk- string with no digits is not a key (CSS class, slug)',
      code: `const cls = 'sk-loading-spinner-container-wrapper';`,
    },
    {
      name: 'whole-word key names: maxTokens is not a token',
      code: `const cfg = { maxTokens: 'unlimited-for-internal-batch-runs' };`,
    },
  ]),
  invalid: xai([
    {
      name: 'a key hoisted into a module constant, then referenced',
      code: `
        const OPENAI_KEY = 'sk-proj-Abc123Def456Ghi789Jkl012Mno345Pqr678Stu901';
        export const openai2 = createOpenAI({ apiKey: OPENAI_KEY });
      `,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a generic secret in a constant named like a key',
      code: `const ANTHROPIC_API_KEY = \`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\`;`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'an x-api-key header',
      code: `export const anthropic = createAnthropic({ headers: { 'x-api-key': 'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' } });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'an Authorization: Bearer header',
      code: `export const gw = createOpenAI({ baseURL: 'https://gw.example/v1', headers: { Authorization: 'Bearer sk-proj-Abc123Def456Ghi789Jkl012Mno345Pqr678' } });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a provider-shaped key under a neutral property name',
      code: `const config = { name: 'sk-proj-1234567890abcdefghijklmn' };`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'Groq / Hugging Face / AWS key shapes',
      code: `const k = ['gsk_AbCdEf0123456789AbCdEf0123', 'hf_AbCdEf0123456789AbCdEf0123', 'AKIAIOSFODNN7EXAMPLE'];`,
      errors: [
        { messageId: 'hardcodedApiKey' },
        { messageId: 'hardcodedApiKey' },
        { messageId: 'hardcodedApiKey' },
      ],
    },
  ]),
});

// ──────────────────────────────────────────────────────────────────────────────────
// Mutation audit 2026-11-02: each case pins one claim a surviving mutant broke.
// ──────────────────────────────────────────────────────────────────────────────────
ruleTester.run('no-hardcoded-api-keys (mutation audit)', noHardcodedApiKeys, {
  valid: xai([
    {
      name: 'a quoted property key is a name, not a stored value',
      code: `const ttl = { 'access_token_expires_in_seconds': 3600 };`,
    },
    {
      name: 'a slug ending in "task-…" is not an sk- key',
      code: `const slug = 'task-2024-01-15-quarterly-review';`,
    },
    {
      name: 'a Slovak locale file name is not an sk- key',
      code: `const file = 'sk-SK-translations-2024-v2.json';`,
    },
    {
      name: 'a Hugging Face cache file name is not an hf_ token',
      code: `const file = 'hf_transformers_cache_2024.json';`,
    },
    {
      name: 'an xai- document file name is not an xAI key',
      code: `const file = 'xai-documentation_v2_2024.pdf';`,
    },
    {
      name: 'an AIza prefix with a body longer than a Google key is not one',
      code: `const blob = 'AIzaSyD-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5pXYZ';`,
    },
    {
      name: 'a 20-character value is too short for a generic secret',
      code: `const c = { apiKey: 'abcdefghij0123456789' };`,
    },
    {
      name: 'a $-placeholder is not a secret',
      code: `const c = { apiKey: '$OPENAI_API_KEY_PRODUCTION' };`,
    },
    {
      // @found mutation testing
      name: 'FP: a resource path with a leading slash is a path, not a secret',
      code: `const c = { secretName: '/projects/acme-prod/secrets/openai-api-key' };`,
    },
  ]),
  invalid: xai([
    {
      // @found mutation testing
      name: 'FN: a class field holding a key-named secret is the same as a property',
      code: `class Client { apiKey = 'a8f9d7c6b5e4d3c2b1a0f9e8d7c6b5a4'; }`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a bearer scheme separated by more than one space still carries the key',
      code: `const h = { Authorization: 'Bearer  sk-proj-AbCdEf0123456789AbCdEf0123' };`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'the message shows only the first ten characters of the key',
      code: `const k = 'sk-proj-AbCdEf0123456789AbCdEf0123';`,
      errors: [
        { messageId: 'hardcodedApiKey', data: { key: 'sk-proj-Ab...' } },
      ],
    },
    {
      name: 'a Google API key is reported under any name',
      code: `const mapsConfig = 'AIzaSyD-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p';`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'an xAI key is reported under any name',
      code: `const k = 'xai-AbCdEf0123456789AbCdEf0123';`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a Perplexity key whose body is all digits still contains a digit',
      code: `const k = 'pplx-01234567890123456789012';`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a Replicate token whose body is all digits still contains a digit',
      code: `const k = 'r8_01234567890123456789012';`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a Stripe-style secret ending in an uppercase run is not an environment variable name',
      code: `const c = { apiKey: 'FAKE-NOT-A-REAL-SECRET-0123456789-XYZ' };`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a mixed-case secret that starts with a capital is not an environment variable name',
      code: `const c = { token: 'T0k3n_a8f9d7c6b5e4d3c2b1a0' };`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a base64 secret with + in it is not a resource path',
      code: `const c = { secret: 'a8F+9d7c6b5e4/d3c2b1a0Zx/Yw9v8u7' };`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'a base64 secret with = padding is not a resource path',
      code: `const c = { secret: 'a8F9d7c6b5e4/d3c2b1a0Zx/Yw9v8u7+abc=' };`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ]),
});

const jsxTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
jsxTester.run(
  'no-hardcoded-api-keys (mutation audit, jsx)',
  noHardcodedApiKeys,
  {
    valid: xai([
      {
        name: 'a JSX attribute whose name is not key-ish holds no secret',
        code: `const el = <Chat placeholder="a8f9d7c6b5e4d3c2b1a0f9e8d7c6b5a4" />;`,
      },
      {
        name: 'a namespaced SVG attribute names no key',
        code: `const el = <use xlink:href="#icon-arrow-left-circle-outline" />;`,
      },
    ]),
    invalid: xai([
      {
        // @found mutation testing
        name: 'FN: a JSX attribute named apiKey holds the key like a property does',
        code: `const el = <AIProvider apiKey="a8f9d7c6b5e4d3c2b1a0f9e8d7c6b5a4" />;`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
    ]),
  },
);
