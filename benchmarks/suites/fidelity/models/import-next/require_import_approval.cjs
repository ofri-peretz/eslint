const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Blocked: 'axios',
  BlockedSub: 'axios/lib/x',
  Pending: '@acme/sdk',
  PendingSub: '@acme/sdk/x',
  Approved: 'lodash',
  Unlisted: 'left-pad',
  Relative: './local',
  Builtin: 'fs',
  NodeBuiltin: 'node:fs',
  Hash: '#lib/x',
  AliasAt: '@/lib',
  Tilde: '~/lib',
};

const PACKAGES = [
  { package: 'axios', status: 'blocked' },
  { package: '@acme/*', status: 'pending' },
  { package: 'lodash', status: 'approved' },
];
const CONFIG = {
  Defaults: { packages: [] },
  Policy: { packages: PACKAGES },
  Deny: { packages: PACKAGES, defaultPolicy: 'deny' },
  DenyIgnore: {
    packages: PACKAGES,
    defaultPolicy: 'deny',
    ignorePatterns: ['axios'],
  },
};

module.exports = {
  rule: 'require-import-approval',
  domain: 11 + 12 * 4,
  traces: 1000,
  key: keyOf('focus', 'form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
