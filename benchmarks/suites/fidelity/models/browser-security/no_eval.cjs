const { tag, num } = require('../../lib.cjs');

module.exports = {
  domain: 36, // 9 callees x allowFn in Prod, + 9 callees in each of 2 test contexts
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-eval',
  traces: 600,
  key: (s) => `${tag(s.callee)}|allowFn=${s.allowFn}|${tag(s.ctx)}`,
  config: (s) => ({
    allowFunctionConstructor: s.allowFn,
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: true } : {}),
  }),
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/a.ts' : 'src/a.test.ts'),
  code: (s) =>
    ({
      IdentEval: 'eval(input);',
      IdentExecScript: 'execScript(input);',
      MemberEval: 'window.eval(input);',
      ComputedEvalLit: "window['eval'](input);",
      SetTimeoutStr: "setTimeout('alert(1)', 10);",
      SetTimeoutFn: 'setTimeout(() => {}, 10);',
      NewFunction: "new Function('a', 'return a');",
      NewOther: 'new Foo();',
      OtherCall: 'foo(input);',
    })[tag(s.callee)],
  model: (s) => s.verdict,
};
