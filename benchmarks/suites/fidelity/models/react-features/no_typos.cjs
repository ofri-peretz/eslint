const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

// [class members, statements after the class]
const MEMBER = {
  LcExact: [['  componentDidMount() {}'], []],
  LcCase: [['  ComponentDidMount() {}'], []],
  LcList: [['  componenDidMount() {}'], []],
  LcStatic: [['  static componentDidMount() {}'], []],
  GdsfpStatic: [['  static getDerivedStateFromProps() { return null; }'], []],
  GdsfpInstance: [['  getDerivedStateFromProps() { return null; }'], []],
  PropExact: [['  static propTypes = {};'], []],
  PropCase: [['  static PropTypes = {};'], []],
  PropList: [['  static defaulProps = {};'], []],
  AssignExact: [[], ['(App as any).defaultProps = {};']],
  AssignCase: [[], ['(App as any).DefaultProps = {};']],
  Unrelated: [['  handleClick() {}'], []],
  ReadStatic: [
    [],
    [
      "import PropTypes from 'prop-types';",
      'export const shape = { ...(App as any).propTypes, name: PropTypes.string };',
    ],
  ],
};

module.exports = {
  rule: 'no-typos',
  domain: 13 * 6,
  traces: 600,
  filename: FILE,
  key: keyOf('member', 'sup'),
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    const [members, after] = MEMBER[tag(s.member)];
    return src(
      pre,
      `export class App${ext} {`,
      members,
      '  render() { return null; }',
      '}',
      after,
    );
  },
};
