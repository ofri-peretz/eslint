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

describe('no-hardcoded-api-key', () => {
  ruleTester.run('no-hardcoded-api-key', noHardcodedApiKey, {
    valid: [
      {
        name: 'a positional key in a file that never imports the SDK',
        code: "const client = new GoogleGenerativeAI('AIzaAAAA');",
      },
      {
        name: 'the correct pattern — positional, from the environment',
        code: LEGACY + 'const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);',
      },
      {
        name: 'the correct pattern — named option, from the environment',
        code: CURRENT + 'const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });',
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
    ],
    invalid: [
      {
        name: 'a positional literal key — the legacy client shape',
        code: LEGACY + "const client = new GoogleGenerativeAI('AIzaAAAA');",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a namespaced constructor is the same constructor',
        code:
          "import * as genai from '@google/generative-ai';\n" +
          "const client = new genai.GoogleGenerativeAI('AIzaAAAA');",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a literal apiKey option — the current client shape',
        code: CURRENT + "const client = new GoogleGenAI({ apiKey: 'AIzaAAAA' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'require() opens the same gate',
        code:
          "const { GoogleGenerativeAI } = require('@google/generative-ai');\n" +
          "const client = new GoogleGenerativeAI('AIzaAAAA');",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
    ],
  });
});
