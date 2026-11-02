const { tag } = require('../../lib.cjs');

const METHOD = {
  Exec: 'exec',
  ExecSync: 'execSync',
  SpawnShellTrue: 'spawn',
  ExecFileArgv: 'execFile',
};

module.exports = {
  rule: 'no-shell-injection',
  domain: 192, // 6 bindings x 4 sinks x 4 args x 2 option values
  traces: 2000,
  key: (s) =>
    `${tag(s.binding)}|${tag(s.sink)}|${tag(s.arg)}|requireEvidence=${s.requireEvidence}`,
  config: (s) => ({ requireModuleEvidence: s.requireEvidence }),
  code: (s) => {
    const m = METHOD[tag(s.sink)];
    const a = {
      Concat: "'git clone ' + repoUrl",
      Template: '`npm install ${pkg}`',
      Literal: "'ls -la'",
      BareIdent: 'command',
    }[tag(s.arg)];
    const [head, callee] = {
      CjsDestructure: [`const { ${m} } = require('child_process');`, m],
      EsmNamedNode: [`import { ${m} } from 'node:child_process';`, m],
      NsBracket: ["import * as cp from 'node:child_process';", `cp['${m}']`],
      CjsRenamed: [
        `const { ${m}: run } = require('node:child_process');`,
        'run',
      ],
      DbMember: [
        "import Database from 'better-sqlite3';\nconst db: any = new Database(':memory:');",
        `db.${m}`,
      ],
      Unbound: [`declare const ${m}: any;`, m],
    }[tag(s.binding)];
    const call = {
      Exec: `${callee}(${a});`,
      ExecSync: `${callee}(${a});`,
      SpawnShellTrue: `${callee}(${a}, { shell: true });`,
      ExecFileArgv: `${callee}('git', ['clone', ${a}]);`,
    }[tag(s.sink)];
    return `${head}\nexport function handler(repoUrl: string, pkg: string, command: string) {\n  ${call}\n}\n`;
  },
  model: (s) => s.verdict,
};
