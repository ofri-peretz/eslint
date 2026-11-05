const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const TAG = {
  Br: 'br',
  Img: 'img',
  Input: 'input',
  Hr: 'hr',
  Wbr: 'wbr',
  Meta: 'meta',
  Div: 'div',
  Comp: 'Img',
};
const JSX = {
  SelfClose: (t) => `<${t} />`,
  EmptyPair: (t) => `<${t}></${t}>`,
  Comment: (t) => `<${t}>{/* note */}</${t}>`,
  Text: (t) => `<${t}>Caption</${t}>`,
  Expr: (t) => `<${t}>{value}</${t}>`,
  ChildrenProp: (t) => `<${t} children="divider" />`,
  Danger: (t) => `<${t} dangerouslySetInnerHTML={{ __html: value }} />`,
};
const CE = {
  CeNone: (ce, t) => `${ce}(${t}, null)`,
  CeText: (ce, t) => `${ce}(${t}, null, 'Caption')`,
  CeChildrenProp: (ce, t) => `${ce}(${t}, { children: value })`,
  CeDanger: (ce, t) =>
    `${ce}(${t}, { dangerouslySetInnerHTML: { __html: value } })`,
};

module.exports = {
  rule: 'void-dom-elements-no-children',
  // JSX: 8 elems x 7 forms; createElement: 8 x 4 forms x 3 spellings.
  domain: 8 * 7 + 8 * 4 * 3,
  traces: 800,
  filename: FILE,
  key: keyOf('focus', 'elem', 'form', 'spelling'),
  code: (s) => {
    const t = TAG[tag(s.elem)];
    const f = tag(s.form);
    const pre = ["import { Img } from './ui';"];
    let expr;
    if (JSX[f]) expr = JSX[f](t);
    else {
      const { pre: p, ref } = api(tag(s.spelling), 'createElement');
      pre.push(...p);
      expr = CE[f](ref, t === 'Img' ? 'Img' : `'${t}'`);
    }
    return src(
      pre,
      'export function App({ value }: any) {',
      `  return ${expr};`,
      '}',
    );
  },
};
