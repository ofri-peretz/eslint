const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const INPUT = {
  Intrinsic: { jsx: '<div />', pre: [] },
  Imported: { jsx: '<Card />', pre: ["import { Card } from './ui';"] },
  Local: { jsx: '<Card />', pre: ['const Card = () => null;'] },
  Undeclared: { jsx: '<Card />', pre: [] },
  MemberDeclared: { jsx: '<Ui.Card />', pre: ["import * as Ui from './ui';"] },
  MemberUndeclared: { jsx: '<Ui.Card />', pre: [] },
  Namespaced: { jsx: '<svg:circle />', pre: [] },
};

module.exports = {
  rule: 'jsx-no-undef',
  domain: 7 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('tagKind', 'globals'),
  config: (s) =>
    tag(s.globals) === 'AllowGlobals' ? { allowGlobals: true } : undefined,
  code: (s) => {
    const { jsx, pre } = INPUT[tag(s.tagKind)];
    return program(jsx, { pre });
  },
};
