const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  NoExt: './dep',
  TsExt: './dep.ts',
  JsMapped: './dep.js',
  RealJs: './real.js',
  RealJsNoExt: './real',
  Dir: './lib',
  Json: './data.json',
  Missing: './missing',
  MissingJs: './missing.js',
  DottedName: './source.config',
  Package: 'lodash/fp',
};

const FORM = {
  Import: 'Default',
  SideEffect: 'SideEffect',
  ExportNamed: 'ExportNamed',
  ExportAll: 'ExportAll',
  Dynamic: 'Dynamic',
  Require: 'Require',
  ImportEquals: 'ImportEquals',
};

const OPTS = {
  Default: undefined,
  AlwaysAll: { default: 'always' },
  TsAlways: { pattern: { ts: 'always' } },
  AlwaysButTs: { default: 'always', pattern: { ts: 'never' } },
  NeverAll: { default: 'never' },
};

const MOD = 'export const a = 1;\nexport default a;\n';

module.exports = {
  rule: 'extensions',
  domain: 7 * 11 * 5,
  traces: 3300,
  key: keyOf('form', 'spec', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  files: () => ({
    'src/dep.ts': MOD,
    'src/real.js': MOD,
    'src/lib/index.ts': MOD,
    'src/data.json': '{ "a": 1 }\n',
    'src/source.config.ts': MOD,
  }),
  code: (s) => src(importOf(FORM[tag(s.form)], SPEC[tag(s.spec)])),
};
