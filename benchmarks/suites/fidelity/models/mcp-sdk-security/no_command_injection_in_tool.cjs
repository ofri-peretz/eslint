const { tag } = require('../../lib.cjs');
const { toolProgram } = require('../../mcp-sdk.cjs');

/** Sink tag -> [imports, pre, statement(value)]. */
const SINKS = {
  ExecSync: [
    "import { execSync } from 'node:child_process';",
    '',
    (v) => `execSync(${v});`,
  ],
  ExecNamespace: [
    "import * as cp from 'child_process';",
    '',
    (v) => `cp.exec(${v});`,
  ],
  RequireMember: ['', '', (v) => `require('child_process').execSync(${v});`],
  Promisified: [
    "import { exec } from 'child_process';\nimport { promisify } from 'node:util';",
    'const execAsync = promisify(exec);',
    (v) => `await execAsync(${v});`,
  ],
  ExecCallback: [
    "import cp from 'child_process';",
    '',
    (v) => `cp.exec(${v}, (err, out) => console.log(out));`,
  ],
  Spawn: [
    "import { spawn } from 'child_process';",
    '',
    (v) => `spawn(${v}, ['--help']);`,
  ],
  SpawnShellC: [
    "import { spawn } from 'child_process';",
    '',
    (v) => `spawn('sh', ['-c', ${v}]);`,
  ],
  SpawnShellTrue: [
    "import { spawnSync } from 'child_process';",
    '',
    (v) => `spawnSync('git', ['log', ${v}], { shell: true });`,
  ],
  ExecFileArgv: [
    "import { execFile } from 'child_process';",
    '',
    (v) => `execFile('git', ['log', ${v}]);`,
  ],
  Fork: [
    "import { fork } from 'node:child_process';",
    '',
    (v) => `fork(${v});`,
  ],
  Execa: ["import { execa } from 'execa';", '', (v) => `await execa(${v});`],
  ExecaCommand: [
    "import { execaCommand } from 'execa';",
    '',
    (v) => `await execaCommand(${v});`,
  ],
  ZxFirst: [
    "import { $ } from 'zx';",
    '',
    (v) => `await $\`\${${v}} --version\`;`,
  ],
  ZxQuoted: [
    "import { $ } from 'zx';",
    '',
    (v) => `await $\`git log \${${v}}\`;`,
  ],
  RegexExec: [
    '',
    'const ISSUE_KEY = /([A-Z]+)-(\\d+)/;',
    (v) => `ISSUE_KEY.exec(${v});`,
  ],
  DbExec: [
    "import Database from 'better-sqlite3';",
    "const db = new Database('app.db');",
    (v) => `db.exec(${v});`,
  ],
};

/** Flow tag -> [pre statements, value expression] for argument access `a`. */
const FLOWS = {
  Direct: (a) => ['', a],
  Template: (a) => ['', `\`ls \${${a}}\``],
  Concat: (a) => ['', `'cat ' + ${a}`],
  Derived: (a) => [`const c = ${a}.trim().toLowerCase();`, 'c'],
  HelperReturn: (a) => ['const c = withFlags(' + a + ');', 'c'],
  ArrayElem: (a) => ['for (const part of [' + a + ", 'extra']) {", 'part', '}'],
  OpaqueCall: (a) => ['', `lookupBinary(${a})`],
  Shadowed: () => ["['ls', 'pwd'].forEach((cmd) => {", 'cmd', '});'],
  Lookup: (a) => [
    'const bin = ALLOWED[' + a + ' as keyof typeof ALLOWED];',
    'bin',
  ],
  Compare: (a) => ['', `${a}.length > 3 ? 'ls' : 'pwd'`],
  Literal: () => ['', "'ls -la'"],
};

module.exports = {
  rule: 'no-command-injection-in-tool',
  // Wiring: 7 gates x 6 registrations - 2 invalid = 40, x 2 sinks x 2 flows = 160.
  // Sinks: 16 sinks x 11 flows = 176.
  domain: 336,
  traces: 3000,
  key: (s) =>
    `${tag(s.part)}|${tag(s.gate)}|${tag(s.reg)}|${tag(s.sink)}|${tag(s.flow)}`,
  code: (s) => {
    const [imports, pre, stmt] = SINKS[tag(s.sink)];
    const flow = FLOWS[tag(s.flow)];
    return toolProgram(
      tag(s.gate),
      tag(s.reg),
      (a) => {
        const [p, v, close] = flow(a);
        return [p, stmt(v), close].filter(Boolean).join('\n');
      },
      {
        arg: 'cmd',
        imports: [imports, "import { lookupBinary } from './binaries';"]
          .filter(Boolean)
          .join('\n'),
        pre: [
          pre,
          "function withFlags(s: string) {\n  return s + ' --verbose';\n}",
          "const ALLOWED = { list: 'ls', disk: 'df' } as const;",
        ]
          .filter(Boolean)
          .join('\n'),
        enumValues: "'ls', 'pwd'",
      },
    );
  },
};
