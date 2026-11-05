const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const PARAMS = {
  Props: ['props: any', 'props'],
  RestOnly: ['{ ...rest }: any', 'rest'],
  DestructDrop: ['{ label, ...rest }: any', 'rest'],
};
const TARGET = {
  Comp: 'Button',
  Member: 'Dialog.Trigger',
  Intrinsic: 'button',
};

module.exports = {
  rule: 'no-wrapper-sub-component',
  domain: 7 * 3 * 3 * 4,
  traces: 1800,
  filename: FILE,
  key: keyOf('form', 'params', 'target', 'extra'),
  code: (s) => {
    const [param, spread] = PARAMS[tag(s.params)];
    const t = TARGET[tag(s.target)];
    const e = tag(s.extra);
    const arg = e === 'OtherSpread' ? 'defaults' : spread;
    const attrs = `{...${arg}}${e === 'Attr' ? ' data-slot="trigger"' : ''}`;
    const jsx =
      e === 'Children' ? `<${t} ${attrs}>Submit</${t}>` : `<${t} ${attrs} />`;
    const block = (head) => [`${head} {`, `  return ${jsx};`, '}'];
    let body;
    switch (tag(s.form)) {
      case 'FnDecl':
        body = block(`export function MyTrigger(${param})`);
        break;
      case 'ExportDefaultFn':
        body = block(`export default function MyTrigger(${param})`);
        break;
      case 'ArrowExpr':
        body = [`export const MyTrigger = (${param}) => ${jsx};`];
        break;
      case 'ArrowBlock':
        body = block(`export const MyTrigger = (${param}) =>`).map((l, i) =>
          i === 2 ? '};' : l,
        );
        break;
      case 'FnExpr':
        body = block(`export const MyTrigger = function (${param})`).map(
          (l, i) => (i === 2 ? '};' : l),
        );
        break;
      case 'MemoArrow':
        body = [`export const MyTrigger = memo((${param}) => ${jsx});`];
        break;
      default:
        body = block(`export function renderTrigger(${param})`);
    }
    return src(
      "import { memo } from 'react';",
      "import { Button, Dialog } from './ui';",
      'const defaults = { size: 2 };',
      body,
    );
  },
};
