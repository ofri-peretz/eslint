import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDisabledHelmetProtections } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-disabled-helmet-protections', () => {
  ruleTester.run(
    'no-disabled-helmet-protections',
    noDisabledHelmetProtections,
    {
      valid: [
        // THE safe pattern — helmet with its defaults
        { code: `app.use(helmet());` },
        // Customising a protection (object, not false) keeps the header
        {
          code: `app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));`,
        },
        {
          code: `app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));`,
        },
        // hsts is owned by require-strict-transport-security — not double reported here
        { code: `app.use(helmet({ hsts: false }));` },
        { code: `app.use(helmet({ strictTransportSecurity: false }));` },
        // Unrelated helmet options
        { code: `app.use(helmet({ dnsPrefetchControl: false }));` },
        { code: `app.use(helmet({ ieNoOpen: false }));` },
        // Truthy value is not a disablement
        { code: `app.use(helmet({ noSniff: true }));` },
        // Non-literal value — not analysed (documented false negative)
        { code: `app.use(helmet({ noSniff: enableSniffGuard }));` },
        // Computed key — not analysed
        { code: `app.use(helmet({ [key]: false }));` },
        // Numeric key — not a helmet protection
        { code: `app.use(helmet({ 1: false }));` },
        // Spread element in the config object
        { code: `app.use(helmet({ ...baseConfig }));` },
        // Not a helmet call
        { code: `app.use(cors({ contentSecurityPolicy: false }));` },
        { code: `helmet.contentSecurityPolicy({ useDefaults: true });` },
        // helmet() with no config
        { code: `const mw = helmet();` },
        // Non-object argument
        { code: `app.use(helmet(config));` },
        // Explicitly allowlisted (CSP served at the CDN edge)
        {
          code: `app.use(helmet({ contentSecurityPolicy: false }));`,
          options: [{ allowDisabled: ['contentSecurityPolicy'] }],
        },
      ],
      invalid: [
        // CSP off — the SonarJS S5728 case
        {
          code: `app.use(helmet({ contentSecurityPolicy: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        // Clickjacking guard off (helmet ≤6 spelling) — trailing comma removal
        {
          code: `app.use(helmet({ frameguard: false, hsts: { maxAge: 31536000 } }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  hsts: { maxAge: 31536000 } }));`,
                },
              ],
            },
          ],
        },
        // helmet 7+ spelling — leading comma removal (last property)
        {
          code: `app.use(helmet({ hsts: { maxAge: 31536000 }, xFrameOptions: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({ hsts: { maxAge: 31536000 } }));`,
                },
              ],
            },
          ],
        },
        // MIME-sniffing guard off
        {
          code: `app.use(helmet({ noSniff: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        {
          code: `app.use(helmet({ xContentTypeOptions: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        // Referrer-Policy off
        {
          code: `app.use(helmet({ referrerPolicy: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        // X-Powered-By kept (fingerprinting)
        {
          code: `app.use(helmet({ hidePoweredBy: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        {
          code: `app.use(helmet({ xPoweredBy: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        // Cross-origin isolation off — each suggestion applies to the original source
        {
          code: `app.use(helmet({ crossOriginResourcePolicy: false, crossOriginOpenerPolicy: false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  crossOriginOpenerPolicy: false }));`,
                },
              ],
            },
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({ crossOriginResourcePolicy: false }));`,
                },
              ],
            },
          ],
        },
        // String key spelling
        {
          code: `app.use(helmet({ 'noSniff': false }));`,
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({  }));`,
                },
              ],
            },
          ],
        },
        // Allowlist covers one option, the other still reports
        {
          code: `app.use(helmet({ contentSecurityPolicy: false, noSniff: false }));`,
          options: [{ allowDisabled: ['contentSecurityPolicy'] }],
          errors: [
            {
              messageId: 'disabledProtection' as const,
              suggestions: [
                {
                  messageId: 'restoreDefault' as const,
                  output: `app.use(helmet({ contentSecurityPolicy: false }));`,
                },
              ],
            },
          ],
        },
      ],
    },
  );
});
