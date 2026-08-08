/**
 * Tests for mcp-sdk-security/no-command-injection-in-tool
 * CWE-78 — a tool argument used directly as the command.
 *
 * The load-bearing case is the *first* valid one: the concatenated shape must
 * stay silent here, because `node-security/no-shell-injection` already reports
 * it. If that ever starts firing, one line carries a finding from two plugins
 * and the taxonomy contract is broken.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noCommandInjectionInTool, isBuiltString, handlerArgNames } from './index';
import type { TSESTree } from '@typescript-eslint/utils';

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

const SDK = "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n";

describe('no-command-injection-in-tool', () => {
  describe('Valid', () => {
    ruleTester.run('valid', noCommandInjectionInTool, {
      valid: [
        {
          // THE boundary case. node-security/no-shell-injection owns the
          // concatenated form; reporting it here too would put two plugins on
          // one line.
          name: 'an interpolated command belongs to node-security',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(`ls ${cmd}`); });',
        },
        {
          name: 'a concatenated command likewise',
          code:
            SDK + 'server.registerTool("run", cfg, async ({ cmd }) => { execSync("ls " + cmd); });',
        },
        {
          name: 'a literal command',
          code: SDK + 'server.registerTool("run", cfg, async ({ cmd }) => { execSync("ls -la"); });',
        },
        {
          // The remediation the message recommends.
          name: 'an allowlist lookup naming the binary',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ op, value }) => { execFile(ALLOWED[op], [value]); });',
        },
        {
          name: 'a variable that is not a tool argument',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(configuredBinary); });',
        },
        {
          name: 'the whole args object is not a command',
          code: SDK + 'server.registerTool("run", cfg, async (args) => { execSync(args); });',
        },
        {
          name: 'a sink outside any tool handler',
          code: SDK + 'execSync(cmd);',
        },
        {
          // Positioned *before* the handler, so the range check has to reject
          // on the start bound rather than the end bound.
          name: 'a sink above the registration that declares the name',
          code:
            SDK +
            'execSync(cmd);\nserver.registerTool("run", cfg, async ({ cmd }) => noop(cmd));',
        },
        {
          name: 'a file that never imports the MCP SDK',
          code: 'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
        },
        {
          name: 'a handler with no parameters',
          code: SDK + 'server.registerTool("run", cfg, async () => { execSync(cmd); });',
        },
        {
          name: 'a non-sink call taking the argument',
          code: SDK + 'server.registerTool("run", cfg, async ({ cmd }) => { logger.info(cmd); });',
        },
        {
          name: 'a sink with no arguments',
          code: SDK + 'server.registerTool("run", cfg, async ({ cmd }) => { spawn(); });',
        },
        {
          name: 'a handler passed by reference binds no names here',
          code: SDK + 'server.registerTool("run", cfg, handleRun);',
        },
        {
          name: 'an unrelated import does not open the gate',
          code:
            "import { z } from 'zod';\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
        },
        {
          name: 'a registration with no arguments at all',
          code: SDK + 'server.registerTool();',
        },
        {
          // `getRunner()(cmd)` — the callee is itself a call, so there is no
          // statically known sink name.
          name: 'a callee that is neither an identifier nor a member',
          code:
            SDK + 'server.registerTool("run", cfg, async ({ cmd }) => { getRunner()(cmd); });',
        },
        {
          name: 'an array-pattern property binds nothing this rule tracks',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ pair: [a, b] }) => { execSync(a); });',
        },
        {
          name: 'a computed member on the args object',
          code:
            SDK + 'server.registerTool("run", cfg, async (args) => { execSync(args[key]); });',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid — the half node-security declines', () => {
    ruleTester.run('invalid', noCommandInjectionInTool, {
      valid: [],
      invalid: [
        {
          name: 'a destructured argument as the command',
          code: SDK + 'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell', data: { arg: 'cmd', sink: 'execSync' } }],
        },
        {
          name: 'the whole-args member form',
          code: SDK + 'server.registerTool("run", cfg, async (args) => { execSync(args.cmd); });',
          errors: [{ messageId: 'toolArgToShell', data: { arg: 'args.cmd', sink: 'execSync' } }],
        },
        {
          name: 'spawn chooses the binary too',
          code: SDK + 'server.registerTool("run", cfg, async ({ bin }) => { spawn(bin, argv); });',
          errors: [{ messageId: 'toolArgToShell', data: { arg: 'bin', sink: 'spawn' } }],
        },
        {
          name: 'execFile',
          code: SDK + 'server.registerTool("run", cfg, async ({ bin }) => { execFile(bin, []); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'fork',
          code: SDK + 'server.registerTool("run", cfg, async ({ mod }) => { fork(mod); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'the namespaced call form',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { child_process.execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a nested destructure',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ opts: { cmd } }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a defaulted destructure',
          code:
            SDK + 'server.registerTool("run", cfg, async ({ cmd = "ls" }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a rest element is an object, and its member is tainted',
          code:
            SDK + 'server.registerTool("run", cfg, async ({ ...rest }) => { execSync(rest.cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'the legacy tool() arity',
          code: SDK + 'server.tool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a function expression handler',
          code:
            SDK +
            'server.registerTool("run", cfg, async function ({ cmd }) { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          // Regression: handlers are collected in traversal order, so the
          // outer one is pushed first. Taking the first enclosing match meant
          // the sink was judged against the *outer* handler's parameter names
          // — and `inner` is not among them, so this was silently skipped.
          name: 'a sink inside a nested registration uses the inner handler',
          code:
            SDK +
            'server.registerTool("outer", cfg, async ({ outerArg }) => {\n' +
            '  server.registerTool("inner", cfg, async ({ inner }) => { execSync(inner); });\n' +
            '});',
          errors: [{ messageId: 'toolArgToShell', data: { arg: 'inner', sink: 'execSync' } }],
        },
        {
          name: 'two sinks in one handler report separately',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ a, b }) => { execSync(a); spawn(b); });',
          errors: [{ messageId: 'toolArgToShell' }, { messageId: 'toolArgToShell' }],
        },
        {
          name: 'require() opens the same gate',
          code:
            "const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
      ],
    });
  });
});

describe('isBuiltString', () => {
  const exprOf = (code: string): TSESTree.Node =>
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement).expression;

  it('is true for the shapes node-security owns', () => {
    expect(isBuiltString(exprOf('`ls ${x}`'))).toBe(true);
    expect(isBuiltString(exprOf("'ls ' + x"))).toBe(true);
  });

  it('is false for a bare reference or literal', () => {
    expect(isBuiltString(exprOf('cmd'))).toBe(false);
    expect(isBuiltString(exprOf("'ls'"))).toBe(false);
    expect(isBuiltString(exprOf('`ls`'))).toBe(false);
    expect(isBuiltString(exprOf('args.cmd'))).toBe(false);
  });
});

describe('handlerArgNames', () => {
  const fnOf = (code: string): TSESTree.Node =>
    (parser.parse(code, { range: true }).body[0] as TSESTree.ExpressionStatement).expression;

  it('collects destructured names as direct', () => {
    const { direct, objects } = handlerArgNames(fnOf('({ cmd, path }) => {}'));
    expect([...direct].sort()).toEqual(['cmd', 'path']);
    expect(objects.size).toBe(0);
  });

  it('treats a whole parameter as an object', () => {
    const { direct, objects } = handlerArgNames(fnOf('(args) => {}'));
    expect(direct.size).toBe(0);
    expect([...objects]).toEqual(['args']);
  });

  it('sorts a rest element into objects, not direct', () => {
    const { direct, objects } = handlerArgNames(fnOf('({ a, ...rest }) => {}'));
    expect([...direct]).toEqual(['a']);
    expect([...objects]).toEqual(['rest']);
  });

  it('follows nesting and defaults', () => {
    const { direct } = handlerArgNames(fnOf('({ a = 1, b: { c } }) => {}'));
    expect([...direct].sort()).toEqual(['a', 'c']);
  });

  it('returns nothing for a non-function', () => {
    const { direct, objects } = handlerArgNames(fnOf('handleRun'));
    expect(direct.size).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('returns nothing for a function with no parameters', () => {
    const { direct, objects } = handlerArgNames(fnOf('() => {}'));
    expect(direct.size).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('ignores an array-pattern parameter rather than guessing', () => {
    const { direct, objects } = handlerArgNames(fnOf('([a, b]) => {}'));
    expect(direct.size).toBe(0);
    expect(objects.size).toBe(0);
  });
});
