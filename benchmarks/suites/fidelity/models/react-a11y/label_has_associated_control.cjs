const { tag } = require('../../lib.cjs');
const { FILE, program } = require('../../jsx.cjs');

const TAG = {
  Label: 'label',
  CustomLabel: 'FieldLabel',
  CustomLabelOpt: 'FieldLabel',
  Div: 'div',
};
// [attrs, control children]
const ASSOC = {
  NoAssoc: [[], ''],
  HtmlFor: [['htmlFor="email"'], ''],
  HtmlForDynamic: [['htmlFor={value}'], ''],
  NestedInput: [[], '<input type="text" />'],
  NestedSelect: [[], '<select><option>One</option></select>'],
  NestedDeep: [
    [],
    '<span><span><span><input type="text" /></span></span></span>',
  ],
  NestedComponent: [[], '<TextField />'],
  NestedControlComp: [[], '<TextField />'],
  ExprChild: [[], '{value}'],
  Spread: [['{...rest}'], ''],
  HtmlForAndNested: [['htmlFor="email"'], '<input type="text" id="email" />'],
};
// [attrs, text children]
const CONTENT = {
  Text: [[], 'Email'],
  NoText: [[], ''],
  AriaLabel: [['aria-label="Email"'], ''],
  ExprText: [[], '{flag}'],
  ComponentText: [[], '<Trans />'],
  CustomAttr: [['label="Email"'], ''],
  CustomAttrOpt: [['label="Email"'], ''],
};
const ASSERT = {
  AEither: 'either',
  AHtmlFor: 'htmlFor',
  ANesting: 'nesting',
  ABoth: 'both',
};

module.exports = {
  rule: 'label-has-associated-control',
  // Elems 4 x 2; Assocs 7; Contents 7; Asserts 4 x 4.
  domain: 8 + 7 + 7 + 16,
  traces: 600,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'assoc', 'content', 'assertion']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const o = {};
    if (tag(s.focus) === 'Asserts') o.assert = ASSERT[tag(s.assertion)];
    if (tag(s.elem) === 'CustomLabelOpt') o.labelComponents = ['FieldLabel'];
    if (tag(s.assoc) === 'NestedControlComp')
      o.controlComponents = ['TextField'];
    if (tag(s.content) === 'CustomAttrOpt') o.labelAttributes = ['label'];
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const t = TAG[tag(s.elem)];
    const [aAttrs, control] = ASSOC[tag(s.assoc)];
    const [cAttrs, text] = CONTENT[tag(s.content)];
    const attrs = [...aAttrs, ...cAttrs];
    const open = attrs.length ? `<${t} ${attrs.join(' ')}>` : `<${t}>`;
    return program(`${open}${text}${control}</${t}>`, {
      pre: ["import { FieldLabel, TextField, Trans } from './ui';"],
    });
  },
};
