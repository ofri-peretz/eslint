const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const NAMES = ['title', 'subtitle', 'icon', 'tone', 'size'];
const COUNT = { Two: 2, Three: 3, Five: 5 };

module.exports = {
  rule: 'require-optimization',
  domain: 3 * 7 * 3,
  traces: 600,
  filename: FILE,
  key: keyOf('props', 'form', 'opt'),
  config: (s) =>
    ({
      Defaults: undefined,
      Min5: { minPropsForMemo: 5 },
      MemoOff: { suggestMemo: false },
    })[tag(s.opt)],
  code: (s) => {
    const names = NAMES.slice(0, COUNT[tag(s.props)]);
    const params = `{ ${names.join(', ')} }: any`;
    const body = `<h2 title={String(${names[1]})}>{${names[0]}}</h2>`;
    const FORM = {
      FnDecl: [`export function Card(${params}) {`, `  return ${body};`, '}'],
      Arrow: [`export const Card = (${params}) => ${body};`],
      FnExpr: [
        `export const Card = function (${params}) {`,
        `  return ${body};`,
        '};',
      ],
      MemoLater: [
        "import { memo } from 'react';",
        `function Card(${params}) {`,
        `  return ${body};`,
        '}',
        'export default memo(Card);',
      ],
      MemoInlineArrow: [
        "import { memo as m } from 'react';",
        `export const Card = m((${params}) => ${body});`,
      ],
      ReactMemoFnExpr: [
        "import React from 'react';",
        `export const Card = React.memo(function Card(${params}) {`,
        `  return ${body};`,
        '});',
      ],
      Lowercase: [
        `export function card(${params}) {`,
        `  return ${body};`,
        '}',
      ],
    };
    return src(FORM[tag(s.form)]);
  },
};
