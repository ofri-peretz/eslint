const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const ROLE = {
  Button: 'button',
  Link: 'link',
  Checkbox: 'checkbox',
  Heading: 'heading',
  Navigation: 'navigation',
  Main: 'main',
  ListRole: 'list',
  ListItem: 'listitem',
  Tab: 'tab',
  Tablist: 'tablist',
  Tooltip: 'tooltip',
  Switch: 'switch',
  Alert: 'alert',
  Presentation: 'presentation',
};
// The native element for each role with one, plus the attributes the role needs.
const NATIVE = {
  Button: ['button', ['type="button"'], 'x'],
  Link: ['a', ['href="/x"'], 'x'],
  Checkbox: ['input', ['type="checkbox"'], ''],
  Heading: ['h2', [], 'Title'],
  Navigation: ['nav', [], 'x'],
  Main: ['main', [], 'x'],
  ListRole: ['ul', [], '<li>x</li>'],
  ListItem: ['li', [], 'x'],
};
const EXTRA = {
  Checkbox: ['aria-checked="false"', 'tabIndex={0}'],
  Switch: ['aria-checked="false"', 'tabIndex={0}'],
  Heading: ['aria-level="2"'],
  Button: ['tabIndex={0}'],
  Link: ['tabIndex={0}'],
  Tab: ['tabIndex={0}'],
};

module.exports = {
  rule: 'prefer-tag-over-role',
  // (14 roles x 4 elems + 8 native) x 3 spellings
  domain: (14 * 4 + 8) * 3,
  traces: 1800,
  filename: FILE,
  key: (s) =>
    ['role', 'elem', 'spelling'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const r = tag(s.role);
    const e = tag(s.elem);
    const role = attr('role', ROLE[r], tag(s.spelling));
    const extra = EXTRA[r] ?? [];
    const jsx =
      e === 'Native'
        ? el(NATIVE[r][0], [...NATIVE[r][1], role], NATIVE[r][2])
        : el(
            { Div: 'div', Span: 'span', Component: 'Box', Member: 'Ui.Box' }[e],
            [role, ...extra],
            'x',
          );
    return program(jsx, { pre: ["import { Box, Ui } from './ui';"] });
  },
};
