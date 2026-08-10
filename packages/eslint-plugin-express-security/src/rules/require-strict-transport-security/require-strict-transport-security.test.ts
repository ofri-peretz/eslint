import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireStrictTransportSecurity } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
const asExpress = (code: string): string => `import express from 'express';\n${code}`;
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

describe('require-strict-transport-security', () => {
  ruleTester.run(
    'require-strict-transport-security',
    requireStrictTransportSecurity,
    {
      valid: xp([
        // Helmet defaults (365 days, includeSubDomains) — nothing to report
        { code: `app.use(helmet());` },
        { code: `app.use(helmet({ noSniff: true }));` },
        // Explicit, strong configuration
        {
          code: `app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: true, preload: true } }));`,
        },
        {
          code: `app.use(helmet({ strictTransportSecurity: { maxAge: 15552000, includeSubDomains: true } }));`,
        },
        // Exactly at the floor
        { code: `app.use(helmet({ hsts: { maxAge: 15552000 } }));` },
        // Dedicated factory, strong
        { code: `app.use(helmet.hsts({ maxAge: 31536000 }));` },
        {
          code: `app.use(helmet.strictTransportSecurity({ maxAge: 31536000 }));`,
        },
        { code: `app.use(helmet.hsts());` },
        { code: `app.use(helmet.hsts(config));` },
        // Subdomain exclusion accepted when the project opts out of the check
        {
          code: `app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: false } }));`,
          options: [{ requireSubDomains: false }],
        },
        // Lower floor accepted by config
        {
          code: `app.use(helmet({ hsts: { maxAge: 86400 } }));`,
          options: [{ minMaxAge: 86400 }],
        },
        // Non-literal / non-object values are not analysed
        { code: `app.use(helmet({ hsts: hstsConfig }));` },
        { code: `app.use(helmet({ hsts: { maxAge: ONE_YEAR } }));` },
        {
          code: `app.use(helmet({ hsts: { includeSubDomains: subdomainFlag } }));`,
        },
        { code: `app.use(helmet({ hsts: true }));` },
        { code: `app.use(helmet({ hsts: { ...base } }));` },
        { code: `app.use(helmet({ hsts: { [key]: false } }));` },
        { code: `app.use(helmet({ hsts: { 1: false } }));` },
        { code: `app.use(helmet({ ...defaults }));` },
        { code: `app.use(helmet({ [key]: false }));` },
        { code: `app.use(helmet({ 1: false }));` },
        // maxAge as a string is not a numeric weakening we can judge
        { code: `app.use(helmet({ hsts: { maxAge: '31536000' } }));` },
        // Not helmet
        { code: `app.use(hsts({ maxAge: 1 }));` },
        { code: `app.use(helmet.contentSecurityPolicy({ maxAge: 1 }));` },
        { code: `app.use(other.hsts({ maxAge: 1 }));` },
        { code: `app.use(helmet[dynamic]({ maxAge: 1 }));` },
        { code: `app.use(helmet['hsts']({ maxAge: 1 }));` },
        { code: `app.use(getHelmet().hsts({ maxAge: 1 }));` },
        { code: `app.use(helmet(config));` },
        { code: `const mw = helmet();` },
      ]),
      invalid: xp([
        // HSTS switched off entirely (helmet ≤6 spelling)
        {
          code: `app.use(helmet({ hsts: false }));`,
          errors: [{ messageId: 'hstsDisabled' as const }],
        },
        // helmet 7+ spelling
        {
          code: `app.use(helmet({ strictTransportSecurity: false }));`,
          errors: [{ messageId: 'hstsDisabled' as const }],
        },
        // Five-minute max-age — the SonarJS S5739 case
        {
          code: `app.use(helmet({ hsts: { maxAge: 300 } }));`,
          errors: [
            {
              messageId: 'maxAgeTooShort' as const,
              suggestions: [
                {
                  messageId: 'raiseMaxAge' as const,
                  output: `app.use(helmet({ hsts: { maxAge: 15552000 } }));`,
                },
              ],
            },
          ],
        },
        // Dedicated factory with a short max-age
        {
          code: `app.use(helmet.hsts({ maxAge: 3600 }));`,
          errors: [
            {
              messageId: 'maxAgeTooShort' as const,
              suggestions: [
                {
                  messageId: 'raiseMaxAge' as const,
                  output: `app.use(helmet.hsts({ maxAge: 15552000 }));`,
                },
              ],
            },
          ],
        },
        // Custom floor makes a one-day max-age a finding
        {
          code: `app.use(helmet({ hsts: { maxAge: 86400 } }));`,
          options: [{ minMaxAge: 31536000 }],
          errors: [
            {
              messageId: 'maxAgeTooShort' as const,
              suggestions: [
                {
                  messageId: 'raiseMaxAge' as const,
                  output: `app.use(helmet({ hsts: { maxAge: 31536000 } }));`,
                },
              ],
            },
          ],
        },
        // Subdomains excluded
        {
          code: `app.use(helmet({ hsts: { maxAge: 31536000, includeSubDomains: false } }));`,
          errors: [{ messageId: 'subdomainsExcluded' as const }],
        },
        {
          code: `app.use(helmet.hsts({ maxAge: 31536000, 'includeSubDomains': false }));`,
          errors: [{ messageId: 'subdomainsExcluded' as const }],
        },
        // Both weaknesses at once
        {
          code: `app.use(helmet({ hsts: { maxAge: 60, includeSubDomains: false } }));`,
          errors: [
            {
              messageId: 'maxAgeTooShort' as const,
              suggestions: [
                {
                  messageId: 'raiseMaxAge' as const,
                  output: `app.use(helmet({ hsts: { maxAge: 15552000, includeSubDomains: false } }));`,
                },
              ],
            },
            { messageId: 'subdomainsExcluded' as const },
          ],
        },
      ]),
    },
  );
});
