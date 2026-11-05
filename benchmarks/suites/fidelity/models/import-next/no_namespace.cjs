const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const SOURCE = { Pkg: 'lodash', Css: './styles.css', Scoped: '@scope/pkg' };
const IGNORE = { Exact: ['lodash'], Glob: ['*.css'], OtherIgnore: ['react'] };

function line(form, spec) {
  const q = `'${spec}'`;
  switch (form) {
    case 'Namespace':
      return [`import * as ns from ${q};`, 'export const v = ns;'];
    case 'TypeNamespace':
      return [`import type * as ns from ${q};`, 'export type V = typeof ns;'];
    case 'DefaultAndNamespace':
      return [`import d, * as ns from ${q};`, 'export const v = [d, ns];'];
    case 'Named':
      return [`import { a } from ${q};`, 'export const v = a;'];
    case 'Default':
      return [`import d from ${q};`, 'export const v = d;'];
    default:
      return [`export * as ns from ${q};`];
  }
}

module.exports = {
  rule: 'no-namespace',
  domain: 6 * 3 * 4,
  traces: 600,
  key: keyOf('form', 'source', 'ignore'),
  config: (s) => {
    const ignore = IGNORE[tag(s.ignore)];
    return ignore ? { ignore } : undefined;
  },
  code: (s) => src(line(tag(s.form), SOURCE[tag(s.source)])),
};
