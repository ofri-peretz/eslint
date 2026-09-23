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
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
        },
        {
          name: 'Object.prototype.hasOwnProperty.call is still reported, but output is unchanged',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
        },
        {
          name: 'Object.hasOwn is still reported, but output is unchanged',
          code: 'if (Object.hasOwn(obj, key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
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
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
        },
        {
          name: '`in` is not rewritten into hasOwnProperty',
          code: 'if (key in obj) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: null,
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
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
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
        },
        {
          name: 'Object.hasOwn on a null-prototype object is not rewritten into a call that would throw',
          code: 'if (Object.hasOwn(Object.create(null), key)) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: null,
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
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
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
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
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
        },
        {
          // Same defect through the property argument: the key would become
          // `norm()`'s return value instead of `key`.
          name: 'a sequence-expression property is reported, but not rewritten',
          code: 'if (Object.prototype.hasOwnProperty.call(argv, (norm(), key))) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
        },
        {
          name: 'and a longer sequence, which would splice in two surplus arguments',
          code: 'if (Object.prototype.hasOwnProperty.call((a, b, c), key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [{ messageId: 'nonEquivalentExistenceCheck' as const }],
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

/**
 * The MESSAGE on a site the fixer refuses to rewrite must not order that rewrite.
 *
 * Withholding the fix was only half the job. Every report — including the ones on the
 * sites above, which the rule deliberately leaves alone — carried one message whose
 * `Fix:` line reads "Use "{{preferred}}" instead of "{{current}}" for property checks".
 * That is an imperative to perform the exact rewrite the rule just declined to make,
 * and following it breaks the program in both directions:
 *
 *   - TYPES. `Object.hasOwn` is declared `hasOwn(o: object, v: PropertyKey): boolean`
 *     in `lib.es2022.object.d.ts`. It is NOT a type predicate, so replacing
 *     `'on' in target` with `Object.hasOwn(target, 'on')` loses the narrowing `in`
 *     performs and the following `target.on(...)` becomes TS2339.
 *   - RUNTIME. `'on' in emitter` is `true` and `Object.hasOwn(emitter, 'on')` is
 *     `false`, because `on` lives on the prototype. A duck-type probe that answered
 *     yes now answers no.
 *
 * So a boundary-crossing site gets its own messageId, whose `Fix:` names what actually
 * differs between the two forms and asks for a hand edit instead. The decision to report
 * is unchanged — which form a codebase writes is still the user's style to pick.
 */
describe('consistent-existence-index-check — a non-rewritable site says so', () => {
  ruleTester.run(
    'the prototype boundary reports the disagreement, not the rewrite',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          // burgee packages/caique/src/inquirer.ts:190 — `'on' in target`, a
          // duck-type probe for an EventEmitter. `on` is a PROTOTYPE member, so
          // `Object.hasOwn(target, 'on')` answers `false` where this answers `true`.
          name: 'a duck-type probe of a prototype member is told the two disagree on an inherited key, not to rewrite it',
          code: "if ('on' in target) {}",
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'in',
                preferred: 'Object.hasOwn',
                disagreement: 'an inherited key',
              },
            },
          ],
        },
        {
          // burgee packages/caique/src/inquirer.ts:385 — `'readableFlowing' in input`,
          // the same shape on a Node stream getter, which is also on the prototype.
          name: 'the same holds for a stream getter probe under the default options',
          code: "if ('readableFlowing' in input) {}",
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'in',
                preferred: 'Object.hasOwn',
                disagreement: 'an inherited key',
              },
            },
          ],
        },
        {
          name: 'an own-property check reported under `preferred: in` crosses the same boundary in the other direction',
          code: 'if (Object.hasOwn(obj, key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'Object.hasOwn',
                preferred: 'in',
                disagreement: 'an inherited key',
              },
            },
          ],
        },
        {
          name: 'the prototype chain is the more fundamental disagreement when the dispatch also differs',
          code: 'if (key in obj) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'in',
                preferred: 'hasOwnProperty',
                disagreement: 'an inherited key',
              },
            },
          ],
        },
      ],
    },
  );

  ruleTester.run(
    'the dispatch boundary names the dispatch',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'the direct hasOwnProperty dispatch is told the two disagree on method dispatch, not to rewrite it',
          code: 'if (obj.hasOwnProperty(key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'hasOwnProperty',
                preferred: 'Object.hasOwn',
                disagreement: 'method dispatch on the object',
              },
            },
          ],
        },
        {
          name: 'and so is a null-prototype object that would start throwing under the direct dispatch',
          code: 'if (Object.hasOwn(Object.create(null), key)) {}',
          options: [{ preferred: 'hasOwnProperty' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'Object.hasOwn',
                preferred: 'hasOwnProperty',
                disagreement: 'method dispatch on the object',
              },
            },
          ],
        },
      ],
    },
  );

  ruleTester.run(
    'the argument-list boundary names the argument list',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'a surplus argument that would be dropped is named as an argument-list disagreement',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key, sideEffect())) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'Object.prototype.hasOwnProperty.call',
                preferred: 'Object.hasOwn',
                disagreement: 'the argument list',
              },
            },
          ],
        },
        {
          name: 'a sequence-expression argument whose commas would be promoted to separators is too',
          code: 'if (Object.prototype.hasOwnProperty.call((0, mod.argv), key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'Object.prototype.hasOwnProperty.call',
                preferred: 'Object.hasOwn',
                disagreement: 'the argument list',
              },
            },
          ],
        },
      ],
    },
  );

  ruleTester.run(
    'a site with no semantic boundary keeps the ordinary instruction',
    consistentExistenceIndexCheck,
    {
      valid: [],
      invalid: [
        {
          name: 'the one safe conversion still says to use the preferred form',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
          options: [{ preferred: 'Object.hasOwn' as const }],
          output: 'if (Object.hasOwn(obj, key)) {}',
          errors: [{ messageId: 'consistentExistenceCheck' as const }],
        },
        {
          // The split is driven by the three SEMANTIC boundaries, never by
          // `preferred !== 'Object.hasOwn'` — that arm of the fix gate means only
          // "no fixer written for this target". Here the boundary is real (the
          // prototype chain), so the message names the chain rather than the
          // missing fixer.
          name: '`in` preferred on a long-hand own-property check names the prototype chain, not the missing fixer',
          code: 'if (Object.prototype.hasOwnProperty.call(obj, key)) {}',
          options: [{ preferred: 'in' as const }],
          output: null,
          errors: [
            {
              messageId: 'nonEquivalentExistenceCheck' as const,
              data: {
                current: 'Object.prototype.hasOwnProperty.call',
                preferred: 'in',
                disagreement: 'an inherited key',
              },
            },
          ],
        },
      ],
    },
  );
});
