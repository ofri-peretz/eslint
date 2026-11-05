const { tag } = require('../../lib.cjs');
const { importOf, keyOf, pkg, src } = require('../../imports.cjs');

const SPEC = {
  RelExt: './dep.ts',
  RelNoExt: './dep',
  RelJsMapped: './dep.js',
  RelDir: './lib',
  RelMissing: './missing',
  RelMissingJs: './missing.js',
  Pkg: 'dep-a',
  PkgMissing: 'nope-pkg',
  PkgExported: 'exp-pkg/feature',
  PkgNotExported: 'exp-pkg/internal',
  Scoped: '@scope/pkg',
  Builtin: 'fs/promises',
  NodeBuiltin: 'node:fs',
  HashImport: '#util',
  Alias: '@/dep',
  AliasMissing: '@/missing',
  QuerySuffix: './style.css?inline',
  Protocol: 'virtual:routes',
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
  IgnoreSome: { ignore: ['nope-pkg', './missing'] },
  AllowAll: { allowUnresolved: true },
};

const MOD = 'export const a = 1;\nexport default a;\n';
const CJS = 'exports.a = 1;\n';

module.exports = {
  rule: 'no-unresolved',
  domain: 8 * 18 * 3,
  traces: 4500,
  key: keyOf('form', 'spec', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  files: () => ({
    'package.json': pkg({ imports: { '#util': './src/dep.ts' } }),
    'tsconfig.json': `${JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        moduleResolution: 'bundler',
        paths: { '@/*': ['src/*'] },
      },
    })}\n`,
    'src/dep.ts': MOD,
    'src/lib/index.ts': MOD,
    'src/style.css': '.a { color: red; }\n',
    'node_modules/dep-a/package.json': pkg({ name: 'dep-a', main: 'index.js' }),
    'node_modules/dep-a/index.js': CJS,
    'node_modules/exp-pkg/package.json': pkg({
      name: 'exp-pkg',
      exports: { '.': './main.js', './feature': './feature.js' },
    }),
    'node_modules/exp-pkg/main.js': CJS,
    'node_modules/exp-pkg/feature.js': CJS,
    'node_modules/exp-pkg/internal.js': CJS,
    'node_modules/@scope/pkg/package.json': pkg({
      name: '@scope/pkg',
      main: 'index.js',
    }),
    'node_modules/@scope/pkg/index.js': CJS,
  }),
  code: (s) => src(importOf(FORM[tag(s.form)], SPEC[tag(s.spec)])),
};
