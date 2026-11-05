const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const FIRST = {
  FClass: [
    'export class UserCard extends React.Component<any> {',
    '  render() {',
    '    return <div>{this.props.name}</div>;',
    '  }',
    '}',
  ],
  FFn: [
    'export function UserCard(props: any) {',
    '  return <div>{props.name}</div>;',
    '}',
  ],
};
const SECOND = {
  Class: [
    'class Avatar extends React.PureComponent<any> {',
    '  render() {',
    '    return <img src={this.props.src} />;',
    '  }',
    '}',
  ],
  FnDecl: [
    'function Avatar(props: any) {',
    '  return <img src={props.src} />;',
    '}',
  ],
  Arrow: ['const Avatar = (props: any) => <img src={props.src} />;'],
  Memo: ['const Avatar = React.memo((props: any) => <img src={props.src} />);'],
  ForwardRef: [
    'const Avatar = React.forwardRef((props: any, ref: any) => <img ref={ref} src={props.src} />);',
  ],
  Helper: [
    'function renderAvatar(src: string) {',
    '  return <img src={src} />;',
    '}',
  ],
  Util: ['function FormatName(name: string) {', '  return name.trim();', '}'],
  PlainClass: ['class Store {', '  render() {', '    return null;', '  }', '}'],
  None: [],
};

module.exports = {
  rule: 'no-multi-comp',
  domain: 2 * 9 * 2,
  traces: 500,
  filename: FILE,
  key: keyOf('first', 'second', 'opt'),
  config: (s) =>
    tag(s.opt) === 'IgnoreStateless' ? { ignoreStateless: true } : undefined,
  code: (s) =>
    src(
      "import React from 'react';",
      SECOND[tag(s.second)],
      FIRST[tag(s.first)],
    ),
};
