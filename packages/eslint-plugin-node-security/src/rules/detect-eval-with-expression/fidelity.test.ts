/**
 * detect-eval-with-expression — divergences the Quint fidelity model found
 * between the rule and its documented `allowLiteralStrings` contract
 * (benchmarks/suites/fidelity/models/node-security/detect_eval_with_expression.qnt).
 *
 *   - the option did not exempt `new Function` with an author-written body;
 *   - it did not exempt one hop of single-write constant, which the vm sinks
 *     already treat as author-written.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectEvalWithExpression } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const ALLOW = [{ allowLiteralStrings: true }];

describe('detect-eval-with-expression fidelity', () => {
  ruleTester.run('allowLiteralStrings', detectEvalWithExpression, {
    valid: [
      {
        name: 'allowLiteralStrings exempts new Function with a literal body',
        code: `export function handler(req: any) { new Function('price', 'total = price * 2'); }`,
        options: ALLOW,
      },
      {
        name: 'allowLiteralStrings exempts new Function with a single-write const body',
        code: `export function handler(req: any) { const SCRIPT = 'total = price * 2'; new Function('price', SCRIPT); }`,
        options: ALLOW,
      },
      {
        name: 'allowLiteralStrings exempts eval of a single-write const program',
        code: `export function handler(req: any) { const SCRIPT = 'total = price * 2'; eval(SCRIPT); }`,
        options: ALLOW,
      },
      {
        name: 'eval of a direct string literal is silent at the default',
        code: `export function handler(req: any) { eval('total = price * 2'); }`,
      },
    ],
    invalid: [
      {
        name: 'at the default, new Function with a literal body is still reported',
        code: `export function handler(req: any) { new Function('price', 'total = price * 2'); }`,
        errors: 1,
      },
      {
        name: 'at the default, eval through a const is still reported',
        code: `export function handler(req: any) { const SCRIPT = 'total = price * 2'; eval(SCRIPT); }`,
        errors: 1,
      },
      {
        name: 'allowLiteralStrings does not exempt new Function with a request body',
        code: `export function handler(req: any) { new Function('price', req.body.code); }`,
        options: ALLOW,
        errors: 1,
      },
    ],
  });
});
