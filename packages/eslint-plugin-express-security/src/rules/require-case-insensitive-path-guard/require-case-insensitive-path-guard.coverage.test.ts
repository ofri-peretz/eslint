/**
 * @fileoverview Branch-coverage tests for require-case-insensitive-path-guard.
 *
 * Every early-return bail in the rule is parser-reachable, so this file uses
 * RuleTester only (no synthetic-AST mock context needed).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireCaseInsensitivePathGuard } from './index';

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

describe('require-case-insensitive-path-guard (branch coverage)', () => {
  ruleTester.run(
    'require-case-insensitive-path-guard (branch coverage)',
    requireCaseInsensitivePathGuard,
    {
      valid: xp([
        // Bare call — callee is not a member expression
        { code: `startsWith('/admin');` },
        // Computed guard method — property is not an Identifier
        { code: `req.path['startsWith']('/admin');` },
        // Member call that is not a guard method
        { code: `req.path.charAt(0);` },
        // Path object is itself a member expression — root is not an Identifier
        { code: `a.req.path.startsWith('/admin');` },
        // Unknown request object name
        { code: `foo.path.startsWith('/admin');` },
        // Computed path property — not an Identifier
        { code: `req['path'].startsWith('/admin');` },
        // Request property that is not a path property
        { code: `req.hostname.startsWith('admin');` },
        // Guard method with no argument
        { code: `req.path.startsWith();` },
        // Non-string literal argument
        { code: `req.path.startsWith(42);` },
        // Non-equality binary operator on a path access
        { code: `if (req.path < '/admin') deny();` },
        // Binary with neither side a path access
        { code: `if (a === '/admin') deny();` },
        // Path on the right but non-string literal on the left
        { code: `if (5 === req.path) deny();` },
        // Path on both sides — no string literal to compare against
        { code: `if (req.path === req.url) deny();` },
      ]),
      invalid: xp([
        // request alias through the equality path (isRequestIdent 'request')
        {
          code: `if (request.url === '/api/private') deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (request.url.toLowerCase() === '/api/private') deny();`,
                },
              ],
            },
          ],
        },
      ]),
    },
  );
});
