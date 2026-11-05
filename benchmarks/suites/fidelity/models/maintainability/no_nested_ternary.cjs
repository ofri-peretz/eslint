const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const EXPR = {
  Flat: 'a ? one : two',
  InConsequent: 'a ? (b ? one : two) : three',
  InAlternate: 'a ? one : b ? two : three',
  InTest: '(b ? a : c) ? one : two',
  Parenthesized: 'a ? one : (b ? two : three)',
  AsWrapped: 'a ? one : ((b ? two : three) as string)',
  NonNullWrapped: 'a ? one : (b ? maybe : two)!',
};

const CTX = {
  VarInit: (e) => [`  const label = ${e};`, '  return label;'],
  Return: (e) => [`  return ${e};`],
  Argument: (e) => [`  return show(${e});`],
  Jsx: (e) => [`  return <span>{${e}}</span>;`],
  Assignment: (e) => [
    '  let label = one;',
    `  label = ${e};`,
    '  return label;',
  ],
};

const ALLOW = {
  AllowNone: undefined,
  AllowVariable: { allow: ['variable'] },
  AllowReturn: { allow: ['return'] },
  AllowArgument: { allow: ['argument'] },
  AllowJsx: { allow: ['jsx'] },
};

module.exports = {
  rule: 'no-nested-ternary',
  domain: 7 * 5 * 5,
  traces: 1200,
  key: keyOf('shape', 'ctx', 'allow'),
  config: (s) => ALLOW[tag(s.allow)],
  filename: 'src/app.tsx',
  code: (s) =>
    src(
      'declare const one: string;',
      'declare const two: string;',
      'declare const three: string;',
      'declare const maybe: string | undefined;',
      'declare function show(v: unknown): string;',
      'export function render(a: boolean, b: boolean, c: boolean) {',
      CTX[tag(s.ctx)](EXPR[tag(s.shape)]),
      '}',
    ),
};
