const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Pkg: 'lodash',
  PkgSub: 'lodash/get',
  PkgDeep: 'lodash/fp/get',
  PkgTrailing: 'lodash/',
  Scoped: '@o/ui',
  ScopedSub: '@o/ui/button',
  ScopedDeep: '@o/ui/button/icon',
  Rel: './utils',
  RelDeep: './utils/helpers',
  RelParentDeep: '../../a/b',
  RelTrailing: './utils/',
};

const CONFIG = {
  Defaults: undefined,
  Max0: { maxDepth: 0 },
  Max2: { maxDepth: 2 },
  Allow: { allow: ['lodash/**'] },
  Forbid: { forbid: ['lodash/get'] },
  Ignore: { ignorePaths: ['./utils/**'] },
  Suggest: { strategy: 'suggest' },
};

module.exports = {
  rule: 'no-internal-modules',
  domain: 13 * 2 + 11 * 7,
  traces: 1500,
  key: keyOf('focus', 'form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
