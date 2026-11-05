const path = require('node:path');
const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const FILE = {
  Platform: 'src/platform/features/a.ts',
  Payments: 'src/payments/hooks/b.ts',
  Unowned: 'scripts/build.ts',
};
const DIR = {
  ToPlatform: 'platform',
  ToPayments: 'payments',
  ToAuth: 'auth',
  ToUtils: 'utils',
  ToLib: 'lib',
};

function spec(s) {
  const dir = DIR[tag(s.target)];
  const rooted = `src/${dir}/x/y`;
  switch (tag(s.spelling)) {
    case 'Rooted':
      return rooted;
    case 'Relative':
      return path.posix.relative(
        path.posix.dirname(FILE[tag(s.source)]),
        rooted,
      );
    default:
      return `@company/${dir}`;
  }
}

const team = (name, allowed) => ({
  team: name,
  paths: [`src/${name}/**`, `@company/${name}`],
  allowedDependencies: allowed,
});
const TEAMS = [
  team('platform', ['shared']),
  team('payments', ['platform', 'shared']),
  team('auth', ['shared']),
];

module.exports = {
  rule: 'enforce-team-boundaries',
  domain: 13 + 3 * 5 * 3 * 2,
  traces: 1200,
  key: keyOf('focus', 'form', 'source', 'target', 'spelling', 'config'),
  filename: (s) => FILE[tag(s.source)],
  config: (s) => ({
    teams: TEAMS,
    sharedPaths: ['src/utils/**'],
    allowExternalPackages: tag(s.config) === 'AllowExternal',
  }),
  code: (s) => src(importOf(tag(s.form), spec(s))),
};
