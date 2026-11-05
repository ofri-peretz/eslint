const { tag, withTestFile } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  ButtonEmpty: el('button', ['type="button"', 'onClick={handler}'], ' '),
  ButtonIcon: el(
    'button',
    ['type="button"', 'onClick={handler}'],
    '<svg aria-hidden="true" />',
  ),
  InputText: el('input', ['type="text"']),
  InputHidden: el('input', ['type="hidden"', 'name="token"']),
  InputSubmit: el('input', ['type="submit"']),
  Select: el('select', [], '<option>One</option>'),
  Textarea: el('textarea', []),
  Img: el('img', ['src="/a.png"']),
  Component: el('Field', []),
  Div: el('div', [], ' '),
};
const INPUT = {
  INone: [],
  IAriaLabel: ['aria-label="Email"'],
  IAriaLabelDynamic: ['aria-label={value}'],
  IAriaLabelEmpty: ['aria-label=""'],
  IAriaLabelledby: ['aria-labelledby="email-label"'],
  ITitle: ['title="Email"'],
  IId: ['id="email"'],
  ISpread: ['{...rest}'],
  IPlaceholder: ['placeholder="Email"'],
};
const BUTTON = {
  BNone: [[], ''],
  BText: [[], 'Save'],
  BAriaLabel: [['aria-label="Save"'], ''],
  BTitle: [['title="Save"'], ''],
  BSpread: [['{...rest}'], ''],
  BExpr: [[], '{value}'],
};

const base = {
  rule: 'no-missing-aria-labels',
  // Elems 10 x 2 opts; InputNames 7; ButtonNames 5.
  domain: 20 + 7 + 5,
  traces: 500,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'opt', 'inputName', 'buttonName']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'OnlyInput' ? { requireLabels: ['input'] } : undefined,
  code: (s) => {
    const pre = ["import { Field } from './ui';"];
    const fo = tag(s.focus);
    if (fo === 'InputNames') {
      const i = tag(s.inputName);
      const input = el('input', ['type="text"', ...(INPUT[i] ?? [])]);
      return program(
        i === 'IWrapped' ? `<label>\n  Email\n  ${input}\n</label>` : input,
        { pre },
      );
    }
    if (fo === 'ButtonNames') {
      const [attrs, children] = BUTTON[tag(s.buttonName)];
      return program(
        `<button type="button" onClick={handler}${attrs.length ? ' ' + attrs.join(' ') : ''}>${children}</button>`,
        { pre },
      );
    }
    return program(ELEM[tag(s.elem)], { pre });
  },
};

module.exports = withTestFile(base, {
  option: 'ignoreInTests',
  flip: false,
  testFile: 'src/App.test.tsx',
});
