const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const TERM = {
  Todo: 'TODO',
  Fixme: 'FIXME',
  Lower: 'todo',
  InWord: 'mastodon',
  CustomTerm: 'HACK',
};

const COND = {
  PastDate: ' [2020-01-01]',
  FutureDate: ' [2999-01-01]',
  VersionReached: ' [>=0.1.0]',
  VersionNot: ' [>=99.0.0]',
  DepAddedPresent: ' [+eslint]',
  DepAddedAbsent: ' [+no-such-package-xyz]',
  DepRemovedPresent: ' [-eslint]',
  DepRemovedAbsent: ' [-no-such-package-xyz]',
  NoCond: '',
  Multiple: ' [2020-01-01, >=0.1.0]',
};

const OPT = {
  Default: undefined,
  CustomTerms: { terms: ['HACK'] },
  DateFormat: { dateFormat: 'DD/MM/YYYY' },
};

module.exports = {
  rule: 'expiring-todo-comments',
  domain: 5 * 10 * 3,
  traces: 1500,
  key: keyOf('term', 'cond', 'opt'),
  config: (s) => OPT[tag(s.opt)],
  code: (s) =>
    src(
      `// ${TERM[tag(s.term)]}${COND[tag(s.cond)]}: drop the legacy path`,
      'export const legacy = true;',
    ),
};
