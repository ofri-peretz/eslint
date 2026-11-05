const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const ROLE = {
  Checkbox: 'checkbox',
  Radio: 'radio',
  Switch: 'switch',
  MenuItemCheckbox: 'menuitemcheckbox',
  Combobox: 'combobox',
  Slider: 'slider',
  Scrollbar: 'scrollbar',
  Btn: 'button',
};
// [required, partial] attribute lists per role (static values; RequiredDyn makes them dynamic)
const PROPS = {
  Checkbox: [['aria-checked="false"'], []],
  Radio: [['aria-checked="false"'], []],
  Switch: [['aria-checked="false"'], []],
  MenuItemCheckbox: [['aria-checked="false"'], []],
  Combobox: [
    ['aria-controls="list"', 'aria-expanded="false"'],
    ['aria-expanded="false"'],
  ],
  Slider: [['aria-valuenow="5"'], ['aria-valuemin="0"', 'aria-valuemax="10"']],
  Scrollbar: [
    ['aria-controls="pane"', 'aria-valuenow="5"'],
    ['aria-valuenow="5"'],
  ],
  Btn: [[], []],
};
const dyn = (a) => a.replace(/=".*"$/, '={value}');
const propsFor = (r, p) => {
  const [req, part] = PROPS[r];
  return {
    NoProps: [],
    Required: req,
    RequiredDyn: req.map(dyn),
    Partial: part,
  }[p];
};
const ELEM = {
  Div: (a) => el('div', ['tabIndex={0}', ...a], 'x'),
  NativeCheckbox: (a) => el('input', ['type="checkbox"', ...a]),
};

module.exports = {
  rule: 'role-has-required-aria-props',
  // Div x 8 roles x 4 props x 4 spellings + NativeCheckbox x 4 roles x 4 x 4
  domain: 8 * 4 * 4 + 4 * 4 * 4,
  traces: 1600,
  filename: FILE,
  key: (s) =>
    ['elem', 'role', 'props', 'spelling']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const r = tag(s.role);
    const a = [
      attr('role', ROLE[r], tag(s.spelling)),
      ...propsFor(r, tag(s.props)),
    ];
    return program(ELEM[tag(s.elem)](a));
  },
};
