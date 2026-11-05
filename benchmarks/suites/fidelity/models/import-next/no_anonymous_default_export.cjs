const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const VALUE = {
  Arrow: 'export default () => 1;',
  ArrowAs: 'export default (() => 1) as Handler;',
  FnExpr: 'export default (function () { return 1; });',
  NamedFnExpr: 'export default (function load() { return 1; });',
  AnonFnDecl: 'export default function () { return 1; }',
  NamedFnDecl: 'export default function load() { return 1; }',
  ClassExpr: 'export default (class {});',
  NamedClassExpr: 'export default (class Store {});',
  AnonClassDecl: 'export default class {}',
  NamedClassDecl: 'export default class Store {}',
  Ident: 'export default config;',
  Member: 'export default config.handler;',
  Call: 'export default create(config);',
  New: 'export default new Map();',
  Literal: "export default 'value';",
  Template: 'export default `value`;',
  Obj: 'export default { a: 1 };',
  Arr: 'export default [1, 2];',
  ObjSatisfies: 'export default { a: 1 } satisfies Record<string, number>;',
  Interface: 'export default interface Shape { a: string }',
};

module.exports = {
  rule: 'no-anonymous-default-export',
  domain: 20 * 8,
  traces: 1000,
  key: keyOf('value', 'allowArrow', 'allowClass', 'allowFunction'),
  config: (s) => ({
    allowArrowFunction: s.allowArrow,
    allowClassExpression: s.allowClass,
    allowFunctionExpression: s.allowFunction,
  }),
  code: (s) =>
    src(
      "import { config, create } from './config';",
      'type Handler = () => number;',
      VALUE[tag(s.value)],
    ),
};
