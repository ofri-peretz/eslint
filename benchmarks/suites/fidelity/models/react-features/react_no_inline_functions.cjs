const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, RECEIVER, src } = require('../../react.cjs');

const VALUE = {
  Arrow: '() => handler(value)',
  FnExpr: 'function () { handler(value); }',
  CondFn: 'flag ? () => handler(1) : () => handler(2)',
  Ident: 'handler',
};
const NAME = { OnClick: 'onClick', Only: 'only', RenderItem: 'renderItem' };

module.exports = {
  rule: 'react-no-inline-functions',
  // Prop: 11 receivers x 4 values x 3 names x 2; ChildFn: 11 x 3 x 2;
  // MapCallback: 2 x 2 x 2.
  domain: 11 * 4 * 3 * 2 + 11 * 3 * 2 + 2 * 2 * 2,
  traces: 3000,
  filename: FILE,
  key: keyOf('focus', 'receiver', 'value', 'name', 'allow'),
  config: (s) =>
    tag(s.allow) === 'On' ? { allowInEventHandlers: true } : undefined,
  code: (s) => {
    const r = RECEIVER[tag(s.receiver)];
    const v = VALUE[tag(s.value)];
    const focus = tag(s.focus);
    const jsx =
      focus === 'Prop'
        ? `<${r.tag} ${NAME[tag(s.name)]}={${v}} />`
        : focus === 'ChildFn'
          ? `<${r.tag}>{${v}}</${r.tag}>`
          : `<${r.tag}>{items.map(${tag(s.value) === 'Arrow' ? '(item: any) => <b key={item}>{item}</b>' : 'function (item: any) { return <b key={item}>{item}</b>; }'})}</${r.tag}>`;
    return src(
      r.pre,
      'export function App({ value, flag, handler, items }: any) {',
      `  return ${jsx};`,
      '}',
    );
  },
};
