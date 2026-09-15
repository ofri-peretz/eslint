/**
 * `in` and the own-property checks are not the same predicate.
 *
 * `in` walks the prototype chain; `hasOwnProperty`, `Object.prototype.hasOwnProperty.call`
 * and `Object.hasOwn` do not. Rewriting one into the other changes what the code answers
 * for an inherited key — which is the whole reason a parser checks own properties on an
 * object the user supplied. A style rule may say it prefers the other form; it may not
 * silently rewrite the program's meaning under `--fix`.
 *
 * The DIRECT `obj.hasOwnProperty(k)` is not interchangeable with the other two
 * own-property forms either: it looks the method up ON `obj`, so it throws on a
 * null-prototype object and calls whatever a shadowing own property points at.
 * `Object.hasOwn(Object.create(null), k)` rewritten to
 * `Object.create(null).hasOwnProperty(k)` is a working check turned into a TypeError.
 *
 * One conversion survives both boundaries — `Object.prototype.hasOwnProperty.call(obj, k)`
 * and `Object.hasOwn(obj, k)`, the same question through the same dispatch. That fix stays.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentExistenceIndexCheck } from '../../rules/conventions/consistent-existence-index-check';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('consistent-existence-index-check — the `in` boundary is not autofixable', () => {
  ruleTester.run(
    'own-property check, `in` preferred',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'hasOwnProperty is still reported, but output is unchanged',
          code: 'if (obj.hasOwnProperty(key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'Object.prototype.hasOwnProperty.call is still reported, but output is unchanged',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'Object.hasOwn is still reported, but output is unchanged',
          code: 'if (Object.hasOwn(obj, key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
      ],
    },
  );

  ruleTester.run(
    '`in` reported, own-property preferred',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: '`in` is not rewritten into Object.hasOwn',
          code: 'if (key in obj) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: '`in` is not rewritten into hasOwnProperty',
          code: 'if (key in obj) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
      ],
    },
  );

  ruleTester.run(
    'the direct hasOwnProperty dispatch is also a boundary',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'hasOwnProperty is not rewritten into Object.hasOwn — it is looked up ON obj',
          code: 'if (obj.hasOwnProperty(key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'Object.hasOwn on a null-prototype object is not rewritten into a call that would throw',
          code: 'if (Object.hasOwn(Object.create(null), key)) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
      ],
    },
  );

  ruleTester.run(
    'the one conversion that preserves both',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'Object.prototype.hasOwnProperty.call -> Object.hasOwn, same question and same dispatch',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'if (Object.hasOwn(obj, key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'a surplus argument is evaluated, so dropping it is not a rewrite this fixer may make',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key, sideEffect())) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          // burgee sweep 2026-09-10. A SequenceExpression argument carries its own
          // commas, and `getText()` returns a node WITHOUT the parentheses that
          // held them together — parens belong to the parent, not the node range.
          // Splicing that text into a new argument list promotes an inner comma to
          // an argument separator, so a 2-argument call becomes a 3-argument one.
          // `Object.hasOwn` takes 2 and ignores the rest: the check silently
          // answers about the wrong object. `(0, ns.member)` is what TypeScript and
          // Babel emit to strip a `this` binding, so this text is not hypothetical.
          name: 'a sequence-expression object is reported, but the arity would change, so it is not rewritten',
          code: 'if (Object.prototype.hasOwnProperty.call((0, mod.argv), key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          // Same defect through the property argument: the key would become
          // `norm()`'s return value instead of `key`.
          name: 'a sequence-expression property is reported, but not rewritten',
          code: 'if (Object.prototype.hasOwnProperty.call(argv, (norm(), key))) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'and a longer sequence, which would splice in two surplus arguments',
          code: 'if (Object.prototype.hasOwnProperty.call((a, b, c), key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'and it holds for a null-prototype object',
          code: 'if (Object.prototype.hasOwnProperty.call(Object.create(null), key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'if (Object.hasOwn(Object.create(null), key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
      ],
    },
  );
});

/**
 * The one safe conversion stays safe in a nested position.
 *
 * `Object.prototype.hasOwnProperty.call(obj, k)` and `Object.hasOwn(obj, k)` are both
 * CallExpressions at the same precedence tier, both led by the token `Object`. Swapping
 * one for the other in place cannot introduce a precedence, parenthesization or ASI
 * hazard, so the parent node the call happens to sit under has no bearing on whether the
 * rewrite is safe. The three real boundaries — the prototype chain, the dispatch site and
 * a sequence-expression argument that would splice in surplus arguments — are the ones
 * asserted above, and they are unaffected by position.
 *
 * A parent-type allowlist previously gated the fix, so every one of these was reported
 * with no fix offered while the identical call in a bare `if (...)` test was rewritten.
 */
describe('consistent-existence-index-check — the safe conversion survives nesting', () => {
  ruleTester.run(
    'own-property check in a nested position',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          // burgee packages/burgee/src/yargs/validation.ts:99
          // `if (!Object.prototype.hasOwnProperty.call(argv, key) || ...)`
          name: 'a negated call is rewritten, like the bare call it negates',
          code: 'if (!Object.prototype.hasOwnProperty.call(argv, key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'if (!Object.hasOwn(argv, key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          // burgee packages/burgee/src/yargs/command.ts:398-399, two operands of one `&&`
          name: 'both operands of a logical expression are rewritten',
          code: 'if (Object.prototype.hasOwnProperty.call(argv, key) && Object.prototype.hasOwnProperty.call(parsed, key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output:
            'if (Object.hasOwn(argv, key) && Object.hasOwn(parsed, key)) {}',
          errors: [
            { messageId: 'consistentExistenceCheck' as const },
            { messageId: 'consistentExistenceCheck' as const },
          ],
        },
        {
          name: 'a call passed as an argument is rewritten',
          code: 'assert(Object.prototype.hasOwnProperty.call(argv, key));',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'assert(Object.hasOwn(argv, key));',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'an array element is rewritten',
          code: 'const flags = [Object.prototype.hasOwnProperty.call(argv, key)];',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'const flags = [Object.hasOwn(argv, key)];',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          // The allowlist admitted a ConditionalExpression `test` but not its branches,
          // which are identically safe.
          name: 'a conditional branch is rewritten, as its test already was',
          code: 'const has = flag ? Object.prototype.hasOwnProperty.call(argv, key) : false;',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'const has = flag ? Object.hasOwn(argv, key) : false;',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
      ],
    },
  );
});
