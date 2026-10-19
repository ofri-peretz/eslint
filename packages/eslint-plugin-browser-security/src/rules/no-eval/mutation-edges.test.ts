/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * The node-security partition (`deferDynamicPayloads`) may only yield a site
 * node-security can see: a bare `eval(…)` / `Function(…)`. These pin the
 * shapes it must keep, and the option that exempts only the constructor.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noEval } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const defer = [{ deferDynamicPayloads: true }];
const reported = [{ messageId: 'dangerousEval' as const }];

ruleTester.run('no-eval — mutation edges', noEval, {
  valid: [
    {
      name: 'allowFunctionConstructor exempts a dynamic Function body',
      code: "const fn = new Function('a', body);",
      options: [{ allowFunctionConstructor: true }],
    },
  ],
  invalid: [
    {
      name: 'allowFunctionConstructor does not exempt eval',
      code: 'eval(code);',
      options: [{ allowFunctionConstructor: true }],
      errors: reported,
    },
    {
      name: 'execScript is not deferred: node-security cannot see it',
      code: 'execScript(code);',
      options: defer,
      errors: reported,
    },
    {
      name: 'an indirect eval is not deferred: node-security cannot see it',
      code: 'window.eval(code);',
      options: defer,
      errors: reported,
    },
    {
      name: 'one attributable argument among several keeps the Function body ours',
      code: "const w = new Worker('w.js');\nw.onmessage = (event) => { new Function('a', event.data); };",
      options: defer,
      errors: reported,
    },
  ],
});
