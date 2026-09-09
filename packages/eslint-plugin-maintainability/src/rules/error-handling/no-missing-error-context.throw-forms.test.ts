/**
 * Three shapes of throw that carry their context and were reported anyway.
 *
 * 1. `throw Error(msg)` — `Error` called WITHOUT `new` returns the same object
 *    `new Error` does; the spec says so. The rule only looked at `NewExpression`,
 *    so yargs' own `throw Error('only .json config files are supported in ESM')`
 *    read as a throw with no message.
 * 2. `throw new Error(message ?? \`…\`)` — the argument is an expression, not a
 *    string literal or a template literal, and only those two were recognised.
 * 3. `throw new ActionRequired(spec)` — a custom error class carrying its context
 *    in the constructor. This was already accepted for names ENDING in "Error";
 *    a class named for what happened rather than for its base got nothing.
 *
 * What still reports is a throw with nothing in it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingErrorContext as rule } from './no-missing-error-context';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-missing-error-context — throw forms (maintainability)', () => {
  ruleTester.run('the ways a throw carries its context', rule, {
    valid: [
      {
        name: 'Error called without `new` — the same object, the same message',
        code: "throw Error('only .json config files are supported in ESM');",
      },
      {
        name: 'TypeError called without `new`',
        code: "throw TypeError('middleware must be a function');",
      },
      {
        name: 'a message built with ?? — the argument is an expression, not a literal',
        code: 'declare const message: string | undefined; throw new Error(message ?? `Expected values to be strictly equal`);',
      },
      {
        name: 'a custom error class whose name does not end in Error',
        code: 'declare const spec: unknown; throw new ActionRequired(spec);',
      },
      {
        name: 'an exit signal carrying its code',
        code: 'declare const code: number; throw new ExitSignal(code);',
      },
      {
        name: 'a rethrow of a caught error',
        code: 'try { work(); } catch (err) { throw err; }',
      },
    ],
    invalid: [
      {
        name: 'an Error with nothing in it',
        code: 'throw new Error();',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'Error() without `new` and without a message',
        code: 'throw Error();',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'an empty message',
        code: "throw new Error('');",
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'a bare variable handed to the base Error proves nothing about its type',
        code: 'declare const someVar: unknown; throw new Error(someVar);',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'a bare object',
        code: 'throw {};',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'a custom class with no arguments at all',
        code: 'throw new ActionRequired();',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
    ],
  });

  ruleTester.run('the shapes isProvablyString walks into', rule, {
    valid: [
      {
        name: 'a ternary whose arms are strings',
        code: "declare const wide: boolean; throw new Error(wide ? 'too wide' : 'too narrow');",
      },
      {
        name: 'a concatenation whose left side is a string',
        code: "declare const name: string; throw new Error('unknown option: ' + name);",
      },
      {
        name: 'a concatenation whose right side is a string',
        code: "declare const n: number; throw new Error(n + ' is out of range');",
      },
      {
        name: 'a logical-or fallback',
        code: 'declare const message: string; throw new Error(message || `no message`);',
      },
    ],
    invalid: [
      {
        name: 'neither side of the concatenation is visibly a string',
        code: 'declare const a: unknown; declare const b: unknown; throw new Error(1 + (a as number));',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'neither arm of the ternary is visibly a string',
        code: 'declare const wide: boolean; declare const a: unknown; declare const b: unknown; throw new Error(wide ? a : b);',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'a call is not visibly a string',
        code: 'declare function build(): unknown; throw new Error(build());',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
    ],
  });

  ruleTester.run('what the callable form and && actually prove', rule, {
    valid: [
      {
        name: 'a && whose RIGHT side is a string',
        code: "declare const ok: boolean; throw new Error(ok && 'operation refused');",
      },
    ],
    invalid: [
      {
        name: 'a && whose left side is a string proves nothing — the result is the right',
        code: 'declare const someVar: unknown; throw new Error("x" && (someVar as string));',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'an empty fallback leaves the message empty on the branch that needed it',
        code: "declare const value: unknown; throw new Error((value as string) ?? '');",
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'an ordinary function call is not an error construction',
        code: 'declare function fail(c: number): unknown; declare const code: number; throw fail(code);',
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
      {
        name: 'a translation helper is not an error construction either',
        code: "declare function t(k: string): string; throw t('errors.missing');",
        errors: [{ messageId: 'missingErrorContext' as const }],
      },
    ],
  });
});
