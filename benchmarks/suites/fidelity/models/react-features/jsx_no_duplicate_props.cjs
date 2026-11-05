const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const PAIR = {
  Same: ['title="a"', 'title="b"'],
  CaseDiff: ['onClick={handler}', 'onclick={handler}'],
  Different: ['title="a"', 'id="b"'],
  Namespaced: ['xlink:href="#a"', 'xlink:href="#b"'],
  NamespacedDiff: ['xlink:href="#a"', 'xml:lang="en"'],
};

module.exports = {
  rule: 'jsx-no-duplicate-props',
  domain: 5 * 2 * 2 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('pair', 'spread', 'ignoreCase', 'target'),
  config: (s) =>
    tag(s.ignoreCase) === 'IgnoreCaseOn' ? { ignoreCase: true } : undefined,
  code: (s) => {
    const [a, b] = PAIR[tag(s.pair)];
    const mid = tag(s.spread) === 'SpreadBetween' ? ' {...rest}' : '';
    const el = tag(s.target) === 'Intrinsic' ? 'use' : 'Icon';
    return program(`<${el} ${a}${mid} ${b} />`, {
      pre: ["import { Icon } from './ui';"],
    });
  },
};
