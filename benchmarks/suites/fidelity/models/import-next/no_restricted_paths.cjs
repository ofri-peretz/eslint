const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Exact: 'server',
  Relative: '../server/db',
  Nested: './app/server',
  Alias: '@/server/db',
  Substring: './observer',
  SegmentPrefix: './server-utils',
  Unrelated: './client',
};

const CONFIG = {
  Defaults: undefined,
  Server: { restricted: ['server'] },
  AppServer: { restricted: ['app/server'] },
};

module.exports = {
  rule: 'no-restricted-paths',
  domain: 13 * 7 * 3,
  traces: 2500,
  key: keyOf('form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
