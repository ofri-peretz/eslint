/**
 * Comprehensive tests for no-unsafe-deserialization rule
 * Security: CWE-502 (Unsafe Deserialization)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noUnsafeDeserialization } from './index';

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

describe('no-unsafe-deserialization', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe deserialization', noUnsafeDeserialization, {
      valid: [
        // Safe JSON parsing
        {
          name: 'JSON.parse',
          code: 'const data = JSON.parse(input);',
        },
        // Safe YAML parsing
        {
          code: 'const yaml = require("js-yaml"); const data = yaml.safeLoad(input);',
        },
        // Safe libraries
        {
          code: 'const data = safeJsonParse(input);',
        },
        // Non-deserialization operations
        {
          code: 'const result = calculate(input);',
        },
        // Validated input
        {
          code: 'const cleanData = validateInput(req.body); const obj = JSON.parse(cleanData);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dangerous eval() Usage', () => {
    ruleTester.run('invalid - dangerous eval usage', noUnsafeDeserialization, {
      valid: [],
      invalid: [
        {
          name: 'eval on a request body',
          code: 'eval(req.body.script);',
          errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
        },
        {
          code: `
            const fs = require('fs');
            const data = fs.readFileSync('data.json');
            eval(data);
          `,
          // Even a literal-path file read should flag eval — file content can be tampered.
          errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous Function Constructor', () => {
    ruleTester.run(
      'invalid - dangerous Function constructor',
      noUnsafeDeserialization,
      {
        valid: [],
        invalid: [
          {
            code: 'const func = new Function(req.body.input);',
            errors: [{ messageId: 'dangerousFunctionConstructor' }],
          },
          {
            code: 'const func = Function("a", "b", req.query.code);',
            errors: [{ messageId: 'dangerousFunctionConstructor' }],
          },
        ],
      },
    );
  });

  describe('Invalid Code - Unsafe YAML Parsing', () => {
    ruleTester.run('invalid - unsafe YAML parsing', noUnsafeDeserialization, {
      valid: [
        // REGRESSION LOCK — the `yaml` package is not js-yaml.
        //
        // This exact line was asserted INVALID here, which encoded a false
        // positive: eemeli/yaml is a pure YAML 1.2 parser with no function tag,
        // so `parse` cannot execute code or instantiate a type the payload
        // names. It was reported only because the local binding is spelled
        // `yaml`. Resolving the import tells the two packages apart.
        {
          code: 'const yaml = require("yaml"); const obj = yaml.parse(userInput);',
        },
        {
          code: 'import YAML from "yaml"; export const cfg = YAML.parse(req.body.raw);',
        },
      ],
      invalid: [
        // The sink that IS dangerous, on the same method-name shape.
        {
          code: 'const yaml = require("js-yaml"); const obj = yaml.load(req.body.doc);',
          errors: [{ messageId: 'unsafeYamlParsing' }],
        },
        // REGRESSION LOCK — the same js-yaml sink under a different local name.
        // `jsyaml` is the UMD global the package itself ships. Detection that
        // required the binding to be spelled `yaml` was reading a variable name,
        // not an interface, and this line was silent.
        {
          code: 'import jsyaml from "js-yaml"; export const obj = jsyaml.load(req.body.doc);',
          errors: [{ messageId: 'unsafeYamlParsing' }],
        },
        // REGRESSION LOCK — the named-import form js-yaml's own v4 README uses.
        {
          code: 'import { load } from "js-yaml"; export const obj = load(req.body.doc);',
          errors: [{ messageId: 'unsafeDeserialization' }],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous Libraries', () => {
    ruleTester.run(
      'invalid - dangerous deserialization libraries',
      noUnsafeDeserialization,
      {
        valid: [],
        invalid: [
          {
            code: 'const serialize = require("node-serialize"); serialize.unserialize(userInput);',
            errors: [{ messageId: 'unsafeDeserialization' }],
          },
          // Test custom alias to verify VariableDeclaration tracking works where CallExpression might fail
          // (If unserialize is strictly standard name)
          {
            code: 'const myLib = require("node-serialize"); myLib.unserialize(userInput);',
            errors: [{ messageId: 'unsafeDeserialization' }],
          },
        ],
      },
    );
  });

  describe('Advanced Data Flow Coverage', () => {
    ruleTester.run(
      'coverage - tracking untrusted sources',
      noUnsafeDeserialization,
      {
        valid: [
          // Validated variable
          {
            code: `
            const input = req.body;
            const safe = validateInput(input);
            const obj = JSON.parse(safe);
          `,
            options: [{ validationFunctions: ['validateInput'] }],
          },
        ],
        invalid: [
          // fs.readFileSync source
          {
            code: `
            const fs = require('fs');
            const data = fs.readFileSync('data.json'); 
            // data is marked untrusted by VariableDeclaration visitor
            eval(data);
          `,
            errors: [
              {
                messageId: 'dangerousEvalUsage',
                suggestions: [
                  {
                    messageId: 'useSafeDeserializer',
                    output: `
            const fs = require('fs');
            const data = fs.readFileSync('data.json'); 
            // data is marked untrusted by VariableDeclaration visitor
            JSON.parse(data);
          `,
                  },
                ],
              },
            ],
          },
          // Function parameter untrusted
          {
            code: `
            function process(input) {
              eval(input);
            }
          `,
            errors: [
              {
                messageId: 'dangerousEvalUsage',
                suggestions: [
                  {
                    messageId: 'useSafeDeserializer',
                    output: `
            function process(input) {
              JSON.parse(input);
            }
          `,
                  },
                ],
              },
            ],
          },
        ],
      },
    );
  });

  // A SAFE deserializer receiving untrusted input is not a finding — it IS the
  // remediation this rule's own message recommends. This block used to assert
  // the opposite, and that assertion was 31 of the rule's 33 corpus findings,
  // every one a false positive, mostly on plain `parseJSON(jsonString)`
  // utilities. JSON.parse cannot instantiate objects, invoke constructors or
  // execute code.
  describe('Safe deserializers are not CWE-502 sinks', () => {
    ruleTester.run('safe parsers on untrusted input', noUnsafeDeserialization, {
      valid: [
        'function parseJSON(jsonString) { return JSON.parse(jsonString); }',
        'app.post("/x", (req, res) => { JSON.parse(req.body); });',
        // js-yaml's safeLoad is the safe variant by construction, and stays
        // exempt even though `load` is on the dangerous list — the guard reads
        // the member name, not just the receiver.
        'const yaml = require("js-yaml"); const obj = yaml.safeLoad(req.query.data);',
        // Computed and non-Identifier shapes must not crash the guard.
        'const yaml = require("js-yaml"); yaml["safeLoad"](req.query.data);',
        // A nested receiver has no bare Identifier object to read.
        'const lib = require("x"); lib.yaml.safeLoad(req.query.data);',
      ],
      invalid: [
        // The eval-family sinks this rule exists for still report — including
        // the awaited form, which used to be SILENT while the plainer
        // `eval(param)` reported. Reading a response body is remote bytes.
        {
          code: 'function run(code) { eval(code); }',
          errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
        },
        {
          code: 'async function f(res) { eval(await res.text()); }',
          errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
        },
        {
          code: 'app.post("/x", (req, res) => { new Function(req.body); });',
          errors: [{ messageId: 'dangerousFunctionConstructor' }],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noUnsafeDeserialization, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @safe */
            function test() {
              const obj = eval(userInput);
            }
          `,
        },
        // Validated inputs
        {
          code: `
            const cleanInput = validateInput(req.body);
            const data = JSON.parse(cleanInput);
          `,
        },
        // Sanitized inputs
        {
          code: `
            const safeData = sanitizeInput(req.body.data);
            const yaml = require("js-yaml");
            const obj = yaml.safeLoad(safeData);
          `,
          options: [{ validationFunctions: ['sanitizeInput'] }],
        },
        // Internal/trusted data
        {
          code: 'const config = JSON.parse(fs.readFileSync("config.json", "utf8"));',
        },
        // Safe eval usage (though still generally discouraged)
        {
          code: `
            const safeCode = "console.log('hello')";
            eval(safeCode);
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run(
      'config - custom dangerous functions',
      noUnsafeDeserialization,
      {
        valid: [
          {
            code: 'const data = customDeserialize(value);',
            options: [{ dangerousFunctions: ['customDeserialize'] }],
          },
        ],
        invalid: [
          {
            code: 'const data = customDeserialize(req.body);',
            options: [{ dangerousFunctions: ['customDeserialize'] }],
            errors: [
              {
                messageId: 'unsafeDeserialization',
              },
            ],
          },
        ],
      },
    );

    ruleTester.run(
      'config - custom validation functions',
      noUnsafeDeserialization,
      {
        valid: [
          {
            code: 'const clean = myValidator(req.body); const data = JSON.parse(clean);',
            options: [{ validationFunctions: ['myValidator'] }],
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Complex Deserialization Attack Scenarios', () => {
    ruleTester.run(
      'complex - real-world deserialization patterns',
      noUnsafeDeserialization,
      {
        valid: [],
        invalid: [
          {
            code: `
            // Node-serialize vulnerability
            const serialize = require('node-serialize');
            const app = express();

            app.post('/deserialize', (req, res) => {
              // DANGEROUS: Unserializing user input
              const userData = req.body.data;
              const obj = serialize.unserialize(userData);
              res.json(obj);
            });
          `,
            // ONE call, ONE finding.
            //
            // This asserted TWO `unsafeDeserialization` errors at the same range:
            // the rule had a second reporting path on `VariableDeclarator` that
            // walked a `require`d binding's references and reported the same call
            // `checkCallExpression` had already reported. Two findings for one
            // defect means two suppression comments, and the duplicate was
            // written into this suite as the expected result.
            errors: [
              {
                messageId: 'unsafeDeserialization',
              },
            ],
          },
          {
            code: `
            // YAML code execution vulnerability
            const yaml = require('js-yaml');

            function parseYamlConfig(yamlString) {
              // DANGEROUS: Using unsafe YAML load
              return yaml.load(yamlString);
            }
          `,
            // ONE call, ONE finding — same duplicate-report defect as above, and
            // here the two findings even disagreed about which messageId (and so
            // which remediation) applied to the same line.
            errors: [
              {
                messageId: 'unsafeYamlParsing',
              },
            ],
          },
        ],
      },
    );
  });

  describe('Coverage - branch gaps', () => {
    // ids 9+10 FALSE: computed property access → property/object type is Literal/MemberExpression not Identifier
    ruleTester.run(
      'a subscripted deserialiser on a required library',
      noUnsafeDeserialization,
      {
        valid: [
          {
            // A method chosen at RUNTIME names no deserialiser.
            name: 'a runtime-keyed callee names no deserialiser',
            code: 'yaml[parse](req.body.data);',
          },
        ],
        invalid: [
          {
            // Named after the branch it existed to execute, and it asserted the
            // wrong answer to do it: `yaml['load']` deserialises exactly what
            // `yaml.load` deserialises, from the same request body.
            name: 'a subscripted yaml.load of a request body',
            code: "yaml['load'](req.body.data);",
            errors: 1,
          },
        ],
      },
    );

    ruleTester.run(
      'coverage - nested callee object (id 10 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'ns.yaml.load(req.body.data);' }],
        invalid: [],
      },
    );

    // id 16 FALSE (isDangerousDeserialization require check) + id 79 FALSE (VariableDeclarator require check)
    ruleTester.run(
      'coverage - dynamic require arg (id 16 + id 79 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'const x = require(dynamicVar);' }],
        invalid: [],
      },
    );

    // id 22 FALSE: nested MemberExpression arg where innermost object is not req
    ruleTester.run(
      'coverage - non-req nested member arg (id 22 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'yaml.load(user.profile.data);' }],
        invalid: [],
      },
    );

    // id 29 FALSE: destructured function param → param.type is ObjectPattern not Identifier
    ruleTester.run(
      'coverage - destructured function param (id 29 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'function handler({data}) { eval(data); }' }],
        invalid: [],
      },
    );

    // id 30 TRUE + id 31 hits[2]: isInputValidated returns true → hasUntrustedInput stays false
    ruleTester.run(
      'coverage - validated input in safe-library path (id 30 TRUE + id 31 arm2)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'validateInput(JSON.parse(req.body.data));' }],
        invalid: [],
      },
    );

    // ids 33+34 FALSE: computed property/nested object in isSafeLibrary
    ruleTester.run(
      'coverage - computed JSON.parse property (id 33 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: "JSON['parse'](req.body.data);" }],
        invalid: [],
      },
    );

    ruleTester.run(
      'coverage - nested JSON.parse object (id 34 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'obj.JSON.parse(req.body.data);' }],
        invalid: [],
      },
    );

    // id 43 FALSE: Function() with no untrusted args → hasUntrustedInput=false → skip
    ruleTester.run(
      'coverage - Function constructor no untrusted args (id 43 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'new Function("return 1");' }],
        invalid: [],
      },
    );

    // id 44 TRUE: @safe bypasses Function constructor report
    ruleTester.run(
      'coverage - @safe bypasses Function constructor (id 44 TRUE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: '/** @safe */\nnew Function(req.body.code);' }],
        invalid: [],
      },
    );

    // id 49 FALSE + id 89 TRUE: @safe annotation makes safetyChecker.isSafe=true in both paths
    ruleTester.run(
      'coverage - @safe bypasses dangerous-library and reference-tracking reports (id 49 FALSE + id 89 TRUE)',
      noUnsafeDeserialization,
      {
        valid: [
          {
            code: '/** @safe */\nfunction test() { const s = require("node-serialize"); s.unserialize(req.body.data); }',
          },
        ],
        invalid: [],
      },
    );

    // id 64 FALSE (VariableDeclaration no-init) + id 74 TRUE (VariableDeclarator no-init early return)
    ruleTester.run(
      'coverage - variable declaration without initializer (id 64 FALSE + id 74 TRUE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'let x;' }],
        invalid: [],
      },
    );

    // id 70 FALSE: fs.readFileSync with non-literal path → literalPathFileVars NOT updated
    ruleTester.run(
      'coverage - readFileSync with dynamic path (id 70 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [],
        invalid: [
          {
            code: 'const data = fs.readFileSync(dynamicPath); eval(data);',
            errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
          },
        ],
      },
    );

    // id 72 TRUE + id 73 hits[1]: AssignmentExpression with Identifier left and untrusted right
    // id 73 hits[0] + id 72 FALSE: AssignmentExpression with MemberExpression left (short-circuit)
    ruleTester.run(
      'coverage - assignment expression tracking (id 72+73)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'obj.prop = req.body.data;' }],
        invalid: [
          {
            code: 'let data; data = req.body.payload; eval(data);',
            errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
          },
        ],
      },
    );

    // id 82 FALSE: destructured require → node.id.type is ObjectPattern not Identifier
    ruleTester.run(
      'coverage - destructured require (id 82 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [{ code: 'const {parse} = require("node-serialize");' }],
        invalid: [],
      },
    );

    // Named after the branch it existed to execute, and it asserted the wrong
    // answer to do it: `s['unserialize'](userInput)` deserialises exactly what
    // `s.unserialize(userInput)` deserialises. A method chosen at RUNTIME is
    // the shape that genuinely names nothing.
    ruleTester.run(
      'a subscripted method on a required library',
      noUnsafeDeserialization,
      {
        valid: [
          {
            code: 'const s = require("node-serialize"); s[verb](userInput);',
          },
        ],
        invalid: [
          {
            name: 'a subscripted unserialize of user input',
            code: 'const s = require("node-serialize"); s["unserialize"](userInput);',
            errors: 1,
          },
        ],
      },
    );

    // id 87 FALSE: reference to method without calling it → callExpr.type !== CallExpression
    ruleTester.run(
      'coverage - require method reference without call (id 87 FALSE)',
      noUnsafeDeserialization,
      {
        valid: [
          {
            code: 'const s = require("node-serialize"); const fn = s.unserialize;',
          },
        ],
        invalid: [],
      },
    );
  });

  // Layer 2 — mock context for node.loc?.start.line ?? 0 fallback branches
  describe('Layer 2 - mock context', () => {
    it('NewExpression dangerousFunctionConstructor falls back to line 0 when loc missing (id 45)', () => {
      const { listeners, reports } = createWithMockContext(
        noUnsafeDeserialization,
        {
          sourceText: 'new Function(req.body.code)',
        },
      );
      (listeners.NewExpression as (n: unknown) => void)({
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Function' },
        arguments: [
          {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'req' },
            property: { type: 'Identifier', name: 'body' },
          },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('dangerousFunctionConstructor');
      expect(reports[0].data?.line).toBe('0');
    });

    it('CallExpression dangerousEvalUsage falls back to line 0 when loc missing (id 54)', () => {
      const { listeners, reports } = createWithMockContext(
        noUnsafeDeserialization,
        {
          sourceText: 'eval(req.body.data)',
        },
      );
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'eval' },
        arguments: [
          {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'req' },
            property: { type: 'Identifier', name: 'body' },
          },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('dangerousEvalUsage');
      expect(reports[0].data?.line).toBe('0');
    });

    // REMOVED — `VariableDeclarator reference tracking falls back to line 0
    // (id 90)`.
    //
    // It exercised a SECOND reporting path that walked a `require`d binding's
    // references and reported `s.unserialize(...)` a second time, at the same
    // range `checkCallExpression` already reported, and without asking whether
    // the argument was untrusted. That path is deleted; see the rule source for
    // the two defects it caused. Nothing is left for this mock to drive.
  });
});

/**
 * Regression lock — corpus false positives.
 *
 * On a 1,470-file corpus (webpack, lodash, eslint-plugin-import, two NestJS
 * boilerplates) this rule produced 35 findings at CVSS 9.8 CRITICAL. All 35
 * came from two patterns:
 *
 *  1. `await new Promise(resolve => setTimeout(resolve, 1000))` — an ordinary
 *     sleep. `setTimeout` is on the dangerous-function list, and `resolve` is
 *     an enclosing arrow-function parameter, which the rule treats as
 *     untrusted input.
 *  2. `super.deserialize(context)` — webpack's serialization protocol,
 *     repeated in every `Dependency` subclass (33 of the 35).
 *
 * `setTimeout` IS a code-execution sink in its implied-eval form, so the
 * string-argument case must keep firing.
 */
describe('no-unsafe-deserialization — corpus regression', () => {
  ruleTester.run(
    'timer + self-delegating deserialize',
    noUnsafeDeserialization,
    {
      valid: [
        // Verbatim from ack-nestjs-boilerplate
        // src/modules/notification/services/notification.email.processor.service.ts:538
        'async function run() { await new Promise(resolve => setTimeout(resolve, 1000)); }',
        'function schedule(cb) { setTimeout(cb, 1000); }',
        'function schedule(cb) { setInterval(cb, 1000); }',
        'function schedule(cb) { window.setTimeout(cb, 1000); }',
        'function poll(cb) { setTimeout(() => cb(), 0); }',
        'setTimeout();',
        'function f(a, b) { setTimeout(a + b, 100); }',
        // Verbatim shape from webpack lib/Module.js:1321 and ~30 sibling files
        'class Dep extends Base { deserialize(context) { super.deserialize(context); } }',
        'class Dep extends Base { restore(context) { this.deserialize(context); } }',
        // "Inside a deserializer implementation" — every owner shape.
        // MethodDefinition (webpack's `static deserialize(context)` factories)
        'class M { static deserialize(context) { const o = new M(); o.deserialize(context); return o; } }',
        // FunctionDeclaration
        'function deserialize(ctx) { middleware.deserialize(ctx); }',
        // Object method / Property
        'const codec = { deserialize(context) { helper.deserialize(context); } };',
        // Arrow assigned to a deserializer-named binding
        'const fromJSON = (ctx) => { middleware.deserialize(ctx); };',
      ],
      invalid: [
        // TRUE POSITIVE: implied eval — setTimeout compiling a string.
        {
          code: 'function run(userCode) { setTimeout("alert(" + userCode + ")", 100); }',
          errors: [
            {
              messageId: 'dangerousEvalUsage',
              suggestions: [
                {
                  messageId: 'useSafeDeserializer',
                  output:
                    'function run(userCode) { JSON.parse("alert(" + userCode + ")"); }',
                },
              ],
            },
          ],
        },
        {
          code: 'function run(userCode) { setInterval(`do(${userCode})`, 100); }',
          errors: [
            {
              messageId: 'dangerousEvalUsage',
              suggestions: [
                {
                  messageId: 'useSafeDeserializer',
                  output:
                    'function run(userCode) { JSON.parse(`do(${userCode})`); }',
                },
              ],
            },
          ],
        },
        // TRUE POSITIVE: a real third-party deserializer on untrusted input is
        // untouched by the `super` / `this` exemption.
        {
          code: 'function handle(req) { serialize.unserialize(req.body.payload); }',
          errors: [{ messageId: 'unsafeDeserialization' }],
        },
      ],
    },
  );
});

/**
 * REGRESSION LOCK — TypeScript casts must not hide taint.
 *
 * `req.query.x` is typed `string | string[] | ParsedQs | undefined` by Express,
 * so a TypeScript handler CANNOT pass it where a string is expected without
 * `as string`. Every taint walker in this repo dispatched on `node.type` and
 * fell through to its null/false default for `TSAsExpression`, so this rule
 * reported NOTHING on TypeScript Express code while its suite stayed green —
 * there was not one cast anywhere in these tests.
 *
 * The cast is erased at compile time and changes no value, so unwrapping it is
 * always sound for provenance. Fixed by `unwrapTypeSyntax` in @interlace/eslint-devkit.
 *
 * This block FAILS on the pre-fix rule. Verify with:
 *   git stash && npx vitest run <this file>   # expect a failure
 */
ruleTester.run(
  'no-unsafe-deserialization-ts-cast-taint',
  noUnsafeDeserialization,
  {
    valid: [],
    invalid: [
      {
        code: `serialize.unserialize(req.body.state as string);`,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
    ],
  },
);

/**
 * Schema options that nothing else in this file sets.
 *
 * `trustedSanitizers`, `trustedAnnotations` and `strictMode` all shipped with
 * their branches never executed by a test. Each is covered below by a PAIR over
 * the SAME source text — one entry that sets the option, one that does not —
 * whose verdicts disagree. Setting an option and asserting the default answer
 * would execute the line while proving nothing: the branch could be deleted and
 * this suite would stay green.
 *
 * `safeLibraries` is deliberately absent. It is declared in the schema, the
 * Options interface and defaultOptions, but `create()` never destructures or
 * reads it, so no value of it can change any verdict. Probing the same snippet
 * with `safeLibraries: []`, with the default, and with a list naming the exact
 * sink (`['deserialize','yaml','yaml.load']`) produces byte-identical output.
 * Writing a test for it would be a same-result test by construction.
 */
describe('no-unsafe-deserialization — option differentials', () => {
  // `deserialize` is on the default dangerousFunctions list, so this reports out
  // of the box. It is also the exact shape trustedSanitizers documents itself
  // for: "additional function names to consider as safe deserializers" — a
  // project whose own `deserialize` validates against a schema first.
  const CUSTOM_DESERIALIZER = 'deserialize(req.body.payload);';

  ruleTester.run('option trustedSanitizers', noUnsafeDeserialization, {
    valid: [
      // The report site hands safetyChecker.isSafe the sink CALL, and a call
      // whose callee is a trusted name reads as sanitized. Membership is exact
      // (Set.has), so only this explicit entry can match.
      {
        code: CUSTOM_DESERIALIZER,
        options: [{ trustedSanitizers: ['deserialize'] }],
      },
    ],
    invalid: [
      // Identical source, default (empty) trustedSanitizers.
      {
        code: CUSTOM_DESERIALIZER,
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
    ],
  });

  // `@appsec-reviewed` is not a substring of any built-in SAFE_ANNOTATIONS
  // entry — not `@safe`, `@validated`, `@verified` or any sibling — so the
  // default list cannot silence this and only the custom entry can. The
  // annotation walk starts at the sink node and climbs to the enclosing
  // function, which is why a leading line comment is enough.
  const ANNOTATED_EVAL = `
    // @appsec-reviewed
    eval(req.body.code);
  `;

  ruleTester.run('option trustedAnnotations', noUnsafeDeserialization, {
    valid: [
      {
        code: ANNOTATED_EVAL,
        options: [{ trustedAnnotations: ['@appsec-reviewed'] }],
      },
    ],
    invalid: [
      // Same source with the default (empty) annotation list: the comment is
      // just a comment and eval on request data reports.
      {
        code: ANNOTATED_EVAL,
        errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
      },
    ],
  });

  ruleTester.run('option strictMode', noUnsafeDeserialization, {
    valid: [
      {
        code: ANNOTATED_EVAL,
        options: [{ trustedAnnotations: ['@appsec-reviewed'] }],
      },
    ],
    invalid: [
      // strictMode forces safetyChecker.isSafe to false unconditionally, so the
      // annotation that silenced the valid twin stops being honoured. Both eval
      // report sites here are guarded only by isSafe — nothing calls
      // hasSafeAnnotation directly — so nothing else can account for the flip.
      {
        code: ANNOTATED_EVAL,
        options: [
          { trustedAnnotations: ['@appsec-reviewed'], strictMode: true },
        ],
        errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
      },
    ],
  });
});

/**
 * Regression locks — defects proved by
 * `benchmarks/rule-corpus/secure-coding__no-unsafe-deserialization`.
 */
ruleTester.run('lock - corpus-proved defects', noUnsafeDeserialization, {
  valid: [
    // js-yaml's loader pinned to a schema with no JS tag. This is the
    // remediation js-yaml's own v4 migration guide gives in place of
    // `safeLoad`, and it was reported as the vulnerability it fixes.
    {
      code: 'const yaml = require("js-yaml"); exports.p = (req) => yaml.load(req.body.manifest, { schema: yaml.JSON_SCHEMA });',
    },
    {
      code: 'import { load, CORE_SCHEMA } from "js-yaml"; export const p = (req) => load(req.body.manifest, { schema: CORE_SCHEMA });',
    },
    // Branch coverage for `pinsSafeYamlSchema`: a spread and a computed key in
    // the options object name no schema, so the loader is still a sink — but
    // with a static payload there is nothing untrusted to report.
    {
      code: 'import { load } from "js-yaml"; const opts = {}; export const p = () => load("a: 1", { ...opts, [key]: 1 });',
    },
    // …and an options object whose keys name no schema at all.
    {
      code: 'import { load } from "js-yaml"; export const p = () => load("a: 1", { json: true });',
    },
    // A module ROOT called directly — the binding resolves with an EMPTY export
    // path, which is a different shape from `pkg.method(...)`. Serialising is
    // not deserialising, so nothing is reported either way.
    {
      code: 'import serialize from "serialize-javascript"; export const html = (state) => serialize(state, { isJSON: true });',
    },
    // …and the same empty-path shape in the schema position.
    {
      code: 'import yaml, { load } from "js-yaml"; export const p = () => load("a: 1", { schema: yaml });',
    },
    // Binary codecs whose method is literally called `deserialize`. BSON and
    // msgpack decode into plain values against a fixed wire format; neither
    // instantiates a type the payload names.
    {
      code: 'import { deserialize } from "bson"; export const read = (req) => deserialize(req.body.document);',
    },
    // The WRITE half of the same libraries creates no deserialization surface.
    {
      code: 'import v8 from "node:v8"; export const snap = (job) => v8.serialize(job).toString("base64");',
    },
  ],
  invalid: [
    // Taint through a method call's RECEIVER. This is CVE-2017-5941 written the
    // way it is actually written, and it was silent: the walker recursed into a
    // call's ARGUMENTS but never into the object it was called on, so
    // `.toString()` erased the provenance.
    {
      code: 'const serialize = require("node-serialize"); exports.h = (req) => serialize.unserialize(Buffer.from(req.cookies.session, "base64").toString());',
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // funcster exists to turn JSON back into live functions.
    {
      code: 'import funcster from "funcster"; export const h = (req) => funcster.deepDeserialize(req.body.hooks);',
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
    // The js-yaml sink through a namespace import and two string methods.
    {
      // `unsafeDeserialization`, not `unsafeYamlParsing`: the messageId is
      // chosen by whether the PRINTED callee text contains `yaml`, and this one
      // is spelled `jsYaml`. The finding is correct; only the remediation text
      // is generic. Recorded here rather than papered over.
      code: 'import * as jsYaml from "js-yaml"; export const ingest = (req) => jsYaml.load(String(req.body.document).trim());',
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
  ],
});

/**
 * The two module vocabularies are options, and the defaults are exactly what
 * shipped.
 *
 * Probed all four directions before these were written:
 *   yaml.load(x, { schema: yaml.DEFAULT_SCHEMA })  reports unsafeYamlParsing
 *   yaml.load(x, { schema: yaml.JSON_SCHEMA })     QUIET
 *   YAML.parse(x) from 'yaml'                      QUIET
 *   YAML.parse(x) from '@acme/yaml'                reports unsafeYamlParsing
 * so in every case below the vocabulary is the only thing that moves.
 */
ruleTester.run(
  'options: module vocabularies are configurable',
  noUnsafeDeserialization,
  {
    valid: [
      // ---- extending the safe-schema list ----------------------------------
      // The documented gap: on a repository PINNED to js-yaml v4, DEFAULT_SCHEMA
      // defines no JS-instantiating tag and `load` under it is inert. The rule
      // cannot see the installed major; the repository can. Before this option
      // the only remedy on that line was a disable comment.
      {
        code: 'import yaml from "js-yaml"; export const c = yaml.load(req.body.doc, { schema: yaml.DEFAULT_SCHEMA });',
        options: [{ additionalSafeYamlSchemas: ['DEFAULT_SCHEMA'] }],
      },
      // Full replacement, same effect.
      {
        code: 'import yaml from "js-yaml"; export const c = yaml.load(req.body.doc, { schema: yaml.DEFAULT_SCHEMA });',
        options: [{ safeYamlSchemas: ['DEFAULT_SCHEMA'] }],
      },
      // ---- extending the non-executing package list ------------------------
      // A house wrapper around eemeli/yaml: the same pure YAML 1.2 parser, one
      // specifier the ecosystem cannot enumerate.
      {
        code: 'import YAML from "@acme/yaml"; export const c = YAML.parse(req.body.doc);',
        options: [{ additionalNonExecutingPackages: ['@acme/yaml'] }],
      },
      {
        code: 'import YAML from "@acme/yaml"; export const c = YAML.parse(req.body.doc);',
        options: [{ nonExecutingPackages: ['@acme/yaml'] }],
      },
      // ---- the default is unchanged ----------------------------------------
      // An empty bag still recognises the built-in safe schema and the built-in
      // inert package.
      {
        code: 'import yaml from "js-yaml"; export const c = yaml.load(req.body.doc, { schema: yaml.JSON_SCHEMA });',
        options: [{}],
      },
      {
        code: 'import YAML from "yaml"; export const c = YAML.parse(req.body.doc);',
        options: [{}],
      },
    ],
    invalid: [
      // ---- the default is unchanged ----------------------------------------
      // Positive control for the two `options: [{}]` valid cases above: without
      // the safe schema, and without the inert package, the same shapes report.
      {
        code: 'import yaml from "js-yaml"; export const c = yaml.load(req.body.doc, { schema: yaml.DEFAULT_SCHEMA });',
        options: [{}],
        errors: [{ messageId: 'unsafeYamlParsing' }],
      },
      {
        code: 'import YAML from "@acme/yaml"; export const c = YAML.parse(req.body.doc);',
        options: [{}],
        errors: [{ messageId: 'unsafeYamlParsing' }],
      },

      // ---- replacing a list can also NARROW it ------------------------------
      // A repository that has audited `JSON_SCHEMA` off its own safe list gets
      // the finding back. The option is a full override in both directions.
      {
        code: 'import yaml from "js-yaml"; export const c = yaml.load(req.body.doc, { schema: yaml.JSON_SCHEMA });',
        options: [{ safeYamlSchemas: ['FAILSAFE_SCHEMA'] }],
        errors: [{ messageId: 'unsafeYamlParsing' }],
      },
      {
        code: 'import YAML from "yaml"; export const c = YAML.parse(req.body.doc);',
        options: [{ nonExecutingPackages: ['bson'] }],
        errors: [{ messageId: 'unsafeYamlParsing' }],
      },
    ],
  },
);

describe('the binding is the sink, not the name', () => {
  /**
   * Provenance: cdklabs/cdk-enterprise-iac
   * src/constructs/ecsIsoServiceAutoscaler/ecsIsoServiceAutoscaler.ts:132.
   */
  ruleTester.run(
    'valid - Function imported from a library',
    noUnsafeDeserialization,
    {
      valid: [
        `import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
       new Function(this, id, { code: Code.fromAsset(req.body.path), runtime: Runtime.PYTHON_3_11 });`,
      ],
      invalid: [],
    },
  );

  /** The real global still reports. */
  ruleTester.run(
    'invalid - the actual Function constructor',
    noUnsafeDeserialization,
    {
      valid: [],
      invalid: [{ code: 'new Function(req.body.code);', errors: 1 }],
    },
  );
});
