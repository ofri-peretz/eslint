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
