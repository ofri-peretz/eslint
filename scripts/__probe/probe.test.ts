import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { consistentFunctionScoping } from '../../packages/eslint-plugin-maintainability/src/rules/maintainability/consistent-function-scoping';
RuleTester.afterAll = afterAll; RuleTester.it = it; RuleTester.itOnly = it.only; RuleTester.describe = suite;
const rt = new RuleTester({ languageOptions: { parser, parserOptions: { ecmaVersion: 2022, sourceType: 'module' } } });
suite('probe', () => {
  rt.run('probe', consistentFunctionScoping, {
    valid: [
      { name: 'A arrow const + call', code: 'function outer() { const helper = () => 42; return helper(); }' },
      { name: 'B arrow const no call', code: 'function outer() { const helper = () => 42; }' },
      { name: 'C arrow block body', code: 'function outer() { const helper = () => { return 42; }; return helper(); }' },
      { name: 'D fn expr const', code: 'function outer() { const helper = function () { return 42; }; return helper(); }' },
      { name: 'E decl (control, should FAIL as valid)', code: 'function outer() { function helper() { return 42; } return helper(); }' },
    ],
    invalid: [],
  });
});
