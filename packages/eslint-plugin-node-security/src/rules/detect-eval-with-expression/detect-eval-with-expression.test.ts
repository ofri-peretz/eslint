/**
 * Comprehensive tests for detect-eval-with-expression rule  
 * Security: CWE-95 (Code Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectEvalWithExpression } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('detect-eval-with-expression', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no eval calls', detectEvalWithExpression, {
      valid: [
        'const x = Math.eval();',
        'const obj = { eval: () => {} }; obj.eval("code");',
        'function myFunction(data) { return data; }',
        'const result = calculateValue();',
      ],
      invalid: [],
    });
  });

  describe('Dangerous eval() Calls', () => {
    ruleTester.run('invalid - eval with expressions', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(userInput);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'eval(`code: ${value}`);',
          errors: [{ messageId: 'useTemplateLiteral' }],
        },
        {
          code: 'const result = eval(expression);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: `
            function process(code) {
              return eval(code);
            }
          `,
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('eval() in Different Contexts', () => {
    ruleTester.run('invalid - eval in various contexts', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'const runner = (code) => eval(code);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: `
            if (condition) {
              eval(code);
            }
          `,
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: `
            try {
              eval(code);
            } catch (e) {
              console.error(e);
            }
          `,
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Multiple eval() Calls', () => {
    ruleTester.run('invalid - multiple evals', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: `
            eval(code1);
            eval(code2);
          `,
          errors: [
            { messageId: 'strategyRefactor' },
            { messageId: 'strategyRefactor' },
          ],
        },
      ],
    });
  });

  describe('eval() with Complex Expressions', () => {
    ruleTester.run('invalid - complex expressions', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(a || b);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: `
            const code = getCode();
            eval(code);
          `,
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectEvalWithExpression, {
      valid: [
        'const evalString = "eval(code)"; console.log(evalString);',
      ],
      invalid: [
        {
          code: '(eval)(code);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Pattern Detection - JSON (lines 187-195)', () => {
    ruleTester.run('pattern detection - JSON', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("JSON.parse(" + jsonString + ")");',
          errors: [
            {
              messageId: 'useJsonParse',
            },
          ],
        },
      ],
    });
  });

  describe('Pattern Detection - Object (lines 211-219)', () => {
    ruleTester.run('pattern detection - object', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("obj[" + key + "]");',
          errors: [
            {
              messageId: 'useObjectAccess',
            },
          ],
        },
        {
          code: 'eval("object[" + key + "]");',
          errors: [{ messageId: 'useObjectAccess' }],
        },
        {
          code: 'eval("obj." + property);',
          errors: [{ messageId: 'useObjectAccess' }],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Line 219: Default case in generateRefactoringSteps
    // This is triggered when the pattern doesn't match 'json', 'math', 'object', or 'template'
    ruleTester.run('line 219 - default case in generateRefactoringSteps', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("someOtherPattern" + value);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'eval("customPattern" + data);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });

    // Note: Line 327 default case is not reachable with current pattern definitions
    // All patterns have known categories ('json', 'math', 'template', 'object')
  });

  describe('Pattern Detection - Math (lines 194-200)', () => {
    ruleTester.run('pattern detection - math', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(\'Math.sin(\' + angle + \')\');',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'eval("parseInt(" + value + ")");',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'eval("parseFloat(" + num + ")");',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Pattern Detection - Template (lines 202-208)', () => {
    ruleTester.run('pattern detection - template', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval("${" + name + "}");',
          errors: [
            {
              messageId: 'useTemplateLiteral',
            },
          ],
        },
        {
          code: 'eval("template " + variable);',
          errors: [{ messageId: 'useTemplateLiteral' }],
        },
        {
          code: 'eval("interpolat" + value);',
          errors: [{ messageId: 'useTemplateLiteral' }],
        },
      ],
    });
  });

  describe('Options - allowLiteralStrings (line 254)', () => {
    ruleTester.run('allowLiteralStrings option', detectEvalWithExpression, {
      valid: [
        {
          code: 'eval("literal string");',
          options: [{ allowLiteralStrings: true }],
        },
        {
          code: 'eval(\'another literal\');',
          options: [{ allowLiteralStrings: true }],
        },
      ],
      invalid: [
        {
          code: 'eval(userInput);',
          options: [{ allowLiteralStrings: true }],
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Options - strategy (lines 246-250)', () => {
    ruleTester.run('strategy remove option', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(userInput);',
          options: [{ strategy: 'remove' }],
          errors: [{ messageId: 'strategyRemove' }],
        },
      ],
    });

    ruleTester.run('strategy refactor option', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(userInput);',
          options: [{ strategy: 'refactor' }],
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });

    ruleTester.run('strategy validate option', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval(userInput);',
          options: [{ strategy: 'validate' }],
          errors: [{ messageId: 'strategyValidate' }],
        },
      ],
    });
  });

  describe('Edge Cases - Literal String (line 261)', () => {
    ruleTester.run('edge cases - literal string eval', detectEvalWithExpression, {
      valid: [
        // eval with literal string is allowed by default (line 261)
        'eval("literal string");',
        "eval('literal string');",
      ],
      invalid: [
        {
          code: 'eval(variable);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Edge Cases - No Arguments (line 239)', () => {
    ruleTester.run('edge cases - no arguments', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'eval();',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Function Constructor - CallExpression (lines 298-300)', () => {
    ruleTester.run('function constructor in call expression', detectEvalWithExpression, {
      valid: [],
      invalid: [
        // Lines 298-300: Function constructor detection in CallExpression context
        // This covers the case where Function is called as a function, not as a constructor
        {
          code: 'Function(code);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'Function("arg1", "arg2", "return arg1 + arg2");',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        // Lines 401-403: Edge case where new Function is called as a function
        // This triggers both CallExpression and NewExpression checks
        {
          code: '(new Function)(code);',
          errors: [
            { messageId: 'strategyRefactor' }, // CallExpression check
            { messageId: 'strategyRefactor' }  // NewExpression check
          ],
        },
        {
          code: '(new Function)("arg1", "return arg1 * 2");',
          errors: [
            { messageId: 'strategyRefactor' }, // CallExpression check
            { messageId: 'strategyRefactor' }  // NewExpression check
          ],
        },
        {
          code: 'new Function(code);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'new Function("arg1", "arg2", "return arg1 + arg2");',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Function Constructor - NewExpression (lines 324-328)', () => {
    ruleTester.run('function constructor in new expression', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'const fn = new Function(userCode);',
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'const fn = new Function("x", "y", "return x + y");',
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });

  describe('Additional Eval Functions', () => {
    ruleTester.run('additional eval functions option', detectEvalWithExpression, {
      valid: [],
      invalid: [
        {
          code: 'customEval(userCode);',
          options: [{ additionalEvalFunctions: ['customEval'] }],
          errors: [{ messageId: 'strategyRefactor' }],
        },
        {
          code: 'myEval(code);',
          options: [{ additionalEvalFunctions: ['myEval', 'anotherEval'] }],
          errors: [{ messageId: 'strategyRefactor' }],
        },
      ],
    });
  });
});

// ── vm / vm2: strings turned into running code through a module binding ──
//
// Pins corpus/CWE-094/vulnerable/vm-run-user-string.js and
// corpus/CWE-094/vulnerable/vm2-run-user-code.js, which reported nothing
// before this pass existed: no rule in the ecosystem looked at the vm module
// at all. The safe fixtures (corpus/CWE-094/safe/vm-literal-script.js,
// worker-isolation.js) are pinned as `valid` below.
describe('vm module code execution (CWE-94)', () => {
  ruleTester.run('vm sinks', detectEvalWithExpression, {
    valid: [
      // corpus/CWE-094/safe/vm-literal-script.js — the script is a hard-coded
      // constant one hop away; only numbers cross the boundary as data.
      `const vm = require('vm');
       const SCRIPT = 'total = price * quantity';
       function run(price, quantity) {
         const sandbox = { price, quantity, total: 0 };
         vm.runInNewContext(SCRIPT, sandbox, { timeout: 50 });
         return sandbox.total;
       }`,
      // Same, written inline and as a zero-expression template.
      `const vm = require('vm'); vm.runInThisContext('1 + 1');`,
      `const vm = require('vm'); vm.runInThisContext(\`1 + 1\`);`,
      // corpus/CWE-094/safe/worker-isolation.js — no vm at all.
      `const { Worker } = require('worker_threads');
       const path = require('path');
       new Worker(path.join(__dirname, 'transform.worker.js'), { workerData: 1 });`,
      // A method of the same name on something that is not the vm module.
      `renderer.runInNewContext(userTemplate);`,
      `const vm = require('vm'); vm['runInNewContext'](userCode);`,
      // vm is bound, but this export is not a code sink.
      `const vm = require('vm'); vm.createContext(sandbox);`,
      // Destructured, but not a sink export.
      `const { createContext } = require('vm'); createContext(sandbox);`,
      // A require of something else entirely.
      `const os = require('os'); os.runInNewContext(userCode);`,
      // require() with a non-literal / non-string specifier.
      `const vm = require(name); vm.runInNewContext(userCode);`,
      `const vm = require(42); vm.runInNewContext(userCode);`,
      // Not a require call at all.
      `const vm = getVm(); vm.runInNewContext(userCode);`,
      `const vm = load('vm'); vm.runInNewContext(userCode);`,
      // Destructuring shapes that bind nothing resolvable.
      `const [vm] = require('vm'); vm.runInNewContext(userCode);`,
      `const { ...rest } = require('vm'); rest.runInNewContext(userCode);`,
      `const { ['runInNewContext']: run } = require('vm'); run(userCode);`,
      `const { runInNewContext: { nested } } = require('vm'); nested(userCode);`,
      // No code argument — nothing to judge.
      `const vm = require('vm'); vm.runInThisContext();`,
      // A vm namespace member used as a constructor that is not a code sink.
      `const vm = require('vm'); new vm.Module(userCode);`,
      // vm2 imported, but the class constructed is not a sandbox or a script.
      `const { VMFileSystem } = require('vm2'); const f = new VMFileSystem(opts); f.run(userCode);`,
      // `.run()` on something that was never a vm2 sandbox.
      `const job = new Job(opts); job.run(userCode);`,
      `queue.run(userCode);`,
      `runner['run'](userCode);`,
      `new Thing(opts).run(userCode);`,
      `(getRunner()).run(userCode);`,
      // vm2 sandbox, but the source is a constant.
      `const { NodeVM } = require('vm2'); const vm = new NodeVM(); vm.run('return 1');`,
      // A binding that is reassigned cannot be proven constant... but here it
      // never resolves to a variable at all (implicit global) → not static, so
      // this one IS reported; see the invalid block. Instead: a `let` written
      // twice is not provable and is likewise reported there.
      // Static string via a const that is only ever written once, in a nested
      // function scope.
      `import vm from 'vm';
       const SCRIPT = 'x = 1';
       function outer() { function inner() { vm.runInThisContext(SCRIPT); } inner(); }`,
      // Namespace import of a module we do not track.
      `import * as util from 'util'; util.runInThisContext(code);`,
      // String module-export name — the binding is not an identifier we track.
      `import { 'runInNewContext' as run } from 'vm'; run(userCode);`,
      // The whole module bound under a sink's name is still the module, not
      // the sink.
      `const runInNewContext = require('vm'); runInNewContext(userCode);`,
      // Private method named `run` — a non-computed member that is not an
      // Identifier.
      `class C { #run(code) { return code; } go(code) { return this.#run(code); } }`,
      // vm2 constructors reached through shapes that resolve to nothing.
      `new mod['NodeVM']().run(userCode);`,
      `new (getCtor())().run(userCode);`,
      `new a.b.NodeVM().run(userCode);`,
      `const { VMFileSystem } = require('vm2'); new VMFileSystem().run(userCode);`,
      // Constructor names that only mean something when bound to a module.
      `new Script(userCode);`,
      `new VMScript(userCode);`,
      // Bound to `vm`, but VMScript is not a `vm` export.
      `const vm = require('vm'); new vm.VMScript(userCode);`,
      // Type-only-ish specifier shape: default import of vm used as namespace.
      `import vm from 'node:vm'; vm.runInThisContext('1');`,
    ],
    invalid: [
      // corpus/CWE-094/vulnerable/vm-run-user-string.js
      {
        code: `const vm = require('vm');
               function evaluate(req, res) {
                 const value = vm.runInNewContext(req.query.expr, { Math });
                 res.json({ value });
               }`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // corpus/CWE-094/vulnerable/vm2-run-user-code.js
      {
        code: `const { NodeVM } = require('vm2');
               function runPlugin(req, res) {
                 const vm = new NodeVM({ console: 'inherit' });
                 const result = vm.run(req.body.code, 'plugin.js');
                 res.json({ result });
               }`,
        errors: [{ messageId: 'vm2CodeExecution' }],
      },
      // Every other vm entry point that takes source at argument 0.
      {
        code: `const vm = require('node:vm'); vm.runInThisContext(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `const vm = require('vm'); vm.runInContext(userCode, ctx);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `const vm = require('vm'); vm.compileFunction(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `const vm = require('vm'); new vm.Script(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `const vm = require('vm'); new vm.SourceTextModule(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // Destructured require and named import spellings.
      {
        code: `const { runInNewContext } = require('vm'); runInNewContext(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `import { runInNewContext } from 'vm'; runInNewContext(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `import * as vm from 'vm'; vm.runInThisContext(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // Renamed destructure — the *exported* name is what decides.
      {
        code: `const { runInNewContext: run } = require('vm'); run(userCode);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // The binding is written below the call: order must not matter.
      {
        code: `function go(userCode) { return vm.runInThisContext(userCode); }
               const vm = require('vm');`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // vm2: direct `new NodeVM().run()`, the VM class, and VMScript.
      {
        code: `const { NodeVM } = require('vm2'); new NodeVM().run(userCode);`,
        errors: [{ messageId: 'vm2CodeExecution' }],
      },
      {
        code: `const vm2 = require('vm2'); const s = new vm2.VM(); s.run(userCode);`,
        errors: [{ messageId: 'vm2CodeExecution' }],
      },
      {
        code: `import { VMScript } from 'vm2'; new VMScript(userCode);`,
        errors: [{ messageId: 'vm2CodeExecution' }],
      },
      // Renamed vm2 import still resolves through the exported name.
      {
        code: `const { NodeVM: Sandbox } = require('vm2'); const s = new Sandbox(); s.run(userCode);`,
        errors: [{ messageId: 'vm2CodeExecution' }],
      },
      // Not statically provable: unresolvable identifier, and a binding that is
      // written more than once.
      {
        code: `const vm = require('vm'); vm.runInThisContext(SCRIPT);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      {
        code: `const vm = require('vm'); let s = 'x = 1'; s = req.body.code; vm.runInThisContext(s);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // A const bound to something that is not a string literal.
      {
        code: `const vm = require('vm'); const s = buildScript(); vm.runInThisContext(s);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // Declared without an initializer, then assigned once.
      {
        code: `const vm = require('vm'); let s; s = 'x = 1'; vm.runInThisContext(s);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // A function parameter is a binding whose definition is not a declarator.
      {
        code: `const vm = require('vm'); function go(s) { vm.runInThisContext(s); }`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // Written exactly once, but the definition is a parameter, not a
      // declarator — there is no initializer to prove constant.
      {
        code: `const vm = require('vm'); function go(s) { s = 'x = 1'; vm.runInThisContext(s); }`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // A declared global resolves to a variable with no definition at all.
      {
        code: `const vm = require('vm'); vm.runInThisContext(SCRIPT);`,
        languageOptions: { globals: { SCRIPT: 'readonly' } },
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // A non-string literal is not source written out in full.
      {
        code: `const vm = require('vm'); vm.runInThisContext(42);`,
        errors: [{ messageId: 'vmCodeExecution' }],
      },
      // A template literal that interpolates is assembled, not written out.
      {
        code: 'const vm = require("vm"); vm.runInThisContext(`total = ${expr}`);',
        errors: [{ messageId: 'vmCodeExecution' }],
      },
    ],
  });

  /**
   * Lock: this rule offers no suggestions, and says so.
   *
   * It declared `hasSuggestions: true` while its only `suggest` entry had
   * `fix: () => null` — a shape ESLint discards before the user sees it, so
   * the flag advertised an affordance nobody ever received. The three cases
   * above used to carry the comment "Rule provides suggestions but fix returns
   * null (no auto-fix), so we don't test them here", which is a defect written
   * down rather than fixed.
   *
   * If a real suggestion is ever added, this assertion is the thing that has to
   * be updated deliberately — which is the point.
   */
  it('declares hasSuggestions: false, matching the absence of any suggest array', () => {
    expect(detectEvalWithExpression.meta.hasSuggestions).toBe(false);
  });
});
