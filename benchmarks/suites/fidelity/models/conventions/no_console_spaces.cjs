const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const CALLEE = {
  Global: 'console.log',
  Subscript: "console['log']",
  GlobalThis: 'globalThis.console.log',
  LocalShadow: 'console.log',
  OtherObject: 'logger.log',
};

const TEXT = { Leading: ' items', Trailing: 'items ', NoSpace: 'items' };

module.exports = {
  rule: 'no-console-spaces',
  domain: 5 * 4 * 3 * 2,
  traces: 900,
  key: keyOf('binding', 'position', 'space', 'spelling'),
  code: (s) => {
    const text = TEXT[tag(s.space)];
    const arg = tag(s.spelling) === 'Quoted' ? `'${text}'` : `\`${text}\``;
    const args = {
      Only: [arg],
      First: [arg, 'count'],
      Middle: ['count', arg, 'total'],
      Last: ['count', arg],
    }[tag(s.position)];
    const shadow = tag(s.binding) === 'LocalShadow';
    return src(
      'declare const logger: { log(...a: unknown[]): void };',
      `export function show(count: number, total: number${shadow ? ', console: { log(...a: unknown[]): void }' : ''}) {`,
      `  ${CALLEE[tag(s.binding)]}(${args.join(', ')});`,
      '}',
    );
  },
};
