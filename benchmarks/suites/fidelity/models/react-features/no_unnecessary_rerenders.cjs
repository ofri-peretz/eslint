const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, RECEIVER, src } = require('../../react.cjs');

const VALUE = {
  Obj1: ['config', '{{ a: value }}'],
  Obj2: ['config', '{{ a: value, b: 2 }}'],
  Obj5: ['config', '{{ a: value, b: 2, c: 3, d: 4, e: 5 }}'],
  Arr2: ['config', '{[value, 2]}'],
  Arr5: ['config', '{[value, 2, 3, 4, 5]}'],
  Arrow: ['onSelect', '{() => handler(value)}'],
  FnExpr: ['onSelect', '{function () { handler(value); }}'],
  CondFn: ['onSelect', '{flag ? () => handler(1) : () => handler(2)}'],
  Ident: ['onSelect', '{handler}'],
};

module.exports = withTestFile(
  {
    rule: 'no-unnecessary-rerenders',
    domain: 11 * 9 * 2,
    traces: 1400,
    filename: FILE,
    key: keyOf('receiver', 'value', 'minSize'),
    config: (s) => (tag(s.minSize) === 'Two' ? { minSize: 2 } : undefined),
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
