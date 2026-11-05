const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE } = require('../../react.cjs');
const { classModule } = require('../../react-b.cjs');

const VALUE = {
  Lit: '"input"',
  Braced: '{"input"}',
  Template: '{`input`}',
  TemplateExpr: '{`input-${id}`}',
  Cond: '{flag ? "first" : "second"}',
  Dynamic: '{value}',
  RefObject: '{this.inputRef}',
  Callback: '{(el: any) => { this.input = el; }}',
};
const ACCESS = {
  Dot: 'this.refs.input.focus();',
  Computed: "this['refs'].input.focus();",
  OtherProp: 'this.inputRef.current.focus();',
  StoreRefs: 'store.refs.input.focus();',
};

module.exports = {
  rule: 'no-string-refs',
  // Attr: 8 values x 2 elements; Refs: 4 bases x 4 accesses.
  domain: 8 * 2 + 4 * 4,
  traces: 600,
  filename: FILE,
  key: keyOf('focus', 'value', 'elem', 'base', 'access'),
  code: (s) => {
    const attr = tag(s.focus) === 'Attr';
    const el = tag(s.elem) === 'Intrinsic' ? 'input' : 'Field';
    const jsx = attr ? `<${el} ref=${VALUE[tag(s.value)]} />` : '<input />';
    return classModule(
      attr ? 'Named' : tag(s.base),
      [
        'props: any;',
        'inputRef: any;',
        'input: any;',
        'focusInput() {',
        `  ${attr ? 'this.inputRef.current.focus();' : ACCESS[tag(s.access)]}`,
        '}',
        'render() {',
        '  const { id, flag, value } = this.props;',
        `  return ${jsx};`,
        '}',
      ].join('\n'),
      {
        pre: ["import { Field } from './field';", 'declare const store: any;'],
      },
    );
  },
};
