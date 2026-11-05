const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const ELEM = {
  Input: 'input',
  Textarea: 'textarea',
  Select: 'select',
  Comp: 'Input',
};
const CTRL = {
  Checked: 'checked={flag}',
  Value: 'value={value}',
  ValueUndef: 'value={undefined}',
  DefaultValue: 'defaultValue={value}',
  NoCtrl: '',
};
const TYPE = {
  NoType: '',
  Checkbox: 'type="checkbox"',
  Hidden: 'type="hidden"',
};
const HANDLER = {
  NoHandler: '',
  OnChange: 'onChange={handler}',
  OnInput: 'onInput={handler}',
  ReadOnly: 'readOnly',
  ReadOnlyFalse: 'readOnly={false}',
  Disabled: 'disabled',
  DisabledFalse: 'disabled={false}',
};

module.exports = {
  rule: 'checked-requires-onchange-or-readonly',
  // Input: 5 ctrl x 3 types x 7 handlers; textarea/select/component: 4 x 7.
  domain: 5 * 3 * 7 + 3 * 4 * 7,
  traces: 1500,
  filename: FILE,
  key: keyOf('elem', 'ctrl', 'inputType', 'handler'),
  code: (s) => {
    const tagName = ELEM[tag(s.elem)];
    const attrs = [
      TYPE[tag(s.inputType)],
      CTRL[tag(s.ctrl)],
      HANDLER[tag(s.handler)],
    ]
      .filter(Boolean)
      .join(' ');
    const open = attrs ? `${tagName} ${attrs}` : tagName;
    return program(`<${open} />`, { pre: ["import { Input } from './ui';"] });
  },
};
