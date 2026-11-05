const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const ELEM = {
  Div: 'div',
  Label: 'label',
  Svg: 'svg',
  Comp: 'Card',
  Member: 'Ui.div',
  Custom: 'my-widget',
};
const PROP = {
  ClassName: 'className="box"',
  ClassHtml: 'class="box"',
  HtmlFor: 'htmlFor="email"',
  ForHtml: 'for="email"',
  TabIndex: 'tabIndex={0}',
  TabIndexLower: 'tabindex="0"',
  DataAttr: 'data-id="x"',
  AriaAttr: 'aria-label="Box"',
  OnClick: 'onClick={handler}',
  StrokeWidth: 'strokeWidth={2}',
  StrokeDash: 'stroke-width="2"',
  Key: 'key="k"',
  SuppressHydration: 'suppressHydrationWarning',
};

module.exports = {
  rule: 'no-unknown-property',
  domain: 6 * 13,
  traces: 600,
  filename: FILE,
  key: keyOf('elem', 'prop'),
  code: (s) => {
    const t = ELEM[tag(s.elem)];
    return src(
      "import { Card, Ui } from './ui';",
      'export function App({ handler }: any) {',
      `  return <${t} ${PROP[tag(s.prop)]}>Hello</${t}>;`,
      '}',
    );
  },
};
