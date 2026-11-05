const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Clean: './dep',
  InnerDot: './lib/./dep',
  UpDown: './lib/../dep',
  DoubleSlash: './lib//dep',
  DotUp: './../src/dep',
  ParentReentry: '../src/dep',
  ParentClean: '../shared/dep',
  Index: './lib/index',
  IndexExt: './lib/index.js',
  IndexShadowed: './both/index',
  DirIndex: './index',
  TrailingSlash: './lib/',
};

const FORM = {
  Import: 'Default',
  TypeOnly: 'TypeOnly',
  SideEffect: 'SideEffect',
  ExportNamed: 'ExportNamed',
  ExportAll: 'ExportAll',
  Dynamic: 'Dynamic',
  Require: 'Require',
  ImportEquals: 'ImportEquals',
};

const OPTS = {
  Default: undefined,
  UselessIndex: { noUselessIndex: true },
  NoCommonjs: { commonjs: false },
};

const MOD = 'export const a = 1;\nexport default a;\n';

module.exports = {
  rule: 'no-useless-path-segments',
  domain: 8 * 12 * 3,
  traces: 2400,
  key: keyOf('form', 'spec', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  files: () => ({
    'src/dep.ts': MOD,
    'src/index.ts': MOD,
    'src/lib/dep.ts': MOD,
    'src/lib/index.ts': MOD,
    'src/both.ts': MOD,
    'src/both/index.ts': MOD,
    'shared/dep.ts': MOD,
  }),
  code: (s) => src(importOf(FORM[tag(s.form)], SPEC[tag(s.spec)])),
};
