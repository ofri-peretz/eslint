/**
 * Tests for prefer-at rule
 * Prefer .at() method over bracket notation for accessing elements from the end
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferAt } from '../rules/prefer-at';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('prefer-at', () => {
  describe('array.length - n pattern', () => {
    ruleTester.run('prefer .at() for last element', preferAt, {
      valid: [
        // Already using .at()
        { name: '.at(-1) already', code: 'const last = array.at(-1);' },
        { code: 'const second = array.at(-2);' },
        // Normal array access is fine
        { code: 'const first = array[0];' },
        { code: 'const item = array[index];' },
        // Length without subtraction
        { code: 'const len = array.length;' },
      ],
      invalid: [
        // array[array.length - 1] -> array.at(-1)
        {
          name: 'indexing the last element through .length',
          code: 'const last = array[array.length - 1];',
          output: 'const last = array.at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        // array[array.length - 2] -> array.at(-2)
        {
          code: 'const second = array[array.length - 2];',
          output: 'const second = array.at(-2);',
          errors: [{ messageId: 'preferAtMethod' }],
        },
        // Using in expression
        {
          code: 'return items[items.length - 1];',
          output: 'return items.at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
      ],
    });
  });

  describe('variable offset pattern', () => {
    ruleTester.run('prefer .at() for variable offset', preferAt, {
      valid: [],
      invalid: [
        // array[array.length - n] where n is a variable.
        //
        // This case previously asserted `output: 'const item = array.at(-offset);'`.
        // That assertion pinned the defect rather than the intent: the two
        // forms diverge at `offset === 0` (undefined vs. the FIRST element,
        // since -0 normalises to 0) and for any negative offset, and nothing
        // in scope proves offset is a positive integer. The report is right;
        // the rewrite was not safe to apply unattended.
        {
          name: 'a variable offset is reported but not rewritten — it is only equivalent for positive integers',
          code: 'const item = array[array.length - offset];',
          output: null,
          errors: [{ messageId: 'preferAtMethod' }],
        },
      ],
    });
  });

  describe('negative index pattern', () => {
    ruleTester.run('prefer .at() for negative index', preferAt, {
      valid: [
        // Already using .at()
        { code: 'const last = array.at(-1);' },
        // Non-computed access
        { code: 'const item = array.foo;' },
      ],
      invalid: [
        // These two cases previously asserted the rewrite to `.at(-n)`. That
        // assertion pinned the defect: on an array `array[-1]` is a plain
        // property read that is always undefined, while `array.at(-1)` is the
        // last element — so `--fix` turned dead code into live code. The rule
        // also cannot prove the object is an array, so on a Record holding a
        // '-1' key, or on `arguments`, the rewrite replaced working code with
        // a TypeError. Reported, not rewritten.
        {
          name: 'a negative literal index is reported but not rewritten — .at(-1) is not what arr[-1] means',
          code: 'const last = array[-1];',
          output: null,
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
        {
          name: 'the same holds for any negative literal index',
          code: 'const item = array[-3];',
          output: null,
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
      ],
    });
  });

  /**
   * The receiver does not have to be a bare identifier.
   *
   * `node.object.type !== 'Identifier'` sat above every detection branch, so
   * `c.path[c.path.length - 1]` and `this.rows[this.rows.length - 1]` — the
   * common shape in class-based and node-tree code — were invisible. burgee
   * has 11 such sites. The `.length` half of this very expression was already
   * generalised to read `o['length']`; the receiver half was left behind.
   *
   * Receivers are compared by source text, so the two halves still have to
   * name the same object. The FIXER is gated separately: it rewrites only a
   * receiver made of plain identifiers and dot access, because re-spelling a
   * receiver that contains a call would move that call.
   */
  describe('member-expression receivers', () => {
    ruleTester.run('receiver is not a bare identifier', preferAt, {
      valid: [
        {
          name: 'the receiver and the .length receiver must be the same object',
          code: 'const x = a.path[b.path.length - 1];',
        },
        {
          name: 'a computed receiver segment is not matched by text alone',
          code: 'const x = a[i].path[a[j].path.length - 1];',
        },
        {
          name: 'a call as the whole receiver is out of scope — it is a new value each time',
          code: 'const x = getArr()[getArr().length - 1];',
        },
        {
          // Narrowed from `invalid` while fixing the computed-key blind spot:
          // two calls need not return the same object, so the two halves
          // cannot be shown to name one receiver. Silence is the sound answer.
          name: 'a call inside the receiver cannot be proven to name one object',
          code: 'const last = get().rows[get().rows.length - 1];',
        },
        {
          // Same narrowing: `a[i]` and a later `a[i]` are the same element only
          // while `i` is unchanged, which nothing here proves.
          name: 'a computed segment in the receiver cannot be proven stable',
          code: 'const last = a[i].path[a[i].path.length - 1];',
        },
        {
          name: 'a private field and a public field of the same name are different receivers',
          code: 'class F { #rows = []; rows = []; m() { return this.#rows[this.rows.length - 1]; } }',
        },
      ],
      invalid: [
        {
          // The computed-key blind spot itself: the same object written two
          // ways must still match, so the receiver comparison canonicalises
          // through propertyName() rather than comparing source text.
          name: 'a string-subscript receiver matches its dotted twin',
          code: 'const last = c["path"][c.path["length"] - 1];',
          output: 'const last = c["path"].at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        {
          name: 'a dotted receiver is rewritten like a bare identifier',
          code: 'const last = c.path[c.path.length - 1];',
          output: 'const last = c.path.at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        {
          name: 'a this-rooted receiver is rewritten too',
          code: 'const last = this.rows[this.rows.length - 1];',
          output: 'const last = this.rows.at(-1);',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        // burgee packages/burgee/src/yargs/factory.ts:837 —
        // `this.#context.fullCommands[this.#context.fullCommands.length - 1]` went
        // unreported: propertyName() answers null for a PrivateIdentifier, so the
        // receiver never rendered to a path. A private field is the same read as
        // the public `this.rows` case above.
        {
          name: 'a private-field receiver is rewritten like a public one',
          code: 'class F { #rows = []; m() { return this.#rows[this.#rows.length - 1]; } }',
          output: 'class F { #rows = []; m() { return this.#rows.at(-1); } }',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        {
          name: 'a receiver path through a private field is rewritten',
          code: 'class F { #context = { fullCommands: [] }; m() { return this.#context.fullCommands[this.#context.fullCommands.length - 1]; } }',
          output:
            'class F { #context = { fullCommands: [] }; m() { return this.#context.fullCommands.at(-1); } }',
          errors: [{ messageId: 'useAtForLastElement' }],
        },
        {
          name: 'a dotted receiver with a variable offset is reported, not rewritten',
          code: 'const item = c.path[c.path.length - n];',
          output: null,
          errors: [{ messageId: 'preferAtMethod' }],
        },
        {
          name: 'a negative literal index on a dotted receiver is reported',
          code: 'const last = c.path[-1];',
          output: null,
          errors: [{ messageId: 'useAtForNegativeIndex' }],
        },
      ],
    });
  });
});
