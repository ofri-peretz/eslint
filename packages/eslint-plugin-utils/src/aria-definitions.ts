/**
 * ARIA Definitions
 * Lists of valid ARIA roles and attributes
 */

export const ARIA_ROLES = new Set([
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'blockquote',
  'button',
  'caption',
  'cell',
  'checkbox',
  'code',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'definition',
  'deletion',
  'dialog',
  'directory',
  'document',
  'emphasis',
  'feed',
  'figure',
  'form',
  'generic',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'insertion',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'navigation',
  'none',
  'note',
  'option',
  'paragraph',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'strong',
  'subscript',
  'superscript',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'time',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
]);

export const ARIA_ATTRIBUTES = new Set([
  'aria-activedescendant',
  'aria-atomic',
  'aria-autocomplete',
  'aria-busy',
  'aria-checked',
  'aria-colcount',
  'aria-colindex',
  'aria-colspan',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-details',
  'aria-disabled',
  'aria-dropeffect',
  'aria-errormessage',
  'aria-expanded',
  'aria-flowto',
  'aria-grabbed',
  'aria-haspopup',
  'aria-hidden',
  'aria-invalid',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-level',
  'aria-live',
  'aria-modal',
  'aria-multiline',
  'aria-multiselectable',
  'aria-orientation',
  'aria-owns',
  'aria-placeholder',
  'aria-posinset',
  'aria-pressed',
  'aria-readonly',
  'aria-relevant',
  'aria-required',
  'aria-roledescription',
  'aria-rowcount',
  'aria-rowindex',
  'aria-rowspan',
  'aria-selected',
  'aria-setsize',
  'aria-sort',
  'aria-valuemax',
  'aria-valuemin',
  'aria-valuenow',
  'aria-valuetext',
]);

export const ARIA_REQUIRED_PROPS: Record<string, string[]> = {
  checkbox: ['aria-checked'],
  combobox: ['aria-controls', 'aria-expanded'],
  menuitemcheckbox: ['aria-checked'],
  menuitemradio: ['aria-checked'],
  option: ['aria-selected'],
  radio: ['aria-checked'],
  scrollbar: ['aria-controls', 'aria-orientation', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
  slider: ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
  spinbutton: ['aria-valuemax', 'aria-valuemin', 'aria-valuenow'],
  switch: ['aria-checked'],
};

export const ARIA_UNSUPPORTED_ELEMENTS = new Set([
  'base',
  'col',
  'colgroup',
  'head',
  'html',
  'link',
  'meta',
  'param',
  'script',
  'source',
  'style',
  'title',
  'track',
]);

// Mapping of roles to supported ARIA properties
export const ROLE_SUPPORTED_ARIA_PROPS: Record<string, Set<string>> = {
  alert: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  alertdialog: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  application: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  article: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  banner: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  button: new Set([
    'aria-expanded', 'aria-pressed'
  ]),
  checkbox: new Set([
    'aria-checked', 'aria-required'
  ]),
  columnheader: new Set([
    'aria-expanded', 'aria-selected', 'aria-sort'
  ]),
  combobox: new Set([
    'aria-expanded', 'aria-required', 'aria-activedescendant', 'aria-autocomplete',
    'aria-readonly', 'aria-orientation'
  ]),
  complementary: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  contentinfo: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  dialog: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  grid: new Set([
    'aria-expanded', 'aria-level', 'aria-multiselectable', 'aria-readonly',
    'aria-activedescendant', 'aria-orientation'
  ]),
  gridcell: new Set([
    'aria-expanded', 'aria-selected', 'aria-readonly'
  ]),
  link: new Set([
    'aria-expanded'
  ]),
  listbox: new Set([
    'aria-expanded', 'aria-required', 'aria-orientation', 'aria-activedescendant',
    'aria-multiselectable'
  ]),
  log: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  main: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  marquee: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  menu: new Set([
    'aria-expanded', 'aria-orientation', 'aria-activedescendant'
  ]),
  menubar: new Set([
    'aria-expanded', 'aria-orientation', 'aria-activedescendant'
  ]),
  menuitem: new Set([
    'aria-expanded'
  ]),
  menuitemcheckbox: new Set([
    'aria-checked'
  ]),
  menuitemradio: new Set([
    'aria-checked'
  ]),
  navigation: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  option: new Set([
    'aria-selected'
  ]),
  progressbar: new Set([
    'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext'
  ]),
  radio: new Set([
    'aria-checked'
  ]),
  radiogroup: new Set([
    'aria-required', 'aria-activedescendant', 'aria-orientation'
  ]),
  region: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  row: new Set([
    'aria-expanded', 'aria-selected', 'aria-level'
  ]),
  rowheader: new Set([
    'aria-expanded', 'aria-sort'
  ]),
  scrollbar: new Set([
    'aria-controls', 'aria-orientation', 'aria-valuemax', 'aria-valuemin',
    'aria-valuenow', 'aria-valuetext'
  ]),
  search: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  searchbox: new Set([
    'aria-expanded', 'aria-activedescendant', 'aria-autocomplete', 'aria-readonly'
  ]),
  separator: new Set([
    'aria-expanded', 'aria-orientation', 'aria-valuemax', 'aria-valuemin',
    'aria-valuenow', 'aria-valuetext'
  ]),
  slider: new Set([
    'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext',
    'aria-orientation'
  ]),
  spinbutton: new Set([
    'aria-valuemax', 'aria-valuemin', 'aria-valuenow', 'aria-valuetext',
    'aria-required', 'aria-readonly'
  ]),
  status: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  switch: new Set([
    'aria-checked'
  ]),
  tab: new Set([
    'aria-selected'
  ]),
  table: new Set([
    'aria-expanded', 'aria-colcount', 'aria-rowcount'
  ]),
  tablist: new Set([
    'aria-expanded', 'aria-level', 'aria-multiselectable', 'aria-orientation',
    'aria-activedescendant'
  ]),
  tabpanel: new Set([
    'aria-expanded'
  ]),
  term: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  textbox: new Set([
    'aria-activedescendant', 'aria-autocomplete', 'aria-multiline', 'aria-readonly',
    'aria-required'
  ]),
  timer: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  toolbar: new Set([
    'aria-expanded', 'aria-orientation', 'aria-activedescendant'
  ]),
  tooltip: new Set([
    'aria-expanded', 'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
    'aria-describedby', 'aria-details', 'aria-disabled', 'aria-dropeffect',
    'aria-errormessage', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
    'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label',
    'aria-labelledby', 'aria-live', 'aria-modal', 'aria-orientation',
    'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed',
    'aria-readonly', 'aria-relevant', 'aria-roledescription', 'aria-selected',
    'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
    'aria-valuetext'
  ]),
  tree: new Set([
    'aria-expanded', 'aria-multiselectable', 'aria-required', 'aria-activedescendant',
    'aria-orientation'
  ]),
  treegrid: new Set([
    'aria-expanded', 'aria-level', 'aria-multiselectable', 'aria-readonly',
    'aria-required', 'aria-activedescendant', 'aria-orientation'
  ]),
  treeitem: new Set([
    'aria-expanded', 'aria-level', 'aria-selected'
  ]),
};
