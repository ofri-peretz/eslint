const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

// [import / declaration lines, rendered expression]
const FORM = {
  Attr: [[], '<div children={label} />'],
  AttrComponent: [[], '<Card children={label} />'],
  SpreadIdent: [[], '<Card {...{ children: label }} />'],
  SpreadQuoted: [[], "<Card {...{ 'children': label }} />"],
  SpreadComputed: [[], "<Card {...{ ['children']: label }} />"],
  SpreadShorthand: [['const children = label;'], '<Card {...{ children }} />'],
  CreateElementMember: [
    ["import React from 'react';"],
    'React.createElement(Card, { children: label })',
  ],
  CreateElementNamed: [
    ["import { createElement } from 'react';"],
    "createElement(Card, { 'children': label })",
  ],
  CreateElementLocal: [
    ['const createElement = (...a: any[]) => a;'],
    'createElement(Card, { children: label })',
  ],
  Nested: [[], '<Card>{label}</Card>'],
  OtherProp: [[], '<Card title={label} />'],
};

module.exports = {
  rule: 'no-children-prop',
  domain: 11,
  traces: 200,
  filename: FILE,
  key: keyOf('form'),
  code: (s) => {
    const [pre, expr] = FORM[tag(s.form)];
    const decl = pre.filter((l) => l.startsWith('const children'));
    const top = pre.filter((l) => !l.startsWith('const children'));
    return src(
      top,
      "import { Card } from './ui';",
      'export function App({ label }: any) {',
      ...decl.map((l) => `  ${l}`),
      `  return ${expr};`,
      '}',
    );
  },
};
