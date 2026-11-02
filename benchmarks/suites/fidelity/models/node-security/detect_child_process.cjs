const { tag } = require('../../lib.cjs');

const METHOD = {
  Exec: 'exec',
  ExecSync: 'execSync',
  Spawn: 'spawn',
  ExecFile: 'execFile',
};

module.exports = {
  rule: 'detect-child-process',
  domain: 336, // 7 bindings x 4 methods x 6 args x 2 option values
  traces: 3000,
  key: (s) =>
    `${tag(s.binding)}|${tag(s.method)}|${tag(s.arg)}|unresolved=${s.unresolvedOpt}`,
  config: (s) => ({ reportUnresolvedCommands: s.unresolvedOpt }),
  code: (s) => {
    const m = METHOD[tag(s.method)];
    const argSrc = {
      Literal: "'ls'",
      ReqValue: 'req.body.cmd',
      ReqTemplate: '`ls ${req.query.dir}`',
      Argv: 'process.argv[2]',
      Env: 'process.env.DEPLOY_CMD',
      Unresolved: 'cmd',
    }[tag(s.arg)];
    const call = (callee) =>
      m === 'spawn' || m === 'execFile'
        ? `${callee}(${argSrc}, ['--version']);`
        : `${callee}(${argSrc});`;
    const [head, callee] = {
      CjsDestructure: [`const { ${m} } = require('child_process');`, m],
      CjsNodeDestructure: [
        `const { ${m} } = require('node:child_process');`,
        m,
      ],
      CjsRenamed: [`const { ${m}: run } = require('child_process');`, 'run'],
      EsmNamed: [`import { ${m} } from 'node:child_process';`, m],
      EsmNamespaceNode: [
        `import * as cp from 'node:child_process';`,
        `cp.${m}`,
      ],
      CjsBracket: [`const cp = require('child_process');`, `cp['${m}']`],
      NotModule: [`const ${m} = (...a: unknown[]) => a;`, m],
    }[tag(s.binding)];
    return `${head}\nexport function handler(req: any, cmd: string) {\n  ${call(callee)}\n}\n`;
  },
  model: (s) => s.verdict,
};
