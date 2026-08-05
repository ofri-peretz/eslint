/**
 * Tests for createSdkApiKeyRule.
 *
 * Layer 2: the extracted decision functions directly.
 * Layer 1: the assembled rule against a synthetic SDK, which is how the shared
 * wiring gets covered — each shipped plugin only exercises its own config, so
 * arms like the positional path (one plugin) and its absence (the other two)
 * are only both reachable here.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  createSdkApiKeyRule,
  matchesModule,
  readCredential,
  calleeName,
  POSITIONAL_KEY_LABEL,
} from './sdk-api-key-rule';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const objOf = (code: string): TSESTree.ObjectExpression =>
  (
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement)
      .expression as TSESTree.ObjectExpression
  );

const calleeOf = (code: string): TSESTree.Node => {
  const stmt = parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement;
  return (stmt.expression as TSESTree.NewExpression).callee;
};

describe('matchesModule', () => {
  it('matches the exact specifier', () => {
    expect(matchesModule('openai', ['openai'])).toBe(true);
  });

  it('matches a subpath', () => {
    expect(matchesModule('openai/resources', ['openai'])).toBe(true);
    expect(matchesModule('@anthropic-ai/sdk', ['@anthropic-ai'])).toBe(true);
  });

  it('does not match a different package that shares the prefix', () => {
    // The load-bearing case: `openai-edge` is a separate client. A bare
    // startsWith would open the gate on it.
    expect(matchesModule('openai-edge', ['openai'])).toBe(false);
    expect(matchesModule('@anthropic-ai-community/x', ['@anthropic-ai'])).toBe(false);
  });

  it('is false when no module is configured to match', () => {
    expect(matchesModule('cohere-ai', ['openai', '@anthropic-ai'])).toBe(false);
  });
});

describe('readCredential', () => {
  const keys = new Set(['apiKey', 'authToken']);

  it('reports a non-empty string literal, naming the property that held it', () => {
    expect(readCredential(objOf("({ apiKey: 'sk-live-1' })"), keys)).toEqual({
      kind: 'literal',
      prop: 'apiKey',
    });
    // Regression: a bare verdict made the caller guess, and it guessed the
    // first configured prop — naming apiKey when authToken was the offender.
    expect(readCredential(objOf("({ authToken: 'tok-1' })"), keys)).toEqual({
      kind: 'literal',
      prop: 'authToken',
    });
  });

  it('reads a quoted key the same as a bare one', () => {
    expect(readCredential(objOf("({ 'apiKey': 'sk-live-1' })"), keys)).toEqual({
      kind: 'literal',
      prop: 'apiKey',
    });
  });

  it('treats an environment read as safe', () => {
    expect(readCredential(objOf('({ apiKey: process.env.OPENAI_API_KEY })'), keys)).toEqual({
      kind: 'safe',
    });
  });

  it('treats an empty string as a placeholder, not a credential', () => {
    expect(readCredential(objOf("({ apiKey: '' })"), keys)).toEqual({ kind: 'safe' });
  });

  it('treats a non-string literal as safe', () => {
    expect(readCredential(objOf('({ apiKey: null })'), keys)).toEqual({ kind: 'safe' });
  });

  it('gives up on a spread rather than guess what it carries', () => {
    expect(readCredential(objOf('({ ...base })'), keys)).toEqual({ kind: 'unreadable' });
  });

  it('skips a computed key it cannot name', () => {
    expect(readCredential(objOf("({ [k]: 'sk-live-1' })"), keys)).toEqual({ kind: 'safe' });
  });

  it('skips properties that are not credential options', () => {
    expect(readCredential(objOf("({ baseURL: 'https://x', timeout: 1 })"), keys)).toEqual({
      kind: 'safe',
    });
  });

  it('is safe for an empty options object', () => {
    expect(readCredential(objOf('({})'), keys)).toEqual({ kind: 'safe' });
  });
});

describe('calleeName', () => {
  it('names a bare constructor', () => {
    expect(calleeName(calleeOf("new GoogleGenerativeAI('k')"))).toBe('GoogleGenerativeAI');
  });

  it('names the property of a namespaced constructor', () => {
    // The namespace is not the identity — `genai.GoogleGenerativeAI` is the
    // same constructor.
    expect(calleeName(calleeOf("new genai.GoogleGenerativeAI('k')"))).toBe('GoogleGenerativeAI');
  });

  it('returns undefined for a computed or non-identifier callee', () => {
    expect(calleeName(calleeOf("new genai[name]('k')"))).toBeUndefined();
    expect(calleeName(calleeOf("new (factory())('k')"))).toBeUndefined();
  });
});

describe('POSITIONAL_KEY_LABEL', () => {
  it('is the string an instantiation branches on', () => {
    // Shared so a plugin's fix copy cannot drift from what the rule reports.
    expect(POSITIONAL_KEY_LABEL).toBe('The first argument');
  });
});

/**
 * The factory itself, through a synthetic SDK. The three shipped plugins each
 * cover their own module names; this block covers the wiring they share —
 * including the positional path, which only one of them configures.
 */
const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } },
});

const rule = createSdkApiKeyRule({
  ruleName: 'no-hardcoded-api-key',
  vendor: 'Test',
  modules: ['test-sdk', '@test-scope'],
  keyProps: ['apiKey', 'authToken'],
  fixTemplate: 'new Client({ {{prop}}: process.env.TEST_API_KEY })',
  positionalKeyConstructors: ['PositionalClient'],
  docsUrl: 'https://example.invalid/docs',
  documentationLink: 'https://example.invalid/auth',
});

const SDK = "import Client from 'test-sdk';\n";

describe('createSdkApiKeyRule', () => {
  ruleTester.run('no-hardcoded-api-key', rule, {
    valid: [
      { name: 'no SDK import, no opinion', code: "new Client({ apiKey: 'k' });" },
      { name: 'read from the environment', code: SDK + 'new Client({ apiKey: process.env.K });' },
      { name: 'empty string placeholder', code: SDK + "new Client({ apiKey: '' });" },
      { name: 'no arguments', code: SDK + 'new Client();' },
      { name: 'a spread is unreadable', code: SDK + 'new Client({ ...base });' },
      { name: 'a non-object, non-literal argument', code: SDK + 'new Client(cfg);' },
      { name: 'unrelated options', code: SDK + "new Client({ baseURL: 'https://x' });" },
      {
        name: 'a positional literal to a constructor that takes no positional key',
        code: SDK + "new Client('k');",
      },
      {
        name: 'a positional non-string literal',
        code: SDK + 'new PositionalClient(1);',
      },
      {
        name: 'an empty positional string',
        code: SDK + "new PositionalClient('');",
      },
      {
        name: 'a positional literal to a computed callee it cannot name',
        code: SDK + "new ns[which]('k');",
      },
      {
        name: 'a different module that merely shares the prefix',
        code: "import Client from 'test-sdk-extra';\nnew Client({ apiKey: 'k' });",
      },
      {
        name: 'a require of an unrelated module',
        code: "const Client = require('other');\nnew Client({ apiKey: 'k' });",
      },
    ],
    invalid: [
      {
        name: 'a literal in the first configured option',
        code: SDK + "new Client({ apiKey: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'apiKey' } }],
      },
      {
        name: 'a literal in a later configured option, named correctly',
        code: SDK + "new Client({ authToken: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey', data: { prop: 'authToken' } }],
      },
      {
        name: 'a scoped module opens the gate',
        code: "import Client from '@test-scope/pkg';\nnew Client({ apiKey: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a subpath opens the gate',
        code: "import Client from 'test-sdk/edge';\nnew Client({ apiKey: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'require() opens the gate',
        code: "const Client = require('test-sdk');\nnew Client({ apiKey: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'a plain call, not only a constructor',
        code: SDK + "createClient({ apiKey: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
      {
        name: 'the positional form for a configured constructor',
        code: SDK + "new PositionalClient('k');",
        errors: [{ messageId: 'hardcodedApiKey', data: { prop: POSITIONAL_KEY_LABEL } }],
      },
      {
        // The gate must not depend on statement order.
        name: 'a construction above its import',
        code: "new Client({ apiKey: 'k' });\nimport Client from 'test-sdk';",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
    ],
  });
});

/** The same factory with no positional constructors — the openai/anthropic shape. */
const optionsOnlyRule = createSdkApiKeyRule({
  ruleName: 'no-hardcoded-api-key',
  vendor: 'OptionsOnly',
  modules: ['options-sdk'],
  keyProps: ['apiKey'],
  fixTemplate: 'new Client({ {{prop}}: process.env.K })',
  docsUrl: 'https://example.invalid/docs',
  documentationLink: 'https://example.invalid/auth',
});

describe('createSdkApiKeyRule without positional constructors', () => {
  ruleTester.run('no-hardcoded-api-key', optionsOnlyRule, {
    valid: [
      {
        // With no positional constructors configured, a bare string argument
        // is never a credential — omitting the field must not fall back to
        // treating every literal first argument as one.
        name: 'a positional literal is not a finding',
        code: "import Client from 'options-sdk';\nnew Client('k');",
      },
    ],
    invalid: [
      {
        name: 'the options form still reports',
        code: "import Client from 'options-sdk';\nnew Client({ apiKey: 'k' });",
        errors: [{ messageId: 'hardcodedApiKey' }],
      },
    ],
  });
});
