const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const SLOT = {
  None: [],
  UseClient: ["'use client';"],
  OtherDirective: ["'ngInject';"],
  Stmt: ['const ready = true;'],
};

const slot = (v, i) =>
  v === 'Import'
    ? [`import a${i} from './a${i}';`]
    : v === 'ImportEquals'
      ? [`import e${i} = require('./e${i}');`]
      : SLOT[v];

module.exports = {
  rule: 'first',
  domain: 6 * 6 * 2,
  traces: 600,
  key: keyOf('s1', 's2', 'last'),
  code: (s) =>
    src(
      slot(tag(s.s1), 1),
      slot(tag(s.s2), 2),
      tag(s.last) === 'LastImport'
        ? "import last from './last';"
        : "import last = require('./last');",
      'export { last };',
    ),
};
