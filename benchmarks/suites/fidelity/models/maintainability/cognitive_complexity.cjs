const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const ELEM = {
  Flat: ['touch(n);'],
  IfFlat: ['if (a) touch(1);'],
  IfElse: ['if (a) touch(1);', 'else touch(2);'],
  ElseIfChain: ['if (a) touch(1);', 'else if (b) touch(2);', 'else touch(3);'],
  NestedIf: ['if (a) {', '  if (b) touch(1);', '}'],
  ForWithIf: ['for (const x of xs) {', '  if (x) touch(x);', '}'],
  Ternary: ['touch(a ? 1 : 2);'],
  LogicalSame: ['if (a && b && c) touch(1);'],
  LogicalMixed: ['if ((a && b) || c) touch(1);'],
  Nullish: ['touch(maybe ?? n);'],
  TryCatch: ['try {', '  touch(1);', '} catch {', '  touch(2);', '}'],
  While: ['while (a) touch(1);'],
  DoWhile: ['do {', '  touch(1);', '} while (a);'],
  ForIn: ['for (const k in xs) touch(Number(k));'],
  Recursion: ['if (n > 0) f(n - 1, a, b, c, xs);'],
  ShadowedSelfCall: ['const f = (k: number) => k;', 'if (a) touch(f(n));'],
};

const PARAMS = 'n: number, a: boolean, b: boolean, c: boolean, xs: number[]';

const SHAPE = {
  Decl: (body) => [`export function f(${PARAMS}): void {`, ...body, '}'],
  Arrow: (body) => [`export const f = (${PARAMS}): void => {`, ...body, '};'],
  Method: (body) => [
    'export class K {',
    `  f(${PARAMS}): void {`,
    ...body.map((l) => `  ${l}`),
    '  }',
    '}',
  ],
  ClassArrowProp: (body) => [
    'export class K {',
    `  f = (${PARAMS}): void => {`,
    ...body.map((l) => `  ${l}`),
    '  };',
    '}',
  ],
};

const MAX = { MaxDefault: undefined, MaxOne: 1, MaxTwo: 2 };

module.exports = {
  rule: 'cognitive-complexity',
  domain: 16 * 2 * 3 * 2 + 15 * 2 * 3 * 2,
  traces: 1600,
  key: keyOf('shape', 'elem', 'max', 'includeMetrics'),
  config: (s) => {
    const o = {};
    if (MAX[tag(s.max)] !== undefined) o.maxComplexity = MAX[tag(s.max)];
    if (!s.includeMetrics) o.includeMetrics = false;
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) =>
    src(
      'declare function touch(v: number): void;',
      'declare const maybe: number | undefined;',
      SHAPE[tag(s.shape)](ELEM[tag(s.elem)].map((l) => `  ${l}`)),
    ),
};
