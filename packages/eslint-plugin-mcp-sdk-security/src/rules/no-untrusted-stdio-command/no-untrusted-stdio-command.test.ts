/**
 * Tests for mcp-sdk-security/no-untrusted-stdio-command
 * CWE-78 — an MCP client spawning a stdio server whose command comes from data
 * an attacker controls (the CVE-2025-6514 class, and project-config attacks
 * such as "MCPoison").
 *
 * Written test-first: every invalid case below failed against a stub rule
 * (backlog item 9, second half, of benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { join } from 'node:path';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUntrustedStdioCommand } from './index';

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
  "import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';\n" +
  "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
  "import { readFileSync } from 'node:fs';\n" +
  "import { readFile } from 'node:fs/promises';\n" +
  "import path from 'node:path';\n" +
  "import os from 'node:os';\n";

/** A file beside the cross-file fixtures, so relative imports resolve from disk. */
const SERVER = join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'cross-file',
  'server.ts',
);

const TOOL = 'tool argument';
const NET = 'network response';
const CONFIG = 'project config file';

const err = (source: string, value: string, position: string) => ({
  messageId: 'untrustedStdioCommand' as const,
  data: { source, value, position },
});

/** Every shell the rule treats as running its `-c` script, spelled out once. */
const SHELLS = ['sh', 'bash', 'zsh', 'cmd', 'cmd.exe', 'powershell', 'pwsh'];
/** Every flag after which the shell's arguments are a command line. */
const SHELL_FLAGS = ['-c', '-lc', '/c', '/C', '-Command', '-command'];
/** Every package runner whose first non-flag argument names the package. */
const RUNNERS = ['npx', 'uvx', 'bunx', 'pnpx'];

/** A tool handler that launches the server the model named. */
const inTool = (body: string) =>
  SDK +
  'const server = new McpServer({ name: "hub", version: "1.0.0" });\n' +
  'server.registerTool("launch", cfg, async (args) => {\n' +
  body +
  '\n});';

/** `.mcp.json` from the opened repository, iterated server by server. */
const fromProject = (body: string) =>
  SDK +
  "const cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));\n" +
  'for (const [name, server] of Object.entries(cfg.mcpServers)) {\n' +
  body +
  '\n}';

describe('no-untrusted-stdio-command', () => {
  ruleTester.run('no-untrusted-stdio-command', noUntrustedStdioCommand, {
    valid: [
      {
        name: 'a literal command',
        code:
          SDK +
          "new StdioClientTransport({ command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '/srv'] });",
      },
      {
        name: 'a command looked up in a static allowlist keyed by the untrusted name',
        code: inTool(
          'const ALLOWED = { git: "mcp-server-git", fs: "mcp-server-filesystem" };\n' +
            'return new StdioClientTransport({ command: ALLOWED[args.name] });',
        ),
      },
      {
        name: "the user's own config under os.homedir() is not a source",
        code:
          SDK +
          "const cfg = JSON.parse(readFileSync(path.join(os.homedir(), '.config', 'mcp', 'servers.json'), 'utf8'));\n" +
          'for (const server of Object.values(cfg.mcpServers)) new StdioClientTransport({ command: server.command });',
      },
      {
        name: 'an absolute config path is the user’s own config',
        code:
          SDK +
          "const a = JSON.parse(readFileSync('/etc/mcp/servers.json', 'utf8'));\n" +
          "const b = JSON.parse(readFileSync('~/.mcp.json', 'utf8'));\n" +
          "const c = JSON.parse(readFileSync('C:\\\\mcp\\\\servers.json', 'utf8'));\n" +
          'new StdioClientTransport({ command: a.command });\n' +
          'new StdioClientTransport({ command: b.command });\n' +
          'new StdioClientTransport({ command: c.command });',
      },
      {
        name: 'a path.resolve that may leave the project (absolute or dynamic segment)',
        code:
          SDK +
          "const a = JSON.parse(readFileSync(path.resolve(process.cwd(), '/etc/mcp.json'), 'utf8'));\n" +
          "const b = JSON.parse(readFileSync(path.resolve(process.cwd(), where), 'utf8'));\n" +
          'new StdioClientTransport({ command: a.command });\n' +
          'new StdioClientTransport({ command: b.command });',
      },
      {
        name: 'a join that starts somewhere other than the project',
        code:
          SDK +
          "const a = JSON.parse(readFileSync(path.join(base, '.mcp.json'), 'utf8'));\n" +
          "const b = JSON.parse(readFileSync(`${os.homedir()}/.mcp.json`, 'utf8'));\n" +
          "const c = JSON.parse(readFileSync(`./${name}.json`, 'utf8'));\n" +
          "const d = JSON.parse(readFileSync(path.join(), 'utf8'));\n" +
          "const e = JSON.parse(readFileSync(path.relative(process.cwd(), 'x'), 'utf8'));\n" +
          'new StdioClientTransport({ command: a.command });\n' +
          'new StdioClientTransport({ command: b.command });\n' +
          'new StdioClientTransport({ command: c.command });\n' +
          'new StdioClientTransport({ command: d.command });\n' +
          'new StdioClientTransport({ command: e.command });',
      },
      {
        name: 'a read whose path is a parameter cannot be shown to be project-relative',
        code:
          SDK +
          "function load(p) { return JSON.parse(readFileSync(p, 'utf8')); }\n" +
          'new StdioClientTransport({ command: load(file).command });',
      },
      {
        name: 'a shadowed process is not the process global',
        code:
          SDK +
          "const process = { cwd: () => '/etc' };\n" +
          "const cfg = JSON.parse(readFileSync(path.join(process.cwd(), 'mcp.json'), 'utf8'));\n" +
          'new StdioClientTransport({ command: cfg.command });',
      },
      {
        name: 'a process.cwd look-alike that is not the cwd() call',
        code:
          SDK +
          "const a = JSON.parse(readFileSync(path.join(process.cwd(x), 'mcp.json'), 'utf8'));\n" +
          "const b = JSON.parse(readFileSync(path.join(process.env.HOME, 'mcp.json'), 'utf8'));\n" +
          "const c = JSON.parse(readFileSync(path.join(proc.cwd(), 'mcp.json'), 'utf8'));\n" +
          'new StdioClientTransport({ command: a.command });\n' +
          'new StdioClientTransport({ command: b.command });\n' +
          'new StdioClientTransport({ command: c.command });',
      },
      {
        name: 'a shadowed JSON / Object is not the builtin',
        code:
          SDK +
          'const JSON = { parse: () => ({ command: "node" }) };\n' +
          'const Object = { values: () => [] };\n' +
          "const cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));\n" +
          'new StdioClientTransport({ command: cfg.command });\n' +
          'for (const s of Object.values(cfg)) new StdioClientTransport({ command: s.command });',
      },
      {
        name: 'calls the rule cannot read: no arguments, a computed method, fs through .call',
        code:
          SDK +
          "import fs from 'node:fs';\n" +
          'new StdioClientTransport({ command: JSON.parse().command });\n' +
          'new StdioClientTransport({ command: Object.values()[0] });\n' +
          'new StdioClientTransport({ command: JSON.parse(readFileSync()).command });\n' +
          'new StdioClientTransport({ command: registry[kind]() });\n' +
          "new StdioClientTransport({ command: JSON.parse(fs.readFileSync.call(fs, '.mcp.json')).command });",
      },
      {
        name: 'a readFile from a non-fs module is not a file read',
        code:
          SDK +
          "import { readFile as load } from './store';\n" +
          "const cfg = JSON.parse(await load('.mcp.json'));\n" +
          'new StdioClientTransport({ command: cfg.command });',
      },
      {
        name: 'an fs call that does not read file contents',
        code:
          SDK +
          "import { readdirSync } from 'node:fs';\n" +
          "const names = readdirSync('.mcp');\n" +
          'new StdioClientTransport({ command: names[0] });',
      },
      {
        name: 'a StdioClientTransport from a non-MCP module',
        code:
          "import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';\n" +
          "import { StdioClientTransport } from './my-transport';\n" +
          'server.registerTool("launch", cfg, async ({ command }) => new StdioClientTransport({ command }));',
      },
      {
        name: 'a file that never imports the MCP SDK',
        code:
          "import { StdioClientTransport } from './transport';\n" +
          'server.registerTool("launch", cfg, async ({ command }) => new StdioClientTransport({ command }));',
      },
      {
        name: 'options passed in from a parameter cannot be read — abstain',
        code:
          SDK +
          'function connect(opts) { return new StdioClientTransport(opts); }\nnew StdioClientTransport();',
      },
      {
        name: 'a static shell script (and a hole in its argv)',
        code:
          SDK +
          "new StdioClientTransport({ command: 'bash', args: ['-c', 'npx -y @scope/server'] });\nnew StdioClientTransport({ command: 'bash', args: ['-c', , 'x'] });",
      },
      {
        name: 'an untrusted value that is a server argument, not the package',
        code: fromProject(
          "new StdioClientTransport({ command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', server.root] });",
        ),
      },
      {
        name: 'an untrusted value before the shell flag, or with no flag at all',
        code: fromProject(
          "new StdioClientTransport({ command: 'bash', args: [server.rcfile, '-c', 'echo ok'] });\n" +
            "new StdioClientTransport({ command: 'sh', args: [server.script] });",
        ),
      },
      {
        name: 'an args array of a command that is neither a shell nor a package runner',
        code: fromProject(
          "new StdioClientTransport({ command: 'node', args: [server.entry] });\n" +
            "new StdioClientTransport({ command: 'docker', args: server.args });",
        ),
      },
      {
        name: 'a package runner whose package is static, or with no package at all',
        code: fromProject(
          "new StdioClientTransport({ command: 'npx', args: ['-y', 'mcp-server-git', ...server.extra] });\n" +
            "new StdioClientTransport({ command: 'npx', args: ['--yes'] });\n" +
            "new StdioClientTransport({ command: 'npx', args: [, '-y'] });",
        ),
      },
      {
        name: 'a closed-set tool argument is the allowlist',
        code:
          SDK +
          "import { z } from 'zod';\n" +
          'server.registerTool("launch", { inputSchema: { bin: z.enum(["mcp-server-git", "mcp-server-time"]) } },\n' +
          '  async ({ bin }) => new StdioClientTransport({ command: bin }));',
      },
      {
        name: 'a tool argument outside any tool handler is not a tool argument',
        code:
          SDK +
          'function launch({ command }) { return new StdioClientTransport({ command }); }',
      },
      {
        name: 'a .json() on something that is not a response',
        code:
          SDK +
          'const entry = cache.json();\nnew StdioClientTransport({ command: entry.command });',
      },
      {
        name: 'a response read that only selects a value',
        code:
          SDK +
          'const res = await fetch(REGISTRY);\n' +
          "new StdioClientTransport({ command: res.ok ? 'npx' : 'uvx' });",
      },
      {
        name: 'an array callback that is not iterating a tainted value',
        code:
          SDK +
          "['a', 'b'].map((bin) => new StdioClientTransport({ command: bin }));\n" +
          'run((bin) => new StdioClientTransport({ command: bin }));\n' +
          'list.map(function (bin) { return new StdioClientTransport({ command: bin }); });\n' +
          'list.map((bin) => bin).forEach((x, bin) => new StdioClientTransport({ command: bin }));\n' +
          'list[method]((bin) => new StdioClientTransport({ command: bin }));',
      },
      {
        name: 'a for-in key and a for-of with no declaration are not followed',
        code:
          SDK +
          "const cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));\n" +
          'for (const key in cfg) new StdioClientTransport({ command: key });\n' +
          'let s;\n' +
          'for (s of cfg.list) new StdioClientTransport({ command: s });',
      },
      {
        name: 'iterating the request object is not iterating the arguments',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (request) => {\n' +
          '  for (const part of request) new StdioClientTransport({ command: part });\n' +
          '  for (const v of Object.values(request)) new StdioClientTransport({ command: v });\n' +
          '  return new StdioClientTransport({ command: JSON.parse(request).command });\n' +
          '});',
      },
      {
        name: 'options held in a const whose command is static',
        code:
          SDK +
          "const params = { command: 'uvx', args: ['mcp-server-time'] };\nnew StdioClientTransport(params);",
      },
      {
        name: 'options with an unreadable key, or from another module, abstain',
        code:
          SDK +
          "import { PARAMS } from './params';\n" +
          'new StdioClientTransport({ [key]: cmd });\n' +
          'new StdioClientTransport(PARAMS);\n' +
          'new StdioClientTransport(makeParams());',
      },
      {
        name: 'options resolved into another file are not followed there — abstain',
        filename: SERVER,
        code:
          SDK +
          "import { TOOLS } from './descriptions';\nnew StdioClientTransport(TOOLS);",
      },
    ],
    invalid: [
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (untrusted stdio command)
        name: 'FN: a tool argument names the server command a hub tool spawns',
        code: inTool(
          'const t = new StdioClientTransport({ command: args.command, args: args.args });\nawait client.connect(t);',
        ),
        errors: [err(TOOL, 'args.command', 'command')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (untrusted stdio command)
        name: 'FN: a project .mcp.json entry chooses the command (Object.entries for-of)',
        code: fromProject(
          'const transport = new StdioClientTransport({ command: server.command, args: server.args, env: server.env });',
        ),
        errors: [err(CONFIG, 'server.command', 'command')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (untrusted stdio command)
        name: 'FN: a config under process.cwd() read with fs/promises (Object.values for-of)',
        code:
          SDK +
          "const raw = await readFile(path.join(process.cwd(), '.cursor', 'mcp.json'), 'utf8');\n" +
          'const config = JSON.parse(raw);\n' +
          'for (const server of Object.values(config.mcpServers)) new StdioClientTransport({ command: server.command });',
        errors: [err(CONFIG, 'server.command', 'command')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (untrusted stdio command)
        name: 'FN: a registry fetched over the network chooses the command',
        code:
          SDK +
          'const res = await fetch(REGISTRY_URL);\n' +
          'const entry = await res.json();\n' +
          'new StdioClientTransport({ command: entry.command, args: entry.args });',
        errors: [err(NET, 'entry.command', 'command')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (untrusted stdio command)
        name: 'FN: a shell -c script taken from project config',
        code: fromProject(
          "new StdioClientTransport({ command: 'sh', args: ['-c', server.script] });",
        ),
        errors: [err(CONFIG, 'server.script', '`sh -c` script')],
      },
      {
        // @found mcp-sdk-security FP/FN audit 2026-10-10, backlog item 9 (untrusted stdio command)
        name: 'FN: npx runs whatever package the tool argument names',
        code: inTool(
          "return new StdioClientTransport({ command: 'npx', args: ['-y', args.pkg] });",
        ),
        errors: [err(TOOL, 'args.pkg', '`npx` package')],
      },
      ...SHELLS.flatMap((shell) =>
        SHELL_FLAGS.map((flag) => ({
          name: `every shell and flag: ${shell} ${flag}`,
          code: fromProject(
            `new StdioClientTransport({ command: '/usr/bin/${shell}', args: ['${flag}', server.script, server.more] });`,
          ),
          errors: [
            err(CONFIG, 'server.script', `\`${shell} ${flag}\` script`),
            err(CONFIG, 'server.more', `\`${shell} ${flag}\` script`),
          ],
        })),
      ),
      ...RUNNERS.map((runner) => ({
        name: `every package runner: ${runner}`,
        code: fromProject(
          `new StdioClientTransport({ command: '${runner}', args: ['--yes', server.pkg, '--port', '1'] });`,
        ),
        errors: [err(CONFIG, 'server.pkg', `\`${runner}\` package`)],
      })),
      {
        name: 'pipx: the package follows the run subcommand',
        code: fromProject(
          "new StdioClientTransport({ command: 'pipx', args: ['run', server.pkg] });",
        ),
        errors: [err(CONFIG, 'server.pkg', '`pipx` package')],
      },
      {
        name: 'pipx with no run subcommand: the first non-flag argument',
        code: fromProject(
          "new StdioClientTransport({ command: 'pipx', args: [server.pkg] });",
        ),
        errors: [err(CONFIG, 'server.pkg', '`pipx` package')],
      },
      {
        name: 'a static runner whose whole args array is untrusted',
        code: fromProject(
          "new StdioClientTransport({ command: 'npx', args: server.args });",
        ),
        errors: [err(CONFIG, 'server.args', '`npx` package')],
      },
      {
        name: 'a static shell whose whole args array is untrusted',
        code: fromProject(
          "new StdioClientTransport({ command: 'bash', args: server.args });",
        ),
        errors: [err(CONFIG, 'server.args', '`bash` script')],
      },
      {
        name: 'a static shell held in a const, and args in a const array',
        code:
          SDK +
          "const SHELL = 'bash';\n" +
          "const cfg = JSON.parse(readFileSync('mcp.json', 'utf8'));\n" +
          "const argv = ['-c', cfg.script];\n" +
          'new StdioClientTransport({ command: SHELL, args: argv });',
        errors: [err(CONFIG, 'cfg.script', '`bash -c` script')],
      },
      {
        name: 'options held in a const object',
        code: inTool(
          'const params = { command: args.bin };\nreturn new StdioClientTransport(params);',
        ),
        errors: [err(TOOL, 'args.bin', 'command')],
      },
      {
        name: 'the options object itself is the untrusted entry',
        code: fromProject('new StdioClientTransport(server);'),
        errors: [err(CONFIG, 'server.command', 'command')],
      },
      {
        name: 'an untrusted entry spread into the options, then extended',
        code: fromProject(
          'new StdioClientTransport({ ...server, stderr: "inherit" });',
        ),
        errors: [err(CONFIG, 'server.command', 'command')],
      },
      {
        name: 'an explicit command after a spread is the one that counts',
        code: fromProject(
          "new StdioClientTransport({ ...server, command: 'node' });\nnew StdioClientTransport({ command: 'node', ...server });",
        ),
        errors: [err(CONFIG, 'server.command', 'command')],
      },
      {
        name: 'a spread runner args array from the entry',
        code: fromProject(
          "new StdioClientTransport({ ...server, command: 'npx' });\nnew StdioClientTransport({ command: 'npx', args: ['-y', ...server.args] });",
        ),
        errors: [
          err(CONFIG, 'server.args', '`npx` package'),
          err(CONFIG, 'server.args', '`npx` package'),
        ],
      },
      {
        name: 'a same-file loader returning the parsed project config',
        code:
          SDK +
          "function loadConfig() { return JSON.parse(readFileSync(path.join(process.cwd(), '.mcp.json'), 'utf8')); }\n" +
          'const cfg = loadConfig();\n' +
          'new StdioClientTransport({ command: cfg.command });',
        errors: [err(CONFIG, 'cfg.command', 'command')],
      },
      {
        name: 'Object.keys of a config: the key names the command',
        code:
          SDK +
          "const cfg = JSON.parse(readFileSync('./mcp.json', 'utf8'));\n" +
          'for (const bin of Object.keys(cfg.servers)) new StdioClientTransport({ command: bin });',
        errors: [err(CONFIG, 'bin', 'command')],
      },
      {
        name: 'iterating the parsed config array directly',
        code:
          SDK +
          "for (const s of JSON.parse(readFileSync('servers.json', 'utf8'))) new StdioClientTransport({ command: s.command });",
        errors: [err(CONFIG, 's.command', 'command')],
      },
      {
        name: 'a .map / .forEach / .flatMap callback over the config entries',
        code:
          SDK +
          "const cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));\n" +
          'Object.entries(cfg.mcpServers).map(([name, s]) => new StdioClientTransport({ command: s.command }));\n' +
          'cfg.servers.forEach(function (s) { new StdioClientTransport({ command: s.command }); });\n' +
          'cfg.groups.flatMap((s) => [new StdioClientTransport({ command: s.command })]);',
        errors: [
          err(CONFIG, 's.command', 'command'),
          err(CONFIG, 's.command', 'command'),
          err(CONFIG, 's.command', 'command'),
        ],
      },
      {
        name: 'a static relative path built with join, resolve or a template from process.cwd()',
        code:
          SDK +
          "const a = JSON.parse(readFileSync(path.join('.vscode', 'mcp.json'), 'utf8'));\n" +
          "const b = JSON.parse(readFileSync(path.resolve('.mcp.json'), 'utf8'));\n" +
          "const c = JSON.parse(readFileSync(path.resolve(process.cwd(), '.vscode/mcp.json'), 'utf8'));\n" +
          "const d = JSON.parse(readFileSync(`${process.cwd()}/.mcp.json`, 'utf8'));\n" +
          'new StdioClientTransport({ command: a.command });\n' +
          'new StdioClientTransport({ command: b.command });\n' +
          'new StdioClientTransport({ command: c.command });\n' +
          'new StdioClientTransport({ command: d.command });',
        errors: [
          err(CONFIG, 'a.command', 'command'),
          err(CONFIG, 'b.command', 'command'),
          err(CONFIG, 'c.command', 'command'),
          err(CONFIG, 'd.command', 'command'),
        ],
      },
      {
        name: 'a config path held in a const',
        code:
          SDK +
          "const CONFIG_PATH = path.posix.join(process.cwd(), '.mcp.json');\n" +
          "const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));\n" +
          'new StdioClientTransport({ command: cfg.command });',
        errors: [err(CONFIG, 'cfg.command', 'command')],
      },
      {
        name: 'fs.promises.readFile, a Buffer toString, and the raw file text as the command',
        code:
          SDK +
          "import fs from 'node:fs';\n" +
          "const a = JSON.parse(await fs.promises.readFile('mcp.json', 'utf8'));\n" +
          "const b = JSON.parse(readFileSync('mcp.json').toString());\n" +
          'new StdioClientTransport({ command: a.command });\n' +
          'new StdioClientTransport({ command: b.command });\n' +
          "new StdioClientTransport({ command: readFileSync('.launcher', 'utf8').trim() });",
        errors: [
          err(CONFIG, 'a.command', 'command'),
          err(CONFIG, 'b.command', 'command'),
          err(CONFIG, 'readFileSync()', 'command'),
        ],
      },
      {
        name: 'CommonJS require of the SDK and fs',
        code:
          "const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');\n" +
          "const fs = require('fs');\n" +
          "const cfg = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'));\n" +
          'new StdioClientTransport({ command: cfg.command });',
        errors: [err(CONFIG, 'cfg.command', 'command')],
      },
      {
        name: 'v2 packages: @modelcontextprotocol/client and @modelcontextprotocol/node',
        code:
          "import { StdioClientTransport } from '@modelcontextprotocol/client';\n" +
          "import * as node from '@modelcontextprotocol/node';\n" +
          'const res = await fetch(url);\n' +
          'const entry = await res.json();\n' +
          'new StdioClientTransport({ command: entry.command });\n' +
          'new node.StdioClientTransport({ command: entry.command });',
        errors: [
          err(NET, 'entry.command', 'command'),
          err(NET, 'entry.command', 'command'),
        ],
      },
      {
        name: 'axios .data, got .body, text() through JSON.parse',
        code:
          SDK +
          "import axios from 'axios';\n" +
          "import got from 'got';\n" +
          'const r1 = await axios.get(url);\n' +
          'const { data } = await axios.get(url);\n' +
          "const r2 = await got(url, { responseType: 'json' });\n" +
          'const r3 = await fetch(url);\n' +
          'const parsed = JSON.parse(await r3.text());\n' +
          'new StdioClientTransport({ command: r1.data.command });\n' +
          'new StdioClientTransport({ command: data.command });\n' +
          'new StdioClientTransport({ command: r2.body.command });\n' +
          'new StdioClientTransport({ command: parsed.command });',
        errors: [
          err(NET, 'r1.data.command', 'command'),
          err(NET, 'axios.get().data.command', 'command'),
          err(NET, 'r2.body.command', 'command'),
          err(NET, 'parsed.command', 'command'),
        ],
      },
      {
        name: 'the low-level Server: request.params.arguments',
        code:
          SDK +
          "import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';\n" +
          'server.setRequestHandler(CallToolRequestSchema, async (request) => {\n' +
          '  const { arguments: a } = request.params;\n' +
          '  return new StdioClientTransport({ command: String(a.command) });\n' +
          '});',
        errors: [err(TOOL, 'a.command', 'command')],
      },
      {
        name: 'a tool argument holding a JSON server definition',
        code: inTool(
          'const def = JSON.parse(args.definition);\nreturn new StdioClientTransport({ command: def.command });',
        ),
        errors: [err(TOOL, 'def.command', 'command')],
      },
      {
        name: 'a tool argument iterated as a list of servers',
        code: inTool(
          'for (const s of args.servers) new StdioClientTransport({ command: s.command });\nfor (const v of Object.values(args)) new StdioClientTransport({ command: v });',
        ),
        errors: [err(TOOL, 's.command', 'command'), err(TOOL, 'v', 'command')],
      },
    ],
  });
});
