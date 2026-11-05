const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

// [attribute, intrinsic element it belongs on]
const ATTR = {
  Class_: ['class', 'div'],
  For_: ['for', 'label'],
  Tabindex: ['tabindex', 'div'],
  Readonly: ['readonly', 'input'],
  Maxlength: ['maxlength', 'input'],
  HttpEquiv: ['http-equiv', 'meta'],
  AcceptCharset: ['accept-charset', 'form'],
  ClassName: ['className', 'div'],
  HtmlFor: ['htmlFor', 'label'],
  TabIndex: ['tabIndex', 'div'],
  DataRole: ['data-role', 'div'],
};

module.exports = {
  rule: 'no-invalid-html-attribute',
  domain: 11 * 2,
  traces: 300,
  filename: FILE,
  key: keyOf('attr', 'elem'),
  code: (s) => {
    const [name, tagName] = ATTR[tag(s.attr)];
    const el = tag(s.elem) === 'Intrinsic' ? tagName : 'my-widget';
    return src(
      'export function App() {',
      `  return <${el} ${name}="x" />;`,
      '}',
    );
  },
};
