const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const IMPORTED = {
  DefaultIdent: 'default',
  DefaultString: "'default'",
  Other: 'other',
};

function line(imported, kind) {
  const spec = `${IMPORTED[imported]} as x`;
  switch (kind) {
    case 'Value':
      return [`import { ${spec} } from './m';`, 'export const y = x;'];
    case 'TypeOnly':
      return [`import type { ${spec} } from './m';`, 'export type Y = x;'];
    case 'InlineType':
      return [`import { type ${spec} } from './m';`, 'export type Y = x;'];
    default:
      return [`export { ${spec} } from './m';`];
  }
}

module.exports = {
  rule: 'no-named-default',
  domain: 3 * 4,
  traces: 200,
  key: keyOf('imported', 'kind'),
  code: (s) => src(line(tag(s.imported), tag(s.kind))),
};
