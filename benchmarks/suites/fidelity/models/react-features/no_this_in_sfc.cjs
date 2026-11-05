const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

// Statements before the return, and the expression rendered.
const WHERE = {
  Body: [[], '{this.props.name}'],
  NestedArrow: [['const label = () => this.props.name;'], '{label()}'],
  NestedFunction: [
    ['const label = function () { return this.name; };'],
    '{label.call(props)}',
  ],
  ObjectMethod: [
    ['const o = { name: "x", label() { return this.name; } };'],
    '{o.label()}',
  ],
  NoThis: [[], '{props.name}'],
};

function body(where, { jsx = true } = {}) {
  const [stmts, expr] = WHERE[where];
  return [
    ...stmts,
    jsx ? `return <div>${expr}</div>;` : `this.count = ${expr.slice(1, -1)};`,
  ];
}
const ind = (lines) => lines.map((l) => `  ${l}`);

module.exports = {
  rule: 'no-this-in-sfc',
  domain: 9 * 5,
  traces: 600,
  filename: FILE,
  key: keyOf('shape', 'where'),
  code: (s) => {
    const w = tag(s.where);
    switch (tag(s.shape)) {
      case 'FnDecl':
        return src('export function UserCard(props: any) {', ind(body(w)), '}');
      case 'Arrow':
        return src(
          'export const UserCard = (props: any) => {',
          ind(body(w)),
          '};',
        );
      case 'FnExpr':
        return src(
          'export const UserCard = function (props: any) {',
          ind(body(w)),
          '};',
        );
      case 'Memo':
        return src(
          "import { memo } from 'react';",
          'export const UserCard = memo((props: any) => {',
          ind(body(w)),
          '});',
        );
      case 'ForwardRef':
        return src(
          "import React from 'react';",
          'export const UserCard = React.forwardRef((props: any, ref: any) => {',
          ind(body(w)),
          '});',
        );
      case 'ExportDefault':
        return src('export default function (props: any) {', ind(body(w)), '}');
      case 'Lowercase':
        return src(
          'export function renderCard(props: any) {',
          ind(body(w)),
          '}',
        );
      case 'Constructor':
        // A pre-class constructor function: assigns to `this`, returns nothing.
        return src(
          'export function Counter(props: any) {',
          ind(
            w === 'NoThis'
              ? ['const n = props.name;']
              : [...WHERE[w][0], 'this.count = 0;'],
          ),
          '}',
        );
      case 'ClassComp':
        return src(
          "import { Component } from 'react';",
          'export class UserCard extends Component<any> {',
          '  render() {',
          '    const props = this.props;',
          ind(ind(body(w))),
          '  }',
          '}',
        );
      default:
        throw new Error('shape');
    }
  },
};
