/**
 * Tests for createBrowserEscapeHatchRule.
 *
 * Layer 2: `readFlag` directly, including the verdicts that make the rule stay
 * silent rather than guess.
 * Layer 1: the assembled rule against a synthetic SDK.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  createBrowserEscapeHatchRule,
  readFlag,
  BROWSER_ESCAPE_FLAG,
} from './browser-escape-hatch-rule';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const objOf = (code: string): TSESTree.ObjectExpression =>
  (
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
      .expression as TSESTree.ObjectExpression
  );

describe('BROWSER_ESCAPE_FLAG', () => {
  it('is the flag both SDKs spell identically', () => {
    // Verified against openai@6 and @anthropic-ai/sdk@0.115 (client.d.ts:140).
    expect(BROWSER_ESCAPE_FLAG).toBe('dangerouslyAllowBrowser');
  });
});

describe('readFlag', () => {
  it('reports the flag turned on', () => {
    expect(readFlag(objOf('({ dangerouslyAllowBrowser: true })'))).toBe('enabled');
  });

  it('reads a quoted key the same as a bare one', () => {
    expect(readFlag(objOf("({ 'dangerouslyAllowBrowser': true })"))).toBe('enabled');
  });

  it('treats an explicit false as the safe choice already made', () => {
    expect(readFlag(objOf('({ dangerouslyAllowBrowser: false })'))).toBe('absent');
  });

  it('treats a non-boolean literal as absent rather than enabled', () => {
    expect(readFlag(objOf("({ dangerouslyAllowBrowser: 'yes' })"))).toBe('absent');
  });

  it('gives up on a non-literal value rather than guess', () => {
    // `isBrowser` could be either at runtime; reporting would flag correct code.
    expect(readFlag(objOf('({ dangerouslyAllowBrowser: isBrowser })'))).toBe('unreadable');
  });

  it('gives up on a spread, which could carry the flag', () => {
    expect(readFlag(objOf('({ ...base })'))).toBe('unreadable');
  });

  it('skips a computed key it cannot name', () => {
    expect(readFlag(objOf('({ [k]: true })'))).toBe('absent');
  });

  it('is absent for unrelated options and for an empty object', () => {
    expect(readFlag(objOf("({ apiKey: 'k', timeout: 1 })"))).toBe('absent');
    expect(readFlag(objOf('({})'))).toBe('absent');
  });
});

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

const rule = createBrowserEscapeHatchRule({
  ruleName: 'no-browser-api-key-exposure',
  vendor: 'Test',
  modules: ['test-sdk', '@test-scope'],
  docsUrl: 'https://example.invalid/docs',
  documentationLink: 'https://example.invalid/auth',
});

const SDK = "import Client from 'test-sdk';\n";

describe('createBrowserEscapeHatchRule', () => {
  ruleTester.run('no-browser-api-key-exposure', rule, {
    valid: [
      {
        name: 'the flag set in a file that never imports the SDK',
        code: 'new Client({ dangerouslyAllowBrowser: true });',
      },
      { name: 'the flag explicitly off', code: SDK + 'new Client({ dangerouslyAllowBrowser: false });' },
      { name: 'the flag absent', code: SDK + "new Client({ apiKey: process.env.K });" },
      { name: 'no options', code: SDK + 'new Client();' },
      { name: 'a non-object argument', code: SDK + 'new Client(cfg);' },
      { name: 'a spread is unreadable', code: SDK + 'new Client({ ...base });' },
      {
        name: 'a runtime-decided value is unreadable',
        code: SDK + 'new Client({ dangerouslyAllowBrowser: isBrowser });',
      },
      {
        // A bare prefix match would arm on this; it is a different package.
        name: 'a package that merely shares the prefix',
        code: "import Client from 'test-sdk-mock';\nnew Client({ dangerouslyAllowBrowser: true });",
      },
    ],
    invalid: [
      {
        name: 'the flag turned on',
        code: SDK + 'new Client({ dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'a scoped module opens the gate',
        code:
          "import Client from '@test-scope/agents';\n" +
          'new Client({ dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'a subpath opens the gate',
        code: "import Client from 'test-sdk/edge';\nnew Client({ dangerouslyAllowBrowser: true });",
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'require() opens the gate',
        code:
          "const Client = require('test-sdk');\nnew Client({ dangerouslyAllowBrowser: true });",
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'a factory call takes the same options',
        code: SDK + 'createClient({ dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        // The gate must not depend on statement order.
        name: 'a construction above its import',
        code:
          "new Client({ dangerouslyAllowBrowser: true });\nimport Client from 'test-sdk';",
        errors: [{ messageId: 'browserKeyExposure' }],
      },
      {
        name: 'two clients report separately',
        code:
          SDK +
          'new Client({ dangerouslyAllowBrowser: true });\n' +
          'new Client({ dangerouslyAllowBrowser: true });',
        errors: [{ messageId: 'browserKeyExposure' }, { messageId: 'browserKeyExposure' }],
      },
    ],
  });
});
