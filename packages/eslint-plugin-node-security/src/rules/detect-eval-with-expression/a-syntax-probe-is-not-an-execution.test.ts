/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting popular NestJS middleware: `new Script(...)` on a wrapped
 * function source, inside try/catch, was reported as compiling and running
 * code. The script is never kept and never run; it is a syntax probe that
 * decides how to serialise a function. A script that IS run still reports.
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

ruleTester.run('a syntax probe is not an execution', detectEvalWithExpression, {
  valid: [
    {
      name: 'swagger-ui helpers: new Script as a try/catch syntax probe',
      code: `
        import { Script } from 'vm';
        function serializeFunction(fn) {
          const source = fn.toString();
          try {
            new Script(\`(\${source})\`);
            return source;
          } catch (err) {
            if (!(err instanceof SyntaxError)) return source;
            return \`({ \${source} })[\${JSON.stringify(fn.name)}]\`;
          }
        }
      `,
    },
    {
      name: 'namespace spelling of the same probe',
      code: "const vm = require('node:vm'); function ok(src) { try { new vm.Script(src); return true; } catch (e) { return !(e instanceof SyntaxError); } }",
    },
  ],
  invalid: [
    {
      name: 'a discarded script with no SyntaxError handler is not shown to be a probe',
      code: "import { Script } from 'vm'; function run(userInput) { try { new Script(userInput); } catch (e) { log(e); } }",
      errors: [{ messageId: 'vmCodeExecution' }],
    },
    {
      name: 'a discarded script outside the try block is not a probe',
      code: "import { Script } from 'vm'; function run(userInput) { try { prepare(); } catch (e) { if (e instanceof SyntaxError) return; } new Script(userInput); }",
      errors: [{ messageId: 'vmCodeExecution' }],
    },
    {
      name: 'a script compiled from user input and run',
      code: "import { Script } from 'vm'; function run(userInput) { new Script(userInput).runInContext(ctx); }",
      errors: [{ messageId: 'vmCodeExecution' }],
    },
    {
      name: 'a script that is kept and run later',
      code: "const vm = require('vm'); function run(userInput) { const s = new vm.Script(userInput); return s.runInNewContext({}); }",
      errors: [{ messageId: 'vmCodeExecution' }],
    },
    {
      name: 'a script handed to something else',
      code: "const vm = require('vm'); function run(userInput) { return new vm.Script(userInput); }",
      errors: [{ messageId: 'vmCodeExecution' }],
    },
    {
      name: 'vm.runInNewContext on a variable still reports',
      code: "const vm = require('vm'); function run(userInput) { vm.runInNewContext(userInput, {}); }",
      errors: [{ messageId: 'vmCodeExecution' }],
    },
  ],
});
