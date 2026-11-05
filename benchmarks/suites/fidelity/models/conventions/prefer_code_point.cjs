const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const SPELLING = {
  Dot: 'text.charCodeAt(0)',
  Subscript: "text['charCodeAt'](0)",
  Optional: 'maybe?.charCodeAt(0)',
  NonNull: 'maybe!.charCodeAt(0)',
  LiteralReceiver: "'a'.charCodeAt(0)",
  CodePoint: 'text.codePointAt(0)',
  DynamicKey: 'text[method](0)',
  BareFunction: 'charCodeAt(0)',
};

module.exports = {
  rule: 'prefer-code-point',
  domain: 8,
  traces: 200,
  key: keyOf('spelling'),
  code: (s) =>
    src(
      'declare function charCodeAt(i: number): number;',
      "export function first(text: string, maybe: string | undefined, method: 'codePointAt') {",
      `  return ${SPELLING[tag(s.spelling)]};`,
      '}',
    ),
};
