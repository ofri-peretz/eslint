const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Bare: 'fs',
  Uncommon: 'worker_threads',
  Subpath: 'fs/promises',
  Prefixed: 'node:fs',
  Upper: 'FS',
  FakeSubpath: 'events/foo',
  TrailingSlash: 'punycode/',
  Package: 'lodash',
  Relative: './fs',
  Custom: 'custom-builtin',
};

module.exports = {
  rule: 'prefer-node-protocol',
  domain: 13 * 10 * 2,
  traces: 2000,
  key: keyOf('form', 'spec', 'config'),
  config: (s) =>
    tag(s.config) === 'Additional'
      ? { additionalModules: ['custom-builtin'] }
      : undefined,
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
