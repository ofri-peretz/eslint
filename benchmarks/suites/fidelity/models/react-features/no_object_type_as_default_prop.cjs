const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const VALUE = {
  ObjectLit: '{ padding: 10 }',
  ArrayLit: '[]',
  ArrowFn: '() => {}',
  FnExpr: 'function () {}',
  Const: 'DEFAULT_STYLE',
  Num: '10',
  Null_: 'null',
  Str: "'compact'",
};

module.exports = {
  rule: 'no-object-type-as-default-prop',
  domain: 6 * 8,
  traces: 700,
  filename: FILE,
  key: keyOf('shape', 'value'),
  code: (s) => {
    const v = VALUE[tag(s.value)];
    const pre = [
      "import { memo } from 'react';",
      'const DEFAULT_STYLE = { padding: 10 };',
    ];
    switch (tag(s.shape)) {
      case 'FnDecl':
        return src(
          pre,
          `export function Card({ title, style = ${v} }: any) {`,
          '  return <div style={style}>{title}</div>;',
          '}',
        );
      case 'Arrow':
        return src(
          pre,
          `export const Card = ({ title, style = ${v} }: any) => <div style={style}>{title}</div>;`,
        );
      case 'Memo':
        return src(
          pre,
          `export const Card = memo(({ title, style = ${v} }: any) => <div style={style}>{title}</div>);`,
        );
      case 'Helper':
        return src(
          pre,
          `export function request({ url, style = ${v} }: any) {`,
          '  return fetch(url, style);',
          '}',
        );
      case 'Util':
        return src(
          pre,
          `export function Merge({ base, style = ${v} }: any) {`,
          '  return { ...base, style };',
          '}',
        );
      case 'ClassStatic':
        return src(
          pre,
          'export class Card extends React.Component<any> {',
          `  static defaultProps = { style: ${v} };`,
          '  render() {',
          '    return <div style={this.props.style} />;',
          '  }',
          '}',
        );
      default:
        throw new Error('shape');
    }
  },
};
