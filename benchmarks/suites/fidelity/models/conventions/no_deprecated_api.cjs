const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SPELLING = {
  BareCall: [["import { oldFetch } from 'my-library';"], 'oldFetch(url);'],
  MemberCall: [[], 'api.oldFetch(url);'],
  SubscriptCall: [[], "api['oldFetch'](url);"],
  NewExpr: [["import { OldClient } from 'my-library';"], 'new OldClient(url);'],
  RenamedImportCall: [
    ["import { oldFetch as fetchIt } from 'my-library';"],
    'fetchIt(url);',
  ],
  Replacement: [["import { newFetch } from 'my-library';"], 'newFetch(url);'],
  OtherName: [
    ["import { oldFetchMock } from './mocks';"],
    'oldFetchMock(url);',
  ],
};

const APIS = [
  {
    name: 'oldFetch',
    replacement: 'newFetch',
    deprecatedSince: '2024-01-01',
    removalDate: '2099-12-31',
    reason: 'Better error handling',
  },
  {
    name: 'OldClient',
    replacement: 'Client',
    deprecatedSince: '2024-01-01',
    reason: 'Renamed',
  },
];

const OPT = {
  Configured: { apis: APIS },
  WarnFlip: { apis: APIS, warnDaysBeforeRemoval: 5 },
  Unconfigured: undefined,
};

module.exports = {
  rule: 'no-deprecated-api',
  domain: 7 * 3,
  traces: 300,
  key: keyOf('spelling', 'opt'),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const [imports, call] = SPELLING[tag(s.spelling)];
    return src(
      imports,
      'declare const api: Record<string, (u: string) => void>;',
      'export function load(url: string) {',
      `  ${call}`,
      '}',
    );
  },
};
