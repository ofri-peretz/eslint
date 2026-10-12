/**
 * Tests for gemini-security/no-hardcoded-api-key (CWE-798).
 *
 * Gemini is the SDK where the key is commonly *positional* — the legacy
 * `new GoogleGenerativeAI(apiKey)` has no options object to inspect. Both that
 * and the current `new GoogleGenAI({ apiKey })` shape are covered.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noHardcodedApiKey } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const LEGACY = "import { GoogleGenerativeAI } from '@google/generative-ai';\n";
const CURRENT = "import { GoogleGenAI } from '@google/genai';\n";

/** Key-shaped, but shorter than a real `AIza` key (39 characters), so no scanner reads it as one. */
const KEY = 'AIzaSyZx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7';

describe('no-hardcoded-api-key', () => {
  ruleTester.run('no-hardcoded-api-key', noHardcodedApiKey, {
    valid: [
      {
        name: 'a positional key in a file that never imports the SDK',
        code: "const client = new GoogleGenerativeAI('AIzaAAAA');",
      },
      {
        name: 'the correct pattern — positional, from the environment',
        code:
          LEGACY +
          'const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);',
      },
      {
        name: 'the correct pattern — named option, from the environment',
        code:
          CURRENT +
          'const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });',
      },
      {
        name: 'an empty positional string is a placeholder',
        code: LEGACY + "const client = new GoogleGenerativeAI('');",
      },
      {
        // Only the configured constructors take a positional key. A literal
        // first argument to anything else is not a credential.
        name: 'a positional literal to an unconfigured constructor',
        code: LEGACY + "const model = new HarmCategory('AIzaAAAA');",
      },
      {
        name: 'a non-literal, non-object first argument',
        code: LEGACY + 'const client = new GoogleGenerativeAI(config);',
      },
      {
        name: 'a spread makes the options unreadable',
        code: CURRENT + 'const client = new GoogleGenAI({ ...base });',
      },
      {
        name: 'a numeric positional literal is not a key',
        code: LEGACY + 'const client = new GoogleGenerativeAI(1);',
      },
      /*
       * Moved from invalid (2026-10-12 FP/FN audit, FP-1): `'AIzaAAAA'` is a
       * stand-in — a real key is `AIza` plus 35 characters — and the rule
       * reported every such placeholder. Each mechanism is re-pinned in
       * `invalid` with a key-shaped value.
       */
      {
        name: '(was invalid) a stand-in positional key',
        code: LEGACY + "const client = new GoogleGenerativeAI('AIzaAAAA');",
      },
      {
        name: '(was invalid) a stand-in under a namespace import',
        code: "import * as genai from '@google/generative-ai';\nconst client = new genai.GoogleGenerativeAI('AIzaAAAA');",
      },
      {
        name: '(was invalid) a stand-in apiKey option',
        code:
          CURRENT + "const client = new GoogleGenAI({ apiKey: 'AIzaAAAA' });",
      },
      {
        name: '(was invalid) a stand-in under require()',
        code: "const { GoogleGenerativeAI } = require('@google/generative-ai');\nconst client = new GoogleGenerativeAI('AIzaAAAA');",
      },
      {
        name: 'FP: the SDK sample placeholder',
        // @found googleapis/js-genai:google_samples/angular/generate_content/generate_content.ts:34
        code:
          CURRENT +
          "const ai = new GoogleGenAI({\n  // Note: It is unsafe to inject API key in web environment.\n  apiKey: 'fake-api-key',\n});",
      },
      {
        name: 'FP: YOUR_API_KEY and test-api-key',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          LEGACY +
          CURRENT +
          "new GoogleGenerativeAI('YOUR_API_KEY');\nnew GoogleGenAI({ apiKey: 'test-api-key' });",
      },
      {
        name: 'a local class of the same name is not the SDK constructor',
        code:
          CURRENT +
          `class GoogleGenerativeAI { constructor(k) {} }\nnew GoogleGenerativeAI('${KEY}');`,
      },
      {
        name: 'a positional key to an SDK export that takes options',
        code: CURRENT + `new GoogleGenAI('${KEY}');`,
      },
    ],
    invalid: [
      {
        name: 'a positional literal key — the legacy client shape',
        code: LEGACY + `const client = new GoogleGenerativeAI('${KEY}');`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a namespaced constructor is the same constructor',
        code:
          "import * as genai from '@google/generative-ai';\n" +
          `const client = new genai.GoogleGenerativeAI('${KEY}');`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a literal apiKey option — the current client shape',
        code: CURRENT + `const client = new GoogleGenAI({ apiKey: '${KEY}' });`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'require() opens the same gate',
        code:
          "const { GoogleGenerativeAI } = require('@google/generative-ai');\n" +
          `const client = new GoogleGenerativeAI('${KEY}');`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      // FN (2026-10-12)
      {
        name: 'FN: the server-side file and cache managers take the key positionally',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          "import { GoogleAIFileManager, GoogleAICacheManager } from '@google/generative-ai/server';\n" +
          `new GoogleAIFileManager('${KEY}');\nnew GoogleAICacheManager('${KEY}');`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'FN: the key held in a const, positional and named',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          LEGACY +
          CURRENT +
          `const foo = '${KEY}';\nnew GoogleGenerativeAI(foo);\nnew GoogleGenAI({ apiKey: foo });`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'FN: a literal key as the environment fallback, positional and named',
        // @found quint: benchmarks/quint/models/gemini-security.no-hardcoded-api-key.qnt (VendorKey/EnvFallback, every SDK client)
        code:
          LEGACY +
          CURRENT +
          `new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '${KEY}');\nnew GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '${KEY}' });`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'FN: a renamed import is still the positional constructor',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-gemini-security.md)
        code:
          "import { GoogleGenerativeAI as Foo } from '@google/generative-ai';\n" +
          `new Foo('${KEY}');`,
        errors: [
          {
            messageId: 'hardcodedApiKey',
            data: { prop: 'The first argument' },
          },
        ],
      },
    ],
  });
});
