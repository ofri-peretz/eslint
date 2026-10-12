// Renders one state of models/mcp-sdk-security.no-command-injection-in-tool.qnt.
// Spells the shape only; the verdict is the model's `expected`.
import { bind, v1Tool } from './_mcp.mjs';

export const plugin = 'mcp-sdk-security';
export const rule = 'no-command-injection-in-tool';
export const dimensions = ['transform', 'binding', 'sink'];

const TRANSFORM = {
  NoTransform: (e) => e,
  Trim: (e) => `${e}.trim()`,
  Template: (e) => '`git log ${' + e + '}`',
  Concat: (e) => `'ls ' + ${e}`,
  Allowlist: (e) => `ALLOWED[${e}]`,
  QuotedTemplate: (e) => '`git log ${quote([' + e + '])}`',
  Selected: (e) => `${e}.length > 3 ? 'ls' : 'pwd'`,
};

const SINK = {
  ExecNamed: [
    "import { exec } from 'node:child_process';",
    (v) => `exec(${v});`,
  ],
  ExecSyncNamespace: [
    "import * as cp from 'child_process';",
    (v) => `cp.execSync(${v});`,
  ],
  PromisifiedExec: [
    "import { exec } from 'node:child_process';\nimport { promisify } from 'node:util';\nconst run = promisify(exec);",
    (v) => `await run(${v});`,
  ],
  RequireSpawn: ['', (v) => `require('node:child_process').spawn(${v});`],
  ExecaCommand: [
    "import { execaCommand } from 'execa';",
    (v) => `await execaCommand(${v});`,
  ],
  ShellDashC: [
    "import { spawn } from 'node:child_process';",
    (v) => `spawn('sh', ['-c', ${v}]);`,
  ],
  ExecFileArgv: [
    "import { execFile } from 'node:child_process';",
    (v) => `execFile('git', ['log', ${v}]);`,
  ],
  RegExpExec: ['', (v) => `/^[A-Z]+-\\d+$/.exec(${v});`],
  DatabaseExec: [
    "import Database from 'better-sqlite3';\nconst db = new Database('app.db');",
    (v) => `db.exec(${v});`,
  ],
};

/** @param {Record<string, string>} c one case: dimension -> variant */
export function render(c) {
  const [imp, sink] = SINK[c.sink];
  const { top, body } = bind(c.binding, TRANSFORM[c.transform]('cmd'), sink);
  return [
    imp,
    "import { quote } from 'shell-quote';",
    "const ALLOWED: Record<string, string> = { log: 'git log', status: 'git status' };",
    top,
    v1Tool('cmd', body),
    '',
  ]
    .filter(Boolean)
    .join('\n');
}
