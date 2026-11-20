/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `Function('return this')()` asks the engine for the global object. It is the
 * oldest portable way to get it (lodash, core-js, regenerator-runtime and Vite's
 * `env.ts` all carry it), the body is fixed, and no value can reach it: there
 * is no expression in "detect eval with EXPRESSION".
 *
 * Only that probe is exempt. A literal body that is a real program keeps
 * reporting at the default, exactly as `fidelity.test.ts` pins, and anything
 * assembled at runtime reports whatever it starts with.
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

ruleTester.run('global-object probe', detectEvalWithExpression, {
  valid: [
    { name: 'called', code: "const g = Function('return this')();" },
    { name: 'constructed', code: "const g = new Function('return this')();" },
    {
      name: 'spaced and terminated',
      code: 'const g = Function(" return this ; ")();',
    },
    {
      name: 'strict-mode prologue',
      code: 'const g = Function(\'"use strict"; return this\')();',
    },
    {
      name: 'globalThis spelling',
      code: "const g = Function('return globalThis')();",
    },
    {
      name: 'template literal without substitutions',
      code: 'const g = Function(`return this`)();',
    },
    {
      name: 'two spaces after the prologue semicolon',
      code: 'const g = Function(\'"use strict";  return this\')();',
    },
    {
      name: 'two spaces after return',
      code: "const g = Function('return  this')();",
    },
  ],
  invalid: [
    {
      name: 'a probe that reaches into the global is a program',
      code: "const g = Function('return this.process')();",
      errors: 1,
    },
    {
      name: 'a body built from input',
      code: "const g = Function('return this.' + key)();",
      errors: 1,
    },
    {
      name: 'a template with a substitution',
      code: 'const g = Function(`return ${key}`)();',
      errors: 1,
    },
    {
      name: 'a probe with a parameter list is a real function',
      code: "const g = new Function('a', 'return this');",
      errors: 1,
    },
    {
      name: 'a literal program stays reported at the default',
      code: "const g = Function('return process.env.SECRET')();",
      errors: 1,
    },
    {
      name: 'a locally declared Function is not the probe, but a global one still reports a different body',
      code: 'const g = new Function(\'return eval("1")\');',
      errors: 1,
    },
    {
      name: 'text before the probe is a program, not the probe',
      code: "const g = Function('foo(); return this')();",
      errors: 1,
    },
    {
      name: 'a stray token between the prologue and its semicolon',
      code: 'const g = Function(\'"use strict"x; return this\')();',
      errors: 1,
    },
    {
      name: 'a probe passed as the first of two arguments is a parameter name, not a body',
      code: "const g = Function('return this', 'return 1');",
      errors: 1,
    },
  ],
});
