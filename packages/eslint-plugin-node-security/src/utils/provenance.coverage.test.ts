/**
 * Coverage tests for the shared provenance model.
 *
 * The helpers in `utils/provenance.ts` are only reachable through the rules
 * that use them, so each branch is driven through the smallest rule that
 * exercises it — `no-unsafe-dynamic-require` for the taint reader,
 * `no-timing-unsafe-compare` for the `const`-literal resolver.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDynamicRequire } from '../rules/no-unsafe-dynamic-require';
import { noTimingUnsafeCompare } from '../rules/no-timing-unsafe-compare';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('utils/provenance coverage', () => {
  describe('makeReadsTaintSource', () => {
    ruleTester.run('taint reader branches', noUnsafeDynamicRequire, {
      valid: [
        // `bindingInit`: a declarator with NO initializer resolves to undefined,
        // which is unresolved provenance, not clean provenance.
        'let mod; require(mod);',
        // A binding DECLARED twice has no single provenance.
        'function boot(req) { var mod = req.body.a; var mod = "fs"; return require(mod); }',
        // A parameter definition is a caller-side fact.
        'function load(name) { return require(name); }',
        // Depth cap: seven identifier hops exhaust the walk before any answer.
        `const h1 = unknown; const h2 = h1; const h3 = h2; const h4 = h3;
         const h5 = h4; const h6 = h5; const h7 = h6; const h8 = h7;
         require(h8);`,
        // Node types the reader does not model return false rather than throw.
        'require(cond ? "a" : "b");',
      ],
      invalid: [
        // AwaitExpression.
        {
          code: 'async function boot(req) { return require(await req.body.mod); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // ArrayExpression, reached through a call wrapper.
        {
          code: 'function boot(req) { return require(join([req.query.mod])); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // SpreadElement inside that array.
        {
          code: 'function boot(req) { return require(join([...req.query.parts])); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // A sparse array element is skipped without throwing.
        {
          code: 'function boot(req) { return require(join([, req.query.mod])); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // NewExpression wrapper.
        {
          code: 'function boot(req) { return require(new Wrapper(req.body.mod)); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // BinaryExpression, taint on the right.
        {
          code: 'function boot(req) { return require("./" + req.body.mod); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // A request property name on an otherwise unremarkable receiver.
        {
          code: 'function boot(ctxLike) { return require(ctxLike.headers.mod); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        // A spread ARGUMENT of the require-wrapping call.
        {
          code: 'function boot(req) { return require(join(...req.body.parts)); }',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  describe('constLiteralOf', () => {
    ruleTester.run('const-literal resolution branches', noTimingUnsafeCompare, {
      valid: [
        // A `const` bound to a template literal with no interpolation is the
        // same string constant written longhand.
        'const TAG = `session`; function f(req) { return req.body.token === TAG; }',
      ],
      invalid: [
        // `let` is not `const`: it can be reassigned after this point, so its
        // initializer proves nothing.
        {
          code: 'let TAG = "session"; function f(req) { return req.body.token === TAG; }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A destructured `const` does not bind a single named literal.
        {
          code: 'const { TAG } = cfg; function f(req) { return req.body.token === TAG; }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // `for (const x of …)` is a `const` declarator with NO initializer.
        {
          code: 'function f(req, list) { for (const TAG of list) { if (req.body.token === TAG) return TAG; } }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A `const` bound to something that is not a literal at all.
        {
          code: 'const TAG = compute(); function f(req) { return req.body.token === TAG; }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // A `const` bound to an INTERPOLATING template is not a constant.
        {
          code: 'const TAG = `a${b}`; function f(req) { return req.body.token === TAG; }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
        // An undeclared name resolves to no variable at all.
        {
          code: 'function f(req) { return req.body.token === UNDECLARED_TAG; }',
          errors: [{ messageId: 'timingUnsafeCompare' }],
        },
      ],
    });
  });
});
