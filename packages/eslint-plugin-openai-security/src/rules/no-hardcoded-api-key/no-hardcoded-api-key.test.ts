/**
 * Tests for openai-security/no-hardcoded-api-key (CWE-798).
 *
 * The gate is the SDK import, so the first valid case is load-bearing: an
 * `apiKey` literal in a file that never imports the OpenAI SDK is somebody
 * else's object and this plugin stays out of it.
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

const SDK = "import OpenAI from 'openai';\n";

describe('no-hardcoded-api-key', () => {
  ruleTester.run('no-hardcoded-api-key', noHardcodedApiKey, {
    valid: [
      {
        name: 'an apiKey literal in a file that never imports the SDK',
        code: "const client = new Thing({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: 'the correct pattern — read from the environment',
        code: SDK + 'const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });',
      },
      {
        name: 'an empty string is a placeholder, not a credential',
        code: SDK + "const client = new OpenAI({ apiKey: '' });",
      },
      {
        name: 'options with no credential in them',
        code: SDK + "const client = new OpenAI({ baseURL: 'https://proxy.internal' });",
      },
      {
        name: 'no options at all',
        code: SDK + 'const client = new OpenAI();',
      },
      {
        name: 'a spread could carry the key, so the options are unreadable',
        code: SDK + 'const client = new OpenAI({ ...base });',
      },
      {
        // `openai-edge` is a different package with a different client. A bare
        // prefix match on the module name would open the gate on it.
        name: 'a same-prefixed but different package',
        code: "import OpenAI from 'openai-edge';\nconst c = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: 'a non-object first argument',
        code: SDK + 'const client = new OpenAI(config);',
      },
      {
        // OpenAI takes no positional key, so a bare string is not a finding
        // here even though the identical shape is one for Gemini.
        name: 'a positional string with no positional constructor configured',
        code: SDK + "const client = new OpenAI('sk-proj-AAAA');",
      },
    ],
    invalid: [
      {
        name: 'a literal apiKey',
        code: SDK + "const client = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a subpath import opens the same gate',
        code:
          "import { OpenAI } from 'openai/index.mjs';\n" +
          "const client = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'require() opens the same gate',
        code:
          "const OpenAI = require('openai');\n" +
          "const client = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a factory call rather than a constructor',
        code: SDK + "const client = createClient({ apiKey: 'sk-proj-AAAA' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        // The import is below the construction. A gate that depended on
        // statement order would miss it.
        name: 'the construction above the import',
        code:
          "const client = new OpenAI({ apiKey: 'sk-proj-AAAA' });\nimport OpenAI from 'openai';",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'two clients report separately',
        code:
          SDK +
          "const a = new OpenAI({ apiKey: 'sk-1' });\nconst b = new OpenAI({ apiKey: 'sk-2' });",
        errors: [{ messageId: 'hardcodedApiKey' }, { messageId: 'hardcodedApiKey' }],
      },
    ],
  });
});
