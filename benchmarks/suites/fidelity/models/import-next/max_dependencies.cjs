const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Package: 'probe',
  PackageSub: 'probe/sub',
  Scoped: '@s/probe',
  ScopedSub: '@s/probe/sub',
  SamePkgSub: 'pkg0/sub',
  Relative: './probe',
  Parent: '../probe',
  Absolute: '/abs/probe',
  Hash: '#internal/probe',
  Builtin: 'fs',
  BuiltinSub: 'fs/promises',
  BuiltinUncommon: 'worker_threads',
  Prefixed: 'node:fs',
};

const MAX = { Ten: 10, Two: 2 };

module.exports = {
  rule: 'max-dependencies',
  domain: 12 * 13 + 2 * 2 * 2 * 2 * 3,
  traces: 2500,
  key: keyOf(
    'focus',
    'form',
    'spec',
    'max',
    'ignoreType',
    'ignoreProbe',
    'ignoreFiles',
  ),
  filename: (s) =>
    tag(s.ignoreFiles) === 'Matching' ? 'src/app.test.ts' : 'src/app.ts',
  config: (s) => ({
    max: MAX[tag(s.max)],
    ignoreTypeImports: s.ignoreType,
    ...(s.ignoreProbe && { ignoreImports: ['probe'] }),
    ...(tag(s.ignoreFiles) !== 'NoIgnore' && { ignoreFiles: ['*.test.ts'] }),
  }),
  code: (s) => {
    const base = Array.from(
      { length: MAX[tag(s.max)] },
      (_, i) => `import p${i} from 'pkg${i}';`,
    );
    return src(base, importOf(tag(s.form), SPEC[tag(s.spec)]));
  },
};
