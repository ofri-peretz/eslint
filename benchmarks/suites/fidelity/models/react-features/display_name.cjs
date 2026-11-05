const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const BODY = {
  Jsx: '<div>{props.label}</div>',
  Fragment: '<>{props.label}</>',
  CreateElement: "createElement('div', null, props.label)",
  NoJsx: 'props.label',
};

function fnCode(shape, body) {
  const ret = BODY[body];
  const pre = ["import { createElement } from 'react';"];
  switch (shape) {
    case 'DefaultArrow':
      return src(pre, `export default (props: any) => ${ret};`);
    case 'DefaultFunction':
      return src(
        pre,
        `export default function (props: any) { return ${ret}; }`,
      );
    case 'DefaultNamedFunction':
      return src(
        pre,
        `export default function Profile(props: any) { return ${ret}; }`,
      );
    default:
      return src(pre, `export const Profile = (props: any) => ${ret};`);
  }
}

function wrapCode(shape, body, wrapper, sp) {
  const outerName = wrapper === 'Memo' ? 'memo' : 'forwardRef';
  const innerName = wrapper === 'Memo' ? 'forwardRef' : 'memo';
  const outer = api(sp, outerName);
  const ret = BODY[body];
  const fn = `(props: any, ref: any) => ${ret}`;
  const pre = [...outer.pre, "import { createElement } from 'react';"];
  switch (shape) {
    case 'WrapUnbound':
      return src(pre, `export default ${outer.ref}(${fn});`);
    case 'WrapBound':
      return src(pre, `export const Row = ${outer.ref}(${fn});`);
    case 'WrapNamedInner':
      return src(
        pre,
        `export default ${outer.ref}(function Row(props: any, ref: any) { return ${ret}; });`,
      );
    default: {
      const inner = api(sp, innerName);
      const innerRef = inner.ref;
      const innerPre = sp === 'Default' || sp === 'Namespace' ? [] : inner.pre;
      return src(
        pre,
        innerPre,
        `export default ${outer.ref}(${innerRef}(${fn}));`,
      );
    }
  }
}

function clsCode(shape, sp, d) {
  const base =
    sp === 'Pure' ? api('Named', 'PureComponent') : api(sp, 'Component');
  const pre =
    sp === 'Shadowed' ? ['class Component { props: any; }'] : base.pre;
  const dn =
    d === 'StaticDisplayName' ? "  static displayName = 'Profile';\n" : '';
  const body = (name) =>
    `class${name ? ` ${name}` : ''} extends ${base.ref} {\n${dn}  render() { return <div />; }\n}`;
  switch (shape) {
    case 'ClassAnonDefault':
      return src(pre, `export default ${body('')}`);
    case 'ClassNamed':
      return src(pre, `export ${body('Profile')}`);
    case 'ClassExprBound':
      return src(pre, `export const Profile = ${body('')};`);
    default:
      return src(
        pre,
        'declare function register(c: any): void;',
        `register(${body('')});`,
      );
  }
}

module.exports = {
  rule: 'display-name',
  // Fn: 4 shapes x 4 bodies; Wrap: 4 x 3 bodies x 2 wrappers x 6 spellings;
  // Cls: 4 x 7 spellings x 2.
  domain: 16 + 144 + 56,
  traces: 2500,
  filename: FILE,
  key: keyOf('focus', 'shape', 'body', 'wrapper', 'spelling', 'displayName'),
  code: (s) => {
    const f = tag(s.focus);
    if (f === 'Fn') return fnCode(tag(s.shape), tag(s.body));
    if (f === 'Wrap')
      return wrapCode(
        tag(s.shape),
        tag(s.body),
        tag(s.wrapper),
        tag(s.spelling),
      );
    return clsCode(tag(s.shape), tag(s.spelling), tag(s.displayName));
  },
};
