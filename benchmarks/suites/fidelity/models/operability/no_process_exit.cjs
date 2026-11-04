const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SPELLING = {
  Global: [[], 'process.exit(1);'],
  Subscript: [[], "process['exit'](1);"],
  GlobalThis: [[], 'globalThis.process.exit(1);'],
  DefaultImport: [["import proc from 'node:process';"], 'proc.exit(1);'],
  NamedImport: [["import { exit } from 'process';"], 'exit(1);'],
  RenamedImport: [["import { exit as quit } from 'node:process';"], 'quit(1);'],
  RequireMember: [[], "require('process').exit(1);"],
  Destructured: [[], 'const { exit } = process;', 'exit(1);'],
  LocalShadow: [
    [],
    'const process = { exit: (code: number) => code };',
    'process.exit(1);',
  ],
  OtherMember: [[], 'process.cwd();'],
  ExitCode: [[], 'process.exitCode = 1;'],
  OtherObject: [[], 'worker.exit(1);'],
};

module.exports = {
  rule: 'no-process-exit',
  domain: 12 * 2,
  traces: 300,
  key: keyOf('spelling', 'allowSet'),
  config: (s) => (s.allowSet ? { allow: ['scripts'] } : undefined),
  code: (s) => {
    const [imports, ...body] = SPELLING[tag(s.spelling)];
    return src(
      imports,
      'declare const worker: { exit(code: number): void };',
      'export function stop(failed: boolean) {',
      '  if (!failed) return;',
      body.map((l) => `  ${l}`),
      '}',
    );
  },
};
