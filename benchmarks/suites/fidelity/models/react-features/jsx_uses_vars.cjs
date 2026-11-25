const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const INPUT = {
  Component: { jsx: '<Card />', pre: ["import { Card } from './ui';"] },
  Member: { jsx: '<Ui.Card />', pre: ["import * as Ui from './ui';"] },
  Intrinsic: { jsx: '<div />', pre: ["import { div } from './ui';"] },
  Namespaced: { jsx: '<svg:circle />', pre: ["import { svg } from './ui';"] },
};

module.exports = {
  rule: 'jsx-uses-vars',
  domain: 4,
  traces: 300,
  filename: FILE,
  key: keyOf('tagKind'),
  code: (s) => {
    const { jsx, pre } = INPUT[tag(s.tagKind)];
    return program(jsx, { pre });
  },
};
