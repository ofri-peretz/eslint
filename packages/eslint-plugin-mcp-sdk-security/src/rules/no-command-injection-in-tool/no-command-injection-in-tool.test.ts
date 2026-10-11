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
import {
  noCommandInjectionInTool,
  isBuiltString,
  handlerArgNames,
} from './index';
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

/**
 * Opens the SDK gate AND binds the sinks.
 *
 * The sinks used to be matched by callee name alone, so `ISSUE_KEY.exec(key)`
 * — a RegExp — was a CRITICAL CWE-78 finding. They are now resolved to
 * `child_process` (or `execa`), so every fixture that expects a finding has to
 * import the sink the way real code does. Bare, unbound `execSync(...)` no
 * longer reports: see "an unbound callee is not proven to be child_process".
 */
const SDK =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import { exec, execSync, execFile, spawn, fork } from 'node:child_process';\n";
const SDK_ONLY =
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n";

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
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync("ls " + cmd); });',
        },
        {
          name: 'a literal command',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync("ls -la"); });',
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
          code:
            SDK +
            'server.registerTool("run", cfg, async (args) => { execSync(args); });',
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
          code:
            SDK +
            'server.registerTool("run", cfg, async () => { execSync(cmd); });',
        },
        {
          name: 'a non-sink call taking the argument',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { logger.info(cmd); });',
        },
        {
          name: 'a sink with no arguments',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { spawn(); });',
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
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { getRunner()(cmd); });',
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
            SDK +
            'server.registerTool("run", cfg, async (args) => { execSync(args[key]); });',
        },
        // ---- FP fixes, 2026-10.
        {
          name: 'RegExp.prototype.exec on a tool argument is not a process sink',
          code:
            SDK +
            'const ISSUE_KEY = /^([A-Z]+)-(\\d+)$/;\n' +
            'server.registerTool("get_issue", cfg, async ({ key }) => { const m = ISSUE_KEY.exec(key); return m; });',
        },
        {
          name: 'a database exec is not a process sink',
          code:
            SDK +
            "import Database from 'better-sqlite3';\nconst db = new Database('app.db');\n" +
            'server.registerTool("q", cfg, async ({ query }) => { db.exec(query); });',
        },
        {
          name: 'an unbound callee is not proven to be child_process',
          code:
            SDK_ONLY +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); runner.exec(cmd); });',
        },
        {
          name: 'a local function that happens to be named exec',
          code:
            SDK +
            'function run(cmd) { return cmd; }\nconst execLocal = run;\n' +
            'server.registerTool("run", cfg, async ({ cmd }) => { execLocal(cmd); });',
        },
        {
          name: 'a non-sink export of child_process',
          code:
            SDK +
            "import * as cp from 'node:child_process';\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { cp.ChildProcess(cmd); cp(cmd); });',
        },
        {
          name: 'a binary constrained by z.enum is the allowlist',
          code:
            SDK +
            'server.registerTool("version_of", { inputSchema: { tool: z.enum(["node", "npm"]).describe("x") } }, async ({ tool }) => { execFile(tool, ["--version"]); });',
        },
        {
          name: 'z.literal and z.nativeEnum through a renamed destructure and the whole-args form',
          code:
            SDK +
            'server.registerTool("v", { inputSchema: z.object({ a: z.literal("git"), b: z.nativeEnum(Bins).optional() }) }, async ({ a: bin }) => { execFile(bin); });\n' +
            'server.tool("w", { a: z.literal("git"), b: z.nativeEnum(Bins) }, async (args) => { execFile(args.b); });',
        },
        {
          name: 'a promisified function that is not a sink',
          code:
            SDK +
            "import { promisify } from 'node:util';\nimport { readFile } from 'node:fs';\nconst read = promisify(readFile);\n" +
            'const later = promisify();\nconst other = wrap(exec);\n' +
            'server.registerTool("run", cfg, async ({ cmd }) => { await read(cmd); await later(cmd); await other(cmd); });',
        },
        {
          name: 'a shell invoked with a fixed script',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { spawn("sh", ["-c", "ls -la"]); spawn("sh", ["-c"]); spawn("sh", ["-c", `ls ${cmd}`]); });',
        },
        {
          name: 'a tool argument after a flag that is not a shell -c',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { spawn("git", ["-c", cmd]); spawn("bash", ["--version", cmd]); spawn("bash", args); spawn(shell, ["-c", cmd]); spawn("bash", [...rest, "-c", ...cmd]); });',
        },
        {
          name: 'a call-tool request field that is not an argument',
          code:
            SDK +
            "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler(CallToolRequestSchema, async (request) => { execSync(request.params.name); execSync(request.params); });',
        },
        {
          name: 'a different request schema',
          code:
            SDK +
            "import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler(ListToolsRequestSchema, async (request) => { execSync(request.params.arguments.cmd); });\n' +
            'server.setRequestHandler(LocalSchema, async (request) => { execSync(request.params.arguments.cmd); });\n' +
            'server.setRequestHandler("tools/list", async (request) => { execSync(request.params.arguments.cmd); });',
        },
        {
          name: 'a body declaration that does not come from the arguments',
          code:
            SDK +
            'server.registerTool("run", cfg, async (args) => { const { cmd } = other; const c2 = args.cmd.trim(); const [x] = args.list; let y; execSync(cmd); execSync(c2); execSync(x); });',
        },
        {
          name: 'a promisify cycle does not recurse forever',
          code:
            SDK +
            "import { promisify } from 'node:util';\nconst run = promisify(run);\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { run(cmd); });',
        },
        {
          name: 'a computed key in the handler pattern binds nothing',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ [k]: v }) => { execSync(v); });',
        },
        {
          name: 'a request rest element and a request field outside the arguments',
          code:
            SDK +
            "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler(CallToolRequestSchema, async ({ params, ...rest }) => { const m = params.meta; execSync(rest.cmd); execSync(m.cmd); });',
        },
        {
          name: 'setRequestHandler with no arguments, or a handler not in this file',
          code:
            SDK +
            "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler();\nserver.setRequestHandler(CallToolRequestSchema, handleCall);',
        },
        {
          name: 'a deeper export path and a non-sink execa export',
          code:
            SDK +
            "import fs from 'node:fs';\nimport { ExecaError } from 'execa';\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { fs.promises.exec(cmd); ExecaError(cmd); });',
        },
        {
          name: 'a handler referenced by a name that is not a function',
          code:
            SDK +
            'const handleRun = makeHandler();\nserver.registerTool("run", cfg, handleRun);',
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
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'cmd', sink: 'execSync' },
            },
          ],
        },
        {
          name: 'the whole-args member form',
          code:
            SDK +
            'server.registerTool("run", cfg, async (args) => { execSync(args.cmd); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'args.cmd', sink: 'execSync' },
            },
          ],
        },
        {
          name: 'spawn chooses the binary too',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ bin }) => { spawn(bin, argv); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'bin', sink: 'spawn' },
            },
          ],
        },
        {
          name: 'execFile',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ bin }) => { execFile(bin, []); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'fork',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ mod }) => { fork(mod); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'the namespaced call form',
          code:
            SDK +
            "import * as child_process from 'child_process';\n" +
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
            SDK +
            'server.registerTool("run", cfg, async ({ cmd = "ls" }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a rest element is an object, and its member is tainted',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ ...rest }) => { execSync(rest.cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'the legacy tool() arity',
          code:
            SDK +
            'server.tool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
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
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'inner', sink: 'execSync' },
            },
          ],
        },
        {
          name: 'two sinks in one handler report separately',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ a, b }) => { execSync(a); spawn(b); });',
          errors: [
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
          ],
        },
        // ---- FN fixes, 2026-10.
        {
          name: 'a rest element nested inside an argument is still the arguments',
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ opts: { ...r } }) => { execSync(r.cmd); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'r.cmd', sink: 'execSync' },
            },
          ],
        },
        {
          name: 'promisify(exec) — the usual async form',
          code:
            SDK +
            "import { promisify } from 'node:util';\nconst execAsync = promisify(exec);\n" +
            'server.registerTool("run", cfg, async ({ command }) => { await execAsync(command); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'command', sink: 'exec' },
            },
          ],
        },
        {
          name: 'util.promisify of a namespaced sink',
          code:
            SDK +
            "import util from 'util';\nimport cp from 'child_process';\nconst run = util.promisify(cp.exec);\n" +
            'server.registerTool("run", cfg, async ({ command }) => { await run(command); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a renamed import is still the sink',
          code:
            SDK +
            "import { execSync as foo } from 'node:child_process';\n" +
            'server.registerTool("run", cfg, async ({ bar }) => { foo(bar); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'bar', sink: 'execSync' },
            },
          ],
        },
        {
          name: "require('child_process').exec(cmd)",
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ cmd }) => { require(\'child_process\').exec(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: "spawn('sh', ['-c', cmd]) is a full shell",
          code:
            SDK +
            'server.registerTool("run", cfg, async ({ command }) => { spawn("bash", ["-c", command]); spawn("/bin/sh", ["-lc", command], {}); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'command', sink: 'spawn' },
            },
            { messageId: 'toolArgToShell' },
          ],
        },
        {
          name: 'cmd.exe /c and powershell -Command',
          code:
            SDK +
            'server.registerTool("run", cfg, async (args) => { execFile("cmd.exe", ["/c", args.cmd]); execFile("C:\\\\Windows\\\\pwsh", ["-NoProfile", "-Command", args.cmd]); });',
          errors: [
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
          ],
        },
        {
          name: 'execa and execaCommand',
          code:
            SDK +
            "import { execa, execaCommand } from 'execa';\nimport execaDefault from 'execa';\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { await execaCommand(cmd); await execa(cmd); await execaDefault(cmd); await execa("sh", ["-c", cmd]); });',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'cmd', sink: 'execaCommand' },
            },
            {
              messageId: 'toolArgToShell',
              data: { arg: 'cmd', sink: 'execa' },
            },
            {
              messageId: 'toolArgToShell',
              data: { arg: 'cmd', sink: 'execa' },
            },
            {
              messageId: 'toolArgToShell',
              data: { arg: 'cmd', sink: 'execa' },
            },
          ],
        },
        {
          name: 'a same-file function declaration passed by reference',
          code:
            SDK +
            'async function runHandler({ cmd }) { execSync(cmd); }\n' +
            'server.registerTool("run", { inputSchema: { cmd: z.string() } }, runHandler);',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'a same-file const arrow passed by reference, registered below',
          code:
            SDK +
            'const runHandler = async (args) => { execSync(args.cmd); };\n' +
            'server.tool("run", "Run", { cmd: z.string() }, runHandler);',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'an inline registration inside a by-reference handler uses the innermost',
          code:
            SDK +
            'async function outer({ a }) {\n' +
            '  server.registerTool("in", cfg, async ({ b }) => { execSync(b); });\n' +
            '}\n' +
            'server.registerTool("out", cfg, outer);',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'b', sink: 'execSync' },
            },
          ],
        },
        {
          name: 'the low-level Server: setRequestHandler(CallToolRequestSchema, …)',
          code:
            SDK +
            "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler(CallToolRequestSchema, async (request) => {\n' +
            '  const { name, arguments: args } = request.params;\n' +
            '  execSync(String(args?.cmd));\n' +
            '  execSync(args!.cmd as string);\n' +
            '  execSync(request.params.arguments.cmd);\n' +
            '});',
          errors: [
            {
              messageId: 'toolArgToShell',
              data: { arg: 'args.cmd', sink: 'execSync' },
            },
            {
              messageId: 'toolArgToShell',
              data: { arg: 'args.cmd', sink: 'execSync' },
            },
            {
              messageId: 'toolArgToShell',
              data: { arg: 'request.params.arguments.cmd', sink: 'execSync' },
            },
          ],
        },
        {
          name: 'a destructured request parameter and a renamed schema import',
          code:
            SDK +
            "import * as types from '@modelcontextprotocol/sdk/types.js';\n" +
            'server.setRequestHandler(types.CallToolRequestSchema, async ({ params: { arguments: { cmd } } }) => { execSync(cmd); });\n' +
            'server.setRequestHandler(types.CallToolRequestSchema, async ({ params }) => { const a = params.arguments; const { bin } = params.arguments; execSync(a.cmd); spawn(bin); });',
          errors: [
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
          ],
        },
        {
          name: "SDK v2: setRequestHandler('tools/call', …)",
          code:
            "import { Server } from '@modelcontextprotocol/server';\n" +
            "import { execSync } from 'node:child_process';\n" +
            "server.setRequestHandler('tools/call', async (request) => { execSync(request.params.arguments.cmd); });",
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'arguments destructured in the body of a tool handler',
          code:
            SDK +
            'server.registerTool("run", cfg, async (args) => { const { cmd, opts: { bin } } = args; const c = args.cmd; const all = args; execSync(cmd); spawn(bin); execSync(c); execSync(all.cmd); });',
          errors: [
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
            { messageId: 'toolArgToShell' },
          ],
        },
        {
          name: 'a free-form string schema is not a closed set',
          code:
            SDK +
            'server.registerTool("run", { inputSchema: { cmd: z.string(), mode: z.enum(["a"]) } }, async ({ cmd }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
        {
          name: 'require() opens the same gate',
          code:
            "const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');\n" +
            "const { execSync } = require('child_process');\n" +
            'server.registerTool("run", cfg, async ({ cmd }) => { execSync(cmd); });',
          errors: [{ messageId: 'toolArgToShell' }],
        },
      ],
    });
  });
});

describe('isBuiltString', () => {
  const exprOf = (code: string): TSESTree.Node =>
    (
      parser.parse(code, { range: true })
        .body[0] as TSESTree.ExpressionStatement
    ).expression;

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
    (
      parser.parse(code, { range: true })
        .body[0] as TSESTree.ExpressionStatement
    ).expression;

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
