const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

// How the value is written. `expr` goes after `style=` (braced in JSX) or after
// `style:` in the props object; `pre` is module-level code the value needs.
const VALUE = {
  StringLit: { expr: "'color: red'", pre: [] },
  NumberLit: { expr: '42', pre: [] },
  ObjectLit: { expr: "{ color: 'red' }", pre: [] },
  NullLit: { expr: 'null', pre: [] },
  ConstString: { expr: 'styles', pre: ["const styles = 'color: red';"] },
  ConstObject: { expr: 'styles', pre: ["const styles = { color: 'red' };"] },
  Unresolved: { expr: 'value', pre: [] },
  Template: { expr: '`color: ${value}`', pre: [] },
};

module.exports = {
  rule: 'style-prop-object',
  domain: 2 * 8 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('carrier', 'value', 'allow'),
  config: (s) => (tag(s.allow) === 'Allowed' ? { allow: ['Card'] } : undefined),
  code: (s) => {
    const { expr, pre } = VALUE[tag(s.value)];
    const jsx =
      tag(s.carrier) === 'Jsx'
        ? tag(s.value) === 'StringLit'
          ? '<Card style="color: red" />'
          : `<Card style={${expr}} />`
        : `React.createElement(Card, { style: ${expr} })`;
    return program(jsx, { pre: ['declare const Card: any;', ...pre] });
  },
};
