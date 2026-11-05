const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const VAL = {
  Lit: (v) => `"${v}"`,
  Braced: (v) => `{"${v}"}`,
  Dynamic: () => '{value}',
  Undef: () => '{undefined}',
};
const attr = (name, v) =>
  tag(v) === 'Absent' ? '' : ` ${name}=${VAL[tag(v)]('card-header')}`;

module.exports = {
  rule: 'require-data-slot',
  domain: 25,
  traces: 200,
  filename: FILE,
  key: keyOf('testid', 'slot'),
  code: (s) =>
    program(
      `<div${attr('data-testid', s.testid)}${attr('data-slot', s.slot)} className="flex" />`,
    ),
};
