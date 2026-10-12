/**
 * Tests for anthropic-security/no-browser-api-key-exposure (CWE-522).
 *
 * The SDK's own JSDoc says client-side use "risks exposing your secret API
 * credentials to attackers" — this rule is that warning, enforced.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noBrowserApiKeyExposure } from './index';

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

const SDK = "import Anthropic from '@anthropic-ai/sdk';\n";

describe('no-browser-api-key-exposure', () => {
  ruleTester.run('no-browser-api-key-exposure', noBrowserApiKeyExposure, {
    valid: [
      {
        name: 'the flag set in a file that never imports the SDK',
        code: 'const c = new Anthropic({ dangerouslyAllowBrowser: true });',
      },
      {
        name: 'the flag explicitly off',
        code:
          SDK + 'const c = new Anthropic({ dangerouslyAllowBrowser: false });',
      },
      {
        name: 'the ordinary server construction',
        code:
          SDK +
          'const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });',
      },
      {
        name: 'a runtime-decided value is unreadable, not a finding',
        code:
          SDK +
          'const c = new Anthropic({ dangerouslyAllowBrowser: isBrowser });',
      },
      {
        name: 'a spread could carry the flag either way',
        code: SDK + 'const c = new Anthropic({ ...base });',
      },
      {
        name: 'no options at all',
        code: SDK + 'const c = new Anthropic();',
      },
      // FP-3 (2026-10-12): a credential the browser obtains per session ships
      // nothing of the app's. The SDK itself turns the flag on for a token
      // provider (packages/foundry-sdk/src/client.ts:66).
      {
        name: 'FP: a Foundry client with an Entra token provider',
        // @found anthropics/anthropic-sdk-typescript:packages/foundry-sdk/tests/client.test.ts:121
        code:
          "import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk';\n" +
          "const c = new AnthropicFoundry({ azureADTokenProvider: getToken, resource: 'r', dangerouslyAllowBrowser: true });",
      },
      {
        name: "FP: bring-your-own-key — the visitor's own key, a parameter",
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'export function Chat({ userKey }: { userKey: string }) {\n' +
          '  return new Anthropic({ apiKey: userKey, dangerouslyAllowBrowser: true });\n' +
          '}',
      },
      {
        name: 'FP: a short-lived token fetched from the app server',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'export async function connect() {\n' +
          "  const res = await fetch('/api/claude-token');\n" +
          '  const { token } = await res.json();\n' +
          '  return new Anthropic({ authToken: token, dangerouslyAllowBrowser: true });\n' +
          '}',
      },
      {
        name: 'FP: an OpenAI client in the same file is not this plugin',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          "import OpenAI from 'openai';\n" +
          SDK +
          'const o = new OpenAI({ dangerouslyAllowBrowser: true });',
      },
      {
        name: 'a spread after the flag may turn it back off',
        code:
          "import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk';\n" +
          'const c = new AnthropicFoundry({ azureADTokenProvider: getToken, dangerouslyAllowBrowser: true, ...rest });',
      },
    ],
    invalid: [
      {
        name: 'the flag turned on',
        code:
          SDK + 'const c = new Anthropic({ dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'the agent SDK shares the client options',
        code:
          "import { Anthropic } from '@anthropic-ai/claude-agent-sdk';\n" +
          'const c = new Anthropic({ dangerouslyAllowBrowser: true, apiKey: k });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'require() opens the same gate',
        code:
          "const Anthropic = require('@anthropic-ai/sdk');\n" +
          'const c = new Anthropic({ dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      // FN-4 (2026-10-12): the flag through a const, and a client the
      // binding resolution sees.
      {
        name: 'FN: the options object held in a const',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'const foo = { dangerouslyAllowBrowser: true, apiKey: process.env.NEXT_PUBLIC_KEY };\nconst c = new Anthropic(foo);',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'FN: the flag held in a const',
        // @found synthetic: 2026-10-12 SDK-usage snippet (benchmarks/audits/2026-10-12-fp-fn-anthropic-security.md)
        code:
          SDK +
          'const yes = true;\nconst c = new Anthropic({ dangerouslyAllowBrowser: yes });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'a build-time env key ships even with a runtime fallback',
        code:
          SDK +
          'export function f(userKey) { return new Anthropic({ apiKey: userKey || import.meta.env.VITE_KEY, dangerouslyAllowBrowser: true }); }',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'a null token provider does not abstain',
        code:
          "import { AnthropicFoundry } from '@anthropic-ai/foundry-sdk';\n" +
          'const c = new AnthropicFoundry({ azureADTokenProvider: null, dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'a build-time define, as the SDK ecosystem test injects it',
        // @found anthropics/anthropic-sdk-typescript:ecosystem-tests/browser-vite/src/main.ts:13
        code:
          SDK +
          'const client = new Anthropic({ baseURL: __BASE_URL__, apiKey: __FAKE_API_KEY__, dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'no key at all: the SDK falls back to the environment variable',
        // @found anthropics/anthropic-sdk-typescript:ecosystem-tests/browser-vite/type-tests.ts:4
        code:
          SDK +
          'export const client = new Anthropic({ dangerouslyAllowBrowser: true, fetch: window.fetch });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'rename litmus: renamed import and options',
        code:
          "import Foo from '@anthropic-ai/sdk';\n" +
          'const bar = { dangerouslyAllowBrowser: true };\nnew Foo(bar);',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
    ],
  });
});
