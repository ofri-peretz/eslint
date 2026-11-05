const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const ELEM = {
  Div: 'div',
  Comp: 'Card',
  Member: 'Ui.Card',
  FragNamed: 'Fragment',
  FragMember: 'React.Fragment',
};
const ATTR = {
  Absent: '',
  Present: ' data-testid="card"',
  Braced: ' data-testid={value}',
};
const OPT = {
  NoConfig: undefined,
  Require: { attributes: [{ attribute: 'data-testid' }] },
  RequireIgnoreTag: {
    attributes: [{ attribute: 'data-testid', ignoreTags: ['div'] }],
  },
  RequireIgnoreComp: {
    attributes: [{ attribute: 'data-testid' }],
    ignoreComponents: ['Card'],
  },
};

module.exports = {
  rule: 'required-attributes',
  domain: 5 * 4 * 3,
  traces: 400,
  filename: FILE,
  key: keyOf('elem', 'opt', 'attr'),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const t = ELEM[tag(s.elem)];
    // A fragment takes no attribute but `key`; data-testid on it is what the
    // model asks the rule to never require (and here, present, never read).
    const a = ATTR[tag(s.attr)];
    return src(
      "import React, { Fragment } from 'react';",
      "import { Card, Ui } from './ui';",
      'export function App({ value }: any) {',
      `  return <${t}${a}>Hello</${t}>;`,
      '}',
    );
  },
};
