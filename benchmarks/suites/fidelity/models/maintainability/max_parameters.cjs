const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const PARAMS = {
  Four: 'a: number, b: number, c: number, d: number',
  Five: 'a: number, b: number, c: number, d: number, e: number',
  FourPlusThis: 'this: Base, a: number, b: number, c: number, d: number',
  FiveWithRest: 'a: number, b: number, c: number, d: number, ...rest: number[]',
};

// `this` cannot be declared on a constructor or an arrow; those forms take
// the plain four parameters instead, which count the same.
const noThis = (p) => p.replace('this: Base, ', '');

const FORM = {
  FunctionDecl: (p) => [`export function total(${p}) { return a + b; }`],
  Arrow: (p) => [`export const total = (${noThis(p)}) => a + b;`],
  FunctionExpr: (p) => [
    `export const total = function (${p}) { return a + b; };`,
  ],
  Method: (p) => [
    `export class Cart extends Base { total(${p}) { return a + b; } }`,
  ],
  Constructor: (p) => [
    'export class Cart extends Base {',
    `  constructor(${noThis(p)}) { super(); this.sum = a + b; }`,
    '  sum: number;',
    '}',
  ],
  OverrideMethod: (p) => [
    `export class Cart extends Base { override total(${p}) { return a + b; } }`,
  ],
  ClassArrowProp: (p) => [
    `export class Cart extends Base { total = (${noThis(p)}) => a + b; }`,
  ],
};

module.exports = {
  rule: 'max-parameters',
  domain: 7 * 4 * 2 * 2 * 2,
  traces: 1500,
  key: keyOf(
    'form',
    'count',
    'max',
    'ignoreConstructors',
    'ignoreOverriddenMethods',
  ),
  config: (s) => {
    const o = {};
    if (tag(s.max) === 'MaxSix') o.max = 6;
    if (s.ignoreConstructors) o.ignoreConstructors = true;
    if (s.ignoreOverriddenMethods) o.ignoreOverriddenMethods = true;
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) =>
    src(
      'declare class Base { total(...args: number[]): number; }',
      FORM[tag(s.form)](PARAMS[tag(s.count)]),
    ),
};
