/**
 * @fileoverview Tests for no-browser-api-key-exposure
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noBrowserApiKeyExposure } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const IMPORT = `import OpenAI from 'openai';`;

ruleTester.run('no-browser-api-key-exposure', noBrowserApiKeyExposure, {
  valid: [
    {
      name: 'a server client reading the key from the environment',
      code: `${IMPORT}\nconst client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });`,
    },
    // Explicitly off
    {
      code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: false });`,
    },
    // Non-boolean literal
    {
      code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: 0 });`,
    },
    // Value not readable here — a variable could be false
    {
      code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: flag });`,
    },
    // Spread could set it either way
    { code: `${IMPORT}\nconst client = new OpenAI({ ...opts });` },
    // Computed key
    { code: `${IMPORT}\nconst client = new OpenAI({ [k]: true });` },
    // No options object
    { code: `${IMPORT}\nconst client = new OpenAI();` },
    { code: `${IMPORT}\nconst client = new OpenAI(opts);` },
    // Scope promise: no OpenAI import, no finding
    { code: `const client = new OpenAI({ dangerouslyAllowBrowser: true });` },
    // Similarly-named package must not arm the rule
    {
      code: `import x from 'openai-mock';\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
    },
    // require of an unrelated module
    {
      code: `const z = require('zod');\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
    },
    // require with a non-string argument
    {
      code: `const m = require(dyn);\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
    },
    // Unrelated literal key
    { code: `${IMPORT}\nconst client = new OpenAI({ 'timeout': 1000 });` },
    /*
     * Moved from invalid (2026-10-12 FP/FN audit, FP-2): none of these callees
     * is bound to the OpenAI SDK. The rule now resolves the constructor through
     * its import — an `OpenAI` nothing imports, or `createOpenAI` (the Vercel AI
     * SDK's provider, owned by vercel-ai-security), is not this client. The
     * gate cases they carried are re-pinned in `invalid` with a bound client.
     */
    {
      name: '(was invalid) an unbound OpenAI beside an Agents SDK import',
      code: `import { Agent } from '@openai/agents';\nconst c = new OpenAI({ dangerouslyAllowBrowser: true });`,
    },
    {
      name: '(was invalid) an unbound OpenAI beside a subpath import',
      code: `import x from 'openai/helpers';\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
    },
    {
      name: '(was invalid) an unbound factory call',
      code: `${IMPORT}\nconst client = createOpenAI({ dangerouslyAllowBrowser: true });`,
    },
    // FP-3: a credential the browser obtains per session ships nothing of the app's.
    {
      name: 'FP: an Azure client with an Entra token provider',
      // @found openai/openai-node:tests/realtime-websocket.test.ts:384
      code: "import { AzureOpenAI } from 'openai';\nconst c = new AzureOpenAI({ azureADTokenProvider: getToken, dangerouslyAllowBrowser: true, apiVersion: 'v' });",
    },
    {
      name: 'FP: a key provider function',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
      code: `${IMPORT}\nconst c = new OpenAI({ apiKey: async () => (await fetch('/api/ephemeral')).text(), dangerouslyAllowBrowser: true });`,
    },
    {
      name: 'FP: an ephemeral Realtime client secret fetched from the server',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
      code:
        `${IMPORT}\nexport async function connect() {\n` +
        "  const r = await fetch('/session');\n" +
        '  const { client_secret } = await r.json();\n' +
        '  return new OpenAI({ apiKey: client_secret.value, dangerouslyAllowBrowser: true });\n}',
    },
    {
      name: 'FP: bring-your-own-key held in component state',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
      code: `${IMPORT}\nexport function Chat() {\n  const [userKey] = useState('');\n  return new OpenAI({ apiKey: userKey, dangerouslyAllowBrowser: true });\n}`,
    },
    {
      name: 'FP: an Anthropic client in the same file is not this plugin',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
      code: `${IMPORT}\nimport Anthropic from '@anthropic-ai/sdk';\nnew Anthropic({ dangerouslyAllowBrowser: true });`,
    },
  ],
  invalid: [
    {
      name: 'dangerouslyAllowBrowser ships the key to every visitor',
      code: `${IMPORT}\nconst client = new OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // Agents SDK scope, with the client bound to it
    {
      name: 'a client the Agents SDK scope binds',
      code: `import { OpenAIProvider } from '@openai/agents';\nconst c = new OpenAIProvider({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // Subpath import
    {
      name: 'a subpath import binds the same client',
      code: `import { OpenAI } from 'openai/index.mjs';\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // require() arms it
    {
      code: `const OpenAI = require('openai');\nnew OpenAI({ dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // String-literal key
    {
      code: `${IMPORT}\nnew OpenAI({ 'dangerouslyAllowBrowser': true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    {
      name: 'a Vite-inlined key in the browser',
      // @found openai/openai-agents-js:integration-tests/vite-react/src/App.tsx:13
      code: `${IMPORT}\nconst openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY, dangerouslyAllowBrowser: true });`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    {
      name: 'a literal key in a jsdom test of the browser path',
      // @found openai/openai-node:ecosystem-tests/node-ts-cjs/tests/import.test.ts:8
      code: `${IMPORT}\nexpect(() => new OpenAI({ apiKey: 'test', dangerouslyAllowBrowser: true })).not.toThrow();`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    // FN (2026-10-12): the flag through a const, and the Realtime client.
    {
      name: 'FN: the options object held in a const',
      // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-openai-security.md)
      code: `${IMPORT}\nconst foo = { dangerouslyAllowBrowser: true };\nnew OpenAI(foo);`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    {
      name: 'guard: the Realtime WebSocket client takes the flag too',
      code:
        "import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';\n" +
        `${IMPORT}\nconst client = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY });\n` +
        "new OpenAIRealtimeWebSocket({ model: 'gpt-realtime', dangerouslyAllowBrowser: true }, client);",
      errors: [{ messageId: 'browserKeyExposure' }],
    },
    {
      name: 'rename litmus: renamed import and options',
      code: `import Foo from 'openai';\nconst bar = { dangerouslyAllowBrowser: true, apiKey: process.env.NEXT_PUBLIC_KEY };\nnew Foo(bar);`,
      errors: [{ messageId: 'browserKeyExposure' }],
    },
  ],
});
