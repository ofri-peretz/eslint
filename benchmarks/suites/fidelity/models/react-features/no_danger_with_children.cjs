const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const DANGER_ATTR = {
  Set_: ' dangerouslySetInnerHTML={{ __html: html }}',
  Unset: '',
  DangerUndef: ' dangerouslySetInnerHTML={undefined}',
};
const DANGER_PROP = {
  Set_: ', dangerouslySetInnerHTML: { __html: html }',
  Unset: '',
  DangerUndef: ', dangerouslySetInnerHTML: undefined',
};
// [extra attributes, children]; children null = self-closing.
const JSX_KIDS = {
  NoKids: ['', null],
  Text: ['', 'Some text'],
  Space: ['', ' '],
  Element: ['', '<b>bold</b>'],
  Expr: ['', '{label}'],
  Undef: ['', '{undefined}'],
  Newline: ['', '\n  '],
  ChildrenProp: [' children="text"', null],
  ChildrenUndef: [' children={undefined}', null],
};
// [extra props, third argument]
const CE_KIDS = {
  NoKids: ['', ''],
  ChildrenProp: [', children: "text"', ''],
  ChildrenUndef: [', children: undefined', ''],
  ThirdArg: ['', ', "text"'],
  ThirdUndef: ['', ', undefined'],
};
const SPELLING = {
  CeNamed: 'Named',
  CeDefault: 'Default',
  CeShadowed: 'Shadowed',
};

module.exports = {
  rule: 'no-danger-with-children',
  // Jsx: 9 kids x 3; three createElement spellings: 5 kids x 3.
  domain: 9 * 3 + 3 * 5 * 3,
  traces: 900,
  filename: FILE,
  key: keyOf('form', 'kids', 'danger'),
  code: (s) => {
    const f = tag(s.form);
    const d = tag(s.danger);
    const k = tag(s.kids);
    if (f === 'Jsx') {
      const [a, c] = JSX_KIDS[k];
      const open = `div className="body"${DANGER_ATTR[d]}${a}`;
      const jsx = c === null ? `<${open} />` : `<${open}>${c}</div>`;
      return src(
        'export function App({ html, label }: any) {',
        `  return ${jsx};`,
        '}',
      );
    }
    const { pre, ref } = api(SPELLING[f], 'createElement');
    const [p, third] = CE_KIDS[k];
    return src(
      pre,
      'export function App({ html }: any) {',
      `  return ${ref}('div', { className: "body"${DANGER_PROP[d]}${p} }${third});`,
      '}',
    );
  },
};
