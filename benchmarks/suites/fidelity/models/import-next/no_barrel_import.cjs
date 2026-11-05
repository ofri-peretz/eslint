const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Known: './components',
  Other: './utils',
  Pkg: 'ui-kit',
  PkgSub: 'ui-kit/button',
};

const FORM = {
  Default: (q) => importOf('Default', q),
  Named: (q) => importOf('Named', q),
  Namespace: (q) => importOf('Namespace', q),
  SideEffect: (q) => importOf('SideEffect', q),
  TypeOnly: (q) => importOf('TypeOnly', q),
  InlineType: (q) => importOf('InlineType', q),
  ExportType: (q) => `export type { a } from ${JSON.stringify(q)};`,
  ExportNamed: (q) => importOf('ExportNamed', q),
  ExportAll: (q) => importOf('ExportAll', q),
  ExportAllAs: (q) => importOf('ExportAllAs', q),
  Require: (q) => importOf('Require', q),
  Dynamic: (q) => importOf('Dynamic', q),
  ImportEquals: (q) => importOf('ImportEquals', q),
};

const KNOWN = ['components$', '^ui-kit$'];
const OPTS = {
  Unconfigured: undefined,
  Known_: { knownBarrels: KNOWN },
  KnownNoNM: { knownBarrels: KNOWN, ignoreNodeModules: false },
  KnownIgnored: { knownBarrels: KNOWN, ignoredPackages: ['^ui-kit'] },
  KnownIgnoredNoNM: {
    knownBarrels: KNOWN,
    ignoredPackages: ['^ui-kit'],
    ignoreNodeModules: false,
  },
};

module.exports = {
  rule: 'no-barrel-import',
  domain: 13 * 4 * 5,
  traces: 2000,
  key: keyOf('form', 'target', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => src(FORM[tag(s.form)](SPEC[tag(s.target)])),
};
