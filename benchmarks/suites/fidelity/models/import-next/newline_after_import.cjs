const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../imports.cjs');

const IMP = {
  Import: "import a from './a';",
  TypeImport: "import type { A } from './a';",
  ImportEquals: "import a = require('./a');",
};
const NEXT = {
  NextImport: "import b from './b';",
  NextImportEquals: "import b = require('./b');",
  NextStmt: 'export const c = 1;',
  NextExportFrom: "export { d } from './d';",
  Eof: '',
};
const SEP = { SameLine: ' ', NextLine: '\n', BlankLine: '\n\n' };

module.exports = {
  rule: 'newline-after-import',
  domain: 3 * 3 * 5,
  traces: 400,
  key: keyOf('imp', 'sep', 'follow'),
  code: (s) => `${IMP[tag(s.imp)]}${SEP[tag(s.sep)]}${NEXT[tag(s.follow)]}\n`,
};
