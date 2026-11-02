const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'no-dynamic-command-string',
  domain: 96, // 12 shapes x 4 args x 2 import styles
  traces: 1100,
  key: (s) => `${tag(s.shape)}|${tag(s.arg)}|${tag(s.imp)}`,
  code: (s) => {
    const esm = tag(s.imp) === 'EsmNode';
    const a = {
      Template: '`kill -9 ${pid}`',
      Concat: "'rm -rf ' + target",
      Ident: 'userCommand',
      Literal: "'ls -la'",
    }[tag(s.arg)];
    // Tagged-template forms: anything non-literal is an interpolation.
    const tpl = tag(s.arg) === 'Literal' ? '`ls -la`' : '`git clone ${url}`';
    const cp = esm
      ? "import { spawn, spawnSync, execFile } from 'node:child_process';"
      : "const { spawn, spawnSync, execFile } = require('child_process');";
    const execa = esm
      ? "import { execaCommand, execaCommandSync, execa } from 'execa';"
      : "const { execaCommand, execaCommandSync, execa } = require('execa');";
    const zx = esm ? "import { $ } from 'zx';" : "const { $ } = require('zx');";
    const [head, call] = {
      SpawnBashC: [cp, `spawn('bash', ['-c', ${a}]);`],
      ExecFileShC: [cp, `execFile('/bin/sh', ['-c', ${a}]);`],
      SpawnSyncZshC: [cp, `spawnSync('zsh', ['-c', ${a}]);`],
      CmdSlashC: [cp, `spawn('cmd.exe', ['/c', ${a}]);`],
      PowershellCommand: [cp, `spawn('powershell', ['-Command', ${a}]);`],
      BashLoginC: [cp, `spawn('bash', ['--login', '-c', ${a}]);`],
      BashErrexit: [cp, `spawn('bash', ['-e', ${a}]);`],
      ExecaCommand: [execa, `await execaCommand(${a});`],
      ExecaCommandSync: [execa, `execaCommandSync(${a});`],
      ZxRaw: [zx, `await $.raw${tpl};`],
      ZxTagged: [zx, `await $${tpl};`],
      DirectProgram: [cp, `spawn('kill', ['-9', ${a}]);`],
    }[tag(s.shape)];
    return `${head}\nexport async function run(pid: number, target: string, userCommand: string, url: string) {\n  ${call}\n}\n`;
  },
  model: (s) => s.verdict,
};
