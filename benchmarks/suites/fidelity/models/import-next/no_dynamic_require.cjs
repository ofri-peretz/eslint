const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const ARG = {
  Literal: "'./plugins/a'",
  Template: '`./plugins/a`',
  TemplateExpr: '`./plugins/${name}`',
  Ident: 'name',
  Concat: "'./plugins/' + 'a'",
  ConcatDynamic: "'./plugins/' + name",
  CallArg: 'resolve(name)',
};

module.exports = {
  rule: 'no-dynamic-require',
  domain: 2 * 7 * 2,
  traces: 300,
  key: keyOf('callee', 'arg', 'esmodule'),
  config: (s) => (s.esmodule ? { esmodule: true } : undefined),
  code: (s) =>
    src(
      'declare const name: string;',
      'declare function resolve(n: string): string;',
      tag(s.callee) === 'Require'
        ? `export const plugin = require(${ARG[tag(s.arg)]});`
        : `export const plugin = () => import(${ARG[tag(s.arg)]});`,
    ),
};
