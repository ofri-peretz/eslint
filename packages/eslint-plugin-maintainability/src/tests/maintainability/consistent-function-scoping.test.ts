/**
 * Tests for consistent-function-scoping rule
 * Move function definitions to the highest possible scope
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentFunctionScoping } from '../../rules/maintainability/consistent-function-scoping';

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

describe('consistent-function-scoping', () => {
  describe('valid cases', () => {
    ruleTester.run(
      'allow properly scoped functions',
      consistentFunctionScoping,
      {
        valid: [
          /*
           * A destructured binding is still a binding. The scope tracker recorded
           * only `decl.id.type === 'Identifier'`, so every ObjectPattern and
           * ArrayPattern was invisible and a nested function that captured one
           * looked as though it captured nothing. The message then asserted
           * "doesn't capture outer variables" about code where ESLint's own scope
           * manager resolves the reference to the enclosing function, and the
           * suggested move does not compile (TS2304: Cannot find name 'out').
           *
           * burgee packages/burgee/src/commander/command.ts:1753
           */
          {
            name: 'a nested arrow capturing a destructured const',
            code: `
            function prepare(opts) {
              const { out } = opts;
              const sink = {};
              if (out) sink.write = (s) => out.write(s);
              return sink;
            }
          `,
          },
          {
            name: 'a nested arrow capturing an array-destructured const',
            code: `
            function prepare(pair) {
              const [first] = pair;
              return () => first;
            }
          `,
          },
          {
            name: 'a nested arrow capturing past a hole in an array pattern',
            code: `
            function prepare(pair) {
              const [, second] = pair;
              return () => second;
            }
          `,
          },
          {
            name: 'a nested arrow capturing a destructured parameter',
            code: `
            function prepare({ out }) {
              return (s) => out.write(s);
            }
          `,
          },
          {
            name: 'a nested arrow capturing a parameter with a default',
            code: `
            function prepare(prefix = '> ') {
              return (s) => prefix + s;
            }
          `,
          },
          {
            name: 'a nested arrow capturing a rest parameter',
            code: `
            function prepare(...args) {
              return () => args.length;
            }
          `,
          },
          {
            name: 'a nested arrow capturing a destructured rest binding',
            code: `
            function prepare(opts) {
              const { first, ...rest } = opts;
              void first;
              return () => rest;
            }
          `,
          },
          {
            name: 'a nested arrow capturing a constructor parameter property',
            code: `
            class C {
              handler;
              constructor(private prefix: string) {
                this.handler = (s) => prefix + s;
              }
            }
          `,
          },
          /*
           * An arrow captures `this` lexically. Moving it to module scope makes
           * `this` undefined — TS2532 under --strict, a TypeError at runtime.
           * The rule already exempts MethodDefinition/PropertyDefinition with the
           * comment "bound to the instance and cannot be moved to module scope",
           * but that exemption never reached an arrow nested INSIDE a method.
           *
           * burgee packages/burgee/src/commander/command.ts:1509
           */
          {
            name: 'an arrow inside a method that captures this',
            code: `
            class C {
              setChoices(values) {
                this.choices = values;
                this.parseArg = (arg) => {
                  if (!this.choices.includes(arg)) throw new Error('bad');
                  return arg;
                };
              }
            }
          `,
          },
          // Module-level function (already at top scope)
          {
            name: 'the same helper at module scope',
            code: `
            function helper() {
              return 'value';
            }
          `,
          },
          // Module-level arrow function
          {
            name: 'an arrow bound at module scope has nowhere higher to go',
            code: `
            const helper = () => 'value';
          `,
          },
          // Function that captures outer variable
          {
            code: `
            function outer() {
              const message = 'hello';
              function inner() {
                return message;
              }
              return inner();
            }
          `,
          },
          // Arrow function capturing outer variable
          {
            code: `
            function outer() {
              const count = 0;
              const increment = () => count + 1;
              return increment();
            }
          `,
          },
          // Exported function
          {
            code: `
            export function helper() {
              return 'value';
            }
          `,
          },
          // Export default function
          {
            code: `
            export default function helper() {
              return 'value';
            }
          `,
          },
          // Arrow function that doesn't capture but checkArrowFunctions is false
          {
            code: `
            function outer() {
              const helper = () => 'value';
              return helper();
            }
          `,
            options: [{ checkArrowFunctions: false }],
          },
          // Class method — bound to instance, cannot be hoisted to module scope.
          {
            code: `
            class Foo {
              bar() {
                return 'value';
              }
            }
          `,
          },
          // Class field arrow initializer — bound to instance.
          {
            code: `
            class Foo {
              bar = () => 'value';
            }
          `,
          },
          // Array.prototype.map callback — inline by design.
          {
            code: `
            function outer(arr) {
              return arr.map(x => x + 1);
            }
          `,
          },
          // Array.prototype.reduce callback.
          {
            code: `
            function outer(arr) {
              return arr.reduce((a, b) => a + b, 0);
            }
          `,
          },
          // Array.prototype.forEach callback.
          {
            code: `
            function outer(arr) {
              arr.forEach(x => log(x));
            }
          `,
          },
          // Array.prototype.sort comparator.
          {
            code: `
            function outer(arr) {
              return arr.sort((a, b) => a - b);
            }
          `,
          },
          // Array.prototype.flatMap callback.
          {
            code: `
            function outer(arr) {
              return arr.flatMap(x => [x, x]);
            }
          `,
          },
          // Promise.then callback.
          {
            code: `
            function outer(p) {
              return p.then(x => x.value);
            }
          `,
          },
          // Promise.catch callback.
          {
            code: `
            function outer(p) {
              return p.catch(e => 'fallback');
            }
          `,
          },
          // Event-emitter .on handler.
          {
            code: `
            function outer(emitter) {
              emitter.on('event', x => handle(x));
            }
          `,
          },
          // addEventListener callback.
          {
            code: `
            function outer(el) {
              el.addEventListener('click', e => onClick(e));
            }
          `,
          },
          // setTimeout callback.
          {
            code: `
            function outer() {
              setTimeout(() => doSomething(), 100);
            }
          `,
          },
          // requestAnimationFrame callback.
          {
            code: `
            function outer() {
              requestAnimationFrame(() => frame());
            }
          `,
          },
          // Promise constructor executor — must stay inline.
          {
            code: `
            function outer() {
              return new Promise((resolve, reject) => resolve(1));
            }
          `,
          },
        ],
        invalid: [
          {
            /*
             * A class body rebinds `this`, so the arrow around it does NOT capture
             * `this` lexically and remains movable — the walk must step over the
             * class rather than treat its `this` as the arrow's. A nested
             * `function` declaration is skipped for the same reason: its `this`
             * is dynamic, so hoisting it and calling it with `.call(this)` works.
             */
            name: 'an arrow whose only this belongs to a nested class still reports',
            code: `
            function outer() {
              const helper = () => {
                class Inner {
                  value = this;
                }
                return Inner;
              };
              return helper();
            }
          `,
            errors: [
              {
                messageId: 'inconsistentFunctionScoping',
                suggestions: [
                  {
                    messageId: 'moveToModuleScope',
                    output: `
            function outer() {
              const helper = // TODO: Move this function to module scope - it doesn't capture outer variables
() => {
                class Inner {
                  value = this;
                }
                return Inner;
              };
              return helper();
            }
          `,
                  },
                ],
              },
            ],
          },
          // Function that doesn't capture outer variables
          {
            name: 'an inner function that closes over nothing from its parent',
            code: `
            function outer() {
              function helper() {
                return 'value';
              }
              return helper();
            }
          `,
            errors: [
              {
                messageId: 'inconsistentFunctionScoping',
                suggestions: [
                  {
                    messageId: 'moveToModuleScope',
                    output: `
            function outer() {
              // TODO: Move this function to module scope - it doesn't capture outer variables
function helper() {
                return 'value';
              }
              return helper();
            }
          `,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });

  /**
   * Burgee's `help.test.ts` wrote `const noExit = (() => undefined) as unknown
   * as (code: number) => never;` at module scope and the rule told it to move
   * the arrow to module scope. The walk from the function to `Program` stepped
   * over `VariableDeclarator` and `VariableDeclaration` only, so a type
   * assertion between the arrow and its binding — `as`, `satisfies`, `!`,
   * `<T>` — hid the fact that the arrow was already at the top. A type
   * operator changes what TypeScript believes about a value and nothing about
   * where it lives. The consumer's other shape, `defineCommand({ run: () =>
   * 'ok' })`, is the `Property` exemption already on main; it is pinned here
   * because 3.0.3, the version the consumer ran, reported it.
   * See docs/intents/burgee-false-positives/.
   */
  describe('a type assertion does not move a function off module scope (burgee)', () => {
    ruleTester.run(
      'asserted module-scope functions',
      consistentFunctionScoping,
      {
        valid: [
          {
            name: 'FP: a module-scope arrow cast through `as unknown as T`',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: `const noExit = (() => undefined) as unknown as (code: number) => never;`,
          },
          {
            name: 'FP: the same cast on an exported binding',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: `export const noExit = (() => undefined) as unknown as (code: number) => never;`,
          },
          {
            name: 'a module-scope arrow checked with `satisfies`',
            code: `const ok = (() => 'ok') satisfies () => string;`,
          },
          {
            name: 'a module-scope arrow behind a non-null assertion',
            code: `const ok = (() => 'ok')!;`,
          },
          {
            name: 'a module-scope arrow in the angle-bracket assertion spelling',
            code: `const ok = <() => string>(() => 'ok');`,
          },
          {
            name: 'a module-scope function EXPRESSION cast the same way',
            code: `const ok = (function () { return 'ok'; }) as unknown as () => string;`,
          },
          {
            name: 'FP: a trivial callback written inline as a property of an argument object, inside a test body (3.0.3 reported it)',
            // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
            code: `it('lists commands', () => { const program = defineProgram({ commands: [defineCommand({ name: 'status', run: () => 'ok' })] }); expect(program).toBeDefined(); });`,
          },
        ],
        invalid: [
          {
            name: 'the same cast INSIDE a function still reports — the assertion is not what makes it movable',
            code: `function outer() { const f = (() => 'ok') as unknown as () => string; return f(); }`,
            errors: [
              {
                messageId: 'inconsistentFunctionScoping',
                suggestions: [
                  {
                    messageId: 'moveToModuleScope',
                    output: `function outer() { const f = (// TODO: Move this function to module scope - it doesn't capture outer variables\n() => 'ok') as unknown as () => string; return f(); }`,
                  },
                ],
              },
            ],
          },
          {
            name: 'a satisfies-checked arrow inside a function reports too',
            code: `function outer() { const f = (() => 'ok') satisfies () => string; return f(); }`,
            errors: [
              {
                messageId: 'inconsistentFunctionScoping',
                suggestions: [
                  {
                    messageId: 'moveToModuleScope',
                    output: `function outer() { const f = (// TODO: Move this function to module scope - it doesn't capture outer variables\n() => 'ok') satisfies () => string; return f(); }`,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });
});
