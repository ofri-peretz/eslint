const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

function file(kind, form) {
  const k = kind.toLowerCase();
  switch (form) {
    case 'Inline':
      return [`export ${k} count = 0;`];
    case 'Destructured':
      return ['const state = { count: 0 };', `export ${k} { count } = state;`];
    case 'Specifier':
      return [`${k} count = 0;`, 'export { count };'];
    case 'Renamed':
      return [`${k} total = 0;`, 'export { total as count };'];
    case 'AsDefault':
      return [`${k} count = 0;`, 'export { count as default };'];
    case 'DefaultExpr':
      return [`${k} count = 0;`, 'export default count;'];
    case 'Reexport':
      return [
        `${k} local = 0;`,
        "export { count } from './state';",
        'console.log(local);',
      ];
    default:
      return [
        "import { count } from './state';",
        `${k} local = count;`,
        'export { count };',
        'console.log(local);',
      ];
  }
}
// The name the module publishes in each form, for `ignoreExports`.
const EXPORTED = { AsDefault: 'default' };

module.exports = {
  rule: 'no-mutable-exports',
  domain: 3 * 8 * 6,
  traces: 1200,
  key: keyOf('kind', 'form', 'opts'),
  config: (s) => {
    switch (tag(s.opts)) {
      case 'IgnoreName':
        return { ignoreExports: [EXPORTED[tag(s.form)] ?? 'count'] };
      case 'IgnoreOther':
        return { ignoreExports: ['other'] };
      case 'AllowSubstring':
        return { allowInFiles: ['src/app'] };
      case 'AllowGlob':
        return { allowInFiles: ['**/src/*.ts'] };
      case 'AllowOther':
        return { allowInFiles: ['legacy/'] };
      default:
        return undefined;
    }
  },
  code: (s) => src(file(tag(s.kind), tag(s.form))),
};
