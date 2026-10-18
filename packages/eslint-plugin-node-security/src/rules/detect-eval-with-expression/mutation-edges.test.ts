/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed, written against the rule as
 * it stands.
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('mutation-guided edges', detectEvalWithExpression, {
  valid: [
    // vm bindings come from require/import of the vm module only
    {
      name: 'a module name passed to a function other than require binds nothing',
      code: "const script = lookup('vm');\nscript.runInThisContext(source);",
    },
    {
      name: 'an inline require of a module that is not vm is not a vm sink',
      code: "require('./sandbox').runInContext(code, ctx);",
    },
    // isStaticCode: the last write before the sink decides
    {
      name: 'a const bound to a literal program is static code',
      code: "const vm = require('vm');\nconst program = 'result = rows.length';\nvm.runInNewContext(program, ctx);",
    },
    {
      name: 'a request value overwritten by a literal before the sink is static code',
      code: `const vm = require('vm');
function go(req) {
  let program = req.body.code;
  program = 'result = 0';
  vm.runInNewContext(program, ctx);
}`,
    },
    // allowLiteralStrings
    {
      name: 'allowLiteralStrings lets the Function constructor take a literal body',
      code: "const getGlobal = Function('return this');",
      options: [{ allowLiteralStrings: true }],
    },
  ],
  invalid: [
    {
      name: 'a literal written to the program after the sink ran does not excuse it',
      code: `const vm = require('vm');
function go(req) {
  let program = req.body.code;
  vm.runInNewContext(program, ctx);
  program = '';
}`,
      errors: [
        { messageId: 'vmCodeExecution', data: { api: 'runInNewContext' } },
      ],
    },
    {
      name: 'a literal initialiser replaced by a request value before the sink is not static',
      code: `const vm = require('vm');
function go(req) {
  let program = 'result = 0';
  program = req.body.code;
  vm.runInNewContext(program, ctx);
}`,
      errors: [
        { messageId: 'vmCodeExecution', data: { api: 'runInNewContext' } },
      ],
    },
    // The rendered fix line of strategyRefactor
    {
      name: 'an eval with no recognised pattern suggests removing eval entirely',
      code: 'eval(code);',
      errors: [
        {
          messageId: 'strategyRefactor',
          data: { safeAlternative: 'Remove eval entirely' },
        },
      ],
    },
    {
      name: 'a recognised pattern supplies its own safe alternative under the refactor strategy',
      code: "eval('Math.' + fn + '(x)');",
      options: [{ strategy: 'refactor' }],
      errors: [
        {
          messageId: 'strategyRefactor',
          data: { safeAlternative: 'Math functions or parseInt/parseFloat' },
        },
      ],
    },
    {
      name: 'the Function constructor message is chosen from the text of all its arguments',
      code: "const parse = new Function('s', 'return JSON.parse(s)');",
      errors: [{ messageId: 'useJsonParse' }],
    },
  ],
});
