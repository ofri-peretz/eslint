/**
 * Tests for mcp-sdk-security/no-code-injection-in-tool
 * CWE-95 — a tool argument evaluated as code.
 *
 * Written test-first: every invalid case below failed against a plugin with no
 * such rule (backlog item 7 of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noCodeInjectionInTool } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const SDK =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import vm from 'node:vm';\n";

const err = (arg: string, sink: string) => ({
  messageId: 'toolArgToCode' as const,
  data: { arg, sink },
});

describe('no-code-injection-in-tool', () => {
  ruleTester.run('no-code-injection-in-tool', noCodeInjectionInTool, {
    valid: [
      {
        name: 'a literal evaluated',
        code:
          SDK +
          'server.registerTool("c", cfg, async ({ expr }) => eval("1 + 1"));',
      },
      {
        name: 'the argument parsed as data, not code',
        code:
          SDK +
          'server.registerTool("c", cfg, async ({ json }) => JSON.parse(json));',
      },
      {
        name: 'a restricted expression evaluator from a library',
        code:
          SDK +
          "import { evaluate } from 'mathjs';\n" +
          'server.registerTool("c", cfg, async ({ expr }) => String(evaluate(expr)));',
      },
      {
        name: 'a local function named eval is not the global',
        code:
          SDK +
          'function evaluate(x) { return x; }\nconst eval2 = evaluate;\nfunction run({ expr }) { const eval = eval2; return eval(expr); }\nserver.registerTool("c", cfg, run);',
      },
      {
        name: 'setTimeout with a function callback',
        code:
          SDK +
          'server.registerTool("c", cfg, async ({ ms }) => setTimeout(() => done(), ms));',
      },
      {
        name: 'eval outside any tool handler',
        code: SDK + 'function run(code) { return eval(code); }',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code: 'server.registerTool("c", cfg, async ({ expr }) => eval(expr));',
      },
      {
        name: 'a vm export that does not take source text',
        code:
          SDK +
          'server.registerTool("c", cfg, async ({ ctx }) => vm.createContext(ctx));',
      },
      {
        name: 'run() on something that is not a vm2 sandbox',
        code:
          SDK +
          "import { VM } from './my-vm';\nimport { Worker } from 'vm2';\n" +
          'server.registerTool("c", cfg, async ({ code }) => { new VM().run(code); new Worker().run(code); task.run(code); });',
      },
      {
        name: 'a different method on a vm2 instance',
        code:
          SDK +
          "import { NodeVM } from 'vm2';\nconst sandbox = new NodeVM();\n" +
          'server.registerTool("c", cfg, async ({ name }) => sandbox.freeze({}, name));',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 7 (eval / new Function / vm from tool arguments)
        name: 'FN: a calculator tool that evals the expression',
        code:
          SDK +
          'server.registerTool("calc", cfg, async ({ expr }) => ({ content: [{ type: "text", text: String(eval(expr)) }] }));',
        errors: [err('expr', 'eval')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 7 (eval / new Function / vm from tool arguments)
        name: 'FN: new Function and Function() with the argument as the body',
        code:
          SDK +
          'server.registerTool("fn", cfg, async ({ body, param }) => { new Function("x", body); Function(param, "return 1"); });',
        errors: [err('body', 'Function'), err('param', 'Function')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 7 (eval / new Function / vm from tool arguments)
        name: 'FN: node:vm run functions, Script and SourceTextModule',
        code:
          SDK +
          'server.registerTool("vm", cfg, async ({ code }) => {\n' +
          '  vm.runInNewContext(code, {}); vm.runInThisContext(code); vm.runInContext(code, ctx);\n' +
          '  vm.compileFunction(code); new vm.Script(code); new vm.SourceTextModule(code);\n' +
          '});',
        errors: [
          err('code', 'vm.runInNewContext'),
          err('code', 'vm.runInThisContext'),
          err('code', 'vm.runInContext'),
          err('code', 'vm.compileFunction'),
          err('code', 'vm.Script'),
          err('code', 'vm.SourceTextModule'),
        ],
      },
      {
        name: 'vm2 VM and NodeVM run()',
        code:
          SDK +
          "import { VM, NodeVM } from 'vm2';\nconst sandbox = new NodeVM();\n" +
          'server.registerTool("c", cfg, async ({ code }) => { new VM().run(code); sandbox.run(code); });',
        errors: [err('code', 'vm2.VM.run'), err('code', 'vm2.NodeVM.run')],
      },
      {
        name: 'a string handed to setTimeout / setInterval, and a derived expression',
        code:
          SDK +
          'server.registerTool("c", cfg, async (args) => { setTimeout(args.cb, 10); setInterval(`tick(${args.n})`, 10); eval("(" + args.expr.trim() + ")"); });',
        errors: [
          err('args.cb', 'setTimeout'),
          err('args.n', 'setInterval'),
          err('args.expr', 'eval'),
        ],
      },
      {
        name: 'a spread of argument strings into new Function',
        code:
          SDK +
          'server.registerTool("c", cfg, async ({ parts }) => new Function(...parts));',
        errors: [err('parts', 'Function')],
      },
      {
        name: 'require("vm") and low-level Server arguments',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\nconst { runInNewContext } = require('vm');\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (req) => runInNewContext(String(req.params.arguments.code)));',
        errors: [err('req.params.arguments.code', 'vm.runInNewContext')],
      },
    ],
  });
});

describe('1.0 independent review (2026-10-12)', () => {
  ruleTester.run('review', noCodeInjectionInTool, {
    valid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: a helper only ever given fixed code
        name: 'precision lock: an eval helper whose callers pass literals',
        code:
          SDK +
          'function compute(foo) { return eval(foo); }\n' +
          'server.registerTool("c", cfg, async ({ n }) => ({ content: [{ type: "text", text: String(compute("1 + 1")) }] }));',
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security 1.0 review 2026-10-12, synthetic: the arguments object handed to a helper declared below
        name: 'FN: eval in a helper given the whole arguments object',
        code:
          SDK +
          'server.registerTool("calc", cfg, async (foo) => ({ content: [{ type: "text", text: compute(foo) }] }));\n' +
          'function compute(bar) { return String(eval(bar.expr)); }',
        errors: [err('foo.expr', 'eval')],
      },
    ],
  });
});
