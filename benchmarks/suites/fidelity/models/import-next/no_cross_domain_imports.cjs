const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const DIR = { Domains: 'domains', Contexts: 'contexts' };

const SPEC = {
  SameDir: () => './repo',
  SameDomainVia: () => '../user/repo',
  Sibling: () => '../billing/service',
  Full: (d) => `../../${d}/billing/service`,
  SiblingShared: () => '../billing/shared/x',
  SiblingKernel: () => '../billing/kernel/x',
  SiblingApi: () => '../billing/api/x',
  TopShared: () => '../../shared/x',
  Package: () => 'billing',
};

const CONFIG = {
  Defaults: undefined,
  Patterns: { domainPatterns: ['contexts'] },
  SharedKernel: {
    allowedSharedModules: ['shared', 'common', 'utils', 'kernel'],
  },
  Custom: {
    customRules: [
      {
        from: 'domains/user',
        to: ['domains/billing'],
        allowed: ['domains/billing/api'],
      },
    ],
  },
};

module.exports = {
  rule: 'no-cross-domain-imports',
  domain: 13 + 2 * 2 * 9 * 4,
  traces: 1500,
  key: keyOf('focus', 'form', 'dir', 'source', 'spec', 'config'),
  filename: (s) =>
    tag(s.source) === 'InDomain'
      ? `src/${DIR[tag(s.dir)]}/user/handler.ts`
      : 'src/lib/user/handler.ts',
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)](DIR[tag(s.dir)]))),
};
