const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE } = require('../../jsx.cjs');

const SITE = {
  DotRead: 'const shape = Foo.propTypes;',
  BracketRead: "const shape = Foo['propTypes'];",
  Destructure: 'const { propTypes } = Foo;',
  OwnAssign: 'Foo.propTypes = { a: 1 };',
  InsideAssign: 'Bar.propTypes = { a: Foo.propTypes.a };',
  InsideStaticField: 'class Bar { static propTypes = { a: Foo.propTypes.a }; }',
  OtherProperty: 'const defaults = Foo.defaultProps;',
  LookAlike: 'const shape = Foo.propType;',
};

module.exports = {
  rule: 'forbid-foreign-prop-types',
  domain: 8 * 2,
  traces: 400,
  filename: FILE,
  key: keyOf('site', 'allow'),
  config: (s) =>
    tag(s.allow) === 'AllowInPropTypes'
      ? { allowInPropTypes: true }
      : undefined,
  code: (s) =>
    `declare const Foo: any;\ndeclare const Bar: any;\n${SITE[tag(s.site)]}\nexport {};\n`,
};
