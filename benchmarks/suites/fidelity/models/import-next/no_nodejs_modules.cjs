const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Bare: 'fs',
  Prefixed: 'node:fs',
  Subpath: 'fs/promises',
  PrefixedSubpath: 'node:fs/promises',
  Uncommon: 'worker_threads',
  LookAlike: 'fs-extra',
  Relative: './fs',
  Electron: 'electron',
};

const CONFIG = {
  Defaults: undefined,
  AllowBare: { allow: ['fs'] },
  AllowPrefixed: { allow: ['node:fs'] },
  AdditionalElectron: { additionalBuiltins: ['electron'] },
};

module.exports = {
  rule: 'no-nodejs-modules',
  domain: 12 * 8 * 4,
  traces: 3000,
  key: keyOf('form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
