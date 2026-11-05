const { tag } = require('../../lib.cjs');
const { importOf, keyOf, pkg, src } = require('../../imports.cjs');

const SPEC = {
  SameDir: './util',
  SameParent: '../lib/x',
  OtherPkg: '../../other/src/x',
  OtherPkgRoot: '../../other',
  OtherNameless: '../../tools/src/x',
  IntoMarker: './esm/y',
  FromMarker: '../util',
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
  SameTrue: { allowSamePackage: true },
  SameFalse: { allowSamePackage: false },
};

const MOD = 'export const a = 1;\nexport default a;\n';

module.exports = {
  rule: 'no-relative-packages',
  domain: 8 * 7 * 3,
  traces: 1400,
  key: keyOf('form', 'target', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  filename: (s) =>
    tag(s.target) === 'FromMarker'
      ? 'repo/packages/app/src/esm/app.ts'
      : 'repo/packages/app/src/app.ts',
  files: () => ({
    'repo/package.json': pkg({ name: 'monorepo', private: true }),
    'repo/packages/app/package.json': pkg({ name: 'app' }),
    'repo/packages/app/src/util.ts': MOD,
    'repo/packages/app/lib/x.ts': MOD,
    'repo/packages/app/src/esm/package.json': '{ "type": "module" }\n',
    'repo/packages/app/src/esm/y.ts': MOD,
    'repo/packages/other/package.json': pkg({
      name: 'other',
      main: 'src/x.ts',
    }),
    'repo/packages/other/src/x.ts': MOD,
    'repo/packages/tools/package.json': '{ "private": true }\n',
    'repo/packages/tools/src/x.ts': MOD,
  }),
  code: (s) => src(importOf(FORM[tag(s.form)], SPEC[tag(s.target)])),
};
