const { num, tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

// One level of each kind, wrapped around `inner` (already indented lines).
const OPEN = {
  If: (i) => [`if (xs[${i}]) {`, '}'],
  Switch: (i) => [`switch (xs[${i}]) {`, '  case 1: {', '  }', '}'],
  For: (i) => [`for (let i${i} = 0; i${i} < n; i${i}++) {`, '}'],
  ForOf: (i) => [`for (const v${i} of xs) {`, '}'],
  ForIn: (i) => [`for (const k${i} in table) {`, '}'],
  While: (i) => [`while (xs[${i}]) {`, '}'],
  DoWhile: (i) => ['do {', `} while (xs[${i}]);`],
};

function wrap(kind, i, inner) {
  const pad = (ls, p) => ls.map((l) => p + l);
  if (kind === 'Switch')
    return [
      `switch (xs[${i}]) {`,
      '  case 1: {',
      ...pad(inner, '    '),
      '    break;',
      '  }',
      '}',
    ];
  const [head, tail] = OPEN[kind](i);
  return [head, ...pad(inner, '  '), tail];
}

function nest(kind, depth) {
  if (kind === 'ElseIfChain') {
    const chain = ['if (xs[0]) {', '  touch(0);'];
    for (let i = 1; i < depth + 3; i++)
      chain.push(`} else if (xs[${i}]) {`, `  touch(${i});`);
    return [...chain, '}'];
  }
  let body = ['touch(0);'];
  for (let i = depth; i >= 1; i--) body = wrap(kind, i, body);
  return body;
}

module.exports = {
  rule: 'nested-complexity-hotspots',
  domain: 8 * 3 * 2 * 2 * 2,
  traces: 1400,
  key: keyOf('kind', 'depth', 'max', 'countConditionals', 'countLoops'),
  config: (s) => {
    const o = {};
    if (tag(s.max) === 'MaxThree') o.maxDepth = 3;
    if (!s.countConditionals) o.countConditionals = false;
    if (!s.countLoops) o.countLoops = false;
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) =>
    src(
      'declare function touch(i: number): void;',
      'export function scan(xs: number[], n: number, table: Record<string, number>) {',
      nest(tag(s.kind), num(s.depth)).map((l) => `  ${l}`),
      '}',
    ),
};
