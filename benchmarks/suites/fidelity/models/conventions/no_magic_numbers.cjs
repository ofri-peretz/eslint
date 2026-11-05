const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

/** Statement lines for the site, given the number as written (`n`). */
const SITE = {
  Plain: (n) => [`setTimeout(poll, ${n});`],
  Negative: (n) => [`move(-${n});`],
  ArrayIndex: (n) => [`use(items[${n}]);`],
  ObjectValue: (n) => [`configure({ timeout: ${n} });`],
  LoopBound: (n) => [`for (let i = 0; i < ${n}; i++) use(i);`],
  LengthCompare: (n) => [`if (items.length === ${n}) use(0);`],
  DefaultValue: (n) => [`const f = (x = ${n}) => x;`, 'use(f());'],
  EnumMember: (n) => [`enum Level { High = ${n} }`, 'use(Level.High);'],
  Bitwise: (n) => [`use(flags & ${n});`],
  NumericArray: (n) => [`use([${n}, ${n}]);`],
  ConstArithmetic: (n) => [`const WINDOW_MS = ${n} * ${n};`, 'use(WINDOW_MS);'],
  NamedDecl: (n) => [`const retries = ${n};`, 'use(retries);'],
  NumericKey: (n) => [`use({ ${n}: 'x' });`],
};

/** The option a site's `flip` sets to its non-default value. */
const FLIP = {
  ArrayIndex: { ignoreArrayIndexes: false },
  ObjectValue: { detectObjects: true },
  LoopBound: { ignoreLoopBounds: false },
  LengthCompare: { ignoreLengthComparisons: false },
  DefaultValue: { ignoreDefaultValues: false },
  EnumMember: { ignoreEnums: false },
  Bitwise: { ignoreBitwiseExpressions: true },
  NumericArray: { ignoreNumericArrays: false },
  ConstArithmetic: { namedConstArithmetic: false },
  // No option governs these; the flip lists an unrelated number.
  NamedDecl: { ignore: [7] },
  NumericKey: { ignore: [7] },
};

const num = (s) => (tag(s.value) === 'Small' ? 2 : 42);

module.exports = {
  rule: 'no-magic-numbers',
  domain: 13 * 2 * 2,
  traces: 500,
  key: keyOf('site', 'flip', 'value'),
  config: (s) => {
    if (!s.flip) return undefined;
    const site = tag(s.site);
    if (site === 'Plain') return { ignore: [num(s)] };
    if (site === 'Negative') return { ignore: [-num(s)] };
    return FLIP[site];
  },
  code: (s) =>
    src(
      'declare function setTimeout(f: () => void, ms: number): void;',
      'declare function poll(): void;',
      'declare function move(n: number): void;',
      'declare function use(v: unknown): void;',
      'declare function configure(o: object): void;',
      'declare const items: number[];',
      'declare const flags: number;',
      SITE[tag(s.site)](num(s)),
    ),
};
