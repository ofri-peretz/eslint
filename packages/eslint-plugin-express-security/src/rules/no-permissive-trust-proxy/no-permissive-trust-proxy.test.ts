import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPermissiveTrustProxy } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-permissive-trust-proxy', () => {
  ruleTester.run('no-permissive-trust-proxy', noPermissiveTrustProxy, {
    valid: [
      // THE safe patterns — name the proxies you actually run behind
      { code: `app.set('trust proxy', 1);` },
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
    ],
    invalid: [
      // Unconditional trust — the classic rate-limit bypass
      {
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
    ],
  });
});
