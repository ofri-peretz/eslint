const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE } = require('../../react.cjs');
const { classModule } = require('../../react-b.cjs');

const BODY = {
  ReturnTrue: 'shouldComponentUpdate(next: any) {\n  return true;\n}',
  ArrowTrue: 'shouldComponentUpdate = () => true;',
  QuotedTrue: "'shouldComponentUpdate'(next: any) {\n  return true;\n}",
  Compare:
    'shouldComponentUpdate(next: any) {\n  return next.id !== this.props.id;\n}',
  GuardedTrue:
    'shouldComponentUpdate(next: any) {\n  if (next.id === this.props.id) return false;\n  return true;\n}',
  ReturnFalse: 'shouldComponentUpdate(next: any) {\n  return false;\n}',
};

module.exports = {
  rule: 'no-redundant-should-component-update',
  domain: 6 * 6 + 3,
  traces: 600,
  filename: FILE,
  key: keyOf('base', 'body'),
  code: (s) =>
    classModule(
      tag(s.base),
      [
        'props: any;',
        BODY[tag(s.body)],
        'render() {',
        '  return null;',
        '}',
      ].join('\n'),
    ),
};
