const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const JSX = {
  SelectOnChange: '<select onChange={go}><option /></select>',
  SelectOnBlur: '<select onBlur={go}><option /></select>',
  InputOnChange: '<input onChange={go} />',
};

module.exports = {
  rule: 'no-onchange',
  domain: 3,
  traces: 300,
  filename: FILE,
  key: keyOf('shape'),
  code: (s) => program(JSX[tag(s.shape)]),
};
