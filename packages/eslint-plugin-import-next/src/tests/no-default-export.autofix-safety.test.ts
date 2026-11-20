/**
 * `no-default-export` writes valid code or nothing.
 *
 * Reported in ofri-peretz/eslint#1540. Every `export default` that was not an
 * identifier or one of six expression kinds fell into a branch that replaced
 * `export default` with `export`. That is right for a NAMED function, class or
 * interface and wrong for everything else: `export function () {}`,
 * `export { port: 3000 } satisfies T` and ``export `hello` `` were written to
 * disk and failed to parse on the next pass. The expression branch also named
 * its binding `defaultExport` without looking, so a module that already had
 * one got a second declaration.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noDefaultExport } from '../rules/no-default-export';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const errors = [{ messageId: 'defaultExport' as const }];

ruleTester.run('no-default-export autofix safety', noDefaultExport, {
  valid: [],
  invalid: [
    // --- anonymous declarations: given a name where they stand -------------
    {
      name: 'anonymous function declaration (issue #1540, case 1)',
      code: 'export default function () {\n  return 1;\n}',
      output: 'export function defaultFunction () {\n  return 1;\n}',
      errors,
    },
    {
      name: 'anonymous generator declaration',
      code: 'export default function* () {}',
      output: 'export function* defaultFunction () {}',
      errors,
    },
    {
      name: 'anonymous async function declaration',
      code: 'export default async function () {}',
      output: 'export async function defaultFunction () {}',
      errors,
    },
    {
      name: 'anonymous generic function declaration',
      code: 'export default function <T>(x: T) { return x; }',
      output: 'export function defaultFunction <T>(x: T) { return x; }',
      errors,
    },
    {
      name: 'anonymous class declaration (issue #1540, case 2)',
      code: 'export default class {\n  x = 1;\n}',
      output: 'export class DefaultClass {\n  x = 1;\n}',
      errors,
    },
    {
      name: 'anonymous class with a heritage clause',
      code: 'export default class extends Base {}',
      output: 'export class DefaultClass extends Base {}',
      errors,
    },
    {
      name: 'anonymous abstract class',
      code: 'export default abstract class {}',
      output: 'export abstract class DefaultClass {}',
      errors,
    },
    {
      name: 'the generated name steps aside for a declaration in scope',
      code: 'const defaultFunction = 1;\nexport default function () {}',
      output:
        'const defaultFunction = 1;\nexport function defaultFunction2 () {}',
      errors,
    },
    {
      name: 'the generated name steps aside for a global the file reads',
      code: 'use(DefaultClass);\nexport default class {}',
      output: 'use(DefaultClass);\nexport class DefaultClass2 {}',
      errors,
    },
    {
      name: 'the generated name steps aside for a name the module exports',
      code: 'const a = 1;\nexport { a as defaultFunction };\nexport default function () {}',
      output:
        'const a = 1;\nexport { a as defaultFunction };\nexport function defaultFunction2 () {}',
      errors,
    },
    {
      name: 'a decorated anonymous class has no safe rewrite: reported only',
      code: 'export default @dec class {}',
      output: null,
      errors,
    },
    {
      name: 'a function overload signature has no safe rewrite: reported only',
      code: 'export default function (): void;',
      output: null,
      errors,
    },
    // --- expressions outside the old six ------------------------------------
    {
      name: 'satisfies expression (issue #1540, case 3)',
      code: 'export default { port: 3000 } satisfies { port: number };',
      output:
        'const defaultExport = { port: 3000 } satisfies { port: number };\nexport { defaultExport };',
      errors,
    },
    {
      name: 'as expression',
      code: 'export default { port: 3000 } as Config;',
      output:
        'const defaultExport = { port: 3000 } as Config;\nexport { defaultExport };',
      errors,
    },
    {
      name: 'template literal (issue #1540, case 4)',
      code: 'export default `hello`;',
      output: 'const defaultExport = `hello`;\nexport { defaultExport };',
      errors,
    },
    {
      name: 'conditional expression',
      code: 'export default flag ? a : b;',
      output: 'const defaultExport = flag ? a : b;\nexport { defaultExport };',
      errors,
    },
    {
      name: 'a parenthesised sequence keeps its parentheses',
      code: 'export default (a, b);',
      output: 'const defaultExport = (a, b);\nexport { defaultExport };',
      errors,
    },
    {
      name: 'a parenthesised function expression',
      code: 'export default (function () {});',
      output:
        'const defaultExport = (function () {});\nexport { defaultExport };',
      errors,
    },
    {
      name: 'a class expression',
      code: 'export default (class {});',
      output: 'const defaultExport = (class {});\nexport { defaultExport };',
      errors,
    },
    {
      name: 'an expression with no semicolon',
      code: 'export default a + b',
      output: 'const defaultExport = a + b;\nexport { defaultExport };',
      errors,
    },
    {
      name: 'an expression keeps an interior comment',
      code: 'export default /* why */ a || b;',
      output:
        'const defaultExport = /* why */ a || b;\nexport { defaultExport };',
      errors,
    },
    {
      name: 'the old six: object',
      code: 'export default { a: 1 };',
      output: 'const defaultExport = { a: 1 };\nexport { defaultExport };',
      errors,
    },
    // --- name collision (issue #1540, case 5) -------------------------------
    {
      name: 'an existing defaultExport binding is not redeclared',
      code: 'const defaultExport = 1;\nexport default 2;',
      output:
        'const defaultExport = 1;\nconst defaultExport2 = 2;\nexport { defaultExport2 };',
      errors,
    },
    {
      name: 'a defaultExport and defaultExport2 are both taken',
      code: 'const defaultExport = 1;\nlet defaultExport2;\nexport default 2;',
      output:
        'const defaultExport = 1;\nlet defaultExport2;\nconst defaultExport3 = 2;\nexport { defaultExport3 };',
      errors,
    },
    {
      name: 'a defaultExport the code only reads (a global) is not captured',
      code: 'console.log(defaultExport);\nexport default 2;',
      output:
        'console.log(defaultExport);\nconst defaultExport2 = 2;\nexport { defaultExport2 };',
      errors,
    },
    {
      name: 'a type named defaultExport is a binding too',
      code: 'type defaultExport = string;\nexport default 2;',
      output:
        'type defaultExport = string;\nconst defaultExport2 = 2;\nexport { defaultExport2 };',
      errors,
    },
    {
      name: 'a published name is taken even with no binding behind it',
      code: 'export { a as defaultExport } from "m";\nexport * as defaultExport2 from "n";\nexport default 2;',
      output:
        'export { a as defaultExport } from "m";\nexport * as defaultExport2 from "n";\nconst defaultExport3 = 2;\nexport { defaultExport3 };',
      errors,
    },
    {
      name: 'a string-named export is read as its name',
      code: 'export { a as "defaultExport" } from "m";\nexport default 2;',
      output:
        'export { a as "defaultExport" } from "m";\nconst defaultExport2 = 2;\nexport { defaultExport2 };',
      errors,
    },
    {
      name: 'a nested binding does not make the name taken',
      code: 'function f() { const defaultExport = 1; return defaultExport; }\nexport default 2;',
      output:
        'function f() { const defaultExport = 1; return defaultExport; }\nconst defaultExport = 2;\nexport { defaultExport };',
      errors,
    },
    // --- shapes that were right and stay right -------------------------------
    {
      name: 'identifier',
      code: 'const x = 1; export default x;',
      output: 'const x = 1; export { x };',
      errors,
    },
    {
      name: 'an identifier the module already exports by name: reported only',
      code: 'export const x = 1;\nexport default x;',
      output: null,
      errors,
    },
    {
      name: 'a named function the module already publishes under that name: reported only',
      code: 'const a = 1;\nexport { a as foo };\nexport default function foo() {}',
      output: null,
      errors,
    },
    {
      name: 'a named function',
      code: 'export default function foo() {}',
      output: 'export function foo() {}',
      errors,
    },
    {
      name: 'a named class',
      code: 'export default class Foo {}',
      output: 'export class Foo {}',
      errors,
    },
    {
      name: 'an interface',
      code: 'export default interface Foo {}',
      output: 'export interface Foo {}',
      errors,
    },
    {
      name: 'a comment between export default and the declaration survives',
      code: 'export default /* the loader */ function load() {}',
      output: 'export /* the loader */ function load() {}',
      errors,
    },
    {
      name: 'a named export declared via export all is also taken',
      code: 'export * as ns from "m";\nexport default ns;',
      output: null,
      errors,
    },
  ],
});
