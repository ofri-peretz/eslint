const { tag } = require('../../lib.cjs');
const { importOf, keyOf, pkg, src } = require('../../imports.cjs');

/** The package each listing names (bare). */
const NAME = {
  Deps: 'dep-a',
  Dev: 'dev-a',
  Optional: 'opt-a',
  Peer: 'peer-a',
  Bundled: 'bun-a',
  BundleAlt: 'bunalt-a',
  None: 'nope-a',
  Self: 'app',
};

/** The specifier for a shape, from the listed / unlisted package. */
function specOf(shape, listing) {
  const listed = listing === 'Deps';
  switch (shape) {
    case 'Bare':
    case 'Marker':
      return NAME[listing];
    case 'Subpath':
      return `${NAME[listing]}/sub`;
    case 'Scoped':
      return listed ? '@sc/dep-b' : '@sc/nope-b';
    case 'ScopedSubpath':
      return listed ? '@sc/dep-b/sub' : '@sc/nope-b/sub';
    case 'Builtin':
      return 'fs/promises';
    case 'NodeBuiltin':
      return 'node:fs';
    case 'Relative':
      return './local';
    case 'Hash':
      return '#internal';
    default:
      return 'virtual:routes';
  }
}

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

const OPTS = {
  Defaults: undefined,
  NoDev: { devDependencies: false },
  NoOptional: { optionalDependencies: false },
  NoPeer: { peerDependencies: false },
  NoBundled: { bundledDependencies: false },
  Verbatim: { verbatimModuleSyntax: true },
  Workspace: { resolutionStrategy: 'workspace' },
};

const MANIFEST = pkg({
  name: 'app',
  exports: { '.': './src/index.ts' },
  imports: { '#internal': './src/local.ts' },
  dependencies: { 'dep-a': '1.0.0', '@sc/dep-b': '1.0.0' },
  devDependencies: { 'dev-a': '1.0.0' },
  optionalDependencies: { 'opt-a': '1.0.0' },
  peerDependencies: { 'peer-a': '1.0.0' },
  bundledDependencies: ['bun-a'],
  bundleDependencies: ['bunalt-a'],
});

module.exports = {
  rule: 'no-extraneous-dependencies',
  domain: 13 * 8 * 7 + 9 * 2,
  traces: 14000,
  key: keyOf('form', 'listing', 'opts', 'shape'),
  config: (s) => OPTS[tag(s.opts)],
  filename: (s) =>
    tag(s.shape) === 'Marker' ? 'src/esm/app.ts' : 'src/app.ts',
  files: () => ({
    'package.json': MANIFEST,
    'src/esm/package.json': '{ "type": "module" }\n',
    'src/local.ts': 'export const a = 1;\n',
  }),
  code: (s) => src(FORM[tag(s.form)](specOf(tag(s.shape), tag(s.listing)))),
};
