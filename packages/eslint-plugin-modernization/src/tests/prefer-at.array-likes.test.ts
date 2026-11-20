/**
 * `prefer-at` must not autofix a receiver that may have no `.at()`.
 *
 * Reported in ofri-peretz/eslint#1541: `items[items.length - 1]` on a NodeList
 * or HTMLCollection was rewritten to `items.at(-1)`, which type-checks nowhere
 * and throws `TypeError: items.at is not a function` in a browser, even with
 * full TypeScript type information.
 *
 * With type information the fix is attached only when the receiver's type
 * declares `at`. Without it, only receivers whose array/string-ness is visible
 * in the source (an array literal, an `Array.from`, an annotation) are fixed;
 * everything else is reported and left to the reader.
 *
 * The typed half runs on ESLint only: oxlint has no parser services.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { preferAt } from '../rules/prefer-at';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
// The first typed case builds a TypeScript program; give it room under load.
RuleTester.it = (text, callback) => it(text, callback, 120_000);

const typed = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      tsconfigRootDir: path.resolve(__dirname, 'fixtures/prefer-at-typed'),
      project: './tsconfig.json',
    },
  },
});

const filename = 'typed.ts';

typed.run('prefer-at with type information', preferAt, {
  valid: [],
  invalid: [
    {
      name: 'NodeList (issue #1541): reported, not rewritten',
      filename,
      code: `const items = document.querySelectorAll('li');\nexport const last = items[items.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'HTMLCollection (issue #1541): reported, not rewritten',
      filename,
      code: `export function f(el: HTMLElement) { return el.children[el.children.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a nullable HTMLCollection stays unfixed',
      filename,
      code: `export function f(c: HTMLCollection | null) { return c![c!.length - 2]; }`,
      output: null,
      errors: [{ messageId: 'preferAtMethod' }],
    },
    {
      name: 'a user array-like with only length and an index signature',
      filename,
      code: `export function f(x: { length: number; [i: number]: string }) { return x[x.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a union of Array and NodeList is unfixed: one member lacks at',
      filename,
      code: `export function f(x: string[] | NodeListOf<Element>) { return x[x.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'any is unknown, so no fix',
      filename,
      code: `export function f(x: any) { return x[x.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an array type is fixed',
      filename,
      code: `export function f(x: number[]) { return x[x.length - 1]; }`,
      output: `export function f(x: number[]) { return x.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a readonly tuple is fixed',
      filename,
      code: `export function f(x: readonly [1, 2, 3]) { return x[x.length - 1]; }`,
      output: `export function f(x: readonly [1, 2, 3]) { return x.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a typed array is fixed',
      filename,
      code: `export function f(x: Uint8Array) { return x[x.length - 1]; }`,
      output: `export function f(x: Uint8Array) { return x.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a string is fixed',
      filename,
      code: `export function f(x: string) { return x[x.length - 2]; }`,
      output: `export function f(x: string) { return x.at(-2); }`,
      errors: [{ messageId: 'preferAtMethod' }],
    },
    {
      name: 'a constrained type parameter is fixed through its constraint',
      filename,
      code: `export function f<T extends number[]>(x: T) { return x[x.length - 1]; }`,
      output: `export function f<T extends number[]>(x: T) { return x.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a string-subscript receiver keeps its spelling in the fix',
      filename,
      code: `export function f(c: { path: string[] }) { return c["path"][c.path["length"] - 1]; }`,
      output: `export function f(c: { path: string[] }) { return c["path"].at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a private-field receiver is fixed when typed as an array',
      filename,
      code: `export class F { #rows: string[] = []; m() { return this.#rows[this.#rows.length - 1]; } }`,
      output: `export class F { #rows: string[] = []; m() { return this.#rows.at(-1); } }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a non-null asserted element keeps its assertion',
      filename,
      code: `export function f(o: { fns: Array<() => void> }) { return o.fns[o.fns.length - 1]!; }`,
      output: `export function f(o: { fns: Array<() => void> }) { return o.fns.at(-1)!; }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a non-optional access inside an optional chain is reported only: its type includes undefined',
      filename,
      code: `export function f(o?: { list: number[] }) { return o?.list[o.list.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a class property typed as an array is fixed',
      filename,
      code: `export class C { rows: string[] = []; last() { return this.rows[this.rows.length - 1]; } }`,
      output: `export class C { rows: string[] = []; last() { return this.rows.at(-1); } }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
  ],
});

const untyped = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

untyped.run('prefer-at without type information', preferAt, {
  valid: [],
  invalid: [
    {
      name: 'an unknown identifier is reported only',
      code: `const last = items[items.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a DOM query result is reported only',
      code: `const items = document.querySelectorAll('li');\nconst last = items[items.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'el.children is reported only',
      code: `const kid = el.children[el.children.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a parameter with no annotation is reported only',
      code: `function f(xs) { return xs[xs.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an array literal binding that is later reassigned is reported only',
      code: `let xs = [1, 2];\nxs = document.querySelectorAll('li');\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a destructured binding is reported only',
      code: `const { xs } = obj;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an import is reported only',
      code: `import { xs } from './m';\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a variable declared twice is reported only',
      code: `var xs = [1];\nvar xs = document.querySelectorAll('li');\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a non-array-producing initialiser is reported only',
      code: `const xs = getItems();\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an array-ish annotation that is not an array is reported only',
      code: `declare const xs: NodeListOf<Element>;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a user generic named Array-like is reported only',
      code: `declare const xs: Foo<number>;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an array literal bound to a name that is shadowed by a parameter is reported only',
      code: `const xs = [1];\nfunction f(xs) { return xs[xs.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'this.rows with no type information is reported only',
      code: `class C { last() { return this.rows[this.rows.length - 1]; } }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a number annotation is reported only',
      code: `declare const xs: number;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an alias of another binding is reported only',
      code: `const xs = other;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a numeric literal initialiser is reported only',
      code: `const xs = 5;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a type-operator annotation that is not a readonly array is reported only',
      code: `declare const xs: keyof Foo;\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an array literal is fixed',
      code: `const xs = [1, 2, 3];\nconst last = xs[xs.length - 1];`,
      output: `const xs = [1, 2, 3];\nconst last = xs.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'Array.from is fixed',
      code: `const xs = Array.from(document.querySelectorAll('li'));\nconst last = xs[xs.length - 1];`,
      output: `const xs = Array.from(document.querySelectorAll('li'));\nconst last = xs.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a spread of a NodeList into an array literal is fixed',
      code: `const xs = [...document.querySelectorAll('li')];\nconst last = xs[xs.length - 1];`,
      output: `const xs = [...document.querySelectorAll('li')];\nconst last = xs.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'Array.of is fixed',
      code: `const xs = Array.of(1, 2);\nconst last = xs[xs.length - 1];`,
      output: `const xs = Array.of(1, 2);\nconst last = xs.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a local Array that shadows the global is reported only',
      code: `class Array {}\nconst xs = new Array();\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a method on a non-Array object named from is reported only',
      code: `const xs = Foo.from(x);\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an Array method other than from/of is reported only',
      code: `const xs = Array.isArray(x);\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a computed member callee is reported only',
      code: `const xs = Array[k](x);\nconst last = xs[xs.length - 1];`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'new Array is fixed',
      code: `const xs = new Array(3);\nconst last = xs[xs.length - 1];`,
      output: `const xs = new Array(3);\nconst last = xs.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a string literal is fixed',
      code: `const s = 'abc';\nconst last = s[s.length - 1];`,
      output: `const s = 'abc';\nconst last = s.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a T[] annotation is fixed',
      code: `function f(xs: number[]) { return xs[xs.length - 1]; }`,
      output: `function f(xs: number[]) { return xs.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a readonly T[] annotation is fixed',
      code: `function f(xs: readonly number[]) { return xs[xs.length - 1]; }`,
      output: `function f(xs: readonly number[]) { return xs.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an Array<T> annotation is fixed',
      code: `function f(xs: Array<number>) { return xs[xs.length - 1]; }`,
      output: `function f(xs: Array<number>) { return xs.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a ReadonlyArray<T> annotation is fixed',
      code: `function f(xs: ReadonlyArray<number>) { return xs[xs.length - 1]; }`,
      output: `function f(xs: ReadonlyArray<number>) { return xs.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a string annotation is fixed',
      code: `function f(s: string) { return s[s.length - 1]; }`,
      output: `function f(s: string) { return s.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a tuple annotation is fixed',
      code: `function f(t: [number, number]) { return t[t.length - 1]; }`,
      output: `function f(t: [number, number]) { return t.at(-1); }`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a parameter whose DEFAULT is an array literal is reported only: the caller may pass a NodeList',
      code: `function f(xs = [1, 2]) { return xs[xs.length - 1]; }`,
      output: null,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'an annotated variable reassigned later is still fixed: the annotation holds',
      code: `let xs: number[] = [];\nxs = [1];\nconst last = xs[xs.length - 1];`,
      output: `let xs: number[] = [];\nxs = [1];\nconst last = xs.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'xs! on a known array is still fixed',
      code: `const xs = [1, 2];\nconst last = xs![xs!.length - 1];`,
      output: `const xs = [1, 2];\nconst last = xs!.at(-1);`,
      errors: [{ messageId: 'useAtForLastElement' }],
    },
    {
      name: 'a variable-array-literal receiver is fixed for a larger offset',
      code: `const xs = [1, 2, 3];\nconst second = xs[xs.length - 2];`,
      output: `const xs = [1, 2, 3];\nconst second = xs.at(-2);`,
      errors: [{ messageId: 'preferAtMethod' }],
    },
  ],
});
