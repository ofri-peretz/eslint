const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const CALL = {
  DefineDepsFactory: "define(['./dep'], function (dep) { return dep; });",
  DefineDepsArrow: "define(['./dep'], (dep) => dep);",
  DefineFactory: 'define(function () { return {}; });',
  DefineNamed: "define('app', ['./dep'], function (dep) { return dep; });",
  DefineObject: 'define({ answer: 42 });',
  RequireDepsCallback: "require(['./dep'], function (dep) { dep.start(); });",
  RequireDepsArrow: "require(['./dep'], (dep) => dep.start());",
  RequireString: "const dep = require('./dep');",
  MemberDefine: "customElements.define('x-app', class extends HTMLElement {});",
};
const ALLOW = { AllowMatch: ['**/app.ts'], AllowOther: ['**/legacy/**'] };

module.exports = {
  rule: 'no-amd',
  domain: 9 * 2 * 3,
  traces: 500,
  key: keyOf('call', 'binding', 'allow'),
  config: (s) => {
    const allow = ALLOW[tag(s.allow)];
    return allow ? { allow } : undefined;
  },
  code: (s) =>
    src(
      tag(s.binding) === 'Local'
        ? ["import { define, require } from './loader';"]
        : [],
      CALL[tag(s.call)],
      'export {};',
    ),
};
