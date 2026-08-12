/**
 * @fileoverview Branch-coverage tests for require-query-type-guard.
 *
 * Every early-return bail in the rule is parser-reachable, so this file uses
 * RuleTester only (no synthetic-AST mock context needed).
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireQueryTypeGuard } from './index';

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

describe('require-query-type-guard (branch coverage)', () => {
  ruleTester.run(
    'require-query-type-guard (branch coverage)',
    requireQueryTypeGuard,
    {
      valid: xp([
        // --- CallExpression bails ---
        // Bare call — callee is not a member expression
        { code: `trim();` },
        // Computed string-method access — property is not an Identifier (documented FN)
        { code: `req.query.name['replace']('a', 'b');` },
        // Member call that is not a string method
        { code: `res.send(req.query.name);` },
        // Object is a member expression but not a query member
        { code: `foo.bar.trim();` },
        // --- isReqQuery bails ---
        // Root object is not an identifier
        { code: `f().query.name.trim();` },
        // Computed query access — documented FN
        { code: `req['query'].name.trim();` },
        // Property is not 'query'
        { code: `req.session.name.trim();` },
        // --- Array.isArray recognition bails (fall through, still no report) ---
        { code: `Array['isArray'](req.query.x);` },
        { code: `Arr.isArray(req.query.x);` },
        { code: `a.b.isArray(req.query.x);` },
        { code: `Array.from(req.query.x);` },
        // Array.isArray with no argument — guard is a no-op
        { code: `Array.isArray();` },
        // --- typeof guard extraction bails ---
        // Unary operator that is not typeof
        { code: `if (-x === 'string') use(x);` },
        // Right side is not a literal
        { code: `if (typeof x === y) use(x);` },
        // Literal is not 'string'
        { code: `if (typeof x === 'number') use(x);` },
        // Non-equality binary operator
        { code: `if (a < b) use(a);` },
        // Guard target is neither identifier nor query member
        { code: `if (typeof req.body.x === 'string') use(req);` },
        // Guard on an identifier that was never tracked
        { code: `if (typeof foo === 'string') foo.trim();` },
        // --- VariableDeclarator bails ---
        // Destructuring pattern — documented FN
        { code: `const { name } = req.query; name && name.length;` },
        // Declaration without an initializer
        { code: `let x; x = 5;` },
        // Initializer that is not a query member
        { code: `const y = 5; compute(y);` },
        // --- AssignmentExpression bails ---
        // Compound assignment operator
        { code: `s += 'x';` },
        // Left side is not an identifier
        { code: `obj.a = req.query.x;` },
        // Right side neither query member nor safe call
        { code: `v = 5;` },
        // --- cross-frame guard: typeof inside a closure guards the outer var ---
        {
          code: `
          function handler(req) {
            const v = req.query.a;
            check(() => {
              if (typeof v === 'string') { v.trim(); }
            });
          }
        `,
        },
      ]),
      invalid: xp([
        // Safe-call check: callee is neither identifier nor member (IIFE)
        {
          code: `let v = req.query.q; v = ((x) => x)(v); v.trim();`,
          errors: [
            {
              messageId: 'unguardedQueryStringMethod',
              suggestions: [
                {
                  messageId: 'coerceAtAssignment',
                  output: `let v = String(req.query.q); v = ((x) => x)(v); v.trim();`,
                },
              ],
            },
          ],
        },
        // Safe-call check: computed callee property is not an Identifier
        {
          code: `let v = req.query.q; v = a['parse'](v); v.trim();`,
          errors: [
            {
              messageId: 'unguardedQueryStringMethod',
              suggestions: [
                {
                  messageId: 'coerceAtAssignment',
                  output: `let v = String(req.query.q); v = a['parse'](v); v.trim();`,
                },
              ],
            },
          ],
        },
        // Safe-call check: member callee whose method is not a validator
        {
          code: `let v = req.query.q; v = a.b(v); v.trim();`,
          errors: [
            {
              messageId: 'unguardedQueryStringMethod',
              suggestions: [
                {
                  messageId: 'coerceAtAssignment',
                  output: `let v = String(req.query.q); v = a.b(v); v.trim();`,
                },
              ],
            },
          ],
        },
        // Safe-call check: plain literal reassignment keeps the variable tracked
        {
          code: `let v = req.query.q; v = 'x'; v.trim();`,
          errors: [
            {
              messageId: 'unguardedQueryStringMethod',
              suggestions: [
                {
                  messageId: 'coerceAtAssignment',
                  output: `let v = String(req.query.q); v = 'x'; v.trim();`,
                },
              ],
            },
          ],
        },
        // Bare validator name resolved through validatorNames (not coercerNames)
        {
          code: `let v = req.query.q; v = parse(v); v.toUpperCase(); let w = req.query.w; w.trim();`,
          errors: [
            {
              messageId: 'unguardedQueryStringMethod',
              suggestions: [
                {
                  messageId: 'coerceAtAssignment',
                  output: `let v = req.query.q; v = parse(v); v.toUpperCase(); let w = String(req.query.w); w.trim();`,
                },
              ],
            },
          ],
        },
      ]),
    },
  );
});
