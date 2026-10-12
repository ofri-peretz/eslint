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

/** Key-shaped, not a real key, and without the marker push protection matches. */
const KEY = 'sk-proj-Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7Jf1Gs';

describe('no-hardcoded-api-key', () => {
  ruleTester.run('no-hardcoded-api-key', noHardcodedApiKey, {
    valid: [
      {
        name: 'an apiKey literal in a file that never imports the SDK',
        code: "const client = new Thing({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: 'the correct pattern — read from the environment',
        code:
          SDK +
          'const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });',
      },
      {
        name: 'an empty string is a placeholder, not a credential',
        code: SDK + "const client = new OpenAI({ apiKey: '' });",
      },
      {
        name: 'options with no credential in them',
        code:
          SDK +
          "const client = new OpenAI({ baseURL: 'https://proxy.internal' });",
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
      /*
       * Moved from invalid (2026-10-12 FP/FN audit). `'sk-proj-AAAA'`, `'sk-1'`
       * and `'sk-2'` are stand-ins, not keys — a real one is 50+ characters —
       * and the rule reported every such placeholder (FP-1: 601 findings in
       * the OpenAI SDK repositories, none a credential). `createClient` was
       * never bound to the SDK (FP-2). Each mechanism is re-pinned in
       * `invalid` with a key-shaped value.
       */
      {
        name: '(was invalid) a 12-character stand-in apiKey',
        code: SDK + "const client = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: '(was invalid) a stand-in under a subpath import',
        code: "import { OpenAI } from 'openai/index.mjs';\nconst client = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: '(was invalid) a stand-in under require()',
        code: "const OpenAI = require('openai');\nconst client = new OpenAI({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: '(was invalid) an unbound factory is not the OpenAI client',
        code: SDK + "const client = createClient({ apiKey: 'sk-proj-AAAA' });",
      },
      {
        name: '(was invalid) a stand-in above the import',
        code: "const client = new OpenAI({ apiKey: 'sk-proj-AAAA' });\nimport OpenAI from 'openai';",
      },
      {
        name: '(was invalid) two stand-ins',
        code:
          SDK +
          "const a = new OpenAI({ apiKey: 'sk-1' });\nconst b = new OpenAI({ apiKey: 'sk-2' });",
      },

      // FP-1: placeholders the SDKs' own tests, examples and docs pass.
      {
        name: 'FP: the SDK test-suite placeholder',
        // @found openai/openai-node:tests/realtime.test.ts:11
        code:
          SDK +
          "const client = new OpenAI({ apiKey: 'My API Key', baseURL: 'http://127.0.0.1:4010' });",
      },
      {
        name: 'FP: a local model server ignores the key',
        // @found openai/openai-agents-js:examples/basic/hello-world-gpt-oss.ts:21
        code:
          SDK +
          "const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'ollama' });",
      },
      {
        name: 'FP: an elided docs placeholder',
        // @found openai/openai-agents-js:examples/docs/config/setDefaultOpenAIClient.ts:4
        code:
          SDK +
          "const customClient = new OpenAI({ baseURL: '...', apiKey: '...' });",
      },
      {
        name: 'FP: synthetic, fake and test stand-ins',
        // @found openai/openai-agents-js:examples/live/live.test.ts:257
        code:
          SDK +
          "new OpenAI({ apiKey: 'synthetic-test-key' });\nnew OpenAI({ apiKey: 'sk-synthetic-client-key' });\nnew OpenAI({ apiKey: 'fake-live-key' });\nnew OpenAI({ apiKey: 'something1234' });",
      },
      {
        name: 'FP: an Azure client with a stand-in key',
        // @found openai/openai-node:tests/lib/data-residency.test.ts:150
        code: "import { AzureOpenAI } from 'openai';\nnew AzureOpenAI({ apiKey: 'azure-key', endpoint: 'https://x.openai.azure.com', apiVersion: 'v' });",
      },
      // FP-2: another vendor's client in a file that imports openai.
      {
        name: "FP: another vendor's client",
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          "import { Pinecone } from '@pinecone-database/pinecone';\nnew Pinecone({ apiKey: 'pcsk_2Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7' });",
      },
      {
        name: 'FP: the Vercel AI provider factory belongs to vercel-ai-security',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          `import { createOpenAI } from '@ai-sdk/openai';\ncreateOpenAI({ apiKey: '${KEY}' });`,
      },
    ],
    invalid: [
      {
        name: 'a key-shaped apiKey',
        code: SDK + `const client = new OpenAI({ apiKey: '${KEY}' });`,
        errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'apiKey' } }],
      },
      {
        name: 'a subpath import opens the same gate',
        code:
          "import { OpenAI } from 'openai/index.mjs';\n" +
          `const client = new OpenAI({ apiKey: '${KEY}' });`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'require() opens the same gate',
        code:
          "const OpenAI = require('openai');\n" +
          `const client = new OpenAI({ apiKey: '${KEY}' });`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        // The import is below the construction. A gate that depended on
        // statement order would miss it.
        name: 'the construction above the import',
        code: `const client = new OpenAI({ apiKey: '${KEY}' });\nimport OpenAI from 'openai';`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'two clients report separately',
        code:
          SDK +
          `const a = new OpenAI({ apiKey: '${KEY}' });\nconst b = new OpenAI({ apiKey: '${KEY}' });`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'an Azure key (32 hex characters)',
        code: "import { AzureOpenAI } from 'openai';\nnew AzureOpenAI({ apiKey: '3f9a2c7e1b8d4f6a0c5e9b2d7a1f4c8e', endpoint: 'https://x.openai.azure.com', apiVersion: 'v' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a webhook signing secret',
        // @found openai/openai-node:tests/lib/webhooks.test.ts:57
        // (The real line holds the Standard Webhooks spec's published test
        // vector; the fixture is broken into short runs so no secret scanner
        // reads it as a live signing secret.)
        code:
          SDK +
          "const secret = 'whsec_Rdva+YFYUXuIF+EbvZHwMf+YFhUf7aMY+jYcmM24+Aj40c=';\nconst client = new OpenAI({ apiKey: 'test-key', webhookSecret: secret });",
        errors: [
          { messageId: 'hardcodedApiKey', data: { prop: 'webhookSecret' } },
        ],
      },
      // FN (2026-10-12): the key or the options in a const, and the other
      // credential options and client constructions.
      {
        name: 'FN: the key held in a const',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code: SDK + `const foo = '${KEY}';\nnew OpenAI({ apiKey: foo });`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'FN: the options object held in a const, and spread',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          `const bar = { apiKey: '${KEY}' };\nnew OpenAI(bar);\nnew OpenAI({ ...bar, timeout: 1000 });`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'FN: an admin key',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          SDK +
          "new OpenAI({ adminAPIKey: 'sk-admin-Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7Jf1Gs' });",
        errors: [
          { messageId: 'hardcodedApiKey', data: { prop: 'adminAPIKey' } },
        ],
      },
      {
        name: 'FN: the Agents SDK provider and its process-wide default key',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
        code:
          "import { OpenAIProvider, setDefaultOpenAIKey } from '@openai/agents';\n" +
          `new OpenAIProvider({ apiKey: '${KEY}' });\nsetDefaultOpenAIKey('${KEY}');`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'guard: the Bedrock provider factory',
        code: "import { bedrock } from 'openai/providers/bedrock';\nbedrock({ region: 'us-east-1', apiKey: 'ABSKZx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7Jf1Gs' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'guard: withOptions and a subclass super() call',
        code:
          SDK +
          `new OpenAI().withOptions({ apiKey: '${KEY}' });\nclass Mine extends OpenAI { constructor() { super({ apiKey: '${KEY}' }); } }`,
        errors: [
          { messageId: 'hardcodedApiKey' },
          { messageId: 'hardcodedApiKey' },
        ],
      },
      {
        name: 'FN: a literal key as the environment fallback is committed all the same',
        // @found quint: benchmarks/quint/models/openai-security.no-hardcoded-api-key.qnt (VendorKey/EnvFallback, every SDK client)
        code:
          SDK +
          `new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '${KEY}' });`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'rename litmus: renamed import, key and options',
        code: `import Foo from 'openai';\nconst bar = '${KEY}';\nconst baz = { apiKey: bar };\nnew Foo(baz);`,
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
    ],
  });
});
