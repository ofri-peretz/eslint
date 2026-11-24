/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Guards the oxmutate run found unpinned: each case is an input on which the
 * rule as written and one surviving mutant of it disagree.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectEvalWithExpression } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const VM = [{ messageId: 'vmCodeExecution' as const }];

describe('detect-eval-with-expression survivor guards', () => {
  ruleTester.run('detect-eval-with-expression', detectEvalWithExpression, {
    valid: [
      {
        name: 'a private method named like a vm sink is not the vm sink',
        code: "import vm from 'node:vm'; class A { #runInNewContext() {} m(code) { vm.#runInNewContext(code); } }",
      },
      {
        name: 'a dynamic-import wrapper may separate return and import by more than one space',
        code: "const load = Function('specifier', 'return  import(specifier)');",
      },
      {
        name: 'the wrapper parameter may be written with surrounding spaces',
        code: "const load = Function(' specifier ', 'return import(specifier)');",
      },
      {
        name: 'a vm2 sandbox method other than run is not a code sink',
        code: "const { NodeVM } = require('vm2'); const sandbox = new NodeVM(); sandbox.freeze(userCode);",
      },
      {
        name: 'require() with no argument binds nothing and does not throw',
        code: 'const vm = require(); vm.runInNewContext(code);',
      },
    ],
    invalid: [
      {
        name: 'a third argument means the call is not the one-parameter wrapper',
        code: "const load = Function('specifier', 'return import(specifier)', 'extra');",
        errors: 1,
      },
      {
        name: 'a script kept in a variable is not a syntax probe even with a SyntaxError handler',
        code: "import vm from 'node:vm'; try { const s = new vm.Script(src); } catch (e) { if (e instanceof SyntaxError) {} }",
        errors: VM,
      },
      {
        name: 'a handler that tests a different error class is not a syntax probe',
        code: "import vm from 'node:vm'; try { new vm.Script(src); } catch (e) { if (e instanceof TypeError) {} }",
        errors: VM,
      },
      {
        name: 'a handler that compares to SyntaxError without instanceof is not a syntax probe',
        code: "import vm from 'node:vm'; try { new vm.Script(src); } catch (e) { if (e == SyntaxError) {} }",
        errors: VM,
      },
      {
        name: 'a script compiled inside the handler is not the probed block',
        code: "import vm from 'node:vm'; try { risky(); } catch (e) { if (e instanceof SyntaxError) {} new vm.Script(src); }",
        errors: VM,
      },
      {
        name: 'a script compiled in a function declared inside the try is not the probed block',
        code: "import vm from 'node:vm'; try { (function () { new vm.Script(src); })(); } catch (e) { if (e instanceof SyntaxError) {} }",
        errors: VM,
      },
    ],
  });
});
