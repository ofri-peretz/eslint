/**
 * Shared import spellings for the import-next models (`models/import-next/`).
 *
 * A rule about imports has to see every way a module is pulled in, so each
 * model samples a `Form` and renders it here. `binding` is the local name the
 * form introduces (when it introduces one), `name` the export it takes.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
const { keyOf, src } = require('./quality.cjs');

/**
 * Every static and dynamic way a module is loaded or re-exported:
 *
 *   - `Default`       `import x from 'm';`
 *   - `Namespace`     `import * as x from 'm';`
 *   - `Named`         `import { a } from 'm';`
 *   - `Renamed`       `import { a as x } from 'm';`
 *   - `TypeOnly`      `import type { a } from 'm';`
 *   - `InlineType`    `import { type a } from 'm';`
 *   - `SideEffect`    `import 'm';`
 *   - `ExportNamed`   `export { a } from 'm';`
 *   - `ExportAll`     `export * from 'm';`
 *   - `ExportAllAs`   `export * as x from 'm';`
 *   - `Require`       `const x = require('m');`
 *   - `Dynamic`       `const load = () => import('m');`
 *   - `ImportEquals`  `import x = require('m');` (TS)
 */
const FORMS = [
  'Default',
  'Namespace',
  'Named',
  'Renamed',
  'TypeOnly',
  'InlineType',
  'SideEffect',
  'ExportNamed',
  'ExportAll',
  'ExportAllAs',
  'Require',
  'Dynamic',
  'ImportEquals',
];

/** The statement that loads `spec` in `form`, as one line of source. */
function importOf(form, spec, { binding = 'x', name = 'a' } = {}) {
  const q = JSON.stringify(spec);
  switch (form) {
    case 'Default':
      return `import ${binding} from ${q};`;
    case 'Namespace':
      return `import * as ${binding} from ${q};`;
    case 'Named':
      return `import { ${name} } from ${q};`;
    case 'Renamed':
      return `import { ${name} as ${binding} } from ${q};`;
    case 'TypeOnly':
      return `import type { ${name} } from ${q};`;
    case 'InlineType':
      return `import { type ${name} } from ${q};`;
    case 'SideEffect':
      return `import ${q};`;
    case 'ExportNamed':
      return `export { ${name} } from ${q};`;
    case 'ExportAll':
      return `export * from ${q};`;
    case 'ExportAllAs':
      return `export * as ${binding} from ${q};`;
    case 'Require':
      return `const ${binding} = require(${q});`;
    case 'Dynamic':
      return `export const load = () => import(${q});`;
    case 'ImportEquals':
      return `import ${binding} = require(${q});`;
    default:
      throw new Error(`unknown import form ${form}`);
  }
}

/** A `package.json` for a multi-file input, as file text. */
const pkg = (fields = {}) =>
  `${JSON.stringify({ name: 'app', version: '1.0.0', ...fields }, null, 2)}\n`;

module.exports = { FORMS, importOf, pkg, keyOf, src };
