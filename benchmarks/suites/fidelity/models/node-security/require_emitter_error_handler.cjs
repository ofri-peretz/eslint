const { tag } = require('../../lib.cjs');

const FACTORY = {
  HttpRequest: ['http', 'request', 'url'],
  HttpGet: ['http', 'get', 'url'],
  HttpsRequest: ['https', 'request', 'url'],
  HttpsGet: ['https', 'get', 'url'],
  Spawn: ['child_process', 'spawn', "'git', ['log']"],
  Fork: ['child_process', 'fork', "'./worker.js'"],
  Exec: ['child_process', 'exec', "'git log'"],
  ExecFile: ['child_process', 'execFile', "'git', ['log']"],
};

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'require-emitter-error-handler',
  domain: 216, // 8 factories x 9 uses x 3 import spellings
  traces: 1500,
  key: (s) => `${tag(s.factory)}|${tag(s.use)}|${tag(s.spelling)}`,
  config: () => undefined,
  code: (s) => {
    const [mod, name, args] = FACTORY[tag(s.factory)];
    const [head, callee] = {
      DefaultImport: [`import m from 'node:${mod}';`, `m.${name}`],
      NamedImport: [`import { ${name} as make } from '${mod}';`, 'make'],
      Require: [`const lib = require('node:${mod}');`, `lib.${name}`],
    }[tag(s.spelling)];
    const create = `${callee}(${args})`;
    const body = {
      Bare: `const e = ${create};\n  e.on('data', log);`,
      OnError: `const e = ${create};\n  e.on('error', log);`,
      OnceError: `const e = ${create};\n  e.once('error', log);`,
      AddListenerError: `const e = ${create};\n  e.addListener('error', log);`,
      OnClose: `const e = ${create};\n  e.on('close', log);`,
      ErrorAfterUse: `const e = ${create};\n  e.on('data', log);\n  e.on('error', log);`,
      PipeDest: `const e = ${create};\n  source.pipe(e);`,
      Returned: `const e = ${create};\n  return e;`,
      PassedToFn: `const e = ${create};\n  attach(e);`,
    }[tag(s.use)];
    return `${head}\ndeclare const url: string, source: any, log: any, attach: any;\nexport function run() {\n  ${body}\n}\n`;
  },
  model: (s) => s.verdict,
};
