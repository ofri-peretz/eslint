const { tag, num } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

/** One re-export of module `./m<i>`, in a spelling. */
function reexport(sp, i, last) {
  const m = `'./m${i}'`;
  switch (sp) {
    case 'StarFrom':
      return [`export * from ${m};`];
    case 'StarAs':
      return [`export * as ns${i} from ${m};`];
    case 'NamedFrom':
      return [`export { a${i} } from ${m};`];
    case 'ImportThenExport':
      return [`import { a${i} } from ${m};`, `export { a${i} };`];
    case 'NamespaceThenExport':
      return [`import * as ns${i} from ${m};`, `export { ns${i} };`];
    case 'DefaultThenExportDefault':
      // `export default` once: the last module; the others named re-exports.
      return last
        ? [`import d${i} from ${m};`, `export default d${i};`]
        : [`export { a${i} } from ${m};`];
    case 'TypeStar':
      return [`export type * from ${m};`];
    default:
      return [`export type { T${i} } from ${m};`];
  }
}

const OPTS = {
  Default: undefined,
  Threshold2: { threshold: 2 },
  AllowLocal: { allowWithLocalExports: true },
  Ratio05: { reexportRatio: 0.5 },
  Allowed: { allowedPaths: ['[/\\\\]lib[/\\\\]'] },
  Patterns: { barrelPatterns: ['barrel\\.ts$'] },
};

module.exports = {
  rule: 'no-barrel-file',
  domain: 8 * 2 * 2 * 6,
  traces: 1500,
  key: keyOf('spelling', 'count', 'local', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  filename: (s) =>
    tag(s.opts) === 'Patterns' ? 'src/lib/barrel.ts' : 'src/lib/index.ts',
  code: (s) => {
    const n = num(s.count);
    const lines = [];
    for (let i = 1; i <= n; i++)
      lines.push(...reexport(tag(s.spelling), i, i === n));
    if (s.local) lines.push('export const helper = () => 1;');
    return src(lines);
  },
};
