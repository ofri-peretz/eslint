const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

// [tag, attrs, void element]
const ELEM = {
  Button: ['button', ['type="button"', 'onClick={handler}']],
  AnchorHref: ['a', ['href="/home"']],
  AnchorNoHref: ['a', ['id="top"']],
  DivRoleButton: [
    'div',
    [
      'role="button"',
      'tabIndex={0}',
      'onClick={handler}',
      'onKeyDown={handler}',
    ],
  ],
  InputText: ['input', ['type="text"'], true],
  InputTextId: ['input', ['type="text"', 'id="email"'], true],
  Select: ['select', []],
  Textarea: ['textarea', []],
  Div: ['div', []],
  Component: ['Box', []],
  CustomButton: ['CustomButton', ['onClick={handler}']],
};
// [attrs, children]
const LABEL = {
  NoLabel: [[], ''],
  Text: [[], 'Save'],
  AriaLabel: [['aria-label="Save"'], ''],
  AriaLabelledby: [['aria-labelledby="save-label"'], ''],
  Title: [['title="Save"'], ''],
  Expr: [[], '{value}'],
  ComponentChild: [[], '<Icon />'],
  Nested: [[], '<span><span><strong>Save</strong></span></span>'],
  Spread: [['{...rest}'], ''],
  CustomAttr: [['label="Save"'], ''],
  CustomAttrOpt: [['label="Save"'], ''],
  Hidden: [['aria-hidden="true"'], ''],
};
const OPT = {
  Default: undefined,
  IgnoreElem: { ignoreElements: ['button'] },
  IgnoreRole: { ignoreRoles: ['button'] },
  ControlComp: { controlComponents: ['CustomButton'] },
};

module.exports = {
  rule: 'control-has-associated-label',
  // Elems 10; Labels 9; Opts 3 x 4.
  domain: 10 + 9 + 12,
  traces: 500,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'label', 'opt'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) =>
    tag(s.label) === 'CustomAttrOpt'
      ? { labelAttributes: ['label'] }
      : OPT[tag(s.opt)],
  code: (s) => {
    const [t, base, isVoid] = ELEM[tag(s.elem)];
    const [attrs, children] = LABEL[tag(s.label)];
    const all = [...base, ...attrs];
    const jsx = isVoid
      ? el(t, all)
      : `<${t} ${all.join(' ')}>${children}</${t}>`.replace(
          `<${t} >`,
          `<${t}>`,
        );
    return program(jsx, {
      pre: ["import { Box, CustomButton, Icon } from './ui';"],
    });
  },
};
