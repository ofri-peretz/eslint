/**
 * `in` and the own-property checks are not the same predicate.
 *
 * `in` walks the prototype chain; `hasOwnProperty`, `Object.prototype.hasOwnProperty.call`
 * and `Object.hasOwn` do not. Rewriting one into the other changes what the code answers
 * for an inherited key — which is the whole reason a parser checks own properties on an
 * object the user supplied. A style rule may say it prefers the other form; it may not
 * silently rewrite the program's meaning under `--fix`.
 *
 * The three own-property forms *are* interchangeable with each other, so those fixes stay.
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
    'own-property to own-property still autofixes',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'hasOwnProperty -> Object.hasOwn',
          code: 'if (obj.hasOwnProperty(key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'if (Object.hasOwn(obj, key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'Object.prototype.hasOwnProperty.call -> Object.hasOwn',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'if (Object.hasOwn(obj, key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          name: 'Object.hasOwn -> hasOwnProperty',
          code: 'if (Object.hasOwn(obj, key)) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: 'if (obj.hasOwnProperty(key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
      ],
    },
  );
});
