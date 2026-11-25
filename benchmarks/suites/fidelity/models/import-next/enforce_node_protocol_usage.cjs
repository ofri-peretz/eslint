const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Bare: 'fs',
  Subpath: 'fs/promises',
  Prefixed: 'node:fs',
  PrefixedSubpath: 'node:fs/promises',
  SchemeOnly: 'node:test',
  FakePrefixed: 'node:unicorn',
  TrailingSlash: 'punycode/',
  Package: 'lodash',
  Relative: './fs',
};

module.exports = {
  rule: 'enforce-node-protocol-usage',
  domain: 13 * 9 * 2,
  traces: 2000,
  key: keyOf('form', 'spec', 'mode'),
  config: (s) => (tag(s.mode) === 'Always' ? 'always' : 'never'),
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
