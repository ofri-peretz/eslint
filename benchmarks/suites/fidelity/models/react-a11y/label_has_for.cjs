const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const JSX = {
  BareLabel: '<label>Name</label>',
  NestedControl: '<label>Name<input /></label>',
  HtmlFor: '<label htmlFor="name">Name</label>',
};

module.exports = {
  rule: 'label-has-for',
  domain: 3,
  traces: 300,
  filename: FILE,
  key: keyOf('shape'),
  code: (s) => program(JSX[tag(s.shape)]),
};
