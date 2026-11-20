/**
 * The `remove` autofix must not change what the program does.
 *
 * Reported in ofri-peretz/eslint#1541. With the default `remove` strategy:
 *
 * - `console.log(i++)` was deleted whole, so the `i++` went with it and the
 *   program printed 0 where it printed 1.
 * - In semicolon-free code the `;` that guards the next line (`;[1].forEach`,
 *   `;(function () {})()`) parses as the terminator of the `console.log`
 *   statement, so removing the statement removed the guard and joined the two
 *   neighbouring lines: `console.info(0)[1].forEach(...)`.
 *
 * Arguments that may have side effects get a suggestion instead of a fix, and
 * a guard `;` is kept.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noConsoleLog } from '../../rules/operability/no-console-log';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const REMOVE = 'suggestRemoveDiscardingArguments' as const;

/** A report with no fix, whose only way out is the opt-in suggestion. */
const suggestOnly = (code: string, removed: string) => ({
  code,
  output: null,
  errors: [
    {
      messageId: 'consoleLogFound' as const,
      suggestions: [{ messageId: REMOVE, output: removed }],
    },
  ],
});

describe('no-console-log autofix safety', () => {
  ruleTester.run('arguments with side effects', noConsoleLog, {
    valid: [],
    invalid: [
      {
        ...suggestOnly('let i = 0;\nconsole.log(i++);\n', 'let i = 0;\n\n'),
        name: 'an update expression (issue #1541)',
      },
      {
        ...suggestOnly('console.log(save(x));', ''),
        name: 'a call',
      },
      {
        ...suggestOnly('console.log(new Foo());', ''),
        name: 'new',
      },
      {
        ...suggestOnly('let a;\nconsole.log((a = 1));', 'let a;\n'),
        name: 'an assignment',
      },
      {
        ...suggestOnly(
          'async function f() { console.log(await g()); }',
          'async function f() {  }',
        ),
        name: 'await',
      },
      {
        ...suggestOnly(
          'function* f() { console.log(yield 1); }',
          'function* f() {  }',
        ),
        name: 'yield',
      },
      {
        ...suggestOnly('console.log(`a${f()}`);', ''),
        name: 'a call inside a template literal',
      },
      {
        ...suggestOnly('console.log(a ? b : f());', ''),
        name: 'a call in a conditional branch',
      },
      {
        ...suggestOnly('console.log(a && f());', ''),
        name: 'a call in a logical operand',
      },
      {
        ...suggestOnly('console.log(-f());', ''),
        name: 'a call under a unary operator',
      },
      {
        ...suggestOnly('console.log(delete o.k);', ''),
        name: 'delete',
      },
      {
        ...suggestOnly('console.log({ k: f() });', ''),
        name: 'a call in an object property',
      },
      {
        ...suggestOnly('console.log({ [f()]: 1 });', ''),
        name: 'a call in a computed key',
      },
      {
        ...suggestOnly('console.log({ ...o });', ''),
        name: 'object spread, which can run a getter',
      },
      {
        ...suggestOnly('console.log([...it]);', ''),
        name: 'array spread, which runs an iterator',
      },
      {
        ...suggestOnly('console.log(o[f()]);', ''),
        name: 'a call in a computed member',
      },
      {
        ...suggestOnly('console.log(f()!);', ''),
        name: 'a call under a non-null assertion',
      },
      {
        ...suggestOnly('console.log(tag`x`);', ''),
        name: 'a tagged template',
      },
      {
        ...suggestOnly('console.log(o?.m());', ''),
        name: 'an optional call',
      },
      {
        ...suggestOnly('console.log(a, f());', ''),
        name: 'one impure argument among pure ones',
      },
      {
        ...suggestOnly('console.log(function () { return f(); }());', ''),
        name: 'an immediately invoked function',
      },
      {
        ...suggestOnly('console.log(`${a}${f()}`);', ''),
        name: 'a template literal with a later impure expression',
      },
    ],
  });

  ruleTester.run('side-effect-free arguments keep the fix', noConsoleLog, {
    valid: [],
    invalid: [
      {
        name: 'literals and identifiers',
        code: 'console.log("a", 1, x);',
        output: '',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'property reads, templates, operators, wrappers, containers, functions',
        code: 'console.log(a.b, a["c"], o?.p, `v=${x}`, !x, typeof x, a + b, a ? b : c, a && b, x as T, x!, [a, b], { k: v, [c]: 1, m() {} }, () => f(), function () { f(); });',
        output: '',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'an array with a hole',
        code: 'console.log([, 1]);',
        output: '',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'no arguments',
        code: 'console.log();',
        output: '',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'this and a property of this',
        code: 'class C { m() { console.log(this, this.x); } }',
        output: 'class C { m() {  } }',
        errors: [{ messageId: 'consoleLogFound' }],
      },
    ],
  });

  ruleTester.run('a guard semicolon survives the removal', noConsoleLog, {
    valid: [],
    invalid: [
      {
        name: 'a leading ; before an array literal (issue #1541, asi.js)',
        code: 'console.info(0)\nconsole.log(1)\n;[1].forEach(x => console.info(x))',
        output: 'console.info(0)\n\n;[1].forEach(x => console.info(x))',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'a leading ; before an IIFE (issue #1541, asi-iife.js)',
        code: 'const v = 1\nconsole.log(v)\n;(function () { console.info("iife") })()',
        output: 'const v = 1\n\n;(function () { console.info("iife") })()',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'a leading ; before a template literal',
        code: 'const v = 1\nconsole.log(v)\n;`x`.length',
        output: 'const v = 1\n\n;`x`.length',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'a same-line terminator goes with the statement',
        code: 'console.log(1);\nfoo();',
        output: '\nfoo();',
        errors: [{ messageId: 'consoleLogFound' }],
      },
      {
        name: 'a guard ; with the comment strategy is not commented out',
        code: 'console.info(0)\nconsole.log(1)\n;[1].forEach(x => x)',
        output: 'console.info(0)\n// console.log(1)\n;[1].forEach(x => x)',
        options: [{ strategy: 'comment' }],
        errors: [{ messageId: 'consoleLogFound' }],
      },
    ],
  });
});
