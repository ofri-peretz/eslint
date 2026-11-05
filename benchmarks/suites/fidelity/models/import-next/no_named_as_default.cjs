const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

/** The default import of './m' bound to `local`, plus `extra` specifiers. */
const DEFAULT = {
  DefaultImport: (local, extra) =>
    extra
      ? `import ${local}, { ${extra} } from './m';`
      : `import ${local} from './m';`,
  DefaultSpecifier: (local, extra) =>
    `import { default as ${local}${extra ? `, ${extra}` : ''} } from './m';`,
};

function code(s) {
  const d = DEFAULT[tag(s.dflt)];
  switch (tag(s.evidence)) {
    case 'SameDecl':
      return src(d('foo', 'foo as f2'));
    case 'OtherDecl':
      return src(d('foo'), "import { foo as f2 } from './m';");
    case 'Reexport':
      return src(d('foo'), "export { foo } from './m';");
    case 'TypeEvidence':
      return src(d('foo', 'type foo as F'));
    case 'OtherModule':
      return src(d('foo'), "import { foo as f2 } from './n';");
    case 'NameDiffers':
      return src(d('bar', 'foo'));
    default:
      return src(d('foo'));
  }
}

module.exports = {
  rule: 'no-named-as-default',
  domain: 2 * 7,
  traces: 200,
  key: keyOf('dflt', 'evidence'),
  code,
};
