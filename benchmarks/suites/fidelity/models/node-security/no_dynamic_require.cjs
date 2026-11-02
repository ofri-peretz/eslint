const { tag } = require('../../lib.cjs');

// ctx -> [linted filename, allowContexts entry (or null for none)]
const CONTEXT = {
  Prod: ['src/app.ts', null],
  TestAllowed: ['src/loader.test.ts', 'test'],
  ConfigAllowed: ['webpack.config.ts', 'config'],
  BuildAllowed: ['scripts/build-plugins.ts', 'build'],
  RuntimeAllowed: ['src/runtime/loader.ts', 'runtime'],
  ContextMismatch: ['src/loader.test.ts', 'config'],
};

module.exports = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-dynamic-require',
  domain: 396, // 3 loaders x 11 specifier shapes x allowPatterns set/unset x 6 contexts
  traces: 3600,
  key: (s) =>
    `${tag(s.loader)}|${tag(s.arg)}|allowParam=${s.allowParam}|ctx=${tag(s.ctx)}`,
  filename: (s) => CONTEXT[tag(s.ctx)][0],
  config: (s) => ({
    ...(s.allowParam ? { allowPatterns: ['^pluginName$'] } : {}),
    ...(CONTEXT[tag(s.ctx)][1]
      ? { allowContexts: [CONTEXT[tag(s.ctx)][1]] }
      : {}),
  }),
  code: (s) => {
    const [pre, arg] = {
      Literal: ['', "'./module'"],
      PlainTemplate: ['', '`./module`'],
      ConstTemplate: ["  const d = 'debounce';\n", '`lodash/${d}`'],
      DirnameConcat: ['', "__dirname + '/utils'"],
      PathJoinLiteral: ['', "path.join(__dirname, 'utils')"],
      ConstName: ["  const target = './module';\n", 'target'],
      Param: ['', 'pluginName'],
      ParamTemplate: ['', '`./plugins/${pluginName}`'],
      ParamConcat: ['', "'./plugins/' + pluginName"],
      Reassigned: [
        "  let target = './a';\n  if (pluginName) target = './b';\n",
        'target',
      ],
      ImportedName: ['', 'configuredModule'],
    }[tag(s.arg)];
    const [imp, call] = {
      Require: ['', 'require'],
      ModuleRequire: ['', 'module.require'],
      CreatedRequire: [
        "import { createRequire } from 'node:module';\nconst load = createRequire(__filename);\n",
        'load',
      ],
    }[tag(s.loader)];
    return `import path from 'node:path';\nimport { configuredModule } from './config';\n${imp}export function loadPlugin(pluginName: string) {\n${pre}  return ${call}(${arg});\n}\n`;
  },
  model: (s) => s.verdict,
};
