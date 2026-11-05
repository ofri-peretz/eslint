const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

// [import lines, superclass expression or null]
function base(b) {
  switch (b) {
    case 'Pure':
      return [api('Named', 'PureComponent').pre, 'PureComponent'];
    case 'Shadowed':
      return [['class Component { props: any; }'], 'Component'];
    case 'Foreign':
      return [["import { Component } from 'lit';"], 'Component'];
    case 'NoExtends':
      return [[], null];
    default: {
      const { pre, ref } = api(b, 'Component');
      return [pre, ref];
    }
  }
}

const NAME = {
  Lifecycle: 'componentDidMount',
  StaticLifecycle: 'getDerivedStateFromProps',
  Handler: 'handleClick',
};

module.exports = {
  rule: 'no-arrow-function-lifecycle',
  domain: 8 * 3 * 3 * 2,
  traces: 1500,
  filename: FILE,
  key: keyOf('base', 'key', 'method', 'form'),
  code: (s) => {
    const [pre, sup] = base(tag(s.base));
    const name = NAME[tag(s.method)];
    const k = { Ident: name, Quoted: `'${name}'`, Computed: `['${name}']` }[
      tag(s.key)
    ];
    const stat = tag(s.method) === 'StaticLifecycle' ? 'static ' : '';
    const params =
      tag(s.method) === 'StaticLifecycle' ? 'props: any, state: any' : '';
    const body =
      tag(s.method) === 'StaticLifecycle' ? 'return null;' : 'void 0;';
    const member =
      tag(s.form) === 'Arrow'
        ? `  ${stat}${k} = (${params}) => { ${body} };`
        : `  ${stat}${k}(${params}) { ${body} }`;
    return src(
      pre,
      `export class App${sup ? ` extends ${sup}` : ''} {`,
      member,
      '  render() { return null; }',
      '}',
    );
  },
};
