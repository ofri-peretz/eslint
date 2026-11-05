const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

const FIELD = {
  Init: ['  state = { count: 0 };'],
  TypedInit: ['  state: { count: number } = { count: 0 };'],
  ComputedInit: ["  ['state'] = { count: 0 };"],
  DeclOnly: ['  declare state: { count: number };'],
  StaticInit: ['  static state = { count: 0 };'],
  CtorAssign: [
    '  constructor(props: any) {',
    '    super(props);',
    '    this.state = { count: 0 };',
    '  }',
  ],
  NoState: [],
};

module.exports = {
  rule: 'state-in-constructor',
  domain: 7 * 7 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('stateField', 'sup', 'classForm'),
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    let field = FIELD[tag(s.stateField)];
    // A plain class has no super constructor to call.
    if (tag(s.sup) === 'NoSuper')
      field = field.filter((l) => !l.includes('super('));
    const decl = tag(s.classForm) === 'Decl';
    return src(
      pre,
      decl ? `export class App${ext} {` : `export const App = class${ext} {`,
      '  [k: string]: any;',
      field,
      '  render() { return null; }',
      decl ? '}' : '};',
    );
  },
};
