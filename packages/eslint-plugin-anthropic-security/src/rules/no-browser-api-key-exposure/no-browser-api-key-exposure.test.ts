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
        code: SDK + 'const c = new Anthropic({ dangerouslyAllowBrowser: false });',
      },
      {
        name: 'the ordinary server construction',
        code: SDK + 'const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });',
      },
      {
        name: 'a runtime-decided value is unreadable, not a finding',
        code: SDK + 'const c = new Anthropic({ dangerouslyAllowBrowser: isBrowser });',
      },
      {
        name: 'a spread could carry the flag either way',
        code: SDK + 'const c = new Anthropic({ ...base });',
      },
      {
        name: 'no options at all',
        code: SDK + 'const c = new Anthropic();',
      },
    ],
    invalid: [
      {
        name: 'the flag turned on',
        code: SDK + 'const c = new Anthropic({ dangerouslyAllowBrowser: true });',
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
    ],
  });
});
