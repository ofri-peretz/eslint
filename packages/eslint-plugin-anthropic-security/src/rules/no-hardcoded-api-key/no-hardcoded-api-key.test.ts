/**
 * @fileoverview Tests for no-hardcoded-api-key (Anthropic)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as tsParser from '@typescript-eslint/parser';
import { noHardcodedApiKey } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const IMPORT = `import Anthropic from '@anthropic-ai/sdk';`;

/**
 * Key-shaped, but not a real key and too short for push protection's
 * Anthropic pattern. A real key is `sk-ant-api03-` plus ~95 characters.
 */
const KEY = 'sk-ant-api03-Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7';

ruleTester.run('no-hardcoded-api-key', noHardcodedApiKey, {
  valid: [
    {
      name: 'the key comes from the environment',
      code: `${IMPORT}\nconst c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });`,
    },
    // Empty string is a placeholder, not a credential
    { code: `${IMPORT}\nconst c = new Anthropic({ apiKey: '' });` },
    // Non-string literal
    { code: `${IMPORT}\nconst c = new Anthropic({ apiKey: null });` },
    // Spread could carry the key
    { code: `${IMPORT}\nconst c = new Anthropic({ ...opts });` },
    // Computed key
    { code: `${IMPORT}\nconst c = new Anthropic({ [k]: 'sk-ant-xxx' });` },
    // Unrelated property holding a literal
    {
      code: `${IMPORT}\nconst c = new Anthropic({ baseURL: 'https://api.anthropic.com' });`,
    },
    // No options / non-object options
    { code: `${IMPORT}\nconst c = new Anthropic();` },
    { code: `${IMPORT}\nconst c = new Anthropic(opts);` },
    // Scope promise: no Anthropic import, no finding
    { code: `const c = new Anthropic({ apiKey: 'sk-ant-hardcoded' });` },
    // require of an unrelated module
    {
      code: `const z = require('zod');\nnew Anthropic({ apiKey: 'sk-ant-hardcoded' });`,
    },
    // require with a non-string argument
    {
      code: `const m = require(dyn);\nnew Anthropic({ apiKey: 'sk-ant-hardcoded' });`,
    },
    // Zero-argument call — the require gate must not choke on it
    { code: `${IMPORT}\ninitialise();` },
    // Quoted key that is not a credential
    {
      code: `${IMPORT}\nnew Anthropic({ 'baseURL': 'https://api.anthropic.com' });`,
    },
    // An import of an unrelated module must not arm the rule
    {
      code: `import { z } from 'zod';\nnew Anthropic({ apiKey: 'sk-ant-x' });`,
    },

    /*
     * Moved from invalid (2026-10-12 FP/FN audit). Each of these encoded a
     * defect: `'sk-ant-x'` and `'tok-live-123'` are stand-ins, not keys — too
     * short to be a working credential — and the rule reported every such
     * placeholder (FP-1, 345 findings in the SDK's own repository). The
     * mechanisms they exercised (authToken, quoted key, require(), a safe
     * apiKey beside a hardcoded authToken) are re-pinned in `invalid` with a
     * key-shaped value.
     */
    {
      name: '(was invalid) a 12-character authToken is a stand-in',
      code: `${IMPORT}\nconst c = new Anthropic({ authToken: 'tok-live-123' });`,
    },
    {
      name: '(was invalid) a stand-in authToken beside an env apiKey',
      code: `${IMPORT}\nconst c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, authToken: 'tok-live-123' });`,
    },
    {
      name: '(was invalid) a quoted stand-in authToken',
      code: `${IMPORT}\nconst c = new Anthropic({ 'authToken': 'tok-live-123' });`,
    },
    {
      name: '(was invalid) a require()d client with a stand-in key',
      code: `const Anthropic = require('@anthropic-ai/sdk');\nnew Anthropic({ apiKey: 'sk-ant-x' });`,
    },
    {
      name: '(was invalid) a quoted stand-in apiKey',
      code: `${IMPORT}\nnew Anthropic({ 'apiKey': 'sk-ant-x' });`,
    },
    /*
     * Also moved from invalid (FP-2): neither callee is bound to the Anthropic
     * SDK. `createAnthropic` is the Vercel AI SDK's provider factory — owned by
     * vercel-ai-security, so reporting it here put one line in two plugins —
     * and an `Anthropic` that nothing imports is not the SDK's client.
     */
    {
      name: '(was invalid) an unbound factory call is not the Anthropic client',
      code: `${IMPORT}\nconst c = createAnthropic({ apiKey: 'sk-ant-x' });`,
    },
    {
      name: '(was invalid) the agent SDK import does not bind an Anthropic constructor',
      code: `import { query } from '@anthropic-ai/claude-agent-sdk';\nnew Anthropic({ apiKey: 'sk-ant-x' });`,
    },

    // FP-1: placeholders the SDK's own tests and docs pass.
    {
      name: 'FP: the SDK test-suite placeholder',
      // @found anthropics/anthropic-sdk-typescript:tests/index.test.ts:22
      code: `${IMPORT}\nconst client = new Anthropic({ apiKey: 'my-anthropic-api-key', baseURL: 'http://localhost:5000/' });`,
    },
    {
      name: 'FP: test-key, dummy, an ellipsis and a template slot',
      // @found anthropics/anthropic-sdk-typescript:tests/index.test.ts:917
      code: `${IMPORT}\nnew Anthropic({ apiKey: 'test-key' });\nnew Anthropic({ apiKey: 'dummy' });\nnew Anthropic({ apiKey: '...' });\nnew Anthropic({ apiKey: '<YOUR_API_KEY>' });`,
    },
    {
      name: 'FP: a masked placeholder run',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nnew Anthropic({ authToken: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx' });`,
    },
    {
      name: 'FP: a Bedrock bearer-token stand-in',
      // @found anthropics/anthropic-sdk-typescript:packages/bedrock-sdk/tests/client.test.ts:151
      code: `import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';\nnew AnthropicBedrock({ apiKey: 'test-bearer-token', awsRegion: 'us-east-1' });`,
    },
    // FP-2: another vendor's client, a test matcher, the Vercel AI provider.
    {
      name: 'FP: a test matcher is not a client construction',
      // @found anthropics/anthropic-sdk-typescript:tests/lib/environments/worker.test.ts:631
      code: `${IMPORT}\nexpect(fetch).toHaveBeenCalledWith(expect.objectContaining({ apiKey: '${KEY}' }));`,
    },
    {
      name: "FP: another vendor's client in a file that imports Anthropic",
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nimport { Pinecone } from '@pinecone-database/pinecone';\nnew Pinecone({ apiKey: 'pcsk_2Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7' });`,
    },
    {
      name: 'FP: the Vercel AI provider factory belongs to vercel-ai-security',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nimport { createAnthropic } from '@ai-sdk/anthropic';\ncreateAnthropic({ apiKey: '${KEY}' });`,
    },
    {
      name: 'a wrapper called with an environment key',
      code: `${IMPORT}\nfunction make(opts) { return new Anthropic(opts); }\nmake({ apiKey: process.env.KEY });`,
    },
    {
      name: 'a function that does not hand its parameter to the SDK',
      code: `${IMPORT}\nfunction make(opts) { return new Anthropic({ maxRetries: opts.n }); }\nmake({ apiKey: '${KEY}' });`,
    },
    {
      name: 'a same-file class that does not extend the SDK',
      code: `${IMPORT}\nclass Local {}\nnew Local({ apiKey: '${KEY}' });`,
    },
    {
      name: 'an environment fallback to a stand-in or an empty string',
      code: `${IMPORT}\nnew Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });\nnew Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'my-anthropic-api-key' });`,
    },
    {
      name: 'a reassigned binding is not followed',
      code: `${IMPORT}\nlet foo = '${KEY}';\nfoo = process.env.KEY;\nnew Anthropic({ apiKey: foo });`,
    },
  ],
  invalid: [
    {
      name: 'an sk-ant key literal in the client construction',
      code: `${IMPORT}\nconst c = new Anthropic({ apiKey: 'sk-ant-api03-hardcoded' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'apiKey' } }],
    },
    // authToken is the same class of credential. `data` is asserted on both
    // this and the apiKey case on purpose: the message interpolates {{prop}}
    // into the description AND the fix hint, and without pinning it the rule
    // could name either option for either input and still pass on messageId.
    {
      name: 'a key-shaped authToken',
      code: `${IMPORT}\nconst c = new Anthropic({ authToken: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
    },
    {
      // Regression: a safe `apiKey` used to end the scan, so a hardcoded
      // `authToken` after it was never inspected. Anthropic is the only
      // config with two credential props, so this miss only showed up here.
      name: 'a safe apiKey does not hide a hardcoded authToken',
      code: `${IMPORT}\nconst c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, authToken: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
    },
    // Quoted credential key — the prop name still comes from the source.
    {
      name: 'a quoted authToken key',
      code: `${IMPORT}\nconst c = new Anthropic({ 'authToken': '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
    },
    // require() arms it
    {
      name: 'require() binds the client',
      code: `const Anthropic = require('@anthropic-ai/sdk');\nnew Anthropic({ apiKey: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // String-literal key
    {
      name: 'a quoted apiKey key',
      code: `${IMPORT}\nnew Anthropic({ 'apiKey': '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // FN-1: the key or the options in a const.
    {
      name: 'FN: the key held in a const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nconst foo = '${KEY}';\nnew Anthropic({ apiKey: foo });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'apiKey' } }],
    },
    {
      name: 'FN: the options object held in a const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nconst bar = { apiKey: '${KEY}', maxRetries: 3 };\nnew Anthropic(bar);`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'FN: shorthand property for a const key',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nconst apiKey = '${KEY}';\nnew Anthropic({ apiKey });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'FN: the key arrives through a same-file spread',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nconst base = { apiKey: '${KEY}' };\nnew Anthropic({ ...base, timeout: 1000 });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'FN: a key destructured out of a const config',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nconst cfg = { k: '${KEY}' };\nconst { k: foo } = cfg;\nnew Anthropic({ apiKey: foo });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    // FN-2: the other credential options the published clients take.
    {
      name: 'FN: a Bedrock secret key',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';\nnew AnthropicBedrock({ awsAccessKey: process.env.AWS_ACCESS_KEY_ID, awsSecretKey: 'q8Lm2Zx9Rt4+Yv6Np0Kc3Hd5+Wb7Jf1Gs8Ue2', awsRegion: 'us-east-1' });`,
      errors: [
        { messageId: 'hardcodedApiKey', data: { prop: 'awsSecretKey' } },
      ],
    },
    {
      name: 'FN: a Vertex access token',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';\nnew AnthropicVertex({ accessToken: 'tok.Zx9Qw2Lm8Rt4.Yv6Np0Kc3Hd5', region: 'us-east5' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'accessToken' } }],
    },
    {
      name: 'FN: a webhook signing key',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `${IMPORT}\nnew Anthropic({ apiKey: process.env.KEY, webhookKey: 'whk_Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7' });`,
      errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'webhookKey' } }],
    },
    // FN-3: client constructions the binding resolution now sees.
    {
      name: 'guard: a same-file subclass of the client',
      code: `${IMPORT}\nclass Claude extends Anthropic {}\nnew Claude({ apiKey: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'guard: super() in a subclass constructor',
      code: `${IMPORT}\nclass Claude extends Anthropic { constructor() { super({ apiKey: '${KEY}' }); } }`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'guard: a same-file wrapper that passes its options straight in',
      code: `${IMPORT}\nfunction make(opts) { return new Anthropic(opts); }\nmake({ apiKey: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'guard: an arrow wrapper that spreads its options in',
      code: `${IMPORT}\nconst make = (opts = {}) => new Anthropic({ maxRetries: 2, ...opts });\nmake({ apiKey: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'guard: withOptions clones the client with a new key',
      code: `${IMPORT}\nconst client = new Anthropic();\nclient.withOptions({ apiKey: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'guard: a namespace import',
      code: `import * as sdk from '@anthropic-ai/sdk';\nnew sdk.default({ apiKey: '${KEY}' });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'guard: a lazily imported client',
      code: `async function f() { const { default: Foo } = await import('@anthropic-ai/sdk'); return new Foo({ apiKey: '${KEY}' }); }`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
    {
      name: 'FN: a literal key as the environment fallback is committed all the same',
      // @found quint: benchmarks/quint/models/anthropic-security.no-hardcoded-api-key.qnt (VendorKey/EnvFallback, every SDK client)
      code: `${IMPORT}\nnew Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '${KEY}' });\nconst k = process.env.K || '${KEY}';\nnew Anthropic({ authToken: k });\nnew Anthropic({ apiKey: cond ? process.env.K : '${KEY}' });`,
      errors: [
        { messageId: 'hardcodedApiKey' },
        { messageId: 'hardcodedApiKey' },
        { messageId: 'hardcodedApiKey' },
      ],
    },
    {
      name: 'rename litmus: every identifier renamed, still reported',
      code: `const { Anthropic: Foo } = require('@anthropic-ai/sdk');\nconst bar = '${KEY}';\nnew Foo({ apiKey: bar });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ],
});

tsRuleTester.run('no-hardcoded-api-key (TypeScript)', noHardcodedApiKey, {
  valid: [],
  invalid: [
    {
      name: 'FN: import-equals and a typed const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
      code: `import Anthropic = require('@anthropic-ai/sdk');\nconst foo = '${KEY}' as const;\nnew Anthropic({ apiKey: foo });`,
      errors: [{ messageId: 'hardcodedApiKey' }],
    },
  ],
});
