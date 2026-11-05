const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

// Example lines; `LineComments` may hold the raw two characters, a block
// comment never can.
const CONTENT = {
  SplitConcat: ["const re = new RegExp('/foo*' + '/g');", 'apply(re);'],
  FencedEscaped: ['```js', 'const re = /foo*\\/g;', '```'],
  EscapedSlash: ["const accept = 'text/*\\/json';"],
  SpacedStar: ["const glob = 'src/** /index.ts';"],
  GlobQuoted: ["const mime = '*' + '/*';"],
  NoPattern: ['const total = sum([1, 2, 3]);'],
};
const RAW = {
  SplitConcat: "const tail = '*/';",
  FencedEscaped: 'const re = /foo*/g;',
  EscapedSlash: "const accept = 'text/*';",
  SpacedStar: "const glob = 'src/**/index.ts';",
  GlobQuoted: "const mime = '*/*';",
  NoPattern: 'const total = sum([1, 2, 3]);',
};

module.exports = {
  rule: 'no-jsdoc-terminator-in-example',
  domain: 6 * 4,
  traces: 300,
  key: keyOf('content', 'host'),
  code: (s) => {
    const c = tag(s.content);
    const lines = CONTENT[c];
    const doc = (open, pad) =>
      [
        `${pad}${open}`,
        `${pad} * Sum a list.`,
        `${pad} *`,
        `${pad} * @example`,
        ...lines.map((l) => `${pad} *   ${l}`),
        `${pad} * @returns the total`,
        `${pad} */`,
      ].join('\n');
    const fn =
      'export function sum(xs: number[]) {\n  return xs.reduce((a, b) => a + b, 0);\n}';
    switch (tag(s.host)) {
      case 'FunctionJsdoc':
        return `${doc('/**', '')}\n${fn}\n`;
      case 'MethodJsdoc':
        return `export class Totals {\n${doc('/**', '  ')}\n  sum(xs: number[]) {\n    return xs.reduce((a, b) => a + b, 0);\n  }\n}\n`;
      case 'PlainBlock':
        return `${doc('/*', '')}\n${fn}\n`;
      default:
        return `// Sum a list.\n// @example\n//   ${RAW[c]}\n${fn}\n`;
    }
  },
};
