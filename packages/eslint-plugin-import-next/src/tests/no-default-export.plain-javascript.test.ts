/**
 * `no-default-export` on plain JavaScript, where a class has no `decorators`.
 *
 * The anonymous-class autofix read `declaration.decorators.length` to skip a
 * decorated class. espree (ESLint's default parser) does not give a
 * ClassDeclaration a `decorators` field, so `export default class {}` threw
 * "Cannot read properties of undefined (reading 'length')" from inside the
 * rule, on the first lint of any plain-JavaScript file containing it. It is
 * one of eslint-plugin-import's own test cases (`export default class {};`),
 * which is how the crash was found, re-running the drop-in suite on 4.1.4.
 */
import { RuleTester as ESLintRuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noDefaultExport } from '../rules/no-default-export';

ESLintRuleTester.describe = describe;
ESLintRuleTester.it = it;

describe('no-default-export — plain JavaScript, no decorators field', () => {
  // ESLint's own RuleTester: `@typescript-eslint/rule-tester` installs the TS
  // parser, which always sets `decorators`, so it cannot reach this.
  const jsRuleTester = new ESLintRuleTester({
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  });

  jsRuleTester.run('espree', noDefaultExport as never, {
    valid: ['export const a = 1;'],
    invalid: [
      {
        code: 'export default class {};',
        output: 'export class DefaultClass {};',
        errors: [{ messageId: 'defaultExport' }],
      },
      {
        code: 'export default class extends Base {}',
        output: 'export class DefaultClass extends Base {}',
        errors: [{ messageId: 'defaultExport' }],
      },
    ],
  });
});
