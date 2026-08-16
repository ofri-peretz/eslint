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
    ruleTester.run('invalid - dangerous Function constructor', noUnsafeDeserialization, {
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
    });
  });

  describe('Invalid Code - Unsafe YAML Parsing', () => {
    ruleTester.run('invalid - unsafe YAML parsing', noUnsafeDeserialization, {
      valid: [],
      invalid: [
        {
          code: 'const yaml = require("yaml"); const obj = yaml.parse(userInput);',
          errors: [{ messageId: 'unsafeDeserialization' }],
        },
      ],
    });
  });

  describe('Invalid Code - Dangerous Libraries', () => {
    ruleTester.run('invalid - dangerous deserialization libraries', noUnsafeDeserialization, {
      valid: [],
      invalid: [
        {
          code: 'const serialize = require("node-serialize"); serialize.unserialize(userInput);',
          errors: [
            { messageId: 'unsafeDeserialization' },
          ],
        },
        // Test custom alias to verify VariableDeclaration tracking works where CallExpression might fail
        // (If unserialize is strictly standard name)
        {
          code: 'const myLib = require("node-serialize"); myLib.unserialize(userInput);',
          errors: [
            { messageId: 'unsafeDeserialization' },
          ],
        },
      ],
    });
  });

  describe('Advanced Data Flow Coverage', () => {
    ruleTester.run('coverage - tracking untrusted sources', noUnsafeDeserialization, {
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
          errors: [{
            messageId: 'dangerousEvalUsage',
            suggestions: [{
              messageId: 'useSafeDeserializer',
              output: `
            const fs = require('fs');
            const data = fs.readFileSync('data.json'); 
            // data is marked untrusted by VariableDeclaration visitor
            JSON.parse(data);
          `
            }]
          }],
        },
        // Function parameter untrusted
        {
          code: `
            function process(input) {
              eval(input);
            }
          `,
          errors: [{
            messageId: 'dangerousEvalUsage',
            suggestions: [{
              messageId: 'useSafeDeserializer',
              output: `
            function process(input) {
              JSON.parse(input);
            }
          `
            }]
          }],
        },
      ],
    });
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
    ruleTester.run('config - custom dangerous functions', noUnsafeDeserialization, {
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
    });

    ruleTester.run('config - custom validation functions', noUnsafeDeserialization, {
      valid: [
        {
          code: 'const clean = myValidator(req.body); const data = JSON.parse(clean);',
          options: [{ validationFunctions: ['myValidator'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Complex Deserialization Attack Scenarios', () => {
    ruleTester.run('complex - real-world deserialization patterns', noUnsafeDeserialization, {
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
          errors: [
            {
              messageId: 'unsafeDeserialization',
            },
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
          errors: [
            {
              messageId: 'unsafeDeserialization',
            },
            {
              messageId: 'unsafeYamlParsing',
            },
          ],
        },
      ],
    });
  });

  describe('Coverage - branch gaps', () => {
    // ids 9+10 FALSE: computed property access → property/object type is Literal/MemberExpression not Identifier
    ruleTester.run('coverage - computed callee property (id 9 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: "yaml['load'](req.body.data);" }],
      invalid: [],
    });

    ruleTester.run('coverage - nested callee object (id 10 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'ns.yaml.load(req.body.data);' }],
      invalid: [],
    });

    // id 16 FALSE (isDangerousDeserialization require check) + id 79 FALSE (VariableDeclarator require check)
    ruleTester.run('coverage - dynamic require arg (id 16 + id 79 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'const x = require(dynamicVar);' }],
      invalid: [],
    });

    // id 22 FALSE: nested MemberExpression arg where innermost object is not req
    ruleTester.run('coverage - non-req nested member arg (id 22 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'yaml.load(user.profile.data);' }],
      invalid: [],
    });

    // id 29 FALSE: destructured function param → param.type is ObjectPattern not Identifier
    ruleTester.run('coverage - destructured function param (id 29 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'function handler({data}) { eval(data); }' }],
      invalid: [],
    });

    // id 30 TRUE + id 31 hits[2]: isInputValidated returns true → hasUntrustedInput stays false
    ruleTester.run('coverage - validated input in safe-library path (id 30 TRUE + id 31 arm2)', noUnsafeDeserialization, {
      valid: [{ code: 'validateInput(JSON.parse(req.body.data));' }],
      invalid: [],
    });

    // ids 33+34 FALSE: computed property/nested object in isSafeLibrary
    ruleTester.run('coverage - computed JSON.parse property (id 33 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: "JSON['parse'](req.body.data);" }],
      invalid: [],
    });

    ruleTester.run('coverage - nested JSON.parse object (id 34 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'obj.JSON.parse(req.body.data);' }],
      invalid: [],
    });

    // id 43 FALSE: Function() with no untrusted args → hasUntrustedInput=false → skip
    ruleTester.run('coverage - Function constructor no untrusted args (id 43 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'new Function("return 1");' }],
      invalid: [],
    });

    // id 44 TRUE: @safe bypasses Function constructor report
    ruleTester.run('coverage - @safe bypasses Function constructor (id 44 TRUE)', noUnsafeDeserialization, {
      valid: [{ code: '/** @safe */\nnew Function(req.body.code);' }],
      invalid: [],
    });

    // id 49 FALSE + id 89 TRUE: @safe annotation makes safetyChecker.isSafe=true in both paths
    ruleTester.run('coverage - @safe bypasses dangerous-library and reference-tracking reports (id 49 FALSE + id 89 TRUE)', noUnsafeDeserialization, {
      valid: [{
        code: '/** @safe */\nfunction test() { const s = require("node-serialize"); s.unserialize(req.body.data); }',
      }],
      invalid: [],
    });

    // id 64 FALSE (VariableDeclaration no-init) + id 74 TRUE (VariableDeclarator no-init early return)
    ruleTester.run('coverage - variable declaration without initializer (id 64 FALSE + id 74 TRUE)', noUnsafeDeserialization, {
      valid: [{ code: 'let x;' }],
      invalid: [],
    });

    // id 70 FALSE: fs.readFileSync with non-literal path → literalPathFileVars NOT updated
    ruleTester.run('coverage - readFileSync with dynamic path (id 70 FALSE)', noUnsafeDeserialization, {
      valid: [],
      invalid: [{
        code: 'const data = fs.readFileSync(dynamicPath); eval(data);',
        errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
      }],
    });

    // id 72 TRUE + id 73 hits[1]: AssignmentExpression with Identifier left and untrusted right
    // id 73 hits[0] + id 72 FALSE: AssignmentExpression with MemberExpression left (short-circuit)
    ruleTester.run('coverage - assignment expression tracking (id 72+73)', noUnsafeDeserialization, {
      valid: [{ code: 'obj.prop = req.body.data;' }],
      invalid: [{
        code: 'let data; data = req.body.payload; eval(data);',
        errors: [{ messageId: 'dangerousEvalUsage', suggestions: 1 }],
      }],
    });

    // id 82 FALSE: destructured require → node.id.type is ObjectPattern not Identifier
    ruleTester.run('coverage - destructured require (id 82 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'const {parse} = require("node-serialize");' }],
      invalid: [],
    });

    // id 85 FALSE: computed method access on required library → propertyName = ''
    ruleTester.run('coverage - computed require method access (id 85 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'const s = require("node-serialize"); s["unserialize"](userInput);' }],
      invalid: [],
    });

    // id 87 FALSE: reference to method without calling it → callExpr.type !== CallExpression
    ruleTester.run('coverage - require method reference without call (id 87 FALSE)', noUnsafeDeserialization, {
      valid: [{ code: 'const s = require("node-serialize"); const fn = s.unserialize;' }],
      invalid: [],
    });

  });

  // Layer 2 — mock context for node.loc?.start.line ?? 0 fallback branches
  describe('Layer 2 - mock context', () => {
    it('NewExpression dangerousFunctionConstructor falls back to line 0 when loc missing (id 45)', () => {
      const { listeners, reports } = createWithMockContext(noUnsafeDeserialization, {
        sourceText: 'new Function(req.body.code)',
      });
      (listeners.NewExpression as (n: unknown) => void)({
        type: 'NewExpression',
        callee: { type: 'Identifier', name: 'Function' },
        arguments: [{
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'req' },
          property: { type: 'Identifier', name: 'body' },
        }],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('dangerousFunctionConstructor');
      expect(reports[0].data?.line).toBe('0');
    });

    it('CallExpression dangerousEvalUsage falls back to line 0 when loc missing (id 54)', () => {
      const { listeners, reports } = createWithMockContext(noUnsafeDeserialization, {
        sourceText: 'eval(req.body.data)',
      });
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'eval' },
        arguments: [{
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'req' },
          property: { type: 'Identifier', name: 'body' },
        }],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('dangerousEvalUsage');
      expect(reports[0].data?.line).toBe('0');
    });


    it('VariableDeclarator reference tracking falls back to line 0 when callExpr has no loc (id 90)', () => {
      // Build a fake AST: const s = require('node-serialize'); s.unserialize(data)
      const fakeCallExpr: Record<string, unknown> = { type: 'CallExpression' };
      const fakeMemberExpr: Record<string, unknown> = {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: 'unserialize' },
        parent: fakeCallExpr,
      };
      const fakeRefId: Record<string, unknown> = {
        type: 'Identifier',
        name: 's',
        parent: fakeMemberExpr,
      };
      fakeMemberExpr.object = fakeRefId;
      fakeCallExpr.callee = fakeMemberExpr;

      const capturedReports: Record<string, unknown>[] = [];
      const sourceCode = {
        text: '',
        getText: () => 's.unserialize(data)',
        getScope: () => ({ variables: [], references: [], childScopes: [] }),
        getAncestors: () => [],
        getCommentsBefore: () => [],
        getDeclaredVariables: () => [{ references: [{ identifier: fakeRefId }] }],
      };
      const mockContext = {
        id: 'mock-rule',
        filename: 'mock.ts',
        physicalFilename: 'mock.ts',
        cwd: '/',
        options: noUnsafeDeserialization.defaultOptions ?? [],
        settings: {},
        parserOptions: {},
        languageOptions: {},
        sourceCode,
        getFilename: () => 'mock.ts',
        getPhysicalFilename: () => 'mock.ts',
        getCwd: () => '/',
        getSourceCode: () => sourceCode,
        getScope: () => ({ variables: [], references: [], childScopes: [] }),
        getAncestors: () => [],
        report: (d: Record<string, unknown>) => capturedReports.push(d),
      };
      const listeners = noUnsafeDeserialization.create(mockContext as never);
      (listeners.VariableDeclarator as (n: unknown) => void)({
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 's' },
        init: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'require' },
          arguments: [{ type: 'Literal', value: 'node-serialize' }],
        },
      });
      expect(capturedReports).toHaveLength(1);
      expect((capturedReports[0] as { data?: { line?: string } }).data?.line).toBe('0');
    });
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
  ruleTester.run('timer + self-delegating deserialize', noUnsafeDeserialization, {
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
                output: 'function run(userCode) { JSON.parse("alert(" + userCode + ")"); }',
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
                output: 'function run(userCode) { JSON.parse(`do(${userCode})`); }',
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
  });
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
ruleTester.run('no-unsafe-deserialization-ts-cast-taint', noUnsafeDeserialization, {
  valid: [],
  invalid: [
    {
      code: `serialize.unserialize(req.body.state as string);`,
      errors: [{ messageId: 'unsafeDeserialization' }],
    },
  ],
});
