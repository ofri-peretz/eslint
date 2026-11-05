const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SHAPE = {
  Lonely: [
    'if (a) {',
    '  refresh();',
    '} else {',
    '  if (b) {',
    '    reload();',
    '  }',
    '}',
  ],
  LonelyWithElse: [
    'if (a) {',
    '  refresh();',
    '} else {',
    '  if (b) {',
    '    reload();',
    '  } else {',
    '    reset();',
    '  }',
    '}',
  ],
  LonelyAfterElseIf: [
    'if (a) {',
    '  refresh();',
    '} else if (b) {',
    '  reload();',
    '} else {',
    '  if (c) {',
    '    reset();',
    '  }',
    '}',
  ],
  LonelyBesideComment: [
    'if (a) {',
    '  refresh();',
    '} else {',
    '  // only when b',
    '  if (b) {',
    '    reload();',
    '  }',
    '}',
  ],
  WithSibling: [
    'if (a) {',
    '  refresh();',
    '} else {',
    '  if (b) {',
    '    reload();',
    '  }',
    '  reset();',
    '}',
  ],
  InConsequent: ['if (a) {', '  if (b) {', '    reload();', '  }', '}'],
  ElseIfChain: [
    'if (a) {',
    '  refresh();',
    '} else if (b) {',
    '  reload();',
    '} else {',
    '  reset();',
    '}',
  ],
  ElseNonIf: ['if (a) {', '  refresh();', '} else {', '  reload();', '}'],
};

module.exports = {
  rule: 'no-lonely-if',
  domain: 8 * 2,
  traces: 200,
  key: keyOf('shape', 'allowSet'),
  config: (s) => (s.allowSet ? { allow: ['refresh'] } : undefined),
  code: (s) =>
    src(
      'declare function refresh(): void;',
      'declare function reload(): void;',
      'declare function reset(): void;',
      'export function sync(a: boolean, b: boolean, c: boolean) {',
      SHAPE[tag(s.shape)].map((l) => `  ${l}`),
      '}',
    ),
};
