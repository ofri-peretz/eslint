import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPermissiveTrustProxy } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving the `express`
// binding. Several fixtures already declare `const express = require('express')`
// at module level, and a default import would redeclare it.
const asExpress = (code: string): string => `import 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-permissive-trust-proxy', () => {
  ruleTester.run('no-permissive-trust-proxy', noPermissiveTrustProxy, {
    valid: xp([
      // The receiver name is the consumer's — `appReceiverNames` replaces the
      // default, so `app` is not the app here.
      {
        name: 'the default receiver list replaced away',
        code: `app.set('trust proxy', true);`,
        options: [{ appReceiverNames: ['gateway'] }],
      },
      // THE safe patterns — name the proxies you actually run behind
      { name: 'a hop count', code: `app.set('trust proxy', 1);` },
      { code: `app.set('trust proxy', 'loopback');` },
      { code: `app.set('trust proxy', '10.0.0.0/8');` },
      { code: `app.set('trust proxy', (ip) => ip === '10.0.0.1');` },
      { code: `app.set('trust proxy', false);` },
      { code: `app.set('trust proxy', trustProxySetting);` },
      { code: `app.set('trust proxy');` },
      // Other settings
      { code: `app.set('view engine', 'pug');` },
      { code: `app.enable('strict routing');` },
      { code: `app.enable();` },
      { code: `app.set(SETTING_NAME, true);` },
      // Not an Express app receiver
      { code: `config.set('trust proxy', true);` },
      { code: `config.enable('trust proxy');` },
      { code: `set('trust proxy', true);` },
      { code: `app[method]('trust proxy', true);` },
      { code: `app['set']('trust proxy', true);` },
      { code: `app().set('trust proxy', true);` },
    ]),
    invalid: xp([
      {
        name: 'a receiver the consumer named',
        code: `gateway.set('trust proxy', true);`,
        options: [{ appReceiverNames: ['gateway'] }],
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `gateway.set('trust proxy', 1);`,
              },
            ],
          },
        ],
      },
      // Unconditional trust — the classic rate-limit bypass
      {
        name: 'trust proxy true — req.ip becomes whatever X-Forwarded-For says',
        code: `app.set('trust proxy', true);`,
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `app.set('trust proxy', 1);`,
              },
            ],
          },
        ],
      },
      // enable() spelling
      {
        code: `app.enable('trust proxy');`,
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `app.set('trust proxy', 1);`,
              },
            ],
          },
        ],
      },
      // Alternative receiver names
      {
        code: `server.set('trust proxy', true);`,
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `server.set('trust proxy', 1);`,
              },
            ],
          },
        ],
      },
      {
        code: `server.enable('trust proxy');`,
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `server.set('trust proxy', 1);`,
              },
            ],
          },
        ],
      },
      // Configured hop count feeds the suggestion
      {
        code: `app.set('trust proxy', true);`,
        options: [{ hopCount: 2 }],
        errors: [
          {
            messageId: 'permissiveTrustProxy' as const,
            suggestions: [
              {
                messageId: 'useHopCount' as const,
                output: `app.set('trust proxy', 2);`,
              },
            ],
          },
        ],
      },
    ]),
  });
});
