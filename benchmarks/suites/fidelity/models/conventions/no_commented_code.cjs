const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

/** Two lines of each shape; a single-line form uses the first. */
const SHAPE = {
  Statement: [
    'const total = sum(items);',
    'const average = total / items.length;',
  ],
  Call: ['client.connect();', 'client.send(payload);'],
  Import: ["import { sum } from './math';", "import { log } from './log';"],
  ProseKeyword: [
    'for widget and idx-js backward compatibility',
    'if no key is passed all cookies are returned',
  ],
  ProseParen: [
    'Retries the request (see the retry docs)',
    'Keeps the order stable (callers rely on it)',
  ],
  Link: ['https://example.com/docs/retries', 'https://example.com/docs/order'],
  JsdocExample: ['@example', 'sum(items);'],
};

const FORM = {
  LineSingle: ([a]) => [`// ${a}`],
  LineRun: ([a, b]) => [`// ${a}`, `// ${b}`],
  Block: ([a]) => [`/* ${a} */`],
  BlockMulti: ([a, b]) => ['/*', ` * ${a}`, ` * ${b}`, ' */'],
};

const OPT = {
  Default: undefined,
  SingleFlip: { ignoreSingleLine: true },
  MinLinesFlip: { minLines: 2 },
  TestDefault: undefined,
  TestFlip: { ignoreInTests: false },
};

module.exports = {
  rule: 'no-commented-code',
  domain: 7 * 4 * 5,
  traces: 1400,
  key: keyOf('shape', 'form', 'opt'),
  config: (s) => OPT[tag(s.opt)],
  filename: (s) =>
    ['TestDefault', 'TestFlip'].includes(tag(s.opt))
      ? 'src/app.test.ts'
      : 'src/app.ts',
  code: (s) => {
    const shape = tag(s.shape);
    const comment =
      shape === 'JsdocExample'
        ? ['/**', ' * Adds the items.', ' * @example', ' * sum(items);', ' */']
        : FORM[tag(s.form)](SHAPE[shape]);
    return src(
      'export function run(items: number[]) {',
      comment.map((l) => `  ${l}`),
      '  return items.length;',
      '}',
    );
  },
};
