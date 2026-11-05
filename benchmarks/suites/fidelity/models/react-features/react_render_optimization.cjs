const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, RECEIVER, src } = require('../../react.cjs');

const VALUE = {
  Obj: ['config', '{{ a: value }}'],
  Arr: ['config', '{[value]}'],
  Arrow: ['onSelect', '{() => handler(value)}'],
  FnExpr: ['onSelect', '{function () { handler(value); }}'],
  CondFn: ['onSelect', '{flag ? () => handler(1) : () => handler(2)}'],
  Ident: ['onSelect', '{handler}'],
  Str: ['label', '"Save"'],
};
const OPTS = {
  Default: undefined,
  NoProps: { detectInlineProps: false },
  NoFunctions: { detectInlineFunctions: false },
};

module.exports = withTestFile(
  {
    rule: 'react-render-optimization',
    domain: 11 * 7 * 3,
    traces: 1500,
    filename: FILE,
    key: keyOf('receiver', 'value', 'opts'),
    config: (s) => OPTS[tag(s.opts)],
    code: (s) => {
      const r = RECEIVER[tag(s.receiver)];
      const [prop, v] = VALUE[tag(s.value)];
      return src(
        r.pre,
        'export function App({ value, flag, handler }: any) {',
        `  return <${r.tag} ${prop}=${v} />;`,
        '}',
      );
    },
  },
  { option: 'ignoreInTests', flip: false, testFile: 'src/App.test.tsx' },
);
